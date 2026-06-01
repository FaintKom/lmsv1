"""Class journal service — session upsert + per-day activity aggregation.

RBAC is delegated to the analytics task-stats helpers so the journal shares the
exact same scoping rules as the rest of the staff tooling:

  - teacher                      → only their own courses
  - is_methodist (any non-super) → all courses in their org
  - admin                        → all courses in their org
  - super_admin                  → all courses, all orgs
  - student / parent             → forbidden

Day filtering: ``session_date`` is a plain calendar date, but the activity
sources (LessonProgress.completed_at, *Submission timestamps) are
timezone-aware (timestamptz). We therefore filter on the half-open UTC range
``[day 00:00, next-day 00:00)`` rather than casting to ``::date`` — the cast
would bucket by the server's session timezone and is ambiguous for tz-aware
columns. Aggregation uses GROUP BY (no N+1), mirroring task_stats_service.
"""
from __future__ import annotations

import csv
import io
import uuid
from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy import update as sa_update
from sqlalchemy.ext.asyncio import AsyncSession

from app.admin.models import StudentGroup, StudentGroupMember
from app.admin.student_profile_service import (
    StudentProfileError,
    _authorize_student,
)
from app.analytics.task_stats_service import (
    TaskStatsError,
    _authorize_course,
    _course_scope_clause,
    _is_org_wide,
    require_stats_role,
)
from app.assessments.models import Quiz, QuizSubmission
from app.assignments.models import Assignment, AssignmentStatus, AssignmentSubmission
from app.attendance.models import AttendanceRecord, AttendanceStatus
from app.auth.models import User, UserRole
from app.courses.models import Course, Lesson, Module
from app.curriculum.models import CurriculumTopic
from app.exercises.models import Exercise, ExerciseSubmission
from app.journal.models import ClassSession
from app.progress.models import Enrollment, LessonProgress, LessonStatus
from app.rooms.models import Room
from app.schedule.models import ScheduleSlot
from app.schedule.service import slot_room_url

# Bound the work of generate-from-schedule so a teacher can't ask the backend
# to walk an unbounded date range (one quarter is plenty for a "fill my term").
MAX_GENERATE_SPAN_DAYS = 92

# Bound the export range to at most a year so a single request can't fan out
# into an unbounded sessions × students grid.
MAX_EXPORT_SPAN_DAYS = 366

# Short English weekday labels (Monday=0..Sunday=6) — kept English on purpose:
# the CSV is portable data, not UI, so its header/labels stay locale-stable.
_WEEKDAY_LABELS = ("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")

_EXPORT_HEADER = (
    "Date",
    "Day of week",
    "Held",
    "Topic",
    "Student",
    "Attendance",
    "Note",
)


def _day_bounds(day: date) -> tuple[datetime, datetime]:
    """Half-open UTC range covering ``day``: [start, next-day-start)."""
    start = datetime.combine(day, time.min, tzinfo=timezone.utc)
    return start, start + timedelta(days=1)


def _session_dict(s: ClassSession | None) -> dict | None:
    if s is None:
        return None
    return {
        "id": str(s.id),
        "session_date": s.session_date.isoformat(),
        "held": s.held,
        "topic": s.topic or "",
        "notes": s.notes,
        "group_id": str(s.group_id) if s.group_id else None,
        "actual_topic_id": str(s.actual_topic_id) if s.actual_topic_id else None,
        "planned_topic_id": str(s.planned_topic_id) if s.planned_topic_id else None,
    }


def _empty_attendance() -> dict[str, int]:
    return {"present": 0, "late": 0, "absent": 0, "excused": 0, "total": 0}


def _slot_dict(s: ScheduleSlot) -> dict[str, str]:
    return {
        "start_time": s.start_time.strftime("%H:%M"),
        "end_time": s.end_time.strftime("%H:%M"),
        "location": s.location or "",
    }


async def _scheduled_slots_for_day(
    db: AsyncSession, course_id: uuid.UUID, day: date
) -> list[dict[str, str]]:
    """Active timetable slots for this course on ``day``'s weekday.

    ``date.weekday()`` is Monday=0..Sunday=6 — the same convention as
    ``ScheduleSlot.day_of_week`` — so no remapping is needed. One query, no N+1.
    """
    rows = (
        await db.execute(
            select(ScheduleSlot)
            .where(
                ScheduleSlot.course_id == course_id,
                ScheduleSlot.active.is_(True),
                ScheduleSlot.day_of_week == day.weekday(),
            )
            .order_by(ScheduleSlot.start_time)
        )
    ).scalars().all()
    return [_slot_dict(s) for s in rows]


# ── Phase B group helpers ──────────────────────────────────────────────────


async def _authorize_group(
    db: AsyncSession, user: User, group_id: uuid.UUID, course_id: uuid.UUID
) -> StudentGroup:
    """Fetch a group and confirm it belongs to ``course_id`` + the caller may see it.

    The group inherits the course's RBAC (already authorized by the caller), so
    we only additionally check the group exists and is linked to this course.
    """
    group = await db.scalar(select(StudentGroup).where(StudentGroup.id == group_id))
    if group is None:
        raise TaskStatsError("not_found", "Group not found")
    if group.course_id != course_id:
        raise TaskStatsError("not_found", "Group not found")
    return group


async def _group_member_ids(
    db: AsyncSession, group_id: uuid.UUID
) -> list[uuid.UUID]:
    """Active student user-ids that are members of the group, name-ordered."""
    rows = (
        await db.execute(
            select(User.id, User.full_name)
            .join(StudentGroupMember, StudentGroupMember.user_id == User.id)
            .where(
                StudentGroupMember.group_id == group_id,
                User.role == UserRole.student,
                User.is_active.is_(True),
            )
            .distinct()
            .order_by(User.full_name)
        )
    ).all()
    return [r[0] for r in rows]


# ── Upsert ───────────────────────────────────────────────────────────────


async def _validate_topic_for_course(
    db: AsyncSession, course_id: uuid.UUID, topic_id: uuid.UUID
) -> None:
    """Confirm ``topic_id`` is a curriculum topic of ``course_id``."""
    topic = await db.scalar(
        select(CurriculumTopic).where(CurriculumTopic.id == topic_id)
    )
    if topic is None or topic.course_id != course_id:
        raise TaskStatsError("not_found", "Curriculum topic not found for this course")


async def upsert_session(
    db: AsyncSession,
    user: User,
    course_id: uuid.UUID,
    session_date: date,
    held: bool,
    topic: str,
    notes: str | None,
    *,
    actual_topic_id: uuid.UUID | None = None,
    actual_topic_set: bool = False,
) -> dict:
    """Insert or update the (course, date) journal row.

    ``actual_topic_id`` (Phase C) records which curriculum topic the session
    actually covered — it drives pacing. ``actual_topic_set`` distinguishes
    "clear it" (explicit null) from "leave untouched" on update.
    """
    require_stats_role(user)
    course = await _authorize_course(db, user, course_id)
    if actual_topic_set and actual_topic_id is not None:
        await _validate_topic_for_course(db, course_id, actual_topic_id)

    existing = await db.scalar(
        select(ClassSession).where(
            ClassSession.course_id == course_id,
            ClassSession.session_date == session_date,
        )
    )
    if existing is not None:
        existing.held = held
        existing.topic = (topic or "")[:500]
        existing.notes = notes
        if actual_topic_set:
            existing.actual_topic_id = actual_topic_id
        db.add(existing)
        await db.flush()
        return _session_dict(existing)  # type: ignore[return-value]

    created = ClassSession(
        org_id=course.org_id,
        course_id=course_id,
        session_date=session_date,
        held=held,
        topic=(topic or "")[:500],
        notes=notes,
        actual_topic_id=actual_topic_id if actual_topic_set else None,
        created_by=user.id,
    )
    db.add(created)
    await db.flush()
    return _session_dict(created)  # type: ignore[return-value]


# ── List ─────────────────────────────────────────────────────────────────


async def list_sessions(
    db: AsyncSession,
    user: User,
    course_id: uuid.UUID,
    *,
    group_id: uuid.UUID | None = None,
) -> dict:
    """All journal rows for a course (newest first) + attendance counts.

    Attendance counts are pulled in a single grouped query keyed by
    (session_date, status) so there is no per-session round-trip. An optional
    ``group_id`` narrows the sessions to that group (falls back to the whole
    course when absent).
    """
    require_stats_role(user)
    course = await _authorize_course(db, user, course_id)
    if group_id is not None:
        await _authorize_group(db, user, group_id, course_id)

    sess_stmt = select(ClassSession).where(ClassSession.course_id == course_id)
    if group_id is not None:
        sess_stmt = sess_stmt.where(ClassSession.group_id == group_id)
    sessions = (
        await db.execute(sess_stmt.order_by(ClassSession.session_date.desc()))
    ).scalars().all()

    # One grouped query: attendance counts per (date, status) for this course.
    att_rows = (
        await db.execute(
            select(
                AttendanceRecord.session_date,
                AttendanceRecord.status,
                func.count().label("n"),
            )
            .where(
                AttendanceRecord.course_id == course_id,
                AttendanceRecord.org_id == course.org_id,
            )
            .group_by(AttendanceRecord.session_date, AttendanceRecord.status)
        )
    ).all()

    counts_by_date: dict[date, dict[str, int]] = {}
    for sess_date, st, n in att_rows:
        bucket = counts_by_date.setdefault(sess_date, _empty_attendance())
        key = st.value if isinstance(st, AttendanceStatus) else str(st)
        bucket[key] = bucket.get(key, 0) + n
        bucket["total"] += n

    out = []
    for s in sessions:
        d = _session_dict(s)
        assert d is not None
        d["attendance"] = counts_by_date.get(s.session_date, _empty_attendance())
        out.append(d)

    return {
        "course_id": str(course.id),
        "course_title": course.title,
        "group_id": str(group_id) if group_id else None,
        "sessions": out,
    }


# ── Day view (activity) ────────────────────────────────────────────────────


async def get_day(
    db: AsyncSession,
    user: User,
    course_id: uuid.UUID,
    session_date: date,
    *,
    group_id: uuid.UUID | None = None,
) -> dict:
    """Session row (or null) + per-enrolled-student activity for that day.

    When ``group_id`` is given the roster is that group's members and the
    session lookup is scoped to the group; otherwise the roster is the course's
    enrollment (current behavior).
    """
    require_stats_role(user)
    course = await _authorize_course(db, user, course_id)
    if group_id is not None:
        await _authorize_group(db, user, group_id, course_id)

    sess_stmt = select(ClassSession).where(
        ClassSession.course_id == course_id,
        ClassSession.session_date == session_date,
    )
    if group_id is not None:
        sess_stmt = sess_stmt.where(ClassSession.group_id == group_id)
    session = await db.scalar(sess_stmt)

    scheduled_slots = await _scheduled_slots_for_day(db, course_id, session_date)

    # Roster: group members when a group is given; else course enrollment.
    if group_id is not None:
        member_ids = await _group_member_ids(db, group_id)
        student_rows = (
            (
                await db.execute(
                    select(User.id, User.full_name)
                    .where(User.id.in_(member_ids))
                    .order_by(User.full_name)
                )
            ).all()
            if member_ids
            else []
        )
    else:
        student_rows = (
            await db.execute(
                select(User.id, User.full_name)
                .join(Enrollment, Enrollment.student_id == User.id)
                .where(
                    Enrollment.course_id == course_id,
                    User.role == UserRole.student,
                    User.is_active.is_(True),
                )
                .distinct()
                .order_by(User.full_name)
            )
        ).all()
    student_ids = [r[0] for r in student_rows]

    activity: list[dict] = []
    if not student_ids:
        return {
            "session": _session_dict(session),
            "scheduled_slots": scheduled_slots,
            "activity": activity,
        }

    start, end = _day_bounds(session_date)

    # Lessons completed that day, per student → list of titles. One grouped
    # fetch (no N+1): join Enrollment→LessonProgress→Lesson within the course.
    lessons_by_student: dict[uuid.UUID, list[str]] = {sid: [] for sid in student_ids}
    lesson_rows = (
        await db.execute(
            select(Enrollment.student_id, Lesson.title)
            .select_from(Enrollment)
            .join(LessonProgress, LessonProgress.enrollment_id == Enrollment.id)
            .join(Lesson, Lesson.id == LessonProgress.lesson_id)
            .where(
                Enrollment.course_id == course_id,
                Enrollment.student_id.in_(student_ids),
                LessonProgress.status == LessonStatus.completed,
                LessonProgress.completed_at >= start,
                LessonProgress.completed_at < end,
            )
            .order_by(Lesson.title)
        )
    ).all()
    for sid, title in lesson_rows:
        lessons_by_student.setdefault(sid, []).append(title)

    # Submission counts that day, per student, per task type. Each is a single
    # GROUP BY query scoped to the course via the lesson→module→course join.
    ex_counts = await _exercise_counts(db, course_id, student_ids, start, end)
    quiz_counts = await _quiz_counts(db, course_id, student_ids, start, end)
    assign_counts = await _assignment_counts(db, course_id, student_ids, start, end)

    names = {r[0]: r[1] for r in student_rows}
    for sid in student_ids:
        activity.append(
            {
                "student_id": str(sid),
                "student_name": names.get(sid, ""),
                "lessons_completed": lessons_by_student.get(sid, []),
                "exercises_done": ex_counts.get(sid, 0),
                "quizzes_done": quiz_counts.get(sid, 0),
                "assignments_done": assign_counts.get(sid, 0),
            }
        )

    return {
        "session": _session_dict(session),
        "scheduled_slots": scheduled_slots,
        "activity": activity,
    }


# ── Student activity-of-day (compute-only aggregate) ─────────────────────────

# Pass mark used when a submission carries a numeric score but no boolean
# verdict: ≥ this is "correct", > 0 is "partial", else "wrong".
_PASS_SCORE = 100.0
# XP heuristic, mirroring the design prototype (12 XP per correct item / answer).
_XP_PER_CORRECT = 12
# Rough time-on-task fallback used only when submissions carry no
# ``time_spent_seconds`` at all (keeps the KPI non-zero for a productive day).
_FALLBACK_SEC_PER_EXERCISE = 240


def _result_from_verdict(passed: bool | None, score: float | None) -> str:
    """Map a submission's verdict/score to the design's RES palette key.

    - no score *and* no verdict → ``done`` (theory / ungraded, e.g. a read).
    - boolean verdict present → ``correct`` (pass) / ``wrong`` (fail).
    - numeric score only → ``correct`` (==100) / ``partial`` (>0) / ``wrong``.
    """
    if passed is True:
        return "correct"
    if passed is False:
        return "wrong"
    # passed is None → fall back to the score.
    if score is None:
        return "done"
    if score >= _PASS_SCORE:
        return "correct"
    if score > 0:
        return "partial"
    return "wrong"


def _items_str(passed: int | None, total: int | None) -> str | None:
    """``"3/5"`` when a code-challenge / test count is present, else None."""
    if total:
        return f"{passed or 0}/{total}"
    return None


async def get_student_activity(
    db: AsyncSession,
    user: User,
    student_id: uuid.UUID,
    activity_date: date,
    *,
    group_id: uuid.UUID | None = None,
) -> dict:
    """What one student actually did on ``activity_date`` — computed on the fly.

    Aggregates the three submission families (exercise / quiz / assignment) and
    lesson completions for the day, groups them by course/lesson, maps each
    submission to a result (theory→``done``; graded→``correct``/``partial``/
    ``wrong``), derives day-level KPIs and a chronological event timeline.

    No new table: everything is derived from existing submissions, exactly like
    :func:`app.admin.student_profile_service.get_student_profile` but scoped to a
    single calendar day. RBAC reuses that module's ``_authorize_student`` so the
    journal shares its rules: teacher→own-course students, methodist/admin→org,
    super→global; student/parent forbidden; cross-org hidden as ``not_found``.

    An empty day returns zeroed KPIs + empty lessons/timeline + a ``note`` — it
    never 404s on "no activity".
    """
    try:
        target = await _authorize_student(db, user, student_id)
    except StudentProfileError as exc:
        # Re-raise as the journal router's error type so the HTTP mapping
        # (forbidden→403, not_found→404) is shared with the rest of the module.
        raise TaskStatsError(exc.code, exc.message) from exc

    # Optional group label (purely cosmetic for the header). The group inherits
    # the student's already-authorized scope, so we only resolve its name.
    group_name: str | None = None
    if group_id is not None:
        group = await db.scalar(
            select(StudentGroup).where(StudentGroup.id == group_id)
        )
        if group is not None:
            group_name = group.name

    start, end = _day_bounds(activity_date)

    # ── Exercises submitted that day (with their lesson/course context). ──
    ex_rows = (
        await db.execute(
            select(
                ExerciseSubmission.id,
                ExerciseSubmission.submitted_at,
                ExerciseSubmission.score,
                ExerciseSubmission.passed,
                ExerciseSubmission.total_passed,
                ExerciseSubmission.total_tests,
                ExerciseSubmission.time_spent_seconds,
                Exercise.title,
                Exercise.exercise_type,
                Lesson.id.label("lesson_id"),
                Lesson.title.label("lesson_title"),
                Course.id.label("course_id"),
                Course.title.label("course_title"),
            )
            .select_from(ExerciseSubmission)
            .join(Exercise, Exercise.id == ExerciseSubmission.exercise_id)
            .join(Lesson, Lesson.id == Exercise.lesson_id)
            .join(Module, Module.id == Lesson.module_id)
            .join(Course, Course.id == Module.course_id)
            .where(
                ExerciseSubmission.student_id == student_id,
                ExerciseSubmission.submitted_at >= start,
                ExerciseSubmission.submitted_at < end,
            )
            .order_by(ExerciseSubmission.submitted_at)
        )
    ).all()

    # ── Quizzes submitted that day. ──
    quiz_rows = (
        await db.execute(
            select(
                QuizSubmission.id,
                QuizSubmission.submitted_at,
                QuizSubmission.score,
                QuizSubmission.passed,
                QuizSubmission.time_spent_seconds,
                Quiz.title,
                Lesson.id.label("lesson_id"),
                Lesson.title.label("lesson_title"),
                Course.id.label("course_id"),
                Course.title.label("course_title"),
            )
            .select_from(QuizSubmission)
            .join(Quiz, Quiz.id == QuizSubmission.quiz_id)
            .join(Lesson, Lesson.id == Quiz.lesson_id)
            .join(Module, Module.id == Lesson.module_id)
            .join(Course, Course.id == Module.course_id)
            .where(
                QuizSubmission.student_id == student_id,
                QuizSubmission.submitted_at >= start,
                QuizSubmission.submitted_at < end,
            )
            .order_by(QuizSubmission.submitted_at)
        )
    ).all()

    # ── Assignments submitted that day (course-level, no lesson). ──
    assign_rows = (
        await db.execute(
            select(
                AssignmentSubmission.id,
                AssignmentSubmission.submitted_at,
                AssignmentSubmission.score,
                AssignmentSubmission.status,
                AssignmentSubmission.time_spent_seconds,
                Assignment.title,
                Assignment.max_score,
                Course.id.label("course_id"),
                Course.title.label("course_title"),
            )
            .select_from(AssignmentSubmission)
            .join(Assignment, Assignment.id == AssignmentSubmission.assignment_id)
            .join(Course, Course.id == Assignment.course_id)
            .where(
                AssignmentSubmission.student_id == student_id,
                AssignmentSubmission.submitted_at >= start,
                AssignmentSubmission.submitted_at < end,
            )
            .order_by(AssignmentSubmission.submitted_at)
        )
    ).all()

    # ── Lessons completed that day (drives "lessons attended"). ──
    lesson_rows = (
        await db.execute(
            select(
                Lesson.id,
                Lesson.title,
                Course.id.label("course_id"),
                Course.title.label("course_title"),
                LessonProgress.completed_at,
            )
            .select_from(Enrollment)
            .join(LessonProgress, LessonProgress.enrollment_id == Enrollment.id)
            .join(Lesson, Lesson.id == LessonProgress.lesson_id)
            .join(Module, Module.id == Lesson.module_id)
            .join(Course, Course.id == Module.course_id)
            .where(
                Enrollment.student_id == student_id,
                LessonProgress.status == LessonStatus.completed,
                LessonProgress.completed_at >= start,
                LessonProgress.completed_at < end,
            )
            .order_by(LessonProgress.completed_at)
        )
    ).all()

    # ── Group submissions into lessons keyed by (course_id, lesson_id). ──
    # course-level work (assignments) is bucketed under a lesson_id of None.
    lessons_by_key: dict[tuple[uuid.UUID, uuid.UUID | None], dict] = {}

    def _bucket(
        course_id: uuid.UUID,
        course_title: str,
        lesson_id: uuid.UUID | None,
        lesson_title: str | None,
    ) -> dict:
        key: tuple[uuid.UUID, uuid.UUID | None] = (course_id, lesson_id)
        b = lessons_by_key.get(key)
        if b is None:
            b = {
                "course_id": str(course_id),
                "course_title": course_title,
                "lesson_id": str(lesson_id) if lesson_id else None,
                "topic": lesson_title,
                "attended": False,
                "exercises": [],
                "_first_at": None,
            }
            lessons_by_key[key] = b
        return b

    timeline: list[dict] = []
    total_exercises = 0
    correct_count = 0
    graded_count = 0
    time_spent = 0
    any_time = False

    def _track_time(secs: int | None) -> None:
        nonlocal time_spent, any_time
        if secs:
            time_spent += secs
            any_time = True

    # Lessons completed → mark attended + a timeline "entered lesson" event.
    for lid, ltitle, cid, ctitle, completed_at in lesson_rows:
        b = _bucket(cid, ctitle, lid, ltitle)
        b["attended"] = True
        if b["_first_at"] is None or completed_at < b["_first_at"]:
            b["_first_at"] = completed_at
        timeline.append(
            {
                "at": completed_at.isoformat(),
                "kind": "in",
                "text": f"Completed lesson · {ltitle}",
            }
        )

    # Exercises.
    for r in ex_rows:
        ex_type = (
            r.exercise_type.value
            if hasattr(r.exercise_type, "value")
            else str(r.exercise_type)
        )
        result = _result_from_verdict(
            r.passed, float(r.score) if r.score is not None else None
        )
        b = _bucket(r.course_id, r.course_title, r.lesson_id, r.lesson_title)
        b["attended"] = True
        if b["_first_at"] is None or r.submitted_at < b["_first_at"]:
            b["_first_at"] = r.submitted_at
        b["exercises"].append(
            {
                "id": str(r.id),
                "title": r.title,
                "type": ex_type,
                "result": result,
                "score_pct": round(float(r.score), 1) if r.score is not None else None,
                "items": _items_str(r.total_passed, r.total_tests),
            }
        )
        total_exercises += 1
        if result != "done":
            graded_count += 1
            if result == "correct":
                correct_count += 1
        _track_time(r.time_spent_seconds)
        timeline.append(
            {"at": r.submitted_at.isoformat(), "kind": result, "text": r.title}
        )

    # Quizzes (treated as exercises with type "quiz").
    for r in quiz_rows:
        result = _result_from_verdict(
            r.passed, float(r.score) if r.score is not None else None
        )
        b = _bucket(r.course_id, r.course_title, r.lesson_id, r.lesson_title)
        b["attended"] = True
        if b["_first_at"] is None or r.submitted_at < b["_first_at"]:
            b["_first_at"] = r.submitted_at
        b["exercises"].append(
            {
                "id": str(r.id),
                "title": r.title,
                "type": "quiz",
                "result": result,
                "score_pct": round(float(r.score), 1) if r.score is not None else None,
                "items": None,
            }
        )
        total_exercises += 1
        if result != "done":
            graded_count += 1
            if result == "correct":
                correct_count += 1
        _track_time(r.time_spent_seconds)
        timeline.append(
            {"at": r.submitted_at.isoformat(), "kind": result, "text": r.title}
        )

    # Assignments (course-level bucket, lesson_id None).
    for r in assign_rows:
        st = r.status.value if hasattr(r.status, "value") else str(r.status)
        # Only a graded assignment carries a meaningful verdict; otherwise it is
        # "done" (handed in, awaiting grade).
        if st == AssignmentStatus.graded.value and r.score is not None:
            pct = (
                float(r.score) / float(r.max_score) * 100.0
                if r.max_score
                else float(r.score)
            )
            result = _result_from_verdict(None, pct)
            score_pct = round(pct, 1)
        else:
            result = "done"
            score_pct = None
        b = _bucket(r.course_id, r.course_title, None, None)
        b["attended"] = True
        if b["_first_at"] is None or r.submitted_at < b["_first_at"]:
            b["_first_at"] = r.submitted_at
        b["exercises"].append(
            {
                "id": str(r.id),
                "title": r.title,
                "type": "assignment",
                "result": result,
                "score_pct": score_pct,
                "items": None,
            }
        )
        total_exercises += 1
        if result != "done":
            graded_count += 1
            if result == "correct":
                correct_count += 1
        _track_time(r.time_spent_seconds)
        timeline.append(
            {"at": r.submitted_at.isoformat(), "kind": result, "text": r.title}
        )

    # ── Assemble lessons list (chronological by first event), strip helper. ──
    lessons_sorted = sorted(
        lessons_by_key.values(),
        key=lambda b: (b["_first_at"] is None, b["_first_at"] or end),
    )
    lessons: list[dict] = []
    for b in lessons_sorted:
        first_at = b.pop("_first_at")
        b["time"] = first_at.strftime("%H:%M") if first_at is not None else None
        lessons.append(b)

    timeline.sort(key=lambda e: e["at"])

    # ── KPIs. ──
    correct_pct = round(correct_count / graded_count * 100) if graded_count else 0
    if not any_time and total_exercises:
        time_spent = total_exercises * _FALLBACK_SEC_PER_EXERCISE
    xp_earned = correct_count * _XP_PER_CORRECT

    kpis = {
        "lessons_attended": len(lessons),
        "exercises_done": total_exercises,
        "correct_pct": correct_pct,
        "time_spent_sec": time_spent,
        "xp_earned": xp_earned,
    }

    out: dict = {
        "student": {"id": str(target.id), "name": target.full_name or ""},
        "date": activity_date.isoformat(),
        "group_name": group_name,
        "kpis": kpis,
        "lessons": lessons,
        "timeline": timeline,
    }
    if total_exercises == 0 and not lessons:
        out["note"] = "No activity recorded for this day."
    return out


# ── Generate days from the weekly schedule ─────────────────────────────────


async def generate_from_schedule(
    db: AsyncSession,
    user: User,
    course_id: uuid.UUID,
    from_date: date,
    to_date: date,
) -> dict:
    """Materialise journal rows from the timetable across a date range.

    For each calendar date in ``[from_date, to_date]`` that has at least one
    active :class:`ScheduleSlot` on its weekday and no existing
    :class:`ClassSession`, create a held session (empty topic/notes). Existing
    rows are never touched. Returns the count + ISO dates created.
    """
    require_stats_role(user)
    course = await _authorize_course(db, user, course_id)

    if to_date < from_date:
        raise TaskStatsError("invalid_range", "to_date must be on or after from_date")
    if (to_date - from_date).days + 1 > MAX_GENERATE_SPAN_DAYS:
        raise TaskStatsError(
            "range_too_long",
            f"Range may span at most {MAX_GENERATE_SPAN_DAYS} days",
        )

    # Which weekdays have an active slot for this course? One query, then a set
    # membership test per date — no per-date round-trip.
    scheduled_weekdays = set(
        (
            await db.execute(
                select(ScheduleSlot.day_of_week)
                .where(
                    ScheduleSlot.course_id == course_id,
                    ScheduleSlot.active.is_(True),
                )
                .distinct()
            )
        ).scalars().all()
    )

    created_dates: list[str] = []
    if not scheduled_weekdays:
        return {"created": 0, "dates": created_dates}

    # Dates in range that already have a journal row — fetched once.
    existing_dates = set(
        (
            await db.execute(
                select(ClassSession.session_date).where(
                    ClassSession.course_id == course_id,
                    ClassSession.session_date >= from_date,
                    ClassSession.session_date <= to_date,
                )
            )
        ).scalars().all()
    )

    day = from_date
    while day <= to_date:
        if day.weekday() in scheduled_weekdays and day not in existing_dates:
            db.add(
                ClassSession(
                    org_id=course.org_id,
                    course_id=course_id,
                    session_date=day,
                    held=True,
                    topic="",
                    notes=None,
                    created_by=user.id,
                )
            )
            created_dates.append(day.isoformat())
        day += timedelta(days=1)

    if created_dates:
        await db.flush()

    return {"created": len(created_dates), "dates": created_dates}


# ── CSV register export ─────────────────────────────────────────────────────


async def export_register_csv(
    db: AsyncSession,
    user: User,
    course_id: uuid.UUID,
    from_date: date,
    to_date: date,
) -> tuple[str, str]:
    """Build an offline register CSV for a course over a date range.

    One row per (held-or-not session × enrolled student) ordered by date then
    student name. Columns: Date, Day of week, Held, Topic, Student, Attendance,
    Note. All three sources (sessions, students, attendance) are fetched in a
    single query each and joined in Python — no per-student/per-day round-trip.

    Returns ``(csv_text, filename)``. The CSV text is prefixed with a UTF-8 BOM
    so Excel detects the encoding; cells are quoted per RFC 4180 by ``csv``.
    If no sessions fall in range, only the header row is returned.
    """
    require_stats_role(user)
    course = await _authorize_course(db, user, course_id)

    if to_date < from_date:
        raise TaskStatsError("invalid_range", "to_date must be on or after from_date")
    if (to_date - from_date).days + 1 > MAX_EXPORT_SPAN_DAYS:
        raise TaskStatsError(
            "range_too_long",
            f"Range may span at most {MAX_EXPORT_SPAN_DAYS} days",
        )

    # Sessions in range, oldest first.
    sessions = (
        await db.execute(
            select(ClassSession)
            .where(
                ClassSession.course_id == course_id,
                ClassSession.session_date >= from_date,
                ClassSession.session_date <= to_date,
            )
            .order_by(ClassSession.session_date)
        )
    ).scalars().all()

    # Enrolled students (id + name), ordered by name — one query.
    student_rows = (
        await db.execute(
            select(User.id, User.full_name)
            .join(Enrollment, Enrollment.student_id == User.id)
            .where(
                Enrollment.course_id == course_id,
                User.role == UserRole.student,
                User.is_active.is_(True),
            )
            .distinct()
            .order_by(User.full_name)
        )
    ).all()

    # All attendance for the course in range — one query, indexed by
    # (student_id, date) so we never query per student per day.
    att_rows = (
        await db.execute(
            select(
                AttendanceRecord.student_id,
                AttendanceRecord.session_date,
                AttendanceRecord.status,
                AttendanceRecord.note,
            ).where(
                AttendanceRecord.course_id == course_id,
                AttendanceRecord.org_id == course.org_id,
                AttendanceRecord.session_date >= from_date,
                AttendanceRecord.session_date <= to_date,
            )
        )
    ).all()
    att_by_key: dict[tuple[uuid.UUID, date], tuple[str, str]] = {}
    for sid, sess_date, st, note in att_rows:
        status_label = st.value if isinstance(st, AttendanceStatus) else str(st)
        att_by_key[(sid, sess_date)] = (status_label, note or "")

    buf = io.StringIO()
    writer = csv.writer(buf, lineterminator="\r\n")
    writer.writerow(_EXPORT_HEADER)
    for s in sessions:
        date_iso = s.session_date.isoformat()
        weekday = _WEEKDAY_LABELS[s.session_date.weekday()]
        held = "yes" if s.held else "no"
        topic = s.topic or ""
        for sid, name in student_rows:
            status_label, note = att_by_key.get((sid, s.session_date), ("", ""))
            writer.writerow(
                [date_iso, weekday, held, topic, name or "", status_label, note]
            )

    csv_text = "﻿" + buf.getvalue()
    slug = course.slug or str(course_id)
    filename = f"journal-{slug}-{from_date.isoformat()}_{to_date.isoformat()}.csv"
    return csv_text, filename


# ── Daily agenda (Today) ─────────────────────────────────────────────────────


def _scope_courses_stmt(user: User):
    """Course-id select narrowed to what the caller may see (None scope = all)."""
    stmt = select(Course.id, Course.title, Course.teacher_id)
    scope = _course_scope_clause(user)
    if scope is not None:
        stmt = stmt.where(scope)
    return stmt


async def get_today(
    db: AsyncSession,
    user: User,
    day: date,
    *,
    course_id: uuid.UUID | None = None,
    group_id: uuid.UUID | None = None,
    teacher_id: uuid.UUID | None = None,
) -> dict:
    """The day's agenda: every active slot on ``day``'s weekday, in scope.

    Each entry is enriched with the matching ClassSession (held/topic) and
    attendance (present / enrolled total) for that course+date. Sessions,
    attendance and enrollment counts are each batch-fetched once for the day's
    courses — no per-slot round-trip. Sorted by start_time.

    Phase B: an optional ``group_id`` filters the agenda to one group's slots.
    Each entry prefers the slot's group name + the group's teacher when the
    slot is group-linked; otherwise it falls back to the course (unchanged).
    """
    require_stats_role(user)

    # Resolve teacher names + scope in one pass over the caller-visible courses.
    course_stmt = _scope_courses_stmt(user)
    if course_id is not None:
        course_stmt = course_stmt.where(Course.id == course_id)
    # teacher_id filter is admin-only (org-wide reach); a plain teacher is
    # already restricted to their own courses by the scope clause.
    if teacher_id is not None and _is_org_wide(user):
        course_stmt = course_stmt.where(Course.teacher_id == teacher_id)
    course_rows = (await db.execute(course_stmt)).all()
    course_ids = [r[0] for r in course_rows]
    titles = {r[0]: r[1] for r in course_rows}
    teacher_by_course = {r[0]: r[2] for r in course_rows}

    if not course_ids:
        return {"date": day.isoformat(), "agenda": []}

    # Active slots on this weekday for the in-scope courses (+ room name).
    slot_stmt = (
        select(ScheduleSlot, Room.name)
        .outerjoin(Room, Room.id == ScheduleSlot.room_id)
        .where(
            ScheduleSlot.course_id.in_(course_ids),
            ScheduleSlot.active.is_(True),
            ScheduleSlot.day_of_week == day.weekday(),
        )
        .order_by(ScheduleSlot.start_time)
    )
    if group_id is not None:
        slot_stmt = slot_stmt.where(ScheduleSlot.group_id == group_id)
    slot_rows = (await db.execute(slot_stmt)).all()
    if not slot_rows:
        return {"date": day.isoformat(), "agenda": []}

    day_course_ids = list({s.course_id for s, _ in slot_rows})
    day_group_ids = list({s.group_id for s, _ in slot_rows if s.group_id is not None})

    # Groups referenced by the day's slots: name + teacher override.
    group_by_id: dict[uuid.UUID, StudentGroup] = {}
    if day_group_ids:
        for g in (
            await db.execute(
                select(StudentGroup).where(StudentGroup.id.in_(day_group_ids))
            )
        ).scalars().all():
            group_by_id[g.id] = g

    # Teacher names: course teachers + group teachers, one query.
    teacher_ids: set[uuid.UUID] = {
        teacher_by_course.get(cid)
        for cid in day_course_ids
        if teacher_by_course.get(cid) is not None
    }
    teacher_ids |= {g.teacher_id for g in group_by_id.values() if g.teacher_id}
    teacher_names: dict[uuid.UUID, str] = {}
    if teacher_ids:
        for tid, name in (
            await db.execute(
                select(User.id, User.full_name).where(User.id.in_(teacher_ids))
            )
        ).all():
            teacher_names[tid] = name or ""

    # ClassSession for this date — keyed by (course_id, group_id) so a
    # group-linked slot matches its own session and a course-level slot matches
    # the course-level (group_id NULL) session. One query.
    sessions = (
        await db.execute(
            select(ClassSession).where(
                ClassSession.course_id.in_(day_course_ids),
                ClassSession.session_date == day,
            )
        )
    ).scalars().all()
    session_by_key: dict[tuple[uuid.UUID, uuid.UUID | None], ClassSession] = {
        (s.course_id, s.group_id): s for s in sessions
    }

    # Enrolled (distinct student) count per course — one grouped query.
    enrolled_rows = (
        await db.execute(
            select(
                Enrollment.course_id,
                func.count(func.distinct(Enrollment.student_id)),
            )
            .where(Enrollment.course_id.in_(day_course_ids))
            .group_by(Enrollment.course_id)
        )
    ).all()
    enrolled_by_course = {cid: n for cid, n in enrolled_rows}

    # Member count per group (the group's roster size) — one grouped query.
    member_count_by_group: dict[uuid.UUID, int] = {}
    if day_group_ids:
        for gid, n in (
            await db.execute(
                select(StudentGroupMember.group_id, func.count())
                .where(StudentGroupMember.group_id.in_(day_group_ids))
                .group_by(StudentGroupMember.group_id)
            )
        ).all():
            member_count_by_group[gid] = n

    # Present-count per course for this date — one grouped query.
    present_rows = (
        await db.execute(
            select(AttendanceRecord.course_id, func.count())
            .where(
                AttendanceRecord.course_id.in_(day_course_ids),
                AttendanceRecord.session_date == day,
                AttendanceRecord.status == AttendanceStatus.present,
            )
            .group_by(AttendanceRecord.course_id)
        )
    ).all()
    present_by_course = {cid: n for cid, n in present_rows}

    agenda: list[dict] = []
    for slot, room_name in slot_rows:
        cid = slot.course_id
        gid = slot.group_id
        group = group_by_id.get(gid) if gid else None
        # Session matches the slot's group when group-linked; else course-level.
        sess = session_by_key.get((cid, gid)) or (
            session_by_key.get((cid, None)) if gid is None else None
        )
        # Prefer the group's teacher when the slot is group-linked.
        tid = (group.teacher_id if group and group.teacher_id else teacher_by_course.get(cid))
        # Prefer group name as the agenda title when group-linked.
        title = group.name if group else titles.get(cid, "")
        total = (
            member_count_by_group.get(gid, 0) if gid else enrolled_by_course.get(cid, 0)
        )
        agenda.append(
            {
                "slot_id": str(slot.id),
                "course_id": str(cid),
                "course_title": titles.get(cid, ""),
                "group_id": str(gid) if gid else None,
                "group_name": group.name if group else None,
                "title": title,
                "teacher_id": str(tid) if tid else None,
                "teacher_name": teacher_names.get(tid, "") if tid else "",
                "start_time": slot.start_time.strftime("%H:%M"),
                "end_time": slot.end_time.strftime("%H:%M"),
                "is_online": slot.is_online,
                "room_id": str(slot.room_id) if slot.room_id else None,
                "room_name": room_name or (slot.location or None),
                "room_url": slot_room_url(slot.id) if slot.is_online else None,
                "session": (
                    {"held": sess.held, "topic": sess.topic or ""}
                    if sess is not None
                    else None
                ),
                "attendance": {
                    "present": present_by_course.get(cid, 0),
                    "total": total,
                },
            }
        )

    agenda.sort(key=lambda a: a["start_time"])
    return {"date": day.isoformat(), "agenda": agenda}


# ── Room board (rooms × that day's slots) ────────────────────────────────────


async def get_room_board(
    db: AsyncSession, user: User, day: date, *, group_id: uuid.UUID | None = None
) -> dict:
    """Rooms in scope, each with its slots on ``day``, plus a conflicts list.

    Methodist/admin/super_admin see every org room; a plain teacher sees only
    the rooms used by their own courses' slots that day. ``conflicts`` lists
    every (room, overlapping pair) so the grid can highlight a double-booking.
    All data is fetched in a few batch queries — no per-room round-trip.

    Phase B: an optional ``group_id`` scopes the board to a single group's slots.
    """
    require_stats_role(user)
    org_wide = _is_org_wide(user)

    # In-scope course ids (teacher → own; org-wide → all org courses).
    course_rows = (await db.execute(_scope_courses_stmt(user))).all()
    course_ids = [r[0] for r in course_rows]
    titles = {r[0]: r[1] for r in course_rows}
    if not course_ids:
        return {"date": day.isoformat(), "rooms": [], "conflicts": []}

    # Active slots on this weekday that occupy a managed room, in scope.
    slot_stmt = (
        select(ScheduleSlot)
        .where(
            ScheduleSlot.course_id.in_(course_ids),
            ScheduleSlot.active.is_(True),
            ScheduleSlot.day_of_week == day.weekday(),
            ScheduleSlot.room_id.isnot(None),
        )
        .order_by(ScheduleSlot.start_time)
    )
    if group_id is not None:
        slot_stmt = slot_stmt.where(ScheduleSlot.group_id == group_id)
    slot_rows = (await db.execute(slot_stmt)).scalars().all()

    slots_by_room: dict[uuid.UUID, list[ScheduleSlot]] = {}
    for s in slot_rows:
        slots_by_room.setdefault(s.room_id, []).append(s)

    # Which rooms to show: methodist/admin → every room in their org (so an
    # unused room still shows as free). teacher (own-course scope) + super_admin
    # (cross-org) → only the rooms their in-scope slots actually use that day.
    if org_wide and user.role != UserRole.super_admin and user.org_id is not None:
        room_stmt = select(Room).where(Room.org_id == user.org_id)
    else:
        used = list(slots_by_room.keys())
        room_stmt = select(Room).where(Room.id.in_(used)) if used else None
    rooms = (
        (await db.execute(room_stmt.order_by(Room.name))).scalars().all()
        if room_stmt is not None
        else []
    )

    out_rooms: list[dict] = []
    conflicts: list[dict] = []
    for room in rooms:
        room_slots = sorted(
            slots_by_room.get(room.id, []), key=lambda s: s.start_time
        )
        slot_dicts = [
            {
                "slot_id": str(s.id),
                "course_id": str(s.course_id),
                "course_title": titles.get(s.course_id, ""),
                "start_time": s.start_time.strftime("%H:%M"),
                "end_time": s.end_time.strftime("%H:%M"),
            }
            for s in room_slots
        ]
        # Pairwise overlap within this room → conflicts (touching edges OK).
        for i in range(len(room_slots)):
            a = room_slots[i]
            for j in range(i + 1, len(room_slots)):
                b = room_slots[j]
                if a.start_time < b.end_time and a.end_time > b.start_time:
                    conflicts.append(
                        {
                            "room_id": str(room.id),
                            "room_name": room.name,
                            "slot_ids": [str(a.id), str(b.id)],
                            "start_time": max(a.start_time, b.start_time).strftime(
                                "%H:%M"
                            ),
                            "end_time": min(a.end_time, b.end_time).strftime("%H:%M"),
                        }
                    )
        out_rooms.append(
            {
                "room_id": str(room.id),
                "room_name": room.name,
                "site": room.site or "",
                "site_id": str(room.site_id) if room.site_id else None,
                "kind": room.kind or "offline",
                # Phase E1: a UI badge — online rooms render a Video icon.
                "video": (room.kind or "offline") == "online",
                "meeting_url": room.meeting_url,
                "capacity": room.capacity,
                "active": room.active,
                "slots": slot_dicts,
                "utilization": len(slot_dicts),
            }
        )

    return {"date": day.isoformat(), "rooms": out_rooms, "conflicts": conflicts}


async def _exercise_counts(
    db: AsyncSession,
    course_id: uuid.UUID,
    student_ids: list[uuid.UUID],
    start: datetime,
    end: datetime,
) -> dict[uuid.UUID, int]:
    rows = (
        await db.execute(
            select(
                ExerciseSubmission.student_id,
                func.count().label("n"),
            )
            .select_from(ExerciseSubmission)
            .join(Exercise, Exercise.id == ExerciseSubmission.exercise_id)
            .join(Lesson, Lesson.id == Exercise.lesson_id)
            .join(Module, Module.id == Lesson.module_id)
            .where(
                Module.course_id == course_id,
                ExerciseSubmission.student_id.in_(student_ids),
                ExerciseSubmission.submitted_at >= start,
                ExerciseSubmission.submitted_at < end,
            )
            .group_by(ExerciseSubmission.student_id)
        )
    ).all()
    return {sid: n for sid, n in rows}


async def _quiz_counts(
    db: AsyncSession,
    course_id: uuid.UUID,
    student_ids: list[uuid.UUID],
    start: datetime,
    end: datetime,
) -> dict[uuid.UUID, int]:
    rows = (
        await db.execute(
            select(
                QuizSubmission.student_id,
                func.count().label("n"),
            )
            .select_from(QuizSubmission)
            .join(Quiz, Quiz.id == QuizSubmission.quiz_id)
            .join(Lesson, Lesson.id == Quiz.lesson_id)
            .join(Module, Module.id == Lesson.module_id)
            .where(
                Module.course_id == course_id,
                QuizSubmission.student_id.in_(student_ids),
                QuizSubmission.submitted_at >= start,
                QuizSubmission.submitted_at < end,
            )
            .group_by(QuizSubmission.student_id)
        )
    ).all()
    return {sid: n for sid, n in rows}


async def _assignment_counts(
    db: AsyncSession,
    course_id: uuid.UUID,
    student_ids: list[uuid.UUID],
    start: datetime,
    end: datetime,
) -> dict[uuid.UUID, int]:
    rows = (
        await db.execute(
            select(
                AssignmentSubmission.student_id,
                func.count().label("n"),
            )
            .select_from(AssignmentSubmission)
            .where(
                AssignmentSubmission.assignment_id.in_(
                    select(Assignment.id).where(Assignment.course_id == course_id)
                ),
                AssignmentSubmission.student_id.in_(student_ids),
                AssignmentSubmission.submitted_at >= start,
                AssignmentSubmission.submitted_at < end,
            )
            .group_by(AssignmentSubmission.student_id)
        )
    ).all()
    return {sid: n for sid, n in rows}


# ── Phase B: idempotent group backfill ──────────────────────────────────────


async def backfill_groups(db: AsyncSession) -> dict[str, int]:
    """Backfill the group-centric scheduling model onto existing data.

    Re-entrant + idempotent — safe to run on every boot. For each course that
    has at least one ``schedule_slot`` or ``class_session`` but no
    :class:`StudentGroup` carrying that ``course_id`` yet, it:

      1. creates ONE default group ``{org_id, name=course.title,
         course_id, teacher_id, status="active"}``;
      2. links that course's schedule_slots + class_sessions to the group
         (only rows where ``group_id IS NULL``);
      3. backfills :class:`StudentGroupMember` from the course's enrollments
         (one member per enrolled student, skipping duplicates).

    Every step is guarded (``WHERE ... IS NULL`` / ``NOT EXISTS`` / existence
    check) so a second run is a no-op. Returns a small counters dict for
    logging/tests. Commits are the caller's responsibility (the boot path runs
    inside its own session; tests use the rolled-back ``db`` fixture).
    """
    # Course ids that have scheduling data attached.
    slot_course_ids = set(
        (await db.execute(select(ScheduleSlot.course_id).distinct())).scalars().all()
    )
    session_course_ids = set(
        (await db.execute(select(ClassSession.course_id).distinct())).scalars().all()
    )
    candidate_course_ids = slot_course_ids | session_course_ids
    if not candidate_course_ids:
        return {"groups_created": 0, "slots_linked": 0, "sessions_linked": 0, "members_added": 0}

    # Courses that already have a group keyed on them — skip those.
    courses_with_group = set(
        (
            await db.execute(
                select(StudentGroup.course_id).where(
                    StudentGroup.course_id.in_(candidate_course_ids)
                )
            )
        ).scalars().all()
    )
    courses_needing_group = candidate_course_ids - courses_with_group

    groups_created = 0
    if courses_needing_group:
        course_rows = (
            await db.execute(
                select(Course.id, Course.org_id, Course.title, Course.teacher_id).where(
                    Course.id.in_(courses_needing_group)
                )
            )
        ).all()
        for cid, org_id, title, teacher_id in course_rows:
            db.add(
                StudentGroup(
                    org_id=org_id,
                    name=title or "Group",
                    course_id=cid,
                    teacher_id=teacher_id,
                    status="active",
                )
            )
            groups_created += 1
        if groups_created:
            await db.flush()

    # Map course_id → default group id. With one group per course this is the
    # group we just created (or a pre-existing one); pick the oldest stable.
    group_rows = (
        await db.execute(
            select(StudentGroup.id, StudentGroup.course_id, StudentGroup.org_id)
            .where(StudentGroup.course_id.in_(candidate_course_ids))
            .order_by(StudentGroup.created_at.asc(), StudentGroup.id.asc())
        )
    ).all()
    default_group_by_course: dict[uuid.UUID, uuid.UUID] = {}
    group_org_by_id: dict[uuid.UUID, uuid.UUID] = {}
    for gid, cid, org_id in group_rows:
        group_org_by_id[gid] = org_id
        # First row per course wins (oldest) → stable default group.
        default_group_by_course.setdefault(cid, gid)

    slots_linked = 0
    sessions_linked = 0
    members_added = 0
    for cid, gid in default_group_by_course.items():
        # Link slots with no group yet.
        slot_res = await db.execute(
            sa_update(ScheduleSlot)
            .where(ScheduleSlot.course_id == cid, ScheduleSlot.group_id.is_(None))
            .values(group_id=gid)
        )
        slots_linked += slot_res.rowcount or 0

        # Link sessions with no group yet.
        sess_res = await db.execute(
            sa_update(ClassSession)
            .where(ClassSession.course_id == cid, ClassSession.group_id.is_(None))
            .values(group_id=gid)
        )
        sessions_linked += sess_res.rowcount or 0

        # Backfill members from enrollment, skipping anyone already a member.
        enrolled_ids = (
            await db.execute(
                select(Enrollment.student_id)
                .where(Enrollment.course_id == cid)
                .distinct()
            )
        ).scalars().all()
        if enrolled_ids:
            existing_member_ids = set(
                (
                    await db.execute(
                        select(StudentGroupMember.user_id).where(
                            StudentGroupMember.group_id == gid
                        )
                    )
                ).scalars().all()
            )
            for sid in enrolled_ids:
                if sid in existing_member_ids:
                    continue
                db.add(StudentGroupMember(group_id=gid, user_id=sid))
                existing_member_ids.add(sid)
                members_added += 1

    await db.flush()
    return {
        "groups_created": groups_created,
        "slots_linked": slots_linked,
        "sessions_linked": sessions_linked,
        "members_added": members_added,
    }

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

import uuid
from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.analytics.task_stats_service import (
    _authorize_course,
    require_stats_role,
)
from app.assessments.models import Quiz, QuizSubmission
from app.assignments.models import Assignment, AssignmentSubmission
from app.attendance.models import AttendanceRecord, AttendanceStatus
from app.auth.models import User, UserRole
from app.courses.models import Lesson, Module
from app.exercises.models import Exercise, ExerciseSubmission
from app.journal.models import ClassSession
from app.progress.models import Enrollment, LessonProgress, LessonStatus


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
    }


def _empty_attendance() -> dict[str, int]:
    return {"present": 0, "late": 0, "absent": 0, "excused": 0, "total": 0}


# ── Upsert ───────────────────────────────────────────────────────────────


async def upsert_session(
    db: AsyncSession,
    user: User,
    course_id: uuid.UUID,
    session_date: date,
    held: bool,
    topic: str,
    notes: str | None,
) -> dict:
    """Insert or update the (course, date) journal row."""
    require_stats_role(user)
    course = await _authorize_course(db, user, course_id)

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
        created_by=user.id,
    )
    db.add(created)
    await db.flush()
    return _session_dict(created)  # type: ignore[return-value]


# ── List ─────────────────────────────────────────────────────────────────


async def list_sessions(
    db: AsyncSession, user: User, course_id: uuid.UUID
) -> dict:
    """All journal rows for a course (newest first) + attendance counts.

    Attendance counts are pulled in a single grouped query keyed by
    (session_date, status) so there is no per-session round-trip.
    """
    require_stats_role(user)
    course = await _authorize_course(db, user, course_id)

    sessions = (
        await db.execute(
            select(ClassSession)
            .where(ClassSession.course_id == course_id)
            .order_by(ClassSession.session_date.desc())
        )
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
        "sessions": out,
    }


# ── Day view (activity) ────────────────────────────────────────────────────


async def get_day(
    db: AsyncSession, user: User, course_id: uuid.UUID, session_date: date
) -> dict:
    """Session row (or null) + per-enrolled-student activity for that day."""
    require_stats_role(user)
    course = await _authorize_course(db, user, course_id)

    session = await db.scalar(
        select(ClassSession).where(
            ClassSession.course_id == course_id,
            ClassSession.session_date == session_date,
        )
    )

    # Enrolled students of the course (id + name), stable ordering.
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
        return {"session": _session_dict(session), "activity": activity}

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

    return {"session": _session_dict(session), "activity": activity}


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

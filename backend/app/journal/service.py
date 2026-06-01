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
from sqlalchemy.ext.asyncio import AsyncSession

from app.analytics.task_stats_service import (
    TaskStatsError,
    _authorize_course,
    _course_scope_clause,
    _is_org_wide,
    require_stats_role,
)
from app.assessments.models import Quiz, QuizSubmission
from app.assignments.models import Assignment, AssignmentSubmission
from app.attendance.models import AttendanceRecord, AttendanceStatus
from app.auth.models import User, UserRole
from app.courses.models import Course, Lesson, Module
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

    scheduled_slots = await _scheduled_slots_for_day(db, course_id, session_date)

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
    teacher_id: uuid.UUID | None = None,
) -> dict:
    """The day's agenda: every active slot on ``day``'s weekday, in scope.

    Each entry is enriched with the matching ClassSession (held/topic) and
    attendance (present / enrolled total) for that course+date. Sessions,
    attendance and enrollment counts are each batch-fetched once for the day's
    courses — no per-slot round-trip. Sorted by start_time.
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
    slot_rows = (
        await db.execute(
            select(ScheduleSlot, Room.name)
            .outerjoin(Room, Room.id == ScheduleSlot.room_id)
            .where(
                ScheduleSlot.course_id.in_(course_ids),
                ScheduleSlot.active.is_(True),
                ScheduleSlot.day_of_week == day.weekday(),
            )
            .order_by(ScheduleSlot.start_time)
        )
    ).all()
    if not slot_rows:
        return {"date": day.isoformat(), "agenda": []}

    day_course_ids = list({s.course_id for s, _ in slot_rows})

    # Teacher names (one query for the teachers referenced by the day's courses).
    teacher_ids = {
        teacher_by_course.get(cid)
        for cid in day_course_ids
        if teacher_by_course.get(cid) is not None
    }
    teacher_names: dict[uuid.UUID, str] = {}
    if teacher_ids:
        for tid, name in (
            await db.execute(
                select(User.id, User.full_name).where(User.id.in_(teacher_ids))
            )
        ).all():
            teacher_names[tid] = name or ""

    # ClassSession per course for this date — one query.
    sessions = (
        await db.execute(
            select(ClassSession).where(
                ClassSession.course_id.in_(day_course_ids),
                ClassSession.session_date == day,
            )
        )
    ).scalars().all()
    session_by_course = {s.course_id: s for s in sessions}

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
        sess = session_by_course.get(cid)
        tid = teacher_by_course.get(cid)
        agenda.append(
            {
                "slot_id": str(slot.id),
                "course_id": str(cid),
                "course_title": titles.get(cid, ""),
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
                    "total": enrolled_by_course.get(cid, 0),
                },
            }
        )

    agenda.sort(key=lambda a: a["start_time"])
    return {"date": day.isoformat(), "agenda": agenda}


# ── Room board (rooms × that day's slots) ────────────────────────────────────


async def get_room_board(db: AsyncSession, user: User, day: date) -> dict:
    """Rooms in scope, each with its slots on ``day``, plus a conflicts list.

    Methodist/admin/super_admin see every org room; a plain teacher sees only
    the rooms used by their own courses' slots that day. ``conflicts`` lists
    every (room, overlapping pair) so the grid can highlight a double-booking.
    All data is fetched in a few batch queries — no per-room round-trip.
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
    slot_rows = (
        await db.execute(
            select(ScheduleSlot)
            .where(
                ScheduleSlot.course_id.in_(course_ids),
                ScheduleSlot.active.is_(True),
                ScheduleSlot.day_of_week == day.weekday(),
                ScheduleSlot.room_id.isnot(None),
            )
            .order_by(ScheduleSlot.start_time)
        )
    ).scalars().all()

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

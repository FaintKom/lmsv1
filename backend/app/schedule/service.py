"""Schedule (weekly timetable) service + RBAC.

Reuses the analytics task-stats RBAC helpers so authorization is identical to
the rest of the staff-facing surface:

  - teacher                      → only their own courses (Course.teacher_id == user.id)
  - is_methodist (any non-super) → all courses in their org
  - admin                        → all courses in their org
  - super_admin                  → all courses, all orgs (global)
  - student / parent             → no write access; read only via ``my_schedule``

Times are stored as ``time`` and serialized as ``"HH:MM"`` strings. The week
and "my" queries JOIN the course title in a single statement (no N+1).
"""
from __future__ import annotations

import uuid
from datetime import time

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.analytics.task_stats_service import (
    TaskStatsError,
    _authorize_course,
    _course_scope_clause,
    require_stats_role,
)
from app.auth.models import User, UserRole
from app.courses.models import Course
from app.progress.models import Enrollment
from app.schedule.models import ScheduleSlot


def _fmt_time(t: time | None) -> str | None:
    """Serialize a ``time`` as ``"HH:MM"`` (or ``None``)."""
    return t.strftime("%H:%M") if t is not None else None


def _slot_to_dict(slot: ScheduleSlot, course_title: str | None = None) -> dict:
    return {
        "id": slot.id,
        "org_id": slot.org_id,
        "course_id": slot.course_id,
        "course_title": course_title,
        "day_of_week": slot.day_of_week,
        "start_time": _fmt_time(slot.start_time),
        "end_time": _fmt_time(slot.end_time),
        "location": slot.location or "",
        "note": slot.note or "",
        "active": slot.active,
    }


def _validate_slot_fields(day_of_week: int, start_time: time, end_time: time) -> None:
    if day_of_week < 0 or day_of_week > 6:
        raise TaskStatsError("bad_request", "day_of_week must be between 0 and 6")
    if end_time <= start_time:
        raise TaskStatsError("bad_request", "end_time must be after start_time")


# ── Reads ────────────────────────────────────────────────────────────────


async def list_course_slots(
    db: AsyncSession, user: User, course_id: uuid.UUID
) -> list[dict]:
    """All slots of a single course (staff only, authorized)."""
    require_stats_role(user)
    course = await _authorize_course(db, user, course_id)
    rows = (
        await db.execute(
            select(ScheduleSlot)
            .where(ScheduleSlot.course_id == course_id)
            .order_by(ScheduleSlot.day_of_week, ScheduleSlot.start_time)
        )
    ).scalars().all()
    return [_slot_to_dict(s, course.title) for s in rows]


async def list_week(db: AsyncSession, user: User) -> list[dict]:
    """Every slot the caller may manage, enriched with course title.

    Teacher → own courses; methodist/admin → whole org; super_admin → all.
    Single JOIN so there is no per-slot follow-up query.
    """
    require_stats_role(user)
    stmt = (
        select(ScheduleSlot, Course.title)
        .join(Course, Course.id == ScheduleSlot.course_id)
        .order_by(ScheduleSlot.day_of_week, ScheduleSlot.start_time)
    )
    scope = _course_scope_clause(user)
    if scope is not None:
        stmt = stmt.where(scope)
    rows = (await db.execute(stmt)).all()
    return [_slot_to_dict(slot, title) for slot, title in rows]


async def my_schedule(db: AsyncSession, user: User) -> list[dict]:
    """The caller's own weekly schedule (read-only, any authenticated user).

    Student → slots of courses they are enrolled in. Teacher → slots of the
    courses they own. Staff with org-wide reach see every org course's slots.
    Single JOIN includes the course title (no N+1).
    """
    stmt = (
        select(ScheduleSlot, Course.title)
        .join(Course, Course.id == ScheduleSlot.course_id)
        .order_by(ScheduleSlot.day_of_week, ScheduleSlot.start_time)
    )

    if user.role == UserRole.student:
        stmt = (
            stmt.join(Enrollment, Enrollment.course_id == Course.id)
            .where(Enrollment.student_id == user.id)
        )
    elif user.role == UserRole.parent:
        # Parents have no enrolled courses of their own; empty schedule.
        return []
    else:
        scope = _course_scope_clause(user)
        if scope is not None:
            stmt = stmt.where(scope)

    rows = (await db.execute(stmt)).all()
    return [_slot_to_dict(slot, title) for slot, title in rows]


# ── Writes ───────────────────────────────────────────────────────────────


async def create_slot(
    db: AsyncSession,
    user: User,
    *,
    course_id: uuid.UUID,
    day_of_week: int,
    start_time: time,
    end_time: time,
    location: str = "",
    note: str = "",
) -> dict:
    require_stats_role(user)
    _validate_slot_fields(day_of_week, start_time, end_time)
    course = await _authorize_course(db, user, course_id)

    slot = ScheduleSlot(
        org_id=course.org_id,
        course_id=course_id,
        day_of_week=day_of_week,
        start_time=start_time,
        end_time=end_time,
        location=location or "",
        note=note or "",
        active=True,
    )
    db.add(slot)
    await db.flush()
    return _slot_to_dict(slot, course.title)


async def _get_authorized_slot(
    db: AsyncSession, user: User, slot_id: uuid.UUID
) -> ScheduleSlot:
    slot = await db.scalar(select(ScheduleSlot).where(ScheduleSlot.id == slot_id))
    if slot is None:
        raise TaskStatsError("not_found", "Schedule slot not found")
    # Authorize on the slot's course (also enforces org isolation).
    await _authorize_course(db, user, slot.course_id)
    return slot


async def update_slot(
    db: AsyncSession,
    user: User,
    slot_id: uuid.UUID,
    *,
    day_of_week: int | None = None,
    start_time: time | None = None,
    end_time: time | None = None,
    location: str | None = None,
    note: str | None = None,
    active: bool | None = None,
) -> dict:
    require_stats_role(user)
    slot = await _get_authorized_slot(db, user, slot_id)

    new_day = day_of_week if day_of_week is not None else slot.day_of_week
    new_start = start_time if start_time is not None else slot.start_time
    new_end = end_time if end_time is not None else slot.end_time
    _validate_slot_fields(new_day, new_start, new_end)

    slot.day_of_week = new_day
    slot.start_time = new_start
    slot.end_time = new_end
    if location is not None:
        slot.location = location
    if note is not None:
        slot.note = note
    if active is not None:
        slot.active = active
    db.add(slot)
    await db.flush()

    course_title = await db.scalar(
        select(Course.title).where(Course.id == slot.course_id)
    )
    return _slot_to_dict(slot, course_title)


async def delete_slot(db: AsyncSession, user: User, slot_id: uuid.UUID) -> None:
    require_stats_role(user)
    slot = await _get_authorized_slot(db, user, slot_id)
    await db.delete(slot)
    await db.flush()

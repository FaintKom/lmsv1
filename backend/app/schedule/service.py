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

import logging
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
from app.email.service import queue_email, send_schedule_change
from app.notifications.service import create_notification
from app.progress.models import Enrollment
from app.rooms.models import Room
from app.schedule.models import ScheduleSlot

logger = logging.getLogger(__name__)


class RoomConflictError(Exception):
    """Raised when a slot's room is already booked for an overlapping window.

    Carries the list of conflicting slots so the router can surface a 409 with
    ``{code: "room_conflict", conflicts: [...]}``.
    """

    def __init__(self, conflicts: list[dict]):
        super().__init__("room_conflict")
        self.conflicts = conflicts


def slot_room_url(slot_id: uuid.UUID) -> str:
    """Derive the Jitsi Meet room URL for an online slot.

    Mirrors ``meetings.service.generate_room_url`` but namespaced with a
    ``-slot-`` segment so a slot room never collides with a live-meeting room.
    The URL is deterministic (derived from the slot id), so nothing is stored.
    """
    return f"https://meet.jit.si/grasslms-slot-{slot_id.hex[:12]}"


def _fmt_time(t: time | None) -> str | None:
    """Serialize a ``time`` as ``"HH:MM"`` (or ``None``)."""
    return t.strftime("%H:%M") if t is not None else None


def _slot_to_dict(
    slot: ScheduleSlot,
    course_title: str | None = None,
    room_name: str | None = None,
) -> dict:
    return {
        "id": slot.id,
        "org_id": slot.org_id,
        "course_id": slot.course_id,
        "course_title": course_title,
        "day_of_week": slot.day_of_week,
        "start_time": _fmt_time(slot.start_time),
        "end_time": _fmt_time(slot.end_time),
        "location": slot.location or "",
        "room_id": slot.room_id,
        "room_name": room_name,
        "note": slot.note or "",
        "active": slot.active,
        "is_online": slot.is_online,
        "room_url": slot_room_url(slot.id) if slot.is_online else None,
    }


def _validate_slot_fields(day_of_week: int, start_time: time, end_time: time) -> None:
    if day_of_week < 0 or day_of_week > 6:
        raise TaskStatsError("bad_request", "day_of_week must be between 0 and 6")
    if end_time <= start_time:
        raise TaskStatsError("bad_request", "end_time must be after start_time")


# ── Room clash detection ────────────────────────────────────────────────────


async def _resolve_room(
    db: AsyncSession, org_id: uuid.UUID, room_id: uuid.UUID | None
) -> Room | None:
    """Validate that ``room_id`` (if set) is a room in the same org.

    Returns the Room or None. Raises ``bad_request`` if the room is missing or
    belongs to a different org (org isolation).
    """
    if room_id is None:
        return None
    room = await db.scalar(select(Room).where(Room.id == room_id))
    if room is None or room.org_id != org_id:
        raise TaskStatsError("bad_request", "Room not found in this organization")
    return room


async def find_room_conflicts(
    db: AsyncSession,
    org_id: uuid.UUID,
    room_id: uuid.UUID,
    day_of_week: int,
    start_time: time,
    end_time: time,
    exclude_slot_id: uuid.UUID | None = None,
) -> list[dict]:
    """Active slots booking the same room at an overlapping time on the same day.

    Two intervals overlap iff ``start < other.end AND end > other.start`` (touching
    edges, e.g. 09:00–10:00 and 10:00–11:00, do NOT overlap). Online slots have
    no ``room_id`` and are therefore never returned. One query, no N+1.
    """
    stmt = (
        select(ScheduleSlot, Course.title)
        .join(Course, Course.id == ScheduleSlot.course_id)
        .where(
            ScheduleSlot.org_id == org_id,
            ScheduleSlot.room_id == room_id,
            ScheduleSlot.day_of_week == day_of_week,
            ScheduleSlot.active.is_(True),
            ScheduleSlot.start_time < end_time,
            ScheduleSlot.end_time > start_time,
        )
        .order_by(ScheduleSlot.start_time)
    )
    if exclude_slot_id is not None:
        stmt = stmt.where(ScheduleSlot.id != exclude_slot_id)
    rows = (await db.execute(stmt)).all()
    return [
        {
            "slot_id": str(slot.id),
            "course_title": title,
            "start_time": _fmt_time(slot.start_time),
            "end_time": _fmt_time(slot.end_time),
        }
        for slot, title in rows
    ]


# ── Reads ────────────────────────────────────────────────────────────────


async def list_course_slots(
    db: AsyncSession, user: User, course_id: uuid.UUID
) -> list[dict]:
    """All slots of a single course (staff only, authorized)."""
    require_stats_role(user)
    course = await _authorize_course(db, user, course_id)
    rows = (
        await db.execute(
            select(ScheduleSlot, Room.name)
            .outerjoin(Room, Room.id == ScheduleSlot.room_id)
            .where(ScheduleSlot.course_id == course_id)
            .order_by(ScheduleSlot.day_of_week, ScheduleSlot.start_time)
        )
    ).all()
    return [_slot_to_dict(s, course.title, room_name) for s, room_name in rows]


async def list_week(db: AsyncSession, user: User) -> list[dict]:
    """Every slot the caller may manage, enriched with course title.

    Teacher → own courses; methodist/admin → whole org; super_admin → all.
    Single JOIN so there is no per-slot follow-up query.
    """
    require_stats_role(user)
    stmt = (
        select(ScheduleSlot, Course.title, Room.name)
        .join(Course, Course.id == ScheduleSlot.course_id)
        .outerjoin(Room, Room.id == ScheduleSlot.room_id)
        .order_by(ScheduleSlot.day_of_week, ScheduleSlot.start_time)
    )
    scope = _course_scope_clause(user)
    if scope is not None:
        stmt = stmt.where(scope)
    rows = (await db.execute(stmt)).all()
    return [_slot_to_dict(slot, title, room_name) for slot, title, room_name in rows]


async def my_schedule(db: AsyncSession, user: User) -> list[dict]:
    """The caller's own weekly schedule (read-only, any authenticated user).

    Student → slots of courses they are enrolled in. Teacher → slots of the
    courses they own. Staff with org-wide reach see every org course's slots.
    Single JOIN includes the course title (no N+1).
    """
    stmt = (
        select(ScheduleSlot, Course.title, Room.name)
        .join(Course, Course.id == ScheduleSlot.course_id)
        .outerjoin(Room, Room.id == ScheduleSlot.room_id)
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
    return [_slot_to_dict(slot, title, room_name) for slot, title, room_name in rows]


# ── Change notifications ───────────────────────────────────────────────────


async def _notify_schedule_change(db: AsyncSession, course: Course, change: str) -> None:
    """Notify the course's enrolled students that its schedule changed.

    ``change`` ∈ {"created", "updated", "removed"}. For each active enrolled
    student we (1) create an in-app notification and (2) best-effort queue an
    email. Recipients are fetched in a single JOIN (no N+1). Email is queued
    via ``queue_email`` which is fully best-effort: it runs off the event loop
    and swallows/logs any failure, and ``_send_email`` no-ops when
    ``EMAIL_ENABLED`` is false — so notifying never breaks the CRUD request.

    Notification text is concise English and is NOT localized (matching how
    existing notifications store plain text).
    """
    rows = (
        await db.execute(
            select(User.id, User.email, User.full_name)
            .join(Enrollment, Enrollment.student_id == User.id)
            .where(
                Enrollment.course_id == course.id,
                User.role == UserRole.student,
                User.is_active.is_(True),
                User.email.isnot(None),
            )
        )
    ).all()

    verb = {
        "created": "added to",
        "updated": "updated for",
        "removed": "removed from",
    }.get(change, "updated for")
    title = "Schedule updated"
    body = f"The class schedule was {verb} {course.title}."

    for user_id, email, full_name in rows:
        await create_notification(
            db,
            user_id=user_id,
            title=title,
            body=body,
            link="/schedule",
        )
        if email:
            # Best-effort, never fatal: queue_email runs off-loop and logs
            # failures; the send no-ops when EMAIL_ENABLED is false.
            try:
                queue_email(send_schedule_change, email, full_name or "", course.title)
            except Exception:  # pragma: no cover - defensive, queue is non-throwing
                logger.warning(
                    "Failed to queue schedule-change email for %s", email
                )


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
    room_id: uuid.UUID | None = None,
    note: str = "",
    is_online: bool = False,
    force: bool = False,
) -> dict:
    require_stats_role(user)
    _validate_slot_fields(day_of_week, start_time, end_time)
    course = await _authorize_course(db, user, course_id)

    # Online slots meet in a derived Jitsi room and never occupy a physical room.
    if is_online:
        room_id = None
    room = await _resolve_room(db, course.org_id, room_id)

    warning: dict | None = None
    if room_id is not None:
        conflicts = await find_room_conflicts(
            db, course.org_id, room_id, day_of_week, start_time, end_time
        )
        if conflicts:
            if not force:
                raise RoomConflictError(conflicts)
            warning = {"code": "room_conflict", "conflicts": conflicts}

    slot = ScheduleSlot(
        org_id=course.org_id,
        course_id=course_id,
        day_of_week=day_of_week,
        start_time=start_time,
        end_time=end_time,
        location=location or "",
        room_id=room_id,
        note=note or "",
        active=True,
        is_online=bool(is_online),
    )
    db.add(slot)
    await db.flush()
    await _notify_schedule_change(db, course, "created")
    result = _slot_to_dict(slot, course.title, room.name if room else None)
    if warning is not None:
        result["warning"] = warning
    return result


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
    room_id: uuid.UUID | None = None,
    room_id_set: bool = False,
    note: str | None = None,
    active: bool | None = None,
    is_online: bool | None = None,
    force: bool = False,
) -> dict:
    require_stats_role(user)
    slot = await _get_authorized_slot(db, user, slot_id)

    new_day = day_of_week if day_of_week is not None else slot.day_of_week
    new_start = start_time if start_time is not None else slot.start_time
    new_end = end_time if end_time is not None else slot.end_time
    _validate_slot_fields(new_day, new_start, new_end)

    new_online = is_online if is_online is not None else slot.is_online
    # Resolve the effective room: an explicit room_id payload (incl. null) wins;
    # otherwise keep the current link. Online slots never hold a physical room.
    new_room_id = room_id if room_id_set else slot.room_id
    if new_online:
        new_room_id = None
    room = await _resolve_room(db, slot.org_id, new_room_id)

    new_active = active if active is not None else slot.active
    warning: dict | None = None
    # Only an active slot with a real room can clash; re-check on any field that
    # affects the booking window or the room link.
    if new_room_id is not None and new_active:
        conflicts = await find_room_conflicts(
            db,
            slot.org_id,
            new_room_id,
            new_day,
            new_start,
            new_end,
            exclude_slot_id=slot.id,
        )
        if conflicts:
            if not force:
                raise RoomConflictError(conflicts)
            warning = {"code": "room_conflict", "conflicts": conflicts}

    slot.day_of_week = new_day
    slot.start_time = new_start
    slot.end_time = new_end
    slot.room_id = new_room_id
    if location is not None:
        slot.location = location
    if note is not None:
        slot.note = note
    if active is not None:
        slot.active = active
    if is_online is not None:
        slot.is_online = is_online
    db.add(slot)
    await db.flush()

    course = await db.scalar(select(Course).where(Course.id == slot.course_id))
    result = _slot_to_dict(
        slot, course.title if course else None, room.name if room else None
    )
    if warning is not None:
        result["warning"] = warning
    await _notify_schedule_change(db, course, "updated")
    return result


async def delete_slot(db: AsyncSession, user: User, slot_id: uuid.UUID) -> None:
    require_stats_role(user)
    slot = await _get_authorized_slot(db, user, slot_id)
    course = await db.scalar(select(Course).where(Course.id == slot.course_id))
    await db.delete(slot)
    await db.flush()
    if course is not None:
        await _notify_schedule_change(db, course, "removed")

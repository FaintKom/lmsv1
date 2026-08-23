import logging
import uuid
from datetime import datetime, time, timedelta

from sqlalchemy import select
from sqlalchemy.exc import ProgrammingError
from sqlalchemy.ext.asyncio import AsyncSession

from app.assignments.models import Assignment
from app.auth.models import User, UserRole
from app.calendar.models import CalendarEvent, EventType

logger = logging.getLogger(__name__)


async def create_event(
    db: AsyncSession,
    data: dict,
    user: User,
) -> CalendarEvent:
    event = CalendarEvent(
        org_id=user.org_id,
        created_by=user.id,
        **data,
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event


async def update_event(
    db: AsyncSession,
    event_id: uuid.UUID,
    data: dict,
    user: User,
) -> CalendarEvent:
    result = await db.execute(
        select(CalendarEvent).where(
            CalendarEvent.id == event_id,
            CalendarEvent.org_id == user.org_id,
        )
    )
    event = result.scalar_one_or_none()
    if not event:
        raise ValueError("Event not found")
    if event.created_by != user.id and user.role not in (UserRole.admin, UserRole.super_admin):
        raise PermissionError("Not allowed")
    for k, v in data.items():
        if v is not None:
            setattr(event, k, v)
    await db.commit()
    await db.refresh(event)
    return event


async def delete_event(
    db: AsyncSession,
    event_id: uuid.UUID,
    user: User,
) -> None:
    result = await db.execute(
        select(CalendarEvent).where(
            CalendarEvent.id == event_id,
            CalendarEvent.org_id == user.org_id,
        )
    )
    event = result.scalar_one_or_none()
    if not event:
        raise ValueError("Event not found")
    if event.created_by != user.id and user.role not in (UserRole.admin, UserRole.super_admin):
        raise PermissionError("Not allowed")
    await db.delete(event)
    await db.commit()


async def list_events(
    db: AsyncSession,
    user: User,
    start: datetime | None = None,
    end: datetime | None = None,
) -> list[dict]:
    """List events for a user's org within a date range, plus assignment deadlines."""
    events: list[dict] = []

    # Calendar events
    try:
        query = select(CalendarEvent).where(CalendarEvent.org_id == user.org_id)
        if start:
            query = query.where(CalendarEvent.start_time >= start)
        if end:
            query = query.where(CalendarEvent.start_time <= end)

        result = await db.execute(query.order_by(CalendarEvent.start_time))
        for ev in result.scalars().all():
            events.append(
                {
                    "id": str(ev.id),
                    "title": ev.title,
                    "description": ev.description,
                    "event_type": ev.event_type.value
                    if isinstance(ev.event_type, EventType)
                    else ev.event_type,
                    "start_time": ev.start_time.isoformat(),
                    "end_time": ev.end_time.isoformat() if ev.end_time else None,
                    "all_day": ev.all_day,
                    "course_id": str(ev.course_id) if ev.course_id else None,
                    "group_id": str(ev.group_id) if ev.group_id else None,
                    "created_by": str(ev.created_by),
                    "recurrence": ev.recurrence,
                    "source": "event",
                }
            )
    except ProgrammingError as exc:
        logger.warning("calendar list_events failed (table may not exist): %s", exc)
        await db.rollback()

    # Auto-inject assignment deadlines
    try:
        a_query = select(Assignment).where(Assignment.org_id == user.org_id)
        if start:
            a_query = a_query.where(Assignment.due_date >= start)
        if end:
            a_query = a_query.where(Assignment.due_date <= end)

        a_result = await db.execute(a_query)
        for a in a_result.scalars().all():
            events.append(
                {
                    "id": f"assignment-{a.id}",
                    "title": f"📝 {a.title}",
                    "description": "Assignment deadline",
                    "event_type": "deadline",
                    "start_time": a.due_date.isoformat(),
                    "end_time": None,
                    "all_day": False,
                    "course_id": str(a.course_id) if a.course_id else None,
                    "group_id": str(a.group_id) if a.group_id else None,
                    "created_by": str(a.created_by),
                    "recurrence": None,
                    "source": "assignment",
                }
            )
    except ProgrammingError as exc:
        logger.warning("calendar assignment deadlines failed: %s", exc)
        await db.rollback()

    # Scheduled lessons. The calendar promised "your schedule, deadlines and
    # events" and showed everything except the schedule: a pupil saw the
    # homework deadline and none of the classes it was set in (specs/054).
    #
    # The weekly timetable is expanded over the requested window rather than
    # read from generated sessions, so a school that has not pressed "generate
    # days" still gets a calendar. Permissions are not re-derived here —
    # my_schedule already answers "whose slots are these" for every role.
    if start and end:
        try:
            from app.schedule.service import my_schedule

            for slot in await my_schedule(db, user):
                for when in _weekly_occurrences(slot, start, end):
                    events.append(
                        {
                            "id": f"slot-{slot['id']}-{when.date().isoformat()}",
                            "title": slot.get("course_title") or "",
                            "description": slot.get("room_name") or slot.get("location") or "",
                            "event_type": "lesson",
                            "start_time": when.isoformat(),
                            "end_time": _slot_end(slot, when),
                            "all_day": False,
                            "course_id": str(slot["course_id"]) if slot.get("course_id") else None,
                            "group_id": str(slot["group_id"]) if slot.get("group_id") else None,
                            "created_by": None,
                            "recurrence": None,
                            "source": "lesson",
                        }
                    )
        except ProgrammingError as exc:
            logger.warning("calendar lessons failed: %s", exc)
            await db.rollback()

    events.sort(key=lambda e: e["start_time"])
    return events


# A window wider than a term is somebody's fat finger, not a real request:
# expanding it would build thousands of rows for one screen.
_MAX_EXPANDED_DAYS = 120


def _slot_end(slot: dict, when: datetime) -> str | None:
    """When the class ends, on the day it starts.

    A lesson without an end reads as a point in time, and the calendar draws
    it as one — no duration, no clash with the next class (specs/060).
    """
    try:
        hour, minute = (int(part) for part in str(slot["end_time"]).split(":")[:2])
    except (KeyError, TypeError, ValueError):
        return None
    return datetime.combine(when.date(), time(hour=hour, minute=minute)).isoformat()


def _weekly_occurrences(slot: dict, start: datetime, end: datetime) -> list[datetime]:
    """Dates in [start, end] falling on the slot's weekday, at its start time.

    ``day_of_week`` is 0=Monday … 6=Sunday — the convention ``date.weekday()``
    uses, so no translation is needed.
    """
    try:
        hour, minute = (int(part) for part in str(slot["start_time"]).split(":")[:2])
    except (KeyError, ValueError):
        return []

    first = start.date()
    last = min(end.date(), first + timedelta(days=_MAX_EXPANDED_DAYS))
    step = first + timedelta(days=(slot["day_of_week"] - first.weekday()) % 7)

    out: list[datetime] = []
    while step <= last:
        out.append(datetime.combine(step, time(hour=hour, minute=minute)))
        step += timedelta(days=7)
    return out


async def get_upcoming_events(
    db: AsyncSession,
    user: User,
    limit: int = 5,
) -> list[dict]:
    """Get next N upcoming events for dashboard widget."""
    now = datetime.utcnow()
    all_events = await list_events(db, user, start=now)
    return all_events[:limit]

import uuid
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.assignments.models import Assignment
from app.auth.models import User, UserRole
from app.calendar.models import CalendarEvent, EventType


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
    # Calendar events
    query = select(CalendarEvent).where(CalendarEvent.org_id == user.org_id)
    if start:
        query = query.where(CalendarEvent.start_time >= start)
    if end:
        query = query.where(CalendarEvent.start_time <= end)

    result = await db.execute(query.order_by(CalendarEvent.start_time))
    events = []
    for ev in result.scalars().all():
        events.append({
            "id": str(ev.id),
            "title": ev.title,
            "description": ev.description,
            "event_type": ev.event_type.value if isinstance(ev.event_type, EventType) else ev.event_type,
            "start_time": ev.start_time.isoformat(),
            "end_time": ev.end_time.isoformat() if ev.end_time else None,
            "all_day": ev.all_day,
            "course_id": str(ev.course_id) if ev.course_id else None,
            "group_id": str(ev.group_id) if ev.group_id else None,
            "created_by": str(ev.created_by),
            "recurrence": ev.recurrence,
            "source": "event",
        })

    # Auto-inject assignment deadlines
    a_query = select(Assignment).where(Assignment.org_id == user.org_id)
    if start:
        a_query = a_query.where(Assignment.due_date >= start)
    if end:
        a_query = a_query.where(Assignment.due_date <= end)

    a_result = await db.execute(a_query)
    for a in a_result.scalars().all():
        events.append({
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
        })

    events.sort(key=lambda e: e["start_time"])
    return events


async def get_upcoming_events(
    db: AsyncSession,
    user: User,
    limit: int = 5,
) -> list[dict]:
    """Get next N upcoming events for dashboard widget."""
    now = datetime.utcnow()
    all_events = await list_events(db, user, start=now)
    return all_events[:limit]

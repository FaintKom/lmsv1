import uuid
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.meetings.models import Meeting


def generate_room_url(meeting_id: uuid.UUID) -> str:
    """Generate a Jitsi Meet room URL."""
    room_name = f"grasslms-{meeting_id.hex[:12]}"
    return f"https://meet.jit.si/{room_name}"


async def create_meeting(
    db: AsyncSession,
    data: dict,
    user: User,
) -> Meeting:
    meeting_id = uuid.uuid4()
    room_url = generate_room_url(meeting_id)

    meeting = Meeting(
        id=meeting_id,
        org_id=user.org_id,
        created_by=user.id,
        room_url=room_url,
        is_active=True,
        **data,
    )
    db.add(meeting)
    await db.commit()
    await db.refresh(meeting)
    return meeting


async def update_meeting(
    db: AsyncSession,
    meeting_id: uuid.UUID,
    user: User,
    data: dict,
) -> Meeting:
    result = await db.execute(
        select(Meeting).where(
            Meeting.id == meeting_id,
            Meeting.org_id == user.org_id,
        )
    )
    meeting = result.scalar_one_or_none()
    if not meeting:
        raise ValueError("Meeting not found")
    for key, value in data.items():
        if value is not None:
            setattr(meeting, key, value)
    await db.commit()
    await db.refresh(meeting)
    return meeting


async def end_meeting(
    db: AsyncSession,
    meeting_id: uuid.UUID,
    user: User,
) -> Meeting:
    result = await db.execute(
        select(Meeting).where(
            Meeting.id == meeting_id,
            Meeting.org_id == user.org_id,
        )
    )
    meeting = result.scalar_one_or_none()
    if not meeting:
        raise ValueError("Meeting not found")
    meeting.is_active = False
    meeting.ended_at = datetime.utcnow()
    await db.commit()
    await db.refresh(meeting)
    return meeting


async def list_meetings(
    db: AsyncSession,
    user: User,
    active_only: bool = False,
) -> list[Meeting]:
    query = select(Meeting).where(Meeting.org_id == user.org_id)
    if active_only:
        query = query.where(Meeting.is_active == True)
    query = query.order_by(Meeting.created_at.desc())
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_meeting(
    db: AsyncSession,
    meeting_id: uuid.UUID,
    user: User,
) -> Meeting | None:
    result = await db.execute(
        select(Meeting).where(
            Meeting.id == meeting_id,
            Meeting.org_id == user.org_id,
        )
    )
    return result.scalar_one_or_none()

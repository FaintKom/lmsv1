import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user, require_role
from app.auth.models import User, UserRole
from app.db.session import get_db
from app.meetings.schemas import MeetingCreate, MeetingResponse, MeetingUpdate
from app.meetings.service import (
    create_meeting,
    end_meeting,
    get_meeting,
    list_meetings,
    update_meeting,
)

router = APIRouter()


@router.post("", response_model=MeetingResponse)
async def create_meeting_endpoint(
    data: MeetingCreate,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    meeting = await create_meeting(db, data.model_dump(), user)
    return MeetingResponse.model_validate(meeting)


@router.get("", response_model=list[MeetingResponse])
async def list_meetings_endpoint(
    active_only: bool = Query(False),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    meetings = await list_meetings(db, user, active_only)
    return [MeetingResponse.model_validate(m) for m in meetings]


@router.get("/active", response_model=list[MeetingResponse])
async def active_meetings_endpoint(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    meetings = await list_meetings(db, user, active_only=True)
    return [MeetingResponse.model_validate(m) for m in meetings]


@router.get("/{meeting_id}", response_model=MeetingResponse)
async def get_meeting_endpoint(
    meeting_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    meeting = await get_meeting(db, meeting_id, user)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return MeetingResponse.model_validate(meeting)


@router.put("/{meeting_id}", response_model=MeetingResponse)
async def update_meeting_endpoint(
    meeting_id: uuid.UUID,
    data: MeetingUpdate,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    try:
        meeting = await update_meeting(db, meeting_id, user, data.model_dump(exclude_unset=True))
        return MeetingResponse.model_validate(meeting)
    except ValueError:
        raise HTTPException(status_code=404, detail="Meeting not found")


@router.post("/{meeting_id}/end", response_model=MeetingResponse)
async def end_meeting_endpoint(
    meeting_id: uuid.UUID,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    try:
        meeting = await end_meeting(db, meeting_id, user)
        return MeetingResponse.model_validate(meeting)
    except ValueError:
        raise HTTPException(status_code=404, detail="Meeting not found")

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user, require_role
from app.auth.models import User, UserRole
from app.calendar.schemas import EventCreate, EventResponse, EventUpdate
from app.calendar.service import (
    create_event,
    delete_event,
    get_upcoming_events,
    list_events,
    update_event,
)
from app.db.session import get_db

router = APIRouter()


@router.get("/events")
async def list_events_endpoint(
    start: datetime | None = Query(None, alias="from"),
    end: datetime | None = Query(None, alias="to"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await list_events(db, user, start, end)


@router.get("/upcoming")
async def upcoming_events_endpoint(
    limit: int = Query(5, ge=1, le=20),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_upcoming_events(db, user, limit)


@router.post("/events", response_model=EventResponse)
async def create_event_endpoint(
    data: EventCreate,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    event = await create_event(db, data.model_dump(), user)
    return EventResponse.model_validate(event)


@router.put("/events/{event_id}", response_model=EventResponse)
async def update_event_endpoint(
    event_id: uuid.UUID,
    data: EventUpdate,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    try:
        event = await update_event(db, event_id, data.model_dump(exclude_unset=True), user)
        return EventResponse.model_validate(event)
    except ValueError:
        raise HTTPException(status_code=404, detail="Event not found")
    except PermissionError:
        raise HTTPException(status_code=403, detail="Not allowed")


@router.delete("/events/{event_id}")
async def delete_event_endpoint(
    event_id: uuid.UUID,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    try:
        await delete_event(db, event_id, user)
        return {"status": "ok"}
    except ValueError:
        raise HTTPException(status_code=404, detail="Event not found")
    except PermissionError:
        raise HTTPException(status_code=403, detail="Not allowed")

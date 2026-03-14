import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.db.session import get_db
from app.notifications.schemas import NotificationResponse, UnreadCountResponse
from app.notifications.service import (
    get_unread_count,
    get_user_notifications,
    mark_all_read,
    mark_read,
)

router = APIRouter()


@router.get("/", response_model=list[NotificationResponse])
async def list_notifications_endpoint(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    notifications = await get_user_notifications(db, user.id)
    return [NotificationResponse.model_validate(n) for n in notifications]


@router.get("/unread-count", response_model=UnreadCountResponse)
async def unread_count_endpoint(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    count = await get_unread_count(db, user.id)
    return UnreadCountResponse(count=count)


@router.put("/{notification_id}/read")
async def mark_read_endpoint(
    notification_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await mark_read(db, notification_id, user.id)
    return {"status": "ok"}


@router.put("/read-all")
async def mark_all_read_endpoint(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await mark_all_read(db, user.id)
    return {"status": "ok"}

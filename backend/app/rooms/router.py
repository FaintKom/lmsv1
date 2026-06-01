"""Managed-rooms endpoints (mounted at ``/api/v1/rooms``).

  - GET    /rooms              staff: list org rooms (teacher read-only)
  - POST   /rooms              methodist/admin/super_admin: create a room
  - PUT    /rooms/{room_id}    methodist/admin/super_admin: update a room
  - DELETE /rooms/{room_id}    methodist/admin/super_admin: delete a room

RBAC + org isolation live in ``rooms.service``; this router is a thin
authn + validation + error-translation shim, mirroring ``schedule.router``.

Deliberately NOT using ``from __future__ import annotations`` so FastAPI /
Pydantic resolve the request/response models eagerly at import time.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.analytics.task_stats_service import TaskStatsError
from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.db.session import get_db
from app.rooms import service as svc

router = APIRouter()


def _translate(exc: TaskStatsError) -> HTTPException:
    code_to_status = {
        "not_found": status.HTTP_404_NOT_FOUND,
        "forbidden": status.HTTP_403_FORBIDDEN,
        "bad_request": status.HTTP_422_UNPROCESSABLE_ENTITY,
    }
    http_status = code_to_status.get(exc.code, status.HTTP_400_BAD_REQUEST)
    return HTTPException(
        status_code=http_status,
        detail={"code": exc.code, "message": exc.message},
    )


class RoomCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    capacity: int | None = Field(default=None, ge=0)
    site: str = Field(default="", max_length=120)


class RoomUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    capacity: int | None = Field(default=None, ge=0)
    site: str | None = Field(default=None, max_length=120)
    active: bool | None = None


@router.get("")
async def list_rooms(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """All rooms in the caller's org (staff only; teacher read-only)."""
    try:
        rooms = await svc.list_rooms(db, user)
    except TaskStatsError as exc:
        raise _translate(exc) from exc
    return {"rooms": rooms}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_room(
    data: RoomCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await svc.create_room(
            db, user, name=data.name, capacity=data.capacity, site=data.site
        )
    except TaskStatsError as exc:
        raise _translate(exc) from exc


@router.put("/{room_id}")
async def update_room(
    room_id: uuid.UUID,
    data: RoomUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await svc.update_room(
            db,
            user,
            room_id,
            name=data.name,
            capacity=data.capacity,
            capacity_set="capacity" in data.model_fields_set,
            site=data.site,
            active=data.active,
        )
    except TaskStatsError as exc:
        raise _translate(exc) from exc


@router.delete("/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_room(
    room_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        await svc.delete_room(db, user, room_id)
    except TaskStatsError as exc:
        raise _translate(exc) from exc

"""Weekly timetable (schedule) endpoints.

Public surface (mounted at ``/api/v1/schedule``):

  - GET    /schedule?course_id=   staff: slots of one course
  - GET    /schedule/week         staff: every slot the caller may manage
  - GET    /schedule/my           any user: caller's own weekly schedule
  - POST   /schedule              staff: create a slot
  - PUT    /schedule/{slot_id}    staff: update a slot
  - DELETE /schedule/{slot_id}    staff: delete a slot

RBAC + org isolation live in ``schedule.service`` (which reuses the analytics
task-stats helpers); this router is a thin authn + validation + error
translation shim, mirroring ``analytics.task_stats_router``.

Deliberately NOT using ``from __future__ import annotations`` so FastAPI /
Pydantic resolve the request/response models eagerly at import time.
"""
import uuid
from datetime import time

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.db.session import get_db
from app.schedule import service as svc
from app.schedule.service import RoomConflictError, TaskStatsError

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


def _conflict(exc: RoomConflictError) -> HTTPException:
    # ``code``/``conflicts`` keep their original meaning (room clashes) for
    # back-compat; ``teacher_conflicts`` is the additive Phase E1 list.
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail={
            "code": "room_conflict",
            "conflicts": exc.conflicts,
            "teacher_conflicts": exc.teacher_conflicts,
        },
    )


class ScheduleSlotCreate(BaseModel):
    # course_id is optional when a group_id is given (the slot's course is
    # derived from the group). Exactly one of the two must identify the course.
    course_id: uuid.UUID | None = None
    group_id: uuid.UUID | None = None
    day_of_week: int = Field(ge=0, le=6)
    start_time: time
    end_time: time
    location: str = Field(default="", max_length=255)
    room_id: uuid.UUID | None = None
    note: str = Field(default="", max_length=500)
    is_online: bool = False


class ScheduleSlotUpdate(BaseModel):
    group_id: uuid.UUID | None = None
    day_of_week: int | None = Field(default=None, ge=0, le=6)
    start_time: time | None = None
    end_time: time | None = None
    location: str | None = Field(default=None, max_length=255)
    room_id: uuid.UUID | None = None
    note: str | None = Field(default=None, max_length=500)
    active: bool | None = None
    is_online: bool | None = None


@router.get("/week")
async def get_week(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Every slot the caller may manage, for building a weekly grid."""
    try:
        slots = await svc.list_week(db, user)
    except TaskStatsError as exc:
        raise _translate(exc) from exc
    return {"slots": slots}


@router.get("/my")
async def get_my_schedule(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """The caller's own weekly schedule (enrolled courses for a student)."""
    slots = await svc.my_schedule(db, user)
    return {"slots": slots}


@router.get("")
async def list_slots(
    course_id: uuid.UUID = Query(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Slots of a single course (staff only)."""
    try:
        slots = await svc.list_course_slots(db, user, course_id)
    except TaskStatsError as exc:
        raise _translate(exc) from exc
    return {"slots": slots}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_slot(
    data: ScheduleSlotCreate,
    force: bool = Query(False),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        slot = await svc.create_slot(
            db,
            user,
            course_id=data.course_id,
            group_id=data.group_id,
            day_of_week=data.day_of_week,
            start_time=data.start_time,
            end_time=data.end_time,
            location=data.location,
            room_id=data.room_id,
            note=data.note,
            is_online=data.is_online,
            force=force,
        )
    except RoomConflictError as exc:
        raise _conflict(exc) from exc
    except TaskStatsError as exc:
        raise _translate(exc) from exc
    return slot


@router.put("/{slot_id}")
async def update_slot(
    slot_id: uuid.UUID,
    data: ScheduleSlotUpdate,
    force: bool = Query(False),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        slot = await svc.update_slot(
            db,
            user,
            slot_id,
            group_id=data.group_id,
            group_id_set="group_id" in data.model_fields_set,
            day_of_week=data.day_of_week,
            start_time=data.start_time,
            end_time=data.end_time,
            location=data.location,
            room_id=data.room_id,
            room_id_set="room_id" in data.model_fields_set,
            note=data.note,
            active=data.active,
            is_online=data.is_online,
            force=force,
        )
    except RoomConflictError as exc:
        raise _conflict(exc) from exc
    except TaskStatsError as exc:
        raise _translate(exc) from exc
    return slot


@router.delete("/{slot_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_slot(
    slot_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        await svc.delete_slot(db, user, slot_id)
    except TaskStatsError as exc:
        raise _translate(exc) from exc

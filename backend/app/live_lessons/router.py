"""Live lessons API."""

import json as _json
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user, require_role
from app.auth.models import User, UserRole
from app.db.session import get_db
from app.live_lessons import realtime, service
from app.live_lessons.models import LessonBoard, LiveLesson
from app.live_lessons.schemas import (
    LessonStateResponse,
    LiveLessonResponse,
    StartLessonRequest,
)

router = APIRouter()


@router.post("", response_model=LiveLessonResponse, status_code=201)
async def start_lesson_endpoint(
    data: StartLessonRequest,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    try:
        lesson, created = await service.start_lesson(
            db, user, data.group_id, data.course_id, data.class_session_id
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    if not created:
        raise HTTPException(status_code=409, detail={"active_lesson_id": str(lesson.id)})
    return LiveLessonResponse.model_validate(lesson)


@router.post("/{lesson_id}/end", response_model=LiveLessonResponse)
async def end_lesson_endpoint(
    lesson_id: uuid.UUID,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    try:
        lesson, is_teacher = await service.get_lesson_for_user(db, lesson_id, user)
    except ValueError:
        raise HTTPException(status_code=404, detail="lesson not found")
    except PermissionError:
        raise HTTPException(status_code=403, detail="forbidden")
    if not is_teacher:
        raise HTTPException(status_code=403, detail="forbidden")
    if lesson.status == "active":
        lesson = await service.finalize_lesson(db, lesson)
    return LiveLessonResponse.model_validate(lesson)


@router.get("/active")
async def active_lesson_endpoint(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.role in (UserRole.admin, UserRole.teacher, UserRole.super_admin):
        lesson = await db.scalar(
            select(LiveLesson).where(
                LiveLesson.teacher_id == user.id, LiveLesson.status == "active"
            )
        )
        return {"lesson_id": str(lesson.id) if lesson else None}
    lesson_id = await realtime.get_redis().get(realtime.invite_key(user.id))
    return {"lesson_id": lesson_id}


@router.get("/{lesson_id}", response_model=LessonStateResponse)
async def lesson_state_endpoint(
    lesson_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        lesson, _ = await service.get_lesson_for_user(db, lesson_id, user)
    except ValueError:
        raise HTTPException(status_code=404, detail="lesson not found")
    except PermissionError:
        raise HTTPException(status_code=403, detail="forbidden")
    # lazy auto-end
    if lesson.status == "active" and await service.teacher_stale(lesson):
        lesson = await service.finalize_lesson(db, lesson)
    r = realtime.get_redis()
    my_signal = await r.hget(realtime.signals_key(lesson.id), str(user.id))
    poll_raw = await r.get(realtime.poll_key(lesson.id))
    board_rows = await db.execute(
        select(LessonBoard.id).where(LessonBoard.live_lesson_id == lesson.id)
    )
    return LessonStateResponse(
        lesson=LiveLessonResponse.model_validate(lesson),
        my_signal=my_signal,
        active_poll=_json.loads(poll_raw) if poll_raw else None,
        board_ids=[row[0] for row in board_rows],
    )

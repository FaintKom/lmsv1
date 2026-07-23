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
    BoardCreateRequest,
    BoardDeltaRequest,
    BoardResponse,
    LessonStateResponse,
    LiveLessonResponse,
    SceneRequest,
    SettingsRequest,
    StartLessonRequest,
)

router = APIRouter()


async def _teacher_lesson(lesson_id: uuid.UUID, user: User, db: AsyncSession) -> LiveLesson:
    """Resolve a lesson the caller may control (teacher of it, or admin). 409 if ended."""
    try:
        lesson, is_teacher = await service.get_lesson_for_user(db, lesson_id, user)
    except ValueError:
        raise HTTPException(status_code=404, detail="lesson not found")
    except PermissionError:
        raise HTTPException(status_code=403, detail="forbidden")
    if not is_teacher:
        raise HTTPException(status_code=403, detail="forbidden")
    if lesson.status != "active":
        raise HTTPException(status_code=409, detail="lesson ended")
    return lesson


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


@router.patch("/{lesson_id}/scene", response_model=LiveLessonResponse)
async def set_scene_endpoint(
    lesson_id: uuid.UUID,
    data: SceneRequest,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    lesson = await _teacher_lesson(lesson_id, user, db)
    try:
        lesson = await service.set_scene(db, lesson, data.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    return LiveLessonResponse.model_validate(lesson)


@router.patch("/{lesson_id}/settings", response_model=LiveLessonResponse)
async def set_settings_endpoint(
    lesson_id: uuid.UUID,
    data: SettingsRequest,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    lesson = await _teacher_lesson(lesson_id, user, db)
    lesson = await service.set_follow_mode(db, lesson, data.follow_mode)
    return LiveLessonResponse.model_validate(lesson)


@router.post("/{lesson_id}/boards", response_model=BoardResponse, status_code=201)
async def create_board_endpoint(
    lesson_id: uuid.UUID,
    data: BoardCreateRequest,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    lesson = await _teacher_lesson(lesson_id, user, db)
    board = await service.create_board(db, lesson, data.kind, data.material_ref)
    return BoardResponse.model_validate(board)


@router.patch("/{lesson_id}/boards/{board_id}", response_model=BoardResponse)
async def board_delta_endpoint(
    lesson_id: uuid.UUID,
    board_id: uuid.UUID,
    data: BoardDeltaRequest,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    lesson = await _teacher_lesson(lesson_id, user, db)
    try:
        board = await service.get_board(db, lesson, board_id)
        board = await service.apply_board_delta(
            db, lesson, board, data.updated, data.deleted, data.version
        )
    except ValueError:
        raise HTTPException(status_code=404, detail="board not found")
    except OverflowError:
        raise HTTPException(status_code=413, detail="delta too large")
    return BoardResponse.model_validate(board)


@router.get("/{lesson_id}/boards/{board_id}", response_model=BoardResponse)
async def get_board_endpoint(
    lesson_id: uuid.UUID,
    board_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # works for ended lessons too (post-lesson review)
    try:
        lesson, _ = await service.get_lesson_for_user(db, lesson_id, user)
        board = await service.get_board(db, lesson, board_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="not found")
    except PermissionError:
        raise HTTPException(status_code=403, detail="forbidden")
    return BoardResponse.model_validate(board)


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

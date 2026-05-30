"""HTTP endpoints for per-task statistics (Phase 2).

Surface (all under ``/analytics/task-stats`` → mounted at ``/api/v1`` so the
public paths are ``/api/v1/analytics/task-stats/...``):

  - GET /analytics/task-stats/courses/{course_id}   per-course task stats (main)
  - GET /analytics/task-stats/lessons/{lesson_id}   per-lesson task stats
  - GET /analytics/task-stats/{task_type}/{task_id} single-task detail (+timeline)

RBAC + org isolation enforced in ``task_stats_service``; this router is a thin
shim doing authn, query parsing, and TaskStatsError → HTTP translation.

Deliberately NOT using ``from __future__ import annotations`` so FastAPI /
Pydantic can resolve response_model classes eagerly at import time.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.analytics import task_stats_service as svc
from app.analytics.task_stats_schemas import (
    CourseTaskStats,
    LessonTaskStats,
    TaskStatsDetail,
)
from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.db.session import get_db

router = APIRouter()


def _translate(exc: svc.TaskStatsError) -> HTTPException:
    code_to_status = {
        "not_found": status.HTTP_404_NOT_FOUND,
        "forbidden": status.HTTP_403_FORBIDDEN,
        "bad_request": status.HTTP_400_BAD_REQUEST,
    }
    http_status = code_to_status.get(exc.code, status.HTTP_400_BAD_REQUEST)
    return HTTPException(
        status_code=http_status,
        detail={"code": exc.code, "message": exc.message},
    )


@router.get(
    "/analytics/task-stats/courses/{course_id}",
    response_model=CourseTaskStats,
)
async def course_task_stats_endpoint(
    course_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CourseTaskStats:
    try:
        data = await svc.get_course_task_stats(db, user, course_id)
    except svc.TaskStatsError as exc:
        raise _translate(exc) from exc
    return CourseTaskStats.model_validate(data)


@router.get(
    "/analytics/task-stats/lessons/{lesson_id}",
    response_model=LessonTaskStats,
)
async def lesson_task_stats_endpoint(
    lesson_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> LessonTaskStats:
    try:
        data = await svc.get_lesson_task_stats(db, user, lesson_id)
    except svc.TaskStatsError as exc:
        raise _translate(exc) from exc
    return LessonTaskStats.model_validate(data)


@router.get(
    "/analytics/task-stats/{task_type}/{task_id}",
    response_model=TaskStatsDetail,
)
async def task_detail_endpoint(
    task_type: str,
    task_id: uuid.UUID,
    timeline: bool = Query(default=False, description="Include per-day timeline"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TaskStatsDetail:
    try:
        data = await svc.get_task_detail(
            db, user, task_type, task_id, include_timeline=timeline
        )
    except svc.TaskStatsError as exc:
        raise _translate(exc) from exc
    return TaskStatsDetail.model_validate(data)

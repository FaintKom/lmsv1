"""Curriculum (scope & sequence) endpoints.

Course-level program management. Staff only; the org-vs-own-course scoping is
enforced in the service layer via the shared analytics task-stats helpers.
Writes are further gated to org-wide staff (methodist/admin/super_admin) in the
service. ``TaskStatsError`` codes map to HTTP exactly like the journal router.
"""
from __future__ import annotations

import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.analytics.task_stats_service import TaskStatsError
from app.auth.dependencies import require_role
from app.auth.models import User, UserRole
from app.curriculum import service as curriculum_service
from app.db.session import get_db

router = APIRouter()

_MANAGER_ROLES = (UserRole.admin, UserRole.teacher)


def _translate(exc: TaskStatsError) -> HTTPException:
    code_to_status = {
        "not_found": status.HTTP_404_NOT_FOUND,
        "forbidden": status.HTTP_403_FORBIDDEN,
    }
    http_status = code_to_status.get(exc.code, status.HTTP_400_BAD_REQUEST)
    return HTTPException(
        status_code=http_status,
        detail={"code": exc.code, "message": exc.message},
    )


class TopicCreateRequest(BaseModel):
    course_id: uuid.UUID
    title: str = Field(default="", max_length=300)
    planned_lessons: int | None = Field(default=None, ge=1)
    target_date: date | None = None


class TopicUpdateRequest(BaseModel):
    # All optional — a partial update. ``target_date`` uses
    # ``model_fields_set`` to tell "clear" (explicit null) from "untouched".
    title: str | None = Field(default=None, max_length=300)
    planned_lessons: int | None = Field(default=None, ge=1)
    target_date: date | None = None
    position: int | None = Field(default=None, ge=1)


@router.get("/curriculum")
async def list_curriculum(
    course_id: uuid.UUID = Query(...),
    user: User = Depends(require_role(*_MANAGER_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    """Ordered scope & sequence of a course."""
    try:
        return await curriculum_service.list_topics(db, user, course_id)
    except TaskStatsError as exc:
        raise _translate(exc) from exc


@router.post("/curriculum")
async def create_curriculum_topic(
    body: TopicCreateRequest,
    user: User = Depends(require_role(*_MANAGER_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    """Append a topic at the next position for the course."""
    try:
        return await curriculum_service.create_topic(
            db, user, body.course_id, body.title, body.planned_lessons, body.target_date
        )
    except TaskStatsError as exc:
        raise _translate(exc) from exc


@router.put("/curriculum/{topic_id}")
async def update_curriculum_topic(
    topic_id: uuid.UUID,
    body: TopicUpdateRequest,
    user: User = Depends(require_role(*_MANAGER_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    """Update title/planned_lessons/target_date and/or reorder a topic."""
    try:
        return await curriculum_service.update_topic(
            db,
            user,
            topic_id,
            title=body.title,
            planned_lessons=body.planned_lessons,
            target_date=body.target_date,
            target_date_set="target_date" in body.model_fields_set,
            position=body.position,
        )
    except TaskStatsError as exc:
        raise _translate(exc) from exc


@router.delete("/curriculum/{topic_id}")
async def delete_curriculum_topic(
    topic_id: uuid.UUID,
    user: User = Depends(require_role(*_MANAGER_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    """Delete a topic and close the position gap."""
    try:
        return await curriculum_service.delete_topic(db, user, topic_id)
    except TaskStatsError as exc:
        raise _translate(exc) from exc

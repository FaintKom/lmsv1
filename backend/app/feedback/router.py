"""HTTP endpoints for the content-feedback module.

Two surfaces in one router:
  - student-facing (POST/GET/PATCH for own feedback)
  - admin-facing  (list/stats/status PATCH/award XP) under /admin

The router is a thin shim — every cross-cutting rule lives in
``service.py`` so this file only does authn/RBAC, schema parsing, and
domain-error → HTTPException translation.

Deliberately NOT using ``from __future__ import annotations`` — FastAPI
needs eager class resolution of body/response Pydantic models when the
``@router.post`` decorator fires at import time, and Pydantic 2.9 trips
over union forward-refs (``Response | None``) under PEP 563.
"""
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.auth.models import User, UserRole
from app.common.rate_limit import limiter
from app.db.session import get_db
from app.feedback import service as feedback_service
from app.feedback.models import (
    ContentFeedback,
    FeedbackCategory,
    FeedbackKind,
    FeedbackStatus,
)
from app.feedback.schemas import (
    AdminFeedbackResponse,
    AdminStatusUpdateRequest,
    FeedbackCreateRequest,
    FeedbackResponse,
    FeedbackStatsResponse,
    FeedbackUpdateRequest,
)

router = APIRouter()


def _translate(exc: feedback_service.FeedbackError) -> HTTPException:
    """Map domain errors to HTTP responses with stable codes."""
    code_to_status = {
        "lesson_not_found": status.HTTP_404_NOT_FOUND,
        "not_found": status.HTTP_404_NOT_FOUND,
        "forbidden": status.HTTP_403_FORBIDDEN,
        "cross_org": status.HTTP_403_FORBIDDEN,
        "edit_window_expired": status.HTTP_409_CONFLICT,
        "block_cap_reached": status.HTTP_429_TOO_MANY_REQUESTS,
        "xp_hourly_cap": status.HTTP_429_TOO_MANY_REQUESTS,
    }
    http_status = code_to_status.get(exc.code, status.HTTP_400_BAD_REQUEST)
    return HTTPException(
        status_code=http_status,
        detail={"code": exc.code, "message": exc.message},
    )


def _require_admin(user: User) -> None:
    if user.role not in (UserRole.super_admin, UserRole.admin, UserRole.teacher):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or teacher role required",
        )


# ── Student endpoints ─────────────────────────────────────────────────


@router.post("/feedback", response_model=FeedbackResponse, status_code=201)
@limiter.limit("10/hour")
async def create_feedback_endpoint(
    request: Request,
    body: FeedbackCreateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FeedbackResponse:
    try:
        row = await feedback_service.create_feedback(db, user, body)
    except feedback_service.FeedbackError as exc:
        raise _translate(exc) from exc
    return FeedbackResponse.model_validate(row)


@router.get(
    "/feedback/lesson/{lesson_id}/my",
    response_model=FeedbackResponse | None,
)
async def get_my_lesson_rating_endpoint(
    lesson_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FeedbackResponse | None:
    row = await feedback_service.get_my_lesson_rating(db, user, lesson_id)
    return FeedbackResponse.model_validate(row) if row else None


@router.patch("/feedback/{feedback_id}", response_model=FeedbackResponse)
async def update_own_feedback_endpoint(
    feedback_id: uuid.UUID,
    body: FeedbackUpdateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FeedbackResponse:
    try:
        row = await feedback_service.update_own_feedback(db, user, feedback_id, body)
    except feedback_service.FeedbackError as exc:
        raise _translate(exc) from exc
    return FeedbackResponse.model_validate(row)


# ── Admin endpoints ───────────────────────────────────────────────────


async def _hydrate_admin_response(
    db: AsyncSession, row: ContentFeedback
) -> AdminFeedbackResponse:
    """Attach author identity (name/email) which the student schema hides."""
    author = await db.scalar(select(User).where(User.id == row.user_id))
    resp = AdminFeedbackResponse.model_validate(row)
    if author is not None:
        resp.user_name = getattr(author, "name", None) or getattr(author, "full_name", None)
        resp.user_email = author.email
    return resp


@router.get("/admin/feedback", response_model=list[AdminFeedbackResponse])
async def list_admin_feedback_endpoint(
    fstatus: FeedbackStatus | None = Query(default=None, alias="status"),
    kind: FeedbackKind | None = None,
    category: FeedbackCategory | None = None,
    course_id: uuid.UUID | None = None,
    lesson_id: uuid.UUID | None = None,
    since: datetime | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[AdminFeedbackResponse]:
    _require_admin(user)
    rows = await feedback_service.list_admin_feedback(
        db,
        user.org_id,
        status=fstatus,
        kind=kind,
        category=category,
        course_id=course_id,
        lesson_id=lesson_id,
        since=since,
        limit=limit,
        offset=offset,
    )
    return [await _hydrate_admin_response(db, r) for r in rows]


@router.get("/admin/feedback/stats", response_model=FeedbackStatsResponse)
async def feedback_stats_endpoint(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FeedbackStatsResponse:
    _require_admin(user)
    payload = await feedback_service.compute_stats(db, user.org_id)
    return FeedbackStatsResponse.model_validate(payload)


@router.patch(
    "/admin/feedback/{feedback_id}/status",
    response_model=AdminFeedbackResponse,
)
async def update_status_endpoint(
    feedback_id: uuid.UUID,
    body: AdminStatusUpdateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AdminFeedbackResponse:
    _require_admin(user)
    try:
        row = await feedback_service.update_status(db, user, feedback_id, body)
    except feedback_service.FeedbackError as exc:
        raise _translate(exc) from exc
    return await _hydrate_admin_response(db, row)


@router.post(
    "/admin/feedback/{feedback_id}/award-xp",
    response_model=AdminFeedbackResponse,
)
async def award_xp_endpoint(
    feedback_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AdminFeedbackResponse:
    _require_admin(user)
    try:
        row = await feedback_service.award_xp(db, user, feedback_id)
    except feedback_service.FeedbackError as exc:
        raise _translate(exc) from exc
    return await _hydrate_admin_response(db, row)

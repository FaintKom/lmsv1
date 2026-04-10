from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user, require_role
from app.auth.models import User, UserRole
from app.db.session import get_db
from app.peer_review.models import PeerReview, PeerReviewAssignment, PeerReviewStatus

router = APIRouter()


class PeerReviewAssignmentCreate(BaseModel):
    course_id: uuid.UUID
    title: str
    min_reviews: int = 1
    deadline: datetime | None = None


class PeerReviewAssignmentResponse(BaseModel):
    id: uuid.UUID
    org_id: uuid.UUID
    course_id: uuid.UUID
    title: str
    min_reviews: int
    deadline: datetime | None

    model_config = {"from_attributes": True}


class PeerReviewResponse(BaseModel):
    id: uuid.UUID
    assignment_id: uuid.UUID
    reviewer_id: uuid.UUID
    reviewee_id: uuid.UUID
    status: str
    rating: int | None
    comment: str | None

    model_config = {"from_attributes": True}


class PeerReviewSubmit(BaseModel):
    rating: int | None = None
    comment: str | None = None


@router.post(
    "/assignments",
    response_model=PeerReviewAssignmentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_assignment(
    body: PeerReviewAssignmentCreate,
    user: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    assignment = PeerReviewAssignment(
        org_id=user.org_id,
        course_id=body.course_id,
        title=body.title,
        min_reviews=body.min_reviews,
        deadline=body.deadline,
    )
    db.add(assignment)
    await db.flush()
    return assignment


@router.get("/my-reviews", response_model=list[PeerReviewResponse])
async def my_reviews(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PeerReview).where(PeerReview.reviewer_id == user.id)
    )
    return result.scalars().all()


@router.post("/{review_id}/submit", response_model=PeerReviewResponse)
async def submit_review(
    review_id: uuid.UUID,
    body: PeerReviewSubmit,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PeerReview).where(
            PeerReview.id == review_id,
            PeerReview.reviewer_id == user.id,
        )
    )
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")

    review.rating = body.rating
    review.comment = body.comment
    review.status = PeerReviewStatus.completed
    await db.flush()
    return review

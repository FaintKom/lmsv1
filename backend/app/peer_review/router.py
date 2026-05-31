from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.auth.dependencies import get_current_user, require_role
from app.auth.models import User, UserRole
from app.db.session import get_db
from app.peer_review.models import PeerReview, PeerReviewAssignment, PeerReviewStatus
from app.peer_review.service import authorize_assignment_course, distribute_reviews

router = APIRouter()

# Roles allowed to manage assignments / distribution / overview.
_MANAGER_ROLES = (UserRole.teacher, UserRole.admin)


class PeerReviewAssignmentCreate(BaseModel):
    course_id: uuid.UUID
    title: str
    min_reviews: int = 1
    deadline: datetime | None = None

    @field_validator("title")
    @classmethod
    def _title_not_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("title must not be blank")
        return v

    @field_validator("min_reviews")
    @classmethod
    def _min_reviews_positive(cls, v: int) -> int:
        if v < 1:
            raise ValueError("min_reviews must be at least 1")
        return v


class PeerReviewAssignmentResponse(BaseModel):
    id: uuid.UUID
    org_id: uuid.UUID
    course_id: uuid.UUID
    title: str
    min_reviews: int
    deadline: datetime | None

    model_config = {"from_attributes": True}


class PeerReviewAssignmentStatsResponse(PeerReviewAssignmentResponse):
    total_reviews: int
    completed_reviews: int
    pending_reviews: int


class PeerReviewResponse(BaseModel):
    id: uuid.UUID
    assignment_id: uuid.UUID
    reviewer_id: uuid.UUID
    reviewee_id: uuid.UUID
    status: str
    rating: int | None
    comment: str | None

    model_config = {"from_attributes": True}


class MyPeerReviewResponse(PeerReviewResponse):
    assignment_title: str
    reviewee_name: str
    deadline: datetime | None = None


class PeerReviewDetailRow(PeerReviewResponse):
    reviewer_name: str
    reviewee_name: str


class PeerReviewAssignmentDetailResponse(PeerReviewAssignmentStatsResponse):
    reviews: list[PeerReviewDetailRow]


class DistributeResponse(BaseModel):
    created: int
    total_students: int


class PeerReviewSubmit(BaseModel):
    rating: int | None = None
    comment: str | None = None

    @field_validator("rating")
    @classmethod
    def _rating_range(cls, v: int | None) -> int | None:
        if v is not None and not (1 <= v <= 5):
            raise ValueError("rating must be between 1 and 5")
        return v


async def _load_assignment(
    db: AsyncSession, assignment_id: uuid.UUID, user: User
) -> PeerReviewAssignment:
    """Fetch an assignment and authorize the caller against its course."""
    assignment = await db.scalar(
        select(PeerReviewAssignment).where(PeerReviewAssignment.id == assignment_id)
    )
    if assignment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found"
        )
    await authorize_assignment_course(db, user, assignment.course_id)
    return assignment


def _stats_payload(assignment: PeerReviewAssignment, total: int, completed: int) -> dict:
    return {
        "id": assignment.id,
        "org_id": assignment.org_id,
        "course_id": assignment.course_id,
        "title": assignment.title,
        "min_reviews": assignment.min_reviews,
        "deadline": assignment.deadline,
        "total_reviews": total,
        "completed_reviews": completed,
        "pending_reviews": total - completed,
    }


@router.post(
    "/assignments",
    response_model=PeerReviewAssignmentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_assignment(
    body: PeerReviewAssignmentCreate,
    user: User = Depends(require_role(*_MANAGER_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    # Confirm the course belongs to the caller's scope before creating.
    await authorize_assignment_course(db, user, body.course_id)
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


@router.post(
    "/assignments/{assignment_id}/distribute",
    response_model=DistributeResponse,
)
async def distribute_assignment(
    assignment_id: uuid.UUID,
    user: User = Depends(require_role(*_MANAGER_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    assignment = await _load_assignment(db, assignment_id, user)
    return await distribute_reviews(db, assignment, user)


@router.get(
    "/assignments",
    response_model=list[PeerReviewAssignmentStatsResponse],
)
async def list_assignments(
    course_id: uuid.UUID,
    user: User = Depends(require_role(*_MANAGER_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    await authorize_assignment_course(db, user, course_id)
    completed_flag = PeerReview.status == PeerReviewStatus.completed
    rows = (
        await db.execute(
            select(
                PeerReviewAssignment,
                func.count(PeerReview.id).label("total_reviews"),
                func.count(PeerReview.id).filter(completed_flag).label("completed_reviews"),
            )
            .outerjoin(PeerReview, PeerReview.assignment_id == PeerReviewAssignment.id)
            .where(PeerReviewAssignment.course_id == course_id)
            .group_by(PeerReviewAssignment.id)
            .order_by(PeerReviewAssignment.created_at.desc())
        )
    ).all()
    return [
        _stats_payload(a, total or 0, completed or 0) for a, total, completed in rows
    ]


@router.get(
    "/assignments/{assignment_id}",
    response_model=PeerReviewAssignmentDetailResponse,
)
async def get_assignment(
    assignment_id: uuid.UUID,
    user: User = Depends(require_role(*_MANAGER_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    assignment = await _load_assignment(db, assignment_id, user)
    reviewer = aliased(User)
    reviewee = aliased(User)
    rows = (
        await db.execute(
            select(PeerReview, reviewer.full_name, reviewee.full_name)
            .join(reviewer, reviewer.id == PeerReview.reviewer_id)
            .join(reviewee, reviewee.id == PeerReview.reviewee_id)
            .where(PeerReview.assignment_id == assignment_id)
            .order_by(reviewer.full_name, reviewee.full_name)
        )
    ).all()

    reviews = [
        PeerReviewDetailRow(
            id=r.id,
            assignment_id=r.assignment_id,
            reviewer_id=r.reviewer_id,
            reviewee_id=r.reviewee_id,
            status=r.status.value,
            rating=r.rating,
            comment=r.comment,
            reviewer_name=reviewer_name,
            reviewee_name=reviewee_name,
        )
        for r, reviewer_name, reviewee_name in rows
    ]
    total = len(reviews)
    completed = sum(1 for x in reviews if x.status == PeerReviewStatus.completed.value)
    return {**_stats_payload(assignment, total, completed), "reviews": reviews}


@router.get("/my-reviews", response_model=list[MyPeerReviewResponse])
async def my_reviews(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    reviewee = aliased(User)
    rows = (
        await db.execute(
            select(
                PeerReview,
                PeerReviewAssignment.title,
                PeerReviewAssignment.deadline,
                reviewee.full_name,
            )
            .join(
                PeerReviewAssignment,
                PeerReviewAssignment.id == PeerReview.assignment_id,
            )
            .join(reviewee, reviewee.id == PeerReview.reviewee_id)
            .where(PeerReview.reviewer_id == user.id)
            .order_by(PeerReview.created_at.desc())
        )
    ).all()
    return [
        MyPeerReviewResponse(
            id=r.id,
            assignment_id=r.assignment_id,
            reviewer_id=r.reviewer_id,
            reviewee_id=r.reviewee_id,
            status=r.status.value,
            rating=r.rating,
            comment=r.comment,
            assignment_title=title,
            reviewee_name=reviewee_name,
            deadline=deadline,
        )
        for r, title, deadline, reviewee_name in rows
    ]


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

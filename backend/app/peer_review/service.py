"""Peer-review distribution + RBAC.

Reviewer→reviewee pairing for a peer-review assignment. Students enrolled in
the assignment's course are paired round-robin so each reviews ``min_reviews``
distinct *other* students (never themselves).

RBAC mirrors :mod:`app.analytics.task_stats_service`:

  - teacher                      → only their own courses (Course.teacher_id == user.id)
  - is_methodist (any non-super) → all courses in their org
  - admin                        → all courses in their org
  - super_admin                  → all courses, all orgs (global)
"""
from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User, UserRole
from app.courses.models import Course
from app.peer_review.models import (
    PeerReview,
    PeerReviewAssignment,
    PeerReviewStatus,
)
from app.progress.models import Enrollment


def _is_org_wide(user: User) -> bool:
    """Whether the user sees every course in their org (vs. own courses only)."""
    return user.role in (UserRole.admin, UserRole.super_admin) or bool(user.is_methodist)


async def authorize_assignment_course(
    db: AsyncSession, user: User, course_id: uuid.UUID
) -> Course:
    """Confirm the caller may manage peer reviews for ``course_id``.

    Raises 404 across org boundaries (hide existence) and 403 when a plain
    teacher tries to touch a colleague's course.
    """
    course = await db.scalar(select(Course).where(Course.id == course_id))
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    if user.role == UserRole.super_admin:
        return course
    if course.org_id != user.org_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    if not _is_org_wide(user) and course.teacher_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only manage your own courses",
        )
    return course


async def _enrolled_student_ids(
    db: AsyncSession, course_id: uuid.UUID
) -> list[uuid.UUID]:
    """Active enrolled students of a course, sorted for deterministic pairing."""
    rows = (
        await db.execute(
            select(Enrollment.student_id)
            .join(User, User.id == Enrollment.student_id)
            .where(
                Enrollment.course_id == course_id,
                User.role == UserRole.student,
                User.is_active.is_(True),
            )
            .distinct()
        )
    ).all()
    return sorted({r[0] for r in rows}, key=str)


async def distribute_reviews(
    db: AsyncSession, assignment: PeerReviewAssignment, actor: User
) -> dict:
    """Pair enrolled students for ``assignment`` round-robin.

    Each student reviews ``min_reviews`` distinct other students (clamped to
    N-1). Idempotent: drops existing *pending* reviews and recreates, but keeps
    completed ones and never recreates a pair that is already completed.
    Returns ``{"created": int, "total_students": int}``.
    """
    student_ids = await _enrolled_student_ids(db, assignment.course_id)
    n = len(student_ids)
    if n < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Peer review needs at least 2 enrolled students",
        )

    reviews_per = max(1, min(assignment.min_reviews, n - 1))

    # Existing reviews for this assignment. Keep completed pairs; clear pending.
    existing = (
        await db.execute(
            select(PeerReview).where(PeerReview.assignment_id == assignment.id)
        )
    ).scalars().all()

    completed_pairs: set[tuple[uuid.UUID, uuid.UUID]] = set()
    for r in existing:
        if r.status == PeerReviewStatus.completed:
            completed_pairs.add((r.reviewer_id, r.reviewee_id))
        else:
            await db.delete(r)
    await db.flush()

    created = 0
    for i, reviewer_id in enumerate(student_ids):
        for offset in range(1, reviews_per + 1):
            reviewee_id = student_ids[(i + offset) % n]
            if reviewee_id == reviewer_id:
                continue
            if (reviewer_id, reviewee_id) in completed_pairs:
                continue
            db.add(
                PeerReview(
                    assignment_id=assignment.id,
                    reviewer_id=reviewer_id,
                    reviewee_id=reviewee_id,
                    status=PeerReviewStatus.pending,
                )
            )
            created += 1

    await db.flush()
    return {"created": created, "total_students": n}

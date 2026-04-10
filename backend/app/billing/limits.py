"""Plan limit enforcement (monetization gate).

Checks whether an org has exceeded its plan's max_students or
max_courses. Called at enrollment and course creation time.

If the org has no active subscription, we treat it as the free tier
(the plan with price_monthly=0, or hard defaults if no plans exist).

A limit of -1 means unlimited.
"""
from __future__ import annotations

import uuid

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.billing.models import Plan, Subscription, SubscriptionStatus
from app.courses.models import Course
from app.progress.models import Enrollment

# Hard defaults when no plans are seeded in the DB.
FREE_MAX_STUDENTS = 30
FREE_MAX_COURSES = 3


async def _get_org_limits(db: AsyncSession, org_id: uuid.UUID) -> tuple[int, int]:
    """Return (max_students, max_courses) for the org's active plan."""
    sub = (
        await db.execute(
            select(Subscription)
            .where(
                Subscription.org_id == org_id,
                Subscription.status == SubscriptionStatus.active,
            )
            .order_by(Subscription.created_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()

    if sub:
        plan = (
            await db.execute(select(Plan).where(Plan.id == sub.plan_id))
        ).scalar_one_or_none()
        if plan:
            return (plan.max_students, plan.max_courses)

    # No subscription → look for a free plan
    free_plan = (
        await db.execute(
            select(Plan).where(Plan.price_monthly == 0, Plan.is_active == True)  # noqa: E712
        )
    ).scalar_one_or_none()
    if free_plan:
        return (free_plan.max_students, free_plan.max_courses)

    return (FREE_MAX_STUDENTS, FREE_MAX_COURSES)


async def check_student_limit(db: AsyncSession, org_id: uuid.UUID) -> None:
    """Raise 403 if the org has reached its max_students limit."""
    max_students, _ = await _get_org_limits(db, org_id)
    if max_students == -1:
        return  # unlimited

    current = (
        await db.execute(
            select(func.count(func.distinct(Enrollment.student_id)))
            .join(Course, Enrollment.course_id == Course.id)
            .where(Course.org_id == org_id)
        )
    ).scalar() or 0

    if current >= max_students:
        raise HTTPException(
            403,
            f"Your plan allows up to {max_students} students. "
            f"Upgrade your plan to enroll more.",
        )


async def check_course_limit(db: AsyncSession, org_id: uuid.UUID) -> None:
    """Raise 403 if the org has reached its max_courses limit."""
    _, max_courses = await _get_org_limits(db, org_id)
    if max_courses == -1:
        return  # unlimited

    current = (
        await db.execute(
            select(func.count(Course.id)).where(Course.org_id == org_id)
        )
    ).scalar() or 0

    if current >= max_courses:
        raise HTTPException(
            403,
            f"Your plan allows up to {max_courses} courses. "
            f"Upgrade your plan to create more.",
        )

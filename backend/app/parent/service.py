import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.assignments.models import Assignment, AssignmentSubmission
from app.auth.models import ParentChild, User, UserRole
from app.courses.models import Course
from app.gamification.models import UserStreak
from app.progress.models import Enrollment


async def get_children(db: AsyncSession, parent_id: uuid.UUID, org_id: uuid.UUID) -> list[dict]:
    """Get children linked to a parent (same org only)."""
    result = await db.execute(
        select(User)
        .join(ParentChild, ParentChild.child_id == User.id)
        .where(ParentChild.parent_id == parent_id, User.org_id == org_id)
    )
    children = result.scalars().all()
    return [
        {
            "id": str(c.id),
            "full_name": c.full_name,
            "email": c.email,
            "avatar_url": c.avatar_url,
        }
        for c in children
    ]


async def get_child_progress(
    db: AsyncSession,
    parent_id: uuid.UUID,
    child_id: uuid.UUID,
    org_id: uuid.UUID,
) -> dict:
    """Get a child's learning progress (only if linked, same org)."""
    # Verify parent-child link + org scope
    link = await db.execute(
        select(ParentChild)
        .join(User, ParentChild.child_id == User.id)
        .where(
            ParentChild.parent_id == parent_id,
            ParentChild.child_id == child_id,
            User.org_id == org_id,
        )
    )
    if not link.scalar_one_or_none():
        raise PermissionError("Not your child")

    # Enrollments (org-scoped via course)
    result = await db.execute(
        select(Enrollment, Course.title)
        .join(Course, Enrollment.course_id == Course.id)
        .where(Enrollment.student_id == child_id, Course.org_id == org_id)
    )
    enrollments = [
        {
            "course_title": title,
            "progress_percent": float(e.progress_percent or 0),
            "enrolled_at": e.enrolled_at.isoformat() if e.enrolled_at else None,
            "completed_at": e.completed_at.isoformat() if e.completed_at else None,
        }
        for e, title in result.all()
    ]

    # Streak / XP
    streak_result = await db.execute(
        select(UserStreak).where(UserStreak.user_id == child_id)
    )
    streak = streak_result.scalar_one_or_none()

    return {
        "enrollments": enrollments,
        "total_courses": len(enrollments),
        "completed_courses": sum(1 for e in enrollments if e["completed_at"]),
        "avg_progress": round(sum(e["progress_percent"] for e in enrollments) / len(enrollments), 1) if enrollments else 0,
        "current_streak": streak.current_streak if streak else 0,
        "total_xp": streak.total_xp if streak else 0,
    }


async def get_child_grades(
    db: AsyncSession,
    parent_id: uuid.UUID,
    child_id: uuid.UUID,
    org_id: uuid.UUID,
) -> list[dict]:
    """Get a child's assignment grades (org-scoped)."""
    link = await db.execute(
        select(ParentChild)
        .join(User, ParentChild.child_id == User.id)
        .where(
            ParentChild.parent_id == parent_id,
            ParentChild.child_id == child_id,
            User.org_id == org_id,
        )
    )
    if not link.scalar_one_or_none():
        raise PermissionError("Not your child")

    result = await db.execute(
        select(AssignmentSubmission, Assignment.title, Assignment.max_score)
        .join(Assignment, AssignmentSubmission.assignment_id == Assignment.id)
        .where(AssignmentSubmission.student_id == child_id, Assignment.org_id == org_id)
        .order_by(AssignmentSubmission.submitted_at.desc())
    )
    return [
        {
            "assignment_title": title,
            "max_score": max_score,
            "score": sub.score,
            "status": sub.status.value if hasattr(sub.status, 'value') else sub.status,
            "submitted_at": sub.submitted_at.isoformat(),
            "feedback": sub.feedback,
        }
        for sub, title, max_score in result.all()
    ]


async def link_child(
    db: AsyncSession,
    parent_id: uuid.UUID,
    child_email: str,
    org_id: uuid.UUID,
) -> dict:
    """Link a child to a parent by email."""
    child = await db.execute(
        select(User).where(
            User.email == child_email,
            User.org_id == org_id,
            User.role == UserRole.student,
        )
    )
    child_user = child.scalar_one_or_none()
    if not child_user:
        raise ValueError("Student not found")

    # Check not already linked
    existing = await db.execute(
        select(ParentChild).where(
            ParentChild.parent_id == parent_id,
            ParentChild.child_id == child_user.id,
        )
    )
    if existing.scalar_one_or_none():
        raise ValueError("Already linked")

    link = ParentChild(parent_id=parent_id, child_id=child_user.id)
    db.add(link)
    await db.commit()
    return {"child_id": str(child_user.id), "full_name": child_user.full_name}

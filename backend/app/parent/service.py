import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.admin.student_profile_service import _authorize_student
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
    streak_result = await db.execute(select(UserStreak).where(UserStreak.user_id == child_id))
    streak = streak_result.scalar_one_or_none()

    return {
        "enrollments": enrollments,
        "total_courses": len(enrollments),
        "completed_courses": sum(1 for e in enrollments if e["completed_at"]),
        "avg_progress": round(sum(e["progress_percent"] for e in enrollments) / len(enrollments), 1)
        if enrollments
        else 0,
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
            "status": sub.status.value if hasattr(sub.status, "value") else sub.status,
            "submitted_at": sub.submitted_at.isoformat(),
            "feedback": sub.feedback,
        }
        for sub, title, max_score in result.all()
    ]


async def link_parent_to_student(
    db: AsyncSession,
    staff: User,
    student_id: uuid.UUID,
    parent_email: str,
) -> dict:
    """Link a parent account to a student. **School staff only.**

    This used to be self-service: a parent typed an email and got a link. The
    only checks were that the target was a student in the same org — which in
    a school means every classmate — and a link opens that child's grades and
    progress. Parents do not get to assert who their children are; the school
    does. That is the rule the rest of the codebase already follows, see
    ``User.parental_consent_by`` and the consent-token flow in
    ``auth/service.py``, where staff or a mailed token stands behind the link.

    Authorisation is delegated to ``_authorize_student``, so this inherits the
    student-profile rules exactly: a plain teacher may only link parents of
    students they actually teach, admins and methodists work org-wide, and a
    student in another org reads as "not found" rather than "forbidden".
    """
    student = await _authorize_student(db, staff, student_id)

    parent = await db.scalar(
        select(User).where(
            User.email == parent_email,
            User.org_id == student.org_id,
            User.role == UserRole.parent,
        )
    )
    if parent is None:
        raise ValueError("No parent account with that email in this school")

    existing = await db.scalar(
        select(ParentChild).where(
            ParentChild.parent_id == parent.id,
            ParentChild.child_id == student.id,
        )
    )
    if existing is not None:
        raise ValueError("Already linked")

    db.add(ParentChild(parent_id=parent.id, child_id=student.id))
    await db.commit()
    return {
        "parent_id": str(parent.id),
        "parent_name": parent.full_name,
        "child_id": str(student.id),
        "child_name": student.full_name,
    }


async def unlink_parent_from_student(
    db: AsyncSession,
    staff: User,
    student_id: uuid.UUID,
    parent_email: str,
) -> dict:
    """Detach a parent from a student. Same staff-only rule as linking.

    A link opens a child's grades, so getting one wrong has to be undoable —
    a guardian changes, or a name is mistyped into a colleague's address.
    """
    student = await _authorize_student(db, staff, student_id)

    link = await db.scalar(
        select(ParentChild)
        .join(User, ParentChild.parent_id == User.id)
        .where(
            ParentChild.child_id == student.id,
            User.email == parent_email,
            User.org_id == student.org_id,
        )
    )
    if link is None:
        raise ValueError("That parent is not linked to this student")

    await db.delete(link)
    await db.commit()
    return {"unlinked": True}

"""Attendance roster + RBAC helpers.

Mirrors :mod:`app.peer_review.service` for course authorization and enrolled
student gathering:

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
from app.progress.models import Enrollment


def _is_org_wide(user: User) -> bool:
    """Whether the user sees every course in their org (vs. own courses only)."""
    return user.role in (UserRole.admin, UserRole.super_admin) or bool(user.is_methodist)


async def authorize_course(
    db: AsyncSession, user: User, course_id: uuid.UUID
) -> Course:
    """Confirm the caller may manage attendance for ``course_id``.

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


async def enrolled_students(
    db: AsyncSession, course_id: uuid.UUID
) -> list[tuple[uuid.UUID, str]]:
    """Active enrolled students of a course as ``(id, full_name)`` pairs.

    Sorted by name for a stable roster ordering.
    """
    rows = (
        await db.execute(
            select(User.id, User.full_name)
            .join(Enrollment, Enrollment.student_id == User.id)
            .where(
                Enrollment.course_id == course_id,
                User.role == UserRole.student,
                User.is_active.is_(True),
            )
            .distinct()
            .order_by(User.full_name)
        )
    ).all()
    return [(r[0], r[1]) for r in rows]


async def authorize_group(
    db: AsyncSession, user: User, group_id: uuid.UUID
):
    """Authorize a group via its course (Phase B) and return ``(course, group)``.

    The group must be linked to a course (``course_id`` set); RBAC + org
    isolation are enforced through :func:`authorize_course` on that course.
    A missing / course-less group raises 404 (existence hidden).
    """
    from app.admin.models import StudentGroup

    group = await db.scalar(select(StudentGroup).where(StudentGroup.id == group_id))
    if group is None or group.course_id is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
    course = await authorize_course(db, user, group.course_id)
    return course, group


async def group_member_students(
    db: AsyncSession, group_id: uuid.UUID
) -> list[tuple[uuid.UUID, str]]:
    """Active student members of a group as ``(id, full_name)`` pairs, name-sorted."""
    from app.admin.models import StudentGroupMember

    rows = (
        await db.execute(
            select(User.id, User.full_name)
            .join(StudentGroupMember, StudentGroupMember.user_id == User.id)
            .where(
                StudentGroupMember.group_id == group_id,
                User.role == UserRole.student,
                User.is_active.is_(True),
            )
            .distinct()
            .order_by(User.full_name)
        )
    ).all()
    return [(r[0], r[1]) for r in rows]

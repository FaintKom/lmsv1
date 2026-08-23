"""Whose students are these.

The owner's rule, 2026-08-23 (specs/061): a teacher sees only their own — the
students of a group they lead, plus the students of a course they own. Wider
roles see the whole school and have no business calling this.

Kept in one place deliberately. The codebase already holds half a dozen copies
of the narrower ``Course.teacher_id == user.id`` clause, and that narrowness is
exactly the bug: this product attaches teachers to *groups*, so a teacher
leading a group on somebody else's course counted as owning nothing. Those
older copies migrate as their modules are touched, not in one sweep.
"""

from __future__ import annotations

import uuid

from sqlalchemy import select, union
from sqlalchemy.ext.asyncio import AsyncSession

from app.admin.models import StudentGroup, StudentGroupMember
from app.auth.models import User
from app.courses.models import Course
from app.progress.models import Enrollment


async def teacher_course_ids(db: AsyncSession, user: User) -> list[uuid.UUID]:
    """Courses the teacher answers for: owned outright, or led through a group."""
    owned = select(Course.id).where(
        Course.org_id == user.org_id,
        Course.teacher_id == user.id,
    )
    via_group = select(StudentGroup.course_id).where(
        StudentGroup.org_id == user.org_id,
        StudentGroup.teacher_id == user.id,
        StudentGroup.course_id.is_not(None),
    )
    rows = await db.execute(union(owned, via_group))
    return [row[0] for row in rows]


async def teacher_student_ids(db: AsyncSession, user: User) -> list[uuid.UUID]:
    """Students the teacher may see: their groups' members, their courses' enrollees."""
    by_group = (
        select(StudentGroupMember.user_id)
        .join(StudentGroup, StudentGroupMember.group_id == StudentGroup.id)
        .where(
            StudentGroup.org_id == user.org_id,
            StudentGroup.teacher_id == user.id,
        )
    )

    course_ids = await teacher_course_ids(db, user)
    if not course_ids:
        rows = await db.execute(by_group)
        return [row[0] for row in rows]

    by_course = select(Enrollment.student_id).where(Enrollment.course_id.in_(course_ids))
    rows = await db.execute(union(by_group, by_course))
    return [row[0] for row in rows]

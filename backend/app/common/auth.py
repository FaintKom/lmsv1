"""Shared multi-tenant authorization helpers.

Lesson-keyed resources (quizzes, submissions, highlights) have no ``org_id`` of
their own — their organization is reachable only via
``Lesson -> Module -> Course.org_id``. Centralize that check here so every
endpoint enforces the same tenant boundary in one auditable place.
"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User, UserRole
from app.common.exceptions import NotFoundError
from app.courses.models import Course, Lesson, Module


async def lesson_in_user_org(
    db: AsyncSession, lesson_id: uuid.UUID, user: User
) -> Lesson:
    """Return the lesson iff it belongs to the caller's org, else raise 404.

    ``super_admin`` is exempt (global scope). We raise ``NotFoundError`` rather
    than a 403 so cross-org callers cannot probe for the existence of resources
    in other organizations — matching the convention in
    ``progress.service.complete_lesson`` / ``enroll``.
    """
    query = (
        select(Lesson)
        .join(Module, Module.id == Lesson.module_id)
        .join(Course, Course.id == Module.course_id)
        .where(Lesson.id == lesson_id)
    )
    if user.role != UserRole.super_admin:
        query = query.where(Course.org_id == user.org_id)

    lesson = (await db.execute(query)).scalar_one_or_none()
    if lesson is None:
        raise NotFoundError("Lesson not found")
    return lesson

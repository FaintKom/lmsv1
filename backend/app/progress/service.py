import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.common.exceptions import BadRequestError, NotFoundError
from app.courses.models import Course, CourseStatus, Lesson, Module
from app.progress.models import Enrollment, LessonProgress, LessonStatus

logger = logging.getLogger(__name__)


async def enroll(db: AsyncSession, course_id: uuid.UUID, user: User) -> Enrollment:
    # P2: enforce plan student limit before enrolling
    from app.billing.limits import check_student_limit
    await check_student_limit(db, user.org_id)

    # Check course exists and is published
    result = await db.execute(
        select(Course).where(
            Course.id == course_id,
            Course.org_id == user.org_id,
            Course.status == CourseStatus.published,
        )
    )
    if not result.scalar_one_or_none():
        raise NotFoundError("Course not found or not published")

    # Check not already enrolled
    existing = await db.execute(
        select(Enrollment).where(
            Enrollment.course_id == course_id, Enrollment.student_id == user.id
        )
    )
    if existing.scalar_one_or_none():
        raise BadRequestError("Already enrolled")

    enrollment = Enrollment(
        course_id=course_id,
        student_id=user.id,
        enrolled_at=datetime.now(timezone.utc),
    )
    db.add(enrollment)
    await db.flush()
    return enrollment


async def complete_lesson(
    db: AsyncSession, lesson_id: uuid.UUID, user: User
) -> LessonProgress:
    # Find enrollment through lesson -> module -> course
    lesson_result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = lesson_result.scalar_one_or_none()
    if not lesson:
        raise NotFoundError("Lesson not found")

    module_result = await db.execute(select(Module).where(Module.id == lesson.module_id))
    module = module_result.scalar_one_or_none()

    enrollment_result = await db.execute(
        select(Enrollment).where(
            Enrollment.course_id == module.course_id, Enrollment.student_id == user.id
        )
    )
    enrollment = enrollment_result.scalar_one_or_none()
    if not enrollment:
        raise BadRequestError("Not enrolled in this course")

    # Upsert lesson progress
    existing = await db.execute(
        select(LessonProgress).where(
            LessonProgress.enrollment_id == enrollment.id,
            LessonProgress.lesson_id == lesson_id,
        )
    )
    progress = existing.scalar_one_or_none()

    if progress:
        progress.status = LessonStatus.completed
        progress.completed_at = datetime.now(timezone.utc)
    else:
        progress = LessonProgress(
            enrollment_id=enrollment.id,
            lesson_id=lesson_id,
            status=LessonStatus.completed,
            completed_at=datetime.now(timezone.utc),
        )
        db.add(progress)

    await db.flush()

    # Recalculate progress percent
    total_lessons = (
        await db.execute(
            select(func.count(Lesson.id))
            .join(Module, Lesson.module_id == Module.id)
            .where(Module.course_id == module.course_id)
        )
    ).scalar() or 1

    completed_lessons = (
        await db.execute(
            select(func.count(LessonProgress.id)).where(
                LessonProgress.enrollment_id == enrollment.id,
                LessonProgress.status == LessonStatus.completed,
            )
        )
    ).scalar() or 0

    enrollment.progress_percent = round((completed_lessons / total_lessons) * 100, 1)
    if enrollment.progress_percent >= 100:
        enrollment.completed_at = datetime.now(timezone.utc)
        # Auto-issue certificate
        try:
            from app.certificates.service import issue_certificate
            await issue_certificate(db, user.id, module.course_id)
        except Exception:
            logger.warning(
                "certificate issuance failed for user %s course %s",
                user.id, module.course_id, exc_info=True,
            )

    # Award XP for lesson completion
    try:
        from app.gamification.service import XP_LESSON_COMPLETE, award_xp
        await award_xp(db, user.id, XP_LESSON_COMPLETE, "lesson_complete")
    except Exception:
        logger.warning("XP award failed for user %s", user.id, exc_info=True)

    await db.flush()
    return progress


async def get_my_enrollments(db: AsyncSession, user: User) -> list[Enrollment]:
    result = await db.execute(
        select(Enrollment).where(Enrollment.student_id == user.id)
    )
    return list(result.scalars().all())


async def get_course_lesson_progress(
    db: AsyncSession, course_id: uuid.UUID, user: User
) -> list[LessonProgress]:
    enrollment_result = await db.execute(
        select(Enrollment).where(
            Enrollment.course_id == course_id, Enrollment.student_id == user.id
        )
    )
    enrollment = enrollment_result.scalar_one_or_none()
    if not enrollment:
        return []

    result = await db.execute(
        select(LessonProgress).where(
            LessonProgress.enrollment_id == enrollment.id
        )
    )
    return list(result.scalars().all())

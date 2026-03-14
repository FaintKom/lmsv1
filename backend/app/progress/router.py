import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.db.session import get_db
from app.progress.schemas import EnrollmentResponse, EnrollRequest, LessonProgressResponse
from app.progress.service import complete_lesson, enroll, get_course_lesson_progress, get_my_enrollments

router = APIRouter()


@router.post("/enroll", response_model=EnrollmentResponse)
async def enroll_endpoint(
    data: EnrollRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    enrollment = await enroll(db, data.course_id, user)
    return EnrollmentResponse.model_validate(enrollment)


@router.post("/lessons/{lesson_id}/complete")
async def complete_lesson_endpoint(
    lesson_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await complete_lesson(db, lesson_id, user)

    # Gamification: update streak and check badges
    try:
        from app.gamification.service import check_and_award_badges, update_streak
        from app.notifications.service import create_notification

        await update_streak(db, user.id)
        new_badges = await check_and_award_badges(db, user.id, user.org_id)
        for badge_name in new_badges:
            await create_notification(
                db, user.id,
                title=f"Badge earned: {badge_name}!",
                body="Congratulations on your achievement!",
                link="/achievements",
            )
    except Exception:
        pass  # Don't fail lesson completion if gamification errors

    return {"status": "ok"}


@router.get("/courses/{course_id}/lesson-progress", response_model=list[LessonProgressResponse])
async def course_lesson_progress_endpoint(
    course_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    progress = await get_course_lesson_progress(db, course_id, user)
    return [LessonProgressResponse.model_validate(p) for p in progress]


@router.get("/my-courses", response_model=list[EnrollmentResponse])
async def my_courses_endpoint(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    enrollments = await get_my_enrollments(db, user)
    return [EnrollmentResponse.model_validate(e) for e in enrollments]

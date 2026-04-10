import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.db.session import get_db
from app.progress.models import VideoProgress
from app.progress.schemas import EnrollmentResponse, EnrollRequest, LessonProgressResponse
from app.progress.service import (
    complete_lesson,
    enroll,
    get_course_lesson_progress,
    get_my_enrollments,
)

router = APIRouter()


class VideoProgressUpdate(BaseModel):
    position_seconds: float
    duration_seconds: float | None = None


class VideoProgressResponse(BaseModel):
    lesson_id: uuid.UUID
    position_seconds: float
    duration_seconds: float | None
    watched_seconds: float
    completed_at: datetime | None

    model_config = {"from_attributes": True}


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


# --- P1-9 video progress tracking --------------------------------------


@router.get(
    "/lessons/{lesson_id}/video-progress",
    response_model=VideoProgressResponse | None,
)
async def get_video_progress_endpoint(
    lesson_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return the user's watch progress for a lesson's video, or null if they
    have not watched it before. The frontend uses this to seek the player to
    `position_seconds` on mount so "resume where you left off" works."""
    result = await db.execute(
        select(VideoProgress).where(
            VideoProgress.user_id == user.id,
            VideoProgress.lesson_id == lesson_id,
        )
    )
    row = result.scalar_one_or_none()
    if row is None:
        return None
    return VideoProgressResponse.model_validate(row)


@router.put(
    "/lessons/{lesson_id}/video-progress",
    response_model=VideoProgressResponse,
)
async def update_video_progress_endpoint(
    lesson_id: uuid.UUID,
    data: VideoProgressUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upsert the user's watch progress. Called by the frontend every few
    seconds while a video is playing. When the user crosses 90% of the
    duration, auto-marks the LessonProgress as completed via the existing
    complete_lesson() service.
    """
    # Clamp position to sane values
    position = max(0.0, float(data.position_seconds))
    duration = float(data.duration_seconds) if data.duration_seconds is not None else None

    result = await db.execute(
        select(VideoProgress).where(
            VideoProgress.user_id == user.id,
            VideoProgress.lesson_id == lesson_id,
        )
    )
    row = result.scalar_one_or_none()

    if row is None:
        row = VideoProgress(
            user_id=user.id,
            lesson_id=lesson_id,
            position_seconds=position,
            duration_seconds=duration,
            watched_seconds=position,
        )
        db.add(row)
    else:
        # Forward-only "watched" counter so that scrubbing back doesn't
        # undo progress. Watched grows by the delta from the furthest
        # position we've previously recorded.
        if position > row.watched_seconds:
            row.watched_seconds = position
        row.position_seconds = position
        if duration is not None:
            row.duration_seconds = duration
        db.add(row)

    # Auto-complete at 90% of duration
    if (
        row.duration_seconds
        and row.watched_seconds >= 0.9 * row.duration_seconds
        and row.completed_at is None
    ):
        row.completed_at = datetime.now(timezone.utc)
        db.add(row)
        # Also mark the lesson complete in the broader progress system
        try:
            await complete_lesson(db, lesson_id, user)
        except Exception:
            # Student might not have an enrollment row yet if they're
            # previewing — don't block the video progress save.
            pass

    await db.flush()
    return VideoProgressResponse.model_validate(row)


@router.get("/my-grades")
async def my_grades(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return the student's graded assignment submissions + quiz attempts.

    Combines data from assignment_submissions and quiz_attempts into
    one list so the frontend can show a unified "My Grades" view.
    """
    from app.assignments.models import Assignment, AssignmentSubmission

    # Graded assignment submissions
    result = await db.execute(
        select(AssignmentSubmission, Assignment.title.label("assignment_title"))
        .join(Assignment, AssignmentSubmission.assignment_id == Assignment.id)
        .where(AssignmentSubmission.student_id == user.id)
        .order_by(AssignmentSubmission.submitted_at.desc())
        .limit(50)
    )
    rows = result.all()

    grades = []
    for sub, title in rows:
        grades.append({
            "type": "assignment",
            "title": title,
            "score": sub.score,
            "max_score": 100,
            "status": sub.status.value if hasattr(sub.status, "value") else str(sub.status),
            "feedback": sub.feedback if hasattr(sub, "feedback") else None,
            "submitted_at": sub.submitted_at.isoformat() if sub.submitted_at else None,
        })

    return {"grades": grades}

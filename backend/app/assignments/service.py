import logging
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.assignments.models import Assignment, AssignmentStatus, AssignmentSubmission
from app.auth.models import User, UserRole
from app.common.exceptions import BadRequestError, ForbiddenError, NotFoundError
from app.common.file_validation import (
    SUBMISSION_EXTENSIONS,
    UploadValidationError,
    validate_upload,
)
from app.common.timing import normalize_elapsed
from app.config import settings
from app.courses.models import Course
from app.notifications.service import create_notification
from app.progress.models import Enrollment

# .zip is allowed for assignment submissions (the magic-byte spec covers PK\x03\x04).
# .txt and .rar are not in the shared spec — omit them so uploads are consistent.
ALLOWED_ASSIGNMENT_EXTENSIONS = SUBMISSION_EXTENSIONS | {".zip"}
MAX_FILE_MB = 50

logger = logging.getLogger(__name__)


async def create_assignment(
    db: AsyncSession, user: User, data: dict
) -> Assignment:
    course = await _get_course(db, data["course_id"])
    if course.org_id != user.org_id:
        raise ForbiddenError("Course belongs to another organization")

    assignment = Assignment(
        org_id=user.org_id,
        course_id=data["course_id"],
        group_id=data.get("group_id"),
        created_by=user.id,
        title=data["title"],
        description=data.get("description", ""),
        due_date=data["due_date"],
        max_score=data.get("max_score", 100),
        allow_late=data.get("allow_late", False),
    )
    db.add(assignment)
    await db.flush()

    # Email enrolled students about the new assignment (off-thread)
    try:
        from app.email.service import queue_email, send_assignment_notification
        enrolled = await db.execute(
            select(User)
            .join(Enrollment, Enrollment.student_id == User.id)
            .where(Enrollment.course_id == data["course_id"])
        )
        for student in enrolled.scalars().all():
            prefs = student.email_preferences or {}
            if prefs.get("assignments", True):
                queue_email(
                    send_assignment_notification,
                    student.email, student.full_name,
                    data["title"], str(data["due_date"]),
                )
    except Exception:
        # Don't fail assignment creation if emails fail — but record it.
        logger.warning("assignment-notification email failed", exc_info=True)

    return assignment


async def list_assignments(
    db: AsyncSession, user: User
) -> list[dict]:
    if user.role in (UserRole.teacher, UserRole.admin, UserRole.super_admin):
        # Teachers/admins see assignments they created (or all in org for admin)
        query = (
            select(Assignment, Course.title.label("course_title"))
            .join(Course, Course.id == Assignment.course_id)
            .where(Assignment.org_id == user.org_id)
        )
        if user.role == UserRole.teacher:
            query = query.where(Assignment.created_by == user.id)
        query = query.order_by(Assignment.due_date.desc())
    else:
        # Students see assignments for courses they're enrolled in
        enrolled_course_ids = (
            select(Enrollment.course_id)
            .where(Enrollment.student_id == user.id)
        )
        query = (
            select(Assignment, Course.title.label("course_title"))
            .join(Course, Course.id == Assignment.course_id)
            .where(Assignment.course_id.in_(enrolled_course_ids))
            .where(Assignment.org_id == user.org_id)
            .order_by(Assignment.due_date.desc())
        )

    result = await db.execute(query)
    rows = result.all()

    items = []
    for row in rows:
        assignment = row[0]
        course_title = row[1]

        # For students, get their submission status
        status = None
        score = None
        if user.role == UserRole.student:
            sub_result = await db.execute(
                select(AssignmentSubmission)
                .where(
                    AssignmentSubmission.assignment_id == assignment.id,
                    AssignmentSubmission.student_id == user.id,
                )
            )
            sub = sub_result.scalar_one_or_none()
            if sub:
                status = sub.status.value
                score = sub.score
            elif assignment.due_date < datetime.now(timezone.utc):
                status = "overdue"
            else:
                status = "pending"

        items.append({
            "id": assignment.id,
            "course_id": assignment.course_id,
            "title": assignment.title,
            "due_date": assignment.due_date,
            "max_score": assignment.max_score,
            "allow_late": assignment.allow_late,
            "created_at": assignment.created_at,
            "course_title": course_title,
            "status": status,
            "score": score,
        })

    return items


async def get_assignment(
    db: AsyncSession, assignment_id: uuid.UUID, user: User
) -> dict:
    result = await db.execute(
        select(Assignment, Course.title.label("course_title"))
        .join(Course, Course.id == Assignment.course_id)
        .where(Assignment.id == assignment_id)
    )
    row = result.first()
    if not row:
        raise NotFoundError("Assignment not found")

    assignment = row[0]
    course_title = row[1]

    if assignment.org_id != user.org_id:
        raise ForbiddenError("Access denied")

    # Count submissions for teachers
    sub_count = 0
    if user.role in (UserRole.teacher, UserRole.admin, UserRole.super_admin):
        count_result = await db.execute(
            select(func.count(AssignmentSubmission.id))
            .where(AssignmentSubmission.assignment_id == assignment.id)
        )
        sub_count = count_result.scalar() or 0

    return {
        "id": assignment.id,
        "course_id": assignment.course_id,
        "group_id": assignment.group_id,
        "created_by": assignment.created_by,
        "title": assignment.title,
        "description": assignment.description,
        "due_date": assignment.due_date,
        "max_score": assignment.max_score,
        "allow_late": assignment.allow_late,
        "created_at": assignment.created_at,
        "updated_at": assignment.updated_at,
        "submission_count": sub_count,
        "course_title": course_title,
    }


async def update_assignment(
    db: AsyncSession, assignment_id: uuid.UUID, user: User, data: dict
) -> Assignment:
    assignment = await _get_assignment_with_ownership(db, assignment_id, user)
    for key, value in data.items():
        if value is not None:
            setattr(assignment, key, value)
    await db.flush()
    return assignment


async def delete_assignment(
    db: AsyncSession, assignment_id: uuid.UUID, user: User
) -> None:
    assignment = await _get_assignment_with_ownership(db, assignment_id, user)
    await db.delete(assignment)
    await db.flush()


async def submit_assignment(
    db: AsyncSession,
    assignment_id: uuid.UUID,
    user: User,
    content: str | None = None,
    file: UploadFile | None = None,
    elapsed_seconds: int | None = None,
) -> AssignmentSubmission:
    # Get assignment
    result = await db.execute(
        select(Assignment).where(Assignment.id == assignment_id)
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise NotFoundError("Assignment not found")
    if assignment.org_id != user.org_id:
        raise ForbiddenError("Access denied")

    now = datetime.now(timezone.utc)
    is_late = now > assignment.due_date

    if is_late and not assignment.allow_late:
        raise BadRequestError("Deadline has passed and late submissions are not allowed")

    if not content and not file:
        raise BadRequestError("Submit text content or a file")

    # Check for existing submission — allow resubmit
    existing_result = await db.execute(
        select(AssignmentSubmission).where(
            AssignmentSubmission.assignment_id == assignment_id,
            AssignmentSubmission.student_id == user.id,
        )
    )
    existing = existing_result.scalar_one_or_none()

    file_path = None
    original_filename = None
    if file:
        raw = await file.read()
        try:
            validated = validate_upload(
                filename=file.filename,
                data=raw,
                allowed_extensions=ALLOWED_ASSIGNMENT_EXTENSIONS,
                max_size_mb=MAX_FILE_MB,
            )
        except UploadValidationError as e:
            raise BadRequestError(str(e)) from e

        original_filename = file.filename or validated.safe_name

        upload_dir = Path(settings.upload_dir) / str(assignment.org_id) / "assignments" / str(assignment_id)
        upload_dir.mkdir(parents=True, exist_ok=True)

        dest = upload_dir / validated.safe_name
        dest.write_bytes(validated.data)
        file_path = str(dest)

    status = AssignmentStatus.late if is_late else AssignmentStatus.submitted

    # Time-on-task (Phase 2 analytics): clamp to [0, 24h]; leave NULL when the
    # client omits it (backward-compatible).
    elapsed = normalize_elapsed(elapsed_seconds)

    if existing:
        existing.content = content
        existing.file_path = file_path or existing.file_path
        existing.original_filename = original_filename or existing.original_filename
        existing.submitted_at = now
        existing.status = status
        existing.score = None
        existing.feedback = None
        existing.graded_by = None
        existing.graded_at = None
        # Resubmit reuses the row, so bump the stored attempt_number rather than
        # leaving it at 1 (NULL on legacy rows counts as a prior attempt).
        existing.attempt_number = (existing.attempt_number or 1) + 1
        if elapsed is not None:
            existing.time_spent_seconds = elapsed
            existing.started_at = now - timedelta(seconds=elapsed)
        await db.flush()
        return existing

    submission = AssignmentSubmission(
        assignment_id=assignment_id,
        student_id=user.id,
        content=content,
        file_path=file_path,
        original_filename=original_filename,
        submitted_at=now,
        status=status,
        attempt_number=1,
    )
    if elapsed is not None:
        submission.time_spent_seconds = elapsed
        submission.started_at = now - timedelta(seconds=elapsed)
    db.add(submission)
    await db.flush()
    return submission


async def get_my_submission(
    db: AsyncSession, assignment_id: uuid.UUID, user: User
) -> AssignmentSubmission | None:
    result = await db.execute(
        select(AssignmentSubmission).where(
            AssignmentSubmission.assignment_id == assignment_id,
            AssignmentSubmission.student_id == user.id,
        )
    )
    return result.scalar_one_or_none()


async def list_submissions(
    db: AsyncSession, assignment_id: uuid.UUID, user: User
) -> list[dict]:
    # Verify assignment exists and user has access
    assignment = await _get_assignment_with_ownership(db, assignment_id, user)

    result = await db.execute(
        select(AssignmentSubmission, User.full_name.label("student_name"))
        .join(User, User.id == AssignmentSubmission.student_id)
        .where(AssignmentSubmission.assignment_id == assignment_id)
        .order_by(AssignmentSubmission.submitted_at.desc())
    )
    rows = result.all()

    return [
        {
            "id": row[0].id,
            "assignment_id": row[0].assignment_id,
            "student_id": row[0].student_id,
            "student_name": row[1],
            "content": row[0].content,
            "file_path": row[0].file_path,
            "original_filename": row[0].original_filename,
            "submitted_at": row[0].submitted_at,
            "score": row[0].score,
            "feedback": row[0].feedback,
            "graded_by": row[0].graded_by,
            "graded_at": row[0].graded_at,
            "status": row[0].status.value,
            "created_at": row[0].created_at,
        }
        for row in rows
    ]


async def grade_submission(
    db: AsyncSession,
    assignment_id: uuid.UUID,
    submission_id: uuid.UUID,
    user: User,
    score: float,
    feedback: str = "",
) -> AssignmentSubmission:
    # Verify ownership
    await _get_assignment_with_ownership(db, assignment_id, user)

    result = await db.execute(
        select(AssignmentSubmission).where(
            AssignmentSubmission.id == submission_id,
            AssignmentSubmission.assignment_id == assignment_id,
        )
    )
    submission = result.scalar_one_or_none()
    if not submission:
        raise NotFoundError("Submission not found")

    # Get assignment for max_score validation
    a_result = await db.execute(select(Assignment).where(Assignment.id == assignment_id))
    assignment = a_result.scalar_one()

    if score < 0 or score > assignment.max_score:
        raise BadRequestError(f"Score must be between 0 and {assignment.max_score}")

    submission.score = score
    submission.feedback = feedback
    submission.graded_by = user.id
    submission.graded_at = datetime.now(timezone.utc)
    submission.status = AssignmentStatus.graded
    await db.flush()

    # Notify student
    await create_notification(
        db,
        user_id=submission.student_id,
        title=f"Assignment graded: {assignment.title}",
        body=f"Score: {score}/{assignment.max_score}",
        link=f"/assignments/{assignment_id}",
    )

    # Send email notification (off-thread)
    try:
        from app.email.service import queue_email, send_grade_notification
        student_result = await db.execute(
            select(User).where(User.id == submission.student_id)
        )
        student = student_result.scalar_one_or_none()
        if student:
            prefs = student.email_preferences or {}
            if prefs.get("grades", True):
                queue_email(
                    send_grade_notification,
                    student.email, student.full_name, assignment.title,
                    score, assignment.max_score, feedback or None,
                )
    except Exception:
        # Don't fail grading if email fails — but record it.
        logger.warning("grade-notification email failed", exc_info=True)

    return submission


# --- helpers ---

async def _get_course(db: AsyncSession, course_id: uuid.UUID) -> Course:
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise NotFoundError("Course not found")
    return course


async def _get_assignment_with_ownership(
    db: AsyncSession, assignment_id: uuid.UUID, user: User
) -> Assignment:
    result = await db.execute(
        select(Assignment).where(Assignment.id == assignment_id)
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise NotFoundError("Assignment not found")
    # super_admin is cross-org by design (mirrors require_role).
    if user.role == UserRole.super_admin:
        return assignment
    if assignment.org_id != user.org_id:
        raise ForbiddenError("Access denied")
    if user.role == UserRole.teacher and assignment.created_by != user.id:
        raise ForbiddenError("You don't own this assignment")
    return assignment

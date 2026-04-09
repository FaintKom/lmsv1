import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.dependencies import get_current_user, require_role
from app.auth.models import User, UserRole
from app.common.exceptions import NotFoundError
from app.courses.models import Course
from app.db.session import get_db
from app.learning_paths.models import LearningPath, LearningPathEnrollment, LearningPathStep
from app.progress.models import Enrollment

router = APIRouter()


class PathCreate(BaseModel):
    title: str
    description: str = ""
    steps: list[dict] = []  # [{course_id, is_required}]


class PathUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    is_published: bool | None = None
    steps: list[dict] | None = None  # [{course_id, is_required, sort_order}]


# ─── Admin endpoints ──────────────────────────────────────────────────


@router.post("")
async def create_path(
    body: PathCreate,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    path = LearningPath(
        org_id=user.org_id,
        created_by=user.id,
        title=body.title,
        description=body.description,
    )
    db.add(path)
    await db.flush()

    for i, step_data in enumerate(body.steps):
        step = LearningPathStep(
            path_id=path.id,
            course_id=step_data["course_id"],
            sort_order=i,
            is_required=step_data.get("is_required", True),
        )
        db.add(step)
    await db.flush()

    return {"id": str(path.id), "title": path.title}


@router.get("")
async def list_paths(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List learning paths. Published only for students; all for admins/teachers."""
    query = (
        select(LearningPath)
        .options(selectinload(LearningPath.steps))
        .where(LearningPath.org_id == user.org_id)
    )
    if user.role == UserRole.student:
        query = query.where(LearningPath.is_published == True)
    result = await db.execute(query.order_by(LearningPath.created_at.desc()))
    paths = result.scalars().unique().all()

    # Get enrollment info for student
    enrollments: dict[str, int] = {}
    if user.role == UserRole.student:
        enr_result = await db.execute(
            select(LearningPathEnrollment.path_id, LearningPathEnrollment.current_step)
            .where(LearningPathEnrollment.student_id == user.id)
        )
        enrollments = {str(r[0]): r[1] for r in enr_result.all()}

    return [
        {
            "id": str(p.id),
            "title": p.title,
            "description": p.description,
            "is_published": p.is_published,
            "step_count": len(p.steps),
            "enrolled": str(p.id) in enrollments,
            "current_step": enrollments.get(str(p.id), 0),
            "created_at": str(p.created_at),
        }
        for p in paths
    ]


@router.get("/{path_id}")
async def get_path(
    path_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(LearningPath)
        .options(selectinload(LearningPath.steps))
        .where(LearningPath.id == path_id, LearningPath.org_id == user.org_id)
    )
    path = result.scalars().first()
    if not path:
        raise NotFoundError("Learning path not found")

    # Get course titles for each step
    course_ids = [s.course_id for s in path.steps]
    course_titles: dict[str, str] = {}
    if course_ids:
        cres = await db.execute(select(Course.id, Course.title).where(Course.id.in_(course_ids)))
        course_titles = {str(r[0]): r[1] for r in cres.all()}

    # Get enrollment + course completion status for student
    enrollment = None
    course_completions: dict[str, bool] = {}
    if user.role == UserRole.student:
        enr_result = await db.execute(
            select(LearningPathEnrollment)
            .where(
                LearningPathEnrollment.path_id == path_id,
                LearningPathEnrollment.student_id == user.id,
            )
        )
        enrollment = enr_result.scalar_one_or_none()

        # Check which courses are completed
        if course_ids:
            comp_result = await db.execute(
                select(Enrollment.course_id)
                .where(
                    Enrollment.student_id == user.id,
                    Enrollment.course_id.in_(course_ids),
                    Enrollment.completed_at.isnot(None),
                )
            )
            course_completions = {str(r[0]): True for r in comp_result.all()}

    return {
        "id": str(path.id),
        "title": path.title,
        "description": path.description,
        "is_published": path.is_published,
        "enrolled": enrollment is not None,
        "current_step": enrollment.current_step if enrollment else 0,
        "steps": [
            {
                "id": str(s.id),
                "course_id": str(s.course_id),
                "course_title": course_titles.get(str(s.course_id), "Unknown"),
                "sort_order": s.sort_order,
                "is_required": s.is_required,
                "completed": course_completions.get(str(s.course_id), False),
            }
            for s in path.steps
        ],
    }


@router.put("/{path_id}")
async def update_path(
    path_id: uuid.UUID,
    body: PathUpdate,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(LearningPath)
        .options(selectinload(LearningPath.steps))
        .where(LearningPath.id == path_id, LearningPath.org_id == user.org_id)
    )
    path = result.scalars().first()
    if not path:
        raise NotFoundError("Learning path not found")

    if body.title is not None:
        path.title = body.title
    if body.description is not None:
        path.description = body.description
    if body.is_published is not None:
        path.is_published = body.is_published

    if body.steps is not None:
        # Replace all steps
        for s in path.steps:
            await db.delete(s)
        await db.flush()
        for i, step_data in enumerate(body.steps):
            step = LearningPathStep(
                path_id=path.id,
                course_id=step_data["course_id"],
                sort_order=step_data.get("sort_order", i),
                is_required=step_data.get("is_required", True),
            )
            db.add(step)

    await db.flush()

    # Reload with steps to return full object
    result = await db.execute(
        select(LearningPath)
        .options(selectinload(LearningPath.steps))
        .where(LearningPath.id == path_id)
    )
    path = result.scalars().first()
    return {
        "id": str(path.id),
        "title": path.title,
        "description": path.description,
        "is_published": path.is_published,
        "steps": [
            {
                "id": str(s.id),
                "course_id": str(s.course_id),
                "sort_order": s.sort_order,
                "is_required": s.is_required,
            }
            for s in path.steps
        ],
    }


@router.delete("/{path_id}")
async def delete_path(
    path_id: uuid.UUID,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(LearningPath)
        .where(LearningPath.id == path_id, LearningPath.org_id == user.org_id)
    )
    path = result.scalar_one_or_none()
    if not path:
        raise NotFoundError("Learning path not found")
    await db.delete(path)
    return {"ok": True}


# ─── Student endpoints ────────────────────────────────────────────────


@router.post("/{path_id}/enroll")
async def enroll_in_path(
    path_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify path exists and is published
    result = await db.execute(
        select(LearningPath)
        .options(selectinload(LearningPath.steps))
        .where(
            LearningPath.id == path_id,
            LearningPath.org_id == user.org_id,
            LearningPath.is_published == True,
        )
    )
    path = result.scalars().first()
    if not path:
        raise NotFoundError("Learning path not found")

    # Check not already enrolled
    existing = await db.execute(
        select(LearningPathEnrollment).where(
            LearningPathEnrollment.path_id == path_id,
            LearningPathEnrollment.student_id == user.id,
        )
    )
    if existing.scalar_one_or_none():
        return {"status": "already_enrolled"}

    enrollment = LearningPathEnrollment(
        path_id=path_id,
        student_id=user.id,
        current_step=0,
        enrolled_at=datetime.now(timezone.utc),
    )
    db.add(enrollment)

    # Also enroll in the first course
    if path.steps:
        first_course_id = path.steps[0].course_id
        existing_enr = await db.execute(
            select(Enrollment).where(
                Enrollment.course_id == first_course_id,
                Enrollment.student_id == user.id,
            )
        )
        if not existing_enr.scalar_one_or_none():
            db.add(Enrollment(
                course_id=first_course_id,
                student_id=user.id,
                enrolled_at=datetime.now(timezone.utc),
            ))

    await db.flush()
    return {"status": "enrolled"}


@router.get("/{path_id}/progress")
async def path_progress(
    path_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get detailed progress for a learning path."""
    # Reuse get_path which includes completion status
    return await get_path(path_id=path_id, user=user, db=db)

import csv
import io
import uuid

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.admin.schemas import DashboardStats, DetailedAnalytics
from app.admin.service import get_dashboard_stats, get_detailed_analytics
from app.auth.dependencies import require_role
from app.auth.models import User, UserRole
from app.auth.schemas import UserResponse
from app.common.exceptions import NotFoundError
from app.db.session import get_db

router = APIRouter()


@router.get("/dashboard", response_model=DashboardStats)
async def dashboard_endpoint(
    user: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    return await get_dashboard_stats(db, user)


@router.get("/analytics/detailed", response_model=DetailedAnalytics)
async def detailed_analytics_endpoint(
    user: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    return await get_detailed_analytics(db, user)


@router.get("/users", response_model=list[UserResponse])
async def list_users_endpoint(
    role: str | None = Query(None),
    user: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    query = select(User).where(User.org_id == user.org_id)
    if role:
        query = query.where(User.role == role)
    result = await db.execute(query.order_by(User.created_at.desc()))
    users = result.scalars().all()
    return [UserResponse.model_validate(u) for u in users]


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user_endpoint(
    user_id: uuid.UUID,
    role: str | None = None,
    is_active: bool | None = None,
    admin: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).where(User.id == user_id, User.org_id == admin.org_id)
    )
    target_user = result.scalar_one_or_none()
    if not target_user:
        raise NotFoundError("User not found")

    if role is not None:
        target_user.role = role
    if is_active is not None:
        target_user.is_active = is_active

    await db.flush()
    return UserResponse.model_validate(target_user)


@router.get("/courses")
async def list_courses_admin(
    user: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    from app.courses.models import Course

    result = await db.execute(
        select(Course).where(Course.org_id == user.org_id).order_by(Course.created_at.desc())
    )
    courses = result.scalars().all()
    return [
        {
            "id": str(c.id), "title": c.title, "slug": c.slug,
            "description": c.description, "status": c.status.value if hasattr(c.status, 'value') else c.status,
            "category": c.category, "created_at": str(c.created_at),
        }
        for c in courses
    ]


@router.delete("/users/{user_id}")
async def delete_user_endpoint(
    user_id: uuid.UUID,
    admin: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    from fastapi import HTTPException

    result = await db.execute(
        select(User).where(User.id == user_id, User.org_id == admin.org_id)
    )
    target = result.scalar_one_or_none()
    if not target:
        raise NotFoundError("User not found")
    if target.id == admin.id:
        raise HTTPException(400, "Cannot delete yourself")
    await db.delete(target)
    return {"ok": True}


@router.post("/enroll")
async def admin_enroll_endpoint(
    data: dict,
    admin: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    """Admin enrolls a student into a course."""
    from datetime import datetime, timezone
    from app.courses.models import Course
    from app.progress.models import Enrollment

    user_id = data.get("user_id")
    course_id = data.get("course_id")
    if not user_id or not course_id:
        from fastapi import HTTPException
        raise HTTPException(400, "user_id and course_id required")

    # Verify user belongs to same org
    result = await db.execute(
        select(User).where(User.id == user_id, User.org_id == admin.org_id)
    )
    target_user = result.scalar_one_or_none()
    if not target_user:
        raise NotFoundError("User not found")

    # Verify course belongs to same org
    result = await db.execute(
        select(Course).where(Course.id == course_id, Course.org_id == admin.org_id)
    )
    course = result.scalar_one_or_none()
    if not course:
        raise NotFoundError("Course not found")

    # Check not already enrolled
    result = await db.execute(
        select(Enrollment).where(
            Enrollment.course_id == course_id, Enrollment.student_id == user_id
        )
    )
    if result.scalar_one_or_none():
        return {"status": "already_enrolled"}

    enrollment = Enrollment(
        course_id=course_id,
        student_id=user_id,
        enrolled_at=datetime.now(timezone.utc),
    )
    db.add(enrollment)
    await db.flush()
    return {"status": "ok", "enrollment_id": str(enrollment.id)}


@router.get("/courses/{course_id}/students")
async def list_course_students(
    course_id: uuid.UUID,
    admin: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    """List all students enrolled in a course."""
    from app.progress.models import Enrollment

    result = await db.execute(
        select(User, Enrollment)
        .join(Enrollment, Enrollment.student_id == User.id)
        .where(Enrollment.course_id == course_id, User.org_id == admin.org_id)
        .order_by(Enrollment.enrolled_at.desc())
    )
    rows = result.all()
    return [
        {
            "id": str(u.id),
            "full_name": u.full_name,
            "email": u.email,
            "role": u.role,
            "enrollment_id": str(e.id),
            "progress_percent": e.progress_percent,
            "enrolled_at": str(e.enrolled_at),
        }
        for u, e in rows
    ]


@router.delete("/enrollments/{enrollment_id}")
async def admin_unenroll_endpoint(
    enrollment_id: uuid.UUID,
    admin: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    """Admin removes a student enrollment."""
    from app.progress.models import Enrollment
    from app.courses.models import Course

    result = await db.execute(
        select(Enrollment)
        .join(Course, Enrollment.course_id == Course.id)
        .where(Enrollment.id == enrollment_id, Course.org_id == admin.org_id)
    )
    enrollment = result.scalar_one_or_none()
    if not enrollment:
        raise NotFoundError("Enrollment not found")

    await db.delete(enrollment)
    await db.flush()
    return {"status": "ok"}


@router.post("/users", response_model=UserResponse)
async def create_user_endpoint(
    data: dict,
    admin: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    from app.auth.security import hash_password

    new_user = User(
        org_id=admin.org_id,
        email=data["email"],
        hashed_password=hash_password(data["password"]),
        full_name=data["full_name"],
        role=data.get("role", "student"),
    )
    db.add(new_user)
    await db.flush()
    return UserResponse.model_validate(new_user)


@router.get("/analytics/export-csv")
async def export_analytics_csv(
    user: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    """Export enrollment analytics as a CSV file."""
    from app.courses.models import Course
    from app.progress.models import Enrollment

    result = await db.execute(
        select(User.full_name, User.email, Course.title, Enrollment.progress_percent, Enrollment.enrolled_at, Enrollment.completed_at)
        .join(Enrollment, Enrollment.student_id == User.id)
        .join(Course, Enrollment.course_id == Course.id)
        .where(User.org_id == user.org_id)
        .order_by(Enrollment.enrolled_at.desc())
    )
    rows = result.all()

    def generate_csv():
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["student_name", "student_email", "course_title", "progress_percent", "enrolled_at", "completed_at"])
        for row in rows:
            writer.writerow([
                row.full_name,
                row.email,
                row.title,
                float(row.progress_percent) if row.progress_percent is not None else 0,
                str(row.enrolled_at) if row.enrolled_at else "",
                str(row.completed_at) if row.completed_at else "",
            ])
        output.seek(0)
        yield output.getvalue()

    return StreamingResponse(
        generate_csv(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=analytics_export.csv"},
    )

import csv
import io
import uuid

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.admin.schemas import DashboardStats, DetailedAnalytics
from app.admin.service import get_dashboard_stats, get_detailed_analytics
from app.auth.dependencies import require_role
from app.auth.models import Organization, User, UserRole
from app.auth.schemas import UserResponse
from app.common.exceptions import NotFoundError
from app.db.session import get_db

router = APIRouter()


def _user_org_filter(admin: User):
    """Return org filter for User queries — empty for super_admin."""
    if admin.role == UserRole.super_admin:
        return []
    return [User.org_id == admin.org_id]


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
    query = select(User).where(*_user_org_filter(user))
    if role:
        query = query.where(User.role == role)
    result = await db.execute(query.order_by(User.created_at.desc()))
    users = result.scalars().all()
    return [UserResponse.model_validate(u) for u in users]


class _UpdateUserBody(BaseModel):
    role: str | None = None
    is_active: bool | None = None
    org_id: str | None = None  # super_admin only


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user_endpoint(
    user_id: uuid.UUID,
    body: _UpdateUserBody,
    admin: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    query = select(User).where(User.id == user_id, *_user_org_filter(admin))
    result = await db.execute(query)
    target_user = result.scalar_one_or_none()
    if not target_user:
        raise NotFoundError("User not found")

    if body.role is not None:
        target_user.role = body.role
    if body.is_active is not None:
        target_user.is_active = body.is_active
    if body.org_id is not None and admin.role == UserRole.super_admin:
        target_user.org_id = uuid.UUID(body.org_id)

    await db.flush()
    return UserResponse.model_validate(target_user)


@router.get("/organizations")
async def list_organizations(
    admin: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    """List all organizations. Super admin sees all, regular admin sees own."""
    from sqlalchemy import func

    query = select(Organization)
    if admin.role != UserRole.super_admin:
        query = query.where(Organization.id == admin.org_id)
    result = await db.execute(query.order_by(Organization.name))
    orgs = result.scalars().all()

    org_list = []
    for o in orgs:
        # Count users in this org
        count_result = await db.execute(
            select(func.count()).select_from(User).where(User.org_id == o.id)
        )
        user_count = count_result.scalar() or 0
        org_list.append({
            "id": str(o.id),
            "name": o.name,
            "slug": o.slug,
            "is_active": o.is_active,
            "user_count": user_count,
            "created_at": str(o.created_at) if hasattr(o, 'created_at') and o.created_at else None,
        })
    return org_list


@router.get("/courses")
async def list_courses_admin(
    user: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    from app.courses.models import Course

    query = select(Course)
    if user.role != UserRole.super_admin:
        query = query.where(Course.org_id == user.org_id)
    result = await db.execute(query.order_by(Course.created_at.desc()))
    courses = result.scalars().all()
    return [
        {
            "id": str(c.id), "title": c.title, "slug": c.slug,
            "description": c.description, "status": c.status.value if hasattr(c.status, 'value') else c.status,
            "category": c.category, "org_id": str(c.org_id), "created_at": str(c.created_at),
        }
        for c in courses
    ]


class _UpdateCourseAdminBody(BaseModel):
    org_id: str | None = None


@router.put("/courses/{course_id}")
async def update_course_admin(
    course_id: uuid.UUID,
    body: _UpdateCourseAdminBody,
    admin: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    """Super admin can change course org_id."""
    from app.courses.models import Course

    if admin.role != UserRole.super_admin:
        from fastapi import HTTPException
        raise HTTPException(403, "Only super admin can change course organization")

    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise NotFoundError("Course not found")

    if body.org_id is not None:
        course.org_id = uuid.UUID(body.org_id)

    await db.flush()
    return {"ok": True}


@router.delete("/users/{user_id}")
async def delete_user_endpoint(
    user_id: uuid.UUID,
    admin: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    from fastapi import HTTPException

    query = select(User).where(User.id == user_id, *_user_org_filter(admin))
    result = await db.execute(query)
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

    # Verify user (super_admin can enroll any user)
    query = select(User).where(User.id == user_id, *_user_org_filter(admin))
    result = await db.execute(query)
    target_user = result.scalar_one_or_none()
    if not target_user:
        raise NotFoundError("User not found")

    # Verify course
    course_q = select(Course).where(Course.id == course_id)
    if admin.role != UserRole.super_admin:
        course_q = course_q.where(Course.org_id == admin.org_id)
    result = await db.execute(course_q)
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

    query = (
        select(User, Enrollment)
        .join(Enrollment, Enrollment.student_id == User.id)
        .where(Enrollment.course_id == course_id)
    )
    if admin.role != UserRole.super_admin:
        query = query.where(User.org_id == admin.org_id)
    result = await db.execute(query.order_by(Enrollment.enrolled_at.desc()))
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

    query = (
        select(Enrollment)
        .join(Course, Enrollment.course_id == Course.id)
        .where(Enrollment.id == enrollment_id)
    )
    if admin.role != UserRole.super_admin:
        query = query.where(Course.org_id == admin.org_id)
    result = await db.execute(query)
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
        org_id=data.get("org_id", admin.org_id),
        email=data["email"],
        hashed_password=hash_password(data["password"]),
        full_name=data["full_name"],
        role=data.get("role", "student"),
    )
    db.add(new_user)
    await db.flush()
    return UserResponse.model_validate(new_user)


# ─── Group Management ─────────────────────────────────────────────────


@router.get("/groups")
async def list_groups_endpoint(
    admin: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    """List all student groups in the org."""
    from sqlalchemy.orm import selectinload
    from app.admin.models import StudentGroup

    query = select(StudentGroup).options(selectinload(StudentGroup.members))
    if admin.role != UserRole.super_admin:
        query = query.where(StudentGroup.org_id == admin.org_id)
    result = await db.execute(query.order_by(StudentGroup.created_at.desc()))
    groups = result.scalars().unique().all()
    return [
        {
            "id": str(g.id),
            "name": g.name,
            "description": g.description,
            "member_count": len(g.members),
            "created_at": str(g.created_at),
        }
        for g in groups
    ]


@router.post("/groups")
async def create_group_endpoint(
    data: dict,
    admin: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    """Create a new student group."""
    from app.admin.models import StudentGroup

    group = StudentGroup(
        org_id=admin.org_id,
        name=data["name"],
        description=data.get("description"),
    )
    db.add(group)
    await db.flush()
    return {"id": str(group.id), "name": group.name}


@router.put("/groups/{group_id}")
async def update_group_endpoint(
    group_id: uuid.UUID,
    data: dict,
    admin: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    """Update group name/description."""
    from app.admin.models import StudentGroup

    query = select(StudentGroup).where(StudentGroup.id == group_id)
    if admin.role != UserRole.super_admin:
        query = query.where(StudentGroup.org_id == admin.org_id)
    result = await db.execute(query)
    group = result.scalar_one_or_none()
    if not group:
        raise NotFoundError("Group not found")

    if "name" in data:
        group.name = data["name"]
    if "description" in data:
        group.description = data["description"]
    await db.flush()
    return {"id": str(group.id), "name": group.name}


@router.delete("/groups/{group_id}")
async def delete_group_endpoint(
    group_id: uuid.UUID,
    admin: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    """Delete a student group."""
    from app.admin.models import StudentGroup

    query = select(StudentGroup).where(StudentGroup.id == group_id)
    if admin.role != UserRole.super_admin:
        query = query.where(StudentGroup.org_id == admin.org_id)
    result = await db.execute(query)
    group = result.scalar_one_or_none()
    if not group:
        raise NotFoundError("Group not found")
    await db.delete(group)
    return {"ok": True}


@router.get("/groups/{group_id}/members")
async def list_group_members_endpoint(
    group_id: uuid.UUID,
    admin: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    """List members of a group with user details."""
    from app.admin.models import StudentGroup, StudentGroupMember

    query = select(StudentGroup).where(StudentGroup.id == group_id)
    if admin.role != UserRole.super_admin:
        query = query.where(StudentGroup.org_id == admin.org_id)
    result = await db.execute(query)
    if not result.scalar_one_or_none():
        raise NotFoundError("Group not found")

    result = await db.execute(
        select(User, StudentGroupMember)
        .join(StudentGroupMember, StudentGroupMember.user_id == User.id)
        .where(StudentGroupMember.group_id == group_id)
        .order_by(User.full_name)
    )
    rows = result.all()
    return [
        {
            "id": str(u.id),
            "full_name": u.full_name,
            "email": u.email,
            "role": u.role.value if hasattr(u.role, "value") else u.role,
            "member_id": str(m.id),
        }
        for u, m in rows
    ]


@router.post("/groups/{group_id}/members")
async def add_group_members_endpoint(
    group_id: uuid.UUID,
    data: dict,
    admin: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    """Add one or more users to a group. data: {user_ids: [uuid, ...]}"""
    from app.admin.models import StudentGroup, StudentGroupMember

    query = select(StudentGroup).where(StudentGroup.id == group_id)
    if admin.role != UserRole.super_admin:
        query = query.where(StudentGroup.org_id == admin.org_id)
    result = await db.execute(query)
    if not result.scalar_one_or_none():
        raise NotFoundError("Group not found")

    user_ids = data.get("user_ids", [])
    added = 0
    for uid in user_ids:
        existing = await db.execute(
            select(StudentGroupMember).where(
                StudentGroupMember.group_id == group_id,
                StudentGroupMember.user_id == uid,
            )
        )
        if existing.scalar_one_or_none():
            continue
        db.add(StudentGroupMember(group_id=group_id, user_id=uid))
        added += 1
    await db.flush()
    return {"added": added}


@router.delete("/groups/{group_id}/members/{user_id}")
async def remove_group_member_endpoint(
    group_id: uuid.UUID,
    user_id: uuid.UUID,
    admin: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    """Remove a user from a group."""
    from app.admin.models import StudentGroupMember

    result = await db.execute(
        select(StudentGroupMember).where(
            StudentGroupMember.group_id == group_id,
            StudentGroupMember.user_id == user_id,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise NotFoundError("Member not found in group")
    await db.delete(member)
    return {"ok": True}


@router.post("/groups/{group_id}/enroll")
async def enroll_group_endpoint(
    group_id: uuid.UUID,
    data: dict,
    admin: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    """Enroll all members of a group into a course. data: {course_id: uuid}"""
    from datetime import datetime, timezone
    from app.admin.models import StudentGroup, StudentGroupMember
    from app.courses.models import Course
    from app.progress.models import Enrollment

    query = select(StudentGroup).where(StudentGroup.id == group_id)
    if admin.role != UserRole.super_admin:
        query = query.where(StudentGroup.org_id == admin.org_id)
    result = await db.execute(query)
    if not result.scalar_one_or_none():
        raise NotFoundError("Group not found")

    course_id = data.get("course_id")
    if not course_id:
        from fastapi import HTTPException
        raise HTTPException(400, "course_id required")

    result = await db.execute(
        select(StudentGroupMember.user_id).where(StudentGroupMember.group_id == group_id)
    )
    member_user_ids = [row[0] for row in result.all()]

    enrolled = 0
    for uid in member_user_ids:
        existing = await db.execute(
            select(Enrollment).where(
                Enrollment.course_id == course_id,
                Enrollment.student_id == uid,
            )
        )
        if existing.scalar_one_or_none():
            continue
        db.add(Enrollment(
            course_id=course_id,
            student_id=uid,
            enrolled_at=datetime.now(timezone.utc),
        ))
        enrolled += 1

    await db.flush()
    return {"enrolled": enrolled, "total_members": len(member_user_ids)}


# ─── Analytics ────────────────────────────────────────────────────────


@router.get("/analytics/export-csv")
async def export_analytics_csv(
    user: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    """Export enrollment analytics as a CSV file."""
    from app.courses.models import Course
    from app.progress.models import Enrollment

    query = (
        select(User.full_name, User.email, Course.title, Enrollment.progress_percent, Enrollment.enrolled_at, Enrollment.completed_at)
        .join(Enrollment, Enrollment.student_id == User.id)
        .join(Course, Enrollment.course_id == Course.id)
    )
    if user.role != UserRole.super_admin:
        query = query.where(User.org_id == user.org_id)
    result = await db.execute(query.order_by(Enrollment.enrolled_at.desc()))
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

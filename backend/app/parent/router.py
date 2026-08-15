import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.admin.student_profile_service import StudentProfileError
from app.auth.dependencies import get_current_user, require_role
from app.auth.models import User, UserRole
from app.db.session import get_db
from app.parent.service import (
    get_child_grades,
    get_child_progress,
    get_children,
    link_parent_to_student,
    unlink_parent_from_student,
)

router = APIRouter()


class LinkParentRequest(BaseModel):
    student_id: uuid.UUID
    parent_email: str


@router.get("/children")
async def list_children_endpoint(
    user: User = Depends(require_role(UserRole.parent)),
    db: AsyncSession = Depends(get_db),
):
    return await get_children(db, user.id, user.org_id)


@router.post("/links")
async def link_parent_endpoint(
    data: LinkParentRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """School staff attach a parent account to a student.

    Deliberately not `require_role`: the caller may be a teacher, methodist,
    admin or super_admin, and which students each of those may touch is a
    per-student question, not a per-role one. `link_parent_to_student` asks
    `_authorize_student`, the same guard the student-profile page uses.
    """
    try:
        return await link_parent_to_student(db, user, data.student_id, data.parent_email)
    except StudentProfileError as e:
        raise HTTPException(status_code=403 if e.code == "forbidden" else 404, detail=e.message)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/links")
async def unlink_parent_endpoint(
    student_id: uuid.UUID,
    parent_email: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Undo a link. Staff only, same per-student authorisation as creating one."""
    try:
        return await unlink_parent_from_student(db, user, student_id, parent_email)
    except StudentProfileError as e:
        raise HTTPException(status_code=403 if e.code == "forbidden" else 404, detail=e.message)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/children/{child_id}/progress")
async def child_progress_endpoint(
    child_id: uuid.UUID,
    user: User = Depends(require_role(UserRole.parent)),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await get_child_progress(db, user.id, child_id, user.org_id)
    except PermissionError:
        raise HTTPException(status_code=403, detail="Not your child")


@router.get("/children/{child_id}/grades")
async def child_grades_endpoint(
    child_id: uuid.UUID,
    user: User = Depends(require_role(UserRole.parent)),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await get_child_grades(db, user.id, child_id, user.org_id)
    except PermissionError:
        raise HTTPException(status_code=403, detail="Not your child")

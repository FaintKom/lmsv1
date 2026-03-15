import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user, require_role
from app.auth.models import User, UserRole
from app.db.session import get_db
from app.parent.service import (
    get_children,
    get_child_progress,
    get_child_grades,
    link_child,
)

router = APIRouter()


class LinkChildRequest(BaseModel):
    child_email: str


@router.get("/children")
async def list_children_endpoint(
    user: User = Depends(require_role(UserRole.parent)),
    db: AsyncSession = Depends(get_db),
):
    return await get_children(db, user.id, user.org_id)


@router.post("/children/link")
async def link_child_endpoint(
    data: LinkChildRequest,
    user: User = Depends(require_role(UserRole.parent)),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await link_child(db, user.id, data.child_email, user.org_id)
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

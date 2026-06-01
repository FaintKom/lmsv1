"""Sites (branches) endpoints (mounted at ``/api/v1/sites``).

  - GET    /sites              staff: list org sites (teacher read-only)
  - POST   /sites              methodist/admin/super_admin: create a site
  - PUT    /sites/{site_id}    methodist/admin/super_admin: update a site
  - DELETE /sites/{site_id}    methodist/admin/super_admin: delete a site

RBAC + org isolation live in ``sites.service``; this router is a thin
authn + validation + error-translation shim, mirroring ``rooms.router``.

Deliberately NOT using ``from __future__ import annotations`` so FastAPI /
Pydantic resolve the request/response models eagerly at import time.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.analytics.task_stats_service import TaskStatsError
from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.db.session import get_db
from app.sites import service as svc

router = APIRouter()


def _translate(exc: TaskStatsError) -> HTTPException:
    code_to_status = {
        "not_found": status.HTTP_404_NOT_FOUND,
        "forbidden": status.HTTP_403_FORBIDDEN,
        "bad_request": status.HTTP_422_UNPROCESSABLE_ENTITY,
    }
    http_status = code_to_status.get(exc.code, status.HTTP_400_BAD_REQUEST)
    return HTTPException(
        status_code=http_status,
        detail={"code": exc.code, "message": exc.message},
    )


class SiteCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    timezone: str = Field(default=svc.DEFAULT_TIMEZONE, max_length=64)


class SiteUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    timezone: str | None = Field(default=None, max_length=64)
    is_active: bool | None = None


@router.get("")
async def list_sites(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """All sites in the caller's org (staff only; teacher read-only)."""
    try:
        sites = await svc.list_sites(db, user)
    except TaskStatsError as exc:
        raise _translate(exc) from exc
    return {"sites": sites}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_site(
    data: SiteCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await svc.create_site(
            db, user, name=data.name, timezone=data.timezone
        )
    except TaskStatsError as exc:
        raise _translate(exc) from exc


@router.put("/{site_id}")
async def update_site(
    site_id: uuid.UUID,
    data: SiteUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await svc.update_site(
            db,
            user,
            site_id,
            name=data.name,
            timezone=data.timezone,
            is_active=data.is_active,
        )
    except TaskStatsError as exc:
        raise _translate(exc) from exc


@router.delete("/{site_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_site(
    site_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        await svc.delete_site(db, user, site_id)
    except TaskStatsError as exc:
        raise _translate(exc) from exc

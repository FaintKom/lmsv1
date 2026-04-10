from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import require_role
from app.auth.models import User, UserRole
from app.db.session import get_db
from app.scorm.models import SCORMFormat, SCORMPackage, SCORMStatus

router = APIRouter()


class SCORMExportRequest(BaseModel):
    course_id: uuid.UUID
    format: SCORMFormat


class SCORMPackageResponse(BaseModel):
    id: uuid.UUID
    org_id: uuid.UUID
    course_id: uuid.UUID
    format: str
    status: str
    download_url: str | None
    created_by: uuid.UUID | None

    model_config = {"from_attributes": True}


@router.post("/export", response_model=SCORMPackageResponse, status_code=status.HTTP_201_CREATED)
async def export_scorm(
    body: SCORMExportRequest,
    user: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    pkg = SCORMPackage(
        org_id=user.org_id,
        course_id=body.course_id,
        format=body.format,
        status=SCORMStatus.pending,
        created_by=user.id,
    )
    db.add(pkg)
    await db.flush()
    return pkg


@router.get("/packages", response_model=list[SCORMPackageResponse])
async def list_packages(
    user: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SCORMPackage).where(SCORMPackage.org_id == user.org_id)
    )
    return result.scalars().all()


@router.get("/packages/{package_id}", response_model=SCORMPackageResponse)
async def get_package(
    package_id: uuid.UUID,
    user: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SCORMPackage).where(
            SCORMPackage.id == package_id,
            SCORMPackage.org_id == user.org_id,
        )
    )
    pkg = result.scalar_one_or_none()
    if not pkg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Package not found")
    return pkg

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import require_role
from app.auth.models import User, UserRole
from app.db.session import get_db
from app.plagiarism.models import PlagiarismCheck, PlagiarismStatus

router = APIRouter()


class PlagiarismCheckRequest(BaseModel):
    submission_id: str
    provider: str = "default"


class PlagiarismCheckResponse(BaseModel):
    id: uuid.UUID
    org_id: uuid.UUID
    submission_id: str
    status: str
    similarity_score: float | None
    report_url: str | None
    provider: str
    checked_by: uuid.UUID | None

    model_config = {"from_attributes": True}


@router.post("/check", response_model=PlagiarismCheckResponse, status_code=status.HTTP_201_CREATED)
async def create_check(
    body: PlagiarismCheckRequest,
    user: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    check = PlagiarismCheck(
        org_id=user.org_id,
        submission_id=body.submission_id,
        status=PlagiarismStatus.pending,
        provider=body.provider,
        checked_by=user.id,
    )
    db.add(check)
    await db.flush()
    return check


@router.get("/checks", response_model=list[PlagiarismCheckResponse])
async def list_checks(
    user: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PlagiarismCheck).where(PlagiarismCheck.org_id == user.org_id)
    )
    return result.scalars().all()


@router.get("/checks/{check_id}", response_model=PlagiarismCheckResponse)
async def get_check(
    check_id: uuid.UUID,
    user: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PlagiarismCheck).where(
            PlagiarismCheck.id == check_id,
            PlagiarismCheck.org_id == user.org_id,
        )
    )
    check = result.scalar_one_or_none()
    if not check:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Check not found")
    return check

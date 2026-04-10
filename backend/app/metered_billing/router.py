from __future__ import annotations

import uuid
from datetime import date

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import require_role
from app.auth.models import User, UserRole
from app.db.session import get_db
from app.metered_billing.models import UsageRecord

router = APIRouter()


class UsageReportRequest(BaseModel):
    org_id: uuid.UUID
    metric: str
    quantity: float
    period_start: date
    period_end: date


class UsageRecordResponse(BaseModel):
    id: uuid.UUID
    org_id: uuid.UUID
    metric: str
    quantity: float
    period_start: date
    period_end: date

    model_config = {"from_attributes": True}


@router.post("/report-usage", response_model=UsageRecordResponse, status_code=201)
async def report_usage(
    body: UsageReportRequest,
    user: User = Depends(require_role(UserRole.super_admin)),
    db: AsyncSession = Depends(get_db),
):
    """Report usage for an org. Restricted to super_admin only."""
    record = UsageRecord(
        org_id=body.org_id,
        metric=body.metric,
        quantity=body.quantity,
        period_start=body.period_start,
        period_end=body.period_end,
    )
    db.add(record)
    await db.flush()
    return record


@router.get("/usage", response_model=list[UsageRecordResponse])
async def get_usage(
    user: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    """Return usage records for the current org, ordered by most recent period first."""
    result = await db.execute(
        select(UsageRecord)
        .where(UsageRecord.org_id == user.org_id)
        .order_by(UsageRecord.period_start.desc())
    )
    return result.scalars().all()

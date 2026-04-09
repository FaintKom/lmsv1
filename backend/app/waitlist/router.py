"""Waitlist endpoints.

POST /api/v1/waitlist — public, rate-limited. Captures an email.
GET  /api/v1/waitlist — super_admin only. Lists waitlist entries.
"""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request, Response
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import require_role
from app.auth.models import User, UserRole
from app.common.rate_limit import limiter
from app.db.session import get_db
from app.waitlist.models import WaitlistEntry

router = APIRouter()


class WaitlistSubmitRequest(BaseModel):
    email: EmailStr
    role: str | None = None
    source: str | None = None


@router.post("/waitlist")
@limiter.limit("5/hour")
async def waitlist_submit(
    request: Request,
    response: Response,
    data: WaitlistSubmitRequest,
    db: AsyncSession = Depends(get_db),
):
    """Capture a waitlist email. Idempotent — returns the same
    success message whether the email is new or already there, so
    attackers can't use this endpoint to probe which emails are
    on the waitlist."""
    email = data.email.strip().lower()
    existing = (
        await db.execute(select(WaitlistEntry).where(WaitlistEntry.email == email))
    ).scalar_one_or_none()

    if existing is None:
        client = request.client
        db.add(
            WaitlistEntry(
                email=email,
                role=(data.role or "").strip()[:100] or None,
                source=(data.source or "").strip()[:100] or None,
                ip_address=(client.host if client else None),
                user_agent=(request.headers.get("user-agent") or "")[:500] or None,
            )
        )
        await db.flush()

    return {"message": "Thanks — you're on the list. We'll be in touch."}


@router.get("/waitlist")
async def waitlist_list(
    user: User = Depends(require_role(UserRole.super_admin)),
    db: AsyncSession = Depends(get_db),
):
    """Super admin only — full waitlist for outreach. Ordered newest first."""
    result = await db.execute(
        select(WaitlistEntry).order_by(WaitlistEntry.created_at.desc())
    )
    entries = result.scalars().all()
    return {
        "total": len(entries),
        "entries": [
            {
                "id": str(e.id),
                "email": e.email,
                "role": e.role,
                "source": e.source,
                "contacted": e.contacted,
                "contacted_at": e.contacted_at.isoformat() if e.contacted_at else None,
                "created_at": e.created_at.isoformat() if e.created_at else None,
            }
            for e in entries
        ],
    }


@router.post("/waitlist/{entry_id}/mark-contacted")
async def waitlist_mark_contacted(
    entry_id: str,
    user: User = Depends(require_role(UserRole.super_admin)),
    db: AsyncSession = Depends(get_db),
):
    """Super admin — flag an entry as contacted."""
    import uuid as _uuid

    try:
        parsed_id = _uuid.UUID(entry_id)
    except ValueError:
        from fastapi import HTTPException
        raise HTTPException(400, "Invalid id") from None

    row = (
        await db.execute(select(WaitlistEntry).where(WaitlistEntry.id == parsed_id))
    ).scalar_one_or_none()
    if row is None:
        from fastapi import HTTPException
        raise HTTPException(404, "Entry not found")

    row.contacted = True
    row.contacted_at = datetime.now(timezone.utc)
    db.add(row)
    await db.flush()
    return {"status": "ok"}

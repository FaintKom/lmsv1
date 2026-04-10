"""Webhook management endpoints (P2-12).

Admin-only CRUD for webhook endpoints, plus a test-delivery trigger.
"""
from __future__ import annotations

import secrets
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, HttpUrl
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import require_role
from app.auth.models import User, UserRole
from app.db.session import get_db
from app.webhooks.models import WebhookDelivery, WebhookEndpoint
from app.webhooks.service import dispatch_event

router = APIRouter()


class WebhookCreate(BaseModel):
    url: HttpUrl
    description: str | None = None
    events: list[str] = []


class WebhookUpdate(BaseModel):
    url: HttpUrl | None = None
    description: str | None = None
    events: list[str] | None = None
    is_active: bool | None = None


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------


@router.get("/webhooks")
async def list_webhooks(
    admin: User = Depends(require_role(UserRole.admin, UserRole.super_admin)),
    db: AsyncSession = Depends(get_db),
):
    """List all webhook endpoints for the admin's org."""
    result = await db.execute(
        select(WebhookEndpoint)
        .where(WebhookEndpoint.org_id == admin.org_id)
        .order_by(WebhookEndpoint.created_at.desc())
    )
    endpoints = result.scalars().all()
    return {
        "endpoints": [
            {
                "id": str(ep.id),
                "url": ep.url,
                "description": ep.description,
                "events": ep.events,
                "is_active": ep.is_active,
                "secret": ep.secret[:8] + "…",  # partial reveal
                "created_at": ep.created_at.isoformat() if ep.created_at else None,
            }
            for ep in endpoints
        ]
    }


@router.post("/webhooks")
async def create_webhook(
    data: WebhookCreate,
    admin: User = Depends(require_role(UserRole.admin, UserRole.super_admin)),
    db: AsyncSession = Depends(get_db),
):
    """Register a new webhook endpoint. A signing secret is generated."""
    secret = secrets.token_hex(32)
    ep = WebhookEndpoint(
        org_id=admin.org_id,
        url=str(data.url),
        secret=secret,
        description=data.description,
        events=data.events or [],
    )
    db.add(ep)
    await db.flush()
    return {
        "id": str(ep.id),
        "url": ep.url,
        "secret": secret,  # shown ONCE at creation time
        "events": ep.events,
        "is_active": True,
        "message": "Save the secret — it won't be shown again.",
    }


@router.put("/webhooks/{webhook_id}")
async def update_webhook(
    webhook_id: str,
    data: WebhookUpdate,
    admin: User = Depends(require_role(UserRole.admin, UserRole.super_admin)),
    db: AsyncSession = Depends(get_db),
):
    """Update a webhook endpoint (URL, events, active status)."""
    try:
        parsed = uuid.UUID(webhook_id)
    except ValueError:
        raise HTTPException(400, "Invalid id") from None

    ep = (
        await db.execute(
            select(WebhookEndpoint).where(
                WebhookEndpoint.id == parsed,
                WebhookEndpoint.org_id == admin.org_id,
            )
        )
    ).scalar_one_or_none()
    if not ep:
        raise HTTPException(404, "Webhook not found")

    if data.url is not None:
        ep.url = str(data.url)
    if data.description is not None:
        ep.description = data.description
    if data.events is not None:
        ep.events = data.events
    if data.is_active is not None:
        ep.is_active = data.is_active
    db.add(ep)
    await db.flush()
    return {"status": "updated", "id": str(ep.id)}


@router.delete("/webhooks/{webhook_id}")
async def delete_webhook(
    webhook_id: str,
    admin: User = Depends(require_role(UserRole.admin, UserRole.super_admin)),
    db: AsyncSession = Depends(get_db),
):
    """Delete a webhook endpoint and all its delivery logs."""
    try:
        parsed = uuid.UUID(webhook_id)
    except ValueError:
        raise HTTPException(400, "Invalid id") from None

    ep = (
        await db.execute(
            select(WebhookEndpoint).where(
                WebhookEndpoint.id == parsed,
                WebhookEndpoint.org_id == admin.org_id,
            )
        )
    ).scalar_one_or_none()
    if not ep:
        raise HTTPException(404, "Webhook not found")

    await db.delete(ep)
    await db.flush()
    return {"status": "deleted"}


# ---------------------------------------------------------------------------
# Delivery logs + test
# ---------------------------------------------------------------------------


@router.get("/webhooks/{webhook_id}/deliveries")
async def list_deliveries(
    webhook_id: str,
    admin: User = Depends(require_role(UserRole.admin, UserRole.super_admin)),
    db: AsyncSession = Depends(get_db),
):
    """List recent deliveries for a webhook (newest first, max 50)."""
    try:
        parsed = uuid.UUID(webhook_id)
    except ValueError:
        raise HTTPException(400, "Invalid id") from None

    ep = (
        await db.execute(
            select(WebhookEndpoint).where(
                WebhookEndpoint.id == parsed,
                WebhookEndpoint.org_id == admin.org_id,
            )
        )
    ).scalar_one_or_none()
    if not ep:
        raise HTTPException(404, "Webhook not found")

    result = await db.execute(
        select(WebhookDelivery)
        .where(WebhookDelivery.endpoint_id == parsed)
        .order_by(WebhookDelivery.created_at.desc())
        .limit(50)
    )
    deliveries = result.scalars().all()
    return {
        "deliveries": [
            {
                "id": str(d.id),
                "event_type": d.event_type,
                "status_code": d.status_code,
                "success": d.success,
                "error": d.error,
                "attempt": d.attempt,
                "created_at": d.created_at.isoformat() if d.created_at else None,
            }
            for d in deliveries
        ]
    }


@router.post("/webhooks/{webhook_id}/test")
async def test_webhook(
    webhook_id: str,
    admin: User = Depends(require_role(UserRole.admin, UserRole.super_admin)),
    db: AsyncSession = Depends(get_db),
):
    """Send a test event to a single webhook endpoint."""
    try:
        parsed = uuid.UUID(webhook_id)
    except ValueError:
        raise HTTPException(400, "Invalid id") from None

    ep = (
        await db.execute(
            select(WebhookEndpoint).where(
                WebhookEndpoint.id == parsed,
                WebhookEndpoint.org_id == admin.org_id,
            )
        )
    ).scalar_one_or_none()
    if not ep:
        raise HTTPException(404, "Webhook not found")

    count = await dispatch_event(
        db, admin.org_id, "test.ping",
        {"message": "This is a test event from GrassLMS."},
    )
    return {"status": "sent", "successes": count}

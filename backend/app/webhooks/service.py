"""Webhook delivery service (P2-12).

Dispatches events to all active webhook endpoints for an org.
Uses httpx for async delivery and logs each attempt.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
import time
import uuid as _uuid

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.webhooks.models import WebhookDelivery, WebhookEndpoint

logger = logging.getLogger(__name__)

# Timeout for each webhook delivery attempt (seconds)
DELIVERY_TIMEOUT = 10


async def dispatch_event(
    db: AsyncSession,
    org_id: _uuid.UUID,
    event_type: str,
    payload: dict,
) -> int:
    """Send an event to all active endpoints for the org.

    Returns the number of successful deliveries. Failed deliveries
    are logged but do not raise — webhooks must never break the
    main request flow.
    """
    result = await db.execute(
        select(WebhookEndpoint).where(
            WebhookEndpoint.org_id == org_id,
            WebhookEndpoint.is_active == True,  # noqa: E712
        )
    )
    endpoints = result.scalars().all()

    success_count = 0
    timestamp = int(time.time())

    for ep in endpoints:
        # Check if this endpoint subscribes to the event type
        if ep.events and event_type not in ep.events:
            continue

        body = json.dumps({
            "event": event_type,
            "timestamp": timestamp,
            "data": payload,
        }, default=str)

        # HMAC-SHA256 signature so the receiver can verify authenticity
        signature = hmac.new(
            ep.secret.encode(), body.encode(), hashlib.sha256
        ).hexdigest()

        delivery = WebhookDelivery(
            endpoint_id=ep.id,
            event_type=event_type,
            payload=payload,
            attempt=1,
        )

        try:
            async with httpx.AsyncClient(timeout=DELIVERY_TIMEOUT) as client:
                resp = await client.post(
                    ep.url,
                    content=body,
                    headers={
                        "Content-Type": "application/json",
                        "X-Webhook-Signature": f"sha256={signature}",
                        "X-Webhook-Event": event_type,
                        "X-Webhook-Timestamp": str(timestamp),
                    },
                )
            delivery.status_code = resp.status_code
            delivery.response_body = resp.text[:2000] if resp.text else None
            delivery.success = 200 <= resp.status_code < 300
            if delivery.success:
                success_count += 1
            else:
                logger.warning(
                    f"Webhook delivery to {ep.url} returned {resp.status_code}"
                )
        except Exception as exc:
            delivery.success = False
            delivery.error = str(exc)[:2000]
            logger.warning(f"Webhook delivery to {ep.url} failed: {exc}")

        db.add(delivery)

    await db.flush()
    return success_count

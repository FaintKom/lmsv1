"""Donations router — public endpoints (/initiate, /webhook) + GET stats.

The router is mounted with prefix `/api/v1/donations` from `main.py`
(matching the project convention used by all sibling modules).
"""
import json
import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.rate_limit import limiter
from app.db.session import get_db
from app.donations.config import get_donations_settings
from app.donations.models import Donation, DonationStatus
from app.donations.schemas import (
    DonationInitiateRequest,
    DonationInitiateResponse,
    DonationStatsResponse,
    DonationStatusResponse,
)
from app.donations.service import (
    OCClientError,
    aggregate_stats,
    apply_webhook_update,
    create_oc_order,
    verify_webhook_signature,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/initiate", response_model=DonationInitiateResponse)
@limiter.limit("10/minute")
async def initiate_donation(
    request: Request,
    body: DonationInitiateRequest,
    db: AsyncSession = Depends(get_db),
) -> DonationInitiateResponse:
    cfg = get_donations_settings()
    if not cfg.enabled:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Donations not configured")

    donation = Donation(
        amount_cents=body.amount_cents,
        currency="USD",
        recurrence=body.recurrence,
        donor_name=None if body.anonymous else body.donor_name,
        donor_email=None if body.anonymous else body.donor_email,
        message=body.message,
        anonymous=body.anonymous,
        status=DonationStatus.pending,
    )
    db.add(donation)
    await db.flush()

    try:
        checkout_url = await create_oc_order(cfg, donation=donation, success_url=cfg.success_url)
    except OCClientError as e:
        logger.warning("createOrder failed: %s", e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Donation service unavailable")

    await db.flush()
    return DonationInitiateResponse(donation_id=donation.id, oc_checkout_url=checkout_url)


@router.post("/webhook", status_code=status.HTTP_200_OK)
async def receive_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    cfg = get_donations_settings()
    raw_body = await request.body()
    signature = request.headers.get("x-oc-signature") or request.headers.get("x-hub-signature-256")
    if not verify_webhook_signature(cfg.webhook_secret, raw_body, signature):
        logger.warning("webhook HMAC mismatch from %s", request.client.host if request.client else "unknown")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid signature")

    payload = json.loads(raw_body or b"{}")
    await apply_webhook_update(db, payload=payload)
    return {"ack": "ok"}


@router.get("/stats", response_model=DonationStatsResponse)
async def get_stats(db: AsyncSession = Depends(get_db)) -> DonationStatsResponse:
    total, count = await aggregate_stats(db)
    return DonationStatsResponse(total_confirmed_usd=total, donor_count=count)


@router.get("/{donation_id}", response_model=DonationStatusResponse)
async def get_donation(
    donation_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> DonationStatusResponse:
    stmt = select(Donation).where(Donation.id == donation_id)
    donation = (await db.execute(stmt)).scalar_one_or_none()
    if not donation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return DonationStatusResponse.model_validate(donation)

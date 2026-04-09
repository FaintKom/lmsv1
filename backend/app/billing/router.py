import json
import logging

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import require_role
from app.auth.models import User, UserRole
from app.billing.schemas import CheckoutResponse, InvoiceResponse, PlanResponse, SubscriptionResponse
from app.billing.service import (
    create_checkout_session,
    create_portal_session,
    get_invoices,
    get_subscription,
    handle_webhook_event,
    list_plans,
)
from app.config import settings
from app.db.session import get_db

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/plans", response_model=list[PlanResponse])
async def list_plans_endpoint(db: AsyncSession = Depends(get_db)):
    plans = await list_plans(db)
    # Deduplicate by name (keep first occurrence) — safety net
    seen: set[str] = set()
    unique: list = []
    for p in plans:
        if p.name not in seen:
            seen.add(p.name)
            unique.append(p)
    return [PlanResponse.model_validate(p) for p in unique]


@router.get("/subscription", response_model=SubscriptionResponse | None)
async def get_subscription_endpoint(
    user: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    sub = await get_subscription(db, user)
    if sub:
        return SubscriptionResponse.model_validate(sub)
    return None


class CheckoutBody(BaseModel):
    plan_id: str
    success_url: str = ""
    cancel_url: str = ""


@router.get("/status")
async def billing_status_endpoint():
    """Public — tells the frontend whether Stripe is configured.

    The frontend uses this to decide whether to render billing UI or
    show a "billing not enabled" placeholder. Does NOT leak the secret.
    """
    return {"enabled": bool(settings.stripe_secret_key)}


@router.post("/checkout", response_model=CheckoutResponse)
async def checkout_endpoint(
    data: CheckoutBody,
    user: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    """Create Stripe Checkout session."""
    if not settings.stripe_secret_key:
        raise HTTPException(400, "Stripe is not configured. Set STRIPE_SECRET_KEY env var.")
    base = settings.app_url.rstrip("/")
    try:
        import uuid as _uuid
        url = await create_checkout_session(
            db, _uuid.UUID(data.plan_id), user,
            success_url=data.success_url or f"{base}/admin/billing?success=true",
            cancel_url=data.cancel_url or f"{base}/admin/billing?canceled=true",
        )
        return CheckoutResponse(checkout_url=url)
    except Exception as e:
        raise HTTPException(400, str(e))


@router.post("/portal")
async def portal_endpoint(
    user: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    """Create Stripe Customer Portal session."""
    if not settings.stripe_secret_key:
        raise HTTPException(400, "Stripe is not configured")
    base = settings.app_url.rstrip("/")
    try:
        url = await create_portal_session(
            db, user,
            return_url=f"{base}/admin/billing",
        )
        return {"portal_url": url}
    except Exception as e:
        raise HTTPException(400, str(e))


@router.get("/invoices", response_model=list[InvoiceResponse])
async def invoices_endpoint(
    user: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    invoices = await get_invoices(db, user.org_id)
    return [InvoiceResponse.model_validate(i) for i in invoices]


@router.post("/webhook")
async def stripe_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Handle Stripe webhook events.

    In production the webhook signature MUST be verified — an unauthenticated
    endpoint that writes to billing state is a high-value target. We refuse
    webhook calls entirely when stripe_webhook_secret is unset in production.
    In non-production (local dev), we accept raw JSON so you can curl events
    manually during testing.
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if settings.stripe_webhook_secret:
        if not sig_header:
            raise HTTPException(400, "Missing stripe-signature header")
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.stripe_webhook_secret
            )
        except Exception as e:
            logger.warning(f"Webhook signature failed: {e}")
            raise HTTPException(400, "Invalid signature")
    elif settings.is_production():
        logger.error(
            "Webhook received but STRIPE_WEBHOOK_SECRET is unset in production"
        )
        raise HTTPException(503, "Webhook endpoint not configured")
    else:
        # Dev mode only — signature verification disabled.
        event = json.loads(payload)

    try:
        await handle_webhook_event(db, event)
        await db.commit()
    except Exception as e:
        logger.error(f"Webhook error: {e}")

    return {"status": "ok"}

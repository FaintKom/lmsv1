import json
import logging

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import require_role
from app.auth.models import User, UserRole
from app.billing import lemonsqueezy as ls
from app.billing import ls_service
from app.billing.schemas import (
    CheckoutResponse,
    InvoiceResponse,
    PlanResponse,
    SubscriptionResponse,
)
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
    """Public — tells the frontend which billing providers are wired up.

    Never leaks secrets. Frontend decides which checkout button(s) to show.
    ``enabled`` stays for backwards compatibility with older clients.
    """
    stripe_enabled = bool(settings.stripe_secret_key)
    ls_enabled = ls.is_enabled()
    return {
        "enabled": stripe_enabled or ls_enabled,
        "providers": {
            "stripe": stripe_enabled,
            "lemonsqueezy": ls_enabled,
        },
    }


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


# ---------------- Lemon Squeezy ----------------


class LSCheckoutBody(BaseModel):
    plan_id: str
    interval: str = "month"  # 'month' or 'year'
    success_url: str = ""


@router.post("/lemonsqueezy/checkout", response_model=CheckoutResponse)
async def ls_checkout_endpoint(
    data: LSCheckoutBody,
    user: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    """Create a Lemon Squeezy hosted-checkout URL.

    Returns a ``checkout_url`` identical in shape to the Stripe endpoint so
    the frontend can swap providers without a form change.
    """
    if not ls.is_enabled():
        raise HTTPException(
            400,
            "Lemon Squeezy is not configured. Set LEMONSQUEEZY_API_KEY + LEMONSQUEEZY_STORE_ID.",
        )
    base = settings.app_url.rstrip("/")
    try:
        import uuid as _uuid
        url = await ls_service.create_checkout_url(
            db,
            _uuid.UUID(data.plan_id),
            user,
            interval=data.interval,
            success_url=data.success_url or f"{base}/admin/billing?success=true&provider=lemonsqueezy",
        )
        return CheckoutResponse(checkout_url=url)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except ls.LemonSqueezyError as e:
        logger.error("ls.checkout.api_error status=%s body=%s", e.status_code, e.body[:200])
        raise HTTPException(502, "Payment provider error — please try again")


@router.post("/lemonsqueezy/webhook")
async def lemonsqueezy_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Handle Lemon Squeezy webhook events.

    Same security posture as the Stripe webhook: in production we require
    the HMAC-SHA256 signature (``X-Signature`` header) to match the shared
    secret. In dev we accept raw JSON for curl-based testing when no
    secret is set.
    """
    payload = await request.body()
    sig_header = request.headers.get("x-signature") or request.headers.get("X-Signature")

    if settings.lemonsqueezy_webhook_secret:
        if not sig_header:
            raise HTTPException(400, "Missing X-Signature header")
        if not ls.verify_webhook_signature(payload, sig_header):
            logger.warning("ls.webhook.signature_invalid")
            raise HTTPException(400, "Invalid signature")
    elif settings.is_production():
        logger.error(
            "ls.webhook.misconfigured LEMONSQUEEZY_WEBHOOK_SECRET is unset in production"
        )
        raise HTTPException(503, "Webhook endpoint not configured")

    try:
        event = json.loads(payload)
    except Exception:
        raise HTTPException(400, "Invalid JSON")

    try:
        await ls_service.handle_event(db, event)
        await db.commit()
    except Exception as e:
        # Handler already logs — return 200 so LS doesn't retry-storm.
        logger.error("ls.webhook.unhandled error=%s", e)

    return {"status": "ok"}

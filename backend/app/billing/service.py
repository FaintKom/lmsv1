import uuid
from datetime import datetime, timezone

import stripe
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import Organization, User
from app.billing.models import Invoice, InvoiceStatus, Plan, Subscription, SubscriptionStatus
from app.config import settings


def _init_stripe():
    if settings.stripe_secret_key:
        stripe.api_key = settings.stripe_secret_key


async def list_plans(db: AsyncSession) -> list[Plan]:
    result = await db.execute(select(Plan).where(Plan.is_active == True).order_by(Plan.price_monthly))
    return list(result.scalars().all())


async def get_subscription(db: AsyncSession, user: User) -> Subscription | None:
    result = await db.execute(
        select(Subscription).where(Subscription.org_id == user.org_id)
    )
    return result.scalar_one_or_none()


async def create_checkout_session(
    db: AsyncSession, plan_id: uuid.UUID, user: User, success_url: str, cancel_url: str
) -> str:
    """Create Stripe Checkout session and return URL."""
    _init_stripe()

    result = await db.execute(select(Plan).where(Plan.id == plan_id))
    plan = result.scalar_one_or_none()
    if not plan:
        raise ValueError("Plan not found")

    result = await db.execute(select(Organization).where(Organization.id == user.org_id))
    org = result.scalar_one_or_none()

    if org and org.stripe_customer_id:
        customer_id = org.stripe_customer_id
    else:
        customer = stripe.Customer.create(
            email=user.email,
            name=org.name if org else user.full_name,
            metadata={"org_id": str(user.org_id)},
        )
        customer_id = customer.id
        if org:
            org.stripe_customer_id = customer_id
            await db.flush()

    session = stripe.checkout.Session.create(
        customer=customer_id,
        payment_method_types=["card"],
        line_items=[{"price": plan.stripe_price_id, "quantity": 1}],
        mode="subscription",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"org_id": str(user.org_id), "plan_id": str(plan_id)},
    )
    return session.url


async def create_portal_session(db: AsyncSession, user: User, return_url: str) -> str:
    """Create Stripe Customer Portal session."""
    _init_stripe()

    result = await db.execute(select(Organization).where(Organization.id == user.org_id))
    org = result.scalar_one_or_none()
    if not org or not org.stripe_customer_id:
        raise ValueError("No billing account found")

    session = stripe.billing_portal.Session.create(
        customer=org.stripe_customer_id,
        return_url=return_url,
    )
    return session.url


async def handle_webhook_event(db: AsyncSession, event: dict) -> None:
    """Process Stripe webhook events."""
    event_type = event.get("type", "")
    data = event.get("data", {}).get("object", {})

    if event_type == "checkout.session.completed":
        await _handle_checkout_completed(db, data)
    elif event_type == "customer.subscription.updated":
        await _handle_subscription_updated(db, data)
    elif event_type == "customer.subscription.deleted":
        await _handle_subscription_deleted(db, data)
    elif event_type == "invoice.paid":
        await _handle_invoice_paid(db, data)
    elif event_type == "invoice.payment_failed":
        await _handle_invoice_failed(db, data)


async def _handle_checkout_completed(db: AsyncSession, data: dict) -> None:
    org_id_str = data.get("metadata", {}).get("org_id")
    plan_id_str = data.get("metadata", {}).get("plan_id")
    stripe_sub_id = data.get("subscription")
    if not org_id_str or not stripe_sub_id:
        return

    org_id = uuid.UUID(org_id_str)
    plan_id = uuid.UUID(plan_id_str) if plan_id_str else None

    _init_stripe()
    stripe_sub = stripe.Subscription.retrieve(stripe_sub_id)

    result = await db.execute(select(Subscription).where(Subscription.org_id == org_id))
    sub = result.scalar_one_or_none()

    period_start = datetime.fromtimestamp(stripe_sub.current_period_start, tz=timezone.utc)
    period_end = datetime.fromtimestamp(stripe_sub.current_period_end, tz=timezone.utc)

    if sub:
        sub.stripe_subscription_id = stripe_sub_id
        sub.status = SubscriptionStatus.active
        sub.plan_id = plan_id or sub.plan_id
        sub.current_period_start = period_start
        sub.current_period_end = period_end
    else:
        if not plan_id:
            return
        sub = Subscription(
            org_id=org_id, plan_id=plan_id, stripe_subscription_id=stripe_sub_id,
            status=SubscriptionStatus.active,
            current_period_start=period_start, current_period_end=period_end,
        )
        db.add(sub)
    await db.flush()


async def _handle_subscription_updated(db: AsyncSession, data: dict) -> None:
    stripe_sub_id = data.get("id")
    status = data.get("status")
    result = await db.execute(
        select(Subscription).where(Subscription.stripe_subscription_id == stripe_sub_id)
    )
    sub = result.scalar_one_or_none()
    if not sub:
        return

    status_map = {
        "active": SubscriptionStatus.active, "past_due": SubscriptionStatus.past_due,
        "canceled": SubscriptionStatus.canceled, "trialing": SubscriptionStatus.trialing,
    }
    sub.status = status_map.get(status, SubscriptionStatus.active)
    if data.get("current_period_start"):
        sub.current_period_start = datetime.fromtimestamp(data["current_period_start"], tz=timezone.utc)
    if data.get("current_period_end"):
        sub.current_period_end = datetime.fromtimestamp(data["current_period_end"], tz=timezone.utc)
    if data.get("canceled_at"):
        sub.canceled_at = datetime.fromtimestamp(data["canceled_at"], tz=timezone.utc)
    await db.flush()


async def _handle_subscription_deleted(db: AsyncSession, data: dict) -> None:
    stripe_sub_id = data.get("id")
    result = await db.execute(
        select(Subscription).where(Subscription.stripe_subscription_id == stripe_sub_id)
    )
    sub = result.scalar_one_or_none()
    if sub:
        sub.status = SubscriptionStatus.canceled
        sub.canceled_at = datetime.now(timezone.utc)
        await db.flush()


async def _handle_invoice_paid(db: AsyncSession, data: dict) -> None:
    stripe_invoice_id = data.get("id")
    customer_id = data.get("customer")
    result = await db.execute(
        select(Organization).where(Organization.stripe_customer_id == customer_id)
    )
    org = result.scalar_one_or_none()
    if not org:
        return

    existing = await db.execute(select(Invoice).where(Invoice.stripe_invoice_id == stripe_invoice_id))
    if existing.scalar_one_or_none():
        return

    invoice = Invoice(
        org_id=org.id, stripe_invoice_id=stripe_invoice_id,
        amount_cents=data.get("amount_paid", 0), status=InvoiceStatus.paid,
        invoice_url=data.get("hosted_invoice_url"),
        period_start=datetime.fromtimestamp(data.get("period_start", 0), tz=timezone.utc),
        period_end=datetime.fromtimestamp(data.get("period_end", 0), tz=timezone.utc),
        created_at=datetime.now(timezone.utc),
    )
    db.add(invoice)
    await db.flush()


async def _handle_invoice_failed(db: AsyncSession, data: dict) -> None:
    sub_id = data.get("subscription")
    if not sub_id:
        return
    result = await db.execute(
        select(Subscription).where(Subscription.stripe_subscription_id == sub_id)
    )
    sub = result.scalar_one_or_none()
    if sub:
        sub.status = SubscriptionStatus.past_due
        await db.flush()


async def get_invoices(db: AsyncSession, org_id: uuid.UUID) -> list[Invoice]:
    result = await db.execute(
        select(Invoice).where(Invoice.org_id == org_id).order_by(Invoice.created_at.desc())
    )
    return list(result.scalars().all())


async def seed_default_plans(db: AsyncSession) -> None:
    """Create default plans if none exist. Deduplicates on name (keeps earliest)."""
    from sqlalchemy import func, delete as sa_delete, text

    # ── Step 1: remove duplicates — keep only the earliest plan per name ──
    try:
        # Use a raw SQL subquery that works reliably with UUIDs
        dupes_query = text("""
            DELETE FROM plans
            WHERE id NOT IN (
                SELECT DISTINCT ON (name) id
                FROM plans
                ORDER BY name, created_at ASC NULLS LAST, id ASC
            )
        """)
        await db.execute(dupes_query)
        await db.flush()
    except Exception:
        pass  # table might not exist on first run

    # ── Step 2: upsert default plans ──
    defaults = [
        {"name": "Free", "stripe_price_id": "free", "price_monthly": 0,
         "max_students": 10, "max_courses": 3,
         "features": {"sandbox": True, "analytics": False, "certificates": False, "ai_hints": False}},
        {"name": "Starter", "stripe_price_id": "price_starter", "price_monthly": 29,
         "max_students": 50, "max_courses": 10,
         "features": {"sandbox": True, "analytics": True, "certificates": True, "ai_hints": False}},
        {"name": "Professional", "stripe_price_id": "price_pro", "price_monthly": 79,
         "max_students": 200, "max_courses": -1,
         "features": {"sandbox": True, "analytics": True, "certificates": True, "ai_hints": True}},
        {"name": "Enterprise", "stripe_price_id": "price_enterprise", "price_monthly": 199,
         "max_students": -1, "max_courses": -1,
         "features": {"sandbox": True, "analytics": True, "certificates": True, "ai_hints": True, "white_label": True, "custom_domain": True}},
    ]

    result = await db.execute(select(Plan))
    existing = {p.name: p for p in result.scalars().all()}

    for d in defaults:
        if d["name"] not in existing:
            db.add(Plan(**d, is_active=True))

    await db.flush()

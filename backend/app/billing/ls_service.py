"""Lemon Squeezy service layer — checkout creation and webhook event handlers.

This module bridges the transport layer (``lemonsqueezy.py`` — raw HTTP +
signature verification) with our database. Everything DB-touching for LS
lives here so the transport module stays unit-testable without a session.

Webhook handling is idempotent by design: re-delivering the same event
results in the same DB state. Postgres unique indexes on
``ls_subscription_id`` and ``ls_invoice_id`` guard against duplicates even
if two requests race.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import Organization, User
from app.billing import lemonsqueezy as ls
from app.billing.models import (
    BillingProvider,
    Invoice,
    InvoiceStatus,
    Plan,
    Subscription,
    SubscriptionStatus,
)
from app.config import settings

logger = logging.getLogger(__name__)


# ---------- Variant ID ↔ Plan name mapping ----------
#
# Variant IDs are injected via env vars; this mapping is how we resolve
# "which tier did the customer buy" from the LS event payload. Keep the
# name keys in sync with rows in the `plans` table so we can join them.

def variant_map() -> dict[str, tuple[str, str]]:
    """Return {variant_id: (plan_name, interval)} for currently-configured variants."""
    m: dict[str, tuple[str, str]] = {}
    table = [
        (settings.lemonsqueezy_starter_monthly_variant_id, "Starter", "month"),
        (settings.lemonsqueezy_starter_yearly_variant_id, "Starter", "year"),
        (settings.lemonsqueezy_professional_monthly_variant_id, "Professional", "month"),
        (settings.lemonsqueezy_professional_yearly_variant_id, "Professional", "year"),
        (settings.lemonsqueezy_enterprise_monthly_variant_id, "Enterprise", "month"),
        (settings.lemonsqueezy_enterprise_yearly_variant_id, "Enterprise", "year"),
    ]
    for variant_id, plan_name, interval in table:
        if variant_id:
            m[str(variant_id)] = (plan_name, interval)
    return m


async def resolve_plan_by_variant(db: AsyncSession, variant_id: str) -> Plan | None:
    """Map an LS variant_id back to our Plan row by name."""
    mapping = variant_map()
    pair = mapping.get(str(variant_id))
    if not pair:
        return None
    plan_name, _interval = pair
    result = await db.execute(select(Plan).where(Plan.name == plan_name))
    return result.scalar_one_or_none()


# ---------- Checkout ----------


async def create_checkout_url(
    db: AsyncSession,
    plan_id: uuid.UUID,
    user: User,
    *,
    interval: str = "month",
    success_url: str,
) -> str:
    """Build an LS hosted-checkout URL for a given plan + interval."""
    plan = (await db.execute(select(Plan).where(Plan.id == plan_id))).scalar_one_or_none()
    if not plan:
        raise ValueError("Plan not found")

    # pick the configured variant ID for this plan + interval
    variant_id = _variant_for(plan.name, interval)
    if not variant_id:
        raise ValueError(
            f"No Lemon Squeezy variant configured for {plan.name} / {interval}. "
            "Set the LEMONSQUEEZY_*_VARIANT_ID env var."
        )

    org = (
        await db.execute(select(Organization).where(Organization.id == user.org_id))
    ).scalar_one_or_none()

    return await ls.create_checkout(
        variant_id=variant_id,
        org_id=str(user.org_id),
        org_name=org.name if org else user.full_name,
        customer_email=user.email,
        success_url=success_url,
    )


def _variant_for(plan_name: str, interval: str) -> str | None:
    key = (plan_name.lower(), interval.lower())
    table = {
        ("starter", "month"): settings.lemonsqueezy_starter_monthly_variant_id,
        ("starter", "year"): settings.lemonsqueezy_starter_yearly_variant_id,
        ("professional", "month"): settings.lemonsqueezy_professional_monthly_variant_id,
        ("professional", "year"): settings.lemonsqueezy_professional_yearly_variant_id,
        ("enterprise", "month"): settings.lemonsqueezy_enterprise_monthly_variant_id,
        ("enterprise", "year"): settings.lemonsqueezy_enterprise_yearly_variant_id,
    }
    return table.get(key) or None


# ---------- Webhook event dispatch ----------


async def handle_event(db: AsyncSession, event: dict) -> None:
    """Top-level event dispatcher. Routes by ``meta.event_name``.

    Unrecognised events log a warning and return — we never 500 on webhook
    delivery, because that triggers LS retries and 1000 retries of a buggy
    handler hurts more than a missed event.
    """
    name = ls.event_name(event)
    if name not in ls.SUPPORTED_EVENTS:
        logger.info("ls.webhook.unsupported event=%s", name)
        return

    handlers = {
        "subscription_created": _on_sub_created,
        "subscription_updated": _on_sub_updated,
        "subscription_cancelled": _on_sub_cancelled,
        "subscription_resumed": _on_sub_updated,
        "subscription_expired": _on_sub_expired,
        "subscription_paused": _on_sub_updated,
        "subscription_unpaused": _on_sub_updated,
        "subscription_payment_success": _on_payment_success,
        "subscription_payment_failed": _on_payment_failed,
        "subscription_payment_recovered": _on_payment_success,
        "order_created": _on_order_created,
    }
    handler = handlers.get(name)
    if handler:
        try:
            await handler(db, event)
        except Exception:
            # Log and swallow — keep the webhook 200 so LS doesn't retry
            # forever. Any failed state is recoverable from the next event
            # (LS keeps sending subscription_updated on state changes).
            logger.exception("ls.webhook.handler_error event=%s", name)


# ---------- individual handlers ----------


async def _on_sub_created(db: AsyncSession, event: dict) -> None:
    attrs = event["data"]["attributes"]
    ls_sub_id = str(event["data"]["id"])
    org_id = ls.extract_org_id(event)
    if not org_id:
        logger.warning("ls.webhook.no_org_id event=subscription_created ls_sub=%s", ls_sub_id)
        return

    variant_id = str(attrs.get("variant_id") or "")
    plan = await resolve_plan_by_variant(db, variant_id)
    if not plan:
        logger.warning(
            "ls.webhook.unknown_variant variant=%s — is LEMONSQUEEZY_*_VARIANT_ID set?",
            variant_id,
        )
        return

    # idempotency: if row for this LS sub already exists, update instead of insert
    existing = (
        await db.execute(
            select(Subscription).where(Subscription.ls_subscription_id == ls_sub_id)
        )
    ).scalar_one_or_none()

    if existing:
        existing.status = _status_from_ls(attrs.get("status"))
        existing.current_period_end = _parse_dt(attrs.get("renews_at")) or existing.current_period_end
        await db.flush()
        return

    sub = Subscription(
        org_id=uuid.UUID(org_id),
        plan_id=plan.id,
        provider=BillingProvider.lemonsqueezy.value,
        ls_subscription_id=ls_sub_id,
        ls_variant_id=variant_id,
        ls_customer_id=str(attrs.get("customer_id") or ""),
        status=_status_from_ls(attrs.get("status")),
        current_period_start=_parse_dt(attrs.get("created_at")) or datetime.now(timezone.utc),
        current_period_end=_parse_dt(attrs.get("renews_at")) or datetime.now(timezone.utc),
    )
    db.add(sub)
    await db.flush()


async def _on_sub_updated(db: AsyncSession, event: dict) -> None:
    attrs = event["data"]["attributes"]
    ls_sub_id = str(event["data"]["id"])
    sub = (
        await db.execute(
            select(Subscription).where(Subscription.ls_subscription_id == ls_sub_id)
        )
    ).scalar_one_or_none()
    if not sub:
        # LS sent an update before we saw the create event — treat as create
        await _on_sub_created(db, event)
        return

    sub.status = _status_from_ls(attrs.get("status"))
    sub.current_period_end = _parse_dt(attrs.get("renews_at")) or sub.current_period_end
    if attrs.get("ends_at"):
        sub.canceled_at = _parse_dt(attrs.get("ends_at"))
    await db.flush()


async def _on_sub_cancelled(db: AsyncSession, event: dict) -> None:
    attrs = event["data"]["attributes"]
    ls_sub_id = str(event["data"]["id"])
    sub = (
        await db.execute(
            select(Subscription).where(Subscription.ls_subscription_id == ls_sub_id)
        )
    ).scalar_one_or_none()
    if not sub:
        return
    sub.status = SubscriptionStatus.canceled
    sub.canceled_at = _parse_dt(attrs.get("ends_at")) or datetime.now(timezone.utc)
    await db.flush()


async def _on_sub_expired(db: AsyncSession, event: dict) -> None:
    ls_sub_id = str(event["data"]["id"])
    sub = (
        await db.execute(
            select(Subscription).where(Subscription.ls_subscription_id == ls_sub_id)
        )
    ).scalar_one_or_none()
    if not sub:
        return
    sub.status = SubscriptionStatus.canceled
    if not sub.canceled_at:
        sub.canceled_at = datetime.now(timezone.utc)
    await db.flush()


async def _on_payment_success(db: AsyncSession, event: dict) -> None:
    attrs = event["data"]["attributes"]
    invoice_id = str(event["data"]["id"])
    org_id = ls.extract_org_id(event)
    if not org_id:
        return
    # LS sends amount in cents already
    amount_cents = int(attrs.get("total") or attrs.get("total_usd") or 0)

    existing = (
        await db.execute(select(Invoice).where(Invoice.ls_invoice_id == invoice_id))
    ).scalar_one_or_none()
    if existing:
        existing.status = InvoiceStatus.paid
        await db.flush()
        return

    now = datetime.now(timezone.utc)
    inv = Invoice(
        org_id=uuid.UUID(org_id),
        provider=BillingProvider.lemonsqueezy.value,
        ls_invoice_id=invoice_id,
        amount_cents=amount_cents,
        status=InvoiceStatus.paid,
        invoice_url=attrs.get("urls", {}).get("invoice_url") if isinstance(attrs.get("urls"), dict) else None,
        period_start=_parse_dt(attrs.get("created_at")) or now,
        period_end=_parse_dt(attrs.get("billing_reason_at") or attrs.get("created_at")) or now,
        created_at=now,
    )
    db.add(inv)
    await db.flush()


async def _on_payment_failed(db: AsyncSession, event: dict) -> None:
    ls_sub_id = str(
        event.get("data", {}).get("attributes", {}).get("subscription_id") or ""
    )
    if not ls_sub_id:
        return
    sub = (
        await db.execute(
            select(Subscription).where(Subscription.ls_subscription_id == ls_sub_id)
        )
    ).scalar_one_or_none()
    if sub:
        sub.status = SubscriptionStatus.past_due
        await db.flush()


async def _on_order_created(db: AsyncSession, event: dict) -> None:
    # Orders are fired for one-time + subscription purchases. For
    # subscriptions we rely on subscription_created; orders are logged
    # only. If you ever sell one-time products (course packs, etc.), add
    # Invoice row creation here.
    logger.info("ls.webhook.order_created id=%s", event.get("data", {}).get("id"))


# ---------- helpers ----------


_STATUS_MAP = {
    "on_trial": SubscriptionStatus.trialing,
    "active": SubscriptionStatus.active,
    "paused": SubscriptionStatus.active,  # still entitled
    "past_due": SubscriptionStatus.past_due,
    "unpaid": SubscriptionStatus.past_due,
    "cancelled": SubscriptionStatus.canceled,
    "expired": SubscriptionStatus.canceled,
}


def _status_from_ls(status: str | None) -> SubscriptionStatus:
    if not status:
        return SubscriptionStatus.active
    return _STATUS_MAP.get(str(status).lower(), SubscriptionStatus.active)


def _parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        # LS uses ISO-8601 with a 'Z' suffix; Python's fromisoformat handles
        # that only in 3.11+. Defensive replace keeps us portable.
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return None

"""Service layer for donations.

Wraps the Open Collective GraphQL API and handles webhook validation.
The service is intentionally thin: it builds the createOrder mutation
variables, dispatches it via httpx.AsyncClient, and returns the OC
order URL. Webhook handling verifies HMAC before mutating any row.
"""
import hashlib
import hmac
import logging
from datetime import datetime, timezone
from typing import Any

import httpx
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.donations.config import DonationsSettings
from app.donations.models import Donation, DonationStatus, Recurrence

logger = logging.getLogger(__name__)


CREATE_ORDER_MUTATION = """
mutation CreateGuestOrder($order: OrderCreateInput!) {
  createOrder(order: $order) {
    order {
      id
      legacyId
      status
      paymentMethod { service type }
    }
    stripeError { message }
  }
}
"""


class OCClientError(RuntimeError):
    """Raised when the OC API rejects the request or is unreachable."""


def _frequency(recurrence: Recurrence) -> str:
    return "MONTHLY" if recurrence == Recurrence.monthly else "ONETIME"


async def create_oc_order(
    cfg: DonationsSettings,
    *,
    donation: Donation,
    success_url: str,
) -> str:
    """Call OC createOrder and return the checkout URL."""
    if not cfg.enabled:
        raise OCClientError("OC integration is not configured")

    guest_info = None if donation.anonymous or not donation.donor_email else {
        "email": donation.donor_email,
        "name": donation.donor_name,
    }
    variables = {
        "order": {
            "amount": {"valueInCents": donation.amount_cents, "currency": donation.currency},
            "frequency": _frequency(donation.recurrence),
            "toAccount": {"slug": cfg.collective_slug},
            "fromAccount": None,
            "guestInfo": guest_info,
            "isGuestContribution": True,
            "context": {"successUrl": f"{success_url}?d={donation.id}"},
            "customData": {"lmsDonationId": str(donation.id)},
        }
    }

    headers = {"Personal-Token": cfg.api_token, "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=httpx.Timeout(15.0)) as client:
        try:
            resp = await client.post(
                cfg.graphql_url,
                headers=headers,
                json={"query": CREATE_ORDER_MUTATION, "variables": variables},
            )
        except httpx.HTTPError as e:
            logger.warning("OC API unreachable: %s", e)
            raise OCClientError("OC API unreachable") from e

    if resp.status_code >= 500:
        raise OCClientError(f"OC API server error: {resp.status_code}")
    data = resp.json()
    if "errors" in data:
        message = data["errors"][0].get("message", "unknown OC error")
        raise OCClientError(message)

    order = data.get("data", {}).get("createOrder", {}).get("order")
    if not order:
        raise OCClientError("OC createOrder returned no order")

    legacy_id = order.get("legacyId")
    donation.oc_order_id = str(legacy_id) if legacy_id is not None else order["id"]
    return f"https://opencollective.com/{cfg.collective_slug}/orders/{donation.oc_order_id}/checkout"


def verify_webhook_signature(secret: str, raw_body: bytes, signature: str | None) -> bool:
    """HMAC-SHA256 verification with constant-time compare."""
    if not signature or not secret:
        return False
    expected = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature.strip())


async def apply_webhook_update(
    session: AsyncSession,
    *,
    payload: dict[str, Any],
) -> Donation | None:
    """Update a donation row from an OC webhook payload.

    Idempotent: if the donation is already confirmed, no-op. If the order
    id is unknown, log and return None (still ack with 200 to OC).
    """
    order = payload.get("data", {}).get("order") or payload.get("order") or {}
    oc_order_id = str(order.get("legacyId") or order.get("id") or "").strip()
    if not oc_order_id:
        logger.info("webhook with no order id: %s", payload.get("activity"))
        return None

    stmt = select(Donation).where(Donation.oc_order_id == oc_order_id)
    donation = (await session.execute(stmt)).scalar_one_or_none()
    if not donation:
        logger.info("webhook for unknown OC order %s — ignored", oc_order_id)
        return None

    if donation.status == DonationStatus.confirmed:
        return donation  # idempotent

    status_str = str(order.get("status", "")).lower()
    if status_str in ("paid", "active", "processed"):
        donation.status = DonationStatus.confirmed
        donation.confirmed_at = datetime.now(timezone.utc)
    elif status_str in ("rejected", "error", "expired"):
        donation.status = DonationStatus.failed
    donation.raw_webhook = payload
    await session.flush()
    return donation


async def aggregate_stats(session: AsyncSession) -> tuple[float, int]:
    """Return (total_confirmed_usd, donor_count)."""
    stmt = select(
        func.coalesce(func.sum(Donation.amount_cents), 0),
        func.count(Donation.id),
    ).where(Donation.status == DonationStatus.confirmed)
    total_cents, count = (await session.execute(stmt)).one()
    return float(total_cents) / 100.0, int(count)

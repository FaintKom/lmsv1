"""Lemon Squeezy integration — HTTP client + webhook signature verification.

Lemon Squeezy is a Merchant of Record (MoR) alternative to Stripe: they handle
VAT/sales tax worldwide, charge 5% + $0.50 per transaction, and pay us out
after conversion. Useful for international B2B SaaS where handling tax alone
would be weeks of work.

Design notes
------------
- All calls use the JSON:API content type (``application/vnd.api+json``) —
  Lemon Squeezy rejects regular ``application/json``.
- Webhook signatures are HMAC-SHA256 over the raw request body with the secret
  configured when the webhook was created. The header is ``X-Signature``.
- Store/product/variant IDs are *strings* in the API (even though they look
  numeric). Always pass them as strings.
- Custom metadata on checkouts rides under ``checkout_data.custom`` — LS
  echoes that back on subscription events so we can resolve ``org_id`` on
  webhook delivery.
- This module is **transport-only**. It does not touch the database; callers
  in ``service.py`` and ``router.py`` do that.
"""

from __future__ import annotations

import hashlib
import hmac
import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

API_BASE = "https://api.lemonsqueezy.com/v1"
DEFAULT_TIMEOUT = 15.0

# Events we subscribe to. Every other event type is ignored on our side even
# if LS is configured to send it, so ticking extra boxes in the LS UI is safe.
SUPPORTED_EVENTS = {
    "order_created",
    "subscription_created",
    "subscription_updated",
    "subscription_cancelled",
    "subscription_resumed",
    "subscription_expired",
    "subscription_paused",
    "subscription_unpaused",
    "subscription_payment_success",
    "subscription_payment_failed",
    "subscription_payment_recovered",
}


class LemonSqueezyError(Exception):
    """Raised when an LS API call returns a non-2xx response."""

    def __init__(self, status_code: int, body: str):
        self.status_code = status_code
        self.body = body
        super().__init__(f"Lemon Squeezy API {status_code}: {body[:500]}")


def is_enabled() -> bool:
    """True when both an API key and a store ID are configured."""
    return bool(settings.lemonsqueezy_api_key and settings.lemonsqueezy_store_id)


def _headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {settings.lemonsqueezy_api_key}",
        "Accept": "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
    }


async def _request(method: str, path: str, json: dict | None = None) -> dict:
    """Execute an LS API request and return the parsed body.

    Raises ``LemonSqueezyError`` on any non-2xx status. 204 (no content) is
    returned as an empty dict so callers never have to guard against JSON
    parsing on deletes.
    """
    if not is_enabled():
        raise LemonSqueezyError(503, "Lemon Squeezy is not configured")

    url = f"{API_BASE}{path}"
    async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as client:
        resp = await client.request(method, url, headers=_headers(), json=json)

    if resp.status_code == 204:
        return {}
    if not resp.is_success:
        raise LemonSqueezyError(resp.status_code, resp.text)
    return resp.json()


# ---------- Signature verification ----------


def verify_webhook_signature(payload: bytes, signature: str, secret: str | None = None) -> bool:
    """Verify the ``X-Signature`` header of an incoming webhook.

    LS computes ``hmac-sha256(body, webhook_secret)`` and sends the hex digest.
    We use ``hmac.compare_digest`` to avoid timing attacks. Returns False for
    missing or malformed input rather than raising — the caller decides the
    HTTP response.
    """
    effective_secret = secret if secret is not None else settings.lemonsqueezy_webhook_secret
    if not effective_secret or not signature:
        return False
    try:
        expected = hmac.new(
            effective_secret.encode("utf-8"),
            payload,
            hashlib.sha256,
        ).hexdigest()
    except Exception:
        return False
    return hmac.compare_digest(expected, signature.lower().strip())


# ---------- Checkout ----------


async def create_checkout(
    variant_id: str,
    *,
    org_id: str,
    org_name: str,
    customer_email: str,
    success_url: str,
    embed: bool = False,
) -> str:
    """Create a hosted checkout URL for a given subscription variant.

    The ``custom`` metadata ({"org_id": ...}) is echoed back by LS on every
    subscription event, which is how we resolve the tenant on webhook
    delivery — LS has no notion of our organisations.

    Returns the ``checkout_url`` string that the frontend should redirect to.
    """
    store_id = str(settings.lemonsqueezy_store_id)
    body = {
        "data": {
            "type": "checkouts",
            "attributes": {
                "checkout_data": {
                    "email": customer_email,
                    "name": org_name,
                    "custom": {"org_id": org_id},
                },
                "product_options": {
                    "redirect_url": success_url,
                },
                "checkout_options": {
                    "embed": embed,
                    "button_color": "#22c55e",
                },
            },
            "relationships": {
                "store": {"data": {"type": "stores", "id": store_id}},
                "variant": {"data": {"type": "variants", "id": str(variant_id)}},
            },
        }
    }
    data = await _request("POST", "/checkouts", json=body)
    return data["data"]["attributes"]["url"]


# ---------- Read helpers (not required by webhooks, used by admin UI + tests) ----------


async def get_store() -> dict:
    """Return the store record. Used on /billing/status for sanity-check UI."""
    store_id = str(settings.lemonsqueezy_store_id)
    data = await _request("GET", f"/stores/{store_id}")
    return data["data"]


async def list_products() -> list[dict]:
    data = await _request("GET", f"/stores/{settings.lemonsqueezy_store_id}/products")
    return data.get("data", [])


async def get_subscription(ls_subscription_id: str) -> dict:
    data = await _request("GET", f"/subscriptions/{ls_subscription_id}")
    return data["data"]


async def cancel_subscription(ls_subscription_id: str) -> dict:
    """Cancel at period end. LS returns the updated subscription record."""
    data = await _request("DELETE", f"/subscriptions/{ls_subscription_id}")
    return data.get("data", {})


# ---------- Webhook event extraction ----------


def extract_org_id(event: dict) -> str | None:
    """Pull ``org_id`` out of the ``custom_data`` echoed back on a subscription event.

    LS nests it under ``meta.custom_data.org_id`` for subscription events and
    under ``data.attributes.first_order_item.variant_id`` style paths for
    order events — we only rely on the first. Returns None if absent so the
    caller can log and 200-OK (LS retries 4xx, so we prefer to swallow).
    """
    try:
        return event["meta"]["custom_data"]["org_id"]
    except (KeyError, TypeError):
        return None


def event_name(event: dict) -> str:
    """Get the event name from meta.event_name (LS convention)."""
    try:
        return str(event["meta"]["event_name"])
    except (KeyError, TypeError):
        return ""

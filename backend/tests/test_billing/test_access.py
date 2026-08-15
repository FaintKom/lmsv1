"""Who may read billing, and who may write to it.

These endpoints were previously exercised by three tests in test_misc.py that
asserted almost nothing:

  - ``test_student_cannot_access_billing`` accepted ``200 or 403`` while
    calling ``/billing/plans``, which is deliberately public and answers 200
    to everyone. The name claimed a rule the test never checked.
  - ``test_get_subscription`` accepted ``200 or 404``.
  - ``test_list_invoices`` checked only that the status was 200, never whose
    invoices came back.

Money, and the webhook that moves it, are the two places where a test that
passes either way is worse than no test, because it reads as coverage.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from unittest.mock import patch

import pytest
from httpx import AsyncClient

from tests.conftest import auth_header


async def _make_invoice(db, org_id: uuid.UUID, *, amount_cents: int, marker: str):
    from app.billing.models import Invoice, InvoiceStatus

    inv = Invoice(
        org_id=org_id,
        stripe_invoice_id=f"in_test_{marker}",
        amount_cents=amount_cents,
        status=InvoiceStatus.paid,
        invoice_url=f"https://billing.example/{marker}",
        period_start=datetime(2026, 1, 1, tzinfo=timezone.utc),
        period_end=datetime(2026, 2, 1, tzinfo=timezone.utc),
        # Invoice carries IDMixin but not TimestampMixin, so created_at is
        # NOT NULL with no default — every caller sets it, including the
        # webhook handler that writes the real rows.
        created_at=datetime(2026, 2, 1, tzinfo=timezone.utc),
    )
    db.add(inv)
    await db.flush()
    return inv


# ── Reading ──────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_plans_are_public_on_purpose(client: AsyncClient):
    """The pricing page is public, so this endpoint has no auth by design.

    Pinned deliberately: someone tightening "the billing endpoints" would
    break /pricing for logged-out visitors, and the old test's name suggested
    the opposite rule was in force.
    """
    resp = await client.get("/api/v1/billing/plans")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_plans_never_expose_the_stripe_price_id(client: AsyncClient, db):
    """A public endpoint must not hand out internal price identifiers."""
    from app.billing.models import Plan

    db.add(
        Plan(
            name=f"Test Plan {uuid.uuid4().hex[:6]}",
            stripe_price_id="price_secret_do_not_leak",
            price_monthly=29,
            max_students=50,
            max_courses=10,
            features={},
        )
    )
    await db.flush()

    resp = await client.get("/api/v1/billing/plans")
    assert resp.status_code == 200
    assert "price_secret_do_not_leak" not in resp.text


@pytest.mark.asyncio
async def test_teacher_cannot_read_the_schools_subscription(client: AsyncClient, teacher):
    resp = await client.get("/api/v1/billing/subscription", headers=auth_header(teacher))
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_teacher_cannot_read_invoices(client: AsyncClient, teacher):
    resp = await client.get("/api/v1/billing/invoices", headers=auth_header(teacher))
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_student_cannot_read_invoices(client: AsyncClient, student):
    resp = await client.get("/api/v1/billing/invoices", headers=auth_header(student))
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_admin_sees_only_their_own_schools_invoices(
    client: AsyncClient, db, admin, org, org2
):
    """Two schools, one invoice each. Neither may see the other's."""
    await _make_invoice(db, org.id, amount_cents=1000, marker="ours")
    await _make_invoice(db, org2.id, amount_cents=9999, marker="theirs")

    resp = await client.get("/api/v1/billing/invoices", headers=auth_header(admin))
    assert resp.status_code == 200

    body = resp.text
    assert "in_test_ours" in body
    assert "in_test_theirs" not in body


# ── Writing: the webhook ─────────────────────────────────────────────────
#
# An unauthenticated endpoint that writes subscription state. The Lemon
# Squeezy half has thorough unit tests for signature verification
# (test_lemonsqueezy.py); this is the Stripe half, at the HTTP layer.


@pytest.mark.asyncio
async def test_webhook_rejects_a_call_with_no_signature(client: AsyncClient):
    with patch("app.billing.router.settings.stripe_webhook_secret", "whsec_test"):
        resp = await client.post(
            "/api/v1/billing/webhook",
            json={"type": "invoice.paid", "data": {"object": {}}},
        )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_webhook_rejects_a_bad_signature(client: AsyncClient):
    with patch("app.billing.router.settings.stripe_webhook_secret", "whsec_test"):
        resp = await client.post(
            "/api/v1/billing/webhook",
            json={"type": "invoice.paid", "data": {"object": {}}},
            headers={"stripe-signature": "t=1,v1=deadbeef"},
        )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_webhook_refuses_to_run_unsigned_in_production(client: AsyncClient):
    """Failing closed is the whole point: no secret in production means the
    endpoint refuses rather than trusting whatever arrives."""
    from app.config import Settings

    # is_production is a method on the Settings class, not a pydantic field,
    # so it has to be patched on the class — the instance refuses the
    # attribute. The secret above is a real field and patches normally.
    with patch("app.billing.router.settings.stripe_webhook_secret", ""):
        with patch.object(Settings, "is_production", lambda self: True):
            resp = await client.post(
                "/api/v1/billing/webhook",
                json={"type": "invoice.paid", "data": {"object": {}}},
            )
    assert resp.status_code == 503


# ── Checkout ─────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_checkout_ignores_a_caller_supplied_return_url(client: AsyncClient, admin):
    """The redirect target is built by the server.

    The body used to carry success_url/cancel_url straight through to Stripe.
    Extra keys are ignored now, so a crafted call cannot aim the payer
    anywhere. The key is blanked rather than trusted to be unset, so the
    request stops at the "not configured" check instead of reaching out to
    Stripe from a test run — and the assertion is that the supplied address
    appears nowhere.
    """
    with patch("app.billing.router.settings.stripe_secret_key", ""):
        resp = await client.post(
            "/api/v1/billing/checkout",
            json={
                "plan_id": str(uuid.uuid4()),
                "success_url": "https://evil.example/pay",
                "cancel_url": "https://evil.example/cancel",
            },
            headers=auth_header(admin),
        )
    assert resp.status_code == 400
    assert "evil.example" not in resp.text


@pytest.mark.asyncio
async def test_teacher_cannot_start_a_checkout(client: AsyncClient, teacher):
    resp = await client.post(
        "/api/v1/billing/checkout",
        json={"plan_id": str(uuid.uuid4())},
        headers=auth_header(teacher),
    )
    assert resp.status_code == 403

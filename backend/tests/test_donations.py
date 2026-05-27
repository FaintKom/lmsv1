"""Donations module tests — covers /initiate, /webhook, /stats."""
import hashlib
import hmac
import json
from unittest.mock import AsyncMock, patch

from httpx import AsyncClient

from app.donations.models import Donation, DonationStatus


def _sign(secret: str, body: bytes) -> str:
    return hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()


async def test_initiate_happy_path(client: AsyncClient, db, monkeypatch):
    """POST /initiate returns donation id + OC checkout URL when service is configured."""
    monkeypatch.setattr("app.donations.config.settings.oc_api_token", "fake")
    monkeypatch.setattr("app.donations.config.settings.oc_collective_slug", "grasslms")

    async def fake_create(cfg, donation, success_url):
        donation.oc_order_id = "12345"
        return "https://opencollective.com/grasslms/orders/12345/checkout"

    with patch("app.donations.router.create_oc_order", new=AsyncMock(side_effect=fake_create)):
        resp = await client.post(
            "/api/v1/donations/initiate",
            json={"amount_cents": 500, "recurrence": "one_time", "anonymous": True},
        )

    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "donation_id" in data
    assert data["oc_checkout_url"].endswith("/checkout")


async def test_initiate_rate_limit_returns_429(client: AsyncClient, monkeypatch):
    """11th call within a minute triggers slowapi 429."""
    monkeypatch.setattr("app.donations.config.settings.oc_api_token", "fake")

    async def fake_create(cfg, donation, success_url):
        donation.oc_order_id = "x"
        return "https://example.com/checkout"

    with patch("app.donations.router.create_oc_order", new=AsyncMock(side_effect=fake_create)):
        for _ in range(10):
            r = await client.post(
                "/api/v1/donations/initiate",
                json={"amount_cents": 500, "recurrence": "one_time", "anonymous": True},
            )
            assert r.status_code == 200

        r = await client.post(
            "/api/v1/donations/initiate",
            json={"amount_cents": 500, "recurrence": "one_time", "anonymous": True},
        )
    assert r.status_code == 429


async def test_webhook_valid_hmac_marks_confirmed(client: AsyncClient, db, monkeypatch):
    """Webhook with correct HMAC flips a pending donation to confirmed."""
    monkeypatch.setattr("app.donations.config.settings.oc_webhook_secret", "shh")

    donation = Donation(
        amount_cents=500,
        currency="USD",
        oc_order_id="999",
        status=DonationStatus.pending,
    )
    db.add(donation)
    await db.flush()

    payload = {"data": {"order": {"legacyId": 999, "status": "paid"}}}
    body = json.dumps(payload).encode()
    sig = _sign("shh", body)

    resp = await client.post(
        "/api/v1/donations/webhook",
        content=body,
        headers={"Content-Type": "application/json", "x-oc-signature": sig},
    )
    assert resp.status_code == 200

    await db.refresh(donation)
    assert donation.status == DonationStatus.confirmed
    assert donation.confirmed_at is not None


async def test_webhook_invalid_hmac_rejected(client: AsyncClient, db, monkeypatch):
    """Webhook with bad HMAC returns 401 and does not mutate."""
    monkeypatch.setattr("app.donations.config.settings.oc_webhook_secret", "shh")
    donation = Donation(amount_cents=500, currency="USD", oc_order_id="999", status=DonationStatus.pending)
    db.add(donation)
    await db.flush()

    payload = {"data": {"order": {"legacyId": 999, "status": "paid"}}}
    resp = await client.post(
        "/api/v1/donations/webhook",
        content=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json", "x-oc-signature": "deadbeef"},
    )
    assert resp.status_code == 401

    await db.refresh(donation)
    assert donation.status == DonationStatus.pending


async def test_webhook_idempotent_on_already_confirmed(client: AsyncClient, db, monkeypatch):
    """Re-delivering the same paid event leaves status as confirmed."""
    monkeypatch.setattr("app.donations.config.settings.oc_webhook_secret", "shh")
    from datetime import datetime, timezone

    fixed_time = datetime(2026, 1, 1, tzinfo=timezone.utc)
    donation = Donation(
        amount_cents=500,
        currency="USD",
        oc_order_id="999",
        status=DonationStatus.confirmed,
        confirmed_at=fixed_time,
    )
    db.add(donation)
    await db.flush()

    payload = {"data": {"order": {"legacyId": 999, "status": "paid"}}}
    body = json.dumps(payload).encode()
    sig = _sign("shh", body)

    resp = await client.post(
        "/api/v1/donations/webhook",
        content=body,
        headers={"Content-Type": "application/json", "x-oc-signature": sig},
    )
    assert resp.status_code == 200

    await db.refresh(donation)
    assert donation.status == DonationStatus.confirmed
    assert donation.confirmed_at == fixed_time  # unchanged


async def test_stats_aggregates_confirmed_only(client: AsyncClient, db):
    db.add(Donation(amount_cents=1000, currency="USD", status=DonationStatus.confirmed))
    db.add(Donation(amount_cents=500, currency="USD", status=DonationStatus.confirmed))
    db.add(Donation(amount_cents=2500, currency="USD", status=DonationStatus.pending))  # excluded
    await db.flush()

    resp = await client.get("/api/v1/donations/stats")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total_confirmed_usd"] == 15.0  # 1500 cents
    assert body["donor_count"] == 2

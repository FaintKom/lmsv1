"""Waitlist signup notification.

The notify branch is the interesting part: it must fire for a genuinely new
email, stay silent on a duplicate (so a repeat submit can't be used to spam
the operator's inbox), and stay silent when no notify address is configured.
"""
import pytest
from httpx import AsyncClient

from app.config import settings


@pytest.fixture
def notify_to(monkeypatch):
    monkeypatch.setattr(settings, "waitlist_notify_email", "owner@example.com")
    return "owner@example.com"


@pytest.fixture
def sent(monkeypatch):
    """Capture queue_email calls instead of touching SMTP."""
    calls: list[tuple] = []
    monkeypatch.setattr(
        "app.waitlist.router.queue_email",
        lambda func, *args, **kwargs: calls.append(args),
    )
    return calls


async def test_new_signup_notifies_operator(client: AsyncClient, notify_to, sent):
    resp = await client.post(
        "/api/v1/waitlist",
        json={"email": "New.Person@example.com", "role": "teacher", "source": "landing"},
    )
    assert resp.status_code == 200

    assert len(sent) == 1
    to_email, signup_email, role, source, total = sent[0]
    assert to_email == notify_to
    assert signup_email == "new.person@example.com"  # normalized
    assert role == "teacher"
    assert source == "landing"
    # Running total, not a per-test count — the dev DB may already hold rows.
    assert total >= 1


async def test_duplicate_signup_does_not_notify(client: AsyncClient, notify_to, sent):
    payload = {"email": "dup@example.com", "source": "landing"}
    assert (await client.post("/api/v1/waitlist", json=payload)).status_code == 200
    assert (await client.post("/api/v1/waitlist", json=payload)).status_code == 200
    assert len(sent) == 1


async def test_no_notify_address_means_no_email(client: AsyncClient, monkeypatch, sent):
    monkeypatch.setattr(settings, "waitlist_notify_email", "")
    resp = await client.post("/api/v1/waitlist", json={"email": "quiet@example.com"})
    assert resp.status_code == 200
    assert sent == []

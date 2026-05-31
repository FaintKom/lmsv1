"""Tests for the age gate + verifiable parental consent flow.

Covers:
  - minor registration creates a pending (inactive) account + a consent token,
    and queues a parent email (no session tokens returned);
  - the confirm endpoint records consent, links the parent, and activates the
    student so they can then log in;
  - adult / unknown-age registration is unaffected (legacy self-attestation);
  - existing users with NULL date_of_birth still log in;
  - expired / invalid / reused consent tokens are rejected;
  - the compute_age helper.
"""
import uuid
from datetime import date, datetime, timedelta, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.auth.models import ParentChild, ParentConsentToken, User, compute_age


def _minor_dob() -> str:
    """ISO DOB for a 10-year-old — comfortably below any consent age."""
    return (date.today() - timedelta(days=365 * 10 + 3)).isoformat()


def _adult_dob() -> str:
    """ISO DOB for a 30-year-old — comfortably above any consent age."""
    return (date.today() - timedelta(days=365 * 30 + 7)).isoformat()


# ─── compute_age helper ───────────────────────────────────────────────────


def test_compute_age_none_is_unknown():
    assert compute_age(None) is None


def test_compute_age_basic():
    on = date(2026, 5, 31)
    assert compute_age(date(2010, 5, 31), on=on) == 16
    assert compute_age(date(2010, 6, 1), on=on) == 15  # birthday not yet reached
    assert compute_age(date(2010, 5, 30), on=on) == 16


# ─── Minor registration ────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_minor_registration_is_pending(client: AsyncClient, db, org):
    """A minor student gets a consent-pending, inactive account + a token."""
    email = f"minor-{uuid.uuid4().hex[:6]}@test.com"
    parent_email = f"parent-{uuid.uuid4().hex[:6]}@test.com"
    resp = await client.post("/api/v1/auth/register", json={
        "org_id": str(org.id),
        "full_name": "Little Learner",
        "email": email,
        "password": "StrongPass123!",
        "role": "student",
        "consent_accepted": True,
        "date_of_birth": _minor_dob(),
        "parent_email": parent_email,
    })
    assert resp.status_code == 200
    body = resp.json()
    assert body["parental_consent_pending"] is True
    assert body["parent_email"] == parent_email
    # No session is granted for a pending minor.
    assert "access_token" not in body
    assert body["user"]["parental_consent_pending"] is True

    # Account exists but is inactive and has no consent timestamp yet.
    user = (await db.execute(select(User).where(User.email == email))).scalar_one()
    assert user.is_active is False
    assert user.parental_consent_at is None
    assert user.date_of_birth is not None

    # A consent token was created for this user.
    token = (
        await db.execute(
            select(ParentConsentToken).where(ParentConsentToken.user_id == user.id)
        )
    ).scalar_one()
    assert token.parent_email == parent_email
    assert token.used is False
    assert token.expires_at > datetime.now(timezone.utc)


@pytest.mark.asyncio
async def test_minor_registration_requires_parent_email(client: AsyncClient, org):
    """A minor without parent_email is rejected (cannot self-consent)."""
    resp = await client.post("/api/v1/auth/register", json={
        "org_id": str(org.id),
        "full_name": "No Parent",
        "email": f"noparent-{uuid.uuid4().hex[:6]}@test.com",
        "password": "StrongPass123!",
        "role": "student",
        "consent_accepted": True,
        "date_of_birth": _minor_dob(),
    })
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_minor_cannot_login_before_consent(client: AsyncClient, org):
    """The pending minor account cannot log in until consent is confirmed."""
    email = f"minor-login-{uuid.uuid4().hex[:6]}@test.com"
    await client.post("/api/v1/auth/register", json={
        "org_id": str(org.id),
        "full_name": "Pending Kid",
        "email": email,
        "password": "StrongPass123!",
        "role": "student",
        "consent_accepted": True,
        "date_of_birth": _minor_dob(),
        "parent_email": f"p-{uuid.uuid4().hex[:6]}@test.com",
    })
    resp = await client.post("/api/v1/auth/login", json={
        "email": email,
        "password": "StrongPass123!",
    })
    assert resp.status_code == 400  # account deactivated


# ─── Consent confirmation ───────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_confirm_consent_activates_and_links(client: AsyncClient, db, org):
    """Confirming the token activates the child + links the parent."""
    email = f"minor2-{uuid.uuid4().hex[:6]}@test.com"
    parent_email = f"parent2-{uuid.uuid4().hex[:6]}@test.com"
    await client.post("/api/v1/auth/register", json={
        "org_id": str(org.id),
        "full_name": "Consent Kid",
        "email": email,
        "password": "StrongPass123!",
        "role": "student",
        "consent_accepted": True,
        "date_of_birth": _minor_dob(),
        "parent_email": parent_email,
    })
    child = (await db.execute(select(User).where(User.email == email))).scalar_one()
    token = (
        await db.execute(
            select(ParentConsentToken).where(ParentConsentToken.user_id == child.id)
        )
    ).scalar_one()

    resp = await client.post(
        "/api/v1/auth/parental-consent/confirm", json={"token": token.token}
    )
    assert resp.status_code == 200

    await db.refresh(child)
    assert child.is_active is True
    assert child.parental_consent_at is not None
    assert child.parental_consent_by is not None

    # Parent account was created and linked.
    parent = (
        await db.execute(select(User).where(User.email == parent_email))
    ).scalar_one()
    assert parent.role.value == "parent"
    link = (
        await db.execute(
            select(ParentChild).where(
                ParentChild.parent_id == parent.id, ParentChild.child_id == child.id
            )
        )
    ).scalar_one_or_none()
    assert link is not None

    # Child can now log in.
    login = await client.post("/api/v1/auth/login", json={
        "email": email,
        "password": "StrongPass123!",
    })
    assert login.status_code == 200


@pytest.mark.asyncio
async def test_confirm_invalid_token(client: AsyncClient):
    resp = await client.post(
        "/api/v1/auth/parental-consent/confirm", json={"token": "not-a-real-token"}
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_confirm_expired_token(client: AsyncClient, db, org):
    """An expired consent token is rejected."""
    email = f"minor3-{uuid.uuid4().hex[:6]}@test.com"
    await client.post("/api/v1/auth/register", json={
        "org_id": str(org.id),
        "full_name": "Expired Kid",
        "email": email,
        "password": "StrongPass123!",
        "role": "student",
        "consent_accepted": True,
        "date_of_birth": _minor_dob(),
        "parent_email": f"p3-{uuid.uuid4().hex[:6]}@test.com",
    })
    child = (await db.execute(select(User).where(User.email == email))).scalar_one()
    token = (
        await db.execute(
            select(ParentConsentToken).where(ParentConsentToken.user_id == child.id)
        )
    ).scalar_one()
    token.expires_at = datetime.now(timezone.utc) - timedelta(days=1)
    db.add(token)
    await db.flush()

    resp = await client.post(
        "/api/v1/auth/parental-consent/confirm", json={"token": token.token}
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_confirm_token_cannot_be_reused(client: AsyncClient, db, org):
    email = f"minor4-{uuid.uuid4().hex[:6]}@test.com"
    await client.post("/api/v1/auth/register", json={
        "org_id": str(org.id),
        "full_name": "Reuse Kid",
        "email": email,
        "password": "StrongPass123!",
        "role": "student",
        "consent_accepted": True,
        "date_of_birth": _minor_dob(),
        "parent_email": f"p4-{uuid.uuid4().hex[:6]}@test.com",
    })
    child = (await db.execute(select(User).where(User.email == email))).scalar_one()
    token = (
        await db.execute(
            select(ParentConsentToken).where(ParentConsentToken.user_id == child.id)
        )
    ).scalar_one()

    first = await client.post(
        "/api/v1/auth/parental-consent/confirm", json={"token": token.token}
    )
    assert first.status_code == 200
    second = await client.post(
        "/api/v1/auth/parental-consent/confirm", json={"token": token.token}
    )
    assert second.status_code == 400


# ─── Adult / backward-compatibility ─────────────────────────────────────────


@pytest.mark.asyncio
async def test_adult_student_registration_unaffected(client: AsyncClient, db, org):
    """An adult student with a DOB self-consents and gets a normal session."""
    email = f"adult-{uuid.uuid4().hex[:6]}@test.com"
    resp = await client.post("/api/v1/auth/register", json={
        "org_id": str(org.id),
        "full_name": "Grown Student",
        "email": email,
        "password": "StrongPass123!",
        "role": "student",
        "consent_accepted": True,
        "parental_consent_accepted": True,
        "date_of_birth": _adult_dob(),
    })
    assert resp.status_code == 200
    body = resp.json()
    assert "access_token" in body
    user = (await db.execute(select(User).where(User.email == email))).scalar_one()
    assert user.is_active is True
    assert user.parental_consent_at is not None


@pytest.mark.asyncio
async def test_student_without_dob_uses_legacy_path(client: AsyncClient, org):
    """No DOB → legacy self-attestation path (treated as adult/unknown)."""
    resp = await client.post("/api/v1/auth/register", json={
        "org_id": str(org.id),
        "full_name": "Legacy Student",
        "email": f"legacy-{uuid.uuid4().hex[:6]}@test.com",
        "password": "StrongPass123!",
        "role": "student",
        "consent_accepted": True,
        "parental_consent_accepted": True,
    })
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_existing_user_null_dob_can_login(client: AsyncClient, student):
    """Existing users (NULL date_of_birth) keep logging in unchanged."""
    assert student.date_of_birth is None
    resp = await client.post("/api/v1/auth/login", json={
        "email": student.email,
        "password": "TestPass123!",
    })
    assert resp.status_code == 200
    assert resp.json()["access_token"]

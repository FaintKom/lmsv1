"""Tests for the scheduled purge of never-confirmed consent-pending minors.

The age gate creates an INACTIVE student account + a ParentConsentToken (7-day
expiry) when a minor registers. If the parent never confirms, the account
lingers as is_active=False / parental_consent_at IS NULL forever. The purge job
(app.scheduler._purge_unconfirmed_consent_accounts) hard-deletes such accounts
once their token has been expired past settings.unconfirmed_consent_grace_days.

We exercise the session-parametrised core (_purge_unconfirmed_consent_accounts)
directly so the work happens inside the test's rollback transaction, matching
how the conftest `db` fixture isolates tests.

Covered:
  - an account past grace with an expired, unused token IS purged;
  - a confirmed/active account is NOT purged;
  - a still-within-grace pending account is NOT purged;
  - a normal adult (active) account is NOT purged.
"""
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.auth.models import ParentConsentToken, User, UserRole
from app.auth.security import hash_password
from app.config import settings
from app.scheduler import _purge_unconfirmed_consent_accounts


def _make_pending_minor(db, org):
    """An inactive, consent-pending minor account (mirrors registration)."""
    u = User(
        org_id=org.id,
        email=f"minor-{uuid.uuid4().hex[:8]}@test.com",
        hashed_password=hash_password("StrongPass123!"),
        full_name="Pending Minor",
        role=UserRole.student,
        is_active=False,
        parental_consent_at=None,
        consent_accepted_at=datetime.now(timezone.utc),
        privacy_policy_version="1.0",
    )
    db.add(u)
    return u


def _add_token(db, user, *, expires_at, used=False, confirmed_at=None):
    tok = ParentConsentToken(
        user_id=user.id,
        parent_email=f"parent-{uuid.uuid4().hex[:6]}@test.com",
        token=uuid.uuid4().hex,
        expires_at=expires_at,
        used=used,
        confirmed_at=confirmed_at,
    )
    db.add(tok)
    return tok


async def test_expired_unconfirmed_past_grace_is_purged(db, org):
    grace = settings.unconfirmed_consent_grace_days
    user = _make_pending_minor(db, org)
    await db.flush()
    # Token expired well beyond the grace window.
    _add_token(
        db,
        user,
        expires_at=datetime.now(timezone.utc) - timedelta(days=grace + 5),
    )
    await db.flush()
    user_id = user.id

    purged = await _purge_unconfirmed_consent_accounts(db)
    await db.flush()

    assert purged == 1
    remaining = (
        await db.execute(select(User).where(User.id == user_id))
    ).scalar_one_or_none()
    assert remaining is None


async def test_confirmed_active_account_not_purged(db, org):
    """A confirmed/activated account (is_active, consent set) survives."""
    user = _make_pending_minor(db, org)
    user.is_active = True
    user.parental_consent_at = datetime.now(timezone.utc)
    await db.flush()
    # Even with a (now-used) expired token, it must not be purged.
    _add_token(
        db,
        user,
        expires_at=datetime.now(timezone.utc) - timedelta(days=30),
        used=True,
        confirmed_at=datetime.now(timezone.utc),
    )
    await db.flush()
    user_id = user.id

    purged = await _purge_unconfirmed_consent_accounts(db)
    await db.flush()

    assert purged == 0
    remaining = (
        await db.execute(select(User).where(User.id == user_id))
    ).scalar_one_or_none()
    assert remaining is not None


async def test_within_grace_pending_not_purged(db, org):
    """A pending account whose token expired only just now (inside grace)."""
    user = _make_pending_minor(db, org)
    await db.flush()
    # Expired 1 day ago — still inside the (>=1 day) grace window.
    _add_token(
        db,
        user,
        expires_at=datetime.now(timezone.utc) - timedelta(days=1),
    )
    await db.flush()
    user_id = user.id

    purged = await _purge_unconfirmed_consent_accounts(db)
    await db.flush()

    assert purged == 0
    remaining = (
        await db.execute(select(User).where(User.id == user_id))
    ).scalar_one_or_none()
    assert remaining is not None


async def test_normal_adult_account_not_purged(db, org):
    """A normal active adult student (no consent token) is untouched."""
    user = User(
        org_id=org.id,
        email=f"adult-{uuid.uuid4().hex[:8]}@test.com",
        hashed_password=hash_password("StrongPass123!"),
        full_name="Grown Student",
        role=UserRole.student,
        is_active=True,
        parental_consent_at=datetime.now(timezone.utc),
        consent_accepted_at=datetime.now(timezone.utc),
        privacy_policy_version="1.0",
    )
    db.add(user)
    await db.flush()
    user_id = user.id

    purged = await _purge_unconfirmed_consent_accounts(db)
    await db.flush()

    assert purged == 0
    remaining = (
        await db.execute(select(User).where(User.id == user_id))
    ).scalar_one_or_none()
    assert remaining is not None

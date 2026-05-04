"""Unit tests for Lemon Squeezy integration.

These tests cover the pieces that don't need a live LS account:
- HMAC-SHA256 signature verification (correctness + timing-safe comparison)
- Event name / org_id extraction from webhook payloads
- Variant → plan mapping driven by env vars
- Webhook dispatcher swallows unknown events instead of crashing

Integration against the real LS API is covered separately by the probe
script in the repo root — not run in CI.
"""
from __future__ import annotations

import hashlib
import hmac
from unittest.mock import patch

import pytest

from app.billing import lemonsqueezy as ls
from app.billing import ls_service
from app.billing.models import (
    SubscriptionStatus,
)

# ------------------------------------------------------------------------
# signature verification
# ------------------------------------------------------------------------


def _sign(payload: bytes, secret: str) -> str:
    return hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()


class TestSignatureVerification:
    def test_valid_signature_passes(self):
        payload = b'{"meta":{"event_name":"subscription_created"}}'
        secret = "s3cret-webhook-key"
        assert ls.verify_webhook_signature(payload, _sign(payload, secret), secret=secret)

    def test_wrong_signature_rejected(self):
        payload = b'{"a":1}'
        assert not ls.verify_webhook_signature(payload, "deadbeef", secret="abc")

    def test_empty_signature_rejected(self):
        assert not ls.verify_webhook_signature(b"{}", "", secret="abc")

    def test_empty_secret_rejected(self):
        # Without a secret configured we MUST return False so the
        # router rejects the webhook — failing open would be a bypass.
        assert not ls.verify_webhook_signature(b"{}", "deadbeef", secret="")

    def test_uppercase_hex_accepted(self):
        payload = b'{"x":1}'
        secret = "abc123"
        sig = _sign(payload, secret).upper()
        assert ls.verify_webhook_signature(payload, sig, secret=secret)

    def test_signature_with_whitespace_accepted(self):
        """LS sometimes pads the header; compare_digest is strict so we strip."""
        payload = b'{"x":1}'
        secret = "abc123"
        sig = _sign(payload, secret) + "\n"
        assert ls.verify_webhook_signature(payload, sig, secret=secret)

    def test_tamper_with_payload_rejected(self):
        payload = b'{"amount":100}'
        secret = "k"
        sig = _sign(payload, secret)
        # same sig, different body — must fail
        assert not ls.verify_webhook_signature(
            b'{"amount":9999999}', sig, secret=secret
        )


# ------------------------------------------------------------------------
# event payload parsing
# ------------------------------------------------------------------------


class TestEventHelpers:
    def test_event_name_extraction(self):
        assert ls.event_name({"meta": {"event_name": "subscription_created"}}) == "subscription_created"
        assert ls.event_name({}) == ""
        assert ls.event_name({"meta": {}}) == ""

    def test_org_id_extraction_happy_path(self):
        event = {"meta": {"custom_data": {"org_id": "abc-123"}}}
        assert ls.extract_org_id(event) == "abc-123"

    def test_org_id_missing_returns_none(self):
        assert ls.extract_org_id({}) is None
        assert ls.extract_org_id({"meta": {}}) is None
        assert ls.extract_org_id({"meta": {"custom_data": {}}}) is None


# ------------------------------------------------------------------------
# variant ↔ plan mapping (env-driven)
# ------------------------------------------------------------------------


class TestVariantMap:
    def test_empty_when_nothing_configured(self):
        with patch.object(ls_service.settings, "lemonsqueezy_starter_monthly_variant_id", ""):
            with patch.object(ls_service.settings, "lemonsqueezy_starter_yearly_variant_id", ""):
                with patch.object(ls_service.settings, "lemonsqueezy_professional_monthly_variant_id", ""):
                    with patch.object(ls_service.settings, "lemonsqueezy_professional_yearly_variant_id", ""):
                        with patch.object(ls_service.settings, "lemonsqueezy_enterprise_monthly_variant_id", ""):
                            with patch.object(ls_service.settings, "lemonsqueezy_enterprise_yearly_variant_id", ""):
                                assert ls_service.variant_map() == {}

    def test_mapping_resolves_starter_month(self):
        with patch.object(ls_service.settings, "lemonsqueezy_starter_monthly_variant_id", "12345"):
            m = ls_service.variant_map()
            assert m["12345"] == ("Starter", "month")

    def test_variant_for_lookup(self):
        with patch.object(ls_service.settings, "lemonsqueezy_professional_yearly_variant_id", "99"):
            assert ls_service._variant_for("Professional", "year") == "99"
            assert ls_service._variant_for("professional", "YEAR") == "99"  # case-insensitive
            assert ls_service._variant_for("Starter", "year") is None


# ------------------------------------------------------------------------
# status mapping
# ------------------------------------------------------------------------


class TestStatusMapping:
    @pytest.mark.parametrize("ls_status,expected", [
        ("active", SubscriptionStatus.active),
        ("on_trial", SubscriptionStatus.trialing),
        ("past_due", SubscriptionStatus.past_due),
        ("unpaid", SubscriptionStatus.past_due),
        ("cancelled", SubscriptionStatus.canceled),
        ("expired", SubscriptionStatus.canceled),
        ("Active", SubscriptionStatus.active),  # case-insensitive
        ("totally-unknown", SubscriptionStatus.active),  # defensive default
        (None, SubscriptionStatus.active),
    ])
    def test_status_map(self, ls_status, expected):
        assert ls_service._status_from_ls(ls_status) == expected


# ------------------------------------------------------------------------
# datetime parsing
# ------------------------------------------------------------------------


class TestDatetimeParsing:
    def test_iso_z_suffix(self):
        dt = ls_service._parse_dt("2026-04-20T17:40:47.000000Z")
        assert dt is not None
        assert dt.tzinfo is not None

    def test_none_returns_none(self):
        assert ls_service._parse_dt(None) is None
        assert ls_service._parse_dt("") is None

    def test_malformed_returns_none(self):
        assert ls_service._parse_dt("not-a-date") is None


# ------------------------------------------------------------------------
# event dispatcher: unknown events
# ------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_unsupported_event_is_ignored():
    """Verifies handle_event does not raise on events we don't know about."""
    event = {"meta": {"event_name": "something_new_lemon_added"}}
    # db is not used for unsupported events — pass a sentinel that would
    # blow up if touched
    sentinel = object()
    await ls_service.handle_event(sentinel, event)  # type: ignore[arg-type]


@pytest.mark.asyncio
async def test_missing_event_name_is_ignored():
    await ls_service.handle_event(None, {})  # type: ignore[arg-type]
    await ls_service.handle_event(None, {"meta": {}})  # type: ignore[arg-type]


# ------------------------------------------------------------------------
# is_enabled gate
# ------------------------------------------------------------------------


class TestIsEnabled:
    def test_disabled_when_unset(self):
        with patch.object(ls.settings, "lemonsqueezy_api_key", ""):
            with patch.object(ls.settings, "lemonsqueezy_store_id", ""):
                assert ls.is_enabled() is False

    def test_disabled_when_only_key_set(self):
        with patch.object(ls.settings, "lemonsqueezy_api_key", "k"):
            with patch.object(ls.settings, "lemonsqueezy_store_id", ""):
                assert ls.is_enabled() is False

    def test_enabled_when_both_set(self):
        with patch.object(ls.settings, "lemonsqueezy_api_key", "k"):
            with patch.object(ls.settings, "lemonsqueezy_store_id", "351689"):
                assert ls.is_enabled() is True

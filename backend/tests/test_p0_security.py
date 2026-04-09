"""Tests for the P0 security hardening pass (2026-04-09 / 2026-04-10).

Covers the features added in:
- P0-3 rate limiting on auth endpoints
- P0-4 refresh token revocation + rotation + logout
- P0-5 file upload validation
- P0-6 email verification flow
- Change-password endpoint

These features landed without tests originally (smoke-tested on prod
instead). This module fills the gap so regressions get caught in CI.
"""
from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import EmailVerificationToken, RefreshToken, User
from app.common.file_validation import (
    IMAGE_EXTENSIONS,
    UploadValidationError,
    validate_upload,
)
from tests.conftest import auth_header


# ---------------------------------------------------------------------------
# P0-5 file upload validation (pure function, no HTTP)
# ---------------------------------------------------------------------------

PNG_HEADER = b"\x89PNG\r\n\x1a\n"
JPEG_HEADER = b"\xff\xd8\xff\xe0"
PDF_HEADER = b"%PDF-1.4\n"


class TestFileUploadValidation:
    def test_accepts_valid_png(self):
        data = PNG_HEADER + b"x" * 100
        result = validate_upload(
            filename="photo.png",
            data=data,
            allowed_extensions=IMAGE_EXTENSIONS,
        )
        assert result.extension == ".png"
        assert result.verified_mime == "image/png"
        # Safe name must be UUID hex plus extension, nothing else
        assert len(result.safe_name) == 32 + 4
        assert result.safe_name.endswith(".png")

    def test_rejects_magic_byte_mismatch(self):
        # PNG bytes but client claims it's a PDF
        with pytest.raises(UploadValidationError, match="does not match"):
            validate_upload(
                filename="fake.pdf",
                data=PNG_HEADER + b"x" * 100,
                allowed_extensions={".pdf"},
            )

    def test_sanitizes_path_traversal(self):
        result = validate_upload(
            filename="../../../etc/passwd.pdf",
            data=PDF_HEADER + b"x" * 100,
            allowed_extensions={".pdf"},
        )
        assert ".." not in result.safe_name
        assert "/" not in result.safe_name
        assert "\\" not in result.safe_name

    def test_rejects_empty_file(self):
        with pytest.raises(UploadValidationError, match="Empty"):
            validate_upload(
                filename="empty.pdf",
                data=b"",
                allowed_extensions={".pdf"},
            )

    def test_enforces_hard_size_ceiling(self):
        big = PNG_HEADER + b"x" * (51 * 1024 * 1024)  # 51 MB
        with pytest.raises(UploadValidationError, match="too large"):
            validate_upload(
                filename="big.png",
                data=big,
                allowed_extensions=IMAGE_EXTENSIONS,
                max_size_mb=100,  # endpoint says 100MB but hard ceiling is 50
            )

    def test_rejects_disallowed_extension(self):
        with pytest.raises(UploadValidationError, match="not allowed"):
            validate_upload(
                filename="shell.exe",
                data=b"MZ\x90\x00",
                allowed_extensions=IMAGE_EXTENSIONS,
            )

    def test_rejects_malicious_svg(self):
        svg = b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
        with pytest.raises(UploadValidationError, match="unsafe"):
            validate_upload(
                filename="xss.svg",
                data=svg,
                allowed_extensions={".svg"},
            )

    def test_accepts_clean_svg(self):
        svg = b'<svg xmlns="http://www.w3.org/2000/svg"><circle r="5"/></svg>'
        result = validate_upload(
            filename="clean.svg",
            data=svg,
            allowed_extensions={".svg"},
        )
        assert result.extension == ".svg"


# ---------------------------------------------------------------------------
# P0-3 rate limiting (via HTTP)
# ---------------------------------------------------------------------------
# Note: slowapi's default in-memory storage is per-process, so counters
# carry across tests within the same pytest invocation. These tests use
# unique emails so their rate-limit keys don't collide with other suites.


class TestAuthRateLimit:
    async def test_login_rate_limit_blocks_after_5_per_minute(
        self, client: AsyncClient
    ):
        # Use a unique email so the test doesn't share a counter with other
        # tests that also call /auth/login
        email = f"ratelimit-{uuid.uuid4().hex[:8]}@example.com"
        payload = {"email": email, "password": "wrong"}

        # First 5 attempts: expect auth error (400), not rate limit
        for i in range(5):
            r = await client.post("/api/v1/auth/login", json=payload)
            assert r.status_code == 400, f"attempt {i + 1}: {r.status_code}"

        # 6th attempt: rate-limited
        r = await client.post("/api/v1/auth/login", json=payload)
        assert r.status_code == 429
        assert "rate limit" in r.text.lower()


# ---------------------------------------------------------------------------
# P0-4 refresh token revocation
# ---------------------------------------------------------------------------


class TestRefreshTokenRevocation:
    async def test_login_persists_jti_with_ip_and_user_agent(
        self, client: AsyncClient, db: AsyncSession, teacher: User
    ):
        # Set the teacher's password so we can log in as them
        from app.auth.security import hash_password
        teacher.hashed_password = hash_password("Test12345!")
        db.add(teacher)
        await db.flush()

        r = await client.post(
            "/api/v1/auth/login",
            json={"email": teacher.email, "password": "Test12345!"},
            headers={"user-agent": "pytest-client/1.0"},
        )
        assert r.status_code == 200
        data = r.json()
        assert "refresh_token" in data
        # There must be a RefreshToken row for this user
        stored = (
            await db.execute(
                select(RefreshToken).where(RefreshToken.user_id == teacher.id)
            )
        ).scalars().all()
        assert len(stored) >= 1
        latest = max(stored, key=lambda s: s.created_at)
        assert latest.revoked_at is None
        assert latest.user_agent is not None

    async def test_refresh_rotates_and_revokes_old_token(
        self, client: AsyncClient, db: AsyncSession, teacher: User
    ):
        from app.auth.security import hash_password
        teacher.hashed_password = hash_password("Test12345!")
        db.add(teacher)
        await db.flush()

        login = await client.post(
            "/api/v1/auth/login",
            json={"email": teacher.email, "password": "Test12345!"},
        )
        assert login.status_code == 200
        old_refresh = login.json()["refresh_token"]

        # First refresh — succeeds, rotates
        r1 = await client.post(
            "/api/v1/auth/refresh", json={"refresh_token": old_refresh}
        )
        assert r1.status_code == 200
        new_refresh = r1.json()["refresh_token"]
        assert new_refresh != old_refresh

        # Replay the OLD refresh — must fail because it's now revoked
        r2 = await client.post(
            "/api/v1/auth/refresh", json={"refresh_token": old_refresh}
        )
        assert r2.status_code == 400
        assert "revoked" in r2.text.lower()

    async def test_logout_revokes_current_refresh_token(
        self, client: AsyncClient, db: AsyncSession, teacher: User
    ):
        from app.auth.security import hash_password
        teacher.hashed_password = hash_password("Test12345!")
        db.add(teacher)
        await db.flush()

        login = await client.post(
            "/api/v1/auth/login",
            json={"email": teacher.email, "password": "Test12345!"},
        )
        access_token = login.json()["access_token"]
        refresh_token = login.json()["refresh_token"]

        # Logout — authenticated call, passes refresh in body
        r = await client.post(
            "/api/v1/auth/logout",
            json={"refresh_token": refresh_token},
            headers={"Authorization": f"Bearer {access_token}"},
        )
        assert r.status_code == 200

        # Subsequent refresh must now fail
        r2 = await client.post(
            "/api/v1/auth/refresh", json={"refresh_token": refresh_token}
        )
        assert r2.status_code == 400


# ---------------------------------------------------------------------------
# Change password endpoint
# ---------------------------------------------------------------------------


class TestChangePassword:
    async def test_change_password_happy_path(
        self, client: AsyncClient, db: AsyncSession, teacher: User
    ):
        from app.auth.security import hash_password, verify_password
        teacher.hashed_password = hash_password("OldPass123!")
        db.add(teacher)
        await db.flush()

        r = await client.post(
            "/api/v1/auth/me/password",
            json={"current_password": "OldPass123!", "new_password": "NewPass456!"},
            headers=auth_header(teacher),
        )
        assert r.status_code == 200

        # Reload user and check the hash actually changed
        await db.refresh(teacher)
        assert verify_password("NewPass456!", teacher.hashed_password)
        assert not verify_password("OldPass123!", teacher.hashed_password)

    async def test_change_password_rejects_wrong_current(
        self, client: AsyncClient, db: AsyncSession, teacher: User
    ):
        from app.auth.security import hash_password
        teacher.hashed_password = hash_password("OldPass123!")
        db.add(teacher)
        await db.flush()

        r = await client.post(
            "/api/v1/auth/me/password",
            json={"current_password": "WRONG!", "new_password": "NewPass456!"},
            headers=auth_header(teacher),
        )
        assert r.status_code == 400
        assert "incorrect" in r.text.lower()

    async def test_change_password_rejects_short_new(
        self, client: AsyncClient, db: AsyncSession, teacher: User
    ):
        from app.auth.security import hash_password
        teacher.hashed_password = hash_password("OldPass123!")
        db.add(teacher)
        await db.flush()

        r = await client.post(
            "/api/v1/auth/me/password",
            json={"current_password": "OldPass123!", "new_password": "short"},
            headers=auth_header(teacher),
        )
        assert r.status_code == 400
        assert "8 characters" in r.text

    async def test_change_password_rejects_same_as_old(
        self, client: AsyncClient, db: AsyncSession, teacher: User
    ):
        from app.auth.security import hash_password
        teacher.hashed_password = hash_password("OldPass123!")
        db.add(teacher)
        await db.flush()

        r = await client.post(
            "/api/v1/auth/me/password",
            json={"current_password": "OldPass123!", "new_password": "OldPass123!"},
            headers=auth_header(teacher),
        )
        assert r.status_code == 400
        assert "differ" in r.text.lower()


# ---------------------------------------------------------------------------
# P0-6 email verification
# ---------------------------------------------------------------------------


class TestEmailVerification:
    async def test_student_registration_auto_verifies(
        self, client: AsyncClient, db: AsyncSession, org
    ):
        email = f"student-{uuid.uuid4().hex[:8]}@example.com"
        r = await client.post(
            "/api/v1/auth/register",
            json={
                "org_id": str(org.id),
                "full_name": "Test Student",
                "email": email,
                "password": "StudentPass1!",
                "role": "student",
                "consent_accepted": True,
            },
        )
        assert r.status_code == 200, r.text
        # Student should come back pre-verified
        user = (
            await db.execute(select(User).where(User.email == email))
        ).scalar_one_or_none()
        assert user is not None
        assert user.email_verified_at is not None

    async def test_teacher_registration_creates_verification_token(
        self, client: AsyncClient, db: AsyncSession
    ):
        email = f"teacher-{uuid.uuid4().hex[:8]}@example.com"
        r = await client.post(
            "/api/v1/auth/register",
            json={
                "org_name": f"Test School {uuid.uuid4().hex[:6]}",
                "full_name": "Test Teacher",
                "email": email,
                "password": "TeacherPass1!",
                "role": "teacher",
                "consent_accepted": True,
            },
        )
        assert r.status_code == 200, r.text
        user = (
            await db.execute(select(User).where(User.email == email))
        ).scalar_one_or_none()
        assert user is not None
        # Teacher should NOT be auto-verified
        assert user.email_verified_at is None
        # And a verification token should exist
        tokens = (
            await db.execute(
                select(EmailVerificationToken).where(
                    EmailVerificationToken.user_id == user.id
                )
            )
        ).scalars().all()
        assert len(tokens) == 1
        assert not tokens[0].used

    async def test_verify_email_endpoint_marks_user_verified(
        self, client: AsyncClient, db: AsyncSession
    ):
        email = f"verify-{uuid.uuid4().hex[:8]}@example.com"
        # Register a teacher (gets a token)
        reg = await client.post(
            "/api/v1/auth/register",
            json={
                "org_name": f"Verify School {uuid.uuid4().hex[:6]}",
                "full_name": "Verify Me",
                "email": email,
                "password": "VerifyPass1!",
                "role": "teacher",
                "consent_accepted": True,
            },
        )
        assert reg.status_code == 200
        user = (
            await db.execute(select(User).where(User.email == email))
        ).scalar_one()
        token_row = (
            await db.execute(
                select(EmailVerificationToken).where(
                    EmailVerificationToken.user_id == user.id
                )
            )
        ).scalar_one()

        # Use the token
        r = await client.post(
            "/api/v1/auth/verify-email", json={"token": token_row.token}
        )
        assert r.status_code == 200

        # User is now verified
        await db.refresh(user)
        assert user.email_verified_at is not None

        # Token can't be reused
        r2 = await client.post(
            "/api/v1/auth/verify-email", json={"token": token_row.token}
        )
        assert r2.status_code == 400

    async def test_verify_email_rejects_invalid_token(
        self, client: AsyncClient
    ):
        r = await client.post(
            "/api/v1/auth/verify-email",
            json={"token": "definitely-not-a-real-token"},
        )
        assert r.status_code == 400

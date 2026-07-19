"""Tests for authentication: register, login, refresh, password reset, profile, GDPR."""

import uuid

import pytest
from httpx import AsyncClient

from tests.conftest import auth_header

# ─── Registration ────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_register_teacher_creates_org(client: AsyncClient):
    """Teacher registration creates a new organization."""
    resp = await client.post(
        "/api/v1/auth/register",
        json={
            "org_name": f"New School {uuid.uuid4().hex[:6]}",
            "full_name": "New Teacher",
            "email": f"teacher-{uuid.uuid4().hex[:6]}@test.com",
            "password": "StrongPass123!",
            "role": "teacher",
            "consent_accepted": True,
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["role"] == "admin"  # teachers become org admins


@pytest.mark.asyncio
async def test_register_student_requires_org_id(client: AsyncClient):
    """Student registration without org_id fails."""
    resp = await client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "New Student",
            "email": f"student-{uuid.uuid4().hex[:6]}@test.com",
            "password": "StrongPass123!",
            "role": "student",
            "consent_accepted": True,
        },
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_register_student_with_org(client: AsyncClient, org):
    """Student registration with valid org_id succeeds."""
    resp = await client.post(
        "/api/v1/auth/register",
        json={
            "org_id": str(org.id),
            "full_name": "New Student",
            "email": f"student-{uuid.uuid4().hex[:6]}@test.com",
            "password": "StrongPass123!",
            "role": "student",
            "consent_accepted": True,
            "parental_consent_accepted": True,
        },
    )
    assert resp.status_code == 200
    assert resp.json()["user"]["role"] == "student"


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient, org):
    """Duplicate email registration returns 400."""
    email = f"dup-{uuid.uuid4().hex[:6]}@test.com"
    payload = {
        "org_name": f"School {uuid.uuid4().hex[:6]}",
        "full_name": "Teacher",
        "email": email,
        "password": "StrongPass123!",
        "role": "teacher",
        "consent_accepted": True,
    }
    resp1 = await client.post("/api/v1/auth/register", json=payload)
    assert resp1.status_code == 200

    resp2 = await client.post("/api/v1/auth/register", json=payload)
    assert resp2.status_code == 400


@pytest.mark.asyncio
async def test_register_requires_consent(client: AsyncClient):
    """Registration without consent fails."""
    resp = await client.post(
        "/api/v1/auth/register",
        json={
            "org_name": f"School {uuid.uuid4().hex[:6]}",
            "full_name": "Teacher",
            "email": f"no-consent-{uuid.uuid4().hex[:6]}@test.com",
            "password": "Pass123!",
            "role": "teacher",
            "consent_accepted": False,
        },
    )
    assert resp.status_code == 400


# ─── Login ───────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, student):
    """Login with correct credentials returns tokens."""
    resp = await client.post(
        "/api/v1/auth/login",
        json={
            "email": student.email,
            "password": "TestPass123!",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["access_token"]
    assert data["refresh_token"]
    assert data["user"]["id"] == str(student.id)


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient, student):
    """Login with wrong password returns 400."""
    resp = await client.post(
        "/api/v1/auth/login",
        json={
            "email": student.email,
            "password": "WrongPassword!",
        },
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_login_nonexistent_email(client: AsyncClient):
    """Login with non-existent email returns 400."""
    resp = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "nobody@nowhere.com",
            "password": "Password123!",
        },
    )
    assert resp.status_code == 400


# ─── Token Refresh ───────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_refresh_token(client: AsyncClient, student):
    """Valid refresh token returns new access + refresh tokens."""
    login = await client.post(
        "/api/v1/auth/login",
        json={
            "email": student.email,
            "password": "TestPass123!",
        },
    )
    refresh = login.json()["refresh_token"]

    resp = await client.post(
        "/api/v1/auth/refresh",
        json={
            "refresh_token": refresh,
        },
    )
    assert resp.status_code == 200
    # Both tokens should be valid non-empty strings
    assert resp.json()["access_token"]
    assert resp.json()["refresh_token"]


@pytest.mark.asyncio
async def test_refresh_with_access_token_fails(client: AsyncClient, student):
    """Using an access token as refresh should fail."""
    login = await client.post(
        "/api/v1/auth/login",
        json={
            "email": student.email,
            "password": "TestPass123!",
        },
    )
    resp = await client.post(
        "/api/v1/auth/refresh",
        json={
            "refresh_token": login.json()["access_token"],
        },
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_refresh_invalid_token(client: AsyncClient):
    """Invalid refresh token returns 400."""
    resp = await client.post(
        "/api/v1/auth/refresh",
        json={
            "refresh_token": "not-a-valid-jwt",
        },
    )
    assert resp.status_code == 400


# ─── /me Endpoint ────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_me_authenticated(client: AsyncClient, student):
    """Authenticated user can access /me."""
    resp = await client.get("/api/v1/auth/me", headers=auth_header(student))
    assert resp.status_code == 200
    assert resp.json()["email"] == student.email


@pytest.mark.asyncio
async def test_me_unauthenticated(client: AsyncClient):
    """Unauthenticated request to /me returns 401/403."""
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_update_profile(client: AsyncClient, student):
    """User can update their own profile."""
    resp = await client.put(
        "/api/v1/auth/me",
        json={
            "full_name": "Updated Name",
            "bio": "I love learning",
        },
        headers=auth_header(student),
    )
    assert resp.status_code == 200
    assert resp.json()["full_name"] == "Updated Name"
    assert resp.json()["bio"] == "I love learning"


# ─── Email Preferences ──────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_email_preferences(client: AsyncClient, student):
    resp = await client.get("/api/v1/auth/me/email-preferences", headers=auth_header(student))
    assert resp.status_code == 200
    data = resp.json()
    assert "assignments" in data
    assert "grades" in data


@pytest.mark.asyncio
async def test_update_email_preferences(client: AsyncClient, student):
    resp = await client.put(
        "/api/v1/auth/me/email-preferences",
        json={
            "assignments": False,
            "grades": True,
            "deadlines": False,
            "courses": True,
        },
        headers=auth_header(student),
    )
    assert resp.status_code == 200
    assert resp.json()["assignments"] is False


# ─── Password Reset ─────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_forgot_password_always_succeeds(client: AsyncClient):
    """Forgot password always returns success to prevent email enumeration."""
    resp = await client.post(
        "/api/v1/auth/forgot-password",
        json={
            "email": "nonexistent@test.com",
        },
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_reset_password_invalid_token(client: AsyncClient):
    """Reset password with invalid token fails."""
    resp = await client.post(
        "/api/v1/auth/reset-password",
        json={
            "token": "invalid-token",
            "new_password": "NewPassword123!",
        },
    )
    assert resp.status_code == 400


# ─── GDPR Data Export ───────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_data_export(client: AsyncClient, student):
    """GDPR data export returns user data."""
    resp = await client.get("/api/v1/auth/me/data-export", headers=auth_header(student))
    assert resp.status_code == 200
    data = resp.json()
    assert "user" in data or "email" in str(data)


# ─── Organizations Search (Public) ──────────────────────────────────────


@pytest.mark.asyncio
async def test_search_organizations(client: AsyncClient, org):
    """Public endpoint to search organizations."""
    resp = await client.get("/api/v1/auth/organizations", params={"q": "Test"})
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


# ─── httpOnly cookie auth (2026-07-19) ───────────────────────────────────


@pytest.mark.asyncio
async def test_login_sets_httponly_cookies(client: AsyncClient, student):
    resp = await client.post(
        "/api/v1/auth/login",
        json={
            "email": student.email,
            "password": "TestPass123!",
        },
    )
    assert resp.status_code == 200
    set_cookies = "; ".join(resp.headers.get_list("set-cookie"))
    assert "access_token=" in set_cookies
    assert "refresh_token=" in set_cookies
    assert "HttpOnly" in set_cookies
    assert "samesite=lax" in set_cookies.lower()


@pytest.mark.asyncio
async def test_cookie_only_request_authenticates(client: AsyncClient, student):
    """No Authorization header — the httpOnly cookie alone must work."""
    login = await client.post(
        "/api/v1/auth/login",
        json={
            "email": student.email,
            "password": "TestPass123!",
        },
    )
    assert login.status_code == 200
    # httpx client keeps the cookie jar; call /me without a header.
    me = await client.get("/api/v1/auth/me")
    assert me.status_code == 200
    assert me.json()["email"] == student.email


@pytest.mark.asyncio
async def test_refresh_via_cookie_rotates(client: AsyncClient, student):
    login = await client.post(
        "/api/v1/auth/login",
        json={
            "email": student.email,
            "password": "TestPass123!",
        },
    )
    old_refresh = login.json()["refresh_token"]

    # Empty body — refresh token comes from the cookie jar.
    resp = await client.post("/api/v1/auth/refresh")
    assert resp.status_code == 200
    assert resp.json()["refresh_token"] != old_refresh

    # The old (rotated-out) token is now revoked.
    replay = await client.post("/api/v1/auth/refresh", json={"refresh_token": old_refresh})
    assert replay.status_code == 400


@pytest.mark.asyncio
async def test_logout_clears_cookies(client: AsyncClient, student):
    await client.post(
        "/api/v1/auth/login",
        json={
            "email": student.email,
            "password": "TestPass123!",
        },
    )
    resp = await client.post("/api/v1/auth/logout")
    assert resp.status_code == 200
    cleared = "; ".join(resp.headers.get_list("set-cookie"))
    assert 'access_token="";' in cleared or "access_token=;" in cleared or "Max-Age=0" in cleared

    me = await client.get("/api/v1/auth/me")
    assert me.status_code == 401

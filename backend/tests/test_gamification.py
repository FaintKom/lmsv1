"""Tests for gamification (badges, streaks, XP, leaderboard), certificates, and skills."""
import pytest
from httpx import AsyncClient

from tests.conftest import auth_header, make_course, make_enrollment


# ─── Badges ──────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_my_badges(client: AsyncClient, student):
    resp = await client.get("/api/v1/gamification/my-badges", headers=auth_header(student))
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_unauthenticated_badges(client: AsyncClient):
    resp = await client.get("/api/v1/gamification/my-badges")
    assert resp.status_code in (401, 403)


# ─── Streaks ─────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_my_streak(client: AsyncClient, student):
    resp = await client.get("/api/v1/gamification/my-streak", headers=auth_header(student))
    assert resp.status_code == 200


# ─── Leaderboard ─────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_leaderboard(client: AsyncClient, student):
    resp = await client.get("/api/v1/gamification/leaderboard", headers=auth_header(student))
    assert resp.status_code == 200


# ─── Leagues ─────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_leagues(client: AsyncClient, student):
    resp = await client.get("/api/v1/gamification/leagues", headers=auth_header(student))
    assert resp.status_code == 200


# ─── Certificates ────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_my_certificates(client: AsyncClient, student):
    resp = await client.get("/api/v1/certificates/my-certificates", headers=auth_header(student))
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_verify_certificate_not_found(client: AsyncClient, student):
    resp = await client.get(
        "/api/v1/certificates/verify/CERT-000000",
        headers=auth_header(student),
    )
    assert resp.status_code in (200, 404)


# ─── Skills ──────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_skills(client: AsyncClient, teacher):
    resp = await client.get("/api/v1/skills", headers=auth_header(teacher))
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_create_skill(client: AsyncClient, admin):
    resp = await client.post("/api/v1/skills", json={
        "name": "Python",
        "icon": "python-icon",
        "category": "programming",
    }, headers=auth_header(admin))
    assert resp.status_code in (200, 201)


@pytest.mark.asyncio
async def test_my_skills(client: AsyncClient, student):
    resp = await client.get("/api/v1/skills/my", headers=auth_header(student))
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_skills_radar(client: AsyncClient, student):
    resp = await client.get("/api/v1/skills/radar", headers=auth_header(student))
    assert resp.status_code == 200

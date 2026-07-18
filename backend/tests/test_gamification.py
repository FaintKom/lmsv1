"""Tests for gamification (badges, streaks, XP, leaderboard), certificates, and skills."""

import pytest
from httpx import AsyncClient

from tests.conftest import auth_header

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


@pytest.mark.asyncio
async def test_leaderboard_content_and_order(client: AsyncClient, db, org, student):
    """Leaderboard aggregates XP/streaks per student and sorts by XP desc."""
    from app.auth.models import UserRole
    from app.gamification.models import UserStreak
    from tests.conftest import _make_user

    rival = _make_user(db, org, UserRole.student, suffix="-rival")
    await db.flush()
    db.add(UserStreak(user_id=student.id, current_streak=2, longest_streak=2, total_xp=50))
    db.add(UserStreak(user_id=rival.id, current_streak=5, longest_streak=5, total_xp=300))
    await db.flush()

    resp = await client.get("/api/v1/gamification/leaderboard", headers=auth_header(student))
    assert resp.status_code == 200
    rows = resp.json()
    by_id = {row["user_id"]: row for row in rows}
    assert str(rival.id) in by_id and str(student.id) in by_id
    assert by_id[str(rival.id)]["total_xp"] == 300
    assert by_id[str(student.id)]["total_xp"] == 50
    assert by_id[str(student.id)]["current_streak"] == 2
    # XP desc — rival before student
    ids = [row["user_id"] for row in rows]
    assert ids.index(str(rival.id)) < ids.index(str(student.id))


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
    resp = await client.post(
        "/api/v1/skills",
        json={
            "name": "Python",
            "icon": "python-icon",
            "category": "programming",
        },
        headers=auth_header(admin),
    )
    assert resp.status_code in (200, 201)


@pytest.mark.asyncio
async def test_my_skills(client: AsyncClient, student):
    resp = await client.get("/api/v1/skills/my", headers=auth_header(student))
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_skills_radar(client: AsyncClient, student):
    resp = await client.get("/api/v1/skills/radar", headers=auth_header(student))
    assert resp.status_code == 200

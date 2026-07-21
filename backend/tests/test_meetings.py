"""Tests for meetings — RBAC, org scoping, lifecycle (create/update/end)."""

import pytest
from httpx import AsyncClient

from tests.conftest import auth_header


async def _create(client: AsyncClient, user, title="Standup"):
    resp = await client.post(
        "/api/v1/meetings",
        json={"title": title, "duration_minutes": 30},
        headers=auth_header(user),
    )
    assert resp.status_code == 200, resp.text
    return resp.json()


@pytest.mark.asyncio
async def test_student_cannot_create(client: AsyncClient, student):
    resp = await client.post("/api/v1/meetings", json={"title": "x"}, headers=auth_header(student))
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_teacher_creates_with_room_url(client: AsyncClient, teacher):
    meeting = await _create(client, teacher)
    assert meeting["is_active"] is True
    assert meeting["room_url"].startswith("https://")


@pytest.mark.asyncio
async def test_student_sees_org_meeting(client: AsyncClient, teacher, student):
    meeting = await _create(client, teacher)
    listed = await client.get("/api/v1/meetings", headers=auth_header(student))
    assert listed.status_code == 200
    assert meeting["id"] in [m["id"] for m in listed.json()]


@pytest.mark.asyncio
async def test_cross_org_meeting_404(client: AsyncClient, teacher, admin2):
    meeting = await _create(client, teacher)
    resp = await client.get(f"/api/v1/meetings/{meeting['id']}", headers=auth_header(admin2))
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_update_and_end_lifecycle(client: AsyncClient, teacher):
    meeting = await _create(client, teacher)

    upd = await client.put(
        f"/api/v1/meetings/{meeting['id']}",
        json={"title": "Renamed"},
        headers=auth_header(teacher),
    )
    assert upd.status_code == 200
    assert upd.json()["title"] == "Renamed"

    ended = await client.post(f"/api/v1/meetings/{meeting['id']}/end", headers=auth_header(teacher))
    assert ended.status_code == 200
    assert ended.json()["is_active"] is False

    active = await client.get("/api/v1/meetings/active", headers=auth_header(teacher))
    assert meeting["id"] not in [m["id"] for m in active.json()]


@pytest.mark.asyncio
async def test_list_survives_deleted_creator(client: AsyncClient, db, teacher):
    """created_by is SET NULL when the creator is deleted — listing must not 500."""
    from sqlalchemy import update

    from app.meetings.models import Meeting

    meeting = await _create(client, teacher)
    await db.execute(update(Meeting).where(Meeting.id == meeting["id"]).values(created_by=None))

    listed = await client.get("/api/v1/meetings", headers=auth_header(teacher))
    assert listed.status_code == 200
    row = next(m for m in listed.json() if m["id"] == meeting["id"])
    assert row["created_by"] is None


@pytest.mark.asyncio
async def test_update_nonexistent_404(client: AsyncClient, teacher):
    resp = await client.put(
        "/api/v1/meetings/00000000-0000-0000-0000-000000000000",
        json={"title": "x"},
        headers=auth_header(teacher),
    )
    assert resp.status_code == 404

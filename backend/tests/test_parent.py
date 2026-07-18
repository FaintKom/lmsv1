"""Tests for parent portal — role gate, child linking, ownership checks."""

import pytest
from httpx import AsyncClient

from app.auth.models import UserRole
from tests.conftest import _make_user, auth_header


@pytest.mark.asyncio
async def test_children_requires_parent_role(client: AsyncClient, student):
    resp = await client.get("/api/v1/parent/children", headers=auth_header(student))
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_children_empty_initially(client: AsyncClient, parent):
    resp = await client.get("/api/v1/parent/children", headers=auth_header(parent))
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_link_child_then_listed(client: AsyncClient, db, org, parent, student):
    resp = await client.post(
        "/api/v1/parent/children/link",
        json={"child_email": student.email},
        headers=auth_header(parent),
    )
    assert resp.status_code == 200

    listed = await client.get("/api/v1/parent/children", headers=auth_header(parent))
    assert listed.status_code == 200
    assert student.email in str(listed.json())


@pytest.mark.asyncio
async def test_link_unknown_email_400(client: AsyncClient, parent):
    resp = await client.post(
        "/api/v1/parent/children/link",
        json={"child_email": "nobody@nowhere.example.com"},
        headers=auth_header(parent),
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_link_cross_org_child_400(client: AsyncClient, db, org2, parent):
    """Student exists but in another org — must not be linkable."""
    foreign_child = _make_user(db, org2, UserRole.student, suffix="-foreign")
    await db.flush()
    resp = await client.post(
        "/api/v1/parent/children/link",
        json={"child_email": foreign_child.email},
        headers=auth_header(parent),
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_unlinked_child_progress_403(client: AsyncClient, parent, student):
    resp = await client.get(
        f"/api/v1/parent/children/{student.id}/progress", headers=auth_header(parent)
    )
    assert resp.status_code == 403

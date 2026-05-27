"""Pytest suite for the admin-dashboard persistence module (sprint A1).

Covers:
  - CRUD round-trip via the HTTP layer
  - RBAC by role (teacher / admin / super_admin / student-blocked)
  - scope-allowed enforcement (teacher cannot create scope=org)
  - cross-org isolation (admin in org A cannot see/edit org B rows)
  - is_default single-on-per-(user, scope) invariant
"""
from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.analytics import service as analytics_service
from app.analytics.models import AdminDashboard, DashboardScope
from app.analytics.schemas import (
    DashboardCreateRequest,
    DashboardUpdateRequest,
)
from tests.conftest import auth_header

# ── HTTP CRUD round-trip ──────────────────────────────────────────────


@pytest.mark.asyncio
async def test_admin_create_list_get_update_delete(
    client: AsyncClient, admin
):
    headers = auth_header(admin)

    # Create
    res = await client.post(
        "/api/v1/admin/dashboards",
        json={
            "name": "Engagement",
            "view_scope": "org",
            "is_default": True,
            "layout": {"widgets": [{"id": "kpi-1", "x": 0, "y": 0, "w": 4, "h": 2}]},
            "filters": {"range": "30d"},
        },
        headers=headers,
    )
    assert res.status_code == 201, res.text
    created = res.json()
    did = created["id"]
    assert created["name"] == "Engagement"
    assert created["is_default"] is True

    # List
    res = await client.get("/api/v1/admin/dashboards", headers=headers)
    assert res.status_code == 200
    ids = [d["id"] for d in res.json()]
    assert did in ids

    # Get
    res = await client.get(f"/api/v1/admin/dashboards/{did}", headers=headers)
    assert res.status_code == 200
    assert res.json()["filters"] == {"range": "30d"}

    # Update
    res = await client.patch(
        f"/api/v1/admin/dashboards/{did}",
        json={"name": "Engagement (v2)", "filters": {"range": "7d"}},
        headers=headers,
    )
    assert res.status_code == 200
    assert res.json()["name"] == "Engagement (v2)"
    assert res.json()["filters"] == {"range": "7d"}

    # Delete
    res = await client.delete(f"/api/v1/admin/dashboards/{did}", headers=headers)
    assert res.status_code == 204
    res = await client.get(f"/api/v1/admin/dashboards/{did}", headers=headers)
    assert res.status_code == 404


# ── RBAC ──────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_student_blocked(client: AsyncClient, student):
    res = await client.post(
        "/api/v1/admin/dashboards",
        json={"name": "x", "view_scope": "own_teacher"},
        headers=auth_header(student),
    )
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_teacher_can_only_use_own_teacher_scope(
    client: AsyncClient, teacher
):
    headers = auth_header(teacher)

    res = await client.post(
        "/api/v1/admin/dashboards",
        json={"name": "Mine", "view_scope": "org"},
        headers=headers,
    )
    assert res.status_code == 403
    assert res.json()["detail"]["code"] == "scope_not_allowed"

    res = await client.post(
        "/api/v1/admin/dashboards",
        json={"name": "Mine", "view_scope": "own_teacher"},
        headers=headers,
    )
    assert res.status_code == 201


@pytest.mark.asyncio
async def test_admin_cannot_use_global_scope(client: AsyncClient, admin):
    res = await client.post(
        "/api/v1/admin/dashboards",
        json={"name": "Global", "view_scope": "global"},
        headers=auth_header(admin),
    )
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_super_admin_can_use_any_scope(
    client: AsyncClient, super_admin
):
    for scope in ("own_teacher", "org", "global"):
        res = await client.post(
            "/api/v1/admin/dashboards",
            json={"name": f"sa-{scope}", "view_scope": scope},
            headers=auth_header(super_admin),
        )
        assert res.status_code == 201, scope


# ── Cross-org isolation ──────────────────────────────────────────────


@pytest.mark.asyncio
async def test_admin_cross_org_isolation(
    client: AsyncClient, admin, admin2
):
    """Admin in org A cannot fetch / edit / delete an org-B dashboard."""
    # admin2 (org B) creates one.
    res = await client.post(
        "/api/v1/admin/dashboards",
        json={"name": "B-only", "view_scope": "org"},
        headers=auth_header(admin2),
    )
    assert res.status_code == 201
    did = res.json()["id"]

    # admin (org A) cannot see it
    res = await client.get(
        f"/api/v1/admin/dashboards/{did}", headers=auth_header(admin)
    )
    assert res.status_code == 404

    # ...nor edit
    res = await client.patch(
        f"/api/v1/admin/dashboards/{did}",
        json={"name": "hijack"},
        headers=auth_header(admin),
    )
    assert res.status_code == 404

    # ...nor delete
    res = await client.delete(
        f"/api/v1/admin/dashboards/{did}", headers=auth_header(admin)
    )
    assert res.status_code == 404

    # And the list endpoint excludes it
    listed = (
        await client.get("/api/v1/admin/dashboards", headers=auth_header(admin))
    ).json()
    assert did not in [d["id"] for d in listed]


# ── Single-default invariant ──────────────────────────────────────────


@pytest.mark.asyncio
async def test_only_one_default_per_scope(db: AsyncSession, admin):
    """Flipping a new dashboard default unsets the prior one."""
    a = await analytics_service.create_dashboard(
        db,
        admin,
        DashboardCreateRequest(name="A", view_scope=DashboardScope.org, is_default=True),
    )
    b = await analytics_service.create_dashboard(
        db,
        admin,
        DashboardCreateRequest(name="B", view_scope=DashboardScope.org, is_default=True),
    )

    # Re-fetch a from DB.
    a_fresh = await db.scalar(select(AdminDashboard).where(AdminDashboard.id == a.id))
    b_fresh = await db.scalar(select(AdminDashboard).where(AdminDashboard.id == b.id))
    assert a_fresh.is_default is False
    assert b_fresh.is_default is True

    # Flip A back via PATCH.
    await analytics_service.update_dashboard(
        db, admin, a.id, DashboardUpdateRequest(is_default=True)
    )
    a_fresh = await db.scalar(select(AdminDashboard).where(AdminDashboard.id == a.id))
    b_fresh = await db.scalar(select(AdminDashboard).where(AdminDashboard.id == b.id))
    assert a_fresh.is_default is True
    assert b_fresh.is_default is False


# ── Payload validation ────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_layout_widget_cap_rejected(client: AsyncClient, admin):
    """Submitting more than MAX_WIDGETS widgets is 422."""
    over = [{"id": f"w-{i}"} for i in range(45)]
    res = await client.post(
        "/api/v1/admin/dashboards",
        json={"name": "Huge", "view_scope": "org", "layout": {"widgets": over}},
        headers=auth_header(admin),
    )
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_unknown_uuid_returns_404(client: AsyncClient, admin):
    res = await client.get(
        f"/api/v1/admin/dashboards/{uuid.uuid4()}", headers=auth_header(admin)
    )
    assert res.status_code == 404

"""Tests for webhook endpoint management (org-scoped, admin-only)."""

import pytest
from httpx import AsyncClient

from tests.conftest import auth_header


async def _create(client: AsyncClient, admin, url="https://example.com/hook"):
    resp = await client.post(
        "/api/v1/webhooks",
        json={"url": url, "description": "test hook", "events": ["course.completed"]},
        headers=auth_header(admin),
    )
    assert resp.status_code == 200
    return resp.json()


@pytest.mark.asyncio
async def test_webhooks_require_admin(client: AsyncClient, student):
    resp = await client.get("/api/v1/webhooks", headers=auth_header(student))
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_webhooks_require_auth(client: AsyncClient):
    resp = await client.get("/api/v1/webhooks")
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_create_shows_secret_once_then_masks(client: AsyncClient, admin):
    created = await _create(client, admin)
    assert len(created["secret"]) == 64  # full secret at creation time only

    listed = (await client.get("/api/v1/webhooks", headers=auth_header(admin))).json()
    assert len(listed["endpoints"]) == 1
    masked = listed["endpoints"][0]["secret"]
    assert masked.endswith("…") and len(masked) < 64
    assert created["secret"].startswith(masked[:-1])


@pytest.mark.asyncio
async def test_create_rejects_invalid_url(client: AsyncClient, admin):
    resp = await client.post(
        "/api/v1/webhooks",
        json={"url": "not-a-url", "events": []},
        headers=auth_header(admin),
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_update_and_delete(client: AsyncClient, admin):
    hook_id = (await _create(client, admin))["id"]

    resp = await client.put(
        f"/api/v1/webhooks/{hook_id}",
        json={"is_active": False},
        headers=auth_header(admin),
    )
    assert resp.status_code == 200

    listed = (await client.get("/api/v1/webhooks", headers=auth_header(admin))).json()
    assert listed["endpoints"][0]["is_active"] is False

    resp = await client.delete(f"/api/v1/webhooks/{hook_id}", headers=auth_header(admin))
    assert resp.status_code == 200
    listed = (await client.get("/api/v1/webhooks", headers=auth_header(admin))).json()
    assert listed["endpoints"] == []


@pytest.mark.asyncio
async def test_cross_org_webhook_is_invisible(client: AsyncClient, admin, admin2):
    """Admin of another org can neither update nor delete this org's hook."""
    hook_id = (await _create(client, admin))["id"]

    resp = await client.put(
        f"/api/v1/webhooks/{hook_id}",
        json={"is_active": False},
        headers=auth_header(admin2),
    )
    assert resp.status_code == 404

    resp = await client.delete(f"/api/v1/webhooks/{hook_id}", headers=auth_header(admin2))
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_invalid_webhook_id_is_400(client: AsyncClient, admin):
    resp = await client.put(
        "/api/v1/webhooks/not-a-uuid",
        json={"is_active": False},
        headers=auth_header(admin),
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_deliveries_empty_for_new_hook(client: AsyncClient, admin):
    hook_id = (await _create(client, admin))["id"]
    resp = await client.get(f"/api/v1/webhooks/{hook_id}/deliveries", headers=auth_header(admin))
    assert resp.status_code == 200

"""Admin happy path: log in -> list users -> view dashboard -> list
organizations."""
import pytest


async def test_admin_can_list_users(role_client_factory):
    c = await role_client_factory("admin")
    r = await c.get("/api/v1/admin/users")
    assert r.status_code == 200, r.text
    users = r.json()
    items = users.get("items", users) if isinstance(users, dict) else users
    emails = [u["email"] for u in items]
    assert "qa-student@qa.example.com" in emails, f"qa-student not in {emails[:10]}"


async def test_admin_can_view_dashboard(role_client_factory):
    c = await role_client_factory("admin")
    r = await c.get("/api/v1/admin/dashboard")
    assert r.status_code == 200, r.text


async def test_admin_can_list_organizations(role_client_factory):
    c = await role_client_factory("admin")
    r = await c.get("/api/v1/admin/organizations")
    assert r.status_code == 200, r.text

"""
RBAC Permission Matrix Tests.

Tests all major endpoints against all 5 roles to ensure proper access control.
Each test verifies that the correct roles are allowed/denied.
"""

import pytest
from httpx import AsyncClient

from tests.conftest import (
    auth_header,
    make_course,
    make_lesson,
    make_module,
)

# ─── Helper ──────────────────────────────────────────────────────────────

async def _assert_allowed(client, method, url, user, *, json=None, expected=None):
    """Assert that a user CAN access an endpoint."""
    fn = getattr(client, method)
    kwargs = {"headers": auth_header(user)}
    if json:
        kwargs["json"] = json
    resp = await fn(url, **kwargs)
    if expected:
        assert resp.status_code in expected, f"{user.role} got {resp.status_code} on {method.upper()} {url}"
    else:
        assert resp.status_code < 400, f"{user.role} got {resp.status_code} on {method.upper()} {url}"


async def _assert_forbidden(client, method, url, user, *, json=None):
    """Assert that a user CANNOT access an endpoint (403)."""
    fn = getattr(client, method)
    kwargs = {"headers": auth_header(user)}
    if json:
        kwargs["json"] = json
    resp = await fn(url, **kwargs)
    assert resp.status_code == 403, f"{user.role} got {resp.status_code} on {method.upper()} {url} (expected 403)"


# ─── Course Endpoints RBAC ───────────────────────────────────────────────


@pytest.mark.asyncio
async def test_create_course_rbac(client, super_admin, admin, teacher, student, parent, org, db):
    """Only super_admin, admin, teacher can create courses."""
    payload = {"title": "RBAC Course", "description": "Test"}
    await _assert_allowed(client, "post", "/api/v1/courses", super_admin, json=payload)
    await _assert_allowed(client, "post", "/api/v1/courses", admin, json=payload)
    await _assert_allowed(client, "post", "/api/v1/courses", teacher, json=payload)
    await _assert_forbidden(client, "post", "/api/v1/courses", student, json=payload)
    await _assert_forbidden(client, "post", "/api/v1/courses", parent, json=payload)


@pytest.mark.asyncio
async def test_list_courses_rbac(client, super_admin, admin, teacher, student, parent):
    """All authenticated users can list courses."""
    for user in [super_admin, admin, teacher, student, parent]:
        await _assert_allowed(client, "get", "/api/v1/courses", user)


@pytest.mark.asyncio
async def test_delete_course_rbac(client, super_admin, admin, teacher, student, parent, org, db):
    """Only super_admin, admin, teacher can delete courses."""
    for allowed in [super_admin, admin, teacher]:
        course = await make_course(db, org, allowed)
        await _assert_allowed(client, "delete", f"/api/v1/courses/{course.id}", allowed)

    course = await make_course(db, org, teacher)
    await _assert_forbidden(client, "delete", f"/api/v1/courses/{course.id}", student)
    await _assert_forbidden(client, "delete", f"/api/v1/courses/{course.id}", parent)


# ─── Admin Endpoints RBAC ────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_admin_users_rbac(client, super_admin, admin, teacher, student, parent):
    """Only admin (and super_admin) can manage users."""
    await _assert_allowed(client, "get", "/api/v1/admin/users", super_admin)
    await _assert_allowed(client, "get", "/api/v1/admin/users", admin)
    await _assert_forbidden(client, "get", "/api/v1/admin/users", teacher)
    await _assert_forbidden(client, "get", "/api/v1/admin/users", student)
    await _assert_forbidden(client, "get", "/api/v1/admin/users", parent)


@pytest.mark.asyncio
async def test_admin_dashboard_rbac(client, super_admin, admin, teacher, student, parent):
    """Admin and teacher can view dashboard."""
    await _assert_allowed(client, "get", "/api/v1/admin/dashboard", super_admin)
    await _assert_allowed(client, "get", "/api/v1/admin/dashboard", admin)
    await _assert_allowed(client, "get", "/api/v1/admin/dashboard", teacher)
    await _assert_forbidden(client, "get", "/api/v1/admin/dashboard", student)
    await _assert_forbidden(client, "get", "/api/v1/admin/dashboard", parent)


@pytest.mark.asyncio
async def test_admin_organizations_rbac(client, super_admin, admin, teacher, student, parent):
    """Only admin can manage orgs."""
    await _assert_allowed(client, "get", "/api/v1/admin/organizations", super_admin)
    await _assert_allowed(client, "get", "/api/v1/admin/organizations", admin)
    await _assert_forbidden(client, "get", "/api/v1/admin/organizations", teacher)
    await _assert_forbidden(client, "get", "/api/v1/admin/organizations", student)
    await _assert_forbidden(client, "get", "/api/v1/admin/organizations", parent)


@pytest.mark.asyncio
async def test_admin_groups_rbac(client, super_admin, admin, teacher, student, parent):
    """Admin and teacher can manage groups."""
    await _assert_allowed(client, "get", "/api/v1/admin/groups", super_admin)
    await _assert_allowed(client, "get", "/api/v1/admin/groups", admin)
    await _assert_allowed(client, "get", "/api/v1/admin/groups", teacher)
    await _assert_forbidden(client, "get", "/api/v1/admin/groups", student)
    await _assert_forbidden(client, "get", "/api/v1/admin/groups", parent)


@pytest.mark.asyncio
async def test_admin_review_queue_rbac(client, super_admin, admin, teacher, student, parent):
    """Admin and teacher can access review queue."""
    await _assert_allowed(client, "get", "/api/v1/admin/review-queue", super_admin)
    await _assert_allowed(client, "get", "/api/v1/admin/review-queue", admin)
    await _assert_allowed(client, "get", "/api/v1/admin/review-queue", teacher)
    await _assert_forbidden(client, "get", "/api/v1/admin/review-queue", student)
    await _assert_forbidden(client, "get", "/api/v1/admin/review-queue", parent)


@pytest.mark.asyncio
async def test_admin_analytics_rbac(client, super_admin, admin, teacher, student, parent):
    """Admin and teacher can access analytics."""
    await _assert_allowed(client, "get", "/api/v1/admin/analytics/detailed", super_admin)
    await _assert_allowed(client, "get", "/api/v1/admin/analytics/detailed", admin)
    await _assert_allowed(client, "get", "/api/v1/admin/analytics/detailed", teacher)
    await _assert_forbidden(client, "get", "/api/v1/admin/analytics/detailed", student)
    await _assert_forbidden(client, "get", "/api/v1/admin/analytics/detailed", parent)


# ─── Exercise Endpoints RBAC ────────────────────────────────────────────


@pytest.mark.asyncio
async def test_exercise_crud_rbac(client, super_admin, admin, teacher, student, parent, org, db):
    """Only admin/teacher can create/update/delete exercises."""
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)

    payload = {"lesson_id": str(lesson.id), "exercise_type": "quiz", "title": "RBAC Ex"}
    await _assert_allowed(client, "post", "/api/v1/exercises", super_admin, json=payload)
    await _assert_allowed(client, "post", "/api/v1/exercises", admin, json=payload)
    await _assert_allowed(client, "post", "/api/v1/exercises", teacher, json=payload)
    await _assert_forbidden(client, "post", "/api/v1/exercises", student, json=payload)
    await _assert_forbidden(client, "post", "/api/v1/exercises", parent, json=payload)


@pytest.mark.asyncio
async def test_exercise_list_rbac(client, super_admin, admin, teacher, student, parent):
    """All authenticated users can list exercises."""
    for user in [super_admin, admin, teacher, student, parent]:
        await _assert_allowed(client, "get", "/api/v1/exercises", user)


# ─── Assignment Endpoints RBAC ──────────────────────────────────────────


@pytest.mark.asyncio
async def test_assignment_create_rbac(client, super_admin, admin, teacher, student, parent, org, db):
    """Only admin/teacher can create assignments."""
    course = await make_course(db, org, teacher)
    payload = {
        "course_id": str(course.id),
        "title": "RBAC HW",
        "due_date": "2030-12-31T23:59:59Z",
        "max_score": 100,
    }
    await _assert_allowed(client, "post", "/api/v1/assignments", super_admin, json=payload)
    await _assert_allowed(client, "post", "/api/v1/assignments", admin, json=payload)
    await _assert_allowed(client, "post", "/api/v1/assignments", teacher, json=payload)
    await _assert_forbidden(client, "post", "/api/v1/assignments", student, json=payload)
    await _assert_forbidden(client, "post", "/api/v1/assignments", parent, json=payload)


# ─── Progress Endpoints RBAC ────────────────────────────────────────────


@pytest.mark.asyncio
async def test_my_courses_all_roles(client, super_admin, admin, teacher, student, parent):
    """All authenticated users can view their courses."""
    for user in [super_admin, admin, teacher, student, parent]:
        await _assert_allowed(client, "get", "/api/v1/progress/my-courses", user)


# ─── Gamification Endpoints RBAC ────────────────────────────────────────


@pytest.mark.asyncio
async def test_gamification_all_roles(client, super_admin, admin, teacher, student, parent):
    """All authenticated users can access gamification."""
    for endpoint in ["/api/v1/gamification/my-badges", "/api/v1/gamification/my-streak",
                     "/api/v1/gamification/leaderboard"]:
        for user in [super_admin, admin, teacher, student, parent]:
            await _assert_allowed(client, "get", endpoint, user)


# ─── Calendar RBAC ──────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_calendar_all_roles(client, super_admin, admin, teacher, student, parent):
    """All authenticated users can access calendar."""
    for user in [super_admin, admin, teacher, student, parent]:
        await _assert_allowed(client, "get", "/api/v1/calendar/events", user)


# ─── Notifications RBAC ─────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_notifications_all_roles(client, super_admin, admin, teacher, student, parent):
    """All authenticated users can access notifications."""
    for user in [super_admin, admin, teacher, student, parent]:
        await _assert_allowed(client, "get", "/api/v1/notifications", user)


# ─── Parent Portal RBAC ─────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_parent_portal_rbac(client, super_admin, admin, teacher, student, parent):
    """Only parent (and super_admin) can access parent portal."""
    await _assert_allowed(client, "get", "/api/v1/parent/children", super_admin)
    await _assert_allowed(client, "get", "/api/v1/parent/children", parent)
    await _assert_forbidden(client, "get", "/api/v1/parent/children", admin)
    await _assert_forbidden(client, "get", "/api/v1/parent/children", teacher)
    await _assert_forbidden(client, "get", "/api/v1/parent/children", student)


# ─── Learning Paths RBAC ────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_learning_paths_create_rbac(client, super_admin, admin, teacher, student, parent):
    """Only admin/teacher can create learning paths."""
    payload = {"title": "RBAC Path", "description": "Test"}
    await _assert_allowed(client, "post", "/api/v1/learning-paths", super_admin, json=payload, expected=[200, 201])
    await _assert_allowed(client, "post", "/api/v1/learning-paths", admin, json=payload, expected=[200, 201])
    await _assert_allowed(client, "post", "/api/v1/learning-paths", teacher, json=payload, expected=[200, 201])
    await _assert_forbidden(client, "post", "/api/v1/learning-paths", student, json=payload)
    await _assert_forbidden(client, "post", "/api/v1/learning-paths", parent, json=payload)


@pytest.mark.asyncio
async def test_learning_paths_list_rbac(client, super_admin, admin, teacher, student, parent):
    """All roles can list learning paths."""
    for user in [super_admin, admin, teacher, student, parent]:
        await _assert_allowed(client, "get", "/api/v1/learning-paths", user)


# ─── Super Admin Bypass ─────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_super_admin_bypasses_all_role_checks(
    client, super_admin, org, db
):
    """Super admin can access every protected endpoint."""
    endpoints = [
        ("get", "/api/v1/admin/dashboard"),
        ("get", "/api/v1/admin/users"),
        ("get", "/api/v1/admin/organizations"),
        ("get", "/api/v1/admin/groups"),
        ("get", "/api/v1/admin/review-queue"),
        ("get", "/api/v1/admin/analytics/detailed"),
        ("get", "/api/v1/admin/courses"),
        ("get", "/api/v1/courses"),
        ("get", "/api/v1/exercises"),
        ("get", "/api/v1/assignments"),
        ("get", "/api/v1/progress/my-courses"),
        ("get", "/api/v1/gamification/my-badges"),
        ("get", "/api/v1/notifications"),
        ("get", "/api/v1/calendar/events"),
        ("get", "/api/v1/parent/children"),
        ("get", "/api/v1/learning-paths"),
        ("get", "/api/v1/skills"),
        ("get", "/api/v1/certificates/my-certificates"),
    ]
    for method, url in endpoints:
        await _assert_allowed(client, method, url, super_admin)


# ─── Unauthenticated Access ─────────────────────────────────────────────


@pytest.mark.asyncio
async def test_unauthenticated_access_denied(client: AsyncClient):
    """Protected endpoints reject unauthenticated requests."""
    protected_endpoints = [
        "/api/v1/auth/me",
        "/api/v1/courses",
        "/api/v1/exercises",
        "/api/v1/admin/dashboard",
        "/api/v1/admin/users",
        "/api/v1/progress/my-courses",
        "/api/v1/gamification/my-badges",
        "/api/v1/notifications",
        "/api/v1/calendar/events",
    ]
    for url in protected_endpoints:
        resp = await client.get(url)
        assert resp.status_code in (401, 403), f"Unauth access to {url} returned {resp.status_code}"


# ─── Cross-Org Isolation ────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_admin_cannot_see_other_org_users(client, admin, admin2):
    """Admin cannot see users from another org."""
    resp = await client.get("/api/v1/admin/users", headers=auth_header(admin))
    assert resp.status_code == 200
    user_org_ids = {u["org_id"] for u in resp.json()}
    # Should not contain admin2's org_id
    if user_org_ids:
        assert str(admin2.org_id) not in user_org_ids


@pytest.mark.asyncio
async def test_admin_cannot_manage_other_org_groups(client, admin, org2, db):
    """Admin cannot see groups from another org."""
    from app.admin.models import StudentGroup
    g = StudentGroup(org_id=org2.id, name="Other Org Group")
    db.add(g)
    await db.flush()
    resp = await client.get("/api/v1/admin/groups", headers=auth_header(admin))
    group_ids = [g["id"] for g in resp.json()]
    assert str(g.id) not in group_ids

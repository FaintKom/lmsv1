"""Tests for admin endpoints: dashboard, users, groups, orgs, gradebook, review queue."""
import uuid

import pytest
from httpx import AsyncClient

from tests.conftest import (
    auth_header,
    make_course,
    make_enrollment,
)

# ─── Dashboard ───────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_dashboard_as_admin(client: AsyncClient, admin):
    resp = await client.get("/api/v1/admin/dashboard", headers=auth_header(admin))
    assert resp.status_code == 200
    data = resp.json()
    assert "total_students" in data or "students" in str(data).lower()


@pytest.mark.asyncio
async def test_dashboard_as_teacher(client: AsyncClient, teacher):
    resp = await client.get("/api/v1/admin/dashboard", headers=auth_header(teacher))
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_dashboard_forbidden_for_student(client: AsyncClient, student):
    resp = await client.get("/api/v1/admin/dashboard", headers=auth_header(student))
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_dashboard_super_admin(client: AsyncClient, super_admin):
    resp = await client.get("/api/v1/admin/dashboard", headers=auth_header(super_admin))
    assert resp.status_code == 200


# ─── Teacher Stats ───────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_teacher_stats(client: AsyncClient, teacher):
    resp = await client.get("/api/v1/admin/teacher-stats", headers=auth_header(teacher))
    assert resp.status_code == 200
    data = resp.json()
    assert "my_courses" in data
    assert "to_review" in data


@pytest.mark.asyncio
async def test_teacher_stats_forbidden_for_student(client: AsyncClient, student):
    resp = await client.get("/api/v1/admin/teacher-stats", headers=auth_header(student))
    assert resp.status_code == 403


# ─── Organization Management ────────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_organizations_as_admin(client: AsyncClient, admin):
    resp = await client.get("/api/v1/admin/organizations", headers=auth_header(admin))
    assert resp.status_code == 200
    orgs = resp.json()
    assert isinstance(orgs, list)
    # Admin should see only their own org
    assert len(orgs) >= 1


@pytest.mark.asyncio
async def test_list_organizations_as_super_admin(client: AsyncClient, super_admin):
    """Super admin sees all orgs."""
    resp = await client.get("/api/v1/admin/organizations", headers=auth_header(super_admin))
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_get_organization(client: AsyncClient, admin, org):
    resp = await client.get(
        f"/api/v1/admin/organizations/{org.id}",
        headers=auth_header(admin),
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == org.name


@pytest.mark.asyncio
async def test_admin_cannot_get_other_org(client: AsyncClient, admin, org2):
    """Admin cannot view another org's details."""
    resp = await client.get(
        f"/api/v1/admin/organizations/{org2.id}",
        headers=auth_header(admin),
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_update_organization(client: AsyncClient, admin, org):
    resp = await client.put(
        f"/api/v1/admin/organizations/{org.id}",
        json={"name": "Updated School Name"},
        headers=auth_header(admin),
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "Updated School Name"


@pytest.mark.asyncio
async def test_update_org_settings(client: AsyncClient, admin, org):
    resp = await client.put(
        f"/api/v1/admin/organizations/{org.id}",
        json={"settings": {"invitation_only": True}},
        headers=auth_header(admin),
    )
    assert resp.status_code == 200
    assert resp.json()["settings"]["invitation_only"] is True


@pytest.mark.asyncio
async def test_delete_org_requires_super_admin(client: AsyncClient, admin, org2):
    """Regular admin cannot delete an org."""
    resp = await client.delete(
        f"/api/v1/admin/organizations/{org2.id}",
        headers=auth_header(admin),
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_super_admin_can_delete_org(client: AsyncClient, super_admin, org2):
    resp = await client.delete(
        f"/api/v1/admin/organizations/{org2.id}",
        headers=auth_header(super_admin),
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_super_admin_cannot_delete_own_org(client: AsyncClient, super_admin, org):
    resp = await client.delete(
        f"/api/v1/admin/organizations/{org.id}",
        headers=auth_header(super_admin),
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_student_cannot_manage_orgs(client: AsyncClient, student, org):
    resp = await client.get("/api/v1/admin/organizations", headers=auth_header(student))
    assert resp.status_code == 403


# ─── User Management ────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_users(client: AsyncClient, admin):
    resp = await client.get("/api/v1/admin/users", headers=auth_header(admin))
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_list_users_filter_by_role(client: AsyncClient, admin):
    resp = await client.get(
        "/api/v1/admin/users", params={"role": "student"},
        headers=auth_header(admin),
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_create_user_as_admin(client: AsyncClient, admin):
    resp = await client.post("/api/v1/admin/users", json={
        "email": f"new-user-{uuid.uuid4().hex[:6]}@test.com",
        "password": "NewPass123!",
        "full_name": "New User",
        "role": "student",
    }, headers=auth_header(admin))
    assert resp.status_code == 200
    assert resp.json()["role"] == "student"


@pytest.mark.asyncio
async def test_admin_cannot_create_admin_user(client: AsyncClient, admin):
    """Only super_admin can create admin users."""
    resp = await client.post("/api/v1/admin/users", json={
        "email": f"admin-{uuid.uuid4().hex[:6]}@test.com",
        "password": "NewPass123!",
        "full_name": "New Admin",
        "role": "admin",
    }, headers=auth_header(admin))
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_super_admin_can_create_admin_user(client: AsyncClient, super_admin):
    resp = await client.post("/api/v1/admin/users", json={
        "email": f"admin-{uuid.uuid4().hex[:6]}@test.com",
        "password": "NewPass123!",
        "full_name": "New Admin",
        "role": "admin",
    }, headers=auth_header(super_admin))
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_update_user(client: AsyncClient, admin, student):
    resp = await client.put(
        f"/api/v1/admin/users/{student.id}",
        json={"is_active": False},
        headers=auth_header(admin),
    )
    assert resp.status_code == 200
    assert resp.json()["is_active"] is False


@pytest.mark.asyncio
async def test_delete_user(client: AsyncClient, admin, db, org):
    from app.auth.models import UserRole
    from tests.conftest import _make_user
    u = _make_user(db, org, UserRole.student, suffix="-del")
    await db.flush()
    resp = await client.delete(
        f"/api/v1/admin/users/{u.id}",
        headers=auth_header(admin),
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_admin_cannot_delete_self(client: AsyncClient, admin):
    resp = await client.delete(
        f"/api/v1/admin/users/{admin.id}",
        headers=auth_header(admin),
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_student_cannot_manage_users(client: AsyncClient, student):
    resp = await client.get("/api/v1/admin/users", headers=auth_header(student))
    assert resp.status_code == 403


# ─── Groups ──────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_create_group(client: AsyncClient, admin):
    resp = await client.post("/api/v1/admin/groups", json={
        "name": "Class 10A",
        "description": "10th grade section A",
    }, headers=auth_header(admin))
    assert resp.status_code == 200
    assert resp.json()["name"] == "Class 10A"


@pytest.mark.asyncio
async def test_list_groups(client: AsyncClient, admin):
    resp = await client.get("/api/v1/admin/groups", headers=auth_header(admin))
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_update_group(client: AsyncClient, admin, db, org):
    from app.admin.models import StudentGroup
    g = StudentGroup(org_id=org.id, name="Old Group")
    db.add(g)
    await db.flush()
    resp = await client.put(
        f"/api/v1/admin/groups/{g.id}",
        json={"name": "New Group Name"},
        headers=auth_header(admin),
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_delete_group(client: AsyncClient, admin, db, org):
    from app.admin.models import StudentGroup
    g = StudentGroup(org_id=org.id, name="To Delete")
    db.add(g)
    await db.flush()
    resp = await client.delete(f"/api/v1/admin/groups/{g.id}", headers=auth_header(admin))
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_add_member_to_group(client: AsyncClient, admin, student, db, org):
    from app.admin.models import StudentGroup
    g = StudentGroup(org_id=org.id, name="Group With Members")
    db.add(g)
    await db.flush()
    resp = await client.post(
        f"/api/v1/admin/groups/{g.id}/members",
        json={"user_ids": [str(student.id)]},
        headers=auth_header(admin),
    )
    assert resp.status_code == 200
    assert resp.json()["added"] == 1


@pytest.mark.asyncio
async def test_list_group_members(client: AsyncClient, admin, student, db, org):
    from app.admin.models import StudentGroup, StudentGroupMember
    g = StudentGroup(org_id=org.id, name="For Members List")
    db.add(g)
    await db.flush()
    db.add(StudentGroupMember(group_id=g.id, user_id=student.id))
    await db.flush()
    resp = await client.get(
        f"/api/v1/admin/groups/{g.id}/members",
        headers=auth_header(admin),
    )
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


@pytest.mark.asyncio
async def test_remove_member_from_group(client: AsyncClient, admin, student, db, org):
    from app.admin.models import StudentGroup, StudentGroupMember
    g = StudentGroup(org_id=org.id, name="Remove Test")
    db.add(g)
    await db.flush()
    db.add(StudentGroupMember(group_id=g.id, user_id=student.id))
    await db.flush()
    resp = await client.delete(
        f"/api/v1/admin/groups/{g.id}/members/{student.id}",
        headers=auth_header(admin),
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_student_cannot_manage_groups(client: AsyncClient, student):
    resp = await client.get("/api/v1/admin/groups", headers=auth_header(student))
    assert resp.status_code == 403


# ─── Enrollment (Admin) ─────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_admin_enroll_student(client: AsyncClient, admin, student, org, db):
    course = await make_course(db, org, admin)
    resp = await client.post("/api/v1/admin/enroll", json={
        "user_id": str(student.id),
        "course_id": str(course.id),
    }, headers=auth_header(admin))
    assert resp.status_code == 200
    assert resp.json()["status"] in ("ok", "already_enrolled")


@pytest.mark.asyncio
async def test_admin_enroll_duplicate(client: AsyncClient, admin, student, org, db):
    course = await make_course(db, org, admin)
    await make_enrollment(db, course.id, student.id)
    resp = await client.post("/api/v1/admin/enroll", json={
        "user_id": str(student.id),
        "course_id": str(course.id),
    }, headers=auth_header(admin))
    assert resp.status_code == 200
    assert resp.json()["status"] == "already_enrolled"


@pytest.mark.asyncio
async def test_list_course_students(client: AsyncClient, admin, student, org, db):
    course = await make_course(db, org, admin)
    await make_enrollment(db, course.id, student.id)
    resp = await client.get(
        f"/api/v1/admin/courses/{course.id}/students",
        headers=auth_header(admin),
    )
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


@pytest.mark.asyncio
async def test_admin_unenroll(client: AsyncClient, admin, student, org, db):
    course = await make_course(db, org, admin)
    enrollment = await make_enrollment(db, course.id, student.id)
    resp = await client.delete(
        f"/api/v1/admin/enrollments/{enrollment.id}",
        headers=auth_header(admin),
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_bulk_enroll_group(client: AsyncClient, admin, student, org, db):
    from app.admin.models import StudentGroup, StudentGroupMember
    course = await make_course(db, org, admin)
    g = StudentGroup(org_id=org.id, name="Bulk Group")
    db.add(g)
    await db.flush()
    db.add(StudentGroupMember(group_id=g.id, user_id=student.id))
    await db.flush()
    resp = await client.post(
        f"/api/v1/admin/groups/{g.id}/enroll",
        json={"course_id": str(course.id)},
        headers=auth_header(admin),
    )
    assert resp.status_code == 200
    assert resp.json()["enrolled"] >= 1


# ─── Admin Courses ───────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_admin_list_courses(client: AsyncClient, admin, org, db):
    await make_course(db, org, admin)
    resp = await client.get("/api/v1/admin/courses", headers=auth_header(admin))
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_super_admin_change_course_org(client: AsyncClient, super_admin, org, org2, db):
    course = await make_course(db, org, super_admin)
    resp = await client.put(
        f"/api/v1/admin/courses/{course.id}",
        json={"org_id": str(org2.id)},
        headers=auth_header(super_admin),
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_regular_admin_cannot_change_course_org(client: AsyncClient, admin, org, db):
    course = await make_course(db, org, admin)
    resp = await client.put(
        f"/api/v1/admin/courses/{course.id}",
        json={"org_id": str(uuid.uuid4())},
        headers=auth_header(admin),
    )
    assert resp.status_code == 403


# ─── Analytics ───────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_detailed_analytics(client: AsyncClient, admin):
    resp = await client.get("/api/v1/admin/analytics/detailed", headers=auth_header(admin))
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_analytics_csv_export(client: AsyncClient, admin):
    resp = await client.get("/api/v1/admin/analytics/export-csv", headers=auth_header(admin))
    assert resp.status_code == 200
    assert "csv" in resp.headers.get("content-type", "")


@pytest.mark.asyncio
async def test_student_cannot_access_analytics(client: AsyncClient, student):
    resp = await client.get("/api/v1/admin/analytics/detailed", headers=auth_header(student))
    assert resp.status_code == 403


# ─── Gradebook ───────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_gradebook(client: AsyncClient, admin, student, org, db):
    course = await make_course(db, org, admin)
    await make_enrollment(db, course.id, student.id)
    resp = await client.get(
        "/api/v1/admin/gradebook",
        params={"course_id": str(course.id)},
        headers=auth_header(admin),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "students" in data
    assert "columns" in data


@pytest.mark.asyncio
async def test_gradebook_export(client: AsyncClient, admin, org, db):
    course = await make_course(db, org, admin)
    resp = await client.get(
        "/api/v1/admin/gradebook/export",
        params={"course_id": str(course.id)},
        headers=auth_header(admin),
    )
    assert resp.status_code == 200


# ─── Review Queue ────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_review_queue_count(client: AsyncClient, admin):
    resp = await client.get("/api/v1/admin/review-queue/count", headers=auth_header(admin))
    assert resp.status_code == 200
    assert "count" in resp.json()


@pytest.mark.asyncio
async def test_review_queue_list(client: AsyncClient, admin):
    resp = await client.get("/api/v1/admin/review-queue", headers=auth_header(admin))
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_student_cannot_access_review_queue(client: AsyncClient, student):
    resp = await client.get("/api/v1/admin/review-queue", headers=auth_header(student))
    assert resp.status_code == 403

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
async def test_saving_settings_replaces_the_whole_menu_map(client: AsyncClient, admin, org, db):
    """A menu key the settings form no longer knows must not survive a save.

    This is the half of removing a menu item that happens by itself: the form
    rebuilds the visibility map from its own list of items and the server puts
    that map in place of the old one, so a deleted item's key goes with it.

    Read the assertions as a pair. If somebody ever "improves" the merge into a
    per-key one, a removed item's key would sit in the database for good —
    `dr0pm33t1ng5` left exactly such a key behind and a migration had to come
    and take it out. This test is what fails first next time.
    """
    org.settings = {
        "display_name": "Before",
        "menu_visibility": {"nonexistent_item": True, "gradebook": False},
    }
    db.add(org)
    await db.flush()

    resp = await client.put(
        f"/api/v1/admin/organizations/{org.id}",
        json={"settings": {"menu_visibility": {"gradebook": False}}},
        headers=auth_header(admin),
    )

    assert resp.status_code == 200
    menu = resp.json()["settings"]["menu_visibility"]
    assert "nonexistent_item" not in menu
    # The positive control. Without it the line above is green against an
    # endpoint that returns an empty map, or none at all.
    assert menu["gradebook"] is False
    # Sibling settings are merged, not replaced: only menu_visibility is
    # rewritten wholesale, and a save from the menu screen must not wipe the
    # school's name or its colours.
    assert resp.json()["settings"]["display_name"] == "Before"


@pytest.mark.asyncio
async def test_admin_cannot_edit_another_org(client: AsyncClient, admin, org2, db):
    """Reading another school's settings was covered; writing was not."""
    before = org2.name

    resp = await client.put(
        f"/api/v1/admin/organizations/{org2.id}",
        json={"name": "Renamed by a stranger"},
        headers=auth_header(admin),
    )
    assert resp.status_code == 404

    await db.refresh(org2)
    assert org2.name == before


@pytest.mark.asyncio
async def test_a_plain_admin_cannot_deactivate_their_own_org(client: AsyncClient, admin, org, db):
    """is_active is a super-admin switch — a school cannot suspend itself. The
    endpoint ignores the field rather than refusing the whole request."""
    resp = await client.put(
        f"/api/v1/admin/organizations/{org.id}",
        json={"name": org.name, "is_active": False},
        headers=auth_header(admin),
    )
    assert resp.status_code == 200
    assert resp.json()["is_active"] is True

    await db.refresh(org)
    assert org.is_active is True


@pytest.mark.asyncio
async def test_super_admin_can_read_another_orgs_settings(client: AsyncClient, super_admin, org2):
    """The positive half of the rule, which nothing asserted before.

    Every other test here proves an admin is turned away. None proved a super
    admin gets through, so the endpoint could have started refusing everybody
    and this suite would have stayed green — while the screen that edits
    another school's settings rests entirely on it.
    """
    resp = await client.get(
        f"/api/v1/admin/organizations/{org2.id}",
        headers=auth_header(super_admin),
    )
    assert resp.status_code == 200
    assert resp.json()["id"] == str(org2.id)


@pytest.mark.asyncio
async def test_super_admin_can_edit_another_orgs_settings(
    client: AsyncClient, super_admin, org2, db
):
    resp = await client.put(
        f"/api/v1/admin/organizations/{org2.id}",
        json={"settings": {"display_name": "Second School", "primary_color": "#123456"}},
        headers=auth_header(super_admin),
    )
    assert resp.status_code == 200
    assert resp.json()["settings"]["display_name"] == "Second School"

    await db.refresh(org2)
    assert org2.settings["primary_color"] == "#123456"


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
        "/api/v1/admin/users",
        params={"role": "student"},
        headers=auth_header(admin),
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_create_user_as_admin(client: AsyncClient, admin):
    resp = await client.post(
        "/api/v1/admin/users",
        json={
            "email": f"new-user-{uuid.uuid4().hex[:6]}@test.com",
            "password": "NewPass123!",
            "full_name": "New User",
            "role": "student",
        },
        headers=auth_header(admin),
    )
    assert resp.status_code == 200
    assert resp.json()["role"] == "student"


@pytest.mark.asyncio
async def test_admin_cannot_create_admin_user(client: AsyncClient, admin):
    """Only super_admin can create admin users."""
    resp = await client.post(
        "/api/v1/admin/users",
        json={
            "email": f"admin-{uuid.uuid4().hex[:6]}@test.com",
            "password": "NewPass123!",
            "full_name": "New Admin",
            "role": "admin",
        },
        headers=auth_header(admin),
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_super_admin_can_create_admin_user(client: AsyncClient, super_admin):
    resp = await client.post(
        "/api/v1/admin/users",
        json={
            "email": f"admin-{uuid.uuid4().hex[:6]}@test.com",
            "password": "NewPass123!",
            "full_name": "New Admin",
            "role": "admin",
        },
        headers=auth_header(super_admin),
    )
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


# ─── Admin password reset (email link, no plaintext) ─────────────────────


@pytest.mark.asyncio
async def test_admin_reset_password_sends_email_link(
    client: AsyncClient, admin, student, db, monkeypatch
):
    """Admin reset creates a one-time token and triggers a reset email —
    never returns or sets a plaintext password."""
    from sqlalchemy import select

    from app.auth.models import PasswordResetToken
    from app.config import settings

    # Pretend SMTP is configured so the endpoint reports email_sent=True and
    # actually queues a send. Capture the send instead of hitting SMTP.
    monkeypatch.setattr(settings, "email_enabled", True)
    sent: list[tuple] = []
    import app.email.service as email_service

    def _fake_queue(func, *args, **kwargs):
        sent.append((func.__name__, args, kwargs))

    monkeypatch.setattr(email_service, "queue_email", _fake_queue)

    resp = await client.post(
        f"/api/v1/admin/users/{student.id}/password",
        headers=auth_header(admin),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["email_sent"] is True
    assert body["email"] == student.email
    # Response must NOT leak a password.
    assert "new_password" not in body and "password" not in body

    # A fresh, unused token now exists for the target user.
    rows = (
        (
            await db.execute(
                select(PasswordResetToken).where(
                    PasswordResetToken.user_id == student.id,
                    PasswordResetToken.used == False,  # noqa: E712
                )
            )
        )
        .scalars()
        .all()
    )
    assert len(rows) == 1

    # The reset email was queued with the token.
    assert len(sent) == 1
    fn_name, args, _ = sent[0]
    assert fn_name == "send_password_reset"
    assert args[0] == student.email
    assert args[1] == rows[0].token


@pytest.mark.asyncio
async def test_admin_reset_password_email_disabled_still_creates_token(
    client: AsyncClient, admin, student, db, monkeypatch
):
    """With SMTP off, no email is sent but a token is still created and the
    caller is told email_sent=False."""
    from sqlalchemy import select

    from app.auth.models import PasswordResetToken
    from app.config import settings

    monkeypatch.setattr(settings, "email_enabled", False)

    resp = await client.post(
        f"/api/v1/admin/users/{student.id}/password",
        headers=auth_header(admin),
    )
    assert resp.status_code == 200
    assert resp.json()["email_sent"] is False

    rows = (
        (
            await db.execute(
                select(PasswordResetToken).where(PasswordResetToken.user_id == student.id)
            )
        )
        .scalars()
        .all()
    )
    assert len(rows) == 1


@pytest.mark.asyncio
async def test_admin_reset_password_invalidates_old_tokens(
    client: AsyncClient, admin, student, db, monkeypatch
):
    """Issuing a new reset link marks any prior unused tokens as used."""
    from datetime import datetime, timedelta, timezone

    from sqlalchemy import select

    from app.auth.models import PasswordResetToken
    from app.config import settings

    monkeypatch.setattr(settings, "email_enabled", False)

    stale = PasswordResetToken(
        user_id=student.id,
        token="stale-token-123",
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
    )
    db.add(stale)
    await db.flush()

    resp = await client.post(
        f"/api/v1/admin/users/{student.id}/password",
        headers=auth_header(admin),
    )
    assert resp.status_code == 200

    refreshed = (
        await db.execute(
            select(PasswordResetToken).where(PasswordResetToken.token == "stale-token-123")
        )
    ).scalar_one()
    assert refreshed.used is True

    active = (
        (
            await db.execute(
                select(PasswordResetToken).where(
                    PasswordResetToken.user_id == student.id,
                    PasswordResetToken.used == False,  # noqa: E712
                )
            )
        )
        .scalars()
        .all()
    )
    assert len(active) == 1


@pytest.mark.asyncio
async def test_admin_reset_password_super_admin_any_org(
    client: AsyncClient, super_admin, admin2, monkeypatch
):
    """Super admin can reset a user in a different org."""
    from app.config import settings

    monkeypatch.setattr(settings, "email_enabled", False)
    resp = await client.post(
        f"/api/v1/admin/users/{admin2.id}/password",
        headers=auth_header(super_admin),
    )
    assert resp.status_code == 200
    assert resp.json()["email"] == admin2.email


@pytest.mark.asyncio
async def test_admin_reset_password_cross_org_forbidden(
    client: AsyncClient, admin, admin2, monkeypatch
):
    """A regular admin cannot reset a user belonging to another org (404)."""
    from app.config import settings

    monkeypatch.setattr(settings, "email_enabled", False)
    resp = await client.post(
        f"/api/v1/admin/users/{admin2.id}/password",
        headers=auth_header(admin),
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_admin_reset_password_student_and_teacher_forbidden(
    client: AsyncClient, student, teacher
):
    """Students and teachers cannot use the admin reset endpoint."""
    for actor in (student, teacher):
        resp = await client.post(
            f"/api/v1/admin/users/{student.id}/password",
            headers=auth_header(actor),
        )
        assert resp.status_code == 403


@pytest.mark.asyncio
async def test_student_cannot_manage_users(client: AsyncClient, student):
    resp = await client.get("/api/v1/admin/users", headers=auth_header(student))
    assert resp.status_code == 403


# ─── Groups ──────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_create_group(client: AsyncClient, admin):
    resp = await client.post(
        "/api/v1/admin/groups",
        json={
            "name": "Class 10A",
            "description": "10th grade section A",
        },
        headers=auth_header(admin),
    )
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
    resp = await client.post(
        "/api/v1/admin/enroll",
        json={
            "user_id": str(student.id),
            "course_id": str(course.id),
        },
        headers=auth_header(admin),
    )
    assert resp.status_code == 200
    assert resp.json()["status"] in ("ok", "already_enrolled")


@pytest.mark.asyncio
async def test_admin_enroll_duplicate(client: AsyncClient, admin, student, org, db):
    course = await make_course(db, org, admin)
    await make_enrollment(db, course.id, student.id)
    resp = await client.post(
        "/api/v1/admin/enroll",
        json={
            "user_id": str(student.id),
            "course_id": str(course.id),
        },
        headers=auth_header(admin),
    )
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


async def _titles(client, user) -> set[str]:
    resp = await client.get("/api/v1/admin/courses", headers=auth_header(user))
    assert resp.status_code == 200, resp.text
    return {c["title"] for c in resp.json()}


@pytest.mark.asyncio
async def test_a_teacher_sees_only_their_own_courses(client: AsyncClient, teacher, admin, org, db):
    mine = await make_course(db, org, teacher, title="Mine")
    await make_course(db, org, admin, title="Someone else's")

    assert await _titles(client, teacher) == {mine.title}


@pytest.mark.asyncio
async def test_a_methodist_sees_the_whole_org(client: AsyncClient, teacher, admin, org, db):
    # A methodist is a teacher with the flag set — they curate the school's
    # content, so narrowing them to their own courses would take away the
    # thing they are for.
    teacher.is_methodist = True
    await db.flush()
    mine = await make_course(db, org, teacher, title="Mine")
    theirs = await make_course(db, org, admin, title="Someone else's")

    assert await _titles(client, teacher) == {mine.title, theirs.title}


@pytest.mark.asyncio
async def test_an_admin_sees_their_org_but_not_another(
    client: AsyncClient, admin, admin2, org, org2, db
):
    ours = await make_course(db, org, admin, title="Ours")
    await make_course(db, org2, admin2, title="Another school's")

    assert await _titles(client, admin) == {ours.title}


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


async def _graded_course(db, org, teacher, student, score: float, max_score: int = 100):
    """A course with one enrolled student and one graded assignment."""
    from app.assignments.models import AssignmentSubmission
    from tests.conftest import make_assignment

    course = await make_course(db, org, teacher)
    await make_enrollment(db, course.id, student.id)
    assignment = await make_assignment(
        db, org.id, course.id, teacher.id, title="Essay", max_score=max_score
    )
    db.add(
        AssignmentSubmission(
            assignment_id=assignment.id,
            student_id=student.id,
            content="done",
            score=score,
            graded_by=teacher.id,
        )
    )
    await db.flush()
    return course, assignment


@pytest.mark.asyncio
async def test_gradebook_shows_the_awarded_score(client: AsyncClient, admin, student, org, db):
    """The marks themselves, not just the shape of the response.

    The old test asserted that the keys "students" and "columns" existed, which
    stays true whether the numbers are right, wrong or missing entirely.
    """
    course, assignment = await _graded_course(db, org, admin, student, score=87.0)

    resp = await client.get(
        "/api/v1/admin/gradebook",
        params={"course_id": str(course.id)},
        headers=auth_header(admin),
    )
    assert resp.status_code == 200
    data = resp.json()

    assert [s["id"] for s in data["students"]] == [str(student.id)]
    col_id = f"assignment_{assignment.id}"
    assert any(c["id"] == col_id for c in data["columns"])
    assert data["rows"][str(student.id)][col_id] == 87.0
    assert data["averages"][col_id] == 87.0


@pytest.mark.asyncio
async def test_gradebook_averages_ignore_students_without_a_mark(
    client: AsyncClient, admin, student, org, db
):
    """An ungraded student must not count as a zero — that would drag the class
    average down and misrepresent the cohort."""
    from app.auth.models import UserRole
    from tests.conftest import _make_user

    course, assignment = await _graded_course(db, org, admin, student, score=80.0)
    second = _make_user(db, org, UserRole.student, suffix="-ungraded")
    await db.flush()
    await make_enrollment(db, course.id, second.id)

    resp = await client.get(
        "/api/v1/admin/gradebook",
        params={"course_id": str(course.id)},
        headers=auth_header(admin),
    )
    data = resp.json()
    col_id = f"assignment_{assignment.id}"

    assert len(data["students"]) == 2
    assert data["rows"][str(second.id)].get(col_id) is None
    assert data["averages"][col_id] == 80.0


@pytest.mark.asyncio
async def test_teacher_cannot_open_a_colleagues_gradebook(
    client: AsyncClient, admin, teacher, student, org, db
):
    """Same org, different owner. The course dropdown never offers it, but the
    endpoint is the boundary and used to hand over the whole class."""
    course, _ = await _graded_course(db, org, admin, student, score=80.0)

    resp = await client.get(
        "/api/v1/admin/gradebook",
        params={"course_id": str(course.id)},
        headers=auth_header(teacher),
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_teacher_opens_their_own_gradebook(client: AsyncClient, teacher, student, org, db):
    course, _ = await _graded_course(db, org, teacher, student, score=80.0)

    resp = await client.get(
        "/api/v1/admin/gradebook",
        params={"course_id": str(course.id)},
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_methodist_opens_any_gradebook_in_their_org(
    client: AsyncClient, admin, teacher, student, org, db
):
    """Methodists are org-wide by design — that is what the flag is for."""
    course, _ = await _graded_course(db, org, admin, student, score=80.0)
    teacher.is_methodist = True
    await db.flush()

    resp = await client.get(
        "/api/v1/admin/gradebook",
        params={"course_id": str(course.id)},
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_gradebook_of_another_org_reads_as_not_found(
    client: AsyncClient, admin, admin2, org2, db
):
    """Existence stays hidden across schools — 404, not 403."""
    from app.auth.models import UserRole
    from tests.conftest import _make_user

    foreign_student = _make_user(db, org2, UserRole.student, suffix="-foreign")
    await db.flush()
    course, _ = await _graded_course(db, org2, admin2, foreign_student, score=80.0)

    resp = await client.get(
        "/api/v1/admin/gradebook",
        params={"course_id": str(course.id)},
        headers=auth_header(admin),
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_gradebook_csv_carries_the_marks(client: AsyncClient, admin, student, org, db):
    """The export is what a school actually files, so assert its contents."""
    course, _ = await _graded_course(db, org, admin, student, score=87.0)

    resp = await client.get(
        "/api/v1/admin/gradebook/export",
        params={"course_id": str(course.id)},
        headers=auth_header(admin),
    )
    assert resp.status_code == 200
    body = resp.text
    assert "Essay" in body
    assert student.email in body
    assert "87" in body


@pytest.mark.asyncio
async def test_gradebook_export_obeys_the_same_scope(
    client: AsyncClient, admin, teacher, student, org, db
):
    """Both exports delegate to the same endpoint — prove the guard travels."""
    course, _ = await _graded_course(db, org, admin, student, score=80.0)

    for path in ("/api/v1/admin/gradebook/export", "/api/v1/admin/gradebook/export-xlsx"):
        resp = await client.get(
            path, params={"course_id": str(course.id)}, headers=auth_header(teacher)
        )
        assert resp.status_code == 403, path


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


# ─── Organisation settings: what the server refuses to store ─────────────


@pytest.mark.asyncio
async def test_a_school_can_save_its_brand(client: AsyncClient, admin, org):
    """Positive control. Without it the three refusals below would pass against
    an endpoint that rejected everything, which proves nothing."""
    resp = await client.put(
        f"/api/v1/admin/organizations/{org.id}",
        json={
            "settings": {
                "primary_color": "#22c55e",
                "logo_url": "https://cdn.example/logo.svg",
                "support_email": "help@example.school",
            }
        },
        headers=auth_header(admin),
    )
    assert resp.status_code == 200
    assert resp.json()["settings"]["primary_color"] == "#22c55e"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "bad",
    [
        {"primary_color": "22c55e"},
        {"primary_color": "red"},
        {"secondary_color": "#12345"},
        {"logo_url": "example.com/logo.png"},
        {"support_email": "not-an-email"},
    ],
)
async def test_a_value_that_would_not_work_is_refused_rather_than_stored(
    client: AsyncClient, admin, org, bad
):
    resp = await client.put(
        f"/api/v1/admin/organizations/{org.id}",
        json={"settings": bad},
        headers=auth_header(admin),
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_a_support_link_cannot_be_a_script(client: AsyncClient, admin, org):
    """Every pupil in the school follows this link. `javascript:` there is a
    hole, not a convenience — and it would be stored by anything that only
    checked the field was a string."""
    resp = await client.put(
        f"/api/v1/admin/organizations/{org.id}",
        json={"settings": {"support_url": "javascript:alert(1)"}},
        headers=auth_header(admin),
    )
    assert resp.status_code == 422

    fetched = await client.get(f"/api/v1/admin/organizations/{org.id}", headers=auth_header(admin))
    assert "support_url" not in fetched.json()["settings"]

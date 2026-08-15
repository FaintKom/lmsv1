"""Tests for parent portal — role gate, school-mediated linking, ownership.

The linking tests are written against the rule that broke here once: a parent
must not be able to decide whose child they are. Until 2026-08-15 the endpoint
was self-service and the suite passed anyway, because every test asked whether
a *stranger's* row was reachable (another org, an unknown address) and none
asked the obvious one — a parent of this school pointing at a classmate.
"""

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
async def test_parent_cannot_link_a_child_to_themselves(client: AsyncClient, parent, student):
    """The hole this file exists to keep shut.

    A parent account in the school aiming at any student in the school. It used
    to answer 200 and hand over that child's grades and progress.
    """
    resp = await client.post(
        "/api/v1/parent/links",
        json={"student_id": str(student.id), "parent_email": parent.email},
        headers=auth_header(parent),
    )
    assert resp.status_code == 403

    listed = await client.get("/api/v1/parent/children", headers=auth_header(parent))
    assert listed.json() == []


@pytest.mark.asyncio
async def test_student_cannot_link_a_parent(client: AsyncClient, student, parent):
    resp = await client.post(
        "/api/v1/parent/links",
        json={"student_id": str(student.id), "parent_email": parent.email},
        headers=auth_header(student),
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_admin_links_parent_then_parent_sees_the_child(
    client: AsyncClient, admin, parent, student
):
    resp = await client.post(
        "/api/v1/parent/links",
        json={"student_id": str(student.id), "parent_email": parent.email},
        headers=auth_header(admin),
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["child_id"] == str(student.id)

    listed = await client.get("/api/v1/parent/children", headers=auth_header(parent))
    assert [c["id"] for c in listed.json()] == [str(student.id)]

    progress = await client.get(
        f"/api/v1/parent/children/{student.id}/progress", headers=auth_header(parent)
    )
    assert progress.status_code == 200


@pytest.mark.asyncio
async def test_linking_twice_is_rejected(client: AsyncClient, admin, parent, student):
    body = {"student_id": str(student.id), "parent_email": parent.email}
    first = await client.post("/api/v1/parent/links", json=body, headers=auth_header(admin))
    assert first.status_code == 200
    second = await client.post("/api/v1/parent/links", json=body, headers=auth_header(admin))
    assert second.status_code == 400


@pytest.mark.asyncio
async def test_teacher_cannot_link_a_student_they_do_not_teach(
    client: AsyncClient, teacher, parent, student
):
    """Plain teachers are scoped to their own students, same as the profile page."""
    resp = await client.post(
        "/api/v1/parent/links",
        json={"student_id": str(student.id), "parent_email": parent.email},
        headers=auth_header(teacher),
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_link_unknown_parent_email_400(client: AsyncClient, admin, student):
    resp = await client.post(
        "/api/v1/parent/links",
        json={
            "student_id": str(student.id),
            "parent_email": "nobody@nowhere.example.com",
        },
        headers=auth_header(admin),
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_cannot_link_a_parent_from_another_school(
    client: AsyncClient, db, org2, admin, student
):
    foreign_parent = _make_user(db, org2, UserRole.parent, suffix="-foreign")
    await db.flush()
    resp = await client.post(
        "/api/v1/parent/links",
        json={"student_id": str(student.id), "parent_email": foreign_parent.email},
        headers=auth_header(admin),
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_cross_org_student_reads_as_not_found(client: AsyncClient, db, org2, admin, parent):
    """Existence of another school's student stays hidden — 404, not 403."""
    foreign_child = _make_user(db, org2, UserRole.student, suffix="-foreign")
    await db.flush()
    resp = await client.post(
        "/api/v1/parent/links",
        json={"student_id": str(foreign_child.id), "parent_email": parent.email},
        headers=auth_header(admin),
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_staff_can_undo_a_link(client: AsyncClient, admin, parent, student):
    """A wrong link hands out a child's grades, so it has to be reversible."""
    body = {"student_id": str(student.id), "parent_email": parent.email}
    assert (
        await client.post("/api/v1/parent/links", json=body, headers=auth_header(admin))
    ).status_code == 200

    removed = await client.delete(
        "/api/v1/parent/links",
        params=body,
        headers=auth_header(admin),
    )
    assert removed.status_code == 200

    listed = await client.get("/api/v1/parent/children", headers=auth_header(parent))
    assert listed.json() == []

    grades = await client.get(
        f"/api/v1/parent/children/{student.id}/grades", headers=auth_header(parent)
    )
    assert grades.status_code == 403


@pytest.mark.asyncio
async def test_parent_cannot_undo_their_own_link(client: AsyncClient, admin, parent, student):
    body = {"student_id": str(student.id), "parent_email": parent.email}
    await client.post("/api/v1/parent/links", json=body, headers=auth_header(admin))
    resp = await client.delete("/api/v1/parent/links", params=body, headers=auth_header(parent))
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_unlinked_child_progress_403(client: AsyncClient, parent, student):
    resp = await client.get(
        f"/api/v1/parent/children/{student.id}/progress", headers=auth_header(parent)
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_unlinked_child_grades_403(client: AsyncClient, parent, student):
    resp = await client.get(
        f"/api/v1/parent/children/{student.id}/grades", headers=auth_header(parent)
    )
    assert resp.status_code == 403

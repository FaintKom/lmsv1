"""Who may read the waitlist, and what analytics shows across schools.

Neither module had a defect. Both had rules that hold today and nothing
pinning them:

  - The waitlist holds addresses, IPs and user agents of people who are not
    users of anything — prospects. It is super-admin-only, and the submit
    endpoint answers identically for a new and an existing address so it
    cannot be used to test whether someone signed up. That second property is
    a deliberate design note in the router and was untested; an "improvement"
    returning "already registered" would quietly turn it into an email
    prober.
  - Analytics v2 is org-scoped through _org_filter on every query, and the
    dashboards check both org and owner. `org2` did not appear once in either
    analytics test file, so the isolation was implemented and unproven.
"""

from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient

from app.auth.models import UserRole
from tests.conftest import (
    _make_user,
    auth_header,
    make_course,
    make_exercise,
    make_lesson,
    make_module,
)

# ── Waitlist: who may read it ────────────────────────────────────────────


@pytest.mark.asyncio
async def test_anyone_may_join_the_waitlist(client: AsyncClient):
    resp = await client.post(
        "/api/v1/waitlist", json={"email": "prospect@example.com", "source": "landing"}
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_a_repeat_address_is_indistinguishable_from_a_new_one(client: AsyncClient):
    """The anti-enumeration property, stated in the router and untested.

    If the second call ever answers differently, the endpoint becomes a way to
    ask "is this person on the list?" without any credentials.
    """
    body = {"email": "twice@example.com"}
    first = await client.post("/api/v1/waitlist", json=body)
    second = await client.post("/api/v1/waitlist", json=body)

    assert first.status_code == second.status_code == 200
    assert first.json() == second.json()


@pytest.mark.asyncio
async def test_a_school_admin_cannot_read_the_waitlist(client: AsyncClient, admin):
    """Prospect emails and IPs are platform data, not tenant data."""
    resp = await client.get("/api/v1/waitlist", headers=auth_header(admin))
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_a_teacher_cannot_read_the_waitlist(client: AsyncClient, teacher):
    resp = await client.get("/api/v1/waitlist", headers=auth_header(teacher))
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_an_anonymous_caller_cannot_read_the_waitlist(client: AsyncClient):
    resp = await client.get("/api/v1/waitlist")
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_the_super_admin_can(client: AsyncClient, super_admin):
    await client.post("/api/v1/waitlist", json={"email": "listed@example.com"})

    resp = await client.get("/api/v1/waitlist", headers=auth_header(super_admin))
    assert resp.status_code == 200
    assert "listed@example.com" in resp.text


@pytest.mark.asyncio
async def test_marking_contacted_is_super_admin_only(client: AsyncClient, admin):
    resp = await client.post(
        f"/api/v1/waitlist/{uuid.uuid4()}/mark-contacted", headers=auth_header(admin)
    )
    assert resp.status_code == 403


# ── Analytics: nothing from another school ───────────────────────────────


@pytest.mark.asyncio
async def test_student_risks_never_names_another_schools_pupil(
    client: AsyncClient, db, org2, admin
):
    """This report lists students by name and email, so a leak here is a leak
    of people, not of numbers."""
    outsider = _make_user(db, org2, UserRole.student, suffix="-risky")
    await db.flush()

    resp = await client.get("/api/v1/admin/analytics/v2/student-risks", headers=auth_header(admin))
    assert resp.status_code == 200
    assert outsider.email not in resp.text


@pytest.mark.asyncio
async def test_exercise_difficulty_stops_at_the_school_boundary(
    client: AsyncClient, db, org2, admin, admin2
):
    course = await make_course(db, org2, admin2)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    await make_exercise(db, lesson.id, org2.id, title="Their private exercise")

    resp = await client.get(
        "/api/v1/admin/analytics/v2/exercise-difficulty", headers=auth_header(admin)
    )
    assert resp.status_code == 200
    assert "Their private exercise" not in resp.text


@pytest.mark.asyncio
async def test_a_funnel_for_another_schools_course_is_empty(
    client: AsyncClient, db, org2, admin, admin2
):
    """Reads as an empty report rather than 404 — the shape the widget expects."""
    course = await make_course(db, org2, admin2)
    module = await make_module(db, course.id)
    await make_lesson(db, module.id)

    resp = await client.get(
        f"/api/v1/admin/analytics/v2/courses/{course.id}/funnel",
        headers=auth_header(admin),
    )
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_analytics_is_closed_to_students_and_parents(client: AsyncClient, student, parent):
    for who in (student, parent):
        resp = await client.get(
            "/api/v1/admin/analytics/v2/student-risks", headers=auth_header(who)
        )
        assert resp.status_code == 403


# ── Analytics: dashboards belong to one person in one school ─────────────


@pytest.mark.asyncio
async def test_a_dashboard_from_another_school_is_not_reachable(
    client: AsyncClient, db, org2, admin, admin2
):
    from app.analytics.models import AdminDashboard

    theirs = AdminDashboard(
        org_id=org2.id,
        user_id=admin2.id,
        name="Their dashboard",
        view_scope="org",
        layout={},
        filters={},
    )
    db.add(theirs)
    await db.flush()

    read = await client.get(f"/api/v1/admin/dashboards/{theirs.id}", headers=auth_header(admin))
    assert read.status_code == 404

    edited = await client.patch(
        f"/api/v1/admin/dashboards/{theirs.id}",
        json={"name": "Renamed by a stranger"},
        headers=auth_header(admin),
    )
    assert edited.status_code == 404

    removed = await client.delete(
        f"/api/v1/admin/dashboards/{theirs.id}", headers=auth_header(admin)
    )
    assert removed.status_code == 404

    await db.refresh(theirs)
    assert theirs.name == "Their dashboard"

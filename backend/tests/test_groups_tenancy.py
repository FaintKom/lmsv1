"""Group membership must not reach across schools.

Every group endpoint confirmed the group belonged to the caller's org — and
then trusted whatever ids arrived in the body or the path. Three of them
crossed the tenant boundary as a result:

  - POST /groups/{id}/members inserted any uuid at all, so another school's
    students could be pulled into a group;
  - DELETE /groups/{id}/members/{user_id} never looked at the group, so two
    ids removed a member from any school's group;
  - POST /groups/{id}/enroll fetched the course by id alone, so a group could
    be enrolled into another school's course — and that school's gradebook is
    built from enrolments, so the strangers would appear in their register.

Membership is not cosmetic. It drives live-lesson rosters, the class
register, and who bulk enrolment puts into a course.
"""

from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import select as sa_select

from app.auth.models import UserRole
from tests.conftest import _make_user, auth_header, make_course


async def _group_in(db, org, name: str = "Class A"):
    from app.admin.models import StudentGroup

    group = StudentGroup(org_id=org.id, name=name, description="")
    db.add(group)
    await db.flush()
    return group


async def _member_ids(db, group_id) -> set[str]:
    from app.admin.models import StudentGroupMember

    rows = (
        (
            await db.execute(
                sa_select(StudentGroupMember.user_id).where(StudentGroupMember.group_id == group_id)
            )
        )
        .scalars()
        .all()
    )
    return {str(r) for r in rows}


# ── Members ──────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_a_student_from_another_school_cannot_be_added(
    client: AsyncClient, db, org, org2, admin
):
    group = await _group_in(db, org)
    outsider = _make_user(db, org2, UserRole.student, suffix="-outsider")
    await db.flush()

    resp = await client.post(
        f"/api/v1/admin/groups/{group.id}/members",
        json={"user_ids": [str(outsider.id)]},
        headers=auth_header(admin),
    )
    assert resp.status_code == 200
    assert resp.json()["added"] == 0
    assert await _member_ids(db, group.id) == set()


@pytest.mark.asyncio
async def test_an_unknown_id_is_not_added_either(client: AsyncClient, db, org, admin):
    group = await _group_in(db, org)

    resp = await client.post(
        f"/api/v1/admin/groups/{group.id}/members",
        json={"user_ids": [str(uuid.uuid4())]},
        headers=auth_header(admin),
    )
    assert resp.status_code == 200
    assert resp.json()["added"] == 0


@pytest.mark.asyncio
async def test_a_mixed_payload_adds_only_our_own(client: AsyncClient, db, org, org2, admin):
    """One bad id must not fail the whole import, nor smuggle itself in."""
    group = await _group_in(db, org)
    ours = _make_user(db, org, UserRole.student, suffix="-ours")
    outsider = _make_user(db, org2, UserRole.student, suffix="-theirs")
    await db.flush()

    resp = await client.post(
        f"/api/v1/admin/groups/{group.id}/members",
        json={"user_ids": [str(ours.id), str(outsider.id)]},
        headers=auth_header(admin),
    )
    assert resp.status_code == 200
    assert resp.json()["added"] == 1
    assert await _member_ids(db, group.id) == {str(ours.id)}


@pytest.mark.asyncio
async def test_our_own_students_are_still_added(client: AsyncClient, db, org, admin):
    group = await _group_in(db, org)
    pupil = _make_user(db, org, UserRole.student, suffix="-pupil")
    await db.flush()

    resp = await client.post(
        f"/api/v1/admin/groups/{group.id}/members",
        json={"user_ids": [str(pupil.id)]},
        headers=auth_header(admin),
    )
    assert resp.status_code == 200
    assert resp.json()["added"] == 1
    assert await _member_ids(db, group.id) == {str(pupil.id)}


@pytest.mark.asyncio
async def test_an_admin_elsewhere_cannot_remove_our_member(client: AsyncClient, db, org, admin2):
    """Two ids used to be enough to empty another school's class."""
    from app.admin.models import StudentGroupMember

    group = await _group_in(db, org)
    pupil = _make_user(db, org, UserRole.student, suffix="-kept")
    await db.flush()
    db.add(StudentGroupMember(group_id=group.id, user_id=pupil.id))
    await db.flush()

    resp = await client.delete(
        f"/api/v1/admin/groups/{group.id}/members/{pupil.id}",
        headers=auth_header(admin2),
    )
    assert resp.status_code == 404
    assert await _member_ids(db, group.id) == {str(pupil.id)}


@pytest.mark.asyncio
async def test_our_own_admin_can_still_remove_a_member(client: AsyncClient, db, org, admin):
    from app.admin.models import StudentGroupMember

    group = await _group_in(db, org)
    pupil = _make_user(db, org, UserRole.student, suffix="-leaving")
    await db.flush()
    db.add(StudentGroupMember(group_id=group.id, user_id=pupil.id))
    await db.flush()

    resp = await client.delete(
        f"/api/v1/admin/groups/{group.id}/members/{pupil.id}",
        headers=auth_header(admin),
    )
    assert resp.status_code == 200
    assert await _member_ids(db, group.id) == set()


# ── Enrolment ────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_a_group_cannot_be_enrolled_into_another_schools_course(
    client: AsyncClient, db, org, org2, admin, admin2
):
    """Their gradebook lists whoever is enrolled, so this wrote into it."""
    from app.admin.models import StudentGroupMember
    from app.progress.models import Enrollment

    group = await _group_in(db, org)
    pupil = _make_user(db, org, UserRole.student, suffix="-enrollee")
    await db.flush()
    db.add(StudentGroupMember(group_id=group.id, user_id=pupil.id))
    await db.flush()

    their_course = await make_course(db, org2, admin2)

    resp = await client.post(
        f"/api/v1/admin/groups/{group.id}/enroll",
        json={"course_id": str(their_course.id)},
        headers=auth_header(admin),
    )
    assert resp.status_code == 404

    rows = (
        (await db.execute(sa_select(Enrollment).where(Enrollment.course_id == their_course.id)))
        .scalars()
        .all()
    )
    assert rows == []


@pytest.mark.asyncio
async def test_a_group_is_still_enrolled_into_our_own_course(client: AsyncClient, db, org, admin):
    from app.admin.models import StudentGroupMember

    group = await _group_in(db, org)
    pupil = _make_user(db, org, UserRole.student, suffix="-ourenrollee")
    await db.flush()
    db.add(StudentGroupMember(group_id=group.id, user_id=pupil.id))
    await db.flush()

    course = await make_course(db, org, admin)

    resp = await client.post(
        f"/api/v1/admin/groups/{group.id}/enroll",
        json={"course_id": str(course.id)},
        headers=auth_header(admin),
    )
    assert resp.status_code == 200


# ── Group itself ─────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_another_schools_group_is_hidden_from_reads_and_writes(
    client: AsyncClient, db, org2, admin
):
    """These already held — pinned so the new guards cannot regress them."""
    group = await _group_in(db, org2, name="Their class")

    listed = await client.get(
        f"/api/v1/admin/groups/{group.id}/members", headers=auth_header(admin)
    )
    assert listed.status_code == 404

    edited = await client.put(
        f"/api/v1/admin/groups/{group.id}",
        json={"name": "Renamed by a stranger"},
        headers=auth_header(admin),
    )
    assert edited.status_code == 404

    removed = await client.delete(f"/api/v1/admin/groups/{group.id}", headers=auth_header(admin))
    assert removed.status_code == 404

"""A methodist sees the whole school — including on their own dashboard.

Measured in prod on 2026-08-24: a methodist opened `/admin`, read
"MY COURSES 0 · MY STUDENTS 0", and directly underneath the same page listed
three journal days of a course in her school. Two places keyed on
``role == teacher`` alone — a methodist has that role too — while every other
module asks ``_is_org_wide``.

The tests below use a course owned by *somebody else*: that is the whole
point. A methodist owns nothing and must still see the school.
"""

import uuid
from datetime import datetime, timezone

from app.auth.models import User, UserRole
from app.auth.security import hash_password
from tests.conftest import auth_header, make_course


async def _staff(db, org, name, *, methodist=False):
    u = User(
        org_id=org.id,
        email=f"teacher-{uuid.uuid4().hex[:8]}@test.com",
        hashed_password=hash_password("TestPass123!"),
        full_name=name,
        role=UserRole.teacher,
        is_active=True,
        is_methodist=methodist,
        consent_accepted_at=datetime.now(timezone.utc),
    )
    db.add(u)
    await db.flush()
    return u


async def test_methodist_dashboard_counts_the_schools_courses(client, org, db):
    owner = await _staff(db, org, "Course Owner")
    await make_course(db, org, owner)

    methodist = await _staff(db, org, "Мария", methodist=True)

    resp = await client.get("/api/v1/admin/teacher-stats", headers=auth_header(methodist))
    assert resp.status_code == 200, resp.text
    assert resp.json()["my_courses"] >= 1


async def test_methodist_course_list_is_not_empty(client, org, db):
    owner = await _staff(db, org, "Course Owner")
    await make_course(db, org, owner)

    methodist = await _staff(db, org, "Мария", methodist=True)

    resp = await client.get("/api/v1/courses/", headers=auth_header(methodist))
    assert resp.status_code == 200, resp.text
    assert resp.json()["total"] >= 1


async def test_school_wide_analytics_is_closed_to_a_class_teacher(client, org, db):
    """Measured on the QA stack 2026-08-24: it named another teacher's pupil.

    ``analytics/v2/student-risks`` and its ten neighbours read the school
    through ``_org_filter``, which knows about organisations and nothing about
    roles. The owner's call was to close the door rather than narrow eleven
    queries — a class teacher already has the scoped "needs attention" block.
    """
    methodist = await _staff(db, org, "Мария", methodist=True)
    teacher = await _staff(db, org, "Игорь")

    for path in (
        "/api/v1/admin/analytics/v2/student-risks",
        "/api/v1/admin/analytics/detailed",
        "/api/v1/admin/dashboard",
    ):
        # Positive control: the door is not simply broken.
        ok = await client.get(path, headers=auth_header(methodist))
        assert ok.status_code == 200, f"{path}: {ok.text}"

        shut = await client.get(path, headers=auth_header(teacher))
        assert shut.status_code == 403, f"{path}: {shut.text}"


async def test_a_plain_teacher_still_sees_only_their_own(client, org, db):
    owner = await _staff(db, org, "Course Owner")
    await make_course(db, org, owner)

    stranger = await _staff(db, org, "Stranger")

    # Positive control: the owner sees their course, so the endpoint works.
    mine = await client.get("/api/v1/courses/", headers=auth_header(owner))
    assert mine.json()["total"] >= 1

    resp = await client.get("/api/v1/courses/", headers=auth_header(stranger))
    assert resp.status_code == 200, resp.text
    assert resp.json()["total"] == 0

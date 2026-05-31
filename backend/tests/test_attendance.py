"""Attendance marking + roster prefill + summary + RBAC/org-isolation tests."""
from app.auth.models import UserRole
from tests.conftest import (
    _make_user,
    auth_header,
    make_course,
    make_enrollment,
)

SESSION = "2026-05-31"


async def _enrolled_student(db, org, course, n):
    s = _make_user(db, org, UserRole.student, suffix=str(n))
    await db.flush()
    await make_enrollment(db, course.id, s.id)
    return s


# ── mark → roster prefill ───────────────────────────────────────────────────


async def test_mark_then_roster_prefills(client, db, org, teacher):
    course = await make_course(db, org, teacher)
    s1 = await _enrolled_student(db, org, course, 1)
    s2 = await _enrolled_student(db, org, course, 2)

    # Roster before marking: both present in roster, status None.
    r = await client.get(
        "/api/v1/attendance/roster",
        params={"course_id": str(course.id), "session_date": SESSION},
        headers=auth_header(teacher),
    )
    assert r.status_code == 200, r.text
    roster = {row["student_id"]: row for row in r.json()["roster"]}
    assert set(roster) == {str(s1.id), str(s2.id)}
    assert all(row["status"] is None for row in roster.values())

    # Mark s1 late with a note, s2 present.
    resp = await client.post(
        "/api/v1/attendance",
        json={
            "records": [
                {"student_id": str(s1.id), "course_id": str(course.id),
                 "session_date": SESSION, "status": "late", "note": "bus"},
                {"student_id": str(s2.id), "course_id": str(course.id),
                 "session_date": SESSION, "status": "present"},
            ]
        },
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"created": 2, "updated": 0}

    # Roster now prefilled.
    r2 = await client.get(
        "/api/v1/attendance/roster",
        params={"course_id": str(course.id), "session_date": SESSION},
        headers=auth_header(teacher),
    )
    roster2 = {row["student_id"]: row for row in r2.json()["roster"]}
    assert roster2[str(s1.id)]["status"] == "late"
    assert roster2[str(s1.id)]["note"] == "bus"
    assert roster2[str(s2.id)]["status"] == "present"


async def test_remark_updates_not_duplicates(client, db, org, teacher):
    course = await make_course(db, org, teacher)
    s1 = await _enrolled_student(db, org, course, 1)

    base = {"student_id": str(s1.id), "course_id": str(course.id), "session_date": SESSION}
    r1 = await client.post(
        "/api/v1/attendance", json={"records": [{**base, "status": "absent"}]},
        headers=auth_header(teacher),
    )
    assert r1.json() == {"created": 1, "updated": 0}

    r2 = await client.post(
        "/api/v1/attendance", json={"records": [{**base, "status": "present"}]},
        headers=auth_header(teacher),
    )
    assert r2.json() == {"created": 0, "updated": 1}

    roster = await client.get(
        "/api/v1/attendance/roster",
        params={"course_id": str(course.id), "session_date": SESSION},
        headers=auth_header(teacher),
    )
    rows = {row["student_id"]: row for row in roster.json()["roster"]}
    assert rows[str(s1.id)]["status"] == "present"


# ── summary counts ──────────────────────────────────────────────────────────


async def test_summary_counts(client, db, org, teacher):
    course = await make_course(db, org, teacher)
    s1 = await _enrolled_student(db, org, course, 1)

    for d, status in [("2026-05-29", "present"), ("2026-05-30", "late"), ("2026-05-31", "present")]:
        await client.post(
            "/api/v1/attendance",
            json={"records": [{"student_id": str(s1.id), "course_id": str(course.id),
                               "session_date": d, "status": status}]},
            headers=auth_header(teacher),
        )

    r = await client.get(
        "/api/v1/attendance/summary",
        params={"course_id": str(course.id)},
        headers=auth_header(teacher),
    )
    assert r.status_code == 200, r.text
    summ = r.json()["summary"][str(s1.id)]
    assert summ["present"] == 2
    assert summ["late"] == 1
    assert summ["total"] == 3
    assert summ["student_name"]  # name attached


# ── org isolation ───────────────────────────────────────────────────────────


async def test_teacher_cannot_mark_other_orgs_student(client, db, org, org2, teacher, admin2):
    # Course + student live in org2; teacher belongs to org.
    other_course = await make_course(db, org2, admin2)
    other_student = _make_user(db, org2, UserRole.student, suffix="x")
    await db.flush()
    await make_enrollment(db, other_course.id, other_student.id)

    # Roster across orgs → 404 (existence hidden).
    r = await client.get(
        "/api/v1/attendance/roster",
        params={"course_id": str(other_course.id), "session_date": SESSION},
        headers=auth_header(teacher),
    )
    assert r.status_code == 404, r.text


async def test_teacher_cannot_roster_colleague_course(client, db, org, teacher):
    # Course owned by a different teacher in the same org.
    colleague = _make_user(db, org, UserRole.teacher, suffix="c")
    await db.flush()
    course = await make_course(db, org, colleague)

    r = await client.get(
        "/api/v1/attendance/roster",
        params={"course_id": str(course.id), "session_date": SESSION},
        headers=auth_header(teacher),
    )
    assert r.status_code == 403, r.text


async def test_admin_sees_org_wide_roster(client, db, org, admin, teacher):
    # Course owned by a teacher; org admin can still pull the roster.
    course = await make_course(db, org, teacher)
    await _enrolled_student(db, org, course, 1)

    r = await client.get(
        "/api/v1/attendance/roster",
        params={"course_id": str(course.id), "session_date": SESSION},
        headers=auth_header(admin),
    )
    assert r.status_code == 200, r.text
    assert len(r.json()["roster"]) == 1


# ── student self-view ───────────────────────────────────────────────────────


async def test_student_my_only_sees_own(client, db, org, teacher):
    course = await make_course(db, org, teacher)
    s1 = await _enrolled_student(db, org, course, 1)
    s2 = await _enrolled_student(db, org, course, 2)

    await client.post(
        "/api/v1/attendance",
        json={"records": [
            {"student_id": str(s1.id), "course_id": str(course.id),
             "session_date": SESSION, "status": "present"},
            {"student_id": str(s2.id), "course_id": str(course.id),
             "session_date": SESSION, "status": "absent"},
        ]},
        headers=auth_header(teacher),
    )

    r = await client.get("/api/v1/attendance/my", headers=auth_header(s1))
    assert r.status_code == 200, r.text
    records = r.json()["records"]
    assert len(records) == 1
    assert records[0]["status"] == "present"
    assert records[0]["course_title"] == course.title


async def test_student_cannot_mark(client, db, org, teacher):
    course = await make_course(db, org, teacher)
    s1 = await _enrolled_student(db, org, course, 1)
    r = await client.post(
        "/api/v1/attendance",
        json={"records": [{"student_id": str(s1.id), "course_id": str(course.id),
                           "session_date": SESSION, "status": "present"}]},
        headers=auth_header(s1),
    )
    assert r.status_code == 403, r.text


# ── upsert course_id IS NULL handling ───────────────────────────────────────


async def test_upsert_null_course_distinct_from_course(client, db, org, teacher):
    """A record with no course must not collide with a course-scoped one."""
    course = await make_course(db, org, teacher)
    s1 = await _enrolled_student(db, org, course, 1)

    # Mark with course.
    await client.post(
        "/api/v1/attendance",
        json={"records": [{"student_id": str(s1.id), "course_id": str(course.id),
                           "session_date": SESSION, "status": "present"}]},
        headers=auth_header(teacher),
    )
    # Mark same student/date WITHOUT course → should create, not update.
    r = await client.post(
        "/api/v1/attendance",
        json={"records": [{"student_id": str(s1.id),
                           "session_date": SESSION, "status": "absent"}]},
        headers=auth_header(teacher),
    )
    assert r.json() == {"created": 1, "updated": 0}, r.text

    # Re-mark the null-course one → updates the same row.
    r2 = await client.post(
        "/api/v1/attendance",
        json={"records": [{"student_id": str(s1.id),
                           "session_date": SESSION, "status": "excused"}]},
        headers=auth_header(teacher),
    )
    assert r2.json() == {"created": 0, "updated": 1}, r2.text

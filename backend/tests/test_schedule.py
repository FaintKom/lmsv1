"""Weekly timetable (schedule) tests: CRUD, validation, RBAC, org isolation."""
from app.auth.models import UserRole
from tests.conftest import (
    _make_user,
    auth_header,
    make_course,
    make_enrollment,
)


def _slot_body(course_id, **over):
    body = {
        "course_id": str(course_id),
        "day_of_week": 0,
        "start_time": "09:00",
        "end_time": "10:30",
        "location": "Room 101",
        "note": "weekly lecture",
    }
    body.update(over)
    return body


async def _enrolled_student(db, org, course, n):
    s = _make_user(db, org, UserRole.student, suffix=str(n))
    await db.flush()
    await make_enrollment(db, course.id, s.id)
    return s


# ── create + validation ──────────────────────────────────────────────────


async def test_create_slot(client, db, org, teacher):
    course = await make_course(db, org, teacher)
    r = await client.post(
        "/api/v1/schedule", json=_slot_body(course.id), headers=auth_header(teacher)
    )
    assert r.status_code == 201, r.text
    slot = r.json()
    assert slot["day_of_week"] == 0
    assert slot["start_time"] == "09:00"
    assert slot["end_time"] == "10:30"
    assert slot["location"] == "Room 101"
    assert slot["course_title"] == course.title
    assert slot["active"] is True


async def test_create_rejects_end_before_start(client, db, org, teacher):
    course = await make_course(db, org, teacher)
    r = await client.post(
        "/api/v1/schedule",
        json=_slot_body(course.id, start_time="10:00", end_time="09:00"),
        headers=auth_header(teacher),
    )
    assert r.status_code == 422, r.text


async def test_create_rejects_equal_times(client, db, org, teacher):
    course = await make_course(db, org, teacher)
    r = await client.post(
        "/api/v1/schedule",
        json=_slot_body(course.id, start_time="09:00", end_time="09:00"),
        headers=auth_header(teacher),
    )
    assert r.status_code == 422, r.text


async def test_create_rejects_bad_day(client, db, org, teacher):
    course = await make_course(db, org, teacher)
    r = await client.post(
        "/api/v1/schedule",
        json=_slot_body(course.id, day_of_week=7),
        headers=auth_header(teacher),
    )
    assert r.status_code == 422, r.text


# ── list + week ────────────────────────────────────────────────────────────


async def test_list_course_slots_sorted(client, db, org, teacher):
    course = await make_course(db, org, teacher)
    # Insert out of order; expect day then start_time ordering.
    await client.post(
        "/api/v1/schedule",
        json=_slot_body(course.id, day_of_week=2, start_time="14:00", end_time="15:00"),
        headers=auth_header(teacher),
    )
    await client.post(
        "/api/v1/schedule",
        json=_slot_body(course.id, day_of_week=0, start_time="11:00", end_time="12:00"),
        headers=auth_header(teacher),
    )
    await client.post(
        "/api/v1/schedule",
        json=_slot_body(course.id, day_of_week=0, start_time="09:00", end_time="10:00"),
        headers=auth_header(teacher),
    )

    r = await client.get(
        "/api/v1/schedule",
        params={"course_id": str(course.id)},
        headers=auth_header(teacher),
    )
    assert r.status_code == 200, r.text
    slots = r.json()["slots"]
    assert [(s["day_of_week"], s["start_time"]) for s in slots] == [
        (0, "09:00"),
        (0, "11:00"),
        (2, "14:00"),
    ]


async def test_week_returns_managed_slots(client, db, org, teacher):
    course = await make_course(db, org, teacher)
    await client.post(
        "/api/v1/schedule", json=_slot_body(course.id), headers=auth_header(teacher)
    )
    r = await client.get("/api/v1/schedule/week", headers=auth_header(teacher))
    assert r.status_code == 200, r.text
    slots = r.json()["slots"]
    assert len(slots) == 1
    assert slots[0]["course_title"] == course.title


# ── update + delete ─────────────────────────────────────────────────────────


async def test_update_slot(client, db, org, teacher):
    course = await make_course(db, org, teacher)
    created = (
        await client.post(
            "/api/v1/schedule", json=_slot_body(course.id), headers=auth_header(teacher)
        )
    ).json()

    r = await client.put(
        f"/api/v1/schedule/{created['id']}",
        json={"day_of_week": 3, "location": "Lab B", "active": False},
        headers=auth_header(teacher),
    )
    assert r.status_code == 200, r.text
    slot = r.json()
    assert slot["day_of_week"] == 3
    assert slot["location"] == "Lab B"
    assert slot["active"] is False
    # Unchanged times preserved.
    assert slot["start_time"] == "09:00"


async def test_update_rejects_invalid_time_window(client, db, org, teacher):
    course = await make_course(db, org, teacher)
    created = (
        await client.post(
            "/api/v1/schedule", json=_slot_body(course.id), headers=auth_header(teacher)
        )
    ).json()
    r = await client.put(
        f"/api/v1/schedule/{created['id']}",
        json={"end_time": "08:00"},  # before existing start 09:00
        headers=auth_header(teacher),
    )
    assert r.status_code == 422, r.text


async def test_delete_slot(client, db, org, teacher):
    course = await make_course(db, org, teacher)
    created = (
        await client.post(
            "/api/v1/schedule", json=_slot_body(course.id), headers=auth_header(teacher)
        )
    ).json()

    r = await client.delete(
        f"/api/v1/schedule/{created['id']}", headers=auth_header(teacher)
    )
    assert r.status_code == 204, r.text

    after = await client.get(
        "/api/v1/schedule",
        params={"course_id": str(course.id)},
        headers=auth_header(teacher),
    )
    assert after.json()["slots"] == []


# ── RBAC + org isolation ─────────────────────────────────────────────────────


async def test_teacher_cannot_add_to_colleague_course(client, db, org, teacher):
    colleague = _make_user(db, org, UserRole.teacher, suffix="c")
    await db.flush()
    course = await make_course(db, org, colleague)

    r = await client.post(
        "/api/v1/schedule", json=_slot_body(course.id), headers=auth_header(teacher)
    )
    assert r.status_code == 403, r.text


async def test_teacher_cannot_touch_other_org(client, db, org, org2, teacher, admin2):
    other_course = await make_course(db, org2, admin2)
    r = await client.post(
        "/api/v1/schedule", json=_slot_body(other_course.id), headers=auth_header(teacher)
    )
    assert r.status_code == 404, r.text  # existence hidden across orgs


async def test_admin_sees_org_wide_week(client, db, org, admin, teacher):
    course = await make_course(db, org, teacher)  # owned by teacher
    await client.post(
        "/api/v1/schedule", json=_slot_body(course.id), headers=auth_header(teacher)
    )
    r = await client.get("/api/v1/schedule/week", headers=auth_header(admin))
    assert r.status_code == 200, r.text
    assert len(r.json()["slots"]) == 1


async def test_student_cannot_write(client, db, org, teacher):
    course = await make_course(db, org, teacher)
    s1 = await _enrolled_student(db, org, course, 1)
    r = await client.post(
        "/api/v1/schedule", json=_slot_body(course.id), headers=auth_header(s1)
    )
    assert r.status_code == 403, r.text


# ── student /my ───────────────────────────────────────────────────────────


async def test_student_my_only_enrolled_courses(client, db, org, teacher):
    enrolled_course = await make_course(db, org, teacher)
    other_course = await make_course(db, org, teacher)
    s1 = await _enrolled_student(db, org, enrolled_course, 1)

    await client.post(
        "/api/v1/schedule",
        json=_slot_body(enrolled_course.id),
        headers=auth_header(teacher),
    )
    await client.post(
        "/api/v1/schedule",
        json=_slot_body(other_course.id, day_of_week=1),
        headers=auth_header(teacher),
    )

    r = await client.get("/api/v1/schedule/my", headers=auth_header(s1))
    assert r.status_code == 200, r.text
    slots = r.json()["slots"]
    assert len(slots) == 1
    assert slots[0]["course_id"] == str(enrolled_course.id)
    assert slots[0]["course_title"] == enrolled_course.title


async def test_teacher_my_returns_own_course_slots(client, db, org, teacher):
    course = await make_course(db, org, teacher)
    await client.post(
        "/api/v1/schedule", json=_slot_body(course.id), headers=auth_header(teacher)
    )
    r = await client.get("/api/v1/schedule/my", headers=auth_header(teacher))
    assert r.status_code == 200, r.text
    assert len(r.json()["slots"]) == 1

"""Weekly timetable (schedule) tests: CRUD, validation, RBAC, org isolation."""
from sqlalchemy import func, select

from app.auth.models import UserRole
from app.notifications.models import Notification
from tests.conftest import (
    _make_user,
    auth_header,
    make_course,
    make_enrollment,
)


async def _notif_count(db, user_id) -> int:
    return (
        await db.execute(
            select(func.count(Notification.id)).where(
                Notification.user_id == user_id
            )
        )
    ).scalar() or 0


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


# ── online (Jitsi) slots ────────────────────────────────────────────────────


async def test_offline_slot_has_no_room_url(client, db, org, teacher):
    course = await make_course(db, org, teacher)
    r = await client.post(
        "/api/v1/schedule", json=_slot_body(course.id), headers=auth_header(teacher)
    )
    assert r.status_code == 201, r.text
    slot = r.json()
    assert slot["is_online"] is False
    assert slot["room_url"] is None


async def test_online_slot_round_trips_with_room_url(client, db, org, teacher):
    course = await make_course(db, org, teacher)
    r = await client.post(
        "/api/v1/schedule",
        json=_slot_body(course.id, is_online=True),
        headers=auth_header(teacher),
    )
    assert r.status_code == 201, r.text
    slot = r.json()
    assert slot["is_online"] is True
    assert slot["room_url"] == f"https://meet.jit.si/grasslms-slot-{slot['id'].replace('-', '')[:12]}"

    # Reflected by the listing endpoints too.
    listed = (
        await client.get(
            "/api/v1/schedule",
            params={"course_id": str(course.id)},
            headers=auth_header(teacher),
        )
    ).json()["slots"]
    assert listed[0]["is_online"] is True
    assert listed[0]["room_url"] == slot["room_url"]


async def test_update_can_toggle_online(client, db, org, teacher):
    course = await make_course(db, org, teacher)
    created = (
        await client.post(
            "/api/v1/schedule", json=_slot_body(course.id), headers=auth_header(teacher)
        )
    ).json()
    assert created["is_online"] is False

    r = await client.put(
        f"/api/v1/schedule/{created['id']}",
        json={"is_online": True},
        headers=auth_header(teacher),
    )
    assert r.status_code == 200, r.text
    assert r.json()["is_online"] is True
    assert r.json()["room_url"] is not None


# ── schedule-change notifications ───────────────────────────────────────────


async def test_create_notifies_enrolled_students(client, db, org, teacher):
    course = await make_course(db, org, teacher)
    s1 = await _enrolled_student(db, org, course, 1)
    s2 = await _enrolled_student(db, org, course, 2)

    r = await client.post(
        "/api/v1/schedule", json=_slot_body(course.id), headers=auth_header(teacher)
    )
    assert r.status_code == 201, r.text

    assert await _notif_count(db, s1.id) == 1
    assert await _notif_count(db, s2.id) == 1
    # Notification points at the schedule page.
    notif = (
        await db.execute(
            select(Notification).where(Notification.user_id == s1.id)
        )
    ).scalar_one()
    assert notif.link == "/schedule"
    assert course.title in notif.body


async def test_update_and_delete_notify_enrolled_students(client, db, org, teacher):
    course = await make_course(db, org, teacher)
    s1 = await _enrolled_student(db, org, course, 1)

    created = (
        await client.post(
            "/api/v1/schedule", json=_slot_body(course.id), headers=auth_header(teacher)
        )
    ).json()
    assert await _notif_count(db, s1.id) == 1  # from create

    r = await client.put(
        f"/api/v1/schedule/{created['id']}",
        json={"location": "Lab B"},
        headers=auth_header(teacher),
    )
    assert r.status_code == 200, r.text
    assert await _notif_count(db, s1.id) == 2  # + update

    r = await client.delete(
        f"/api/v1/schedule/{created['id']}", headers=auth_header(teacher)
    )
    assert r.status_code == 204, r.text
    assert await _notif_count(db, s1.id) == 3  # + delete


async def test_non_enrolled_student_not_notified(client, db, org, teacher):
    enrolled_course = await make_course(db, org, teacher)
    other_course = await make_course(db, org, teacher)
    enrolled = await _enrolled_student(db, org, enrolled_course, 1)
    # A student enrolled only in a DIFFERENT course.
    bystander = await _enrolled_student(db, org, other_course, 2)

    r = await client.post(
        "/api/v1/schedule",
        json=_slot_body(enrolled_course.id),
        headers=auth_header(teacher),
    )
    assert r.status_code == 201, r.text

    assert await _notif_count(db, enrolled.id) == 1
    assert await _notif_count(db, bystander.id) == 0


async def test_notify_does_not_break_other_org(client, db, org, org2, teacher, admin2):
    """RBAC + org isolation unchanged; cross-org write still hidden as 404."""
    other_course = await make_course(db, org2, admin2)
    r = await client.post(
        "/api/v1/schedule",
        json=_slot_body(other_course.id),
        headers=auth_header(teacher),
    )
    assert r.status_code == 404, r.text


# ── room link + clash detection ──────────────────────────────────────────────


async def _make_room(client, admin, name="Room 1"):
    r = await client.post(
        "/api/v1/rooms", json={"name": name}, headers=auth_header(admin)
    )
    assert r.status_code == 201, r.text
    return r.json()


async def test_slot_with_room_id_round_trips(client, db, org, admin, teacher):
    course = await make_course(db, org, teacher)
    room = await _make_room(client, admin)
    r = await client.post(
        "/api/v1/schedule",
        json=_slot_body(course.id, room_id=room["id"]),
        headers=auth_header(teacher),
    )
    assert r.status_code == 201, r.text
    slot = r.json()
    assert slot["room_id"] == room["id"]
    assert slot["room_name"] == room["name"]
    # Reflected by the listing endpoint too.
    listed = (
        await client.get(
            "/api/v1/schedule",
            params={"course_id": str(course.id)},
            headers=auth_header(teacher),
        )
    ).json()["slots"]
    assert listed[0]["room_id"] == room["id"]
    assert listed[0]["room_name"] == room["name"]


async def test_room_clash_returns_409(client, db, org, admin, teacher):
    course = await make_course(db, org, teacher)
    room = await _make_room(client, admin)
    # First booking 09:00–10:30.
    first = await client.post(
        "/api/v1/schedule",
        json=_slot_body(course.id, room_id=room["id"]),
        headers=auth_header(teacher),
    )
    assert first.status_code == 201, first.text
    # Overlapping 10:00–11:00 same room/day → conflict.
    r = await client.post(
        "/api/v1/schedule",
        json=_slot_body(
            course.id, room_id=room["id"], start_time="10:00", end_time="11:00"
        ),
        headers=auth_header(teacher),
    )
    assert r.status_code == 409, r.text
    detail = r.json()["detail"]
    assert detail["code"] == "room_conflict"
    assert len(detail["conflicts"]) == 1
    assert detail["conflicts"][0]["slot_id"] == first.json()["id"]
    assert detail["conflicts"][0]["course_title"] == course.title


async def test_force_overrides_clash_with_warning(client, db, org, admin, teacher):
    course = await make_course(db, org, teacher)
    room = await _make_room(client, admin)
    await client.post(
        "/api/v1/schedule",
        json=_slot_body(course.id, room_id=room["id"]),
        headers=auth_header(teacher),
    )
    r = await client.post(
        "/api/v1/schedule",
        params={"force": "true"},
        json=_slot_body(
            course.id, room_id=room["id"], start_time="10:00", end_time="11:00"
        ),
        headers=auth_header(teacher),
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["warning"]["code"] == "room_conflict"
    assert len(body["warning"]["conflicts"]) == 1


async def test_non_overlapping_same_room_ok(client, db, org, admin, teacher):
    course = await make_course(db, org, teacher)
    room = await _make_room(client, admin)
    await client.post(
        "/api/v1/schedule",
        json=_slot_body(course.id, room_id=room["id"]),  # 09:00–10:30
        headers=auth_header(teacher),
    )
    # Touching edge: 10:30–11:30 does NOT overlap.
    r = await client.post(
        "/api/v1/schedule",
        json=_slot_body(
            course.id, room_id=room["id"], start_time="10:30", end_time="11:30"
        ),
        headers=auth_header(teacher),
    )
    assert r.status_code == 201, r.text


async def test_same_room_different_day_ok(client, db, org, admin, teacher):
    course = await make_course(db, org, teacher)
    room = await _make_room(client, admin)
    await client.post(
        "/api/v1/schedule",
        json=_slot_body(course.id, room_id=room["id"], day_of_week=0),
        headers=auth_header(teacher),
    )
    r = await client.post(
        "/api/v1/schedule",
        json=_slot_body(course.id, room_id=room["id"], day_of_week=1),
        headers=auth_header(teacher),
    )
    assert r.status_code == 201, r.text


async def test_online_slot_skips_clash(client, db, org, admin, teacher):
    course = await make_course(db, org, teacher)
    room = await _make_room(client, admin)
    await client.post(
        "/api/v1/schedule",
        json=_slot_body(course.id, room_id=room["id"]),
        headers=auth_header(teacher),
    )
    # An online slot drops its room and never clashes.
    r = await client.post(
        "/api/v1/schedule",
        json=_slot_body(course.id, room_id=room["id"], is_online=True),
        headers=auth_header(teacher),
    )
    assert r.status_code == 201, r.text
    assert r.json()["room_id"] is None
    assert r.json()["is_online"] is True


async def test_update_into_clash_returns_409(client, db, org, admin, teacher):
    course = await make_course(db, org, teacher)
    room = await _make_room(client, admin)
    await client.post(
        "/api/v1/schedule",
        json=_slot_body(course.id, room_id=room["id"]),  # 09:00–10:30
        headers=auth_header(teacher),
    )
    # Second slot in a different (free) window, no room.
    second = (
        await client.post(
            "/api/v1/schedule",
            json=_slot_body(course.id, start_time="14:00", end_time="15:00"),
            headers=auth_header(teacher),
        )
    ).json()
    # Move it into the booked room + overlapping window → 409.
    r = await client.put(
        f"/api/v1/schedule/{second['id']}",
        json={"room_id": room["id"], "start_time": "10:00", "end_time": "11:00"},
        headers=auth_header(teacher),
    )
    assert r.status_code == 409, r.text
    assert r.json()["detail"]["code"] == "room_conflict"

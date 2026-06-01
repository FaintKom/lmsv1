"""Phase E1: sites CRUD + RBAC + org isolation, room kind/meeting_url/site_id,
teacher double-booking clash, capacity soft-warning, offline-vs-online clash
scoping.
"""
import uuid
from datetime import datetime, timezone

from app.admin.models import StudentGroup, StudentGroupMember
from app.auth.models import User, UserRole
from app.auth.security import hash_password
from tests.conftest import auth_header, make_course


async def _new_user(db, org, role, *, is_methodist=False, suffix=""):
    u = User(
        org_id=org.id,
        email=f"{role.value}{suffix}-{uuid.uuid4().hex[:8]}@test.com",
        hashed_password=hash_password("TestPass123!"),
        full_name=f"Test {role.value}{suffix}",
        role=role,
        is_active=True,
        is_methodist=is_methodist,
        consent_accepted_at=datetime.now(timezone.utc),
        privacy_policy_version="1.0",
    )
    db.add(u)
    await db.flush()
    return u


async def _make_group(db, org, *, course, teacher, name="Group A"):
    g = StudentGroup(
        org_id=org.id,
        name=name,
        course_id=course.id,
        teacher_id=teacher.id,
        status="active",
    )
    db.add(g)
    await db.flush()
    return g


# ── sites CRUD + RBAC ─────────────────────────────────────────────────────────


async def test_methodist_can_create_site(client, db, org):
    methodist = await _new_user(db, org, UserRole.teacher, is_methodist=True, suffix="m")
    r = await client.post(
        "/api/v1/sites",
        json={"name": "Main Campus", "timezone": "Europe/Paris"},
        headers=auth_header(methodist),
    )
    assert r.status_code == 201, r.text
    site = r.json()
    assert site["name"] == "Main Campus"
    assert site["timezone"] == "Europe/Paris"
    assert site["is_active"] is True
    assert site["org_id"] == str(org.id)


async def test_create_site_defaults_timezone(client, db, org, admin):
    r = await client.post(
        "/api/v1/sites", json={"name": "Branch"}, headers=auth_header(admin)
    )
    assert r.status_code == 201, r.text
    assert r.json()["timezone"] == "Europe/Berlin"


async def test_plain_teacher_cannot_create_site(client, db, org, teacher):
    r = await client.post(
        "/api/v1/sites", json={"name": "X"}, headers=auth_header(teacher)
    )
    assert r.status_code == 403, r.text


async def test_student_cannot_read_or_write_sites(client, db, org, student):
    assert (
        await client.get("/api/v1/sites", headers=auth_header(student))
    ).status_code == 403
    assert (
        await client.post(
            "/api/v1/sites", json={"name": "X"}, headers=auth_header(student)
        )
    ).status_code == 403


async def test_teacher_can_read_sites(client, db, org, admin, teacher):
    await client.post(
        "/api/v1/sites", json={"name": "S1"}, headers=auth_header(admin)
    )
    r = await client.get("/api/v1/sites", headers=auth_header(teacher))
    assert r.status_code == 200, r.text
    assert [s["name"] for s in r.json()["sites"]] == ["S1"]


async def test_update_and_delete_site(client, db, org, admin):
    created = (
        await client.post(
            "/api/v1/sites", json={"name": "S1"}, headers=auth_header(admin)
        )
    ).json()
    r = await client.put(
        f"/api/v1/sites/{created['id']}",
        json={"name": "S1b", "is_active": False, "timezone": "UTC"},
        headers=auth_header(admin),
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["name"] == "S1b"
    assert body["is_active"] is False
    assert body["timezone"] == "UTC"

    d = await client.delete(
        f"/api/v1/sites/{created['id']}", headers=auth_header(admin)
    )
    assert d.status_code == 204, d.text
    assert (
        await client.get("/api/v1/sites", headers=auth_header(admin))
    ).json()["sites"] == []


async def test_site_org_isolation(client, db, org, org2, admin, admin2):
    await client.post(
        "/api/v1/sites", json={"name": "Org1 Site"}, headers=auth_header(admin)
    )
    await client.post(
        "/api/v1/sites", json={"name": "Org2 Site"}, headers=auth_header(admin2)
    )
    sites1 = (
        await client.get("/api/v1/sites", headers=auth_header(admin))
    ).json()["sites"]
    assert [s["name"] for s in sites1] == ["Org1 Site"]


async def test_cannot_update_other_org_site(client, db, org, org2, admin, admin2):
    created = (
        await client.post(
            "/api/v1/sites", json={"name": "Org2 Site"}, headers=auth_header(admin2)
        )
    ).json()
    r = await client.put(
        f"/api/v1/sites/{created['id']}",
        json={"name": "x"},
        headers=auth_header(admin),
    )
    assert r.status_code == 404, r.text


# ── room kind / meeting_url / site_id round-trip ──────────────────────────────


async def test_offline_room_with_site_round_trips(client, db, org, admin):
    site = (
        await client.post(
            "/api/v1/sites", json={"name": "Campus"}, headers=auth_header(admin)
        )
    ).json()
    r = await client.post(
        "/api/v1/rooms",
        json={"name": "Room 7", "capacity": 20, "site_id": site["id"]},
        headers=auth_header(admin),
    )
    assert r.status_code == 201, r.text
    room = r.json()
    assert room["kind"] == "offline"
    assert room["site_id"] == site["id"]
    assert room["meeting_url"] is None


async def test_online_room_round_trips(client, db, org, admin):
    r = await client.post(
        "/api/v1/rooms",
        json={
            "name": "Zoom-1",
            "kind": "online",
            "meeting_url": "https://zoom.example/abc",
        },
        headers=auth_header(admin),
    )
    assert r.status_code == 201, r.text
    room = r.json()
    assert room["kind"] == "online"
    assert room["meeting_url"] == "https://zoom.example/abc"
    # Online rooms never carry a site (org-wide pool).
    assert room["site_id"] is None


async def test_online_room_drops_site_id(client, db, org, admin):
    site = (
        await client.post(
            "/api/v1/sites", json={"name": "Campus"}, headers=auth_header(admin)
        )
    ).json()
    r = await client.post(
        "/api/v1/rooms",
        json={
            "name": "Hybrid?",
            "kind": "online",
            "site_id": site["id"],
            "meeting_url": "https://meet.example/x",
        },
        headers=auth_header(admin),
    )
    assert r.status_code == 201, r.text
    assert r.json()["site_id"] is None


async def test_offline_room_drops_meeting_url(client, db, org, admin):
    r = await client.post(
        "/api/v1/rooms",
        json={"name": "Phys", "kind": "offline", "meeting_url": "https://x"},
        headers=auth_header(admin),
    )
    assert r.status_code == 201, r.text
    assert r.json()["meeting_url"] is None


async def test_invalid_room_kind_rejected(client, db, org, admin):
    r = await client.post(
        "/api/v1/rooms",
        json={"name": "Bad", "kind": "hybrid"},
        headers=auth_header(admin),
    )
    assert r.status_code == 422, r.text


async def test_room_site_id_org_isolation(client, db, org, org2, admin, admin2):
    other_site = (
        await client.post(
            "/api/v1/sites", json={"name": "Org2 Site"}, headers=auth_header(admin2)
        )
    ).json()
    # admin (org1) cannot attach a room to org2's site.
    r = await client.post(
        "/api/v1/rooms",
        json={"name": "X", "site_id": other_site["id"]},
        headers=auth_header(admin),
    )
    assert r.status_code == 422, r.text


async def test_update_room_kind_to_online(client, db, org, admin):
    site = (
        await client.post(
            "/api/v1/sites", json={"name": "Campus"}, headers=auth_header(admin)
        )
    ).json()
    room = (
        await client.post(
            "/api/v1/rooms",
            json={"name": "R", "site_id": site["id"]},
            headers=auth_header(admin),
        )
    ).json()
    r = await client.put(
        f"/api/v1/rooms/{room['id']}",
        json={"kind": "online", "meeting_url": "https://meet.example/y"},
        headers=auth_header(admin),
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["kind"] == "online"
    assert body["meeting_url"] == "https://meet.example/y"
    assert body["site_id"] is None  # online drops the site


# ── teacher double-booking clash ──────────────────────────────────────────────


def _slot_body(group, **over):
    body = {
        "group_id": str(group.id),
        "day_of_week": 0,
        "start_time": "09:00",
        "end_time": "10:30",
    }
    body.update(over)
    return body


async def test_teacher_double_booking_returns_409(client, db, org, admin, teacher):
    # Two groups, SAME teacher, two different courses.
    c1 = await make_course(db, org, teacher)
    c2 = await make_course(db, org, teacher)
    g1 = await _make_group(db, org, course=c1, teacher=teacher, name="G1")
    g2 = await _make_group(db, org, course=c2, teacher=teacher, name="G2")

    first = await client.post(
        "/api/v1/schedule", json=_slot_body(g1), headers=auth_header(admin)
    )
    assert first.status_code == 201, first.text
    # Overlapping window, same teacher (via g2.teacher_id) → 409 teacher clash.
    r = await client.post(
        "/api/v1/schedule",
        json=_slot_body(g2, start_time="10:00", end_time="11:00"),
        headers=auth_header(admin),
    )
    assert r.status_code == 409, r.text
    detail = r.json()["detail"]
    assert detail["code"] == "room_conflict"
    assert detail["conflicts"] == []  # no room booked
    assert len(detail["teacher_conflicts"]) == 1
    assert detail["teacher_conflicts"][0]["slot_id"] == first.json()["id"]
    assert detail["teacher_conflicts"][0]["type"] == "teacher"


async def test_teacher_double_booking_force_override(client, db, org, admin, teacher):
    c1 = await make_course(db, org, teacher)
    c2 = await make_course(db, org, teacher)
    g1 = await _make_group(db, org, course=c1, teacher=teacher, name="G1")
    g2 = await _make_group(db, org, course=c2, teacher=teacher, name="G2")
    await client.post(
        "/api/v1/schedule", json=_slot_body(g1), headers=auth_header(admin)
    )
    r = await client.post(
        "/api/v1/schedule",
        params={"force": "true"},
        json=_slot_body(g2, start_time="10:00", end_time="11:00"),
        headers=auth_header(admin),
    )
    assert r.status_code == 201, r.text
    warnings = r.json()["warnings"]
    assert any(
        w["type"] == "teacher" and len(w["conflicts"]) == 1 for w in warnings
    )


async def test_different_teachers_no_clash(client, db, org, admin):
    t1 = await _new_user(db, org, UserRole.teacher, suffix="t1")
    t2 = await _new_user(db, org, UserRole.teacher, suffix="t2")
    c1 = await make_course(db, org, t1)
    c2 = await make_course(db, org, t2)
    g1 = await _make_group(db, org, course=c1, teacher=t1, name="G1")
    g2 = await _make_group(db, org, course=c2, teacher=t2, name="G2")
    await client.post(
        "/api/v1/schedule", json=_slot_body(g1), headers=auth_header(admin)
    )
    r = await client.post(
        "/api/v1/schedule",
        json=_slot_body(g2, start_time="10:00", end_time="11:00"),
        headers=auth_header(admin),
    )
    assert r.status_code == 201, r.text


async def test_same_teacher_non_overlapping_ok(client, db, org, admin, teacher):
    c1 = await make_course(db, org, teacher)
    c2 = await make_course(db, org, teacher)
    g1 = await _make_group(db, org, course=c1, teacher=teacher, name="G1")
    g2 = await _make_group(db, org, course=c2, teacher=teacher, name="G2")
    await client.post(
        "/api/v1/schedule", json=_slot_body(g1), headers=auth_header(admin)
    )
    # Touching edge — no overlap.
    r = await client.post(
        "/api/v1/schedule",
        json=_slot_body(g2, start_time="10:30", end_time="11:30"),
        headers=auth_header(admin),
    )
    assert r.status_code == 201, r.text


# ── offline clash scoped by site (same room name, different site) ─────────────


async def test_same_room_name_different_site_no_clash(client, db, org, admin, teacher):
    """Two distinct rooms (separate ids) at different sites never share a booking.

    Room clash is keyed on ``room_id`` (a unique physical room). A room named
    "Room 1" at site A and another "Room 1" at site B are separate rooms, so
    booking both in the same window does not clash.
    """
    site_a = (
        await client.post(
            "/api/v1/sites", json={"name": "Site A"}, headers=auth_header(admin)
        )
    ).json()
    site_b = (
        await client.post(
            "/api/v1/sites", json={"name": "Site B"}, headers=auth_header(admin)
        )
    ).json()
    room_a = (
        await client.post(
            "/api/v1/rooms",
            json={"name": "Room 1", "site_id": site_a["id"]},
            headers=auth_header(admin),
        )
    ).json()
    room_b = (
        await client.post(
            "/api/v1/rooms",
            json={"name": "Room 1", "site_id": site_b["id"]},
            headers=auth_header(admin),
        )
    ).json()
    # Two groups with DIFFERENT teachers so only the room dimension is in play
    # (a shared teacher would itself double-book on the overlap).
    t2 = await _new_user(db, org, UserRole.teacher, suffix="t2")
    c1 = await make_course(db, org, teacher)
    c2 = await make_course(db, org, t2)
    g1 = await _make_group(db, org, course=c1, teacher=teacher, name="G1")
    g2 = await _make_group(db, org, course=c2, teacher=t2, name="G2")
    await client.post(
        "/api/v1/schedule",
        json=_slot_body(g1, room_id=room_a["id"]),
        headers=auth_header(admin),
    )
    # Same window in the same-named room at the OTHER site → no clash.
    r = await client.post(
        "/api/v1/schedule",
        json=_slot_body(g2, room_id=room_b["id"], start_time="10:00", end_time="11:00"),
        headers=auth_header(admin),
    )
    assert r.status_code == 201, r.text


async def test_online_room_clash_org_wide(client, db, org, admin, teacher):
    """An online room (site_id null) still double-books org-wide."""
    online = (
        await client.post(
            "/api/v1/rooms",
            json={
                "name": "Zoom-1",
                "kind": "online",
                "meeting_url": "https://zoom.example/a",
            },
            headers=auth_header(admin),
        )
    ).json()
    c1 = await make_course(db, org, teacher)
    c2 = await make_course(db, org, teacher)
    # Different teachers so only the ROOM clash fires (isolate the assertion).
    t2 = await _new_user(db, org, UserRole.teacher, suffix="t2")
    g1 = await _make_group(db, org, course=c1, teacher=teacher, name="G1")
    g2 = await _make_group(db, org, course=c2, teacher=t2, name="G2")
    first = await client.post(
        "/api/v1/schedule",
        json=_slot_body(g1, room_id=online["id"]),
        headers=auth_header(admin),
    )
    assert first.status_code == 201, first.text
    r = await client.post(
        "/api/v1/schedule",
        json=_slot_body(
            g2, room_id=online["id"], start_time="10:00", end_time="11:00"
        ),
        headers=auth_header(admin),
    )
    assert r.status_code == 409, r.text
    detail = r.json()["detail"]
    assert len(detail["conflicts"]) == 1
    assert detail["conflicts"][0]["type"] == "room"


# ── capacity soft warning ─────────────────────────────────────────────────────


async def test_capacity_over_room_soft_warning_not_block(client, db, org, admin, teacher):
    room = (
        await client.post(
            "/api/v1/rooms",
            json={"name": "Tiny", "capacity": 1},
            headers=auth_header(admin),
        )
    ).json()
    course = await make_course(db, org, teacher)
    g = await _make_group(db, org, course=course, teacher=teacher)
    # Two members → exceeds capacity of 1.
    for i in range(2):
        s = await _new_user(db, org, UserRole.student, suffix=f"m{i}")
        db.add(StudentGroupMember(group_id=g.id, user_id=s.id))
    await db.flush()

    r = await client.post(
        "/api/v1/schedule",
        json=_slot_body(g, room_id=room["id"]),
        headers=auth_header(admin),
    )
    # NOT a 409 — capacity is a soft warning only.
    assert r.status_code == 201, r.text
    warnings = r.json().get("warnings", [])
    cap = [w for w in warnings if w["type"] == "capacity"]
    assert len(cap) == 1
    assert cap[0]["members"] == 2
    assert cap[0]["capacity"] == 1


async def test_capacity_within_room_no_warning(client, db, org, admin, teacher):
    room = (
        await client.post(
            "/api/v1/rooms",
            json={"name": "Big", "capacity": 30},
            headers=auth_header(admin),
        )
    ).json()
    course = await make_course(db, org, teacher)
    g = await _make_group(db, org, course=course, teacher=teacher)
    s = await _new_user(db, org, UserRole.student, suffix="m0")
    db.add(StudentGroupMember(group_id=g.id, user_id=s.id))
    await db.flush()
    r = await client.post(
        "/api/v1/schedule",
        json=_slot_body(g, room_id=room["id"]),
        headers=auth_header(admin),
    )
    assert r.status_code == 201, r.text
    assert "warnings" not in r.json()


# ── room-board surfaces kind + video ─────────────────────────────────────────


async def test_room_board_includes_kind_and_video(client, db, org, admin, teacher):
    online = (
        await client.post(
            "/api/v1/rooms",
            json={
                "name": "Zoom-1",
                "kind": "online",
                "meeting_url": "https://zoom.example/a",
            },
            headers=auth_header(admin),
        )
    ).json()
    course = await make_course(db, org, teacher)
    g = await _make_group(db, org, course=course, teacher=teacher)
    # Monday slot in the online room.
    await client.post(
        "/api/v1/schedule",
        json=_slot_body(g, room_id=online["id"]),
        headers=auth_header(admin),
    )
    # 2024-01-01 is a Monday (day_of_week 0).
    r = await client.get(
        "/api/v1/journal/room-board",
        params={"date": "2024-01-01"},
        headers=auth_header(admin),
    )
    assert r.status_code == 200, r.text
    rooms = r.json()["rooms"]
    z = [room for room in rooms if room["room_id"] == online["id"]]
    assert len(z) == 1
    assert z[0]["kind"] == "online"
    assert z[0]["video"] is True
    assert z[0]["meeting_url"] == "https://zoom.example/a"

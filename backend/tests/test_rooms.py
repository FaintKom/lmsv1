"""Managed rooms: CRUD, RBAC (teacher read-only, methodist write), org isolation."""
import uuid
from datetime import datetime, timezone

from app.auth.models import User, UserRole
from app.auth.security import hash_password
from tests.conftest import auth_header


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


# ── create + RBAC ────────────────────────────────────────────────────────────


async def test_methodist_can_create_room(client, db, org):
    methodist = await _new_user(db, org, UserRole.teacher, is_methodist=True, suffix="m")
    r = await client.post(
        "/api/v1/rooms",
        json={"name": "Room 101", "capacity": 30, "site": "Main building"},
        headers=auth_header(methodist),
    )
    assert r.status_code == 201, r.text
    room = r.json()
    assert room["name"] == "Room 101"
    assert room["capacity"] == 30
    assert room["site"] == "Main building"
    assert room["active"] is True
    assert room["org_id"] == str(org.id)


async def test_admin_can_create_room(client, db, org, admin):
    r = await client.post(
        "/api/v1/rooms", json={"name": "Lab A"}, headers=auth_header(admin)
    )
    assert r.status_code == 201, r.text
    assert r.json()["capacity"] is None


async def test_plain_teacher_cannot_create_room(client, db, org, teacher):
    r = await client.post(
        "/api/v1/rooms", json={"name": "Room X"}, headers=auth_header(teacher)
    )
    assert r.status_code == 403, r.text


async def test_student_cannot_read_or_write_rooms(client, db, org, student):
    assert (
        await client.get("/api/v1/rooms", headers=auth_header(student))
    ).status_code == 403
    assert (
        await client.post(
            "/api/v1/rooms", json={"name": "X"}, headers=auth_header(student)
        )
    ).status_code == 403


# ── read (teacher allowed) ───────────────────────────────────────────────────


async def test_teacher_can_read_rooms_for_dropdown(client, db, org, admin, teacher):
    await client.post(
        "/api/v1/rooms", json={"name": "Room 1"}, headers=auth_header(admin)
    )
    r = await client.get("/api/v1/rooms", headers=auth_header(teacher))
    assert r.status_code == 200, r.text
    rooms = r.json()["rooms"]
    assert len(rooms) == 1
    assert rooms[0]["name"] == "Room 1"


async def test_list_sorted_by_name(client, db, org, admin):
    for name in ("Zeta", "Alpha", "Mu"):
        await client.post(
            "/api/v1/rooms", json={"name": name}, headers=auth_header(admin)
        )
    rooms = (
        await client.get("/api/v1/rooms", headers=auth_header(admin))
    ).json()["rooms"]
    assert [x["name"] for x in rooms] == ["Alpha", "Mu", "Zeta"]


# ── update + delete ──────────────────────────────────────────────────────────


async def test_update_room(client, db, org, admin):
    created = (
        await client.post(
            "/api/v1/rooms",
            json={"name": "Room 1", "capacity": 20},
            headers=auth_header(admin),
        )
    ).json()
    r = await client.put(
        f"/api/v1/rooms/{created['id']}",
        json={"name": "Room 1A", "capacity": 25, "active": False},
        headers=auth_header(admin),
    )
    assert r.status_code == 200, r.text
    room = r.json()
    assert room["name"] == "Room 1A"
    assert room["capacity"] == 25
    assert room["active"] is False


async def test_delete_room(client, db, org, admin):
    created = (
        await client.post(
            "/api/v1/rooms", json={"name": "Temp"}, headers=auth_header(admin)
        )
    ).json()
    r = await client.delete(
        f"/api/v1/rooms/{created['id']}", headers=auth_header(admin)
    )
    assert r.status_code == 204, r.text
    rooms = (
        await client.get("/api/v1/rooms", headers=auth_header(admin))
    ).json()["rooms"]
    assert rooms == []


async def test_teacher_cannot_update(client, db, org, admin, teacher):
    created = (
        await client.post(
            "/api/v1/rooms", json={"name": "Room 1"}, headers=auth_header(admin)
        )
    ).json()
    r = await client.put(
        f"/api/v1/rooms/{created['id']}",
        json={"name": "Hacked"},
        headers=auth_header(teacher),
    )
    assert r.status_code == 403, r.text


# ── org isolation ────────────────────────────────────────────────────────────


async def test_org_isolation_on_list(client, db, org, org2, admin, admin2):
    await client.post(
        "/api/v1/rooms", json={"name": "Org1 Room"}, headers=auth_header(admin)
    )
    await client.post(
        "/api/v1/rooms", json={"name": "Org2 Room"}, headers=auth_header(admin2)
    )
    rooms1 = (
        await client.get("/api/v1/rooms", headers=auth_header(admin))
    ).json()["rooms"]
    assert [x["name"] for x in rooms1] == ["Org1 Room"]


async def test_cannot_update_other_org_room(client, db, org, org2, admin, admin2):
    created = (
        await client.post(
            "/api/v1/rooms", json={"name": "Org2 Room"}, headers=auth_header(admin2)
        )
    ).json()
    # admin of org1 cannot see/update org2's room — existence hidden as 404.
    r = await client.put(
        f"/api/v1/rooms/{created['id']}",
        json={"name": "x"},
        headers=auth_header(admin),
    )
    assert r.status_code == 404, r.text

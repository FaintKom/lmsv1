"""Phase B — group-centric scheduling (additive, prod-safe).

Covers:
  - StudentGroup new scheduling fields round-trip via /admin/groups (and the
    ability to create multiple groups for one course).
  - Idempotent backfill: a course with slots/sessions but no group gets ONE
    default group, its slots/sessions are linked, members are backfilled from
    enrollment, and a second run adds nothing.
  - /journal/today group_id filter + group name/teacher override; without it the
    course-based agenda is unchanged.
  - /journal/sessions + /journal/day group scoping.
  - attendance roster/records scoped to a group = group members.
  - schedule slot create/update via group_id sets course_id from the group.
"""
import uuid
from datetime import date, datetime, time, timezone

from app.admin.models import StudentGroup, StudentGroupMember
from app.attendance.models import AttendanceRecord, AttendanceStatus
from app.auth.models import User, UserRole
from app.auth.security import hash_password
from app.journal.models import ClassSession
from app.journal.service import backfill_groups
from app.schedule.models import ScheduleSlot
from tests.conftest import auth_header, make_course, make_enrollment

DAY = date(2026, 5, 20)  # Wednesday (weekday() == 2)


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


async def _make_room(db, org, name="Room 1"):
    from app.rooms.models import Room

    room = Room(org_id=org.id, name=name, active=True)
    db.add(room)
    await db.flush()
    return room


async def _make_slot(db, org, course, day_of_week, *, group_id=None, start=time(9, 0),
                     end=time(10, 30), room_id=None):
    slot = ScheduleSlot(
        org_id=org.id,
        course_id=course.id,
        group_id=group_id,
        day_of_week=day_of_week,
        start_time=start,
        end_time=end,
        location="",
        room_id=room_id,
        note="",
        active=True,
    )
    db.add(slot)
    await db.flush()
    return slot


# ── StudentGroup new fields via /admin/groups ────────────────────────────────


async def test_group_scheduling_fields_round_trip(client, admin, org, db):
    course = await make_course(db, org, admin)
    teacher = await _new_user(db, org, UserRole.teacher, suffix="t")
    room = await _make_room(db, org)

    resp = await client.post(
        "/api/v1/admin/groups",
        json={
            "name": "Math 3A",
            "course_id": str(course.id),
            "teacher_id": str(teacher.id),
            "default_room_id": str(room.id),
            "status": "planned",
            "start_date": "2026-09-01",
            "end_date": "2027-05-31",
        },
        headers=auth_header(admin),
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["name"] == "Math 3A"
    assert body["course_id"] == str(course.id)
    assert body["teacher_id"] == str(teacher.id)
    assert body["default_room_id"] == str(room.id)
    assert body["status"] == "planned"
    assert body["start_date"] == "2026-09-01"
    assert body["end_date"] == "2027-05-31"
    assert body["member_count"] == 0
    gid = body["id"]

    # PUT a partial update — flip status, clear teacher.
    resp = await client.put(
        f"/api/v1/admin/groups/{gid}",
        json={"status": "active", "teacher_id": None},
        headers=auth_header(admin),
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == "active"
    assert resp.json()["teacher_id"] is None
    # Untouched fields persist.
    assert resp.json()["course_id"] == str(course.id)

    # GET list reflects the fields.
    resp = await client.get("/api/v1/admin/groups", headers=auth_header(admin))
    assert resp.status_code == 200, resp.text
    rows = {g["id"]: g for g in resp.json()}
    assert rows[gid]["status"] == "active"
    assert rows[gid]["course_id"] == str(course.id)


async def test_multiple_groups_per_course(client, admin, org, db):
    course = await make_course(db, org, admin)
    for name in ("3A morning", "3B evening"):
        resp = await client.post(
            "/api/v1/admin/groups",
            json={"name": name, "course_id": str(course.id)},
            headers=auth_header(admin),
        )
        assert resp.status_code == 200, resp.text

    resp = await client.get("/api/v1/admin/groups", headers=auth_header(admin))
    same_course = [g for g in resp.json() if g["course_id"] == str(course.id)]
    assert len(same_course) == 2


async def test_group_create_rejects_cross_org_course(client, admin, org, org2, db):
    other_course = await make_course(db, org2, await _new_user(db, org2, UserRole.teacher))
    resp = await client.post(
        "/api/v1/admin/groups",
        json={"name": "Sneaky", "course_id": str(other_course.id)},
        headers=auth_header(admin),
    )
    assert resp.status_code == 404, resp.text


# ── Idempotent backfill ───────────────────────────────────────────────────────


async def test_backfill_creates_default_group_links_and_members(client, teacher, org, db):
    course = await make_course(db, org, teacher)
    s1 = await _new_user(db, org, UserRole.student, suffix="a")
    s2 = await _new_user(db, org, UserRole.student, suffix="b")
    await make_enrollment(db, course.id, s1.id)
    await make_enrollment(db, course.id, s2.id)

    slot = await _make_slot(db, org, course, DAY.weekday())
    session = ClassSession(
        org_id=org.id, course_id=course.id, session_date=DAY, held=True, topic="x"
    )
    db.add(session)
    await db.flush()

    counters = await backfill_groups(db)
    assert counters["groups_created"] == 1
    assert counters["slots_linked"] == 1
    assert counters["sessions_linked"] == 1
    assert counters["members_added"] == 2

    # A default group was created for the course.
    group = (
        await db.execute(
            StudentGroup.__table__.select().where(StudentGroup.course_id == course.id)
        )
    ).first()
    assert group is not None
    gid = group.id
    assert group.name == course.title
    assert group.teacher_id == teacher.id
    assert group.status == "active"

    # Slot + session now point at the group.
    await db.refresh(slot)
    await db.refresh(session)
    assert slot.group_id == gid
    assert session.group_id == gid

    # Members backfilled from enrollment.
    members = (
        await db.execute(
            StudentGroupMember.__table__.select().where(
                StudentGroupMember.group_id == gid
            )
        )
    ).all()
    member_user_ids = {m.user_id for m in members}
    assert member_user_ids == {s1.id, s2.id}

    # Idempotent: second run is a no-op.
    counters2 = await backfill_groups(db)
    assert counters2 == {
        "groups_created": 0,
        "slots_linked": 0,
        "sessions_linked": 0,
        "members_added": 0,
    }
    groups = (
        await db.execute(
            StudentGroup.__table__.select().where(StudentGroup.course_id == course.id)
        )
    ).all()
    assert len(groups) == 1


async def test_backfill_skips_course_with_existing_group(client, teacher, org, db):
    course = await make_course(db, org, teacher)
    await _make_slot(db, org, course, DAY.weekday())
    # A pre-existing group already keyed to this course.
    existing = StudentGroup(org_id=org.id, name="Existing", course_id=course.id)
    db.add(existing)
    await db.flush()

    counters = await backfill_groups(db)
    assert counters["groups_created"] == 0
    # Slot is linked to the existing group (only one group for the course).
    groups = (
        await db.execute(
            StudentGroup.__table__.select().where(StudentGroup.course_id == course.id)
        )
    ).all()
    assert len(groups) == 1


# ── /journal/today group filter + override ───────────────────────────────────


async def test_today_group_filter_and_name_override(client, teacher, org, db):
    course = await make_course(db, org, teacher)
    group_teacher = await _new_user(db, org, UserRole.teacher, suffix="gt")
    group = StudentGroup(
        org_id=org.id, name="Group Alpha", course_id=course.id,
        teacher_id=group_teacher.id, status="active",
    )
    db.add(group)
    await db.flush()
    m1 = await _new_user(db, org, UserRole.student, suffix="m1")
    db.add(StudentGroupMember(group_id=group.id, user_id=m1.id))
    await db.flush()

    # One group-linked slot + one course-only slot on the same weekday.
    await _make_slot(db, org, course, DAY.weekday(), group_id=group.id,
                     start=time(9, 0), end=time(10, 0))
    await _make_slot(db, org, course, DAY.weekday(), start=time(11, 0), end=time(12, 0))

    # Without group_id: both slots appear (course behavior unchanged).
    r = await client.get(
        "/api/v1/journal/today",
        params={"date": DAY.isoformat()},
        headers=auth_header(teacher),
    )
    assert r.status_code == 200, r.text
    assert len(r.json()["agenda"]) == 2

    # With group_id: only the group's slot, with group name + teacher override.
    r = await client.get(
        "/api/v1/journal/today",
        params={"date": DAY.isoformat(), "group_id": str(group.id)},
        headers=auth_header(teacher),
    )
    assert r.status_code == 200, r.text
    agenda = r.json()["agenda"]
    assert len(agenda) == 1
    item = agenda[0]
    assert item["group_id"] == str(group.id)
    assert item["group_name"] == "Group Alpha"
    assert item["title"] == "Group Alpha"
    assert item["teacher_id"] == str(group_teacher.id)
    # roster total = group members
    assert item["attendance"]["total"] == 1


# ── /journal/sessions + /journal/day group scoping ───────────────────────────


async def test_sessions_and_day_scoped_to_group(client, teacher, org, db):
    course = await make_course(db, org, teacher)
    group = StudentGroup(org_id=org.id, name="G1", course_id=course.id, status="active")
    db.add(group)
    await db.flush()

    member = await _new_user(db, org, UserRole.student, suffix="mem")
    nonmember = await _new_user(db, org, UserRole.student, suffix="non")
    await make_enrollment(db, course.id, member.id)
    await make_enrollment(db, course.id, nonmember.id)
    db.add(StudentGroupMember(group_id=group.id, user_id=member.id))

    # Group-linked session + a course-only session on a different date.
    db.add(ClassSession(org_id=org.id, course_id=course.id, group_id=group.id,
                        session_date=DAY, held=True, topic="grp"))
    db.add(ClassSession(org_id=org.id, course_id=course.id,
                        session_date=date(2026, 5, 21), held=True, topic="course"))
    await db.flush()

    # sessions scoped to group → only the group session.
    r = await client.get(
        "/api/v1/journal/sessions",
        params={"course_id": str(course.id), "group_id": str(group.id)},
        headers=auth_header(teacher),
    )
    assert r.status_code == 200, r.text
    sess = r.json()["sessions"]
    assert len(sess) == 1
    assert sess[0]["topic"] == "grp"
    assert sess[0]["group_id"] == str(group.id)

    # Without group → both sessions.
    r = await client.get(
        "/api/v1/journal/sessions",
        params={"course_id": str(course.id)},
        headers=auth_header(teacher),
    )
    assert len(r.json()["sessions"]) == 2

    # day roster scoped to group members only.
    r = await client.get(
        "/api/v1/journal/day",
        params={"course_id": str(course.id), "session_date": DAY.isoformat(),
                "group_id": str(group.id)},
        headers=auth_header(teacher),
    )
    assert r.status_code == 200, r.text
    ids = {a["student_id"] for a in r.json()["activity"]}
    assert ids == {str(member.id)}


# ── attendance roster / records scoped to a group ─────────────────────────────


async def test_attendance_roster_group_members(client, teacher, org, db):
    course = await make_course(db, org, teacher)
    group = StudentGroup(org_id=org.id, name="G", course_id=course.id, status="active")
    db.add(group)
    await db.flush()
    member = await _new_user(db, org, UserRole.student, suffix="mem")
    nonmember = await _new_user(db, org, UserRole.student, suffix="non")
    await make_enrollment(db, course.id, member.id)
    await make_enrollment(db, course.id, nonmember.id)
    db.add(StudentGroupMember(group_id=group.id, user_id=member.id))
    await db.flush()

    # Group roster = members only.
    r = await client.get(
        "/api/v1/attendance/roster",
        params={"group_id": str(group.id), "session_date": DAY.isoformat()},
        headers=auth_header(teacher),
    )
    assert r.status_code == 200, r.text
    ids = {row["student_id"] for row in r.json()["roster"]}
    assert ids == {str(member.id)}
    assert r.json()["course_id"] == str(course.id)

    # Course roster (no group) = both enrolled students (unchanged behavior).
    r = await client.get(
        "/api/v1/attendance/roster",
        params={"course_id": str(course.id), "session_date": DAY.isoformat()},
        headers=auth_header(teacher),
    )
    ids = {row["student_id"] for row in r.json()["roster"]}
    assert ids == {str(member.id), str(nonmember.id)}


async def test_attendance_records_scoped_to_group(client, teacher, org, db):
    course = await make_course(db, org, teacher)
    group = StudentGroup(org_id=org.id, name="G", course_id=course.id, status="active")
    db.add(group)
    await db.flush()
    member = await _new_user(db, org, UserRole.student, suffix="mem")
    nonmember = await _new_user(db, org, UserRole.student, suffix="non")
    db.add(StudentGroupMember(group_id=group.id, user_id=member.id))
    db.add(AttendanceRecord(org_id=org.id, student_id=member.id, course_id=course.id,
                            session_date=DAY, status=AttendanceStatus.present))
    db.add(AttendanceRecord(org_id=org.id, student_id=nonmember.id, course_id=course.id,
                            session_date=DAY, status=AttendanceStatus.absent))
    await db.flush()

    r = await client.get(
        "/api/v1/attendance",
        params={"group_id": str(group.id)},
        headers=auth_header(teacher),
    )
    assert r.status_code == 200, r.text
    recs = r.json()["records"]
    assert {rec["student_id"] for rec in recs} == {str(member.id)}


# ── schedule slot create/update via group_id ─────────────────────────────────


async def test_create_slot_via_group_sets_course(client, teacher, org, db):
    course = await make_course(db, org, teacher)
    group = StudentGroup(org_id=org.id, name="G", course_id=course.id, status="active")
    db.add(group)
    await db.flush()

    resp = await client.post(
        "/api/v1/schedule",
        json={
            "group_id": str(group.id),
            "day_of_week": 2,
            "start_time": "09:00:00",
            "end_time": "10:00:00",
        },
        headers=auth_header(teacher),
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["group_id"] == str(group.id)
    assert body["course_id"] == str(course.id)


async def test_update_slot_repoints_group(client, teacher, org, db):
    course = await make_course(db, org, teacher)
    group = StudentGroup(org_id=org.id, name="G", course_id=course.id, status="active")
    db.add(group)
    await db.flush()
    slot = await _make_slot(db, org, course, 2)

    resp = await client.put(
        f"/api/v1/schedule/{slot.id}",
        json={"group_id": str(group.id)},
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["group_id"] == str(group.id)
    assert resp.json()["course_id"] == str(course.id)

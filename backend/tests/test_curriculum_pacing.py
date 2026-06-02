"""Phase C — curriculum scope & sequence + group pacing (additive, prod-safe).

Covers:
  - Curriculum CRUD: append at next position, partial update, reorder, delete
    closes the gap.
  - RBAC: methodist/admin write; plain teacher reads own course but cannot
    write; org isolation hides cross-org topics.
  - session.actual_topic_id round-trips through POST /journal/sessions and is
    validated against the session's course.
  - Pacing board badges (ontrack / behind / ahead) with seeded held sessions +
    KPI counts.
  - Pacing timeline coverage (covered/current/next/ahead states + dates).
"""
import uuid
from datetime import date, datetime, timezone

from app.admin.models import StudentGroup
from app.auth.models import User, UserRole
from app.auth.security import hash_password
from app.journal.models import ClassSession
from tests.conftest import auth_header, make_course

API = "/api/v1"


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


async def _make_group(db, org, course, teacher=None, *, name="Group A"):
    g = StudentGroup(
        org_id=org.id,
        name=name,
        course_id=course.id,
        teacher_id=teacher.id if teacher else None,
        status="active",
    )
    db.add(g)
    await db.flush()
    return g


async def _add_topics(client, methodist, course, specs):
    """Create topics in order; return list of created topic dicts."""
    out = []
    for spec in specs:
        resp = await client.post(
            f"{API}/curriculum",
            json={"course_id": str(course.id), **spec},
            headers=auth_header(methodist),
        )
        assert resp.status_code == 200, resp.text
        out.append(resp.json())
    return out


async def _held_session(db, org, course, group, sday, topic_id):
    s = ClassSession(
        org_id=org.id,
        course_id=course.id,
        group_id=group.id,
        session_date=sday,
        held=True,
        topic="",
        actual_topic_id=topic_id,
    )
    db.add(s)
    await db.flush()
    return s


# ── Curriculum CRUD ──────────────────────────────────────────────────────────


async def test_curriculum_crud_and_reorder(client, admin, org, db):
    methodist = await _new_user(db, org, UserRole.teacher, is_methodist=True)
    course = await make_course(db, org, admin)

    topics = await _add_topics(
        client,
        methodist,
        course,
        [
            {"title": "Intro", "planned_lessons": 2},
            {"title": "Variables"},
            {"title": "Loops", "target_date": "2026-09-15"},
        ],
    )
    # Appended at contiguous positions 1..3.
    assert [t["position"] for t in topics] == [1, 2, 3]
    assert topics[0]["planned_lessons"] == 2
    assert topics[1]["planned_lessons"] == 1  # default
    assert topics[2]["target_date"] == "2026-09-15"

    # Partial update: rename + change lessons, leave target_date untouched.
    resp = await client.put(
        f"{API}/curriculum/{topics[2]['id']}",
        json={"title": "While loops", "planned_lessons": 3},
        headers=auth_header(methodist),
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["title"] == "While loops"
    assert resp.json()["planned_lessons"] == 3
    assert resp.json()["target_date"] == "2026-09-15"

    # Reorder: move "Loops" (pos 3) to position 1.
    resp = await client.put(
        f"{API}/curriculum/{topics[2]['id']}",
        json={"position": 1},
        headers=auth_header(methodist),
    )
    assert resp.status_code == 200, resp.text
    listing = (
        await client.get(
            f"{API}/curriculum?course_id={course.id}", headers=auth_header(methodist)
        )
    ).json()["topics"]
    assert [t["title"] for t in listing] == ["While loops", "Intro", "Variables"]
    assert [t["position"] for t in listing] == [1, 2, 3]

    # Delete the middle → positions close the gap.
    resp = await client.delete(
        f"{API}/curriculum/{listing[1]['id']}", headers=auth_header(methodist)
    )
    assert resp.status_code == 200, resp.text
    listing2 = (
        await client.get(
            f"{API}/curriculum?course_id={course.id}", headers=auth_header(methodist)
        )
    ).json()["topics"]
    assert [t["title"] for t in listing2] == ["While loops", "Variables"]
    assert [t["position"] for t in listing2] == [1, 2]


async def test_curriculum_rbac_and_isolation(client, admin, org, org2, db):
    methodist = await _new_user(db, org, UserRole.teacher, is_methodist=True)
    teacher = await _new_user(db, org, UserRole.teacher)
    course = await make_course(db, org, teacher)  # teacher owns it
    topics = await _add_topics(client, methodist, course, [{"title": "T1"}])

    # Plain teacher can READ their own course's curriculum.
    resp = await client.get(
        f"{API}/curriculum?course_id={course.id}", headers=auth_header(teacher)
    )
    assert resp.status_code == 200, resp.text
    assert len(resp.json()["topics"]) == 1

    # ...but cannot WRITE.
    resp = await client.post(
        f"{API}/curriculum",
        json={"course_id": str(course.id), "title": "Nope"},
        headers=auth_header(teacher),
    )
    assert resp.status_code == 403, resp.text
    resp = await client.put(
        f"{API}/curriculum/{topics[0]['id']}",
        json={"title": "Nope"},
        headers=auth_header(teacher),
    )
    assert resp.status_code == 403

    # Admin from another org cannot see / edit (existence hidden → 404).
    other_admin = await _new_user(db, org2, UserRole.admin)
    resp = await client.get(
        f"{API}/curriculum?course_id={course.id}", headers=auth_header(other_admin)
    )
    assert resp.status_code == 404
    resp = await client.put(
        f"{API}/curriculum/{topics[0]['id']}",
        json={"title": "Hack"},
        headers=auth_header(other_admin),
    )
    assert resp.status_code == 404

    # Students are forbidden outright.
    student = await _new_user(db, org, UserRole.student)
    resp = await client.get(
        f"{API}/curriculum?course_id={course.id}", headers=auth_header(student)
    )
    assert resp.status_code == 403


# ── session.actual_topic_id ──────────────────────────────────────────────────


async def test_session_actual_topic_round_trip(client, admin, org, db):
    methodist = await _new_user(db, org, UserRole.teacher, is_methodist=True)
    course = await make_course(db, org, admin)
    topics = await _add_topics(client, methodist, course, [{"title": "T1"}, {"title": "T2"}])

    resp = await client.post(
        f"{API}/journal/sessions",
        json={
            "course_id": str(course.id),
            "session_date": "2026-09-01",
            "held": True,
            "topic": "Did T1",
            "actual_topic_id": topics[0]["id"],
        },
        headers=auth_header(methodist),
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["actual_topic_id"] == topics[0]["id"]

    # Update the same (course, date) to a different topic.
    resp = await client.post(
        f"{API}/journal/sessions",
        json={
            "course_id": str(course.id),
            "session_date": "2026-09-01",
            "held": True,
            "topic": "Actually T2",
            "actual_topic_id": topics[1]["id"],
        },
        headers=auth_header(methodist),
    )
    assert resp.status_code == 200
    assert resp.json()["actual_topic_id"] == topics[1]["id"]

    # A topic from a different course is rejected.
    other_course = await make_course(db, org, admin)
    other_topics = await _add_topics(client, methodist, other_course, [{"title": "X"}])
    resp = await client.post(
        f"{API}/journal/sessions",
        json={
            "course_id": str(course.id),
            "session_date": "2026-09-02",
            "actual_topic_id": other_topics[0]["id"],
        },
        headers=auth_header(methodist),
    )
    assert resp.status_code == 404


# ── Pacing board badges + KPIs ───────────────────────────────────────────────


async def test_pacing_board_badges(client, admin, org, db):
    methodist = await _new_user(db, org, UserRole.teacher, is_methodist=True)
    course = await make_course(db, org, admin)
    # 5 single-lesson topics.
    topics = await _add_topics(
        client, methodist, course, [{"title": f"T{i}"} for i in range(1, 6)]
    )
    tids = [uuid.UUID(t["id"]) for t in topics]

    # The (course_id, session_date) unique constraint means every held session
    # of THIS course must fall on a distinct calendar date — so we hand out
    # sequential days. The group a session belongs to is the group_id, not the
    # date, so pacing still buckets per group correctly.
    def _day(n):
        return date(2026, 9, n)

    # ontrack: 2 held sessions covering 2 distinct topics → delta 0.
    g_on = await _make_group(db, org, course, name="OnTrack")
    await _held_session(db, org, course, g_on, _day(1), tids[0])
    await _held_session(db, org, course, g_on, _day(2), tids[1])

    # behind: 3 held sessions but only 1 distinct topic covered → delta -2.
    g_behind = await _make_group(db, org, course, name="Behind")
    await _held_session(db, org, course, g_behind, _day(3), tids[0])
    await _held_session(db, org, course, g_behind, _day(4), tids[0])
    await _held_session(db, org, course, g_behind, _day(5), tids[0])

    # ahead: a separate course whose topics are weighted 2 lessons each. The
    # group holds 2 sessions but covers 2 topics worth 4 lessons → delta +2.
    # (With one topic per session, "ahead" is only reachable via topic weight,
    # which is exactly what planned_lessons models.)
    course2 = await make_course(db, org, admin)
    w_topics = await _add_topics(
        client,
        methodist,
        course2,
        [{"title": f"W{i}", "planned_lessons": 2} for i in range(1, 4)],
    )
    w_tids = [uuid.UUID(t["id"]) for t in w_topics]
    g_ahead = await _make_group(db, org, course2, name="Ahead")
    await _held_session(db, org, course2, g_ahead, _day(10), w_tids[0])
    await _held_session(db, org, course2, g_ahead, _day(11), w_tids[1])

    resp = await client.get(f"{API}/journal/pacing", headers=auth_header(methodist))
    assert resp.status_code == 200, resp.text
    body = resp.json()
    by_name = {g["group_name"]: g for g in body["groups"]}

    assert by_name["OnTrack"]["badge"] == "ontrack"
    assert by_name["OnTrack"]["covered"] == 2
    assert by_name["OnTrack"]["total"] == 5

    assert by_name["Behind"]["badge"] == "behind"
    assert by_name["Behind"]["covered"] == 1
    assert by_name["Behind"]["delta"] <= -1

    assert by_name["Ahead"]["badge"] == "ahead"
    assert by_name["Ahead"]["covered"] == 2
    assert by_name["Ahead"]["delta"] >= 1

    # next topic is the first uncovered by position.
    assert by_name["OnTrack"]["next_topic_title"] == "T3"

    # KPI counts.
    assert body["kpis"] == {"ontrack": 1, "behind": 1, "ahead": 1}


# ── Pacing timeline ──────────────────────────────────────────────────────────


async def test_pacing_timeline_coverage(client, admin, org, db):
    methodist = await _new_user(db, org, UserRole.teacher, is_methodist=True)
    course = await make_course(db, org, admin)
    topics = await _add_topics(
        client,
        methodist,
        course,
        [{"title": "A", "planned_lessons": 2}, {"title": "B"}, {"title": "C"}],
    )
    tids = [uuid.UUID(t["id"]) for t in topics]

    group = await _make_group(db, org, course, name="Class 1")
    await _held_session(db, org, course, group, date(2026, 9, 1), tids[0])
    await _held_session(db, org, course, group, date(2026, 9, 8), tids[1])  # current

    resp = await client.get(
        f"{API}/journal/pacing/{group.id}", headers=auth_header(methodist)
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["total"] == 3
    assert body["covered"] == 2
    states = {t["title"]: t["state"] for t in body["topics"]}
    assert states["A"] == "covered"
    assert states["B"] == "current"
    assert states["C"] == "next"
    dates = {t["title"]: t["covered_date"] for t in body["topics"]}
    assert dates["A"] == "2026-09-01"
    assert dates["B"] == "2026-09-08"
    assert dates["C"] is None
    assert body["current_topic_title"] == "B"

    # A non-existent group is 404.
    resp = await client.get(
        f"{API}/journal/pacing/{uuid.uuid4()}", headers=auth_header(methodist)
    )
    assert resp.status_code == 404


# ── Upsert links group_id → pacing reflects marks WITHOUT a backfill ─────────


async def test_upsert_resolves_default_group_and_pacing_reflects_live(
    client, admin, org, db
):
    """Marking a topic via POST /journal/sessions must set class_sessions.group_id
    (resolved to the course's default group) so /journal/pacing counts it
    immediately — no boot-time backfill_groups run required."""
    methodist = await _new_user(db, org, UserRole.teacher, is_methodist=True)
    course = await make_course(db, org, admin)
    topics = await _add_topics(
        client, methodist, course, [{"title": "T1"}, {"title": "T2"}]
    )
    # The course's default group (named like the course title, per the backfill
    # convention). No backfill is run in this test.
    group = await _make_group(db, org, course, name=course.title)

    # Upsert a held session marking T1 — WITHOUT passing group_id.
    resp = await client.post(
        f"{API}/journal/sessions",
        json={
            "course_id": str(course.id),
            "session_date": "2026-09-01",
            "held": True,
            "topic": "Did T1",
            "actual_topic_id": topics[0]["id"],
        },
        headers=auth_header(methodist),
    )
    assert resp.status_code == 200, resp.text
    # The session was linked to the resolved default group.
    assert resp.json()["group_id"] == str(group.id)

    # Pacing for that group reflects the covered topic with no backfill call.
    body = (
        await client.get(f"{API}/journal/pacing", headers=auth_header(methodist))
    ).json()
    by_name = {g["group_name"]: g for g in body["groups"]}
    assert by_name[course.title]["covered"] == 1
    assert by_name[course.title]["next_topic_title"] == "T2"


async def test_upsert_with_explicit_group_id_is_validated(
    client, admin, org, org2, db
):
    """An explicit group_id is set when it belongs to the course; a group from a
    different course (or org) is rejected as not_found."""
    methodist = await _new_user(db, org, UserRole.teacher, is_methodist=True)
    course = await make_course(db, org, admin)
    group = await _make_group(db, org, course, name="Section B")

    # Explicit, valid group_id → linked.
    resp = await client.post(
        f"{API}/journal/sessions",
        json={
            "course_id": str(course.id),
            "session_date": "2026-09-03",
            "held": True,
            "topic": "x",
            "group_id": str(group.id),
        },
        headers=auth_header(methodist),
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["group_id"] == str(group.id)

    # A group of a *different* course is rejected (404 not_found).
    other_course = await make_course(db, org, admin)
    other_group = await _make_group(db, org, other_course, name="Other")
    resp = await client.post(
        f"{API}/journal/sessions",
        json={
            "course_id": str(course.id),
            "session_date": "2026-09-04",
            "held": True,
            "group_id": str(other_group.id),
        },
        headers=auth_header(methodist),
    )
    assert resp.status_code == 404, resp.text


async def test_upsert_no_group_course_does_not_crash(client, admin, org, db):
    """A course with no group yet must still upsert (group_id left null)."""
    methodist = await _new_user(db, org, UserRole.teacher, is_methodist=True)
    course = await make_course(db, org, admin)  # no group created

    resp = await client.post(
        f"{API}/journal/sessions",
        json={
            "course_id": str(course.id),
            "session_date": "2026-09-05",
            "held": True,
            "topic": "ungrouped",
        },
        headers=auth_header(methodist),
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["group_id"] is None


async def test_upsert_prefers_course_named_group_when_multiple(
    client, admin, org, db
):
    """When several groups exist for a course the upsert links to the one named
    like the course title (the backfill's default-group convention)."""
    methodist = await _new_user(db, org, UserRole.teacher, is_methodist=True)
    course = await make_course(db, org, admin)
    # An earlier-created non-default group, then the default named like the course.
    await _make_group(db, org, course, name="Morning cohort")
    default_group = await _make_group(db, org, course, name=course.title)

    resp = await client.post(
        f"{API}/journal/sessions",
        json={
            "course_id": str(course.id),
            "session_date": "2026-09-06",
            "held": True,
        },
        headers=auth_header(methodist),
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["group_id"] == str(default_group.id)


# ── /journal/teachers (methodist-callable filter source) ─────────────────────


async def test_journal_teachers_methodist_sees_org_teachers(
    client, admin, org, org2, db
):
    """A methodist gets the org's teachers (admin-only /admin/users would 403).
    Org isolation hides another org's teachers."""
    methodist = await _new_user(db, org, UserRole.teacher, is_methodist=True)
    t1 = await _new_user(db, org, UserRole.teacher, suffix="a")
    t2 = await _new_user(db, org, UserRole.teacher, suffix="b")
    await _new_user(db, org2, UserRole.teacher, suffix="x")  # other org

    resp = await client.get(f"{API}/journal/teachers", headers=auth_header(methodist))
    assert resp.status_code == 200, resp.text
    ids = {row["id"] for row in resp.json()}
    # Includes org teachers (methodist is a teacher too) and excludes org2's.
    assert str(t1.id) in ids
    assert str(t2.id) in ids
    assert str(methodist.id) in ids
    assert all("org2" not in row["full_name"] for row in resp.json())


async def test_journal_teachers_plain_teacher_sees_only_self(client, org, db):
    """A plain teacher's agenda is own-course scoped, so the filter is just self."""
    teacher = await _new_user(db, org, UserRole.teacher)
    await _new_user(db, org, UserRole.teacher, suffix="other")

    resp = await client.get(f"{API}/journal/teachers", headers=auth_header(teacher))
    assert resp.status_code == 200, resp.text
    ids = [row["id"] for row in resp.json()]
    assert ids == [str(teacher.id)]


async def test_pacing_timeline_teacher_scope(client, admin, org, db):
    methodist = await _new_user(db, org, UserRole.teacher, is_methodist=True)
    teacher = await _new_user(db, org, UserRole.teacher)
    other_teacher = await _new_user(db, org, UserRole.teacher, suffix="o")
    course = await make_course(db, org, teacher)  # owned by `teacher`
    await _add_topics(client, methodist, course, [{"title": "A"}])
    group = await _make_group(db, org, course, teacher, name="Owned")

    # Owning teacher can read.
    resp = await client.get(
        f"{API}/journal/pacing/{group.id}", headers=auth_header(teacher)
    )
    assert resp.status_code == 200

    # A different teacher (does not own the course) → forbidden.
    resp = await client.get(
        f"{API}/journal/pacing/{group.id}", headers=auth_header(other_teacher)
    )
    assert resp.status_code == 403

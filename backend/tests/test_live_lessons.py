import uuid

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.admin.models import StudentGroup, StudentGroupMember
from app.live_lessons import realtime
from tests.conftest import auth_header


async def make_group(db: AsyncSession, org, teacher, students=()) -> StudentGroup:
    g = StudentGroup(org_id=org.id, name="Live G", teacher_id=teacher.id)
    db.add(g)
    await db.flush()
    for s in students:
        db.add(StudentGroupMember(group_id=g.id, user_id=s.id))
    await db.flush()
    return g


async def test_start_lesson(client: AsyncClient, db, org, teacher, student):
    g = await make_group(db, org, teacher, [student])
    resp = await client.post(
        "/api/v1/live-lessons",
        json={"group_id": str(g.id)},
        headers=auth_header(teacher),
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["status"] == "active"
    assert body["current_scene"]["type"] == "blank"
    # student sees the lesson via /active (live membership query)
    resp = await client.get("/api/v1/live-lessons/active", headers=auth_header(student))
    assert resp.json()["lesson_id"] == body["id"]


async def test_start_conflicts_when_active_and_fresh(client, db, org, teacher, student):
    g = await make_group(db, org, teacher, [student])
    r1 = await client.post(
        "/api/v1/live-lessons", json={"group_id": str(g.id)}, headers=auth_header(teacher)
    )
    assert r1.status_code == 201
    r2 = await client.post(
        "/api/v1/live-lessons", json={"group_id": str(g.id)}, headers=auth_header(teacher)
    )
    assert r2.status_code == 409
    assert r2.json()["detail"]["active_lesson_id"] == r1.json()["id"]


async def test_start_auto_ends_stale_lesson(client, db, org, teacher, student):
    g = await make_group(db, org, teacher, [student])
    r1 = await client.post(
        "/api/v1/live-lessons", json={"group_id": str(g.id)}, headers=auth_header(teacher)
    )
    lesson_id = r1.json()["id"]
    # teacher truly gone: seen key expired AND the grace marker matured
    r = realtime.get_redis()
    await r.delete(realtime.teacher_seen_key(uuid.UUID(lesson_id)))
    await r.set(realtime.teacher_grace_key(uuid.UUID(lesson_id)), "1")
    r2 = await client.post(
        "/api/v1/live-lessons", json={"group_id": str(g.id)}, headers=auth_header(teacher)
    )
    assert r2.status_code == 201
    assert r2.json()["id"] != lesson_id


async def test_redis_flush_does_not_end_lesson(client, db, org, teacher, student):
    """Deploy restarts redis and wipes teacher_seen for every active lesson.
    The first stale-check after that must NOT finalize the lesson — it plants
    a grace marker and the teacher's next heartbeat revives the key."""
    g = await make_group(db, org, teacher, [student])
    lesson_id = (
        await client.post(
            "/api/v1/live-lessons", json={"group_id": str(g.id)}, headers=auth_header(teacher)
        )
    ).json()["id"]
    await realtime.get_redis().delete(realtime.teacher_seen_key(uuid.UUID(lesson_id)))
    state = await client.get(f"/api/v1/live-lessons/{lesson_id}", headers=auth_header(student))
    assert state.json()["lesson"]["status"] == "active"
    # scene switching keeps working
    resp = await client.patch(
        f"/api/v1/live-lessons/{lesson_id}/scene",
        json={"type": "blank", "payload": {}},
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200


async def test_student_cannot_start(client, db, org, teacher, student):
    g = await make_group(db, org, teacher, [student])
    resp = await client.post(
        "/api/v1/live-lessons", json={"group_id": str(g.id)}, headers=auth_header(student)
    )
    assert resp.status_code == 403


async def test_end_lesson_writes_summary(client, db, org, teacher, student):
    g = await make_group(db, org, teacher, [student])
    r1 = await client.post(
        "/api/v1/live-lessons", json={"group_id": str(g.id)}, headers=auth_header(teacher)
    )
    lesson_id = r1.json()["id"]
    resp = await client.post(f"/api/v1/live-lessons/{lesson_id}/end", headers=auth_header(teacher))
    assert resp.status_code == 200
    assert resp.json()["status"] == "ended"
    assert resp.json()["summary"] is not None
    # /active no longer advertises the lesson
    resp = await client.get("/api/v1/live-lessons/active", headers=auth_header(student))
    assert resp.json()["lesson_id"] is None


async def test_set_scene_and_state(client, db, org, teacher, student):
    g = await make_group(db, org, teacher, [student])
    lesson_id = (
        await client.post(
            "/api/v1/live-lessons", json={"group_id": str(g.id)}, headers=auth_header(teacher)
        )
    ).json()["id"]
    resp = await client.patch(
        f"/api/v1/live-lessons/{lesson_id}/scene",
        json={"type": "material", "payload": {"lesson_id": str(uuid.uuid4())}},
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200
    state = await client.get(f"/api/v1/live-lessons/{lesson_id}", headers=auth_header(student))
    assert state.json()["lesson"]["current_scene"]["type"] == "material"


async def test_student_cannot_set_scene(client, db, org, teacher, student):
    g = await make_group(db, org, teacher, [student])
    lesson_id = (
        await client.post(
            "/api/v1/live-lessons", json={"group_id": str(g.id)}, headers=auth_header(teacher)
        )
    ).json()["id"]
    resp = await client.patch(
        f"/api/v1/live-lessons/{lesson_id}/scene",
        json={"type": "blank", "payload": {}},
        headers=auth_header(student),
    )
    assert resp.status_code == 403


async def test_follow_mode_settings(client, db, org, teacher, student):
    g = await make_group(db, org, teacher, [student])
    lesson_id = (
        await client.post(
            "/api/v1/live-lessons", json={"group_id": str(g.id)}, headers=auth_header(teacher)
        )
    ).json()["id"]
    resp = await client.patch(
        f"/api/v1/live-lessons/{lesson_id}/settings",
        json={"follow_mode": "strict"},
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200
    assert resp.json()["follow_mode"] == "strict"


async def test_solution_scene_embeds_submission(client, db, org, teacher, student):
    from datetime import datetime, timezone

    from app.exercises.models import ExerciseSubmission
    from tests.conftest import make_course, make_exercise, make_lesson, make_module

    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson_row = await make_lesson(db, module.id)
    ex = await make_exercise(db, lesson_row.id, org.id)
    sub = ExerciseSubmission(
        exercise_id=ex.id,
        student_id=student.id,
        answers={"q1": "a"},
        submitted_at=datetime.now(timezone.utc),
    )
    db.add(sub)
    await db.flush()

    g = await make_group(db, org, teacher, [student])
    lesson_id = (
        await client.post(
            "/api/v1/live-lessons", json={"group_id": str(g.id)}, headers=auth_header(teacher)
        )
    ).json()["id"]
    resp = await client.patch(
        f"/api/v1/live-lessons/{lesson_id}/scene",
        json={"type": "solution", "payload": {"submission_id": str(sub.id), "anonymous": True}},
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200
    scene = resp.json()["current_scene"]
    assert scene["payload"]["answers"] == {"q1": "a"}
    assert scene["payload"]["student_name"] is None  # anonymous


async def test_board_delta_flow(client, db, org, teacher, student):
    g = await make_group(db, org, teacher, [student])
    lesson_id = (
        await client.post(
            "/api/v1/live-lessons", json={"group_id": str(g.id)}, headers=auth_header(teacher)
        )
    ).json()["id"]
    board = (
        await client.post(
            f"/api/v1/live-lessons/{lesson_id}/boards",
            json={"kind": "board"},
            headers=auth_header(teacher),
        )
    ).json()
    el = {"id": "el1", "type": "rectangle", "x": 0, "y": 0}
    resp = await client.patch(
        f"/api/v1/live-lessons/{lesson_id}/boards/{board['id']}",
        json={"updated": [el], "deleted": [], "version": 1},
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200
    # student fetches full scene
    got = (
        await client.get(
            f"/api/v1/live-lessons/{lesson_id}/boards/{board['id']}",
            headers=auth_header(student),
        )
    ).json()
    assert got["version"] == 1
    assert got["scene"]["elements"] == [el]
    # delete the element
    await client.patch(
        f"/api/v1/live-lessons/{lesson_id}/boards/{board['id']}",
        json={"updated": [], "deleted": ["el1"], "version": 2},
        headers=auth_header(teacher),
    )
    got2 = (
        await client.get(
            f"/api/v1/live-lessons/{lesson_id}/boards/{board['id']}",
            headers=auth_header(student),
        )
    ).json()
    assert got2["scene"]["elements"] == []


async def test_board_delta_payload_cap(client, db, org, teacher, student):
    g = await make_group(db, org, teacher, [student])
    lesson_id = (
        await client.post(
            "/api/v1/live-lessons", json={"group_id": str(g.id)}, headers=auth_header(teacher)
        )
    ).json()["id"]
    board = (
        await client.post(
            f"/api/v1/live-lessons/{lesson_id}/boards",
            json={"kind": "board"},
            headers=auth_header(teacher),
        )
    ).json()
    huge = {"id": "big", "type": "freedraw", "points": "x" * 300_000}
    resp = await client.patch(
        f"/api/v1/live-lessons/{lesson_id}/boards/{board['id']}",
        json={"updated": [huge], "deleted": [], "version": 1},
        headers=auth_header(teacher),
    )
    assert resp.status_code == 413


async def test_heartbeat_and_roster(client, db, org, teacher, student):
    g = await make_group(db, org, teacher, [student])
    lesson_id = (
        await client.post(
            "/api/v1/live-lessons", json={"group_id": str(g.id)}, headers=auth_header(teacher)
        )
    ).json()["id"]
    resp = await client.post(
        f"/api/v1/live-lessons/{lesson_id}/heartbeat",
        json={"current_view": "scene"},
        headers=auth_header(student),
    )
    assert resp.status_code == 204
    roster = (
        await client.get(f"/api/v1/live-lessons/{lesson_id}/roster", headers=auth_header(teacher))
    ).json()
    me = next(m for m in roster["members"] if m["id"] == str(student.id))
    assert me["online"] is True
    assert me["current_view"] == "scene"


async def test_active_endpoint_for_student(client, db, org, teacher, student):
    g = await make_group(db, org, teacher, [student])
    lesson_id = (
        await client.post(
            "/api/v1/live-lessons", json={"group_id": str(g.id)}, headers=auth_header(teacher)
        )
    ).json()["id"]
    resp = await client.get("/api/v1/live-lessons/active", headers=auth_header(student))
    assert resp.json()["lesson_id"] == lesson_id


async def test_active_for_student_added_after_start(client, db, org, teacher, student):
    from app.auth.models import UserRole
    from tests.conftest import _make_user

    g = await make_group(db, org, teacher, [student])
    lesson_id = (
        await client.post(
            "/api/v1/live-lessons", json={"group_id": str(g.id)}, headers=auth_header(teacher)
        )
    ).json()["id"]
    # a student joining the group mid-lesson must still see it via /active
    late = _make_user(db, org, UserRole.student, suffix="late")
    await db.flush()
    db.add(StudentGroupMember(group_id=g.id, user_id=late.id))
    await db.flush()
    resp = await client.get("/api/v1/live-lessons/active", headers=auth_header(late))
    assert resp.json()["lesson_id"] == lesson_id


async def test_active_hides_stale_lesson(client, db, org, teacher, student):
    g = await make_group(db, org, teacher, [student])
    lesson_id = (
        await client.post(
            "/api/v1/live-lessons", json={"group_id": str(g.id)}, headers=auth_header(teacher)
        )
    ).json()["id"]
    # teacher truly gone: seen key expired AND grace marker matured
    r = realtime.get_redis()
    await r.delete(realtime.teacher_seen_key(uuid.UUID(lesson_id)))
    await r.set(realtime.teacher_grace_key(uuid.UUID(lesson_id)), "1")
    resp = await client.get("/api/v1/live-lessons/active", headers=auth_header(student))
    assert resp.json()["lesson_id"] is None


async def test_list_lessons_for_student(client, db, org, teacher, student):
    g = await make_group(db, org, teacher, [student])
    lesson_id = (
        await client.post(
            "/api/v1/live-lessons", json={"group_id": str(g.id)}, headers=auth_header(teacher)
        )
    ).json()["id"]
    await client.post(f"/api/v1/live-lessons/{lesson_id}/end", headers=auth_header(teacher))
    resp = await client.get("/api/v1/live-lessons", headers=auth_header(student))
    assert resp.status_code == 200
    assert [item["id"] for item in resp.json()] == [lesson_id]


async def test_signal_set_and_clear(client, db, org, teacher, student):
    g = await make_group(db, org, teacher, [student])
    lesson_id = (
        await client.post(
            "/api/v1/live-lessons", json={"group_id": str(g.id)}, headers=auth_header(teacher)
        )
    ).json()["id"]
    resp = await client.post(
        f"/api/v1/live-lessons/{lesson_id}/signals",
        json={"type": "hand"},
        headers=auth_header(student),
    )
    assert resp.status_code == 204
    state = (
        await client.get(f"/api/v1/live-lessons/{lesson_id}", headers=auth_header(student))
    ).json()
    assert state["my_signal"] == "hand"
    resp = await client.delete(
        f"/api/v1/live-lessons/{lesson_id}/signals", headers=auth_header(student)
    )
    assert resp.status_code == 204
    state = (
        await client.get(f"/api/v1/live-lessons/{lesson_id}", headers=auth_header(student))
    ).json()
    assert state["my_signal"] is None


async def test_poll_lifecycle(client, db, org, teacher, student):
    g = await make_group(db, org, teacher, [student])
    lesson_id = (
        await client.post(
            "/api/v1/live-lessons", json={"group_id": str(g.id)}, headers=auth_header(teacher)
        )
    ).json()["id"]
    poll = (
        await client.post(
            f"/api/v1/live-lessons/{lesson_id}/polls",
            json={"question": "2+2?", "options": ["3", "4"]},
            headers=auth_header(teacher),
        )
    ).json()
    assert poll["question"] == "2+2?"
    resp = await client.post(
        f"/api/v1/live-lessons/{lesson_id}/polls/vote",
        json={"option": 1},
        headers=auth_header(student),
    )
    assert resp.status_code == 204
    closed = (
        await client.post(
            f"/api/v1/live-lessons/{lesson_id}/polls/close", headers=auth_header(teacher)
        )
    ).json()
    assert closed["counts"] == [0, 1]
    # poll gone from state
    state = (
        await client.get(f"/api/v1/live-lessons/{lesson_id}", headers=auth_header(student))
    ).json()
    assert state["active_poll"] is None


async def test_submission_event_published_and_progress(client, db, org, teacher, student):
    import asyncio
    import uuid as _uuid

    from tests.conftest import make_course, make_exercise, make_lesson, make_module

    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson_row = await make_lesson(db, module.id)
    ex = await make_exercise(db, lesson_row.id, org.id)

    g = await make_group(db, org, teacher, [student])
    lesson_id = (
        await client.post(
            "/api/v1/live-lessons", json={"group_id": str(g.id)}, headers=auth_header(teacher)
        )
    ).json()["id"]
    await client.post(
        f"/api/v1/live-lessons/{lesson_id}/heartbeat",
        json={"current_view": "scene"},
        headers=auth_header(student),
    )

    events = []

    async def listen():
        async for msg in realtime.subscribe(_uuid.UUID(lesson_id)):
            if msg["event"] == "submission":
                events.append(msg)
                break

    task = asyncio.create_task(listen())
    await asyncio.sleep(0.05)
    resp = await client.post(
        f"/api/v1/exercises/{ex.id}/submit",
        json={"answers": []},
        headers=auth_header(student),
    )
    assert resp.status_code in (200, 201)
    await asyncio.wait_for(task, timeout=2)
    assert events[0]["data"]["student_id"] == str(student.id)

    grid = (
        await client.get(
            f"/api/v1/live-lessons/{lesson_id}/progress?exercise_id={ex.id}",
            headers=auth_header(teacher),
        )
    ).json()
    row = next(m for m in grid["students"] if m["id"] == str(student.id))
    assert row["submitted"] is True


async def test_programme_survives_reload_and_is_teacher_only(client, db, org, teacher, student):
    """Conductor edits must outlive a page reload, and stay off the class."""
    g = await make_group(db, org, teacher, [student])
    lesson_id = (
        await client.post(
            "/api/v1/live-lessons", json={"group_id": str(g.id)}, headers=auth_header(teacher)
        )
    ).json()["id"]

    steps = [
        {"kind": "material", "id": "m1", "title": "Intro", "hidden": False},
        {"kind": "task", "id": "t1", "title": "Warm-up", "hidden": True},
    ]
    resp = await client.patch(
        f"/api/v1/live-lessons/{lesson_id}/programme",
        json={"steps": steps},
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200

    # reload: the teacher gets the pinned programme back
    state = (
        await client.get(f"/api/v1/live-lessons/{lesson_id}", headers=auth_header(teacher))
    ).json()
    assert state["lesson"]["programme"] == steps

    # the class never sees the plan (hidden steps included)
    student_state = (
        await client.get(f"/api/v1/live-lessons/{lesson_id}", headers=auth_header(student))
    ).json()
    assert student_state["lesson"]["programme"] is None

    # clearing drops back to the auto list
    await client.patch(
        f"/api/v1/live-lessons/{lesson_id}/programme",
        json={"steps": None},
        headers=auth_header(teacher),
    )
    state = (
        await client.get(f"/api/v1/live-lessons/{lesson_id}", headers=auth_header(teacher))
    ).json()
    assert state["lesson"]["programme"] is None


async def test_progress_ignores_work_from_before_the_lesson(client, db, org, teacher, student):
    """Yesterday's homework must not read as solved-in-class today.

    The live grid is scoped to the lesson window; a submission (and a draft)
    left over from before the lesson started is invisible to it.
    """
    from datetime import datetime, timedelta, timezone

    from app.exercises.models import ExerciseSubmission
    from app.live_lessons.models import ExerciseDraft
    from tests.conftest import make_course, make_exercise, make_lesson, make_module

    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson_row = await make_lesson(db, module.id)
    ex = await make_exercise(db, lesson_row.id, org.id)
    g = await make_group(db, org, teacher, [student])

    yesterday = datetime.now(timezone.utc) - timedelta(days=1)
    db.add(
        ExerciseSubmission(
            exercise_id=ex.id,
            student_id=student.id,
            answers={},
            passed=True,
            score=100,
            status="submitted",
            submitted_at=yesterday,
        )
    )
    db.add(
        ExerciseDraft(
            org_id=org.id,
            exercise_id=ex.id,
            student_id=student.id,
            answers={"stale": True},
            created_at=yesterday,
            updated_at=yesterday,
        )
    )
    await db.flush()

    lesson_id = (
        await client.post(
            "/api/v1/live-lessons", json={"group_id": str(g.id)}, headers=auth_header(teacher)
        )
    ).json()["id"]

    grid = (
        await client.get(
            f"/api/v1/live-lessons/{lesson_id}/progress?exercise_id={ex.id}",
            headers=auth_header(teacher),
        )
    ).json()
    row = next(m for m in grid["students"] if m["id"] == str(student.id))
    assert row["submitted"] is False
    assert row["passed"] is None
    assert row["attempts"] == 0
    assert row["draft_updated_at"] is None


async def test_upload_publishes_submission_event(client, db, org, teacher, student):
    import asyncio
    import uuid as _uuid

    from app.exercises.models import ExerciseType
    from tests.conftest import make_course, make_exercise, make_lesson, make_module

    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson_row = await make_lesson(db, module.id)
    ex = await make_exercise(
        db,
        lesson_row.id,
        org.id,
        exercise_type=ExerciseType.file_upload,
        config={"allowed_types": [".pdf"]},
    )

    g = await make_group(db, org, teacher, [student])
    lesson_id = (
        await client.post(
            "/api/v1/live-lessons", json={"group_id": str(g.id)}, headers=auth_header(teacher)
        )
    ).json()["id"]
    await client.post(
        f"/api/v1/live-lessons/{lesson_id}/heartbeat",
        json={"current_view": "scene"},
        headers=auth_header(student),
    )

    events = []

    async def listen():
        async for msg in realtime.subscribe(_uuid.UUID(lesson_id)):
            if msg["event"] == "submission":
                events.append(msg)
                break

    task = asyncio.create_task(listen())
    await asyncio.sleep(0.05)
    resp = await client.post(
        f"/api/v1/exercises/{ex.id}/upload",
        files={"file": ("notes.pdf", b"%PDF-1.4\n%live smoke\n", "application/pdf")},
        headers=auth_header(student),
    )
    assert resp.status_code in (200, 201), resp.text
    await asyncio.wait_for(task, timeout=2)
    assert events[0]["data"]["student_id"] == str(student.id)


async def test_start_lesson_autolinks_journal_session(client, db, org, teacher, student):
    from datetime import date as _date

    from sqlalchemy import select as sa_select

    from app.journal.models import ClassSession
    from tests.conftest import make_course

    course = await make_course(db, org, teacher)
    g = StudentGroup(org_id=org.id, name="Live J", teacher_id=teacher.id, course_id=course.id)
    db.add(g)
    await db.flush()
    db.add(StudentGroupMember(group_id=g.id, user_id=student.id))
    await db.flush()

    body = (
        await client.post(
            "/api/v1/live-lessons", json={"group_id": str(g.id)}, headers=auth_header(teacher)
        )
    ).json()
    assert body["class_session_id"] is not None
    cs = await db.scalar(
        sa_select(ClassSession).where(
            ClassSession.course_id == course.id,
            ClassSession.session_date == _date.today(),
        )
    )
    assert cs is not None
    assert str(cs.id) == body["class_session_id"]


async def test_student_question_reaches_teacher_state(client, db, org, teacher, student):
    g = await make_group(db, org, teacher, [student])
    lesson_id = (
        await client.post(
            "/api/v1/live-lessons", json={"group_id": str(g.id)}, headers=auth_header(teacher)
        )
    ).json()["id"]
    resp = await client.post(
        f"/api/v1/live-lessons/{lesson_id}/questions",
        json={"text": "What is a fixture?"},
        headers=auth_header(student),
    )
    assert resp.status_code == 204
    # teacher sees it in state; student does not
    t_state = (
        await client.get(f"/api/v1/live-lessons/{lesson_id}", headers=auth_header(teacher))
    ).json()
    assert t_state["questions"][0]["text"] == "What is a fixture?"
    s_state = (
        await client.get(f"/api/v1/live-lessons/{lesson_id}", headers=auth_header(student))
    ).json()
    assert s_state["questions"] is None


async def test_broadcast_message_to_class(client, db, org, teacher, student):
    from sqlalchemy import select as sa_select

    from app.notifications.models import Notification

    g = await make_group(db, org, teacher, [student])
    lesson_id = (
        await client.post(
            "/api/v1/live-lessons", json={"group_id": str(g.id)}, headers=auth_header(teacher)
        )
    ).json()["id"]
    resp = await client.post(
        f"/api/v1/live-lessons/{lesson_id}/messages",
        json={"text": "Take a 5 minute break"},
        headers=auth_header(teacher),
    )
    assert resp.status_code == 204
    notes = (
        (await db.execute(sa_select(Notification).where(Notification.user_id == student.id)))
        .scalars()
        .all()
    )
    assert any("Take a 5 minute break" in (n.body or "") for n in notes)
    # The title is ours, not the teacher's — assert it, or a stray localised
    # literal reaches every student's bell unnoticed, which is how two Russian
    # titles shipped to an English product.
    assert any(n.title == "Message from your teacher" for n in notes)


async def test_scene_change_clears_signals(client, db, org, teacher, student):
    g = await make_group(db, org, teacher, [student])
    lesson_id = (
        await client.post(
            "/api/v1/live-lessons", json={"group_id": str(g.id)}, headers=auth_header(teacher)
        )
    ).json()["id"]
    await client.post(
        f"/api/v1/live-lessons/{lesson_id}/signals",
        json={"type": "hand"},
        headers=auth_header(student),
    )
    await client.patch(
        f"/api/v1/live-lessons/{lesson_id}/scene",
        json={"type": "blank", "payload": {}},
        headers=auth_header(teacher),
    )
    roster = (
        await client.get(f"/api/v1/live-lessons/{lesson_id}/roster", headers=auth_header(teacher))
    ).json()
    me = next(m for m in roster["members"] if m["id"] == str(student.id))
    assert me["signal"] is None


async def test_summary_includes_results(client, db, org, teacher, student):
    from tests.conftest import make_course, make_exercise, make_lesson, make_module

    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson_row = await make_lesson(db, module.id)
    ex = await make_exercise(db, lesson_row.id, org.id)

    g = await make_group(db, org, teacher, [student])
    lesson_id = (
        await client.post(
            "/api/v1/live-lessons", json={"group_id": str(g.id)}, headers=auth_header(teacher)
        )
    ).json()["id"]
    resp = await client.post(
        f"/api/v1/exercises/{ex.id}/submit",
        json={"answers": []},
        headers=auth_header(student),
    )
    assert resp.status_code in (200, 201)
    ended = (
        await client.post(f"/api/v1/live-lessons/{lesson_id}/end", headers=auth_header(teacher))
    ).json()
    results = ended["summary"]["results"]
    assert len(results) == 1
    assert results[0]["exercise_id"] == str(ex.id)
    st = results[0]["students"][0]
    assert st["id"] == str(student.id)
    assert st["attempts"] == 1


async def test_student_state_hides_other_students_results(client, db, org, teacher, student):
    """A student's lesson state must carry only their own outcomes."""
    from app.auth.models import UserRole
    from tests.conftest import _make_user, make_course, make_exercise, make_lesson, make_module

    other = _make_user(db, org, UserRole.student, suffix="peer")
    await db.flush()

    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson_row = await make_lesson(db, module.id)
    ex = await make_exercise(db, lesson_row.id, org.id)

    g = await make_group(db, org, teacher, [student, other])
    lesson_id = (
        await client.post(
            "/api/v1/live-lessons", json={"group_id": str(g.id)}, headers=auth_header(teacher)
        )
    ).json()["id"]
    for s in (student, other):
        await client.post(
            f"/api/v1/exercises/{ex.id}/submit", json={"answers": []}, headers=auth_header(s)
        )
    await client.post(f"/api/v1/live-lessons/{lesson_id}/end", headers=auth_header(teacher))

    teacher_summary = (
        await client.get(f"/api/v1/live-lessons/{lesson_id}", headers=auth_header(teacher))
    ).json()["lesson"]["summary"]
    assert len(teacher_summary["results"][0]["students"]) == 2
    assert "attendance_seconds" in teacher_summary

    student_state = await client.get(
        f"/api/v1/live-lessons/{lesson_id}", headers=auth_header(student)
    )
    summary = student_state.json()["lesson"]["summary"]
    rows = summary["results"][0]["students"]
    assert [r["id"] for r in rows] == [str(student.id)]
    assert str(other.id) not in student_state.text
    assert "attendance_seconds" not in summary


async def test_message_creates_notification(client, db, org, teacher, student):
    from sqlalchemy import select as sa_select

    from app.notifications.models import Notification

    g = await make_group(db, org, teacher, [student])
    lesson_id = (
        await client.post(
            "/api/v1/live-lessons", json={"group_id": str(g.id)}, headers=auth_header(teacher)
        )
    ).json()["id"]
    resp = await client.post(
        f"/api/v1/live-lessons/{lesson_id}/messages",
        json={"student_id": str(student.id), "text": "Смотри на условие"},
        headers=auth_header(teacher),
    )
    assert resp.status_code == 204
    notes = (
        (await db.execute(sa_select(Notification).where(Notification.user_id == student.id)))
        .scalars()
        .all()
    )
    # A non-ASCII body is the teacher's own text and must survive the round trip.
    assert any("Смотри на условие" in (n.body or "") for n in notes)
    assert any(n.title == "Hint from your teacher" for n in notes)


async def test_media_scenes_are_scenes(client, db, org, teacher, student):
    """The screen and the faces are things a teacher can put in front of the
    class, the way a board is (FR-034).

    The rejected garbage type at the end is the control: a schema that accepts
    everything passes the two asserts above it without validating anything.
    """
    g = await make_group(db, org, teacher, [student])
    lesson_id = (
        await client.post(
            "/api/v1/live-lessons", json={"group_id": str(g.id)}, headers=auth_header(teacher)
        )
    ).json()["id"]

    for scene in ("screen", "faces"):
        resp = await client.patch(
            f"/api/v1/live-lessons/{lesson_id}/scene",
            json={"type": scene, "payload": {}},
            headers=auth_header(teacher),
        )
        assert resp.status_code == 200, resp.text
        state = await client.get(f"/api/v1/live-lessons/{lesson_id}", headers=auth_header(student))
        assert state.json()["lesson"]["current_scene"]["type"] == scene

    refused = await client.patch(
        f"/api/v1/live-lessons/{lesson_id}/scene",
        json={"type": "interpretive_dance", "payload": {}},
        headers=auth_header(teacher),
    )
    assert refused.status_code == 422


async def test_material_picker_offers_only_the_groups_courses(
    client: AsyncClient, db, org, teacher, student
):
    """A course is available when EVERY member is enrolled (FR-037).

    The course missing one pupil is the control: without it, an endpoint that
    returns the whole catalogue passes the first assert and scopes nothing.
    """
    from datetime import datetime, timezone

    from app.auth.models import User, UserRole
    from app.courses.models import Course
    from app.progress.models import Enrollment

    other = User(
        email="second-pupil@t.example",
        hashed_password="x",
        full_name="Second Pupil",
        role=UserRole.student,
        org_id=org.id,
    )
    db.add(other)
    await db.flush()

    everyone = Course(
        org_id=org.id, title="For the whole group", slug="whole-group", teacher_id=teacher.id
    )
    partial = Course(
        org_id=org.id, title="Half the class", slug="half-class", teacher_id=teacher.id
    )
    db.add_all([everyone, partial])
    await db.flush()
    now = datetime.now(timezone.utc)
    db.add_all(
        [
            Enrollment(course_id=everyone.id, student_id=student.id, enrolled_at=now),
            Enrollment(course_id=everyone.id, student_id=other.id, enrolled_at=now),
            # `partial` deliberately misses `other`.
            Enrollment(course_id=partial.id, student_id=student.id, enrolled_at=now),
        ]
    )
    await db.flush()

    g = await make_group(db, org, teacher, [student, other])
    lesson_id = (
        await client.post(
            "/api/v1/live-lessons", json={"group_id": str(g.id)}, headers=auth_header(teacher)
        )
    ).json()["id"]

    resp = await client.get(
        f"/api/v1/live-lessons/{lesson_id}/courses", headers=auth_header(teacher)
    )
    assert resp.status_code == 200, resp.text
    titles = {c["title"] for c in resp.json()["items"]}

    assert "For the whole group" in titles
    # The control: one pupil missing means the course is not offered.
    assert "Half the class" not in titles


async def test_lesson_courses_are_invisible_across_schools(
    client: AsyncClient, db, org, teacher, student, admin2
):
    g = await make_group(db, org, teacher, [student])
    lesson_id = (
        await client.post(
            "/api/v1/live-lessons", json={"group_id": str(g.id)}, headers=auth_header(teacher)
        )
    ).json()["id"]

    resp = await client.get(
        f"/api/v1/live-lessons/{lesson_id}/courses", headers=auth_header(admin2)
    )
    assert resp.status_code == 404

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
    # invite key set for the student
    r = realtime.get_redis()
    assert await r.get(realtime.invite_key(student.id)) == body["id"]


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
    # simulate teacher gone: drop the teacher_seen key
    await realtime.get_redis().delete(realtime.teacher_seen_key(uuid.UUID(lesson_id)))
    r2 = await client.post(
        "/api/v1/live-lessons", json={"group_id": str(g.id)}, headers=auth_header(teacher)
    )
    assert r2.status_code == 201
    assert r2.json()["id"] != lesson_id


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
    # invite cleaned up
    assert await realtime.get_redis().get(realtime.invite_key(student.id)) is None


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

from httpx import AsyncClient

from tests.conftest import auth_header, make_course, make_exercise, make_lesson, make_module
from tests.test_live_lessons import make_group


async def _setup_exercise(db, org, teacher):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson_row = await make_lesson(db, module.id)
    return await make_exercise(db, lesson_row.id, org.id)


async def test_draft_noop_without_active_lesson(client: AsyncClient, db, org, teacher, student):
    ex = await _setup_exercise(db, org, teacher)
    resp = await client.post(
        f"/api/v1/exercises/{ex.id}/draft",
        json={"answers": {"q": "a"}},
        headers=auth_header(student),
    )
    assert resp.status_code == 204
    # gated: nothing stored
    got = await client.get(
        f"/api/v1/exercises/{ex.id}/drafts/{student.id}", headers=auth_header(teacher)
    )
    assert got.status_code == 404


async def test_draft_saved_during_lesson_and_304(client, db, org, teacher, student):
    ex = await _setup_exercise(db, org, teacher)
    g = await make_group(db, org, teacher, [student])
    lesson_id = (
        await client.post(
            "/api/v1/live-lessons", json={"group_id": str(g.id)}, headers=auth_header(teacher)
        )
    ).json()["id"]
    # heartbeat sets the active_lesson gate key
    await client.post(
        f"/api/v1/live-lessons/{lesson_id}/heartbeat",
        json={"current_view": "scene"},
        headers=auth_header(student),
    )
    resp = await client.post(
        f"/api/v1/exercises/{ex.id}/draft",
        json={"answers": {"q": "a"}},
        headers=auth_header(student),
    )
    assert resp.status_code == 204
    got = await client.get(
        f"/api/v1/exercises/{ex.id}/drafts/{student.id}", headers=auth_header(teacher)
    )
    assert got.status_code == 200
    body = got.json()
    assert body["answers"] == {"q": "a"}
    etag = got.headers["etag"]
    # unchanged -> 304
    got2 = await client.get(
        f"/api/v1/exercises/{ex.id}/drafts/{student.id}",
        headers={**auth_header(teacher), "If-None-Match": etag},
    )
    assert got2.status_code == 304


async def test_student_cannot_read_others_draft(client, db, org, teacher, student):
    ex = await _setup_exercise(db, org, teacher)
    resp = await client.get(
        f"/api/v1/exercises/{ex.id}/drafts/{teacher.id}", headers=auth_header(student)
    )
    assert resp.status_code == 403

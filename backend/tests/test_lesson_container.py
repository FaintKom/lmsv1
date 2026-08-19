"""Lesson as a typeless container + assignment blocks — specs/017.

Pins the contracts the reworked authoring UI relies on: a lesson is created
from a title alone (content_type defaults), the v2 block container with an
assignment block round-trips through the lesson content, and assignments
created from the lesson editor live the normal lifecycle with org isolation.
"""

from datetime import datetime, timedelta, timezone

from tests.conftest import auth_header, make_course, make_module

DUE = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()


async def test_lesson_created_with_title_only(client, db, org, org2, teacher, admin2):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)

    r = await client.post(
        f"/api/v1/courses/{course.id}/modules/{module.id}/lessons",
        json={"title": "Container lesson"},
        headers=auth_header(teacher),
    )
    assert r.status_code == 200  # positive control for the isolation case below
    body = r.json()
    assert body["content_type"] == "text"  # backend default; no type was sent

    # Cross-org: another school's admin cannot create into our module — 404.
    r = await client.post(
        f"/api/v1/courses/{course.id}/modules/{module.id}/lessons",
        json={"title": "intruder"},
        headers=auth_header(admin2),
    )
    assert r.status_code == 404


async def test_assignment_block_round_trips_in_lesson_content(client, db, org, teacher):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    headers = auth_header(teacher)

    r = await client.post(
        f"/api/v1/courses/{course.id}/modules/{module.id}/lessons",
        json={"title": "HW lesson", "content": {"version": 2, "blocks": []}},
        headers=headers,
    )
    assert r.status_code == 200
    lesson_id = r.json()["id"]

    r = await client.post(
        "/api/v1/assignments",
        json={"course_id": str(course.id), "title": "HW 1", "due_date": DUE},
        headers=headers,
    )
    assert r.status_code == 200
    assignment_id = r.json()["id"]

    block = {
        "id": "block_hw1",
        "type": "assignment",
        "sort_order": 0,
        "page": 1,
        "assignment_id": assignment_id,
    }
    r = await client.put(
        f"/api/v1/courses/{course.id}/modules/{module.id}/lessons/{lesson_id}",
        json={"content": {"version": 2, "blocks": [block]}},
        headers=headers,
    )
    assert r.status_code == 200
    saved = r.json()["content"]["blocks"]
    assert saved == [block]


async def test_block_created_assignment_lives_the_normal_lifecycle(
    client, db, org, teacher, student, admin2
):
    course = await make_course(db, org, teacher)
    headers = auth_header(teacher)

    r = await client.post(
        "/api/v1/assignments",
        json={"course_id": str(course.id), "title": "HW iso", "due_date": DUE},
        headers=headers,
    )
    assert r.status_code == 200  # positive control
    assignment_id = r.json()["id"]

    # Student in the same school can read it (the lesson card links here).
    r = await client.get(f"/api/v1/assignments/{assignment_id}", headers=auth_header(student))
    assert r.status_code == 200

    # Another school's admin: reads as absent, cannot edit.
    r = await client.get(f"/api/v1/assignments/{assignment_id}", headers=auth_header(admin2))
    assert r.status_code == 404
    r = await client.put(
        f"/api/v1/assignments/{assignment_id}",
        json={"title": "stolen"},
        headers=auth_header(admin2),
    )
    assert r.status_code == 404

    # Block removal path: teacher deletes; the assignment is gone for everyone.
    r = await client.delete(f"/api/v1/assignments/{assignment_id}", headers=headers)
    assert r.status_code == 204
    r = await client.get(f"/api/v1/assignments/{assignment_id}", headers=headers)
    assert r.status_code == 404

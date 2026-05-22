"""Teacher happy path: log in -> create course -> add module -> add lesson
-> add exercise -> view gradebook."""
import uuid

import pytest


async def test_teacher_can_create_course_module_lesson_exercise(role_client_factory):
    c = await role_client_factory("teacher")

    # 1. Create a throwaway course (separate from seeded qa-course so tests
    #    don't collide if run repeatedly on the same stack).
    unique = uuid.uuid4().hex[:8]
    r = await c.post(
        "/api/v1/courses",
        json={"title": f"Teacher Test Course {unique}", "description": "QA"},
    )
    assert r.status_code in (200, 201), r.text
    course = r.json()
    course_id = course["id"]

    # 2. Add a module.
    r = await c.post(
        f"/api/v1/courses/{course_id}/modules",
        json={"title": "M1"},
    )
    assert r.status_code in (200, 201), r.text
    module = r.json()
    module_id = module["id"]

    # 3. Add a lesson under the module.
    r = await c.post(
        f"/api/v1/courses/{course_id}/modules/{module_id}/lessons",
        json={"title": "L1"},
    )
    assert r.status_code in (200, 201), r.text
    lesson = r.json()
    lesson_id = lesson["id"]

    # 4. Add a quiz exercise to the lesson.
    r = await c.post(
        "/api/v1/exercises",
        json={
            "lesson_id": lesson_id,
            "exercise_type": "quiz",
            "title": "T quiz",
            "config": {"passing_score": 70},
        },
    )
    assert r.status_code in (200, 201), r.text
    exercise = r.json()
    assert exercise["lesson_id"] == lesson_id
    assert exercise["exercise_type"] == "quiz"

    # 5. The lesson now has at least the one exercise we just added.
    r = await c.get(f"/api/v1/exercises/by-lesson/{lesson_id}")
    assert r.status_code == 200, r.text
    assert any(e["id"] == exercise["id"] for e in r.json())


async def test_teacher_can_view_gradebook(role_client_factory):
    from .conftest import QA_COURSE_ID

    c = await role_client_factory("teacher")
    # /admin/gradebook is admin/teacher-only and requires ?course_id=.
    r = await c.get("/api/v1/admin/gradebook", params={"course_id": str(QA_COURSE_ID)})
    assert r.status_code == 200, r.text

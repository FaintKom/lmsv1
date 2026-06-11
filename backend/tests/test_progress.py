"""Tests for progress tracking: enrollment, lesson completion, course progress."""
import pytest
from httpx import AsyncClient

from tests.conftest import (
    auth_header,
    make_course,
    make_enrollment,
    make_lesson,
    make_module,
)

# ─── Enrollment ──────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_student_enroll(client: AsyncClient, student, teacher, org, db):
    course = await make_course(db, org, teacher)
    resp = await client.post("/api/v1/progress/enroll", json={
        "course_id": str(course.id),
    }, headers=auth_header(student))
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_student_enroll_duplicate(client: AsyncClient, student, teacher, org, db):
    course = await make_course(db, org, teacher)
    await make_enrollment(db, course.id, student.id)
    resp = await client.post("/api/v1/progress/enroll", json={
        "course_id": str(course.id),
    }, headers=auth_header(student))
    # Should handle gracefully
    assert resp.status_code in (200, 400)


# ─── My Courses ──────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_my_courses(client: AsyncClient, student, teacher, org, db):
    course = await make_course(db, org, teacher)
    await make_enrollment(db, course.id, student.id)
    resp = await client.get("/api/v1/progress/my-courses", headers=auth_header(student))
    assert resp.status_code == 200


# ─── Lesson Completion ──────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_complete_lesson(client: AsyncClient, student, teacher, org, db):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    await make_enrollment(db, course.id, student.id)
    resp = await client.post(
        f"/api/v1/progress/lessons/{lesson.id}/complete",
        headers=auth_header(student),
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_complete_lesson_idempotent(client: AsyncClient, student, teacher, org, db):
    """Completing the same lesson twice should not error."""
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    await make_enrollment(db, course.id, student.id)
    await client.post(
        f"/api/v1/progress/lessons/{lesson.id}/complete",
        headers=auth_header(student),
    )
    resp = await client.post(
        f"/api/v1/progress/lessons/{lesson.id}/complete",
        headers=auth_header(student),
    )
    assert resp.status_code == 200


# ─── Lesson Progress ────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_course_lesson_progress(client: AsyncClient, student, teacher, org, db):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    await make_lesson(db, module.id)
    await make_enrollment(db, course.id, student.id)
    resp = await client.get(
        f"/api/v1/progress/courses/{course.id}/lesson-progress",
        headers=auth_header(student),
    )
    assert resp.status_code == 200


# ─── Theory highlights ───────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_highlight_create_list_delete(client: AsyncClient, student, teacher, org, db):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)

    # create
    resp = await client.post(
        f"/api/v1/progress/lessons/{lesson.id}/highlights",
        json={
            "block_key": "block-1",
            "start_offset": 5,
            "end_offset": 12,
            "kind": "underline",
            "text_snippet": "example",
        },
        headers=auth_header(student),
    )
    assert resp.status_code == 200
    created = resp.json()
    assert created["block_key"] == "block-1"
    assert created["kind"] == "underline"

    # list — own marks visible
    resp = await client.get(
        f"/api/v1/progress/lessons/{lesson.id}/highlights",
        headers=auth_header(student),
    )
    assert resp.status_code == 200
    assert [h["id"] for h in resp.json()] == [created["id"]]

    # other user sees nothing
    resp = await client.get(
        f"/api/v1/progress/lessons/{lesson.id}/highlights",
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200
    assert resp.json() == []

    # other user cannot delete it
    resp = await client.delete(
        f"/api/v1/progress/highlights/{created['id']}",
        headers=auth_header(teacher),
    )
    assert resp.status_code == 404

    # owner deletes
    resp = await client.delete(
        f"/api/v1/progress/highlights/{created['id']}",
        headers=auth_header(student),
    )
    assert resp.status_code == 200
    resp = await client.get(
        f"/api/v1/progress/lessons/{lesson.id}/highlights",
        headers=auth_header(student),
    )
    assert resp.json() == []


@pytest.mark.asyncio
async def test_highlight_invalid_range_rejected(client: AsyncClient, student, teacher, org, db):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    resp = await client.post(
        f"/api/v1/progress/lessons/{lesson.id}/highlights",
        json={"start_offset": 10, "end_offset": 10, "kind": "highlight"},
        headers=auth_header(student),
    )
    assert resp.status_code == 422

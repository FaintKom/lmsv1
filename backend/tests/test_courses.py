"""Tests for courses, modules, lessons — CRUD and permissions."""

import pytest
from httpx import AsyncClient

from tests.conftest import auth_header, make_course, make_lesson, make_module

# ─── Course CRUD ─────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_create_course_as_teacher(client: AsyncClient, teacher, org):
    resp = await client.post("/api/v1/courses", json={
        "title": "Python Basics",
        "description": "Learn Python",
        "category": "programming",
    }, headers=auth_header(teacher))
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "Python Basics"
    assert data["status"] == "draft"


@pytest.mark.asyncio
async def test_create_course_as_admin(client: AsyncClient, admin, org):
    resp = await client.post("/api/v1/courses", json={
        "title": "Admin Course",
        "description": "Course by admin",
        "category": "math",
    }, headers=auth_header(admin))
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_create_course_as_student_forbidden(client: AsyncClient, student):
    resp = await client.post("/api/v1/courses", json={
        "title": "Student Course",
        "description": "Nope",
    }, headers=auth_header(student))
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_create_course_as_super_admin(client: AsyncClient, super_admin, org):
    """Super admin can create courses (bypasses all role checks)."""
    resp = await client.post("/api/v1/courses", json={
        "title": "SA Course",
        "description": "By super admin",
        "category": "science",
    }, headers=auth_header(super_admin))
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_list_courses(client: AsyncClient, teacher, org, db):
    await make_course(db, org, teacher, title="Course A")
    await make_course(db, org, teacher, title="Course B")
    resp = await client.get("/api/v1/courses", headers=auth_header(teacher))
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 2


@pytest.mark.asyncio
async def test_get_course(client: AsyncClient, teacher, org, db):
    course = await make_course(db, org, teacher)
    resp = await client.get(f"/api/v1/courses/{course.id}", headers=auth_header(teacher))
    assert resp.status_code == 200
    assert resp.json()["id"] == str(course.id)


@pytest.mark.asyncio
async def test_update_course(client: AsyncClient, teacher, org, db):
    course = await make_course(db, org, teacher)
    resp = await client.put(f"/api/v1/courses/{course.id}", json={
        "title": "Updated Title",
    }, headers=auth_header(teacher))
    assert resp.status_code == 200
    assert resp.json()["title"] == "Updated Title"


@pytest.mark.asyncio
async def test_publish_course(client: AsyncClient, teacher, org, db):
    course = await make_course(db, org, teacher)
    resp = await client.post(
        f"/api/v1/courses/{course.id}/publish",
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "published"


@pytest.mark.asyncio
async def test_delete_course(client: AsyncClient, teacher, org, db):
    course = await make_course(db, org, teacher)
    resp = await client.delete(
        f"/api/v1/courses/{course.id}",
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_student_cannot_delete_course(client: AsyncClient, student, teacher, org, db):
    course = await make_course(db, org, teacher)
    resp = await client.delete(
        f"/api/v1/courses/{course.id}",
        headers=auth_header(student),
    )
    assert resp.status_code == 403


# ─── Course Copy ─────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_copy_course(client: AsyncClient, teacher, org, db):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    await make_lesson(db, module.id)
    resp = await client.post(
        f"/api/v1/courses/{course.id}/copy",
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200
    assert resp.json()["title"].startswith(course.title)


# ─── Modules ─────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_create_module(client: AsyncClient, teacher, org, db):
    course = await make_course(db, org, teacher)
    resp = await client.post(f"/api/v1/courses/{course.id}/modules", json={
        "title": "Module 1",
    }, headers=auth_header(teacher))
    assert resp.status_code == 200
    assert resp.json()["title"] == "Module 1"


@pytest.mark.asyncio
async def test_update_module(client: AsyncClient, teacher, org, db):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id, title="Old Title")
    resp = await client.put(
        f"/api/v1/courses/{course.id}/modules/{module.id}",
        json={"title": "New Title"},
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200
    assert resp.json()["title"] == "New Title"


@pytest.mark.asyncio
async def test_delete_module(client: AsyncClient, teacher, org, db):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    resp = await client.delete(
        f"/api/v1/courses/{course.id}/modules/{module.id}",
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_student_cannot_create_module(client: AsyncClient, student, teacher, org, db):
    course = await make_course(db, org, teacher)
    resp = await client.post(f"/api/v1/courses/{course.id}/modules", json={
        "title": "Nope",
    }, headers=auth_header(student))
    assert resp.status_code == 403


# ─── Lessons ─────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_create_lesson(client: AsyncClient, teacher, org, db):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    resp = await client.post(
        f"/api/v1/courses/{course.id}/modules/{module.id}/lessons",
        json={"title": "Lesson 1", "content_type": "text", "content": {"body": "Hello"}},
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200
    assert resp.json()["title"] == "Lesson 1"


@pytest.mark.asyncio
async def test_get_lesson(client: AsyncClient, teacher, org, db):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    resp = await client.get(
        f"/api/v1/courses/{course.id}/lessons/{lesson.id}",
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_update_lesson(client: AsyncClient, teacher, org, db):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    resp = await client.put(
        f"/api/v1/courses/{course.id}/modules/{module.id}/lessons/{lesson.id}",
        json={"title": "Updated Lesson"},
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_delete_lesson(client: AsyncClient, teacher, org, db):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    resp = await client.delete(
        f"/api/v1/courses/{course.id}/modules/{module.id}/lessons/{lesson.id}",
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200


# ─── Reorder ─────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_reorder_modules(client: AsyncClient, teacher, org, db):
    course = await make_course(db, org, teacher)
    m1 = await make_module(db, course.id, title="M1", sort_order=0)
    m2 = await make_module(db, course.id, title="M2", sort_order=1)
    resp = await client.put(
        f"/api/v1/courses/{course.id}/modules/reorder",
        json={"ordered_ids": [str(m2.id), str(m1.id)]},
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_reorder_lessons(client: AsyncClient, teacher, org, db):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    l1 = await make_lesson(db, module.id, title="L1", sort_order=0)
    l2 = await make_lesson(db, module.id, title="L2", sort_order=1)
    resp = await client.put(
        f"/api/v1/courses/{course.id}/modules/{module.id}/lessons/reorder",
        json={"ordered_ids": [str(l2.id), str(l1.id)]},
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200


# ─── Search ──────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_search_courses(client: AsyncClient, teacher, org, db):
    await make_course(db, org, teacher, title="Python Fundamentals")
    resp = await client.get(
        "/api/v1/courses/search",
        params={"q": "Python"},
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200


# ─── Templates ───────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_templates(client: AsyncClient, teacher, org):
    resp = await client.get("/api/v1/courses/templates", headers=auth_header(teacher))
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)

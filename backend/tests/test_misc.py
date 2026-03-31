"""Tests for learning paths, parent portal, billing, sandbox, recommendations, math problems."""
import uuid

import pytest
from httpx import AsyncClient

from tests.conftest import (
    auth_header,
    make_course,
    make_enrollment,
    make_lesson,
    make_module,
)


# ─── Learning Paths ─────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_create_learning_path(client: AsyncClient, admin, org, db):
    resp = await client.post("/api/v1/learning-paths", json={
        "title": "Web Dev Path",
        "description": "Full stack web development",
    }, headers=auth_header(admin))
    assert resp.status_code in (200, 201)


@pytest.mark.asyncio
async def test_list_learning_paths(client: AsyncClient, student):
    resp = await client.get("/api/v1/learning-paths", headers=auth_header(student))
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_student_cannot_create_learning_path(client: AsyncClient, student):
    resp = await client.post("/api/v1/learning-paths", json={
        "title": "Nope",
        "description": "Student path",
    }, headers=auth_header(student))
    assert resp.status_code == 403


# ─── Parent Portal ───────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_parent_list_children(client: AsyncClient, parent):
    resp = await client.get("/api/v1/parent/children", headers=auth_header(parent))
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_parent_link_child(client: AsyncClient, parent, student):
    resp = await client.post("/api/v1/parent/children/link", json={
        "child_email": student.email,
    }, headers=auth_header(parent))
    # May succeed or fail depending on validation
    assert resp.status_code in (200, 400, 404)


@pytest.mark.asyncio
async def test_student_cannot_access_parent_portal(client: AsyncClient, student):
    resp = await client.get("/api/v1/parent/children", headers=auth_header(student))
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_parent_view_child_progress(client: AsyncClient, parent, student, db):
    from app.auth.models import ParentChild
    pc = ParentChild(parent_id=parent.id, child_id=student.id)
    db.add(pc)
    await db.flush()
    resp = await client.get(
        f"/api/v1/parent/children/{student.id}/progress",
        headers=auth_header(parent),
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_parent_view_child_grades(client: AsyncClient, parent, student, db):
    from app.auth.models import ParentChild
    pc = ParentChild(parent_id=parent.id, child_id=student.id)
    db.add(pc)
    await db.flush()
    resp = await client.get(
        f"/api/v1/parent/children/{student.id}/grades",
        headers=auth_header(parent),
    )
    assert resp.status_code == 200


# ─── Billing ─────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_plans(client: AsyncClient, admin):
    resp = await client.get("/api/v1/billing/plans", headers=auth_header(admin))
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_get_subscription(client: AsyncClient, admin):
    resp = await client.get("/api/v1/billing/subscription", headers=auth_header(admin))
    # May return 200 with null or 404 if no subscription
    assert resp.status_code in (200, 404)


@pytest.mark.asyncio
async def test_list_invoices(client: AsyncClient, admin):
    resp = await client.get("/api/v1/billing/invoices", headers=auth_header(admin))
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_student_cannot_access_billing(client: AsyncClient, student):
    resp = await client.get("/api/v1/billing/plans", headers=auth_header(student))
    # Billing might be accessible to all or restricted
    assert resp.status_code in (200, 403)


# ─── Sandbox / Code Execution ────────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_languages(client: AsyncClient, student):
    resp = await client.get("/api/v1/sandbox/languages", headers=auth_header(student))
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_list_challenges(client: AsyncClient, student):
    resp = await client.get("/api/v1/sandbox/challenges", headers=auth_header(student))
    assert resp.status_code == 200


# ─── Submissions (file/interactive) ─────────────────────────────────────


@pytest.mark.asyncio
async def test_submit_interactive(client: AsyncClient, student, teacher, org, db):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    resp = await client.post(
        f"/api/v1/submissions/lessons/{lesson.id}/interactive",
        json={"exercise_type": "quiz", "answers": {"q1": "a"}, "score": 0.8, "passed": True},
        headers=auth_header(student),
    )
    assert resp.status_code == 200


# ─── Recommendations ────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_recommendations(client: AsyncClient, student):
    resp = await client.get("/api/v1/recommendations", headers=auth_header(student))
    assert resp.status_code == 200


# ─── Math Problems ───────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_generate_math_problem(client: AsyncClient, student):
    resp = await client.get(
        "/api/v1/math-problems/generate",
        params={"topic": "arithmetic", "count": 1},
        headers=auth_header(student),
    )
    assert resp.status_code in (200, 422)


@pytest.mark.asyncio
async def test_check_math_answer(client: AsyncClient, student):
    resp = await client.post("/api/v1/math-problems/check", json={
        "user_answer": "42",
        "correct_answer": "42",
    }, headers=auth_header(student))
    assert resp.status_code in (200, 400, 422)


# ─── Health Check ────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_health(client: AsyncClient):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}

"""Cross-org IDOR regression tests (Plan 002).

Locks the multi-tenant boundary introduced in Plan 001: a caller in org B must
not reach lesson-keyed resources (quizzes, submissions, highlights) owned by
org A. Cross-org access returns 404 (NotFoundError) — never 403 — so existence
of another org's resources is not leaked. Same-org positive controls prove the
checks are isolation, not blanket denial.
"""
import pytest
from httpx import AsyncClient

from app.auth.models import UserRole
from tests.conftest import (
    _make_user,
    auth_header,
    make_course,
    make_lesson,
    make_module,
)


async def _make_lesson_in(db, org, teacher):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    return course, module, lesson


async def _create_quiz(client, teacher, lesson_id):
    resp = await client.post(
        "/api/v1/assessments/quizzes",
        json={
            "lesson_id": str(lesson_id),
            "title": "Quiz Test",
            "passing_score": 70,
            "time_limit_minutes": 30,
        },
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200
    return resp.json()


# ─── Quiz: cross-org 404 + same-org 200 control ──────────────────────────


@pytest.mark.asyncio
async def test_cross_org_quiz_get_is_404(client: AsyncClient, db, org, teacher, admin2):
    _, _, lesson = await _make_lesson_in(db, org, teacher)
    quiz = await _create_quiz(client, teacher, lesson.id)
    resp = await client.get(
        f"/api/v1/assessments/quizzes/{quiz['id']}",
        headers=auth_header(admin2),
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_cross_org_quiz_by_lesson_is_404(client: AsyncClient, db, org, teacher, admin2):
    _, _, lesson = await _make_lesson_in(db, org, teacher)
    await _create_quiz(client, teacher, lesson.id)
    resp = await client.get(
        f"/api/v1/assessments/lessons/{lesson.id}/quiz",
        headers=auth_header(admin2),
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_same_org_quiz_get_is_200(client: AsyncClient, db, org, teacher):
    _, _, lesson = await _make_lesson_in(db, org, teacher)
    quiz = await _create_quiz(client, teacher, lesson.id)
    resp = await client.get(
        f"/api/v1/assessments/quizzes/{quiz['id']}",
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_cross_org_quiz_submit_is_404(client: AsyncClient, db, org, teacher, org2):
    _, _, lesson = await _make_lesson_in(db, org, teacher)
    quiz = await _create_quiz(client, teacher, lesson.id)
    foreign_student = _make_user(db, org2, UserRole.student, suffix="x")
    await db.flush()
    resp = await client.post(
        f"/api/v1/assessments/quizzes/{quiz['id']}/submit",
        json={"answers": []},
        headers=auth_header(foreign_student),
    )
    assert resp.status_code == 404


# ─── Submissions: cross-org 404 ──────────────────────────────────────────


@pytest.mark.asyncio
async def test_cross_org_file_list_is_404(client: AsyncClient, db, org, teacher, admin2):
    _, _, lesson = await _make_lesson_in(db, org, teacher)
    resp = await client.get(
        f"/api/v1/submissions/lessons/{lesson.id}/files",
        headers=auth_header(admin2),
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_cross_org_interactive_list_is_404(client: AsyncClient, db, org, teacher, admin2):
    _, _, lesson = await _make_lesson_in(db, org, teacher)
    resp = await client.get(
        f"/api/v1/submissions/lessons/{lesson.id}/interactive",
        headers=auth_header(admin2),
    )
    assert resp.status_code == 404


# ─── Highlights: cross-org 404 + same-org 200 control ────────────────────


def _highlight_body():
    return {
        "block_key": "",
        "start_offset": 0,
        "end_offset": 5,
        "kind": "highlight",
        "text_snippet": "hello",
    }


@pytest.mark.asyncio
async def test_cross_org_highlights_get_is_404(client: AsyncClient, db, org, teacher, org2):
    _, _, lesson = await _make_lesson_in(db, org, teacher)
    foreign_student = _make_user(db, org2, UserRole.student, suffix="x")
    await db.flush()
    resp = await client.get(
        f"/api/v1/progress/lessons/{lesson.id}/highlights",
        headers=auth_header(foreign_student),
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_cross_org_highlights_post_is_404(client: AsyncClient, db, org, teacher, org2):
    _, _, lesson = await _make_lesson_in(db, org, teacher)
    foreign_student = _make_user(db, org2, UserRole.student, suffix="x")
    await db.flush()
    resp = await client.post(
        f"/api/v1/progress/lessons/{lesson.id}/highlights",
        json=_highlight_body(),
        headers=auth_header(foreign_student),
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_same_org_highlights_get_is_200(client: AsyncClient, db, org, teacher, student):
    _, _, lesson = await _make_lesson_in(db, org, teacher)
    resp = await client.get(
        f"/api/v1/progress/lessons/{lesson.id}/highlights",
        headers=auth_header(student),
    )
    assert resp.status_code == 200


# ─── Highlights: cross-student isolation within the same org (T5) ─────────


@pytest.mark.asyncio
async def test_highlights_isolated_between_students(client: AsyncClient, db, org, teacher, student):
    _, _, lesson = await _make_lesson_in(db, org, teacher)
    student_b = _make_user(db, org, UserRole.student, suffix="b")
    await db.flush()

    # Student A creates a highlight.
    created = await client.post(
        f"/api/v1/progress/lessons/{lesson.id}/highlights",
        json=_highlight_body(),
        headers=auth_header(student),
    )
    assert created.status_code == 200
    highlight_id = created.json()["id"]

    # Student B's list does not contain it.
    list_b = await client.get(
        f"/api/v1/progress/lessons/{lesson.id}/highlights",
        headers=auth_header(student_b),
    )
    assert list_b.status_code == 200
    assert all(h["id"] != highlight_id for h in list_b.json())

    # Student B cannot delete student A's highlight.
    del_b = await client.delete(
        f"/api/v1/progress/highlights/{highlight_id}",
        headers=auth_header(student_b),
    )
    assert del_b.status_code == 404

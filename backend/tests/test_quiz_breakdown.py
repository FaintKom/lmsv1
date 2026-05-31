"""Teacher-facing quiz submission breakdown endpoint.

Covers:
  - correct per-question breakdown (student answer, correct answer, is_correct,
    points, totals) — consistent with how grade_quiz scores the submission.
  - RBAC: owner-teacher 200; other teacher in same org 403; methodist (same
    org) 200; admin (same org) 200; cross-org admin 404; student/parent 403.
  - latest-attempt lookup by (quiz, student).
"""
import uuid
from datetime import datetime, timezone

import pytest
from httpx import AsyncClient

from app.auth.models import User, UserRole
from app.auth.security import hash_password
from tests.conftest import (
    auth_header,
    make_course,
    make_lesson,
    make_module,
)


async def _build_graded_quiz(client, teacher, lesson_id):
    """Create a quiz with one MC + one text question; return (quiz, q_mc, q_text)."""
    quiz_resp = await client.post(
        "/api/v1/assessments/quizzes",
        json={"lesson_id": str(lesson_id), "title": "Breakdown Quiz", "passing_score": 50},
        headers=auth_header(teacher),
    )
    assert quiz_resp.status_code == 200
    quiz = quiz_resp.json()

    mc_resp = await client.post(
        f"/api/v1/assessments/quizzes/{quiz['id']}/questions",
        json={
            "question_text": "Capital of France?",
            "question_type": "multiple_choice",
            "options": [
                {"text": "Paris", "is_correct": True},
                {"text": "Berlin", "is_correct": False},
            ],
            "correct_answer": "Paris",
            "points": 10,
        },
        headers=auth_header(teacher),
    )
    assert mc_resp.status_code == 200
    text_resp = await client.post(
        f"/api/v1/assessments/quizzes/{quiz['id']}/questions",
        json={
            "question_text": "2+2?",
            "question_type": "text_answer",
            "correct_answer": "4",
            "points": 10,
        },
        headers=auth_header(teacher),
    )
    assert text_resp.status_code == 200
    return quiz, mc_resp.json(), text_resp.json()


async def _submit(client, student, quiz_id, q_mc, q_text, *, mc_text, text_val):
    resp = await client.post(
        f"/api/v1/assessments/quizzes/{quiz_id}/submit",
        json={
            "answers": [
                {"question_id": q_mc["id"], "selected_option": mc_text},
                {"question_id": q_text["id"], "text": text_val},
            ]
        },
        headers=auth_header(student),
    )
    assert resp.status_code == 200
    return resp.json()


def _new_user(db, org, role, *, is_methodist=False):
    u = User(
        org_id=org.id,
        email=f"{role.value}-{uuid.uuid4().hex[:6]}@test.com",
        hashed_password=hash_password("TestPass123!"),
        full_name=f"Test {role.value}",
        role=role,
        is_active=True,
        is_methodist=is_methodist,
        consent_accepted_at=datetime.now(timezone.utc),
        privacy_policy_version="1.0",
    )
    db.add(u)
    return u


# ─── Breakdown correctness ───────────────────────────────────────────────


@pytest.mark.asyncio
async def test_breakdown_reports_per_question_correctness(client: AsyncClient, teacher, student, org, db):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    quiz, q_mc, q_text = await _build_graded_quiz(client, teacher, lesson.id)

    # Student gets MC right, text wrong.
    await _submit(client, student, quiz["id"], q_mc, q_text, mc_text="Paris", text_val="5")

    resp = await client.get(
        f"/api/v1/assessments/quizzes/{quiz['id']}/students/{student.id}/breakdown",
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200
    data = resp.json()

    assert data["quiz_title"] == "Breakdown Quiz"
    assert data["total_points"] == 20
    assert data["earned_points"] == 10  # only MC correct
    assert data["student_id"] == str(student.id)
    assert len(data["questions"]) == 2

    by_id = {q["question_id"]: q for q in data["questions"]}
    mc = by_id[q_mc["id"]]
    assert mc["is_correct"] is True
    assert mc["student_answer"] == "Paris"
    assert mc["correct_answer"] == "Paris"
    assert mc["points_earned"] == 10

    txt = by_id[q_text["id"]]
    assert txt["is_correct"] is False
    assert txt["student_answer"] == "5"
    assert txt["correct_answer"] == "4"
    assert txt["points_earned"] == 0


@pytest.mark.asyncio
async def test_breakdown_by_submission_id(client: AsyncClient, teacher, student, org, db):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    quiz, q_mc, q_text = await _build_graded_quiz(client, teacher, lesson.id)
    sub = await _submit(client, student, quiz["id"], q_mc, q_text, mc_text="Paris", text_val="4")

    resp = await client.get(
        f"/api/v1/assessments/submissions/{sub['id']}/breakdown",
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["submission_id"] == sub["id"]
    assert data["earned_points"] == 20  # both correct


# ─── RBAC ────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_owner_teacher_can_view(client: AsyncClient, teacher, student, org, db):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    quiz, q_mc, q_text = await _build_graded_quiz(client, teacher, lesson.id)
    sub = await _submit(client, student, quiz["id"], q_mc, q_text, mc_text="Paris", text_val="4")

    resp = await client.get(
        f"/api/v1/assessments/submissions/{sub['id']}/breakdown",
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_other_teacher_same_org_forbidden(client: AsyncClient, teacher, student, org, db):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    quiz, q_mc, q_text = await _build_graded_quiz(client, teacher, lesson.id)
    sub = await _submit(client, student, quiz["id"], q_mc, q_text, mc_text="Paris", text_val="4")

    other = _new_user(db, org, UserRole.teacher)
    await db.flush()

    resp = await client.get(
        f"/api/v1/assessments/submissions/{sub['id']}/breakdown",
        headers=auth_header(other),
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_methodist_same_org_can_view(client: AsyncClient, teacher, student, org, db):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    quiz, q_mc, q_text = await _build_graded_quiz(client, teacher, lesson.id)
    sub = await _submit(client, student, quiz["id"], q_mc, q_text, mc_text="Paris", text_val="4")

    methodist = _new_user(db, org, UserRole.teacher, is_methodist=True)
    await db.flush()

    resp = await client.get(
        f"/api/v1/assessments/submissions/{sub['id']}/breakdown",
        headers=auth_header(methodist),
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_admin_same_org_can_view(client: AsyncClient, teacher, student, admin, org, db):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    quiz, q_mc, q_text = await _build_graded_quiz(client, teacher, lesson.id)
    sub = await _submit(client, student, quiz["id"], q_mc, q_text, mc_text="Paris", text_val="4")

    resp = await client.get(
        f"/api/v1/assessments/submissions/{sub['id']}/breakdown",
        headers=auth_header(admin),
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_cross_org_admin_404(client: AsyncClient, teacher, student, admin2, org, db):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    quiz, q_mc, q_text = await _build_graded_quiz(client, teacher, lesson.id)
    sub = await _submit(client, student, quiz["id"], q_mc, q_text, mc_text="Paris", text_val="4")

    # admin2 belongs to a different org → existence hidden as 404.
    resp = await client.get(
        f"/api/v1/assessments/submissions/{sub['id']}/breakdown",
        headers=auth_header(admin2),
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_student_forbidden(client: AsyncClient, teacher, student, org, db):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    quiz, q_mc, q_text = await _build_graded_quiz(client, teacher, lesson.id)
    sub = await _submit(client, student, quiz["id"], q_mc, q_text, mc_text="Paris", text_val="4")

    resp = await client.get(
        f"/api/v1/assessments/submissions/{sub['id']}/breakdown",
        headers=auth_header(student),
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_parent_forbidden(client: AsyncClient, teacher, student, parent, org, db):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    quiz, q_mc, q_text = await _build_graded_quiz(client, teacher, lesson.id)
    sub = await _submit(client, student, quiz["id"], q_mc, q_text, mc_text="Paris", text_val="4")

    resp = await client.get(
        f"/api/v1/assessments/submissions/{sub['id']}/breakdown",
        headers=auth_header(parent),
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_missing_submission_404(client: AsyncClient, teacher, org, db):
    resp = await client.get(
        f"/api/v1/assessments/submissions/{uuid.uuid4()}/breakdown",
        headers=auth_header(teacher),
    )
    assert resp.status_code == 404

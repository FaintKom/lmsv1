"""Tests for assessments/quizzes: CRUD, questions, submission, answer stripping."""
import pytest
from httpx import AsyncClient

from tests.conftest import (
    auth_header,
    make_course,
    make_lesson,
    make_module,
)


# ─── Quiz CRUD ───────────────────────────────────────────────────────────


async def _create_quiz(client, teacher, lesson_id):
    """Helper to create a quiz and return it."""
    resp = await client.post("/api/v1/assessments/quizzes", json={
        "lesson_id": str(lesson_id),
        "title": "Quiz Test",
        "passing_score": 70,
        "time_limit_minutes": 30,
    }, headers=auth_header(teacher))
    assert resp.status_code == 200
    return resp.json()


@pytest.mark.asyncio
async def test_create_quiz(client: AsyncClient, teacher, org, db):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    quiz = await _create_quiz(client, teacher, lesson.id)
    assert quiz["title"] == "Quiz Test"
    assert quiz["passing_score"] == 70


@pytest.mark.asyncio
async def test_get_quiz(client: AsyncClient, teacher, org, db):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    quiz = await _create_quiz(client, teacher, lesson.id)
    resp = await client.get(
        f"/api/v1/assessments/quizzes/{quiz['id']}",
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_get_quiz_by_lesson(client: AsyncClient, teacher, org, db):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    await _create_quiz(client, teacher, lesson.id)
    resp = await client.get(
        f"/api/v1/assessments/lessons/{lesson.id}/quiz",
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_update_quiz(client: AsyncClient, teacher, org, db):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    quiz = await _create_quiz(client, teacher, lesson.id)
    resp = await client.put(
        f"/api/v1/assessments/quizzes/{quiz['id']}",
        json={"title": "Updated Quiz", "passing_score": 80},
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200
    assert resp.json()["title"] == "Updated Quiz"


@pytest.mark.asyncio
async def test_delete_quiz(client: AsyncClient, teacher, org, db):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    quiz = await _create_quiz(client, teacher, lesson.id)
    resp = await client.delete(
        f"/api/v1/assessments/quizzes/{quiz['id']}",
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_student_cannot_create_quiz(client: AsyncClient, student, teacher, org, db):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    resp = await client.post("/api/v1/assessments/quizzes", json={
        "lesson_id": str(lesson.id),
        "title": "Nope",
        "passing_score": 70,
    }, headers=auth_header(student))
    assert resp.status_code == 403


# ─── Questions ───────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_add_question(client: AsyncClient, teacher, org, db):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    quiz = await _create_quiz(client, teacher, lesson.id)
    resp = await client.post(
        f"/api/v1/assessments/quizzes/{quiz['id']}/questions",
        json={
            "question_text": "What is 2+2?",
            "question_type": "multiple_choice",
            "options": [
                {"text": "3", "is_correct": False},
                {"text": "4", "is_correct": True},
                {"text": "5", "is_correct": False},
            ],
            "correct_answer": "4",
            "points": 10,
        },
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_update_question(client: AsyncClient, teacher, org, db):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    quiz = await _create_quiz(client, teacher, lesson.id)
    q_resp = await client.post(
        f"/api/v1/assessments/quizzes/{quiz['id']}/questions",
        json={
            "question_text": "Old question",
            "question_type": "text_answer",
            "correct_answer": "old",
            "points": 5,
        },
        headers=auth_header(teacher),
    )
    q = q_resp.json()
    resp = await client.put(
        f"/api/v1/assessments/questions/{q['id']}",
        json={"question_text": "Updated question"},
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_delete_question(client: AsyncClient, teacher, org, db):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    quiz = await _create_quiz(client, teacher, lesson.id)
    q_resp = await client.post(
        f"/api/v1/assessments/quizzes/{quiz['id']}/questions",
        json={
            "question_text": "To delete",
            "question_type": "text_answer",
            "correct_answer": "x",
            "points": 5,
        },
        headers=auth_header(teacher),
    )
    q = q_resp.json()
    resp = await client.delete(
        f"/api/v1/assessments/questions/{q['id']}",
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200


# ─── Answer Stripping for Students ──────────────────────────────────────


@pytest.mark.asyncio
async def test_student_cannot_see_correct_answers(client: AsyncClient, student, teacher, org, db):
    """Student views quiz — correct answers must be stripped."""
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    quiz = await _create_quiz(client, teacher, lesson.id)
    # Add a question
    await client.post(
        f"/api/v1/assessments/quizzes/{quiz['id']}/questions",
        json={
            "question_text": "Q?",
            "question_type": "multiple_choice",
            "options": [
                {"text": "A", "is_correct": False},
                {"text": "B", "is_correct": True},
            ],
            "correct_answer": "B",
            "points": 10,
        },
        headers=auth_header(teacher),
    )
    # Student views
    resp = await client.get(
        f"/api/v1/assessments/quizzes/{quiz['id']}",
        headers=auth_header(student),
    )
    assert resp.status_code == 200
    data = resp.json()
    if data.get("questions"):
        for q in data["questions"]:
            assert "correct_answer" not in q
            if q.get("options"):
                for opt in q["options"]:
                    assert "is_correct" not in opt


@pytest.mark.asyncio
async def test_teacher_can_see_correct_answers(client: AsyncClient, teacher, org, db):
    """Teacher can see quiz with options (including is_correct)."""
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    quiz = await _create_quiz(client, teacher, lesson.id)
    await client.post(
        f"/api/v1/assessments/quizzes/{quiz['id']}/questions",
        json={
            "question_text": "Q?",
            "question_type": "multiple_choice",
            "options": [{"text": "A", "is_correct": True}],
            "correct_answer": "A",
            "points": 10,
        },
        headers=auth_header(teacher),
    )
    resp = await client.get(
        f"/api/v1/assessments/quizzes/{quiz['id']}",
        headers=auth_header(teacher),
    )
    data = resp.json()
    assert data.get("questions") is not None
    # Teacher should see options with is_correct visible
    if data["questions"] and data["questions"][0].get("options"):
        assert "is_correct" in data["questions"][0]["options"][0]


# ─── Submission ──────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_submit_quiz(client: AsyncClient, student, teacher, org, db):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    quiz = await _create_quiz(client, teacher, lesson.id)
    q_resp = await client.post(
        f"/api/v1/assessments/quizzes/{quiz['id']}/questions",
        json={
            "question_text": "2+2?",
            "question_type": "text_answer",
            "correct_answer": "4",
            "points": 10,
        },
        headers=auth_header(teacher),
    )
    q = q_resp.json()
    resp = await client.post(
        f"/api/v1/assessments/quizzes/{quiz['id']}/submit",
        json={"answers": [{"question_id": q["id"], "text": "4"}]},
        headers=auth_header(student),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "score" in data

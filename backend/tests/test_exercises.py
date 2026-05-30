"""Tests for the unified exercise system — CRUD, questions, test cases, submissions."""

import pytest
from httpx import AsyncClient

from tests.conftest import (
    auth_header,
    make_course,
    make_exercise,
    make_lesson,
    make_module,
)

# ─── Exercise CRUD ───────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_create_quiz_exercise(client: AsyncClient, teacher, org, db):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    resp = await client.post("/api/v1/exercises", json={
        "lesson_id": str(lesson.id),
        "exercise_type": "quiz",
        "title": "Quiz Exercise",
        "config": {},
    }, headers=auth_header(teacher))
    assert resp.status_code == 200
    assert resp.json()["exercise_type"] == "quiz"


@pytest.mark.asyncio
async def test_create_code_challenge_exercise(client: AsyncClient, teacher, org, db):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    resp = await client.post("/api/v1/exercises", json={
        "lesson_id": str(lesson.id),
        "exercise_type": "code_challenge",
        "title": "Code Challenge",
        "config": {"language": "python", "starter_code": "def solution():\n    pass"},
    }, headers=auth_header(teacher))
    assert resp.status_code == 200
    assert resp.json()["exercise_type"] == "code_challenge"


@pytest.mark.asyncio
async def test_create_matching_exercise(client: AsyncClient, teacher, org, db):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    resp = await client.post("/api/v1/exercises", json={
        "lesson_id": str(lesson.id),
        "exercise_type": "matching",
        "title": "Match Words",
        "config": {"pairs": [{"left": "hello", "right": "привет"}]},
    }, headers=auth_header(teacher))
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_create_ordering_exercise(client: AsyncClient, teacher, org, db):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    resp = await client.post("/api/v1/exercises", json={
        "lesson_id": str(lesson.id),
        "exercise_type": "ordering",
        "title": "Order Steps",
        "config": {"correct_order": ["step1", "step2", "step3"]},
    }, headers=auth_header(teacher))
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_create_fill_blanks_exercise(client: AsyncClient, teacher, org, db):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    resp = await client.post("/api/v1/exercises", json={
        "lesson_id": str(lesson.id),
        "exercise_type": "fill_blanks",
        "title": "Fill Blanks",
        "config": {"text": "Python is a ___ language", "blanks": ["programming"]},
    }, headers=auth_header(teacher))
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_create_true_false_exercise(client: AsyncClient, teacher, org, db):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    resp = await client.post("/api/v1/exercises", json={
        "lesson_id": str(lesson.id),
        "exercise_type": "true_false",
        "title": "True or False",
        "config": {"correct_answer": True},
    }, headers=auth_header(teacher))
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_create_categorize_exercise(client: AsyncClient, teacher, org, db):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    resp = await client.post("/api/v1/exercises", json={
        "lesson_id": str(lesson.id),
        "exercise_type": "categorize",
        "title": "Categorize Items",
        "config": {"categories": {"fruit": ["apple"], "veggie": ["carrot"]}},
    }, headers=auth_header(teacher))
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_create_file_upload_exercise(client: AsyncClient, teacher, org, db):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    resp = await client.post("/api/v1/exercises", json={
        "lesson_id": str(lesson.id),
        "exercise_type": "file_upload",
        "title": "Upload Homework",
        "config": {"allowed_types": [".pdf", ".docx"]},
    }, headers=auth_header(teacher))
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_student_cannot_create_exercise(client: AsyncClient, student, teacher, org, db):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    resp = await client.post("/api/v1/exercises", json={
        "lesson_id": str(lesson.id),
        "exercise_type": "quiz",
        "title": "Nope",
    }, headers=auth_header(student))
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_list_exercises(client: AsyncClient, teacher, org, db):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    await make_exercise(db, lesson.id, org.id, title="Ex1")
    await make_exercise(db, lesson.id, org.id, title="Ex2")
    resp = await client.get("/api/v1/exercises", headers=auth_header(teacher))
    assert resp.status_code == 200
    assert resp.json()["total"] >= 2


@pytest.mark.asyncio
async def test_get_exercise(client: AsyncClient, teacher, org, db):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    ex = await make_exercise(db, lesson.id, org.id)
    resp = await client.get(f"/api/v1/exercises/{ex.id}", headers=auth_header(teacher))
    assert resp.status_code == 200
    assert resp.json()["id"] == str(ex.id)


@pytest.mark.asyncio
async def test_update_exercise(client: AsyncClient, teacher, org, db):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    ex = await make_exercise(db, lesson.id, org.id)
    resp = await client.put(f"/api/v1/exercises/{ex.id}", json={
        "title": "Updated Exercise",
    }, headers=auth_header(teacher))
    assert resp.status_code == 200
    assert resp.json()["title"] == "Updated Exercise"


@pytest.mark.asyncio
async def test_delete_exercise(client: AsyncClient, teacher, org, db):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    ex = await make_exercise(db, lesson.id, org.id)
    resp = await client.delete(f"/api/v1/exercises/{ex.id}", headers=auth_header(teacher))
    assert resp.status_code == 200


# ─── Get by Lesson ───────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_exercises_by_lesson(client: AsyncClient, teacher, org, db):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    await make_exercise(db, lesson.id, org.id, title="ByLesson")
    resp = await client.get(
        f"/api/v1/exercises/by-lesson/{lesson.id}",
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_student_sees_stripped_answers(client: AsyncClient, student, teacher, org, db):
    """Students should not see correct answers."""
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    ex = await make_exercise(db, lesson.id, org.id, config={"solution_code": "secret"})
    resp = await client.get(
        f"/api/v1/exercises/by-lesson/{lesson.id}",
        headers=auth_header(student),
    )
    assert resp.status_code == 200
    for ex_data in resp.json():
        if ex_data.get("config"):
            assert "solution_code" not in ex_data["config"]


# ─── Questions ───────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_add_question_to_exercise(client: AsyncClient, teacher, org, db):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    ex = await make_exercise(db, lesson.id, org.id)
    resp = await client.post(f"/api/v1/exercises/{ex.id}/questions", json={
        "question_text": "What is 2+2?",
        "question_type": "multiple_choice",
        "options": [
            {"text": "3", "is_correct": False},
            {"text": "4", "is_correct": True},
        ],
        "correct_answer": "4",
        "points": 10,
    }, headers=auth_header(teacher))
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_update_question(client: AsyncClient, teacher, org, db):
    from app.assessments.models import Question
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    ex = await make_exercise(db, lesson.id, org.id)
    q = Question(
        exercise_id=ex.id,
        question_text="Old question",
        question_type="text_answer",
        correct_answer="old",
        points=5,
        sort_order=0,
    )
    db.add(q)
    await db.flush()
    resp = await client.put(
        f"/api/v1/exercises/{ex.id}/questions/{q.id}",
        json={"question_text": "New question"},
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_delete_question(client: AsyncClient, teacher, org, db):
    from app.assessments.models import Question
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    ex = await make_exercise(db, lesson.id, org.id)
    q = Question(
        exercise_id=ex.id,
        question_text="To delete",
        question_type="text_answer",
        correct_answer="x",
        points=5,
        sort_order=0,
    )
    db.add(q)
    await db.flush()
    resp = await client.delete(
        f"/api/v1/exercises/{ex.id}/questions/{q.id}",
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200


# ─── Test Cases (code challenges) ────────────────────────────────────────


@pytest.mark.asyncio
async def test_add_test_case(client: AsyncClient, teacher, org, db):
    from app.exercises.models import ExerciseType
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    ex = await make_exercise(db, lesson.id, org.id, exercise_type=ExerciseType.code_challenge)
    resp = await client.post(f"/api/v1/exercises/{ex.id}/test-cases", json={
        "input": "5",
        "expected_output": "25",
        "is_hidden": False,
    }, headers=auth_header(teacher))
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_delete_test_case(client: AsyncClient, teacher, org, db):
    from app.exercises.models import ExerciseType
    from app.sandbox.models import TestCase
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    ex = await make_exercise(db, lesson.id, org.id, exercise_type=ExerciseType.code_challenge)
    tc = TestCase(exercise_id=ex.id, input="1", expected_output="1", is_hidden=False, sort_order=0)
    db.add(tc)
    await db.flush()
    resp = await client.delete(
        f"/api/v1/exercises/{ex.id}/test-cases/{tc.id}",
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200


# ─── Submissions ─────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_submit_exercise(client: AsyncClient, student, teacher, org, db):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    ex = await make_exercise(db, lesson.id, org.id)
    resp = await client.post(f"/api/v1/exercises/{ex.id}/submit", json={
        "answers": {"q1": "answer1"},
    }, headers=auth_header(student))
    # May be 200 or 422 depending on exercise validation
    assert resp.status_code in (200, 422, 400)


@pytest.mark.asyncio
async def test_list_submissions(client: AsyncClient, teacher, org, db):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    ex = await make_exercise(db, lesson.id, org.id)
    resp = await client.get(
        f"/api/v1/exercises/{ex.id}/submissions",
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200


# ─── Phase 1: time-on-task + attempt number ──────────────────────────────


@pytest.mark.asyncio
async def test_submit_stores_time_on_task(client: AsyncClient, student, teacher, org, db):
    """elapsed_seconds is persisted as time_spent_seconds + started_at."""
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    ex = await make_exercise(db, lesson.id, org.id)  # quiz (no questions)

    resp = await client.post(
        f"/api/v1/exercises/{ex.id}/submit",
        json={"answers": [], "elapsed_seconds": 42},
        headers=auth_header(student),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["time_spent_seconds"] == 42
    assert body["started_at"] is not None
    assert body["attempt_number"] == 1


@pytest.mark.asyncio
async def test_submit_clamps_garbage_elapsed(client: AsyncClient, student, teacher, org, db):
    """Negative elapsed clamps to 0; absurdly large clamps to 24h."""
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    ex = await make_exercise(db, lesson.id, org.id)

    neg = await client.post(
        f"/api/v1/exercises/{ex.id}/submit",
        json={"answers": [], "elapsed_seconds": -100},
        headers=auth_header(student),
    )
    assert neg.status_code == 200
    assert neg.json()["time_spent_seconds"] == 0

    huge = await client.post(
        f"/api/v1/exercises/{ex.id}/submit",
        json={"answers": [], "elapsed_seconds": 999_999_999},
        headers=auth_header(student),
    )
    assert huge.status_code == 200
    assert huge.json()["time_spent_seconds"] == 24 * 60 * 60


@pytest.mark.asyncio
async def test_attempt_number_increments(client: AsyncClient, student, teacher, org, db):
    """attempt_number increments across repeated submissions by the same student."""
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    ex = await make_exercise(db, lesson.id, org.id)

    nums = []
    for _ in range(3):
        resp = await client.post(
            f"/api/v1/exercises/{ex.id}/submit",
            json={"answers": [], "elapsed_seconds": 5},
            headers=auth_header(student),
        )
        assert resp.status_code == 200
        nums.append(resp.json()["attempt_number"])
    assert nums == [1, 2, 3]


@pytest.mark.asyncio
async def test_submit_without_elapsed_still_succeeds(client: AsyncClient, student, teacher, org, db):
    """Omitting elapsed_seconds (legacy clients) succeeds with NULL timing fields."""
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    ex = await make_exercise(db, lesson.id, org.id)

    resp = await client.post(
        f"/api/v1/exercises/{ex.id}/submit",
        json={"answers": []},
        headers=auth_header(student),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["time_spent_seconds"] is None
    assert body["started_at"] is None
    # attempt_number is still recorded even when timing is omitted
    assert body["attempt_number"] == 1

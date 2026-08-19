"""specs/018 FR-005: /check never persists — the teacher test mode leans on it.

The positive control is /submit on the same exercise: the counter must move
there, proving the counter itself works.
"""

from sqlalchemy import func, select

from app.exercises.models import ExerciseSubmission
from tests.conftest import auth_header, make_course, make_lesson, make_module


async def _submission_count(db, exercise_id) -> int:
    result = await db.execute(
        select(func.count(ExerciseSubmission.id)).where(
            ExerciseSubmission.exercise_id == exercise_id
        )
    )
    return result.scalar() or 0


async def test_check_creates_no_submission_while_submit_does(client, db, org, teacher, student):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)

    r = await client.post(
        "/api/v1/exercises",
        json={
            "lesson_id": str(lesson.id),
            "exercise_type": "true_false",
            "title": "spec018 check",
            "config": {"statement": "Water is wet", "correct_answer": True},
        },
        headers=auth_header(teacher),
    )
    assert r.status_code == 200
    exercise_id = r.json()["id"]

    before = await _submission_count(db, exercise_id)

    # /check: verdict, no persistence — three calls to make drift obvious
    for _ in range(3):
        r = await client.post(
            f"/api/v1/exercises/{exercise_id}/check",
            json={"interactive_answers": {"answer": True}},
            headers=auth_header(teacher),
        )
        assert r.status_code == 200
    assert await _submission_count(db, exercise_id) == before

    # positive control: /submit DOES move the counter
    r = await client.post(
        f"/api/v1/exercises/{exercise_id}/submit",
        json={"interactive_answers": {"answer": True}},
        headers=auth_header(student),
    )
    assert r.status_code == 200
    assert await _submission_count(db, exercise_id) == before + 1

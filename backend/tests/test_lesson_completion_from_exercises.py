"""A lesson made of exercises closes itself when they are solved (specs/050).

The "mark lesson as complete" button is hidden while a lesson carries
exercises — solving them is meant to be what finishes it. Nothing did the
finishing, so such a lesson stayed open forever: the course never reached
100 %, and the certificate that waits on it never arrived.
"""

from sqlalchemy import select

from app.assessments.models import Question
from app.progress.models import LessonProgress, LessonStatus
from tests.conftest import (
    auth_header,
    make_course,
    make_enrollment,
    make_exercise,
    make_lesson,
    make_module,
)


async def _quiz_with_one_question(db, org, lesson_id, answer="4"):
    ex = await make_exercise(db, lesson_id, org.id)
    q = Question(
        exercise_id=ex.id,
        question_text="2 + 2?",
        question_type="text_answer",
        correct_answer=answer,
        points=1,
        sort_order=0,
    )
    db.add(q)
    await db.flush()
    return ex, q


async def _completed_rows(db, lesson_id):
    return (
        (
            await db.execute(
                select(LessonProgress).where(
                    LessonProgress.lesson_id == lesson_id,
                    LessonProgress.status == LessonStatus.completed,
                )
            )
        )
        .scalars()
        .all()
    )


async def _submit(client, ex, q, student, text):
    return await client.post(
        f"/api/v1/exercises/{ex.id}/submit",
        json={"interactive_answers": {"answers": [{"question_id": str(q.id), "text": text}]}},
        headers=auth_header(student),
    )


async def test_solving_the_only_exercise_closes_the_lesson(client, student, teacher, org, db):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    await make_enrollment(db, course.id, student.id)
    ex, q = await _quiz_with_one_question(db, org, lesson.id)

    resp = await _submit(client, ex, q, student, "4")
    assert resp.status_code == 200, resp.text
    assert resp.json()["passed"] is True

    assert len(await _completed_rows(db, lesson.id)) == 1


async def test_wrong_answer_leaves_the_lesson_open(client, student, teacher, org, db):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    await make_enrollment(db, course.id, student.id)
    ex, q = await _quiz_with_one_question(db, org, lesson.id)

    resp = await _submit(client, ex, q, student, "5")
    assert resp.status_code == 200, resp.text
    assert resp.json()["passed"] is False

    assert await _completed_rows(db, lesson.id) == []


async def test_one_of_two_exercises_is_not_enough(client, student, teacher, org, db):
    """Half a lesson is not a finished lesson."""
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    await make_enrollment(db, course.id, student.id)
    first, q1 = await _quiz_with_one_question(db, org, lesson.id)
    second, q2 = await _quiz_with_one_question(db, org, lesson.id, answer="7")

    assert (await _submit(client, first, q1, student, "4")).status_code == 200
    assert await _completed_rows(db, lesson.id) == []

    assert (await _submit(client, second, q2, student, "7")).status_code == 200
    assert len(await _completed_rows(db, lesson.id)) == 1

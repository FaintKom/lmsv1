"""specs/047: a graded quiz reached /submit under an envelope it did not read.

The V2 renderer wraps every type's payload as `interactive_answers`. For quiz
that inner payload is `{"answers": [...]}`, and `/submit` read only the
top-level `answers` — so it got `None` and grading iterated it. 500 in prod on
2026-08-23, on exactly the student who answered the last question correctly:
that is when the client calls onGrade at all.

Both envelopes are tested here, and the documented one is the positive control
— without it a passing "no 500" would not prove anything is being graded.
"""

from sqlalchemy import select

from app.exercises.models import ExerciseSubmission
from tests.conftest import auth_header, make_course, make_lesson, make_module


async def _quiz_with_two_questions(client, db, org, teacher):
    """A quiz exercise with one multiple-choice and one text question."""
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)

    r = await client.post(
        "/api/v1/exercises",
        json={
            "lesson_id": str(lesson.id),
            "exercise_type": "quiz",
            "title": "spec047 envelope",
            "config": {"passing_score": 70},
        },
        headers=auth_header(teacher),
    )
    assert r.status_code == 200
    exercise_id = r.json()["id"]

    mc = await client.post(
        f"/api/v1/exercises/{exercise_id}/questions",
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
    assert mc.status_code == 200
    text = await client.post(
        f"/api/v1/exercises/{exercise_id}/questions",
        json={
            "question_text": "2+2?",
            "question_type": "text_answer",
            "correct_answer": "4",
            "points": 10,
        },
        headers=auth_header(teacher),
    )
    assert text.status_code == 200
    return exercise_id, mc.json()["id"], text.json()["id"]


def _correct_answers(q_mc, q_text) -> list[dict]:
    """Exactly the shape quiz-v2.tsx builds in answersRef."""
    return [
        {"question_id": q_mc, "selected_option": "Paris"},
        {"question_id": q_text, "text": "4"},
    ]


async def test_v2_envelope_is_graded(client, db, org, teacher, student):
    """FR-001: what the V2 renderer actually posts is graded, not a 500."""
    ex, q_mc, q_text = await _quiz_with_two_questions(client, db, org, teacher)

    r = await client.post(
        f"/api/v1/exercises/{ex}/submit",
        json={
            "interactive_answers": {"answers": _correct_answers(q_mc, q_text)},
            "elapsed_seconds": 12,
        },
        headers=auth_header(student),
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["score"] == 100
    assert body["passed"] is True


async def test_documented_envelope_is_graded(client, db, org, teacher, student):
    """Positive control: the top-level shape the schema documents still works.

    If this ever fails the test above proves nothing — a quiz that grades
    nobody would satisfy "does not 500" just as well.
    """
    ex, q_mc, q_text = await _quiz_with_two_questions(client, db, org, teacher)

    r = await client.post(
        f"/api/v1/exercises/{ex}/submit",
        json={"answers": _correct_answers(q_mc, q_text)},
        headers=auth_header(student),
    )
    assert r.status_code == 200, r.text
    assert r.json()["score"] == 100


async def test_wrong_answer_under_v2_envelope_scores_zero(client, db, org, teacher, student):
    """FR-002: the envelope is unwrapped, not merely tolerated.

    A reader that returned `[]` for this shape would also answer 200 — and
    would score a correct submission zero. This pins the other end.
    """
    ex, q_mc, q_text = await _quiz_with_two_questions(client, db, org, teacher)

    r = await client.post(
        f"/api/v1/exercises/{ex}/submit",
        json={
            "interactive_answers": {
                "answers": [
                    {"question_id": q_mc, "selected_option": "Berlin"},
                    {"question_id": q_text, "text": "5"},
                ]
            }
        },
        headers=auth_header(student),
    )
    assert r.status_code == 200, r.text
    assert r.json()["score"] == 0
    assert r.json()["passed"] is False


async def test_missing_answers_score_zero_instead_of_500(client, db, org, teacher, student):
    """FR-003: a submission carrying no answers at all is a zero, not a crash.

    `answers` is optional in the schema, so `model_dump()` always puts the key
    there holding None — which is why the old `data.get("answers", [])` never
    fell back to its default.
    """
    ex, _, _ = await _quiz_with_two_questions(client, db, org, teacher)

    r = await client.post(
        f"/api/v1/exercises/{ex}/submit",
        json={"elapsed_seconds": 3},
        headers=auth_header(student),
    )
    assert r.status_code == 200, r.text
    assert r.json()["score"] == 0


async def test_v2_envelope_answers_are_stored(client, db, org, teacher, student):
    """FR-004: the teacher sees what the student answered.

    Storing the unread `None` would have left `{"quiz_answers": None}` on the
    row, and the submissions screen renders that as an empty attempt.
    """
    ex, q_mc, q_text = await _quiz_with_two_questions(client, db, org, teacher)

    r = await client.post(
        f"/api/v1/exercises/{ex}/submit",
        json={"interactive_answers": {"answers": _correct_answers(q_mc, q_text)}},
        headers=auth_header(student),
    )
    assert r.status_code == 200, r.text

    row = (
        await db.execute(select(ExerciseSubmission).where(ExerciseSubmission.id == r.json()["id"]))
    ).scalar_one()
    stored = row.answers["quiz_answers"]
    assert [a["question_id"] for a in stored] == [q_mc, q_text]


async def test_check_still_unwraps_the_same_envelope(client, db, org, teacher, student):
    """FR-005: /check keeps its verdict after moving to the shared reader.

    /check unwrapped this envelope all along; it is the route /submit had
    drifted away from, so it is the one that must not regress.
    """
    ex, q_mc, q_text = await _quiz_with_two_questions(client, db, org, teacher)

    r = await client.post(
        f"/api/v1/exercises/{ex}/check",
        json={
            "interactive_answers": {
                "answers": [
                    {"question_id": q_mc, "selected_option": "Paris"},
                    {"question_id": q_text, "text": "nope"},
                ]
            }
        },
        headers=auth_header(student),
    )
    assert r.status_code == 200, r.text
    per_item = r.json()["per_item"]
    assert per_item[q_mc] is True
    assert per_item[q_text] is False

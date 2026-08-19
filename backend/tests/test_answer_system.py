"""Unified answer system — specs/019.

Pure grading-matrix tests against the shared judges. The multi-choice and
text-rules cases were written first and demonstrated RED against the
pre-019 graders; the grandfathering cases pin FR-005 (existing content
grades identically).
"""

from app.assessments.grading import is_answer_correct
from app.assessments.models import Question, QuestionType
from app.submissions.service import _grade_reading_detail, _grade_translation


def make_choice(options: list[tuple[str, bool]]) -> Question:
    return Question(
        question_text="q",
        question_type=QuestionType.multiple_choice,
        options=[{"text": t, "is_correct": c} for t, c in options],
        correct_answer=None,
        points=1,
    )


def make_text(correct: str, rules: dict | None = None) -> Question:
    return Question(
        question_text="q",
        question_type=QuestionType.text_answer,
        options=rules,
        correct_answer=correct,
        points=1,
    )


# ── Adaptive choice (US1) ──────────────────────────────────────────────

MULTI = [("A", True), ("B", True), ("C", False), ("D", False)]


def test_multi_choice_exact_set_passes():
    q = make_choice(MULTI)
    assert is_answer_correct(q, {"selected_options": ["A", "B"]})
    assert is_answer_correct(q, {"selected_options": ["B", "A"]})  # order-free


def test_multi_choice_wrong_sets_fail():
    q = make_choice(MULTI)
    assert not is_answer_correct(q, {"selected_options": ["A"]})  # subset
    assert not is_answer_correct(q, {"selected_options": ["A", "B", "C"]})  # superset
    assert not is_answer_correct(q, {"selected_options": ["C", "D"]})  # other


def test_multi_choice_legacy_single_payload_fails_quietly():
    q = make_choice(MULTI)
    assert not is_answer_correct(q, {"selected_option": "A"})


def test_single_choice_grandfathered():
    q = make_choice([("A", True), ("B", False)])
    assert is_answer_correct(q, {"selected_option": "A"})
    assert not is_answer_correct(q, {"selected_option": "B"})
    # tolerant: a one-element list against a single question also grades
    assert is_answer_correct(q, {"selected_options": ["A"]})
    assert not is_answer_correct(q, {"selected_options": ["B"]})


# ── Text rules (US2) ───────────────────────────────────────────────────


def test_text_default_is_todays_behaviour():
    q = make_text("Paris")
    assert is_answer_correct(q, {"text": "  paris "})
    assert not is_answer_correct(q, {"text": "London"})


def test_text_accepted_variants():
    q = make_text("colour", {"accepted": ["color", "", "colour"]})
    assert is_answer_correct(q, {"text": "color"})
    assert is_answer_correct(q, {"text": "Colour"})
    assert not is_answer_correct(q, {"text": "kolor"})


def test_text_case_sensitivity_toggle():
    q = make_text("Paris", {"case_sensitive": True})
    assert is_answer_correct(q, {"text": "Paris"})
    assert not is_answer_correct(q, {"text": "paris"})


def test_text_ignore_punctuation():
    q = make_text("it's fine", {"ignore_punctuation": True})
    assert is_answer_correct(q, {"text": "its fine"})
    q2 = make_text("it's fine")
    assert not is_answer_correct(q2, {"text": "its fine"})


# ── Reading reuses the same rules (US3) ────────────────────────────────


def test_reading_multi_choice_set_equality():
    content = {
        "questions": [
            {
                "type": "multiple_choice",
                "options": [
                    {"id": "a", "label": "A", "is_correct": True},
                    {"id": "b", "label": "B", "is_correct": True},
                    {"id": "c", "label": "C", "is_correct": False},
                ],
            }
        ]
    }
    score, passed, _ = _grade_reading_detail(content, {"answers": {"0": ["a", "b"]}})
    assert passed and score == 1.0
    score, passed, _ = _grade_reading_detail(content, {"answers": {"0": ["a"]}})
    assert not passed


def test_reading_single_choice_grandfathered():
    content = {
        "questions": [
            {
                "type": "multiple_choice",
                "options": [
                    {"id": "a", "label": "A", "is_correct": True},
                    {"id": "b", "label": "B", "is_correct": False},
                ],
            }
        ]
    }
    score, passed, _ = _grade_reading_detail(content, {"answers": {"0": "a"}})
    assert passed


def test_reading_text_rules():
    content = {"questions": [{"type": "text", "correct_answer": "colour", "accepted": ["color"]}]}
    _, passed, _ = _grade_reading_detail(content, {"answers": {"0": "Color"}})
    assert passed


# ── Translation fuzzy toggle (US4) ─────────────────────────────────────


def test_translation_fuzzy_default_keeps_todays_nearmiss():
    # "bonjours" vs "bonjour": positional similarity 7/8 = 0.875 ≥ 0.8
    content = {"accepted_answers": ["bonjour"]}
    _, passed = _grade_translation(content, {"translation": "bonjours"})
    assert passed


async def test_strip_adds_multi_and_hides_text_rules(client, db, org, teacher, student):
    """FR-003: the student read carries the multi signal and no keys —
    including the text-rules dict, whose `accepted` list is answers."""
    from tests.conftest import auth_header, make_course, make_lesson, make_module

    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)

    r = await client.post(
        "/api/v1/exercises",
        json={
            "lesson_id": str(lesson.id),
            "exercise_type": "quiz",
            "title": "adaptive",
            "config": {},
        },
        headers=auth_header(teacher),
    )
    exercise_id = r.json()["id"]

    r = await client.post(
        f"/api/v1/exercises/{exercise_id}/questions",
        json={
            "question_text": "pick two",
            "question_type": "multiple_choice",
            "options": [
                {"text": "A", "is_correct": True},
                {"text": "B", "is_correct": True},
                {"text": "C", "is_correct": False},
            ],
        },
        headers=auth_header(teacher),
    )
    assert r.status_code == 200
    r = await client.post(
        f"/api/v1/exercises/{exercise_id}/questions",
        json={
            "question_text": "spell it",
            "question_type": "text_answer",
            "correct_answer": "colour",
            "options": {"accepted": ["color"], "case_sensitive": False},
        },
        headers=auth_header(teacher),
    )
    assert r.status_code == 200

    r = await client.get(f"/api/v1/exercises/{exercise_id}", headers=auth_header(student))
    assert r.status_code == 200
    by_text = {q["question_text"]: q for q in r.json()["questions"]}
    choice = by_text["pick two"]
    assert choice["multi"] is True
    assert all("is_correct" not in o for o in choice["options"])
    text = by_text["spell it"]
    assert text["options"] is None  # rules (incl. accepted variants) hidden
    assert text["correct_answer"] is None


def test_translation_fuzzy_off_requires_exact():
    content = {"accepted_answers": ["bonjour"], "fuzzy_match": False}
    _, passed = _grade_translation(content, {"translation": "bonjours"})
    assert not passed
    _, passed = _grade_translation(content, {"translation": "bonjour"})
    assert passed

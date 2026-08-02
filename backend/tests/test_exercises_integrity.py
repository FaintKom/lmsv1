"""Integrity model B — answer stripping, /check endpoint, per_item verdicts.

Covers the PR-1 types: translation, conjugation, bubble_sheet, map_pin_drop,
sentence_builder. The server strips answer keys from student payloads and is
the sole grader; /check gives non-persisting per-item feedback.
"""

import pytest
from httpx import AsyncClient
from sqlalchemy import func, select

from app.exercises.models import ExerciseSubmission, ExerciseType
from tests.conftest import (
    auth_header,
    make_course,
    make_exercise,
    make_lesson,
    make_module,
)


async def _make_typed(db, org, teacher, exercise_type, config):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    return await make_exercise(db, lesson.id, org.id, exercise_type=exercise_type, config=config)


async def _student_config(client, student, ex):
    resp = await client.get(f"/api/v1/exercises/{ex.id}", headers=auth_header(student))
    assert resp.status_code == 200
    return resp.json()["config"]


# ─── Stripping ───────────────────────────────────────────────────────────


async def test_translation_strips_accepted_answers(client: AsyncClient, student, teacher, org, db):
    ex = await _make_typed(
        db,
        org,
        teacher,
        ExerciseType.translation,
        {
            "source_text": "Hello",
            "source_language": "en",
            "target_language": "es",
            "accepted_answers": ["Hola"],
            "case_sensitive": False,
        },
    )
    cfg = await _student_config(client, student, ex)
    assert "accepted_answers" not in cfg
    assert cfg["source_text"] == "Hello"


async def test_conjugation_strips_correct_column(client: AsyncClient, student, teacher, org, db):
    ex = await _make_typed(
        db,
        org,
        teacher,
        ExerciseType.conjugation,
        {
            "verb": "ser",
            "table": [{"pronoun": "yo", "correct": "soy"}, {"pronoun": "tú", "correct": "eres"}],
        },
    )
    cfg = await _student_config(client, student, ex)
    assert cfg["table"] == [{"pronoun": "yo"}, {"pronoun": "tú"}]


async def test_bubble_sheet_strips_correct(client: AsyncClient, student, teacher, org, db):
    ex = await _make_typed(
        db,
        org,
        teacher,
        ExerciseType.bubble_sheet,
        {
            "num_options": 4,
            "questions": [{"correct": "A"}, {"correct": "C"}],
        },
    )
    cfg = await _student_config(client, student, ex)
    assert cfg["questions"] == [{}, {}]
    assert cfg["num_options"] == 4


async def test_map_pin_strips_coordinates(client: AsyncClient, student, teacher, org, db):
    ex = await _make_typed(
        db,
        org,
        teacher,
        ExerciseType.map_pin_drop,
        {
            "image_url": "/maps/europe.png",
            "pins": [{"label": "Paris", "x": 120, "y": 80, "tolerance": 25}],
        },
    )
    cfg = await _student_config(client, student, ex)
    assert cfg["pins"] == [{"label": "Paris"}]
    assert cfg["image_url"] == "/maps/europe.png"


async def test_sentence_builder_strips_words_duplicate(
    client: AsyncClient, student, teacher, org, db
):
    """`words` duplicates correct_order verbatim in prod content — must not leak."""
    ex = await _make_typed(
        db,
        org,
        teacher,
        ExerciseType.sentence_builder,
        {
            "instructions": "Build the sentence",
            "correct_order": ["I", "like", "tea"],
            "words": ["I", "like", "tea"],
            "distractors": ["coffee"],
        },
    )
    cfg = await _student_config(client, student, ex)
    assert "correct_order" not in cfg
    assert "words" not in cfg
    assert "distractors" not in cfg
    assert sorted(cfg["word_bank"]) == ["I", "coffee", "like", "tea"]


async def test_teacher_keeps_full_config(client: AsyncClient, teacher, org, db):
    ex = await _make_typed(
        db,
        org,
        teacher,
        ExerciseType.conjugation,
        {
            "table": [{"pronoun": "yo", "correct": "soy"}],
        },
    )
    resp = await client.get(f"/api/v1/exercises/{ex.id}", headers=auth_header(teacher))
    assert resp.status_code == 200
    assert resp.json()["config"]["table"][0]["correct"] == "soy"


# ─── /check (non-persisting) ─────────────────────────────────────────────


async def test_check_returns_per_item_without_submission(
    client: AsyncClient, student, teacher, org, db
):
    ex = await _make_typed(
        db,
        org,
        teacher,
        ExerciseType.conjugation,
        {
            "table": [{"pronoun": "yo", "correct": "soy"}, {"pronoun": "tú", "correct": "eres"}],
        },
    )
    resp = await client.post(
        f"/api/v1/exercises/{ex.id}/check",
        json={"interactive_answers": {"conjugations": {"yo": "soy", "tú": "es"}}},
        headers=auth_header(student),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["per_item"] == {"yo": True, "tú": False}
    assert body["passed"] is False
    count = await db.scalar(
        select(func.count())
        .select_from(ExerciseSubmission)
        .where(ExerciseSubmission.exercise_id == ex.id)
    )
    assert count == 0


async def test_check_never_returns_expected_answers(client: AsyncClient, student, teacher, org, db):
    ex = await _make_typed(
        db,
        org,
        teacher,
        ExerciseType.bubble_sheet,
        {
            "questions": [{"correct": "B"}],
        },
    )
    resp = await client.post(
        f"/api/v1/exercises/{ex.id}/check",
        json={"interactive_answers": {"answers": {"0": "A"}}},
        headers=auth_header(student),
    )
    assert resp.status_code == 200
    assert "B" not in resp.text


# ─── submit: per_item + server grading of stripped types ─────────────────


async def test_submit_translation_graded_server_side(
    client: AsyncClient, student, teacher, org, db
):
    ex = await _make_typed(
        db,
        org,
        teacher,
        ExerciseType.translation,
        {
            "source_text": "Hello",
            "accepted_answers": ["Hola"],
            "case_sensitive": False,
        },
    )
    resp = await client.post(
        f"/api/v1/exercises/{ex.id}/submit",
        json={"interactive_answers": {"translation": "hola"}},
        headers=auth_header(student),
    )
    assert resp.status_code == 200
    assert resp.json()["passed"] is True


async def test_submit_returns_per_item(client: AsyncClient, student, teacher, org, db):
    ex = await _make_typed(
        db,
        org,
        teacher,
        ExerciseType.map_pin_drop,
        {
            "pins": [
                {"label": "Paris", "x": 100, "y": 100, "tolerance": 30},
                {"label": "Rome", "x": 300, "y": 300, "tolerance": 30},
            ],
        },
    )
    resp = await client.post(
        f"/api/v1/exercises/{ex.id}/submit",
        json={"interactive_answers": {"pins": [{"x": 105, "y": 95}, {"x": 10, "y": 10}]}},
        headers=auth_header(student),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["per_item"] == [True, False]
    assert body["score"] == 50.0


async def test_submit_sentence_builder_per_position(client: AsyncClient, student, teacher, org, db):
    ex = await _make_typed(
        db,
        org,
        teacher,
        ExerciseType.sentence_builder,
        {
            "correct_order": ["I", "like", "tea"],
        },
    )
    resp = await client.post(
        f"/api/v1/exercises/{ex.id}/submit",
        json={"interactive_answers": {"word_order": ["I", "tea", "like"]}},
        headers=auth_header(student),
    )
    assert resp.status_code == 200
    assert resp.json()["per_item"] == [True, False, False]


@pytest.mark.parametrize(
    "payload,passed",
    [
        ({"answers": {"0": "A", "1": "C"}}, True),
        ({"answers": {"0": "D", "1": "D"}}, False),
    ],
)
async def test_submit_bubble_sheet(client: AsyncClient, student, teacher, org, db, payload, passed):
    ex = await _make_typed(
        db,
        org,
        teacher,
        ExerciseType.bubble_sheet,
        {
            "questions": [{"correct": "A"}, {"correct": "C"}],
        },
    )
    resp = await client.post(
        f"/api/v1/exercises/{ex.id}/submit",
        json={"interactive_answers": payload},
        headers=auth_header(student),
    )
    assert resp.status_code == 200
    assert resp.json()["passed"] is passed


# ─── PR-2: matching / categorize / map_pin_drop ──────────────────────────


async def test_matching_strips_pairs(client: AsyncClient, student, teacher, org, db):
    ex = await _make_typed(
        db,
        org,
        teacher,
        ExerciseType.matching,
        {
            "shuffle": True,
            "pairs": [
                {"left": "hello", "right": "hola"},
                {"left": "bye", "right": "adiós"},
            ],
        },
    )
    cfg = await _student_config(client, student, ex)
    assert "pairs" not in cfg
    assert cfg["left_items"] == ["hello", "bye"]
    assert sorted(cfg["right_items"]) == ["adiós", "hola"]


async def test_categorize_strips_membership(client: AsyncClient, student, teacher, org, db):
    ex = await _make_typed(
        db,
        org,
        teacher,
        ExerciseType.categorize,
        {
            "categories": [
                {"name": "Fruit", "items": ["apple", "pear"]},
                {"name": "Tool", "items": ["hammer"]},
            ]
        },
    )
    cfg = await _student_config(client, student, ex)
    assert "categories" not in cfg
    assert cfg["category_names"] == ["Fruit", "Tool"]
    assert sorted(cfg["items"]) == ["apple", "hammer", "pear"]


async def test_check_matching_per_pair(client: AsyncClient, student, teacher, org, db):
    ex = await _make_typed(
        db,
        org,
        teacher,
        ExerciseType.matching,
        {"pairs": [{"left": "a", "right": "1"}, {"left": "b", "right": "2"}]},
    )
    resp = await client.post(
        f"/api/v1/exercises/{ex.id}/check",
        json={
            "interactive_answers": {
                "pairs": [{"left": "a", "right": "1"}, {"left": "b", "right": "1"}]
            }
        },
        headers=auth_header(student),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["per_item"] == {"a": True, "b": False}
    assert body["passed"] is False
    count = await db.scalar(
        select(func.count())
        .select_from(ExerciseSubmission)
        .where(ExerciseSubmission.exercise_id == ex.id)
    )
    assert count == 0


async def test_check_categorize_per_item(client: AsyncClient, student, teacher, org, db):
    ex = await _make_typed(
        db,
        org,
        teacher,
        ExerciseType.categorize,
        {
            "categories": [
                {"name": "Fruit", "items": ["apple"]},
                {"name": "Tool", "items": ["hammer"]},
            ]
        },
    )
    resp = await client.post(
        f"/api/v1/exercises/{ex.id}/check",
        json={"interactive_answers": {"categories": {"Fruit": ["apple", "hammer"]}}},
        headers=auth_header(student),
    )
    assert resp.status_code == 200
    assert resp.json()["per_item"] == {"apple": True, "hammer": False}


async def test_submit_matching_scores_server_side(client: AsyncClient, student, teacher, org, db):
    ex = await _make_typed(
        db,
        org,
        teacher,
        ExerciseType.matching,
        {"pairs": [{"left": "a", "right": "1"}, {"left": "b", "right": "2"}]},
    )
    resp = await client.post(
        f"/api/v1/exercises/{ex.id}/submit",
        json={
            "interactive_answers": {
                "pairs": [{"left": "a", "right": "1"}, {"left": "b", "right": "2"}]
            }
        },
        headers=auth_header(student),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["passed"] is True
    assert body["per_item"] == {"a": True, "b": True}


# ─── PR-3: quiz / reading / dialogue / crossword ─────────────────────────


async def test_check_reading_per_question(client: AsyncClient, student, teacher, org, db):
    ex = await _make_typed(
        db,
        org,
        teacher,
        ExerciseType.reading,
        {
            "questions": [
                {"question": "2+2?", "type": "text", "correct_answer": "4"},
                {"question": "3+3?", "type": "text", "correct_answer": "6"},
            ]
        },
    )
    resp = await client.post(
        f"/api/v1/exercises/{ex.id}/check",
        json={"interactive_answers": {"answers": {"0": "4", "1": "7"}}},
        headers=auth_header(student),
    )
    assert resp.status_code == 200
    assert resp.json()["per_item"] == {"0": True, "1": False}


async def test_check_quiz_uses_the_questions_relation(
    client: AsyncClient, student, teacher, org, db
):
    """Quiz answers live in a relation, not config — /check must still grade."""
    from tests.conftest import make_course, make_lesson, make_module

    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    ex = await make_exercise(db, lesson.id, org.id, exercise_type=ExerciseType.quiz)
    created = await client.post(
        f"/api/v1/exercises/{ex.id}/questions",
        json={
            "question_text": "2+2?",
            "question_type": "text_answer",
            "correct_answer": "4",
            "points": 1,
        },
        headers=auth_header(teacher),
    )
    assert created.status_code == 200
    qid = created.json()["id"]

    good = await client.post(
        f"/api/v1/exercises/{ex.id}/check",
        json={"interactive_answers": {"answers": [{"question_id": qid, "text": "4"}]}},
        headers=auth_header(student),
    )
    assert good.status_code == 200
    assert good.json()["per_item"] == {qid: True}

    bad = await client.post(
        f"/api/v1/exercises/{ex.id}/check",
        json={"interactive_answers": {"answers": [{"question_id": qid, "text": "5"}]}},
        headers=auth_header(student),
    )
    assert bad.json()["per_item"] == {qid: False}


async def test_reading_strips_answers(client: AsyncClient, student, teacher, org, db):
    ex = await _make_typed(
        db,
        org,
        teacher,
        ExerciseType.reading,
        {
            "passage": "Once upon a time...",
            "questions": [
                {
                    "question": "Who?",
                    "type": "multiple_choice",
                    "correct_answer": "a hero",
                    "options": [
                        {"id": "1", "label": "a hero", "is_correct": True},
                        {"id": "2", "label": "a villain", "is_correct": False},
                    ],
                }
            ],
        },
    )
    cfg = await _student_config(client, student, ex)
    q = cfg["questions"][0]
    assert "correct_answer" not in q
    assert all("is_correct" not in o for o in q["options"])
    # display data survives
    assert q["question"] == "Who?"
    assert [o["label"] for o in q["options"]] == ["a hero", "a villain"]
    assert cfg["passage"] == "Once upon a time..."


async def test_dialogue_strips_is_correct(client: AsyncClient, student, teacher, org, db):
    ex = await _make_typed(
        db,
        org,
        teacher,
        ExerciseType.dialogue,
        {
            "context": "At the cafe",
            "messages": [
                {"speaker": "waiter", "text": "Hello!"},
                {
                    "speaker": "waiter",
                    "text": "What would you like?",
                    "options": [
                        {"id": "a", "label": "A coffee", "is_correct": True},
                        {"id": "b", "label": "A car", "is_correct": False},
                    ],
                },
            ],
        },
    )
    cfg = await _student_config(client, student, ex)
    opts = cfg["messages"][1]["options"]
    assert all("is_correct" not in o for o in opts)
    assert [o["label"] for o in opts] == ["A coffee", "A car"]
    # message without options is untouched
    assert cfg["messages"][0] == {"speaker": "waiter", "text": "Hello!"}


async def test_check_dialogue_per_message(client: AsyncClient, student, teacher, org, db):
    ex = await _make_typed(
        db,
        org,
        teacher,
        ExerciseType.dialogue,
        {
            "messages": [
                {
                    "speaker": "a",
                    "text": "q1",
                    "options": [
                        {"id": "x", "label": "right", "is_correct": True},
                        {"id": "y", "label": "wrong", "is_correct": False},
                    ],
                },
                {
                    "speaker": "a",
                    "text": "q2",
                    "options": [
                        {"id": "p", "label": "right", "is_correct": True},
                        {"id": "q", "label": "wrong", "is_correct": False},
                    ],
                },
            ]
        },
    )
    resp = await client.post(
        f"/api/v1/exercises/{ex.id}/check",
        json={"interactive_answers": {"selections": {"0": "x", "1": "q"}}},
        headers=auth_header(student),
    )
    assert resp.status_code == 200
    assert resp.json()["per_item"] == {"0": True, "1": False}


async def test_crossword_ships_length_not_word(client: AsyncClient, student, teacher, org, db):
    ex = await _make_typed(
        db,
        org,
        teacher,
        ExerciseType.crossword,
        {
            "grid_size": 5,
            "words": [
                {"word": "cat", "clue": "pet", "row": 0, "col": 0, "direction": "across"},
                {"word": "cow", "clue": "moo", "row": 0, "col": 0, "direction": "down"},
            ],
        },
    )
    cfg = await _student_config(client, student, ex)
    assert [w.get("word") for w in cfg["words"]] == [None, None]
    assert [w["length"] for w in cfg["words"]] == [3, 3]
    assert [w["clue"] for w in cfg["words"]] == ["pet", "moo"]
    assert cfg["words"][1]["direction"] == "down"


async def test_check_crossword_per_word(client: AsyncClient, student, teacher, org, db):
    ex = await _make_typed(
        db,
        org,
        teacher,
        ExerciseType.crossword,
        {
            "grid_size": 5,
            "words": [
                {"word": "cat", "clue": "pet", "row": 0, "col": 0, "direction": "across"},
                {"word": "cow", "clue": "moo", "row": 0, "col": 0, "direction": "down"},
            ],
        },
    )
    resp = await client.post(
        f"/api/v1/exercises/{ex.id}/check",
        json={"interactive_answers": {"words": {"0": "cat", "1": "dog"}}},
        headers=auth_header(student),
    )
    assert resp.status_code == 200
    assert resp.json()["per_item"] == {"0": True, "1": False}
    count = await db.scalar(
        select(func.count())
        .select_from(ExerciseSubmission)
        .where(ExerciseSubmission.exercise_id == ex.id)
    )
    assert count == 0

"""Tests for file/interactive submissions — upload validation, ownership, tenancy."""

import logging

import pytest
from httpx import AsyncClient

from app.auth.models import UserRole
from app.exercises.models import ExerciseType
from tests.conftest import (
    _make_user,
    auth_header,
    make_course,
    make_enrollment,
    make_exercise,
    make_lesson,
    make_module,
)

_FAKE_PDF = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n"


@pytest.fixture
async def lesson(db, org, teacher):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    return await make_lesson(db, module.id)


async def _upload(client: AsyncClient, user, lesson_id, data=_FAKE_PDF, name="work.pdf"):
    return await client.post(
        f"/api/v1/submissions/lessons/{lesson_id}/upload",
        files={"file": (name, data, "application/pdf")},
        headers=auth_header(user),
    )


@pytest.mark.asyncio
async def test_student_uploads_and_sees_own_file(client: AsyncClient, db, org, student, lesson):
    resp = await _upload(client, student, lesson.id)
    assert resp.status_code == 200, resp.text
    assert resp.json()["original_filename"] == "work.pdf"

    listed = await client.get(
        f"/api/v1/submissions/lessons/{lesson.id}/files", headers=auth_header(student)
    )
    assert listed.status_code == 200
    assert len(listed.json()) == 1


@pytest.mark.asyncio
async def test_disallowed_extension_rejected(client: AsyncClient, student, lesson):
    resp = await _upload(client, student, lesson.id, data=b"MZ\x90\x00", name="virus.exe")
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_students_do_not_see_each_others_files(client: AsyncClient, db, org, student, lesson):
    await _upload(client, student, lesson.id)

    other = _make_user(db, org, UserRole.student, suffix="-other")
    await db.flush()
    listed = await client.get(
        f"/api/v1/submissions/lessons/{lesson.id}/files", headers=auth_header(other)
    )
    assert listed.status_code == 200
    assert listed.json() == []


@pytest.mark.asyncio
async def test_teacher_sees_student_files(client: AsyncClient, student, teacher, lesson):
    await _upload(client, student, lesson.id)
    listed = await client.get(
        f"/api/v1/submissions/lessons/{lesson.id}/files", headers=auth_header(teacher)
    )
    assert listed.status_code == 200
    assert len(listed.json()) == 1


@pytest.mark.asyncio
async def test_cross_org_lesson_files_404(client: AsyncClient, admin2, lesson):
    """Staff from another org must not even learn the lesson exists."""
    listed = await client.get(
        f"/api/v1/submissions/lessons/{lesson.id}/files", headers=auth_header(admin2)
    )
    assert listed.status_code == 404


@pytest.mark.asyncio
async def test_student_cannot_download_foreign_file(client: AsyncClient, db, org, student, lesson):
    submission_id = (await _upload(client, student, lesson.id)).json()["id"]

    other = _make_user(db, org, UserRole.student, suffix="-dl")
    await db.flush()
    resp = await client.get(
        f"/api/v1/submissions/files/{submission_id}/download", headers=auth_header(other)
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_interactive_list_empty_and_cross_org_404(
    client: AsyncClient, student, admin2, lesson
):
    ok = await client.get(
        f"/api/v1/submissions/lessons/{lesson.id}/interactive", headers=auth_header(student)
    )
    assert ok.status_code == 200
    assert ok.json() == []

    cross = await client.get(
        f"/api/v1/submissions/lessons/{lesson.id}/interactive", headers=auth_header(admin2)
    )
    assert cross.status_code == 404


@pytest.mark.asyncio
async def test_cleared_interactive_answer_scores_zero_instead_of_crashing(
    client: AsyncClient, db, org, teacher, student
):
    """A student who clears their answer gets 0, not a 500.

    `_submit_interactive` read the answer as
    `data.get("interactive_answers") or data.get("answers", {})`. An empty dict
    is falsy, so a cleared answer fell through to `answers` — declared
    `list[dict] | None` by the submit schema — and every `_grade_*` helper then
    called `answers.get(...)` on a list or on None. The request 500ed, and it
    did so for every interactive type, not only this one.

    The positive control runs first on purpose: without it this test would pass
    against an exercise that rejects everything, which is no evidence at all.
    """
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    await make_enrollment(db, course.id, student.id)
    ex = await make_exercise(
        db,
        lesson.id,
        org.id,
        exercise_type=ExerciseType.matching,
        config={"pairs": [{"left": "Cat", "right": "Meow"}]},
    )

    # Positive control: a real answer is accepted and scored.
    good = await client.post(
        f"/api/v1/exercises/{ex.id}/submit",
        json={"interactive_answers": {"pairs": [{"left": "Cat", "right": "Meow"}]}},
        headers=auth_header(student),
    )
    assert good.status_code == 200, good.text
    assert good.json()["score"] == 100

    # The regression itself.
    cleared = await client.post(
        f"/api/v1/exercises/{ex.id}/submit",
        json={"interactive_answers": {}},
        headers=auth_header(student),
    )
    assert cleared.status_code == 200, cleared.text
    body = cleared.json()
    assert body["score"] == 0
    assert body["passed"] is False

    # `answers` as a list is refused by the schema on this endpoint (422), which
    # is correct — it is not another path into the graders, so nothing to assert
    # here beyond the fact that it never reaches them.


@pytest.mark.asyncio
async def test_exhausted_attempts_stop_writing_new_submissions(
    client: AsyncClient, db, org, teacher, student
):
    """Pressing submit after the limit returns the same row, it does not add one.

    Being let through with the correct answer once the attempts run out is
    deliberate. Writing a fresh `max_attempts_exhausted` row on every later press
    was not: each row carried score=0 and each one bumped the attempt count, so
    the limit never held. A 2-attempt exercise was measured accepting a fourth
    submission on 2026-08-17, and a student who had scored well on their last
    real attempt could overwrite it with a zero by pressing once more.
    """
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    await make_enrollment(db, course.id, student.id)
    ex = await make_exercise(
        db,
        lesson.id,
        org.id,
        exercise_type=ExerciseType.matching,
        config={"pairs": [{"left": "Cat", "right": "Meow"}]},
        max_attempts=2,
    )
    wrong = {"interactive_answers": {"pairs": [{"left": "Cat", "right": "Bark"}]}}

    async def submit():
        return await client.post(
            f"/api/v1/exercises/{ex.id}/submit", json=wrong, headers=auth_header(student)
        )

    # Positive control: the two allowed attempts are graded like any other.
    for _ in range(2):
        graded = await submit()
        assert graded.status_code == 200, graded.text
        assert graded.json()["score"] == 0

    # Third press: the attempts are gone, so this writes the one exhaustion row.
    exhausted = await submit()
    assert exhausted.status_code == 200, exhausted.text
    assert exhausted.json()["max_attempts_reached"] is True

    # Fourth press: the same row comes back. Before the fix this wrote another
    # one, which is how a 2-attempt exercise reached a fourth submission.
    again = await submit()
    assert again.status_code == 200, again.text
    assert again.json()["id"] == exhausted.json()["id"]

    attempts = await client.get(f"/api/v1/exercises/{ex.id}/attempts", headers=auth_header(student))
    assert attempts.status_code == 200, attempts.text
    # Two real attempts plus one exhaustion row, and it stays there however many
    # times the student presses submit.
    assert attempts.json()["attempt_count"] == 3


def test_grading_against_an_empty_answer_key_is_not_silent(caplog):
    """A misconfigured exercise still passes everyone — but it says so now.

    Every `_grade_*` helper answers 1.0/True when its part of the config is
    empty. For content that legitimately has nothing to get wrong that is right;
    for a misconfigured exercise it means a school is told a class passed
    something nobody could attempt. A crossword whose config used keys neither
    the renderer nor the grader reads did exactly that on 2026-08-17: an empty
    board, full marks.

    The grade is deliberately left alone — the two cases are indistinguishable at
    grading time, and scoring zero would punish students for a teacher's mistake.
    What is asserted here is that the silent case stops being silent.
    """
    from app.submissions.service import grade_interactive_detail

    def warnings_about_empty_keys():
        return [r for r in caplog.records if "empty answer key" in r.getMessage()]

    # Positive control: a configured crossword grades quietly. Without this the
    # test would pass against a build that warns on absolutely everything.
    with caplog.at_level(logging.WARNING):
        score, passed, _ = grade_interactive_detail(
            {"words": [{"word": "CAT"}]}, "crossword", {"words": {"0": "CAT"}}
        )
    assert (score, passed) == (1.0, True)
    assert warnings_about_empty_keys() == []

    caplog.clear()
    with caplog.at_level(logging.WARNING):
        score, passed, _ = grade_interactive_detail({}, "crossword", {})

    # Behaviour unchanged on purpose: still a pass.
    assert (score, passed) == (1.0, True)
    # But no longer unrecorded.
    assert len(warnings_about_empty_keys()) >= 1


@pytest.mark.asyncio
async def test_exhausted_attempts_are_not_recorded_as_passing(
    client: AsyncClient, db, org, teacher, student
):
    """Running out of attempts is not the same as solving the exercise.

    The exhaustion row is deliberate: a pupil stuck forever on one exercise is
    worse than one shown the answer, so the server writes a row and lets them
    move on. It carried `passed=True`, and the journal, the analytics mastery
    figure and the student profile all read that field — so a class that ran out
    of tries and a class that solved the work were the same number. Measured
    2026-08-18 on all 26 types.

    The positive control comes first: a genuinely correct answer must still be
    recorded as passing, or this test would pass against a server that marks
    nothing.
    """
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    await make_enrollment(db, course.id, student.id)
    solved = await make_exercise(
        db,
        lesson.id,
        org.id,
        exercise_type=ExerciseType.true_false,
        config={"statement": "The sky is blue.", "correct_answer": True},
        max_attempts=2,
    )
    limited = await make_exercise(
        db,
        lesson.id,
        org.id,
        exercise_type=ExerciseType.true_false,
        config={"statement": "The sky is blue.", "correct_answer": True},
        max_attempts=2,
    )

    # Control: the right answer passes, and stays passed.
    good = await client.post(
        f"/api/v1/exercises/{solved.id}/submit",
        json={"interactive_answers": {"answer": True}},
        headers=auth_header(student),
    )
    assert good.status_code == 200, good.text
    assert good.json()["passed"] is True

    for attempt in (1, 2):
        wrong = await client.post(
            f"/api/v1/exercises/{limited.id}/submit",
            json={"interactive_answers": {"answer": False}},
            headers=auth_header(student),
        )
        assert wrong.status_code == 200, wrong.text
        assert wrong.json()["passed"] is False
        assert wrong.json()["attempt_number"] == attempt

    exhausted = await client.post(
        f"/api/v1/exercises/{limited.id}/submit",
        json={"interactive_answers": {"answer": False}},
        headers=auth_header(student),
    )
    assert exhausted.status_code == 200, exhausted.text
    body = exhausted.json()
    assert body["passed"] is False, "running out of attempts is not passing"
    assert body["score"] == 0
    assert body["max_attempts_reached"] is True
    assert body["attempts_remaining"] == 0
    assert (body["answers"] or {}).get("max_attempts_exhausted") is True

    # Pressing again returns the same row rather than writing another one.
    again = await client.post(
        f"/api/v1/exercises/{limited.id}/submit",
        json={"interactive_answers": {"answer": False}},
        headers=auth_header(student),
    )
    assert again.status_code == 200, again.text
    assert again.json()["id"] == body["id"]
    assert again.json()["passed"] is False


def test_bubble_sheet_can_be_failed_and_says_when_it_cannot(caplog):
    """A bubble sheet must be markable, and an unmarkable one must not be silent.

    Measured 2026-08-18: the seeded bubble sheet awarded 100 to every submission,
    including an empty one, because the grader reads `content["questions"]` while
    the fixture wrote `correct_answers`. The renderer reads the same key, so the
    card drew no bubbles either - a pupil saw nothing to answer and scored full
    marks for it.

    The warning added for exactly this shape of defect never fired: `bubble_sheet`
    was not in the watchlist. Neither were `dialogue`, `translation`,
    `sentence_builder` or `map_pin_drop`.
    """
    from app.submissions.service import grade_interactive_detail

    def warnings_about_empty_keys():
        return [r for r in caplog.records if "empty answer key" in r.getMessage()]

    config = {
        "num_options": 4,
        "passing_score": 70,
        "questions": [
            {"number": 1, "question": "2+2?", "correct": "A"},
            {"number": 2, "question": "Capital of France?", "correct": "B"},
        ],
    }

    # Control: the right answers score, quietly.
    with caplog.at_level(logging.WARNING):
        score, passed, _ = grade_interactive_detail(
            config, "bubble_sheet", {"answers": {"0": "A", "1": "B"}}
        )
    assert (score, passed) == (1.0, True)
    assert warnings_about_empty_keys() == []

    # A configured sheet can be failed, which is the whole point of marking it.
    caplog.clear()
    with caplog.at_level(logging.WARNING):
        score, passed, _ = grade_interactive_detail(config, "bubble_sheet", {})
    assert score == 0.0
    assert passed is False
    assert warnings_about_empty_keys() == []

    # An unmarkable sheet still passes everyone, as every type does - but it says so.
    caplog.clear()
    with caplog.at_level(logging.WARNING):
        score, passed, _ = grade_interactive_detail(
            {"question_count": 5, "correct_answers": ["A"]}, "bubble_sheet", {}
        )
    assert (score, passed) == (1.0, True)
    assert len(warnings_about_empty_keys()) >= 1


def test_every_watched_type_names_a_key_its_grader_reads():
    """The watchlist is only worth having if its keys are the real ones.

    A wrong entry warns about a correctly configured exercise, which is worse than
    not warning at all - that is why the original list was deliberately short.
    This pins each entry against a config that carries only that key: the grader
    must find something to mark, so no warning is due.
    """
    from app.submissions.service import _ANSWER_KEY_BY_TYPE, grade_interactive_detail

    samples = {
        "matching": [{"left": "a", "right": "b"}],
        "ordering": ["a", "b"],
        "fill_blanks": ["a"],
        "categorize": [{"name": "Fruit", "items": ["apple"]}],
        "crossword": [{"word": "CAT"}],
        "word_search": ["cat"],
        "srs_flashcard": [{"front": "a", "back": "b"}],
        "reading": [{"question": "q", "type": "text", "correct_answer": "a"}],
        "conjugation": [{"pronoun": "I", "correct": "am"}],
        "bubble_sheet": [{"number": 1, "correct": "A"}],
        "dialogue": [{"speaker": "a", "text": "", "options": ["x"]}],
        "translation": ["hola"],
        "sentence_builder": ["I", "am"],
        "map_pin_drop": [{"label": "Paris", "x": 0.5, "y": 0.3}],
    }
    assert set(samples) == set(_ANSWER_KEY_BY_TYPE), (
        "a watched type has no sample here, or a sample names a type nobody watches"
    )
    for ex_type, key in _ANSWER_KEY_BY_TYPE.items():
        score, passed, _ = grade_interactive_detail({key: samples[ex_type]}, ex_type, {})
        assert score == 0.0, f"{ex_type}: empty answer against a real key should score 0"


@pytest.mark.parametrize(
    "exercise_type,config,good_answer,junk_answer",
    [
        (
            ExerciseType.crossword,
            {"grid_size": 5, "words": [{"word": "CAT", "row": 0, "col": 0, "direction": "across"}]},
            {"words": {"0": "CAT"}},
            {"words": "not-a-dict"},
        ),
        (
            ExerciseType.map_pin_drop,
            {
                "map_url": "/static/map.png",
                "pins": [{"label": "Paris", "x": 0.5, "y": 0.3, "tolerance": 0.05}],
            },
            {"pins": [{"x": 0.5, "y": 0.3}]},
            {"pins": "not-a-list"},
        ),
        (
            ExerciseType.srs_flashcard,
            {"cards": [{"front": "2+2", "back": "4"}]},
            {"ratings": {"0": "good"}},
            {"ratings": ["good"]},
        ),
    ],
)
async def test_answer_of_the_wrong_type_scores_zero_instead_of_crashing(
    client: AsyncClient, db, org, teacher, student, exercise_type, config, good_answer, junk_answer
):
    """A value of the wrong type inside the answer must not reach the grader raw.

    The earlier fix normalised the container: `interactive_answers` has to be a
    dict. What it holds stayed unchecked, so a string where the grader expects a
    mapping, or a list where it expects a mapping, reached `.get` and raised â€”
    the student saw `Internal server error` and the teacher saw nothing at all.
    Measured 2026-08-18 on the QA stack: crossword and map_pin_drop both 500.

    Each case opens with the answer that should score, so a test that passes
    cannot be passing against an endpoint that refuses everything.
    """
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    await make_enrollment(db, course.id, student.id)
    ex = await make_exercise(db, lesson.id, org.id, exercise_type=exercise_type, config=config)

    good = await client.post(
        f"/api/v1/exercises/{ex.id}/submit",
        json={"interactive_answers": good_answer},
        headers=auth_header(student),
    )
    assert good.status_code == 200, good.text
    assert good.json()["score"] == 100

    junk = await client.post(
        f"/api/v1/exercises/{ex.id}/submit",
        json={"interactive_answers": junk_answer},
        headers=auth_header(student),
    )
    assert junk.status_code == 200, junk.text
    assert junk.json()["score"] == 0
    assert junk.json()["passed"] is False


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "exercise_type,config,field,good_payload,junk_payload",
    [
        (
            ExerciseType.world_3d,
            {"grid_width": 3, "grid_depth": 3, "cells": [], "win_condition": "reach_goal"},
            "game_result",
            {"completed": True, "score": 1.0},
            {"completed": "yes", "score": "lots"},
        ),
        (
            ExerciseType.web_editor,
            {"description": "Make it red", "starter_html": "<p>hi</p>"},
            "web_code",
            {"html": "<p>hi</p>", "css": "", "js": ""},
            {"html": []},
        ),
    ],
)
async def test_game_and_web_payloads_are_refused_not_crashed(
    client: AsyncClient,
    db,
    org,
    teacher,
    student,
    exercise_type,
    config,
    field,
    good_payload,
    junk_payload,
):
    """`game_result` and `web_code` were declared as bare dicts, so nothing
    checked what was inside them.

    A non-numeric score reached `float()` and raised ValueError; a list where
    html belongs reached the INSERT and raised asyncpg's DataError against a
    VARCHAR column. Both surfaced as 500. Refusing the request with 422 is the
    honest answer â€” the client sent something the field cannot hold.
    """
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    await make_enrollment(db, course.id, student.id)
    ex = await make_exercise(db, lesson.id, org.id, exercise_type=exercise_type, config=config)

    good = await client.post(
        f"/api/v1/exercises/{ex.id}/submit",
        json={field: good_payload},
        headers=auth_header(student),
    )
    assert good.status_code == 200, good.text

    junk = await client.post(
        f"/api/v1/exercises/{ex.id}/submit",
        json={field: junk_payload},
        headers=auth_header(student),
    )
    assert junk.status_code == 422, junk.text

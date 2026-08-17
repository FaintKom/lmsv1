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

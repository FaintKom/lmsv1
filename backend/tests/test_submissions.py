"""Tests for file/interactive submissions — upload validation, ownership, tenancy."""

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

"""One school must not reach into another school's exercises.

Every read and write in the exercises module went through a lookup by id with
no org filter. ``list_exercises`` was scoped correctly, so the content library
never offered a foreign id — but an id is not a secret and was never the
access control. A teacher elsewhere could edit or delete another school's
exercise, bolt a test case onto its code challenge, or read its answer key.

Neither test_exercises.py nor test_exercises_integrity.py had a single
cross-org case, which is why this lived. The tests below are written from the
other side: hold the id, hold a valid session in another school, and try.
"""

from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import select as sa_select

from app.auth.models import UserRole
from tests.conftest import (
    _make_user,
    auth_header,
    make_course,
    make_exercise,
    make_lesson,
    make_module,
)


async def _exercise_in(db, org, teacher, *, config: dict | None = None):
    """An exercise belonging to one school, reachable only by its id."""
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    return await make_exercise(
        db,
        lesson.id,
        org.id,
        title="Neighbour's exercise",
        config=config or {"question": "2+2?", "correct_answer": "4"},
    )


# ── Reads ────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_another_schools_exercise_reads_as_not_found(
    client: AsyncClient, db, org2, admin, admin2
):
    ex = await _exercise_in(db, org2, admin2)

    resp = await client.get(f"/api/v1/exercises/{ex.id}", headers=auth_header(admin))
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_a_student_elsewhere_cannot_read_it_either(
    client: AsyncClient, db, org2, admin2, student
):
    ex = await _exercise_in(db, org2, admin2)

    resp = await client.get(f"/api/v1/exercises/{ex.id}", headers=auth_header(student))
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_by_lesson_does_not_list_another_schools_exercises(
    client: AsyncClient, db, org2, admin, admin2
):
    ex = await _exercise_in(db, org2, admin2)

    resp = await client.get(
        f"/api/v1/exercises/by-lesson/{ex.lesson_id}", headers=auth_header(admin)
    )
    assert resp.status_code == 200
    assert resp.json() == []


# ── Writes ───────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_a_teacher_elsewhere_cannot_edit_it(client: AsyncClient, db, org2, admin2, teacher):
    ex = await _exercise_in(db, org2, admin2)

    resp = await client.put(
        f"/api/v1/exercises/{ex.id}",
        json={"title": "Defaced"},
        headers=auth_header(teacher),
    )
    assert resp.status_code == 404

    await db.refresh(ex)
    assert ex.title == "Neighbour's exercise"


@pytest.mark.asyncio
async def test_an_admin_elsewhere_cannot_delete_it(client: AsyncClient, db, org2, admin, admin2):
    """The worst of the set: one customer destroying another's content."""
    from app.exercises.models import Exercise

    ex = await _exercise_in(db, org2, admin2)

    resp = await client.delete(f"/api/v1/exercises/{ex.id}", headers=auth_header(admin))
    assert resp.status_code == 404

    assert await db.get(Exercise, ex.id) is not None


@pytest.mark.asyncio
async def test_a_test_case_cannot_be_attached_to_another_schools_exercise(
    client: AsyncClient, db, org2, admin, admin2
):
    """Test cases decide how a code challenge is marked.

    This endpoint never loaded the exercise at all — it wrote a row keyed by
    whatever id arrived, so a stranger could change how another school's
    students are graded.
    """
    from app.sandbox.models import TestCase

    ex = await _exercise_in(db, org2, admin2)

    resp = await client.post(
        f"/api/v1/exercises/{ex.id}/test-cases",
        json={"input_data": "1", "expected_output": "wrong", "is_hidden": True},
        headers=auth_header(admin),
    )
    assert resp.status_code == 404

    rows = (
        (await db.execute(sa_select(TestCase).where(TestCase.exercise_id == ex.id))).scalars().all()
    )
    assert rows == []


@pytest.mark.asyncio
async def test_a_question_cannot_be_added_to_another_schools_exercise(
    client: AsyncClient, db, org2, admin, admin2
):
    ex = await _exercise_in(db, org2, admin2)

    resp = await client.post(
        f"/api/v1/exercises/{ex.id}/questions",
        json={
            "question_text": "Injected?",
            "question_type": "single_choice",
            "options": [],
        },
        headers=auth_header(admin),
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_submitting_to_another_schools_exercise_is_refused(
    client: AsyncClient, db, org2, admin2, student
):
    ex = await _exercise_in(db, org2, admin2)

    resp = await client.post(
        f"/api/v1/exercises/{ex.id}/submit",
        json={"answers": {"a": "4"}},
        headers=auth_header(student),
    )
    assert resp.status_code == 404


# ── Answers ──────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_a_parent_does_not_receive_the_answer_key(
    client: AsyncClient, db, org, admin, parent
):
    """The strip used to key on ``role == student``.

    Parents are the other non-staff role, and the one deliberately linked to a
    child, so this handed a parent the answers to the exercises that child is
    set.
    """
    ex = await _exercise_in(db, org, admin, config={"question": "2+2?", "correct_answer": "4"})

    resp = await client.get(f"/api/v1/exercises/{ex.id}", headers=auth_header(parent))
    assert resp.status_code == 200
    assert "correct_answer" not in resp.json().get("config", {})


@pytest.mark.asyncio
async def test_staff_still_see_the_answer_key(client: AsyncClient, db, org, admin):
    ex = await _exercise_in(db, org, admin, config={"question": "2+2?", "correct_answer": "4"})

    resp = await client.get(f"/api/v1/exercises/{ex.id}", headers=auth_header(admin))
    assert resp.status_code == 200
    assert resp.json()["config"]["correct_answer"] == "4"


# ── The rules that already held ──────────────────────────────────────────


@pytest.mark.asyncio
async def test_own_school_still_works_end_to_end(client: AsyncClient, db, org, admin):
    """The guard must not lock a school out of its own content."""
    ex = await _exercise_in(db, org, admin)

    read = await client.get(f"/api/v1/exercises/{ex.id}", headers=auth_header(admin))
    assert read.status_code == 200

    edited = await client.put(
        f"/api/v1/exercises/{ex.id}",
        json={"title": "Renamed"},
        headers=auth_header(admin),
    )
    assert edited.status_code == 200
    assert edited.json()["title"] == "Renamed"

    removed = await client.delete(f"/api/v1/exercises/{ex.id}", headers=auth_header(admin))
    assert removed.status_code == 200


@pytest.mark.asyncio
async def test_a_student_cannot_edit_even_in_their_own_school(client: AsyncClient, db, org, admin):
    ex = await _exercise_in(db, org, admin)
    pupil = _make_user(db, org, UserRole.student, suffix="-editor")
    await db.flush()

    resp = await client.put(
        f"/api/v1/exercises/{ex.id}",
        json={"title": "Nope"},
        headers=auth_header(pupil),
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_an_unknown_id_is_still_a_404(client: AsyncClient, admin):
    resp = await client.get(f"/api/v1/exercises/{uuid.uuid4()}", headers=auth_header(admin))
    assert resp.status_code == 404

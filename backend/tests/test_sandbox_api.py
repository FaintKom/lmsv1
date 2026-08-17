"""Tests for sandbox challenge CRUD — RBAC and hidden-test-case filtering.

/execute and /submit call the remote sandbox container and are exercised by
the QA role-flow suite, not here.
"""

import pytest
from httpx import AsyncClient

from tests.conftest import auth_header, make_course, make_lesson, make_module


@pytest.fixture
async def lesson(db, org, teacher):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    return await make_lesson(db, module.id)


async def _create_challenge(client: AsyncClient, user, lesson_id):
    resp = await client.post(
        "/api/v1/sandbox/challenges",
        json={
            "lesson_id": str(lesson_id),
            "title": "Sum two numbers",
            "language": "python",
            "starter_code": "def solve():\n    pass\n",
        },
        headers=auth_header(user),
    )
    assert resp.status_code == 200, resp.text
    return resp.json()


@pytest.mark.asyncio
async def test_languages_listed(client: AsyncClient):
    """The picker offers exactly what the runner can execute.

    This used to assert `len(...) > 0`, which stayed green while the endpoint
    advertised 37 Judge0 languages and only five ran — a student picking Rust
    got "Unsupported language" at execution time.
    """
    from app.sandbox.executor import SUPPORTED_LANGUAGES

    resp = await client.get("/api/v1/sandbox/languages")
    assert resp.status_code == 200
    languages = resp.json()["languages"]
    assert {entry["key"] for entry in languages} == set(SUPPORTED_LANGUAGES)
    assert all(entry["name"] and entry["monaco"] for entry in languages)


@pytest.mark.asyncio
async def test_challenge_by_lesson_404_when_absent(client: AsyncClient, student, lesson):
    resp = await client.get(
        f"/api/v1/sandbox/lessons/{lesson.id}/challenge", headers=auth_header(student)
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_student_cannot_create_challenge(client: AsyncClient, student, lesson):
    resp = await client.post(
        "/api/v1/sandbox/challenges",
        json={"lesson_id": str(lesson.id), "title": "x", "language": "python"},
        headers=auth_header(student),
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_hidden_test_cases_filtered_for_students(
    client: AsyncClient, teacher, student, lesson
):
    challenge = await _create_challenge(client, teacher, lesson.id)

    for hidden in (False, True):
        resp = await client.post(
            f"/api/v1/sandbox/challenges/{challenge['id']}/test-cases",
            json={"input": "1 2", "expected_output": "3", "is_hidden": hidden},
            headers=auth_header(teacher),
        )
        assert resp.status_code == 200

    as_student = (
        await client.get(
            f"/api/v1/sandbox/lessons/{lesson.id}/challenge", headers=auth_header(student)
        )
    ).json()
    assert all(not tc["is_hidden"] for tc in as_student["test_cases"])
    assert len(as_student["test_cases"]) == 1


@pytest.mark.asyncio
async def test_delete_challenge(client: AsyncClient, teacher, lesson):
    challenge = await _create_challenge(client, teacher, lesson.id)
    resp = await client.delete(
        f"/api/v1/sandbox/challenges/{challenge['id']}", headers=auth_header(teacher)
    )
    assert resp.status_code == 200


# ── A limit that fired is not a pass ─────────────────────────────────────


@pytest.mark.asyncio
async def test_a_stopped_program_cannot_pass_on_the_output_it_managed_first(
    client: AsyncClient, db, org, teacher, student, lesson
):
    """Grading compares stdout, and a limit can fire *after* the right answer
    was printed.

    A program that prints the expected value and then exhausts its memory has
    not solved the exercise — it produced the answer and then failed. Today the
    comparison sees matching text and marks it correct, so a pupil passes on a
    program that did not finish.

    The unknown limit name is the point of the test rather than an accident:
    contracts/runner-api.md requires a caller to treat a value it does not
    recognise as a refusal, which is what lets the runner add one later without
    every caller being updated first.
    """
    from unittest.mock import AsyncMock, patch

    from app.exercises.models import ExerciseType
    from app.sandbox.models import TestCase
    from tests.conftest import make_exercise

    exercise = await make_exercise(
        db,
        lesson.id,
        org.id,
        exercise_type=ExerciseType.code_challenge,
        config={"language": "python"},
    )
    db.add(TestCase(exercise_id=exercise.id, input="", expected_output="42"))
    await db.flush()

    stopped_but_correct_so_far = {
        "stdout": "42",
        "stderr": "the program was stopped",
        "exit_code": -1,
        "execution_time_ms": 120,
        "status": "error",
        "limit_hit": "something_added_after_this_test_was_written",
        "queued_ms": 0,
    }

    with patch(
        "app.sandbox.executor.execute_code_remote",
        new=AsyncMock(return_value=stopped_but_correct_so_far),
    ):
        resp = await client.post(
            f"/api/v1/exercises/{exercise.id}/submit",
            json={"source_code": "print(42)", "language": "python"},
            headers=auth_header(student),
        )

    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["status"] != "passed", (
        "a program stopped by a limit was graded as a pass on the output it "
        "printed before it was stopped"
    )
    # And the pupil is shown what the program itself said, not silence.
    assert "stopped" in str(body).lower()


# ── The pupil is told which allowance they exceeded ───────────────────────


@pytest.mark.asyncio
async def test_each_limit_is_named_in_words_a_pupil_can_act_on(
    client: AsyncClient, db, org, teacher, student, lesson
):
    """FR-002. The runner knows which limit fired; the product has to say it.

    Without this a pupil sees their runtime's own words — a MemoryError
    traceback, or nothing at all for a program that was simply stopped — and has
    to guess which of four allowances they hit. The mapping lives in
    contracts/runner-api.md; this pins that the numbers come from the exercise
    rather than from a hardcoded sentence.
    """
    from unittest.mock import AsyncMock, patch

    from app.exercises.models import ExerciseType
    from app.sandbox.models import TestCase
    from tests.conftest import make_exercise

    exercise = await make_exercise(
        db,
        lesson.id,
        org.id,
        exercise_type=ExerciseType.code_challenge,
        config={"language": "python", "time_limit_seconds": 7, "memory_limit_mb": 128},
    )
    db.add(TestCase(exercise_id=exercise.id, input="", expected_output="42"))
    await db.flush()

    # What each limit must produce on screen. The allowance numbers are the
    # exercise's own, so a message quoting 10s or 256MB would be a hardcoded
    # default rather than this pupil's limit.
    expectations = {
        "time": ["7"],
        "memory": ["128"],
        "processes": ["processes"],
        "busy": ["busy"],
        "output": ["truncated", "cut short"],
    }

    for limit, must_mention in expectations.items():
        refused = {
            "stdout": "",
            "stderr": "",
            "exit_code": 1,
            "execution_time_ms": 10,
            "status": "error",
            "limit_hit": limit,
            "queued_ms": 0,
        }
        with patch(
            "app.sandbox.executor.execute_code_remote",
            new=AsyncMock(return_value=refused),
        ):
            resp = await client.post(
                f"/api/v1/exercises/{exercise.id}/submit",
                json={"source_code": "print(42)", "language": "python"},
                headers=auth_header(student),
            )
        assert resp.status_code == 200, resp.text
        shown = str(resp.json()).lower()
        assert any(word.lower() in shown for word in must_mention), (
            f"limit_hit={limit!r} produced nothing a pupil can act on. "
            f"Expected one of {must_mention}, got: {shown[:400]}"
        )

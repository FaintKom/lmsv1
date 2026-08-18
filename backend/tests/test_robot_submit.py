"""Who decides whether a robot level was passed.

Before this feature, the browser did: ``_submit_game_level`` stored ``completed``
and ``score`` straight off the request body, so a pupil could post
``{"completed": true, "score": 1.0}`` without ever opening the exercise. That is
Constitution III, and the half of `specs/004-exercise-answer-leak` that was
deferred rather than fixed.

Every test here carries its positive control in the same test. An assertion that
only rejects is green against an endpoint that rejects everything — that exact
mistake is why Constitution II exists.

The sandbox container is replaced by a local subprocess. The generated program is
the real one and the replay is the real one; only the container hop is skipped,
and the container provides isolation rather than semantics.
"""

import subprocess
import sys

import pytest

from app.exercises import robot_runner
from app.exercises.models import ExerciseType
from tests.conftest import auth_header, make_course, make_exercise, make_lesson, make_module

WIN = "while not at_goal():\n    move_forward()\n"
LOSE = "turn_left()\n"


def corridor(length: int = 3, **extra) -> dict:
    level = {
        "grid_width": length + 1,
        "grid_height": 1,
        "start": {"x": 0, "y": 0, "facing": "right"},
        "cells": [{"x": length, "y": 0, "type": "goal"}],
        "commands": list(robot_runner.robot_sim.COMMANDS),
        "win": {"cond": "at_goal"},
    }
    level.update(extra)
    return level


@pytest.fixture(autouse=True)
def _local_sandbox(monkeypatch, tmp_path):
    """Run the generated program here instead of in the container."""

    async def _execute(language, source_code, stdin="", timeout_seconds=10, memory_limit_mb=256):
        path = tmp_path / "generated.py"
        path.write_text(source_code, encoding="utf-8")
        done = subprocess.run(
            [sys.executable, str(path)], capture_output=True, text=True, timeout=30
        )
        return {
            "stdout": done.stdout,
            "stderr": done.stderr,
            "exit_code": done.returncode,
            "execution_time_ms": 0,
            "status": "success",
        }

    monkeypatch.setattr(robot_runner, "execute_code_remote", _execute)


async def _robot_exercise(db, org, teacher, **config_extra):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    return await make_exercise(
        db,
        lesson.id,
        org.id,
        exercise_type=ExerciseType.robot_2d,
        config=corridor(3, **config_extra),
    )


def _configs(body) -> list[dict]:
    if isinstance(body, dict) and "items" in body:
        return [item["config"] for item in body["items"]]
    if isinstance(body, list):
        return [item["config"] for item in body]
    return [body["config"]]


# ─── The forgery this feature exists to stop ─────────────────────────


async def test_a_claimed_win_beside_a_losing_program_is_not_passed(
    client, db, org, teacher, student
):
    """The negative and its positive control, in one test.

    Without the second half this passes against an endpoint that refuses every
    submission — which is how a billing test once claimed to enforce a rule
    nobody enforced.
    """
    exercise = await _robot_exercise(db, org, teacher)
    url = f"/api/v1/exercises/{exercise.id}/submit"
    headers = auth_header(student)

    forged = await client.post(
        url,
        json={
            "robot": {"source": LOSE, "mode": "python"},
            "game_result": {"completed": True, "score": 1.0},
        },
        headers=headers,
    )
    assert forged.status_code == 200
    assert forged.json()["passed"] is False
    assert forged.json()["score"] == 0

    honest = await client.post(
        url, json={"robot": {"source": WIN, "mode": "python"}}, headers=headers
    )
    assert honest.status_code == 200
    assert honest.json()["passed"] is True, "positive control: a winning program passes"


async def test_the_claimed_figures_are_not_recorded(client, db, org, teacher, student):
    exercise = await _robot_exercise(db, org, teacher)
    resp = await client.post(
        f"/api/v1/exercises/{exercise.id}/submit",
        json={
            "robot": {"source": WIN, "mode": "python"},
            "game_result": {"completed": True, "score": 1.0, "steps_used": 1},
        },
        headers=auth_header(student),
    )

    stored = resp.json()["answers"]["robot"]
    assert stored["steps"] == 3, "the server's own count, not the one that was sent"
    assert "game_result" not in resp.json()["answers"]


async def test_a_program_that_rigs_the_simulator_is_not_passed(client, db, org, teacher, student):
    """It wins inside the sandbox and loses on the replay. Research Finding B."""
    exercise = await _robot_exercise(db, org, teacher)
    url = f"/api/v1/exercises/{exercise.id}/submit"
    headers = auth_header(student)

    rigged = await client.post(
        url,
        json={"robot": {"source": "WORLD.goals.add(WORLD.here)\n", "mode": "python"}},
        headers=headers,
    )
    assert rigged.json()["passed"] is False

    honest = await client.post(
        url, json={"robot": {"source": WIN, "mode": "python"}}, headers=headers
    )
    assert honest.json()["passed"] is True, "positive control"


async def test_a_submission_without_a_program_is_refused(client, db, org, teacher, student):
    exercise = await _robot_exercise(db, org, teacher)
    resp = await client.post(
        f"/api/v1/exercises/{exercise.id}/submit",
        json={"game_result": {"completed": True, "score": 1.0}},
        headers=auth_header(student),
    )
    assert resp.status_code == 400


# ─── Running is free; submitting is not ──────────────────────────────


async def test_running_never_spends_an_attempt(client, db, org, teacher, student):
    """FR-026 and SC-010, with the control that submitting *does* spend one."""
    exercise = await _robot_exercise(db, org, teacher)
    headers = auth_header(student)
    attempts_url = f"/api/v1/exercises/{exercise.id}/attempts"

    before = (await client.get(attempts_url, headers=headers)).json()

    for _ in range(20):
        run = await client.post(
            f"/api/v1/exercises/{exercise.id}/robot/run",
            json={"source": WIN, "mode": "python"},
            headers=headers,
        )
        assert run.status_code == 200

    after = (await client.get(attempts_url, headers=headers)).json()
    assert after["attempt_count"] == before["attempt_count"], "twenty runs cost nothing"

    await client.post(
        f"/api/v1/exercises/{exercise.id}/submit",
        json={"robot": {"source": WIN, "mode": "python"}},
        headers=headers,
    )
    spent = (await client.get(attempts_url, headers=headers)).json()
    assert spent["attempt_count"] == before["attempt_count"] + 1, (
        "positive control: submitting does spend one"
    )


async def test_a_losing_submission_is_still_recorded(client, db, org, teacher, student):
    """Pressing Submit is a decision. It costs an attempt whatever it says."""
    exercise = await _robot_exercise(db, org, teacher)
    resp = await client.post(
        f"/api/v1/exercises/{exercise.id}/submit",
        json={"robot": {"source": LOSE, "mode": "python"}},
        headers=auth_header(student),
    )
    assert resp.status_code == 200
    assert resp.json()["passed"] is False


# ─── Another school's level does not exist ───────────────────────────


async def test_running_another_schools_level_reads_as_not_found(
    client, db, org, teacher, student, admin2
):
    """Constitution I, with the owning school as the positive control.

    Without that control this assertion is green before the route exists at all
    — a 404 for everyone looks exactly like a 404 for outsiders.
    """
    exercise = await _robot_exercise(db, org, teacher)
    body = {"source": WIN, "mode": "python"}

    outsider = await client.post(
        f"/api/v1/exercises/{exercise.id}/robot/run", json=body, headers=auth_header(admin2)
    )
    assert outsider.status_code == 404, "another school's id must not resolve"

    owner = await client.post(
        f"/api/v1/exercises/{exercise.id}/robot/run", json=body, headers=auth_header(student)
    )
    assert owner.status_code == 200, "positive control: this school's pupil can run it"


async def test_a_non_robot_exercise_is_not_found_on_the_robot_route(
    client, db, org, teacher, student
):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    quiz = await make_exercise(db, lesson.id, org.id, exercise_type=ExerciseType.quiz)

    resp = await client.post(
        f"/api/v1/exercises/{quiz.id}/robot/run",
        json={"source": WIN, "mode": "python"},
        headers=auth_header(student),
    )
    assert resp.status_code == 404


# ─── The reference solution is not the pupil's business ──────────────


async def test_the_reference_solution_never_reaches_a_pupil(client, db, org, teacher, student):
    """Through every read path, with the teacher as the positive control."""
    exercise = await _robot_exercise(db, org, teacher, solution_code=WIN)
    paths = [
        f"/api/v1/exercises/{exercise.id}",
        f"/api/v1/exercises/by-lesson/{exercise.lesson_id}",
        f"/api/v1/exercises?lesson_id={exercise.lesson_id}",
    ]

    for path in paths:
        body = (await client.get(path, headers=auth_header(student))).json()
        configs = _configs(body)
        assert configs, f"{path} returned nothing — the assertion below would pass for free"
        for config in configs:
            assert "solution_code" not in config, path

    seen_by_teacher = (await client.get(paths[0], headers=auth_header(teacher))).json()
    assert seen_by_teacher["config"]["solution_code"] == WIN, "positive control"

"""Who decides whether a 3D level was passed.

Before this feature, the browser did: ``_submit_game_level`` stored ``completed``
and ``score`` straight off the request body, so a pupil could post
``{"completed": true, "score": 1.0}`` without ever opening the exercise. That is
Constitution III, and the last of `specs/004-exercise-answer-leak`.

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

from app.exercises import robot_runner, world_sim
from app.exercises.models import ExerciseType
from tests.conftest import auth_header, make_course, make_exercise, make_lesson, make_module

WIN = "while not at_goal():\n    move_forward()\n"
LOSE = "turn_left()\n"


def corridor(length: int = 3, **extra) -> dict:
    """One square wide, the goal at the far end, facing north down the run."""
    level = {
        "grid_width": 1,
        "grid_depth": length + 1,
        "start": {"x": 0, "z": length, "y": 0, "facing": "north"},
        "cells": [{"x": 0, "z": 0, "type": "goal"}],
        "commands": list(world_sim.COMMANDS),
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


async def _world_exercise(db, org, teacher, **config_extra):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    return await make_exercise(
        db,
        lesson.id,
        org.id,
        exercise_type=ExerciseType.world_3d,
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
    """The whole point, with its control: the same endpoint must pass a real win."""
    exercise = await _world_exercise(db, org, teacher)

    lost = await client.post(
        f"/api/v1/exercises/{exercise.id}/submit",
        json={
            "world": {"source": LOSE, "mode": "python"},
            "game_result": {"completed": True, "score": 1.0, "steps_used": 999},
        },
        headers=auth_header(student),
    )
    assert lost.status_code == 200
    assert lost.json()["passed"] is False
    assert lost.json()["score"] == 0

    won = await client.post(
        f"/api/v1/exercises/{exercise.id}/submit",
        json={"world": {"source": WIN, "mode": "python"}},
        headers=auth_header(student),
    )
    assert won.status_code == 200
    assert won.json()["passed"] is True


async def test_the_claimed_figures_are_not_recorded(client, db, org, teacher, student):
    exercise = await _world_exercise(db, org, teacher)

    body = (
        await client.post(
            f"/api/v1/exercises/{exercise.id}/submit",
            json={
                "world": {"source": WIN, "mode": "python"},
                "game_result": {"completed": True, "score": 1.0, "steps_used": 999},
            },
            headers=auth_header(student),
        )
    ).json()

    assert "game_result" not in body["answers"]
    assert body["answers"]["world"]["steps"] == 3  # the server's own count


async def test_a_program_that_rigs_the_simulator_is_not_passed(client, db, org, teacher, student):
    """The reason the server replays rather than trusting what the sandbox concluded."""
    exercise = await _world_exercise(db, org, teacher)
    source = "WORLD.goals.add(WORLD.here)\n"

    body = (
        await client.post(
            f"/api/v1/exercises/{exercise.id}/submit",
            json={"world": {"source": source, "mode": "python"}},
            headers=auth_header(student),
        )
    ).json()

    assert body["passed"] is False


async def test_a_submission_without_a_program_is_refused(client, db, org, teacher, student):
    exercise = await _world_exercise(db, org, teacher)

    empty = await client.post(
        f"/api/v1/exercises/{exercise.id}/submit",
        json={"world": {"source": "   ", "mode": "python"}},
        headers=auth_header(student),
    )
    assert empty.status_code == 400

    # The control: the same endpoint accepts a program.
    fine = await client.post(
        f"/api/v1/exercises/{exercise.id}/submit",
        json={"world": {"source": WIN, "mode": "python"}},
        headers=auth_header(student),
    )
    assert fine.status_code == 200


# ─── Running is free; submitting is not ──────────────────────────────


async def test_running_never_spends_an_attempt(client, db, org, teacher, student):
    exercise = await _world_exercise(db, org, teacher)

    before = (
        await client.get(f"/api/v1/exercises/{exercise.id}/attempts", headers=auth_header(student))
    ).json()

    for _ in range(3):
        ran = await client.post(
            f"/api/v1/exercises/{exercise.id}/world/run",
            json={"source": WIN, "mode": "python"},
            headers=auth_header(student),
        )
        assert ran.status_code == 200
        assert ran.json()["won"] is True

    after = (
        await client.get(f"/api/v1/exercises/{exercise.id}/attempts", headers=auth_header(student))
    ).json()
    assert after["attempt_count"] == before["attempt_count"], "three runs cost nothing"

    # The control: submitting does spend one.
    await client.post(
        f"/api/v1/exercises/{exercise.id}/submit",
        json={"world": {"source": WIN, "mode": "python"}},
        headers=auth_header(student),
    )
    spent = (
        await client.get(f"/api/v1/exercises/{exercise.id}/attempts", headers=auth_header(student))
    ).json()
    assert spent["attempt_count"] == before["attempt_count"] + 1, (
        "positive control: submitting does spend one"
    )


async def test_a_losing_submission_is_still_recorded(client, db, org, teacher, student):
    exercise = await _world_exercise(db, org, teacher)

    body = (
        await client.post(
            f"/api/v1/exercises/{exercise.id}/submit",
            json={"world": {"source": LOSE, "mode": "python"}},
            headers=auth_header(student),
        )
    ).json()

    assert body["passed"] is False
    assert body["status"] == "graded"
    assert body["answers"]["world"]["source"] == LOSE.strip()


# ─── Isolation, with a positive control ──────────────────────────────


async def test_running_another_schools_level_reads_as_not_found(
    client, db, org, teacher, student, admin2
):
    """Constitution I, with the owning school as the positive control.

    Without that control this assertion is green before the route exists at all
    — a 404 for everyone looks exactly like a 404 for outsiders.
    """
    exercise = await _world_exercise(db, org, teacher)
    body = {"source": WIN, "mode": "python"}

    outsider = await client.post(
        f"/api/v1/exercises/{exercise.id}/world/run", json=body, headers=auth_header(admin2)
    )
    assert outsider.status_code == 404

    insider = await client.post(
        f"/api/v1/exercises/{exercise.id}/world/run", json=body, headers=auth_header(student)
    )
    assert insider.status_code == 200


async def test_a_non_3d_exercise_is_not_found_on_the_world_route(client, db, org, teacher, student):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    quiz = await make_exercise(db, lesson.id, org.id, exercise_type=ExerciseType.quiz)

    refused = await client.post(
        f"/api/v1/exercises/{quiz.id}/world/run",
        json={"source": WIN, "mode": "python"},
        headers=auth_header(student),
    )
    assert refused.status_code == 404


# ─── Only staff may check or playtest a level ────────────────────────


async def test_only_staff_may_press_check(client, org, teacher, student):
    """A pupil supplying their own level could author a one-square one and win it."""
    body = {"config": corridor(3)}

    pupil = await client.post(
        "/api/v1/exercises/world/solve", json=body, headers=auth_header(student)
    )
    assert pupil.status_code == 403

    staff = await client.post(
        "/api/v1/exercises/world/solve", json=body, headers=auth_header(teacher)
    )
    assert staff.status_code == 200
    assert staff.json()["answer"] == "shortest"
    assert staff.json()["steps"] == 3


async def test_only_staff_may_playtest(client, org, teacher, student):
    body = {"config": corridor(3), "source": WIN}

    pupil = await client.post(
        "/api/v1/exercises/world/preview", json=body, headers=auth_header(student)
    )
    assert pupil.status_code == 403

    staff = await client.post(
        "/api/v1/exercises/world/preview", json=body, headers=auth_header(teacher)
    )
    assert staff.status_code == 200
    assert staff.json()["won"] is True


async def test_a_playtest_refuses_a_faulty_level_and_names_every_fault(client, org, teacher):
    """The teacher gets the whole list, not the first thing that failed."""
    broken = corridor(3)
    broken["cells"] = [{"x": 0, "z": 1, "type": "button", "opens": "missing"}]
    broken["commands"] = []

    refused = await client.post(
        "/api/v1/exercises/world/preview",
        json={"config": broken, "source": WIN},
        headers=auth_header(teacher),
    )
    assert refused.status_code == 400
    codes = {b["code"] for b in refused.json()["detail"]["blockers"]}
    assert {"no_goal", "button_without_door", "no_commands"} <= codes


# ─── The reference solution is not a pupil's to read ─────────────────


async def test_the_reference_solution_never_reaches_a_pupil(client, db, org, teacher, student):
    """SC-009, through every read a pupil has."""
    exercise = await _world_exercise(db, org, teacher, solution_code=WIN)
    lesson_id = exercise.lesson_id

    for url in (
        f"/api/v1/exercises/{exercise.id}",
        f"/api/v1/exercises?lesson_id={lesson_id}",
        f"/api/v1/exercises/by-lesson/{lesson_id}",
    ):
        pupil = await client.get(url, headers=auth_header(student))
        assert pupil.status_code == 200
        for config in _configs(pupil.json()):
            assert "solution_code" not in config

    # The control: a teacher reading the same exercise does get it.
    staff = await client.get(f"/api/v1/exercises/{exercise.id}", headers=auth_header(teacher))
    assert staff.json()["config"]["solution_code"] == WIN

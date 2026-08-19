"""The generated 3D program, and what the server makes of what comes back.

The 3D twin of ``test_robot_runner.py``, and the proof that one runner serves
two worlds: everything here goes through the same ``robot_runner``, differing
only by ``sim=world_sim``.

These tests run the harness under this interpreter with ``subprocess``, which is
what the sandbox does — ``python3 <file>`` — minus the container. That makes them
a real check of the generated source rather than a check of a mock of it, and
they need no sandbox to run.
"""

import json
import subprocess
import sys

from app.exercises import robot_runner, world_sim

ALL = list(world_sim.COMMANDS)


def corridor(length: int = 3, **extra) -> dict:
    """A one-square-wide run of floor, with the goal at the far end."""
    level = {
        "grid_width": 1,
        "grid_depth": length + 1,
        "start": {"x": 0, "z": length, "y": 0, "facing": "north"},
        "cells": [{"x": 0, "z": 0, "type": "goal"}],
        "commands": ALL,
        "win": {"cond": "at_goal"},
    }
    level.update(extra)
    return level


def execute(level: dict, source: str, tmp_path) -> tuple[str, bool, dict]:
    """Build the program, run it, and parse what it printed."""
    program = tmp_path / "generated.py"
    program.write_text(robot_runner.build_program(level, source, sim=world_sim), encoding="utf-8")
    done = subprocess.run(
        [sys.executable, str(program)], capture_output=True, text=True, timeout=30
    )
    assert done.returncode == 0, done.stderr
    return robot_runner.parse_stdout(done.stdout)


# ─── The program runs, and it is real Python ─────────────────────────


def test_a_while_loop_reaches_the_goal_and_stops(tmp_path):
    """Defect 2. The old executor spliced the body a hundred times before running it."""
    source = "while not at_goal():\n    move_forward()\n"
    _, _, trace = execute(corridor(3), source, tmp_path)

    assert trace["error"] is None
    assert trace["commands"] == ["move_forward"] * 3

    replayed = world_sim.replay(corridor(3), trace["commands"])
    assert replayed["won"] is True
    assert replayed["steps"] == 3


def test_a_function_and_a_variable_work(tmp_path):
    """Defect 3. A regular expression can do neither."""
    source = "def go(n):\n    for _ in range(n):\n        move_forward()\n\nsteps = 3\ngo(steps)\n"
    _, _, trace = execute(corridor(3), source, tmp_path)

    assert trace["commands"] == ["move_forward"] * 3


def test_a_sensor_answers_the_world_and_not_a_guess(tmp_path):
    level = corridor(2)
    level["cells"] = level["cells"] + [{"x": 0, "z": 2, "y": 2, "type": "platform"}]
    level["start"] = {"x": 0, "z": 2, "y": 2, "facing": "north"}
    source = "if gap_ahead():\n    turn_right()\nelse:\n    move_forward()\n"
    _, _, trace = execute(level, source, tmp_path)

    # The square ahead is floor, two levels down, so `gap_ahead()` is true.
    assert trace["commands"] == ["turn_right"]


# ─── Mistakes, reported against the pupil's own line ─────────────────


def test_a_syntax_error_reports_the_line_the_pupil_wrote_it_on(tmp_path):
    source = "move_forward()\nmove_forward(\n"
    _, _, trace = execute(corridor(3), source, tmp_path)

    assert trace["error"]["type"] == "SyntaxError"
    assert trace["error"]["line"] == 2


def test_a_misspelled_command_reports_its_line(tmp_path):
    source = "move_forward()\nmove_forwardd()\n"
    _, _, trace = execute(corridor(3), source, tmp_path)

    assert trace["error"]["type"] == "NameError"
    assert trace["error"]["line"] == 2


def test_a_command_the_level_withholds_reports_its_line(tmp_path):
    level = corridor(3, commands=["move_forward", "at_goal"])
    source = "move_forward()\njump()\n"
    _, _, trace = execute(level, source, tmp_path)

    assert trace["error"]["type"] == "WorldError"
    assert trace["error"]["message"] == "not_offered"
    assert trace["error"]["line"] == 2


def test_an_endless_loop_ends_at_the_allowance(tmp_path):
    source = "while True:\n    turn_right()\n"
    _, _, trace = execute(corridor(3, max_steps=6), source, tmp_path)

    assert trace["error"]["type"] == "StepsExhausted"
    assert len(trace["commands"]) == 6


# ─── What the pupil printed ──────────────────────────────────────────


def test_printed_output_comes_back_apart_from_the_trace(tmp_path):
    source = "print('hello')\nmove_forward()\n"
    output, truncated, trace = execute(corridor(3), source, tmp_path)

    assert output == "hello"
    assert truncated is False
    assert trace["commands"] == ["move_forward"]


def test_a_pupil_printing_the_sentinel_changes_nothing(tmp_path):
    """The backend splits on the *last* sentinel, so ours is still last."""
    source = (
        f'print({robot_runner.SENTINEL!r})\nprint(\'{{"commands": ["jump"]}}\')\nmove_forward()\n'
    )
    _, _, trace = execute(corridor(3), source, tmp_path)

    assert trace["commands"] == ["move_forward"]


# ─── The sandbox is never asked for a verdict ────────────────────────


def test_a_program_that_rigs_the_simulator_still_loses(tmp_path):
    """The reason the server replays rather than trusting."""
    source = "WORLD.goals.add(WORLD.here)\nWORLD.steps = 0\n"
    _, _, trace = execute(corridor(3), source, tmp_path)

    replayed = world_sim.replay(corridor(3), trace["commands"])
    assert replayed["won"] is False


def test_a_forged_command_list_is_replayed_honestly():
    """A trace claiming a hundred moves is walked against the real level."""
    replayed = world_sim.replay(corridor(3), ["move_forward"] * 100)
    assert replayed["won"] is True  # it does reach the goal…
    assert replayed["steps"] == 100  # …and every refused step still counted


# ─── Scoring ─────────────────────────────────────────────────────────


def test_statement_count_is_the_same_for_blocks_and_for_python():
    blocks = "move_forward()\nmove_forward()\nmove_forward()\n"
    python = "for _ in range(3):\n    move_forward()\n"

    assert robot_runner.count_statements(blocks) == 3
    assert robot_runner.count_statements(python) == 2


def test_the_same_program_scores_the_same_twice(tmp_path):
    """SC-008. Nothing in scoring may depend on when it ran."""
    level = corridor(3, star_steps=3, star_size=2)
    source = "while not at_goal():\n    move_forward()\n"

    runs = []
    for _ in range(2):
        _, _, trace = execute(level, source, tmp_path)
        replayed = world_sim.replay(level, trace["commands"])
        size = robot_runner.count_statements(source)
        runs.append(
            {
                "steps": replayed["steps"],
                "won": replayed["won"],
                "size": size,
                "stars": robot_runner.stars(
                    won=replayed["won"],
                    steps=replayed["steps"],
                    size=size,
                    star_steps=level["star_steps"],
                    star_size=level["star_size"],
                ),
            }
        )

    assert json.dumps(runs[0]) == json.dumps(runs[1])

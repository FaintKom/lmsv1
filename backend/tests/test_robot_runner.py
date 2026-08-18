"""The generated program, and what the server makes of what comes back.

These tests run the harness under this interpreter with ``subprocess``, which is
what the sandbox does — ``python3 <file>`` — minus the container. That makes them
a real check of the generated source rather than a check of a mock of it, and
they need no sandbox to run.
"""

import json
import subprocess
import sys

from app.exercises import robot_runner, robot_sim

ALL = list(robot_sim.COMMANDS)


def corridor(length: int = 3, **extra) -> dict:
    level = {
        "grid_width": length + 1,
        "grid_height": 1,
        "start": {"x": 0, "y": 0, "facing": "right"},
        "cells": [{"x": length, "y": 0, "type": "goal"}],
        "commands": ALL,
        "win": {"cond": "at_goal"},
    }
    level.update(extra)
    return level


def execute(level: dict, source: str, tmp_path) -> tuple[str, bool, dict]:
    """Build the program, run it, and parse what it printed."""
    program = tmp_path / "generated.py"
    program.write_text(robot_runner.build_program(level, source), encoding="utf-8")
    done = subprocess.run(
        [sys.executable, str(program)], capture_output=True, text=True, timeout=30
    )
    assert done.returncode == 0, done.stderr
    return robot_runner.parse_stdout(done.stdout)


# ─── The program runs, and it is real Python ─────────────────────────


def test_a_while_loop_reaches_the_goal_and_stops(tmp_path):
    source = "while not at_goal():\n    move_forward()\n"
    output, _, trace = execute(corridor(3), source, tmp_path)

    assert trace["error"] is None
    assert trace["commands"] == ["move_forward"] * 3
    assert output == ""


def test_a_function_definition_works(tmp_path):
    source = "def go(n):\n    for i in range(n):\n        move_forward()\n\ngo(2)\n"
    _, _, trace = execute(corridor(3), source, tmp_path)

    assert trace["commands"] == ["move_forward"] * 2
    assert trace["error"] is None


def test_variables_and_arithmetic_work(tmp_path):
    source = "steps = 1 + 1\nfor i in range(steps):\n    move_forward()\n"
    _, _, trace = execute(corridor(3), source, tmp_path)

    assert trace["commands"] == ["move_forward"] * 2


def test_write_is_recorded_with_its_argument(tmp_path):
    level = corridor(2)
    level["cells"].append({"x": 0, "y": 0, "type": "empty", "value": 1})

    _, _, trace = execute(level, "write(9)\n", tmp_path)

    assert trace["commands"] == [["write", 9]]


# ─── Errors name the pupil's own line ────────────────────────────────


def test_syntax_error_reports_the_line_the_pupil_wrote_it_on(tmp_path):
    """Not the line in the generated file, which is hundreds further down."""
    source = "move_forward()\nif True\n    move_forward()\n"
    _, _, trace = execute(corridor(3), source, tmp_path)

    assert trace["error"]["type"] == "SyntaxError"
    assert trace["error"]["line"] == 2


def test_a_misspelled_command_reports_its_line(tmp_path):
    source = "move_forward()\nmove_forwardd()\n"
    _, _, trace = execute(corridor(3), source, tmp_path)

    assert trace["error"]["type"] == "NameError"
    assert trace["error"]["line"] == 2
    assert trace["commands"] == ["move_forward"], "the robot walks up to the break"


def test_a_command_the_level_withholds_reports_its_line(tmp_path):
    level = corridor(3)
    level["commands"] = ["move_forward", "at_goal"]
    _, _, trace = execute(level, "move_forward()\nturn_left()\n", tmp_path)

    assert trace["error"]["type"] == "RobotError"
    assert trace["error"]["message"] == "not_offered"
    assert trace["error"]["line"] == 2


def test_reading_a_bare_floor_reports_its_line(tmp_path):
    _, _, trace = execute(corridor(3), "n = read()\n", tmp_path)

    assert trace["error"]["message"] == "no_value"
    assert trace["error"]["line"] == 1


def test_an_endless_loop_ends_at_the_allowance(tmp_path):
    source = "while True:\n    turn_right()\n"
    _, _, trace = execute(corridor(3, max_steps=6), source, tmp_path)

    assert trace["error"]["type"] == "StepsExhausted"
    assert len(trace["commands"]) == 6


async def test_running_out_of_steps_is_not_reported_as_an_error(tmp_path, monkeypatch):
    """The allowance running out is the level's limit, not a fault to fix.

    ``stopped`` already says so in a sentence a child reads. Passing the
    simulator's own exception along as well printed
    "StepsExhausted: steps_exhausted" underneath that sentence.
    """
    level = corridor(3, max_steps=6)

    def sandbox_returning(source: str):
        program = tmp_path / "generated.py"
        program.write_text(robot_runner.build_program(level, source), encoding="utf-8")
        done = subprocess.run(
            [sys.executable, str(program)], capture_output=True, text=True, timeout=30
        )

        async def _sandbox(*_args, **_kwargs):
            return {"status": "success", "stdout": done.stdout, "stderr": ""}

        return _sandbox

    runaway = "while True:\n    turn_right()\n"
    monkeypatch.setattr(robot_runner, "execute_code_remote", sandbox_returning(runaway))
    result = await robot_runner.run(level, runaway)
    assert result["stopped"] == "steps_exhausted"
    assert result["error"] is None

    # Positive control: a program that really is broken still says so, or this
    # test would pass just as well against a runner that never reports errors.
    typo = "move_forwardd()\n"
    monkeypatch.setattr(robot_runner, "execute_code_remote", sandbox_returning(typo))
    broken = await robot_runner.run(level, typo)
    assert broken["error"] is not None


# ─── The pupil's own printing ────────────────────────────────────────


def test_printed_output_comes_back_apart_from_the_robot(tmp_path):
    source = "print(2 + 2)\nmove_forward()\n"
    output, truncated, trace = execute(corridor(3), source, tmp_path)

    assert output == "4"
    assert truncated is False
    assert trace["commands"] == ["move_forward"]


def test_a_pupil_printing_the_sentinel_changes_nothing(tmp_path):
    """Ours is printed last, and the split takes the last occurrence."""
    source = f"print({robot_runner.SENTINEL!r})\nprint('not a trace')\nmove_forward()\n"
    output, _, trace = execute(corridor(3), source, tmp_path)

    assert trace["commands"] == ["move_forward"], "the real trace still wins"
    assert "not a trace" in output


# ─── The sandbox's opinion is not consulted ──────────────────────────


def test_a_program_that_rigs_the_simulator_still_loses(tmp_path):
    """The reason the server replays instead of trusting.

    This program wins outright inside the sandbox — it puts a goal under its own
    feet. What comes back is a command list of nothing at all, and the replay
    against the real grid never reaches the real goal.
    """
    _, _, trace = execute(corridor(3), "WORLD.goals.add(WORLD.here)\n", tmp_path)

    assert trace["error"] is None, "the tamper itself succeeds, inside the sandbox"
    assert robot_sim.replay(corridor(3), trace["commands"])["won"] is False


def test_a_forged_command_list_is_replayed_honestly():
    """Even a list claiming a hundred moves only walks as far as the grid."""
    assert robot_sim.replay(corridor(3), ["move_forward"] * 100)["won"] is True
    assert robot_sim.replay(corridor(3), ["turn_left"] * 100)["won"] is False


# ─── Embedding is safe for anything a child types ────────────────────


def test_quotes_and_backslashes_survive_embedding(tmp_path):
    source = "print('he said \"hi\" \\\\ then left')\nmove_forward()\n"
    output, _, trace = execute(corridor(3), source, tmp_path)

    assert output == 'he said "hi" \\ then left'
    assert trace["commands"] == ["move_forward"]


def test_a_triple_quoted_string_survives_embedding(tmp_path):
    source = 'x = """\ntriple\n"""\nmove_forward()\n'
    _, _, trace = execute(corridor(3), source, tmp_path)

    assert trace["error"] is None
    assert trace["commands"] == ["move_forward"]


# ─── Parsing, sizing and scoring, without running anything ───────────


def test_stdout_with_no_trace_yields_no_commands():
    output, truncated, trace = robot_runner.parse_stdout("just some print output\n")

    assert trace["commands"] == []
    assert output == "just some print output"
    assert truncated is False


def test_output_over_the_cap_is_truncated_and_says_so():
    stdout = "x" * (robot_runner.OUTPUT_LIMIT + 50) + "\n" + robot_runner.SENTINEL + "\n{}"
    output, truncated, _ = robot_runner.parse_stdout(stdout)

    assert len(output) == robot_runner.OUTPUT_LIMIT
    assert truncated is True


def test_an_unreadable_trace_loses_rather_than_raising():
    _, _, trace = robot_runner.parse_stdout(robot_runner.SENTINEL + "\nnot json at all")
    assert trace["commands"] == []


def test_statement_count_is_the_same_for_blocks_and_for_python():
    """SC-007's other half: block mode submits this exact Python, so one rule
    measures both and neither side reports its own size."""
    assert robot_runner.count_statements("move_up()\nmove_up()\n") == 2
    assert robot_runner.count_statements("for i in range(2):\n    move_up()\n") == 2
    assert robot_runner.count_statements("") == 0


def test_a_program_that_does_not_parse_has_no_size():
    assert robot_runner.count_statements("if True\n") == 0


def test_stars_need_a_win_first():
    assert robot_runner.stars(won=False, steps=1, size=1, star_steps=99, star_size=99) == 0


def test_stars_are_three_when_the_teacher_set_no_thresholds():
    assert robot_runner.stars(won=True, steps=99, size=99, star_steps=None, star_size=None) == 3


def test_each_threshold_is_checked_at_its_boundary():
    def earned(steps, size):
        return robot_runner.stars(won=True, steps=steps, size=size, star_steps=6, star_size=3)

    assert earned(6, 3) == 3, "on the threshold counts as within it"
    assert earned(7, 3) == 2
    assert earned(6, 4) == 2
    assert earned(7, 4) == 1


def test_the_same_program_scores_the_same_twice(tmp_path):
    """SC-008. Nothing in scoring may depend on when it ran."""
    level = corridor(3, star_steps=3, star_size=1)
    source = "while not at_goal():\n    move_forward()\n"

    runs = []
    for _ in range(2):
        _, _, trace = execute(level, source, tmp_path)
        replayed = robot_sim.replay(level, trace["commands"])
        runs.append(
            robot_runner.stars(
                won=replayed["won"],
                steps=replayed["steps"],
                size=robot_runner.count_statements(source),
                star_steps=level["star_steps"],
                star_size=level["star_size"],
            )
        )

    assert runs[0] == runs[1]
    assert json.dumps(runs[0]) == json.dumps(runs[1])

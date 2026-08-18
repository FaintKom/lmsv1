"""Movement, refusals and the step allowance.

Every test here names the defect it exists to catch. The one that matters most
is ``test_while_loop_reaches_the_goal_and_stops``: the shipped frontend executor
spliced a loop body up to a hundred times *before* executing any of it, so the
condition could never change and ``while`` was a fixed repeat wearing a
condition's clothes. Running the loop through CPython is both the fix and the
proof.
"""

import pytest

from app.exercises import robot_sim
from app.exercises.robot_sim import RobotError, StepsExhaustedError, World

ALL = list(robot_sim.COMMANDS)


def corridor(length: int = 4) -> dict:
    """Start at (0,0) facing right; goal ``length`` cells along an open row."""
    return {
        "grid_width": length + 1,
        "grid_height": 1,
        "start": {"x": 0, "y": 0, "facing": "right"},
        "cells": [{"x": length, "y": 0, "type": "goal"}],
        "commands": ALL,
        "win": {"cond": "at_goal"},
    }


def bind(level: dict) -> World:
    """Bind the module-level world, as the generated sandbox program does."""
    robot_sim.WORLD = World(level)
    return robot_sim.WORLD


# ─── The regression this whole feature exists for ────────────────────


def test_while_loop_reaches_the_goal_and_stops():
    world = bind(corridor(4))

    while not robot_sim.at_goal():
        robot_sim.move_forward()

    assert world.here == (4, 0)
    assert world.steps == 4, "the loop must stop on arrival, not unroll a fixed count"
    assert world.evaluate() is True


def test_while_loop_over_a_sensor_re_reads_it_each_pass():
    """``while not wall_ahead()`` walks to the wall and no further."""
    world = bind(corridor(3))

    while not robot_sim.wall_ahead():
        robot_sim.move_forward()

    assert world.here == (3, 0)
    assert world.steps == 3


# ─── Movement and refusals ───────────────────────────────────────────


def test_wall_refuses_the_move_and_still_costs_a_step():
    level = corridor(3)
    level["cells"].append({"x": 1, "y": 0, "type": "wall"})
    world = bind(level)

    frame = world.perform("move_forward")

    assert world.here == (0, 0), "the robot must not pass through the wall"
    assert frame["ok"] is False
    assert frame["msg"] == "wall"
    assert world.steps == 1, "bumping into a wall is not free"


def test_grid_edge_refuses_and_is_told_apart_from_a_wall():
    world = bind(corridor(3))
    frame = world.perform("move_left")

    assert world.here == (0, 0)
    assert frame["msg"] == "edge"


def test_absolute_move_turns_the_robot_to_face_that_way():
    world = bind(corridor(3))
    world.perform("move_up")  # refused — the grid is one row tall

    assert world.facing == "up", "facing changes even when the move is refused"


def test_a_turn_costs_a_step():
    world = bind(corridor(3))
    world.perform("turn_left")

    assert world.facing == "up"
    assert world.steps == 1


def test_four_turns_come_back_round():
    world = bind(corridor(3))
    for _ in range(4):
        world.perform("turn_right")
    assert world.facing == "right"


def test_sensors_cost_nothing():
    world = bind(corridor(3))
    for _ in range(10):
        world.sense("wall_ahead")
        world.sense("at_goal")
    assert world.steps == 0
    assert world.frames == []


# ─── The step allowance ──────────────────────────────────────────────


def test_runaway_program_ends_at_the_allowance():
    level = corridor(3)
    level["max_steps"] = 5
    world = bind(level)

    with pytest.raises(StepsExhaustedError):
        for _ in range(20):
            world.perform("turn_right")

    assert world.steps == 5


def test_replay_reports_steps_exhausted_rather_than_dying():
    level = corridor(3)
    level["max_steps"] = 2
    result = robot_sim.replay(level, ["turn_right"] * 10)

    assert result["stopped"] == "steps_exhausted"
    assert result["steps"] == 2
    assert result["won"] is False


# ─── The offered set ─────────────────────────────────────────────────


def test_a_command_the_level_withholds_is_refused_by_name():
    level = corridor(3)
    level["commands"] = ["move_forward", "at_goal"]
    world = bind(level)

    with pytest.raises(RobotError) as caught:
        world.perform("turn_left")
    assert caught.value.key == "not_offered"


def test_a_sensor_the_level_withholds_is_refused_too():
    level = corridor(3)
    level["commands"] = ["move_forward"]
    world = bind(level)

    with pytest.raises(RobotError) as caught:
        world.sense("wall_ahead")
    assert caught.value.key == "not_offered"


# ─── The command vocabulary is a contract ────────────────────────────


def test_no_command_name_is_longer_than_fourteen_characters():
    """FR-011. One line, and it holds the day someone adds ``move_diagonally``."""
    assert [c for c in robot_sim.COMMANDS if len(c) > 14] == []


def test_no_command_carries_an_object_prefix():
    """``move_up()``, never ``robot.move_up()`` — six characters a child types
    twenty times a lesson."""
    assert [c for c in robot_sim.COMMANDS if "." in c] == []


def test_every_command_is_reachable_through_perform_or_sense():
    """A name in COMMANDS that nothing dispatches would be a command the
    autocompletion offers and the engine then rejects."""
    # One cell wide, so every move is refused at the edge and the robot stays
    # on the square that carries the item and the value. Without that, the
    # moves walk it off and `read` refuses for a reason this test is not about.
    world = bind(
        {
            "grid_width": 1,
            "grid_height": 1,
            "start": {"x": 0, "y": 0, "facing": "right"},
            "cells": [{"x": 0, "y": 0, "type": "item", "value": 3}],
            "commands": ALL,
            "win": {"cond": "at_goal"},
        }
    )
    for name in robot_sim.SENSORS:
        assert isinstance(world.sense(name), bool)
    for name in robot_sim.ACTIONS:
        world.perform(name, 1 if name == "write" else None)


# ─── Replay is the verdict ───────────────────────────────────────────


def test_replay_of_a_winning_list_wins():
    result = robot_sim.replay(corridor(3), ["move_forward"] * 3)
    assert result["won"] is True
    assert result["steps"] == 3
    assert result["stopped"] == "end_of_program"


def test_replay_cannot_be_talked_into_a_win():
    """The sandbox may claim anything; a command list claims nothing.

    This is the whole reason the server replays instead of trusting a verdict —
    the worst a doctored list can describe is a run that loses.
    """
    result = robot_sim.replay(corridor(3), ["turn_left", "turn_right"])
    assert result["won"] is False


def test_replay_starts_from_a_clean_world_every_time():
    level = corridor(3)
    first = robot_sim.replay(level, ["move_forward"] * 3)
    second = robot_sim.replay(level, ["move_forward"])

    assert first["won"] is True
    assert second["won"] is False, "the first run must not leave state behind"

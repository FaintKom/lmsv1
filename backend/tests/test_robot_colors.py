"""Coloured paint for the 2D robot — specs/021.

Written RED-first: before the sim change, a coloured command entry
(["paint", "red"]) crashed the replay's int() coercion, and mark colours
were silently ignored.
"""

from app.exercises.robot_sim import RobotError, World, replay

LEVEL = {
    "grid_width": 3,
    "grid_height": 1,
    "start": {"x": 0, "y": 0, "facing": "right"},
    "cells": [
        {"x": 0, "y": 0, "type": "empty", "mark": True, "mark_color": "red"},
        {"x": 1, "y": 0, "type": "empty", "mark": True},  # colourless mark
        {"x": 2, "y": 0, "type": "goal"},
    ],
    "commands": ["move_forward", "paint"],
    "win": {"op": "and", "of": [{"cond": "at_goal"}, {"cond": "all_marks_painted"}]},
}


def test_right_colours_win():
    run = replay(LEVEL, [["paint", "red"], "move_forward", "paint", "move_forward"])
    assert run["won"] is True


def test_wrong_colour_on_coloured_mark_loses():
    run = replay(LEVEL, [["paint", "blue"], "move_forward", "paint", "move_forward"])
    assert run["won"] is False


def test_colourless_paint_does_not_satisfy_a_coloured_mark():
    run = replay(LEVEL, ["paint", "move_forward", "paint", "move_forward"])
    assert run["won"] is False


def test_any_colour_satisfies_a_colourless_mark():
    run = replay(LEVEL, [["paint", "red"], "move_forward", ["paint", "yellow"], "move_forward"])
    assert run["won"] is True


def test_repaint_is_a_no_op_in_any_colour():
    world = World(LEVEL)
    first = world.perform("paint", "red")
    assert first["cells"] and first["cells"][0]["color"] == "red"
    second = world.perform("paint", "blue")
    assert second["cells"] == []  # one-way: the cell keeps its first colour
    assert world.painted[(0, 0)] == "red"


def test_unknown_colour_is_a_robot_error():
    world = World(LEVEL)
    try:
        world.perform("paint", "magenta")
    except RobotError as e:
        assert e.key == "bad_color"
    else:
        raise AssertionError("expected RobotError")


def test_unknown_colour_in_replay_stops_as_error_not_500():
    run = replay(LEVEL, [["paint", "magenta"]])
    assert run["stopped"] == "error"
    assert run["won"] is False


def test_no_colour_level_grandfathered():
    plain = {
        **LEVEL,
        "cells": [
            {"x": 0, "y": 0, "type": "empty", "mark": True},
            {"x": 2, "y": 0, "type": "goal"},
        ],
    }
    run = replay(plain, ["paint", "move_forward", "move_forward"])
    assert run["won"] is True


def test_frames_carry_the_colour_for_the_browser():
    run = replay(LEVEL, [["paint", "red"]])
    changed = run["frames"][0]["cells"][0]
    assert changed["painted"] is True and changed["color"] == "red"

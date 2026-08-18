"""The win expression: every leaf, and the operators over them.

The teacher's free-text ``custom_win_js`` is gone — it was executable JavaScript
stored on the level and shipped to the pupil's browser, an answer key and an
execution surface at once. What replaces it is this vocabulary, joined by ``and``
/ ``or`` / ``not``, evaluated where the program ran and never sent as a verdict.

A malformed node raises rather than returning False. A win condition nobody can
satisfy because it was mistyped should stop the level being saved, not quietly
fail every pupil who tries it.
"""

import pytest

from app.exercises import robot_sim
from app.exercises.robot_sim import World

ALL = list(robot_sim.COMMANDS)


def level(cells: list[dict], win: dict, *, width: int = 3, height: int = 1) -> dict:
    return {
        "grid_width": width,
        "grid_height": height,
        "start": {"x": 0, "y": 0, "facing": "right"},
        "cells": cells,
        "commands": ALL,
        "win": win,
    }


def world_at(cells: list[dict], win: dict, moves: list[str] | None = None) -> World:
    w = World(level(cells, win))
    for name in moves or []:
        w.perform(name)
    return w


# ─── Every leaf ──────────────────────────────────────────────────────


def test_at_goal():
    goal = [{"x": 2, "y": 0, "type": "goal"}]
    assert world_at(goal, {"cond": "at_goal"}).evaluate() is False
    assert world_at(goal, {"cond": "at_goal"}, ["move_right"] * 2).evaluate() is True


def test_all_items_taken():
    items = [{"x": 0, "y": 0, "type": "item"}]
    assert world_at(items, {"cond": "all_items_taken"}).evaluate() is False
    assert world_at(items, {"cond": "all_items_taken"}, ["take"]).evaluate() is True


def test_all_items_taken_on_a_grid_with_no_items_is_vacuously_true():
    """Worth pinning: it is why FR-032 refuses the condition at save time,
    instead of letting the level pass itself."""
    assert world_at([], {"cond": "all_items_taken"}).evaluate() is True


def test_all_marks_painted():
    marks = [{"x": 0, "y": 0, "type": "empty", "mark": True}]
    assert world_at(marks, {"cond": "all_marks_painted"}).evaluate() is False
    assert world_at(marks, {"cond": "all_marks_painted"}, ["paint"]).evaluate() is True


def test_facing():
    up = {"cond": "facing", "dir": "up"}
    assert world_at([], up).evaluate() is False
    assert world_at([], up, ["turn_left"]).evaluate() is True


def test_steps_at_most():
    cheap = {"cond": "steps_at_most", "n": 2}
    assert world_at([], cheap, ["turn_left", "turn_right"]).evaluate() is True
    assert world_at([], cheap, ["turn_left"] * 3).evaluate() is False


def test_all_values_read():
    valued = [{"x": 0, "y": 0, "type": "empty", "value": 5}]
    assert world_at(valued, {"cond": "all_values_read"}).evaluate() is False
    assert world_at(valued, {"cond": "all_values_read"}, ["read"]).evaluate() is True


def test_values_total():
    valued = [
        {"x": 0, "y": 0, "type": "empty", "value": 3},
        {"x": 1, "y": 0, "type": "empty", "value": 4},
    ]
    assert world_at(valued, {"cond": "values_total", "n": 7}).evaluate() is True
    assert world_at(valued, {"cond": "values_total", "n": 8}).evaluate() is False


# ─── The operators ───────────────────────────────────────────────────


GOAL_AND_ITEM = [{"x": 2, "y": 0, "type": "goal"}, {"x": 0, "y": 0, "type": "item"}]

BOTH = {"op": "and", "of": [{"cond": "at_goal"}, {"cond": "all_items_taken"}]}

EITHER = {"op": "or", "of": [{"cond": "at_goal"}, {"cond": "all_items_taken"}]}


def test_and_needs_every_child():
    assert world_at(GOAL_AND_ITEM, BOTH, ["take"]).evaluate() is False
    assert world_at(GOAL_AND_ITEM, BOTH, ["move_right"] * 2).evaluate() is False

    done = world_at(GOAL_AND_ITEM, BOTH, ["take", "move_right", "move_right"])
    assert done.evaluate() is True


def test_or_needs_one_child():
    assert world_at(GOAL_AND_ITEM, EITHER).evaluate() is False
    assert world_at(GOAL_AND_ITEM, EITHER, ["take"]).evaluate() is True
    assert world_at(GOAL_AND_ITEM, EITHER, ["move_right"] * 2).evaluate() is True


def test_not_inverts_its_one_child():
    facing_down = {"op": "not", "of": [{"cond": "facing", "dir": "down"}]}
    assert world_at([], facing_down).evaluate() is True
    assert world_at([], facing_down, ["turn_right"]).evaluate() is False


def test_operators_nest():
    win = {
        "op": "and",
        "of": [
            {"cond": "at_goal"},
            {"op": "not", "of": [{"cond": "all_items_taken"}]},
        ],
    }
    left_the_item = world_at(GOAL_AND_ITEM, win, ["move_right"] * 2)
    assert left_the_item.evaluate() is True

    took_it_too = world_at(GOAL_AND_ITEM, win, ["take", "move_right", "move_right"])
    assert took_it_too.evaluate() is False


# ─── Malformed nodes raise ───────────────────────────────────────────


def test_not_with_two_children_raises():
    win = {"op": "not", "of": [{"cond": "at_goal"}, {"cond": "at_goal"}]}
    with pytest.raises(ValueError, match="exactly one"):
        world_at([], win).evaluate()


def test_not_with_no_children_raises():
    with pytest.raises(ValueError, match="exactly one"):
        world_at([], {"op": "not", "of": []}).evaluate()


def test_and_with_no_children_raises():
    with pytest.raises(ValueError, match="at least one"):
        world_at([], {"op": "and", "of": []}).evaluate()


def test_unknown_operator_raises():
    with pytest.raises(ValueError, match="unknown operator"):
        world_at([], {"op": "xor", "of": [{"cond": "at_goal"}]}).evaluate()


def test_unknown_condition_raises():
    with pytest.raises(ValueError, match="unknown condition"):
        world_at([], {"cond": "robot_is_happy"}).evaluate()


def test_a_missing_win_condition_is_never_a_win():
    w = World(
        {
            "grid_width": 2,
            "grid_height": 1,
            "start": {"x": 0, "y": 0, "facing": "right"},
            "cells": [],
            "commands": ALL,
        }
    )
    assert w.evaluate() is False

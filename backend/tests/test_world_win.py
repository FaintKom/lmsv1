"""The win vocabulary — every leaf, and the operators over them.

This is what replaces ``custom_win_js``: a level used to be able to carry
arbitrary JavaScript, stored on the level and shipped to the pupil's browser —
an answer key and an execution surface at once. A fixed vocabulary joined by
and/or/not covers what teachers actually asked for, and can carry no code.

Each leaf is tested both true and false. A condition that is always true is
indistinguishable from a working one until a pupil loses a level they solved.
"""

import pytest

from app.exercises import world_sim
from app.exercises.world_sim import World

ALL = list(world_sim.COMMANDS)


def world(cells: list[dict], win: dict, *, start: dict | None = None) -> World:
    return World(
        {
            "grid_width": 3,
            "grid_depth": 3,
            "start": start or {"x": 1, "z": 1, "y": 0, "facing": "north"},
            "cells": cells,
            "commands": ALL,
            "win": win,
            "max_steps": 100,
        }
    )


# ─── The leaves ──────────────────────────────────────────────────────


def test_at_goal():
    w = world([{"x": 1, "z": 0, "type": "goal"}], {"cond": "at_goal"})
    assert w.evaluate() is False
    w.perform("move_forward")
    assert w.evaluate() is True


def test_all_items_taken():
    w = world([{"x": 1, "z": 1, "type": "item"}], {"cond": "all_items_taken"})
    assert w.evaluate() is False
    w.perform("take")
    assert w.evaluate() is True


def test_all_items_taken_is_not_satisfied_by_carrying_one_in_circles():
    """FR-018 again, from the win side rather than the command side."""
    w = world(
        [{"x": 1, "z": 1, "type": "item"}, {"x": 1, "z": 0, "type": "item"}],
        {"cond": "all_items_taken"},
    )
    w.perform("take")
    w.perform("move_forward")
    w.perform("drop")
    assert w.evaluate() is False


def test_at_a_named_square():
    w = world([], {"cond": "at", "x": 1, "z": 0})
    assert w.evaluate() is False
    w.perform("move_forward")
    assert w.evaluate() is True


def test_height_at_least():
    # A platform on floor 0 stands one floor up, which is a walk. On floor 1 it
    # would stand two, walking would refuse it, and the character would never
    # leave the ground — so assert the move succeeded, not only the verdict.
    w = world(
        [{"x": 1, "z": 0, "y": 0, "type": "platform"}],
        {"cond": "height_at_least", "n": 1},
    )
    assert w.evaluate() is False
    assert w.perform("move_forward")["ok"] is True
    assert w.evaluate() is True


def test_steps_at_most():
    w = world([], {"cond": "steps_at_most", "n": 2})
    assert w.evaluate() is True
    w.perform("turn_right")
    w.perform("turn_right")
    assert w.evaluate() is True
    w.perform("turn_right")
    assert w.evaluate() is False


# ─── The operators ───────────────────────────────────────────────────


def test_and_needs_both():
    win = {"op": "and", "of": [{"cond": "at_goal"}, {"cond": "all_items_taken"}]}
    w = world([{"x": 1, "z": 0, "type": "goal"}, {"x": 1, "z": 0, "type": "item"}], win)
    w.perform("move_forward")
    assert w.evaluate() is False  # on the goal, item still there
    w.perform("take")
    assert w.evaluate() is True


def test_or_needs_either():
    win = {"op": "or", "of": [{"cond": "at_goal"}, {"cond": "all_items_taken"}]}
    w = world([{"x": 1, "z": 0, "type": "goal"}, {"x": 1, "z": 1, "type": "item"}], win)
    assert w.evaluate() is False
    w.perform("take")
    assert w.evaluate() is True


def test_not_inverts():
    w = world([{"x": 1, "z": 1, "type": "item"}], {"op": "not", "of": [{"cond": "at_goal"}]})
    assert w.evaluate() is True


def test_nesting_works_to_any_depth():
    win = {
        "op": "and",
        "of": [
            {"cond": "at_goal"},
            {"op": "not", "of": [{"op": "or", "of": [{"cond": "all_items_taken"}]}]},
        ],
    }
    w = world([{"x": 1, "z": 0, "type": "goal"}, {"x": 2, "z": 2, "type": "item"}], win)
    w.perform("move_forward")
    assert w.evaluate() is True


# ─── A mistyped condition is loud ────────────────────────────────────


def test_an_unknown_condition_raises_rather_than_losing_quietly():
    """A win nobody can satisfy must stop the level being saved, not every pupil."""
    w = world([], {"cond": "reach_the_moon"})
    with pytest.raises(ValueError):
        w.evaluate()


def test_an_unknown_operator_raises():
    w = world([], {"op": "xor", "of": [{"cond": "at_goal"}]})
    with pytest.raises(ValueError):
        w.evaluate()


def test_not_with_two_children_raises():
    w = world([], {"op": "not", "of": [{"cond": "at_goal"}, {"cond": "at_goal"}]})
    with pytest.raises(ValueError):
        w.evaluate()


def test_an_empty_win_is_never_won():
    w = world([], {})
    assert w.evaluate() is False

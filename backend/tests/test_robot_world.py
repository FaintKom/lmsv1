"""Items, paint and values — the three things a program changes about a grid.

Each of these guards a way a level could be gamed, or a child misled:

* An item counts as collected when it leaves the grid, so putting one down
  restores it. The old engine decremented a counter instead, which let a pupil
  satisfy "collect them all" by carrying one item in circles.
* Paint is one-way. A removable mark makes "paint every marked cell" satisfiable
  by covering a single cell over and over.
* ``read`` on a bare floor refuses instead of answering ``0``, because a zero is
  a number the child then reasons from.
"""

import pytest

from app.exercises import robot_sim
from app.exercises.robot_sim import RobotError, World

ALL = list(robot_sim.COMMANDS)


def room(cells: list[dict], *, width: int = 3, height: int = 3, win: dict | None = None) -> dict:
    return {
        "grid_width": width,
        "grid_height": height,
        "start": {"x": 1, "y": 1, "facing": "right"},
        "cells": cells,
        "commands": ALL,
        "win": win or {"cond": "at_goal"},
    }


def bind(level: dict) -> World:
    robot_sim.WORLD = World(level)
    return robot_sim.WORLD


# ─── Items ───────────────────────────────────────────────────────────


def test_take_lifts_the_item_off_the_grid():
    world = bind(room([{"x": 1, "y": 1, "type": "item"}]))
    frame = world.perform("take")

    assert world.carrying == 1
    assert world.items == set()
    assert frame["cells"] == [{"x": 1, "y": 1, "item": False}]


def test_drop_puts_it_back_on_the_grid_and_into_the_count():
    """The regression: collecting is about the grid, not about a counter."""
    level = room([{"x": 1, "y": 1, "type": "item"}], win={"cond": "all_items_taken"})
    world = bind(level)

    world.perform("take")
    assert world.evaluate() is True, "grid is empty — the item is collected"

    world.perform("drop")
    assert world.evaluate() is False, "putting it back un-collects it"
    assert world.items == {(1, 1)}
    assert world.carrying == 0


def test_carrying_one_item_in_circles_never_collects_two():
    level = room(
        [{"x": 1, "y": 1, "type": "item"}, {"x": 2, "y": 1, "type": "item"}],
        win={"cond": "all_items_taken"},
    )
    world = bind(level)

    for _ in range(10):
        world.perform("take")
        world.perform("drop")

    assert world.evaluate() is False
    assert len(world.items) == 2


def test_take_on_bare_floor_is_refused_and_still_costs_a_step():
    world = bind(room([]))
    frame = world.perform("take")

    assert frame["ok"] is False
    assert frame["msg"] == "no_item"
    assert world.steps == 1


def test_drop_with_empty_hands_is_refused():
    world = bind(room([]))
    assert world.perform("drop")["msg"] == "carrying_nothing"


def test_drop_onto_an_occupied_floor_is_refused():
    world = bind(room([{"x": 1, "y": 1, "type": "item"}, {"x": 2, "y": 1, "type": "item"}]))

    world.perform("take")  # carrying one, standing on bare floor
    world.perform("move_right")  # onto the second item
    frame = world.perform("drop")

    assert frame["msg"] == "floor_taken"
    assert world.carrying == 1


# ─── Paint ───────────────────────────────────────────────────────────


def test_painting_twice_counts_once_but_costs_twice():
    world = bind(room([{"x": 1, "y": 1, "type": "empty", "mark": True}]))

    world.perform("paint")
    world.perform("paint")

    assert world.painted == {(1, 1): None}
    assert world.steps == 2, "the second paint is wasted, not free"


def test_there_is_no_way_to_remove_paint():
    """FR-033. Its absence is what makes the paint goal ungameable."""
    assert "unpaint" not in robot_sim.COMMANDS
    assert not [c for c in robot_sim.COMMANDS if "unpaint" in c or "erase" in c]


def test_one_cell_painted_over_and_over_does_not_satisfy_two_marks():
    level = room(
        [
            {"x": 1, "y": 1, "type": "empty", "mark": True},
            {"x": 2, "y": 1, "type": "empty", "mark": True},
        ],
        win={"cond": "all_marks_painted"},
    )
    world = bind(level)

    for _ in range(5):
        world.perform("paint")

    assert world.evaluate() is False

    world.perform("move_right")
    world.perform("paint")
    assert world.evaluate() is True


def test_painting_an_unmarked_cell_is_allowed_and_changes_no_verdict():
    level = room(
        [{"x": 2, "y": 1, "type": "empty", "mark": True}],
        win={"cond": "all_marks_painted"},
    )
    world = bind(level)

    world.perform("paint")  # (1,1), which nobody marked
    assert world.evaluate() is False


def test_the_painted_sensor_reads_the_floor_underfoot():
    world = bind(room([]))
    assert world.sense("painted") is False
    world.perform("paint")
    assert world.sense("painted") is True


# ─── Values ──────────────────────────────────────────────────────────


def test_read_returns_the_number_on_the_floor():
    bind(room([{"x": 1, "y": 1, "type": "empty", "value": 7}]))
    assert robot_sim.read() == 7


def test_read_on_a_bare_floor_refuses_rather_than_answering_zero():
    """FR-034. A zero is a number the child reasons from, and the mistake then
    surfaces three lines later as a wrong answer instead of here."""
    world = bind(room([]))

    with pytest.raises(RobotError) as caught:
        world.perform("read")
    assert caught.value.key == "no_value"


def test_reading_marks_the_cell_read():
    level = room([{"x": 1, "y": 1, "type": "empty", "value": 4}], win={"cond": "all_values_read"})
    world = bind(level)

    assert world.evaluate() is False
    world.perform("read")
    assert world.evaluate() is True


def test_all_values_read_needs_every_valued_cell():
    level = room(
        [
            {"x": 1, "y": 1, "type": "empty", "value": 4},
            {"x": 2, "y": 1, "type": "empty", "value": 5},
        ],
        win={"cond": "all_values_read"},
    )
    world = bind(level)

    world.perform("read")
    assert world.evaluate() is False

    world.perform("move_right")
    world.perform("read")
    assert world.evaluate() is True


def test_write_changes_the_number_and_the_total():
    level = room(
        [
            {"x": 1, "y": 1, "type": "empty", "value": 1},
            {"x": 2, "y": 1, "type": "empty", "value": 2},
        ],
        win={"cond": "values_total", "n": 10},
    )
    world = bind(level)

    assert world.evaluate() is False
    world.perform("write", 8)
    assert world.evaluate() is True, "1 → 8, plus the 2 next door"


def test_write_on_a_floor_that_carries_no_number_refuses():
    world = bind(room([]))

    with pytest.raises(RobotError) as caught:
        world.perform("write", 3)
    assert caught.value.key == "no_value"


def test_the_value_sensor_says_whether_reading_would_work():
    world = bind(room([{"x": 2, "y": 1, "type": "empty", "value": 9}]))

    assert world.sense("value_here") is False
    world.perform("move_right")
    assert world.sense("value_here") is True


def test_replay_carries_the_written_value():
    """A command name alone does not determine what ``write`` did, so the
    recorded list pairs it with its argument."""
    level = room(
        [{"x": 1, "y": 1, "type": "empty", "value": 1}],
        win={"cond": "values_total", "n": 6},
    )

    assert robot_sim.replay(level, [["write", 6]])["won"] is True
    assert robot_sim.replay(level, [["write", 5]])["won"] is False

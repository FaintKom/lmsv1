"""The World 3D vocabulary — one test per command, including every refusal.

The 3D twin of ``test_robot_sim.py``. What is guarded here:

* Every name in the contract exists and is reachable, so the palette cannot
  offer a command the engine does not understand. That was defect 1: over half
  the block palette did nothing.
* Every refusal produces a frame, spends a step, and names itself. A wall that
  costs nothing teaches a child that bumping into things is free.
* A command the level withholds stops the run rather than being ignored.
"""

import pytest

from app.exercises import world_sim
from app.exercises.world_sim import World, WorldError

ALL = list(world_sim.COMMANDS)


def level(
    cells: list[dict] | None = None,
    *,
    width: int = 3,
    depth: int = 3,
    start: dict | None = None,
    commands: list[str] | None = None,
    win: dict | None = None,
    max_steps: int = 100,
) -> dict:
    return {
        "grid_width": width,
        "grid_depth": depth,
        "start": start or {"x": 1, "z": 1, "y": 0, "facing": "north"},
        "cells": cells or [],
        "commands": ALL if commands is None else commands,
        "win": win or {"cond": "at_goal"},
        "max_steps": max_steps,
    }


# ─── Every command is reachable ──────────────────────────────────────


def test_every_command_in_the_contract_is_understood():
    """The palette and the engine agree, or a child drags a block that does nothing."""
    world = World(level([{"x": 1, "z": 1, "type": "item"}]))
    for name in world_sim.ACTIONS:
        world.perform(name)
    for name in world_sim.SENSORS:
        assert isinstance(world.sense(name), bool)


def test_an_unknown_name_is_refused():
    world = World(level())
    with pytest.raises(WorldError) as caught:
        world.perform("teleport")
    assert caught.value.key == "not_offered"


def test_a_command_the_level_withholds_is_refused_and_an_offered_one_is_not():
    """The control matters: a world refusing everything would pass the first half alone."""
    world = World(level(commands=["move_forward", "at_goal"]))
    with pytest.raises(WorldError) as caught:
        world.perform("jump")
    assert caught.value.key == "not_offered"

    world.perform("move_forward")  # offered, so it must go through


# ─── Movement, and what refuses it ───────────────────────────────────


def test_walking_moves_one_square_the_way_it_faces():
    world = World(level(start={"x": 1, "z": 2, "facing": "north"}))
    world.perform("move_forward")
    assert (world.x, world.z) == (1, 1)


def test_walking_off_the_grid_is_refused_and_still_costs_a_step():
    world = World(level(start={"x": 1, "z": 0, "facing": "north"}))
    frame = world.perform("move_forward")
    assert frame["ok"] is False
    assert frame["msg"] == "edge"
    assert (world.x, world.z) == (1, 0)
    assert world.steps == 1


def test_a_wall_refuses_the_move_and_names_itself():
    world = World(
        level(
            [{"x": 1, "z": 0, "y": 0, "type": "wall"}],
            start={"x": 1, "z": 1, "facing": "north"},
        )
    )
    frame = world.perform("move_forward")
    assert frame["msg"] == "wall"
    assert (world.x, world.z) == (1, 1)


def test_turning_costs_a_step_and_never_refuses():
    world = World(level())
    assert world.facing == "north"
    world.perform("turn_right")
    assert world.facing == "east"
    world.perform("turn_left")
    world.perform("turn_left")
    assert world.facing == "west"
    assert world.steps == 3


# ─── Items ───────────────────────────────────────────────────────────


def test_taking_removes_the_item_from_the_grid():
    world = World(level([{"x": 1, "z": 1, "type": "item"}]))
    assert world.sense("item_here") is True
    world.perform("take")
    assert world.items == set()
    assert world.carrying == 1


def test_taking_nothing_is_refused():
    world = World(level())
    frame = world.perform("take")
    assert frame["msg"] == "nothing_here"


def test_dropping_with_empty_hands_is_refused():
    world = World(level())
    frame = world.perform("drop")
    assert frame["msg"] == "hands_empty"


def test_take_then_drop_leaves_the_grid_as_it_was():
    """FR-018. A counter would let one item satisfy "collect them all"."""
    world = World(level([{"x": 1, "z": 1, "type": "item"}]))
    before = set(world.items)
    world.perform("take")
    world.perform("drop")
    assert world.items == before
    assert world.carrying == 0


def test_dropping_onto_an_occupied_square_is_refused():
    world = World(
        level(
            [
                {"x": 1, "z": 1, "type": "item"},
                {"x": 1, "z": 0, "type": "item"},
            ],
            start={"x": 1, "z": 0, "facing": "north"},
        )
    )
    world.perform("take")  # carrying now, and (1, 0) is clear
    world.perform("turn_left")
    world.perform("turn_left")
    world.perform("move_forward")  # onto (1, 1), which still holds an item
    frame = world.perform("drop")
    assert frame["msg"] == "square_taken"


# ─── Sensors ─────────────────────────────────────────────────────────


def test_sensors_cost_no_step_and_record_no_frame():
    world = World(level())
    for name in world_sim.SENSORS:
        world.sense(name)
    assert world.steps == 0
    assert world.frames == []


def test_wall_ahead_is_true_at_the_edge_and_false_in_the_open():
    world = World(level(start={"x": 1, "z": 0, "facing": "north"}))
    assert world.sense("wall_ahead") is True
    world.perform("turn_right")
    world.perform("turn_right")
    assert world.sense("wall_ahead") is False


def test_at_goal_is_true_only_on_the_goal():
    world = World(
        level([{"x": 1, "z": 0, "type": "goal"}], start={"x": 1, "z": 1, "facing": "north"})
    )
    assert world.sense("at_goal") is False
    world.perform("move_forward")
    assert world.sense("at_goal") is True


# ─── The allowance ───────────────────────────────────────────────────


def test_the_step_allowance_ends_a_runaway_program():
    world = World(level(max_steps=3))
    for _ in range(3):
        world.perform("turn_right")
    with pytest.raises(world_sim.StepsExhaustedError):
        world.perform("turn_right")


def test_a_refused_move_still_spends_its_step():
    world = World(level(start={"x": 0, "z": 0, "facing": "north"}, max_steps=2))
    world.perform("move_forward")  # refused: edge
    world.perform("move_forward")  # refused: edge
    with pytest.raises(world_sim.StepsExhaustedError):
        world.perform("move_forward")

"""Height — the one thing 3D has that 2D does not.

Walking climbs one level, jumping two, and falling has no limit. Every test here
pairs a refusal with the case just inside the limit, because "it refused" is
equally true of an engine that refuses everything.

The recorded ``motion`` matters as much as the position: the scene animates a
climb, a jump and a fall differently, and working out which happened by
comparing coordinates is exactly the guesswork this field removes.
"""

from app.exercises import world_sim
from app.exercises.world_sim import World

ALL = list(world_sim.COMMANDS)


def level(cells: list[dict], *, start: dict, width: int = 3, depth: int = 3) -> dict:
    return {
        "grid_width": width,
        "grid_depth": depth,
        "start": start,
        "cells": cells,
        "commands": ALL,
        "win": {"cond": "at_goal"},
        "max_steps": 100,
    }


def platform(x: int, z: int, y: int) -> dict:
    return {"x": x, "z": z, "y": y, "type": "platform"}


# ─── Walking climbs one ──────────────────────────────────────────────


def test_walking_up_one_level_succeeds():
    world = World(level([platform(1, 0, 1)], start={"x": 1, "z": 1, "y": 0, "facing": "north"}))
    frame = world.perform("move_forward")
    assert frame["ok"] is True
    assert (world.x, world.z, world.y) == (1, 0, 1)
    assert frame["motion"] == "climb"


def test_walking_up_two_levels_is_refused():
    """The pair to the test above: one is allowed, two is not."""
    world = World(level([platform(1, 0, 2)], start={"x": 1, "z": 1, "y": 0, "facing": "north"}))
    frame = world.perform("move_forward")
    assert frame["ok"] is False
    assert frame["msg"] == "too_high"
    assert (world.x, world.z, world.y) == (1, 1, 0)


# ─── Jumping climbs two ──────────────────────────────────────────────


def test_jumping_up_two_levels_succeeds_where_walking_would_not():
    cells = [platform(1, 0, 2)]
    start = {"x": 1, "z": 1, "y": 0, "facing": "north"}

    walked = World(level(cells, start=start))
    assert walked.perform("move_forward")["msg"] == "too_high"

    jumped = World(level(cells, start=start))
    frame = jumped.perform("jump")
    assert frame["ok"] is True
    assert (jumped.x, jumped.z, jumped.y) == (1, 0, 2)
    assert frame["motion"] == "jump"


def test_jumping_up_three_levels_is_refused():
    world = World(level([platform(1, 0, 3)], start={"x": 1, "z": 1, "y": 0, "facing": "north"}))
    frame = world.perform("jump")
    assert frame["ok"] is False
    assert frame["msg"] == "too_high"


def test_a_jump_does_not_pass_through_a_wall():
    """A jump crosses one square, so there is nothing to clear (FR-015)."""
    world = World(
        level(
            [{"x": 1, "z": 0, "y": 0, "type": "wall"}],
            start={"x": 1, "z": 1, "y": 0, "facing": "north"},
        )
    )
    assert world.perform("jump")["msg"] == "wall"


# ─── Falling has no limit ────────────────────────────────────────────


def test_walking_off_a_ledge_falls_and_records_it():
    world = World(level([platform(1, 1, 3)], start={"x": 1, "z": 1, "y": 3, "facing": "north"}))
    frame = world.perform("move_forward")
    assert frame["ok"] is True
    assert (world.x, world.z, world.y) == (1, 0, 0)
    assert frame["motion"] == "fall"


def test_walking_along_the_flat_is_neither_a_climb_nor_a_fall():
    world = World(level([], start={"x": 1, "z": 1, "y": 0, "facing": "north"}))
    assert world.perform("move_forward")["motion"] == "walk"


def test_a_wall_blocks_from_the_height_it_stands_at():
    world = World(
        level(
            [{"x": 1, "z": 0, "y": 0, "type": "wall"}, platform(1, 1, 1)],
            start={"x": 1, "z": 1, "y": 1, "facing": "north"},
        )
    )
    assert world.perform("move_forward")["msg"] == "wall"


# ─── The sensors that read height ────────────────────────────────────


def test_gap_ahead_sees_a_drop_and_nothing_else():
    high = World(level([platform(1, 1, 2)], start={"x": 1, "z": 1, "y": 2, "facing": "north"}))
    assert high.sense("gap_ahead") is True

    flat = World(level([], start={"x": 1, "z": 1, "y": 0, "facing": "north"}))
    assert flat.sense("gap_ahead") is False


def test_step_ahead_sees_exactly_one_level_up():
    one = World(level([platform(1, 0, 1)], start={"x": 1, "z": 1, "y": 0, "facing": "north"}))
    assert one.sense("step_ahead") is True

    two = World(level([platform(1, 0, 2)], start={"x": 1, "z": 1, "y": 0, "facing": "north"}))
    assert two.sense("step_ahead") is False


def test_the_start_stands_on_its_platform_when_no_height_is_given():
    world = World(level([platform(1, 1, 2)], start={"x": 1, "z": 1, "facing": "north"}))
    assert world.y == 2

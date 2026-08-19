"""Height — the one thing 3D has that 2D does not.

A block recorded at floor ``N`` occupies floor ``N``, wall and platform alike,
and a character standing on a platform at floor ``N`` stands at ``N + 1``. That
one sentence is `specs/013-world-3d-climb/contracts/height.md`, and most of this
file is that sentence, checked.

Walking climbs one floor, jumping two, and falling has no limit. Every test here
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
    """A platform occupying floor ``y``. Standing on it means standing at y + 1."""
    return {"x": x, "z": z, "y": y, "type": "platform"}


def wall(x: int, z: int, y: int) -> dict:
    return {"x": x, "z": z, "y": y, "type": "wall"}


# ─── What a floor means ──────────────────────────────────────────────


def test_a_square_with_no_platform_has_the_ground_for_a_surface():
    world = World(level([], start={"x": 1, "z": 1, "y": 0, "facing": "north"}))
    assert world.surface(1, 0) == 0


def test_a_platform_raises_the_surface_to_one_above_its_own_floor():
    world = World(level([platform(1, 0, 0)], start={"x": 1, "z": 1, "y": 0, "facing": "north"}))
    assert world.surface(1, 0) == 1


def test_platforms_stack():
    cells = [platform(1, 0, 0), platform(1, 0, 1)]
    world = World(level(cells, start={"x": 1, "z": 1, "y": 0, "facing": "north"}))
    assert world.surface(1, 0) == 2


def test_a_platform_with_nothing_beneath_it_is_still_stood_upon():
    """A floating slab is a legal level; nothing requires a stack to be solid."""
    world = World(level([platform(1, 0, 3)], start={"x": 1, "z": 1, "y": 0, "facing": "north"}))
    assert world.surface(1, 0) == 4


# ─── Walking climbs one ──────────────────────────────────────────────


def test_a_platform_on_the_ground_floor_is_a_step():
    """The fault this feature came from: the teacher's first click did nothing.

    The bare square beside it is the control. Without it this test would pass
    against an engine that put the character at height 1 wherever it walked.
    """
    cells = [platform(1, 0, 0)]

    onto = World(level(cells, start={"x": 1, "z": 1, "y": 0, "facing": "north"}))
    frame = onto.perform("move_forward")
    assert frame["ok"] is True
    assert (onto.x, onto.z, onto.y) == (1, 0, 1)
    assert frame["motion"] == "climb"

    beside = World(level(cells, start={"x": 0, "z": 1, "y": 0, "facing": "north"}))
    flat = beside.perform("move_forward")
    assert flat["ok"] is True
    assert (beside.x, beside.z, beside.y) == (0, 0, 0)
    assert flat["motion"] == "walk"


def test_walking_up_one_level_succeeds():
    world = World(level([platform(1, 0, 0)], start={"x": 1, "z": 1, "y": 0, "facing": "north"}))
    frame = world.perform("move_forward")
    assert frame["ok"] is True
    assert (world.x, world.z, world.y) == (1, 0, 1)
    assert frame["motion"] == "climb"


def test_walking_up_two_levels_is_refused():
    """The pair to the test above: one is allowed, two is not."""
    world = World(level([platform(1, 0, 1)], start={"x": 1, "z": 1, "y": 0, "facing": "north"}))
    frame = world.perform("move_forward")
    assert frame["ok"] is False
    assert frame["msg"] == "too_high"
    assert (world.x, world.z, world.y) == (1, 1, 0)


def test_too_high_is_reported_only_when_the_step_is_too_high():
    """The control for the refusal code itself, in the same test.

    One floor lower and the same walk succeeds with no refusal at all, so
    ``too_high`` cannot be an engine's answer to everything.
    """
    start = {"x": 1, "z": 1, "y": 0, "facing": "north"}

    too_far = World(level([platform(1, 0, 1)], start=start))
    assert too_far.perform("move_forward")["msg"] == "too_high"

    reachable = World(level([platform(1, 0, 0)], start=start))
    frame = reachable.perform("move_forward")
    assert frame["ok"] is True
    assert frame.get("msg") in (None, "")


def test_a_refused_movement_changes_nothing():
    """Square, height and facing all stay put — and all three move when allowed."""
    start = {"x": 1, "z": 1, "y": 0, "facing": "north"}

    refused = World(level([platform(1, 0, 1)], start=start))
    before = (refused.x, refused.z, refused.y, refused.facing)
    assert refused.perform("move_forward")["ok"] is False
    assert (refused.x, refused.z, refused.y, refused.facing) == before

    allowed = World(level([platform(1, 0, 0)], start=start))
    allowed.perform("turn_left")
    assert allowed.facing != "north"
    allowed.perform("turn_right")
    assert allowed.perform("move_forward")["ok"] is True
    assert (allowed.x, allowed.z, allowed.y) != (1, 1, 0)


# ─── Jumping climbs two ──────────────────────────────────────────────


def test_jumping_up_two_levels_succeeds_where_walking_would_not():
    cells = [platform(1, 0, 1)]
    start = {"x": 1, "z": 1, "y": 0, "facing": "north"}

    walked = World(level(cells, start=start))
    assert walked.perform("move_forward")["msg"] == "too_high"

    jumped = World(level(cells, start=start))
    frame = jumped.perform("jump")
    assert frame["ok"] is True
    assert (jumped.x, jumped.z, jumped.y) == (1, 0, 2)
    assert frame["motion"] == "jump"


def test_jumping_up_three_levels_is_refused():
    world = World(level([platform(1, 0, 2)], start={"x": 1, "z": 1, "y": 0, "facing": "north"}))
    frame = world.perform("jump")
    assert frame["ok"] is False
    assert frame["msg"] == "too_high"


def test_a_jump_does_not_pass_through_a_wall():
    """A jump crosses one square, so there is nothing to clear (FR-015)."""
    world = World(level([wall(1, 0, 0)], start={"x": 1, "z": 1, "y": 0, "facing": "north"}))
    assert world.perform("jump")["msg"] == "wall"


# ─── Falling has no limit ────────────────────────────────────────────


def test_walking_off_a_ledge_falls_and_records_it():
    world = World(level([platform(1, 1, 2)], start={"x": 1, "z": 1, "y": 3, "facing": "north"}))
    frame = world.perform("move_forward")
    assert frame["ok"] is True
    assert (world.x, world.z, world.y) == (1, 0, 0)
    assert frame["motion"] == "fall"


def test_walking_along_the_flat_is_neither_a_climb_nor_a_fall():
    world = World(level([], start={"x": 1, "z": 1, "y": 0, "facing": "north"}))
    assert world.perform("move_forward")["motion"] == "walk"


# ─── A wall is not a floor ───────────────────────────────────────────


def test_a_wall_blocks_from_the_height_it_stands_at():
    world = World(
        level([wall(1, 0, 0), platform(1, 1, 0)], start={"x": 1, "z": 1, "y": 1, "facing": "north"})
    )
    assert world.perform("move_forward")["msg"] == "wall"


def test_a_wall_and_a_platform_on_one_floor_are_the_same_height():
    """The wall still blocks a character standing level with its top.

    The bare square on the other side is the control: the same character at the
    same height walks there without complaint, so this is a fact about walls and
    not about being high up.
    """
    cells = [wall(1, 0, 0), platform(1, 1, 0)]
    start = {"x": 1, "z": 1, "y": 1, "facing": "north"}

    world = World(level(cells, start=start))
    assert world.surface(1, 0) == 0  # a wall contributes nothing to a surface
    assert world.perform("move_forward")["msg"] == "wall"

    world.perform("turn_right")
    stepped = world.perform("move_forward")
    assert stepped["ok"] is True
    assert (world.x, world.z, world.y) == (2, 1, 0)


# ─── The sensors that read height ────────────────────────────────────


def test_gap_ahead_sees_a_drop_and_nothing_else():
    high = World(level([platform(1, 1, 1)], start={"x": 1, "z": 1, "y": 2, "facing": "north"}))
    assert high.sense("gap_ahead") is True

    flat = World(level([], start={"x": 1, "z": 1, "y": 0, "facing": "north"}))
    assert flat.sense("gap_ahead") is False


def test_step_ahead_sees_exactly_one_level_up():
    one = World(level([platform(1, 0, 0)], start={"x": 1, "z": 1, "y": 0, "facing": "north"}))
    assert one.sense("step_ahead") is True

    two = World(level([platform(1, 0, 1)], start={"x": 1, "z": 1, "y": 0, "facing": "north"}))
    assert two.sense("step_ahead") is False


def test_the_start_stands_on_its_platform_when_no_height_is_given():
    world = World(level([platform(1, 1, 2)], start={"x": 1, "z": 1, "facing": "north"}))
    assert world.y == 3

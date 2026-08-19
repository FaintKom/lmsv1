"""Buttons and doors — and the ways they used to be unreasonable.

The engine this replaces *toggled* a button while opening its door, so pressing
twice left a pressed button beside an open door: a state no teacher could reason
about, and a level that worked only as long as the child did not experiment.

What is guarded here:

* ``press()`` opens the door its button names, and **no other door**.
* Opening is one-way. Pressing again changes nothing and still costs the step.
* A closed door refuses movement; an opened one does not, for the rest of the
  run.
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


def button_and_door() -> list[dict]:
    """A button at (1,1) opening the door at (1,0)."""
    return [
        {"x": 1, "z": 1, "type": "button", "opens": "gate"},
        {"x": 1, "z": 0, "type": "door", "id": "gate"},
    ]


# ─── A closed door is a wall ─────────────────────────────────────────


def test_a_closed_door_refuses_the_move():
    world = World(
        level(
            [{"x": 1, "z": 0, "type": "door", "id": "gate"}],
            start={"x": 1, "z": 1, "facing": "north"},
        )
    )
    frame = world.perform("move_forward")
    assert frame["ok"] is False
    assert frame["msg"] == "door_closed"


def test_an_opened_door_lets_the_character_through():
    """The control for the test above — a door that never opens would pass both."""
    world = World(
        level(
            [
                {"x": 1, "z": 2, "type": "button", "opens": "gate"},
                {"x": 1, "z": 0, "type": "door", "id": "gate"},
            ],
            start={"x": 1, "z": 1, "facing": "south"},
        )
    )
    world.perform("press")  # the button is at (1,2), directly ahead
    assert "gate" in world.opened

    world.perform("turn_left")
    world.perform("turn_left")
    frame = world.perform("move_forward")
    assert frame["ok"] is True
    assert (world.x, world.z) == (1, 0)


# ─── press() is precise ──────────────────────────────────────────────


def test_press_opens_only_the_door_its_button_names():
    world = World(
        level(
            [
                {"x": 1, "z": 0, "type": "button", "opens": "left"},
                {"x": 0, "z": 0, "type": "door", "id": "left"},
                {"x": 2, "z": 0, "type": "door", "id": "right"},
            ],
            start={"x": 1, "z": 1, "facing": "north"},
        )
    )
    world.perform("press")
    assert world.opened == {"left"}


def test_press_with_nothing_in_front_does_nothing_and_still_costs_a_step():
    world = World(level([], start={"x": 1, "z": 1, "facing": "north"}))
    frame = world.perform("press")
    assert frame["ok"] is True
    assert world.steps == 1
    assert world.opened == set()


def test_pressing_twice_leaves_the_door_open():
    """One-way, or a level breaks the moment a child presses again to see."""
    world = World(level(button_and_door(), start={"x": 1, "z": 2, "facing": "north"}))
    world.perform("press")
    assert world.opened == {"gate"}
    world.perform("press")
    assert world.opened == {"gate"}
    assert world.steps == 2


def test_a_door_stays_open_for_the_rest_of_the_run():
    world = World(level(button_and_door(), start={"x": 1, "z": 2, "facing": "north"}))
    world.perform("press")
    for _ in range(10):
        world.perform("turn_right")
    assert "gate" in world.opened


def test_a_button_naming_a_door_that_does_not_exist_opens_nothing():
    world = World(
        level(
            [{"x": 1, "z": 0, "type": "button", "opens": "missing"}],
            start={"x": 1, "z": 1, "facing": "north"},
        )
    )
    world.perform("press")
    assert world.opened == set()
    assert (1, 0) in world.pressed


# ─── What the sensors say ────────────────────────────────────────────


def test_button_ahead_is_true_until_it_is_pressed():
    world = World(level(button_and_door(), start={"x": 1, "z": 2, "facing": "north"}))
    assert world.sense("button_ahead") is True
    world.perform("press")
    assert world.sense("button_ahead") is False


def test_door_ahead_is_true_while_closed_and_false_once_open():
    cells = [
        {"x": 0, "z": 0, "type": "button", "opens": "gate"},
        {"x": 1, "z": 0, "type": "door", "id": "gate"},
    ]
    world = World(level(cells, start={"x": 1, "z": 1, "facing": "north"}))
    assert world.sense("door_ahead") is True

    # Walk round to the button at (0,0), press it, and come back facing the door.
    world.perform("turn_left")
    world.perform("move_forward")  # (0,1)
    assert world.sense("door_ahead") is False
    world.perform("turn_right")
    world.perform("press")  # button at (0,0) is ahead
    assert "gate" in world.opened

    world.perform("turn_right")
    world.perform("move_forward")  # (1,1)
    world.perform("turn_left")
    assert world.sense("door_ahead") is False


# ─── Winning on buttons and doors ────────────────────────────────────


def test_all_buttons_pressed_needs_every_button():
    world = World(
        {
            "grid_width": 3,
            "grid_depth": 3,
            "start": {"x": 1, "z": 1, "facing": "north"},
            "cells": [
                {"x": 1, "z": 0, "type": "button", "opens": "a"},
                {"x": 0, "z": 1, "type": "button", "opens": "b"},
                {"x": 2, "z": 2, "type": "door", "id": "a"},
                {"x": 0, "z": 2, "type": "door", "id": "b"},
            ],
            "commands": ALL,
            "win": {"cond": "all_buttons_pressed"},
            "max_steps": 100,
        }
    )
    world.perform("press")
    assert world.evaluate() is False
    world.perform("turn_left")
    world.perform("press")
    assert world.evaluate() is True


def test_all_doors_open_needs_every_door():
    world = World(
        {
            "grid_width": 3,
            "grid_depth": 3,
            "start": {"x": 1, "z": 1, "facing": "north"},
            "cells": [
                {"x": 1, "z": 0, "type": "button", "opens": "a"},
                {"x": 2, "z": 2, "type": "door", "id": "a"},
                {"x": 0, "z": 2, "type": "door", "id": "b"},
            ],
            "commands": ALL,
            "win": {"cond": "all_doors_open"},
            "max_steps": 100,
        }
    )
    world.perform("press")
    assert world.opened == {"a"}
    assert world.evaluate() is False  # "b" has no button, so it can never open

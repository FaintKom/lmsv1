"""Every fault in a level, named, and all of them at once.

Two properties matter more than the individual codes:

* **A sound level reports nothing.** Without that control, a validator that
  returned every code for every level would pass each of the tests below.
* **Faults arrive together.** A teacher who fixes a level three times because
  each save reveals the next problem learns to dread the button.
"""

from app.exercises import world_sim, world_validate

ALL = list(world_sim.COMMANDS)


def level(**overrides) -> dict:
    base = {
        "grid_width": 3,
        "grid_depth": 3,
        "start": {"x": 0, "z": 2, "y": 0, "facing": "north"},
        "cells": [{"x": 2, "z": 0, "type": "goal"}],
        "commands": ALL,
        "win": {"cond": "at_goal"},
        "max_steps": 100,
    }
    base.update(overrides)
    return base


def codes(result: list[dict]) -> set[str]:
    return {b["code"] for b in result}


# ─── The control ─────────────────────────────────────────────────────


def test_a_sound_level_reports_nothing():
    assert world_validate.check(level()) == []


# ─── The start ───────────────────────────────────────────────────────


def test_a_start_outside_the_grid():
    assert "start_off_grid" in codes(world_validate.check(level(start={"x": 9, "z": 0})))


def test_a_start_inside_a_wall():
    faulty = level(
        cells=[{"x": 2, "z": 0, "type": "goal"}, {"x": 0, "z": 2, "y": 0, "type": "wall"}]
    )
    assert "start_on_wall" in codes(world_validate.check(faulty))


def test_a_start_inside_a_door():
    faulty = level(
        cells=[
            {"x": 2, "z": 0, "type": "goal"},
            {"x": 0, "z": 2, "type": "door", "id": "gate"},
            {"x": 1, "z": 1, "type": "button", "opens": "gate"},
        ]
    )
    assert "start_in_door" in codes(world_validate.check(faulty))


# ─── The goal ────────────────────────────────────────────────────────


def test_a_win_that_needs_a_goal_and_a_level_with_none():
    assert "no_goal" in codes(world_validate.check(level(cells=[])))


def test_two_goals():
    faulty = level(cells=[{"x": 2, "z": 0, "type": "goal"}, {"x": 1, "z": 0, "type": "goal"}])
    assert "two_goals" in codes(world_validate.check(faulty))


def test_a_goal_buried_under_a_platform():
    """Any platform on the goal's square buries it, floor 0 included.

    Floor 0 is where the editor opens, so it is the case a teacher reaches
    first. It used to be the one that slipped through, back when a platform
    there changed nothing.
    """
    for floor in (0, 1):
        faulty = level(
            cells=[
                {"x": 2, "z": 0, "type": "goal"},
                {"x": 2, "z": 0, "y": floor, "type": "platform"},
            ]
        )
        assert "goal_under_platform" in codes(world_validate.check(faulty)), floor

    # The control: the same platform one square over leaves the goal reachable.
    sound = level(
        cells=[
            {"x": 2, "z": 0, "type": "goal"},
            {"x": 1, "z": 0, "y": 0, "type": "platform"},
        ]
    )
    assert "goal_under_platform" not in codes(world_validate.check(sound))


# ─── Items ───────────────────────────────────────────────────────────


def test_an_item_where_nothing_can_stand():
    faulty = level(
        cells=[
            {"x": 2, "z": 0, "type": "goal"},
            {"x": 1, "z": 1, "y": 0, "type": "wall"},
            {"x": 1, "z": 1, "type": "item"},
        ]
    )
    assert "item_on_wall" in codes(world_validate.check(faulty))


def test_two_items_on_one_square():
    faulty = level(
        cells=[
            {"x": 2, "z": 0, "type": "goal"},
            {"x": 1, "z": 1, "type": "item"},
            {"x": 1, "z": 1, "type": "item"},
        ]
    )
    assert "two_items_on_square" in codes(world_validate.check(faulty))


# ─── Buttons and doors ───────────────────────────────────────────────


def test_a_button_naming_a_door_that_does_not_exist():
    faulty = level(
        cells=[{"x": 2, "z": 0, "type": "goal"}, {"x": 1, "z": 1, "type": "button", "opens": "no"}]
    )
    assert "button_without_door" in codes(world_validate.check(faulty))


def test_a_button_naming_nothing_at_all():
    """The defect this replaces: the door id was free text, so a typo was silent."""
    faulty = level(cells=[{"x": 2, "z": 0, "type": "goal"}, {"x": 1, "z": 1, "type": "button"}])
    assert "button_without_door" in codes(world_validate.check(faulty))


def test_a_door_no_button_opens():
    faulty = level(
        cells=[{"x": 2, "z": 0, "type": "goal"}, {"x": 1, "z": 1, "type": "door", "id": "gate"}]
    )
    assert "door_without_button" in codes(world_validate.check(faulty))


def test_a_matched_button_and_door_report_nothing():
    sound = level(
        cells=[
            {"x": 2, "z": 0, "type": "goal"},
            {"x": 1, "z": 1, "type": "door", "id": "gate"},
            {"x": 0, "z": 1, "type": "button", "opens": "gate"},
        ]
    )
    assert world_validate.check(sound) == []


# ─── What the win condition asks for ─────────────────────────────────


def test_a_win_asking_for_items_in_a_level_with_none():
    assert "win_needs_items_but_none" in codes(
        world_validate.check(level(win={"cond": "all_items_taken"}))
    )


def test_a_win_asking_for_buttons_in_a_level_with_none():
    assert "win_needs_buttons_but_none" in codes(
        world_validate.check(level(win={"cond": "all_buttons_pressed"}))
    )


def test_a_nested_win_is_searched_to_any_depth():
    faulty = level(win={"op": "and", "of": [{"cond": "at_goal"}, {"cond": "all_items_taken"}]})
    assert "win_needs_items_but_none" in codes(world_validate.check(faulty))


# ─── The vocabulary ──────────────────────────────────────────────────


def test_a_level_offering_nothing_to_write():
    assert "no_commands" in codes(world_validate.check(level(commands=[])))


def test_a_sensor_with_nothing_to_guard():
    result = world_validate.check(level(commands=["wall_ahead", "at_goal"]))
    assert "sensor_without_use" in codes(result)
    named = next(b for b in result if b["code"] == "sensor_without_use")
    assert named["commands"] == ["at_goal", "wall_ahead"]


def test_a_command_the_engine_does_not_understand():
    result = world_validate.check(level(commands=["move_forward", "teleport", "at_goal"]))
    assert "unknown_command" in codes(result)
    assert next(b for b in result if b["code"] == "unknown_command")["commands"] == ["teleport"]


# ─── All of them, at once ────────────────────────────────────────────


def test_every_fault_is_reported_together():
    faulty = {
        "grid_width": 3,
        "grid_depth": 3,
        "start": {"x": 9, "z": 9},
        "cells": [{"x": 1, "z": 1, "type": "button", "opens": "missing"}],
        "commands": [],
        "win": {"op": "and", "of": [{"cond": "at_goal"}, {"cond": "all_items_taken"}]},
    }
    found = codes(world_validate.check(faulty))
    assert {
        "start_off_grid",
        "no_goal",
        "button_without_door",
        "win_needs_items_but_none",
        "no_commands",
    } <= found

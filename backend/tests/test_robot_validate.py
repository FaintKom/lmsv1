"""Everything wrong with a level, reported at once.

One problem per save turns a five-minute fix into five rounds of save-and-look,
so the shape that matters here is the list: a level with three faults reports
three, not the first one the checker happened to reach.

Every code is a key. The editor renders it in the teacher's language, and no
sentence crosses the wire (FR-020, FR-023).
"""

from app.exercises import robot_validate


def codes(level: dict) -> list[str]:
    return [b["code"] for b in robot_validate.check(level)]


def level(**over) -> dict:
    base = {
        "grid_width": 4,
        "grid_height": 1,
        "start": {"x": 0, "y": 0, "facing": "right"},
        "cells": [{"x": 3, "y": 0, "type": "goal"}],
        "commands": ["move_forward", "turn_left", "turn_right", "at_goal"],
        "win": {"cond": "at_goal"},
        "max_steps": 500,
    }
    base.update(over)
    return base


def test_a_good_level_reports_nothing():
    """The positive control for every test below. Without it they would all pass
    against a checker that complains about everything."""
    assert codes(level()) == []


# ─── The grid itself ─────────────────────────────────────────────────


def test_a_start_inside_a_wall():
    assert "start_on_wall" in codes(
        level(cells=[{"x": 0, "y": 0, "type": "wall"}, {"x": 3, "y": 0, "type": "goal"}])
    )


def test_a_colour_outside_the_palette():
    assert "bad_mark_color" in codes(
        level(
            cells=[
                {"x": 1, "y": 0, "type": "empty", "mark": True, "mark_color": "puce"},
                {"x": 3, "y": 0, "type": "goal"},
            ]
        )
    )


def test_a_colour_on_an_unmarked_cell():
    assert "color_without_mark" in codes(
        level(
            cells=[
                {"x": 1, "y": 0, "type": "empty", "mark_color": "red"},
                {"x": 3, "y": 0, "type": "goal"},
            ]
        )
    )


def test_a_coloured_mark_with_no_paint_offered():
    faults = codes(
        level(
            cells=[
                {"x": 1, "y": 0, "type": "empty", "mark": True, "mark_color": "red"},
                {"x": 3, "y": 0, "type": "goal"},
            ]
        )
    )
    assert "win_needs_paint_command" in faults

    fine = codes(
        level(
            cells=[
                {"x": 1, "y": 0, "type": "empty", "mark": True, "mark_color": "red"},
                {"x": 3, "y": 0, "type": "goal"},
            ],
            commands=["move_forward", "turn_left", "turn_right", "at_goal", "paint"],
        )
    )
    assert "win_needs_paint_command" not in fine


def test_an_item_kind_off_the_list():
    assert "bad_item_kind" in codes(
        level(
            cells=[
                {"x": 1, "y": 0, "type": "item", "kind": "sword"},
                {"x": 3, "y": 0, "type": "goal"},
            ]
        )
    )


def test_a_kind_on_a_cell_with_no_item():
    assert "kind_without_item" in codes(
        level(
            cells=[
                {"x": 1, "y": 0, "type": "empty", "kind": "gem"},
                {"x": 3, "y": 0, "type": "goal"},
            ]
        )
    )


def test_a_start_outside_the_grid():
    assert "start_off_grid" in codes(level(start={"x": 9, "y": 0, "facing": "right"}))


def test_a_cell_outside_the_grid():
    assert "cell_off_grid" in codes(
        level(cells=[{"x": 3, "y": 0, "type": "goal"}, {"x": 99, "y": 0, "type": "wall"}])
    )


def test_two_cells_on_one_square():
    assert "duplicate_cell" in codes(
        level(cells=[{"x": 3, "y": 0, "type": "goal"}, {"x": 3, "y": 0, "type": "wall"}])
    )


def test_two_goals():
    assert "two_goals" in codes(
        level(cells=[{"x": 2, "y": 0, "type": "goal"}, {"x": 3, "y": 0, "type": "goal"}])
    )


def test_a_mark_on_a_wall():
    assert "mark_on_wall" in codes(
        level(
            cells=[
                {"x": 3, "y": 0, "type": "goal"},
                {"x": 1, "y": 0, "type": "wall", "mark": True},
            ]
        )
    )


def test_a_number_on_a_wall():
    assert "value_on_wall" in codes(
        level(
            cells=[
                {"x": 3, "y": 0, "type": "goal"},
                {"x": 1, "y": 0, "type": "wall", "value": 2},
            ]
        )
    )


# ─── A goal nothing on the grid can satisfy (FR-032) ─────────────────


def test_a_goal_condition_with_no_goal_on_the_grid():
    assert "win_needs_goal" in codes(level(cells=[]))


def test_a_collection_with_nothing_to_collect():
    assert "win_needs_items" in codes(level(win={"cond": "all_items_taken"}, cells=[]))


def test_painting_with_nothing_marked():
    assert "win_needs_marks" in codes(level(win={"cond": "all_marks_painted"}, cells=[]))


def test_numbers_with_no_numbers_on_the_grid():
    assert "win_needs_values" in codes(level(win={"cond": "all_values_read"}, cells=[]))


def test_a_condition_inside_and_or_is_still_checked():
    """The expression is a tree, and a fault can sit in any branch."""
    assert "win_needs_items" in codes(
        level(win={"op": "and", "of": [{"cond": "at_goal"}, {"cond": "all_items_taken"}]})
    )


def test_a_condition_inside_not_is_still_checked():
    assert "win_needs_marks" in codes(
        level(win={"op": "not", "of": [{"cond": "all_marks_painted"}]}, cells=[])
    )


# ─── The command set ─────────────────────────────────────────────────


def test_a_level_offering_nothing():
    assert "no_commands" in codes(level(commands=[]))


def test_a_command_nobody_has_heard_of():
    assert "unknown_command" in codes(level(commands=["move_forward", "teleport", "at_goal"]))


def test_sensors_without_the_facing_commands():
    """Sensors read relative to where the robot faces, so a level offering them
    and no way to turn hands a pupil a question they cannot act on."""
    assert "sensor_without_facing" in codes(level(commands=["move_up", "move_down", "wall_ahead"]))


def test_sensors_with_the_facing_commands_are_fine():
    assert "sensor_without_facing" not in codes(
        level(commands=["move_forward", "turn_left", "turn_right", "wall_ahead", "at_goal"])
    )


def test_painting_asked_for_but_not_offered():
    assert "win_needs_paint_command" in codes(
        level(
            win={"cond": "all_marks_painted"},
            cells=[{"x": 1, "y": 0, "type": "empty", "mark": True}],
            commands=["move_forward", "turn_left"],
        )
    )


def test_collecting_asked_for_but_take_not_offered():
    assert "win_needs_take_command" in codes(
        level(
            win={"cond": "all_items_taken"},
            cells=[{"x": 1, "y": 0, "type": "item"}],
            commands=["move_forward", "turn_left"],
        )
    )


# ─── All of it at once ───────────────────────────────────────────────


def test_a_level_with_several_faults_reports_them_all():
    """The shape that matters. A checker returning the first fault makes a
    teacher save five times to learn five things."""
    found = codes(
        level(
            cells=[{"x": 0, "y": 0, "type": "wall"}],
            commands=[],
            win={"op": "and", "of": [{"cond": "at_goal"}, {"cond": "all_items_taken"}]},
        )
    )

    assert "start_on_wall" in found
    assert "no_commands" in found
    assert "win_needs_goal" in found
    assert "win_needs_items" in found


def test_every_code_is_a_key_and_never_a_sentence():
    """FR-023. A sentence here would be an English string the editor cannot
    translate."""
    for blocker in robot_validate.check(level(cells=[], commands=[])):
        assert " " not in blocker["code"]
        assert blocker["code"].islower()

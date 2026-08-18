"""Can this level be finished, and in how few steps.

The answer a teacher gets must always say which kind of answer it is. A
shortest-solution count and "your own solution passes" are different claims, and
presenting the second as the first is the defect these tests exist to prevent —
SC-011.

Every count here is small enough to check by hand, on purpose. A test asserting
whatever the search happened to return proves only that the search is
deterministic.
"""

from app.exercises import robot_solver

ABSOLUTE = ["move_up", "move_down", "move_left", "move_right"]
FACING = ["move_forward", "turn_left", "turn_right"]


def level(**over) -> dict:
    base = {
        "grid_width": 4,
        "grid_height": 1,
        "start": {"x": 0, "y": 0, "facing": "right"},
        "cells": [{"x": 3, "y": 0, "type": "goal"}],
        "commands": [*FACING, "at_goal"],
        "win": {"cond": "at_goal"},
        "max_steps": 500,
    }
    base.update(over)
    return base


# ─── A shortest answer, countable by hand ────────────────────────────


def test_a_straight_corridor_is_three_steps():
    answer = robot_solver.solve(level())

    assert answer["answer"] == "shortest"
    assert answer["steps"] == 3


def test_a_turn_costs_a_step_and_the_count_shows_it():
    """Start facing right, goal one cell up. Turn, then move: two steps."""
    answer = robot_solver.solve(
        level(
            grid_width=1,
            grid_height=2,
            start={"x": 0, "y": 1, "facing": "right"},
            cells=[{"x": 0, "y": 0, "type": "goal"}],
        )
    )

    assert answer["answer"] == "shortest"
    assert answer["steps"] == 2


def test_the_same_level_with_absolute_moves_takes_one_step():
    """`move_up` turns and moves as one command, so the same grid is cheaper.

    This is the whole reason the search must know the command set: one grid has
    different optima under different vocabularies.
    """
    answer = robot_solver.solve(
        level(
            grid_width=1,
            grid_height=2,
            start={"x": 0, "y": 1, "facing": "right"},
            cells=[{"x": 0, "y": 0, "type": "goal"}],
            commands=[*ABSOLUTE, "at_goal"],
        )
    )

    assert answer["steps"] == 1


def test_a_wall_makes_the_robot_go_around():
    #  S # G
    #  . . .   → down, right, right, up
    answer = robot_solver.solve(
        level(
            grid_width=3,
            grid_height=2,
            start={"x": 0, "y": 0, "facing": "right"},
            cells=[{"x": 1, "y": 0, "type": "wall"}, {"x": 2, "y": 0, "type": "goal"}],
            commands=[*ABSOLUTE, "at_goal"],
        )
    )

    assert answer["answer"] == "shortest"
    assert answer["steps"] == 4


def test_collecting_on_the_way_is_counted():
    answer = robot_solver.solve(
        level(
            cells=[{"x": 1, "y": 0, "type": "item"}, {"x": 3, "y": 0, "type": "goal"}],
            commands=[*FACING, "take", "at_goal"],
            win={"op": "and", "of": [{"cond": "at_goal"}, {"cond": "all_items_taken"}]},
        )
    )

    # forward, take, forward, forward
    assert answer["answer"] == "shortest"
    assert answer["steps"] == 4


def test_painting_is_counted():
    answer = robot_solver.solve(
        level(
            cells=[
                {"x": 1, "y": 0, "type": "empty", "mark": True},
                {"x": 3, "y": 0, "type": "goal"},
            ],
            commands=[*FACING, "paint", "at_goal"],
            win={"op": "and", "of": [{"cond": "at_goal"}, {"cond": "all_marks_painted"}]},
        )
    )

    assert answer["steps"] == 4


def test_a_level_already_won_at_the_start_costs_nothing():
    answer = robot_solver.solve(
        level(
            grid_width=1,
            start={"x": 0, "y": 0, "facing": "right"},
            cells=[{"x": 0, "y": 0, "type": "goal"}],
        )
    )

    assert answer["answer"] == "shortest"
    assert answer["steps"] == 0


# ─── No answer, and saying so ────────────────────────────────────────


def test_a_walled_off_goal_is_unsolvable():
    answer = robot_solver.solve(
        level(cells=[{"x": 1, "y": 0, "type": "wall"}, {"x": 3, "y": 0, "type": "goal"}])
    )

    assert answer["answer"] == "unsolvable"
    assert answer["steps"] is None


def test_a_goal_reachable_only_by_turning_is_unsolvable_without_turns():
    """The search answers for the commands a level offers, never for the ones it
    withholds."""
    walled = level(
        grid_width=1,
        grid_height=2,
        start={"x": 0, "y": 1, "facing": "right"},
        cells=[{"x": 0, "y": 0, "type": "goal"}],
        commands=["move_forward", "at_goal"],
    )

    assert robot_solver.solve(walled)["answer"] == "unsolvable"

    walled["commands"] = [*FACING, "at_goal"]
    assert robot_solver.solve(walled)["answer"] == "shortest", "positive control"


def test_a_level_offering_nothing_is_unsolvable():
    assert robot_solver.solve(level(commands=[]))["answer"] == "unsolvable"


# ─── Declining, and never dressing it up as an optimum ───────────────


def test_a_win_condition_over_values_is_not_searched():
    answer = robot_solver.solve(
        level(
            cells=[{"x": 1, "y": 0, "type": "empty", "value": 3}],
            commands=[*FACING, "read"],
            win={"cond": "all_values_read"},
        )
    )

    assert answer["answer"] == "reference_only"
    assert answer["reason"] == "win_uses_values"


def test_a_total_over_values_is_not_searched_either():
    answer = robot_solver.solve(
        level(
            cells=[{"x": 1, "y": 0, "type": "empty", "value": 3}],
            commands=[*FACING, "write"],
            win={"cond": "values_total", "n": 9},
        )
    )

    assert answer["answer"] == "reference_only"
    assert answer["reason"] == "win_uses_values"


def test_too_many_targets_is_not_searched():
    answer = robot_solver.solve(
        level(
            grid_width=13,
            cells=[{"x": x, "y": 0, "type": "item"} for x in range(13)],
            commands=[*FACING, "take"],
            win={"cond": "all_items_taken"},
        )
    )

    assert answer["answer"] == "reference_only"
    assert answer["reason"] == "too_many_targets"


def test_twelve_targets_is_still_searched():
    """The cap is twelve, and the boundary is checked from both sides."""
    answer = robot_solver.solve(
        level(
            grid_width=12,
            cells=[{"x": x, "y": 0, "type": "item"} for x in range(12)],
            commands=[*ABSOLUTE, "take"],
            win={"cond": "all_items_taken"},
        )
    )

    assert answer["answer"] == "shortest"


def test_a_declined_answer_never_claims_to_be_shortest():
    """SC-011, stated as an assertion.

    Whatever the reason, a search that did not run must not return a count
    labelled `shortest` — that label is the whole promise.
    """
    declined = [
        level(
            cells=[{"x": 1, "y": 0, "type": "empty", "value": 3}],
            win={"cond": "all_values_read"},
        ),
        level(
            grid_width=13,
            cells=[{"x": x, "y": 0, "type": "item"} for x in range(13)],
            commands=[*FACING, "take"],
            win={"cond": "all_items_taken"},
        ),
    ]

    for case in declined:
        assert robot_solver.solve(case)["answer"] != "shortest"


# ─── The reference solution, where the search cannot go ──────────────


def test_a_reference_solution_supplies_the_figures_when_the_search_declines():
    answer = robot_solver.solve(
        level(
            cells=[{"x": 1, "y": 0, "type": "empty", "value": 3}],
            commands=[*FACING, "read"],
            win={"cond": "all_values_read"},
        ),
        reference_run={"won": True, "steps": 5, "size": 2},
    )

    assert answer["answer"] == "reference_only"
    assert answer["steps"] == 5
    assert answer["size"] == 2


def test_a_reference_solution_that_loses_is_not_offered_as_evidence():
    """Two separate facts, reported separately.

    `reason` still says why no search ran — the teacher needs that either way.
    That nobody has finished the level is a blocker, because it is the thing
    they can go and fix.
    """
    answer = robot_solver.solve(
        level(
            cells=[{"x": 1, "y": 0, "type": "empty", "value": 3}],
            commands=[*FACING, "read"],
            win={"cond": "all_values_read"},
        ),
        reference_run={"won": False, "steps": 5, "size": 2},
    )

    assert answer["steps"] is None, "a losing run's figures are not evidence"
    assert answer["reason"] == "win_uses_values"
    assert {"code": "no_reference_solution"} in answer["blockers"]


def test_no_reference_at_all_is_reported_the_same_way():
    answer = robot_solver.solve(
        level(
            cells=[{"x": 1, "y": 0, "type": "empty", "value": 3}],
            commands=[*FACING, "read"],
            win={"cond": "all_values_read"},
        )
    )

    assert answer["reason"] == "win_uses_values"
    assert {"code": "no_reference_solution"} in answer["blockers"]

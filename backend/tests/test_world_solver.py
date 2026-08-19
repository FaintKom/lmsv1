"""Can this level be finished — and does the answer say how it knows.

The trap this guards is one 2D fell into and its tests caught: a `steps` count
means two different things depending on `answer`. A `shortest` count is an
optimum a teacher can trust; a `reference_only` count is whatever their own
solution happened to take. Showing the second as the first tells a teacher their
level needs seven steps when it needs four.
"""

from app.exercises import world_sim, world_solver

ALL = list(world_sim.COMMANDS)


def corridor(length: int = 3, **extra) -> dict:
    """One square wide, the goal at the far end, facing north down the run."""
    level = {
        "grid_width": 1,
        "grid_depth": length + 1,
        "start": {"x": 0, "z": length, "y": 0, "facing": "north"},
        "cells": [{"x": 0, "z": 0, "type": "goal"}],
        "commands": ALL,
        "win": {"cond": "at_goal"},
        "max_steps": 100,
    }
    level.update(extra)
    return level


# ─── It answers, and the number is countable by hand ─────────────────


def test_a_corridor_is_solvable_in_the_steps_a_human_would_count():
    answer = world_solver.solve(corridor(3))
    assert answer["answer"] == "shortest"
    assert answer["steps"] == 3  # three squares, three moves


def test_a_walled_off_goal_is_unsolvable():
    level = corridor(3)
    level["cells"] = level["cells"] + [{"x": 0, "z": 1, "y": 0, "type": "wall"}]
    answer = world_solver.solve(level)
    assert answer["answer"] == "unsolvable"
    assert answer["steps"] is None


def test_the_vocabulary_changes_the_answer():
    """Same level, fewer commands — or the teacher's command list is a lie."""
    level = {
        "grid_width": 2,
        "grid_depth": 2,
        "start": {"x": 0, "z": 1, "y": 0, "facing": "north"},
        "cells": [{"x": 1, "z": 0, "type": "goal"}],
        "commands": ALL,
        "win": {"cond": "at_goal"},
        "max_steps": 100,
    }
    assert world_solver.solve(level)["answer"] == "shortest"

    # Forward only, no turning: the goal is diagonally away and unreachable.
    forward_only = world_solver.solve({**level, "commands": ["move_forward", "at_goal"]})
    assert forward_only["answer"] == "unsolvable"


def test_a_level_offering_nothing_is_unsolvable():
    answer = world_solver.solve(corridor(3, commands=["at_goal"]))
    assert answer["answer"] == "unsolvable"


def test_a_level_already_won_costs_no_steps():
    level = corridor(3)
    level["start"] = {"x": 0, "z": 0, "y": 0, "facing": "north"}
    assert world_solver.solve(level)["steps"] == 0


# ─── Height ──────────────────────────────────────────────────────────


def test_a_climb_that_needs_a_jump_is_found_only_when_jump_is_offered():
    level = {
        "grid_width": 1,
        "grid_depth": 2,
        "start": {"x": 0, "z": 1, "y": 0, "facing": "north"},
        "cells": [
            {"x": 0, "z": 0, "y": 2, "type": "platform"},
            {"x": 0, "z": 0, "type": "goal"},
        ],
        "commands": ["move_forward", "jump", "at_goal"],
        "win": {"cond": "at_goal"},
        "max_steps": 50,
    }
    assert world_solver.solve(level)["answer"] == "shortest"

    without = world_solver.solve({**level, "commands": ["move_forward", "at_goal"]})
    assert without["answer"] == "unsolvable"


# ─── Doors ───────────────────────────────────────────────────────────


def test_the_path_through_a_door_counts_the_button_press():
    """The shorter route is through a closed door; the answer must not take it."""
    level = {
        "grid_width": 2,
        "grid_depth": 3,
        "start": {"x": 0, "z": 2, "y": 0, "facing": "north"},
        "cells": [
            {"x": 0, "z": 1, "type": "door", "id": "gate"},
            {"x": 1, "z": 2, "type": "button", "opens": "gate"},
            {"x": 0, "z": 0, "type": "goal"},
        ],
        "commands": ["move_forward", "turn_left", "turn_right", "press", "at_goal"],
        "win": {"cond": "at_goal"},
        "max_steps": 100,
    }
    answer = world_solver.solve(level)
    assert answer["answer"] == "shortest"
    # Turning to the button, pressing, turning back and walking through costs
    # more than the two steps the closed door would have.
    assert answer["steps"] > 2


# ─── Where it declines, and what it says then ────────────────────────


def _crowded() -> dict:
    cells = [{"x": 0, "z": 0, "type": "goal"}]
    cells += [{"x": i % 4, "z": 1 + i // 4, "type": "item"} for i in range(13)]
    return {
        "grid_width": 4,
        "grid_depth": 5,
        "start": {"x": 3, "z": 4, "y": 0, "facing": "north"},
        "cells": cells,
        "commands": ALL,
        "win": {"cond": "at_goal"},
        "max_steps": 200,
    }


def test_more_than_a_dozen_targets_declines_and_never_says_shortest():
    answer = world_solver.solve(_crowded())
    assert answer["answer"] == "reference_only"
    assert answer["reason"] == "too_many_targets"


def test_declining_without_a_reference_solution_is_a_blocker():
    answer = world_solver.solve(_crowded(), reference_run=None)
    assert {"code": "no_reference_solution"} in answer["blockers"]
    assert answer["steps"] is None


def test_a_reference_solution_that_loses_is_not_evidence():
    losing = world_solver.solve(_crowded(), reference_run={"won": False, "steps": 9, "size": 4})
    assert losing["steps"] is None
    assert {"code": "no_reference_solution"} in losing["blockers"]

    # The control: a winning one is reported, and still labelled as a reference.
    winning = world_solver.solve(_crowded(), reference_run={"won": True, "steps": 9, "size": 4})
    assert winning["steps"] == 9
    assert winning["answer"] == "reference_only"
    assert winning["blockers"] == []

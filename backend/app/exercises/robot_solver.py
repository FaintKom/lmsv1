"""Can this level be finished, and in how few steps.

A breadth-first walk over the states a robot can be in, expanding only the
commands the level offers — because the same grid has different optima under
different vocabularies. ``move_up`` turns and moves as one command; with only
``move_forward`` and the turns, the same corner costs two.

**What it will not answer, and says so.** Where the win condition mentions the
numbers on the floor, ``write`` makes the state space unbounded — a cell can hold
any integer, so there is nothing finite to search. Those levels fall back to
running the teacher's own solution, and the answer is labelled ``reference_only``
so the editor can never show it as an optimum. That is SC-011, and the cost the
owner accepted when choosing the full command vocabulary.

The rules are not restated here. It restores states into one ``robot_sim.World``
and asks it — a second copy of the rules is exactly the defect this feature
exists to remove.
"""

from collections import deque

from app.exercises.robot_sim import RobotError, StepsExhaustedError, World

#: Beyond this the search stops being cheap: each target doubles the state
#: space, and twelve is where a 10×10 grid reaches a few million states —
#: seconds, not minutes. See `specs/005-robot-2d-rework/research.md`, Finding D.
MAX_TARGETS = 12

#: Conditions that read the numbers on the floor. Any of these and the search
#: declines outright, whatever the target count.
VALUE_CONDITIONS = frozenset({"all_values_read", "values_total"})

#: Commands worth expanding. ``read`` and ``write`` are absent deliberately:
#: they only matter to value conditions, and a level with one of those is never
#: searched.
SEARCHABLE = (
    "move_up",
    "move_down",
    "move_left",
    "move_right",
    "move_forward",
    "turn_left",
    "turn_right",
    "take",
    "drop",
    "paint",
)


def solve(level: dict, reference_run: dict | None = None) -> dict:
    """Answer whether a level can be finished. See `contracts/api.md`.

    Returns one of three answers, and always says which:

    - ``shortest`` — searched exhaustively; ``steps`` is an optimum.
    - ``reference_only`` — not searched; ``steps`` comes from the teacher's own
      solution, if it wins. ``reason`` says why the search declined.
    - ``unsolvable`` — searched, and no arrangement of the offered commands
      reaches the goal.
    """
    reason = _why_not_searchable(level)
    if reason:
        return _from_reference(reference_run, reason)

    steps = _shortest(level)
    if steps is None:
        return {
            "answer": "unsolvable",
            "steps": None,
            "size": None,
            "reason": None,
            "blockers": [],
        }

    return {"answer": "shortest", "steps": steps, "size": None, "reason": None, "blockers": []}


def _why_not_searchable(level: dict) -> str | None:
    if _mentions_values(level.get("win")):
        return "win_uses_values"

    cells = level.get("cells") or []
    if any(c.get("mark_color") for c in cells):
        # Coloured marks would make the search enumerate a colour choice per
        # paint — reference-only, like values.
        return "win_uses_colors"
    targets = sum(1 for c in cells if c.get("type") == "item")
    targets += sum(1 for c in cells if c.get("mark"))
    if targets > MAX_TARGETS:
        return "too_many_targets"
    return None


def _mentions_values(node) -> bool:
    if not isinstance(node, dict):
        return False
    if node.get("cond") in VALUE_CONDITIONS:
        return True
    return any(_mentions_values(child) for child in node.get("of") or [])


def _from_reference(reference_run: dict | None, reason: str) -> dict:
    """The search declined. The teacher's own solution is the only evidence.

    Two separate facts, kept separate. ``reason`` always says why no search was
    run — the teacher needs that whether or not they have written a solution.
    Whether a *usable* solution exists is a blocker, because it is something
    they can go and fix: a level nobody has finished is a level nobody knows can
    be finished.

    A solution that loses is not evidence, and its figures are not reported.
    """
    usable = bool(reference_run and reference_run.get("won"))

    return {
        "answer": "reference_only",
        "steps": reference_run.get("steps") if usable else None,
        "size": reference_run.get("size") if usable else None,
        "reason": reason,
        "blockers": [] if usable else [{"code": "no_reference_solution"}],
    }


def _shortest(level: dict) -> int | None:
    """Breadth-first over `(position, facing, items, painted)`. None if no path.

    Breadth-first rather than anything cleverer because every command costs
    exactly one step, so the first time a state satisfies the win condition is
    by definition the cheapest way to reach it.
    """
    world = World(level, enforce_offered=False)
    offered = [c for c in (level.get("commands") or []) if c in SEARCHABLE]

    start = world.snapshot()
    if world.evaluate():
        return 0
    if not offered:
        return None

    seen = {_key(start)}
    queue = deque([(start, 0)])
    cap = int(level.get("max_steps", 500))

    while queue:
        state, depth = queue.popleft()
        if depth >= cap:
            continue

        for command in offered:
            world.restore(state)
            try:
                world.perform(command)
            except (RobotError, StepsExhaustedError):
                continue

            nxt = world.snapshot()
            key = _key(nxt)
            if key in seen:
                continue

            if world.evaluate():
                return depth + 1

            seen.add(key)
            queue.append((nxt, depth + 1))

    return None


def _key(snapshot: tuple) -> tuple:
    """A state's identity, without the step count.

    Steps are the search depth, so leaving them in would make every state look
    new and turn the walk into an enumeration of every path.
    """
    return snapshot[:-1]

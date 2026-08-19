"""Can this 3D level be finished, and in how few steps.

A breadth-first walk over the states a character can be in, expanding only the
commands the level offers — because the same level has different optima under
different vocabularies. With `jump` a two-level climb costs one step; without
it, the same climb may cost a detour, or be impossible.

**What it will not answer, and says so.** Items and buttons each double the
state space, so past a dozen of them the search stops being cheap. Those levels
fall back to running the teacher's own solution, labelled `reference_only` so
the editor can never present it as an optimum.

The rules are not restated here. It restores states into one `world_sim.World`
and asks it — a second copy of the rules is exactly the defect this feature
exists to remove.
"""

from collections import deque

from app.exercises.world_sim import StepsExhaustedError, World, WorldError

#: Beyond this the search stops being cheap: every item and every button doubles
#: the state space. See `specs/012-world-3d-rework/research.md`, Finding B.
MAX_TARGETS = 12

#: Commands worth expanding. Sensors are absent because they cost no step and
#: change nothing — searching over them would explore identical worlds.
SEARCHABLE = (
    "move_forward",
    "turn_left",
    "turn_right",
    "jump",
    "take",
    "drop",
    "press",
)


def solve(level: dict, reference_run: dict | None = None) -> dict:
    """Answer whether a level can be finished. See `contracts/api.md`.

    Returns one of three answers, and always says which:

    - `shortest` — searched exhaustively; `steps` is an optimum.
    - `reference_only` — not searched; `steps` comes from the teacher's own
      solution, if it wins. `reason` says why the search declined.
    - `unsolvable` — searched, and no arrangement of the offered commands
      finishes the level.
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
    cells = level.get("cells") or []
    targets = sum(1 for c in cells if c.get("type") in ("item", "button"))
    if targets > MAX_TARGETS:
        return "too_many_targets"
    return None


def _from_reference(reference_run: dict | None, reason: str) -> dict:
    """The search declined. The teacher's own solution is the only evidence.

    Two separate facts, kept separate. `reason` always says why no search was
    run — the teacher needs that whether or not they have written a solution.
    Whether a *usable* solution exists is a blocker, because it is something
    they can go and fix.

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
    """Breadth-first over `(square, height, facing, items, pressed, doors)`.

    Breadth-first rather than anything cleverer because every command costs
    exactly one step, so the first time a state satisfies the win condition is
    by definition the cheapest way to reach it. A heuristic across a locked door
    is not obvious, and being wrong there makes the answer wrong rather than
    slow.
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
            except (WorldError, StepsExhaustedError):
                continue

            if world.evaluate():
                return depth + 1

            nxt = world.snapshot()
            key = _key(nxt)
            if key not in seen:
                seen.add(key)
                queue.append((nxt, depth + 1))

    return None


def _key(state: tuple):
    """Everything that distinguishes one state from another, except the count.

    The step count is dropped: two ways of reaching the same square with the
    same things collected are the same position to search from, and keeping the
    count would make every one of them look new.
    """
    return state[:-1]

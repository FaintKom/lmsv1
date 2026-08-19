"""The rules of a Robot 2D level, written once.

This module runs in two places and must behave identically in both:

* Inside the sandbox, as source text prepended to the pupil's program. Its
  ``WORLD`` answers ``wall_ahead()`` truthfully so their ``if`` branches the way
  the grid actually is, and it records the command names they attempt.
* Inside the backend, replaying that recorded list with no pupil code present.
  That replay is the only thing whose verdict counts.

The split matters. A pupil's program shares an interpreter with the copy running
beside it and can reach in and set any flag it likes, so nothing the sandbox
concludes is believed. What comes back is a list of command names, and a list of
names has nothing to forge — it is replayed against the real grid, and the replay
either wins or does not.

Because its own source is shipped into the sandbox, this module imports nothing
but the standard library. Adding an application import breaks the sandbox at
runtime, not at import time, so there is no compiler to catch it.
"""

import json

# ─── Geometry ────────────────────────────────────────────────────────

FACINGS = ("up", "right", "down", "left")

DELTA = {
    "up": (0, -1),
    "right": (1, 0),
    "down": (0, 1),
    "left": (-1, 0),
}

#: Commands that cost a step. Sensors are free — a child should be able to look
#: around without paying for it, or ``while not wall_ahead()`` becomes a trap.
ACTIONS = (
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
    "read",
    "write",
)

SENSORS = ("wall_ahead", "item_here", "at_goal", "painted", "value_here")

COMMANDS = ACTIONS + SENSORS


class RobotError(Exception):
    """A mistake the pupil must fix, reported against the line that made it.

    Raised — rather than returned — when carrying on would mean inventing a
    value. ``read()`` on a bare floor is the case that matters: returning ``0``
    hands the child a number to reason from, and the mistake then surfaces three
    lines later as a wrong answer instead of here as a wrong call.

    Movement is different. Walking into a wall is an ordinary thing a program
    does; the robot stays put, the step is spent, and the run carries on.
    """

    def __init__(self, key: str):
        super().__init__(key)
        self.key = key


class StepsExhaustedError(Exception):
    """The level's allowance ran out.

    This is what makes ``while True: move_up()`` end with something a child can
    read, instead of the sandbox's wall-clock timeout, which tells them nothing
    about their own program.
    """


#: The name the sandbox harness catches. Each world names its error after
#: itself — ``RobotError`` here, ``WorldError`` in ``world_sim`` — and this alias
#: is what lets one harness serve both without either being renamed.
SimError = RobotError


class World:
    """One run of one level.

    Holds both records deliberately. ``commands`` is what the sandbox prints —
    names only. ``frames`` is what the replay builds for the browser to animate.
    One class, so the two can never drift into disagreeing about a rule.
    """

    def __init__(self, level: dict, *, enforce_offered: bool = True):
        self.width = int(level.get("grid_width", 5))
        self.height = int(level.get("grid_height", 5))

        start = level.get("start") or {}
        self.x = int(start.get("x", 0))
        self.y = int(start.get("y", 0))
        self.facing = start.get("facing", "right")
        if self.facing not in FACINGS:
            self.facing = "right"

        # Sparse, exactly as stored: a position absent here is empty floor with
        # no mark and no value.
        self.walls: set[tuple[int, int]] = set()
        self.items: set[tuple[int, int]] = set()
        self.goals: set[tuple[int, int]] = set()
        self.marks: set[tuple[int, int]] = set()
        self.values: dict[tuple[int, int], int] = {}

        for cell in level.get("cells") or []:
            pos = (int(cell["x"]), int(cell["y"]))
            kind = cell.get("type", "empty")
            if kind == "wall":
                self.walls.add(pos)
            elif kind == "item":
                self.items.add(pos)
            elif kind == "goal":
                self.goals.add(pos)
            if cell.get("mark"):
                self.marks.add(pos)
            if cell.get("value") is not None:
                self.values[pos] = int(cell["value"])

        self.offered = set(level.get("commands") or COMMANDS)
        self.enforce_offered = enforce_offered
        self.max_steps = int(level.get("max_steps", 500))
        self.win = level.get("win")

        self.carrying = 0
        self.painted: set[tuple[int, int]] = set()
        self.values_read: set[tuple[int, int]] = set()
        self.steps = 0

        self.commands: list[str] = []
        self.frames: list[dict] = []

    # ─── Queries the rules are built on ──────────────────────────────

    def _blocked(self, x: int, y: int) -> str | None:
        """Why the robot may not stand at (x, y), or None if it may."""
        if not (0 <= x < self.width and 0 <= y < self.height):
            return "edge"
        if (x, y) in self.walls:
            return "wall"
        return None

    def _ahead(self) -> tuple[int, int]:
        dx, dy = DELTA[self.facing]
        return self.x + dx, self.y + dy

    @property
    def here(self) -> tuple[int, int]:
        return self.x, self.y

    # ─── Performing one command ──────────────────────────────────────

    def perform(self, name: str, arg: int | None = None) -> dict:
        """Run one command and record a frame. Returns that frame.

        Every path through here appends exactly one frame and, for an action,
        spends exactly one step — including a refused move. A wall that silently
        costs nothing teaches a child that bumping into things is free, and makes
        the shortest-solution answer disagree with what they watched happen.
        """
        if name not in COMMANDS:
            raise RobotError("not_offered")
        if self.enforce_offered and name not in self.offered:
            raise RobotError("not_offered")

        if name in ACTIONS:
            if self.steps >= self.max_steps:
                raise StepsExhaustedError()
            self.steps += 1

        # `write` is the one command a name alone does not describe, so it is
        # recorded with its argument. Everything else records as a bare name.
        self.commands.append(name if arg is None else [name, int(arg)])
        changed: list[dict] = []
        refusal: str | None = None

        if name in ("move_up", "move_down", "move_left", "move_right"):
            direction = name[len("move_") :]
            self.facing = direction
            dx, dy = DELTA[direction]
            refusal = self._step_to(self.x + dx, self.y + dy)

        elif name == "move_forward":
            refusal = self._step_to(*self._ahead())

        elif name == "turn_left":
            self.facing = FACINGS[(FACINGS.index(self.facing) + 3) % 4]

        elif name == "turn_right":
            self.facing = FACINGS[(FACINGS.index(self.facing) + 1) % 4]

        elif name == "take":
            if self.here in self.items:
                self.items.discard(self.here)
                self.carrying += 1
                changed.append({"x": self.x, "y": self.y, "item": False})
            else:
                refusal = "no_item"

        elif name == "drop":
            if self.carrying <= 0:
                refusal = "carrying_nothing"
            elif self.here in self.items:
                refusal = "floor_taken"
            else:
                self.items.add(self.here)
                self.carrying -= 1
                changed.append({"x": self.x, "y": self.y, "item": True})

        elif name == "paint":
            # One-way, and idempotent. Without that a program could satisfy
            # "paint every marked cell" by covering one cell over and over.
            if self.here not in self.painted:
                self.painted.add(self.here)
                changed.append({"x": self.x, "y": self.y, "painted": True})

        elif name == "read":
            if self.here not in self.values:
                raise RobotError("no_value")
            self.values_read.add(self.here)

        elif name == "write":
            if self.here not in self.values:
                raise RobotError("no_value")
            if arg is not None:
                self.values[self.here] = int(arg)
                changed.append({"x": self.x, "y": self.y, "value": int(arg)})

        frame = {
            "i": len(self.frames),
            "cmd": name,
            "ok": refusal is None,
            "x": self.x,
            "y": self.y,
            "facing": self.facing,
            "carrying": self.carrying,
            "items_left": len(self.items),
            "cells": changed,
            "msg": refusal,
        }
        self.frames.append(frame)
        return frame

    def _step_to(self, nx: int, ny: int) -> str | None:
        refusal = self._blocked(nx, ny)
        if refusal is None:
            self.x, self.y = nx, ny
        return refusal

    def sense(self, name: str) -> bool:
        """Answer a sensor. Costs no step and records no frame."""
        if self.enforce_offered and name not in self.offered:
            raise RobotError("not_offered")
        if name == "wall_ahead":
            return self._blocked(*self._ahead()) is not None
        if name == "item_here":
            return self.here in self.items
        if name == "at_goal":
            return self.here in self.goals
        if name == "painted":
            return self.here in self.painted
        if name == "value_here":
            return self.here in self.values
        raise RobotError("not_offered")

    # ─── State, for the search ───────────────────────────────────────

    def snapshot(self) -> tuple:
        """Everything a command can change, as a hashable value.

        The shortest-solution search walks millions of states. Building a fresh
        ``World`` for each would mean re-parsing the level every time, and
        re-deriving the rules by hand would mean a second copy of them. This is
        the third option: one world, restored between expansions.
        """
        return (
            self.x,
            self.y,
            self.facing,
            self.carrying,
            frozenset(self.items),
            frozenset(self.painted),
            frozenset(self.values_read),
            tuple(sorted(self.values.items())),
            self.steps,
        )

    def restore(self, snap: tuple) -> None:
        (
            self.x,
            self.y,
            self.facing,
            self.carrying,
            items,
            painted,
            values_read,
            values,
            self.steps,
        ) = snap
        self.items = set(items)
        self.painted = set(painted)
        self.values_read = set(values_read)
        self.values = dict(values)

    # ─── Did they win? ───────────────────────────────────────────────

    def evaluate(self, expr: dict | None = None) -> bool:
        """Evaluate the level's win expression against this run.

        An unknown node shape raises rather than returning False. A win condition
        nobody can satisfy because it was mistyped should stop the level being
        saved, not quietly fail every pupil who tries it.
        """
        node = self.win if expr is None else expr
        if not node:
            return False

        op = node.get("op")
        if op:
            children = node.get("of") or []
            if op == "not":
                if len(children) != 1:
                    raise ValueError("not takes exactly one child")
                return not self.evaluate(children[0])
            if not children:
                raise ValueError(f"{op} needs at least one child")
            if op == "and":
                return all(self.evaluate(c) for c in children)
            if op == "or":
                return any(self.evaluate(c) for c in children)
            raise ValueError(f"unknown operator: {op}")

        cond = node.get("cond")
        if cond == "at_goal":
            return self.here in self.goals
        if cond == "all_items_taken":
            return not self.items
        if cond == "all_marks_painted":
            return self.marks <= self.painted
        if cond == "facing":
            return self.facing == node.get("dir")
        if cond == "steps_at_most":
            return self.steps <= int(node["n"])
        if cond == "all_values_read":
            return set(self.values) <= self.values_read
        if cond == "values_total":
            return sum(self.values.values()) == int(node["n"])
        raise ValueError(f"unknown condition: {cond}")


def replay(level: dict, commands: list) -> dict:
    """Run a recorded command list against a fresh world. This is the verdict.

    What the server calls. No pupil code is present, so nothing here can be
    tampered with — the worst a doctored list can do is describe a run that
    loses.

    An entry may be a bare name, or ``[name, arg]`` for ``write``, which is the
    one command whose effect a name alone does not determine.
    """
    world = World(level, enforce_offered=True)
    stopped = "end_of_program"
    for entry in commands:
        name, arg = (entry, None) if isinstance(entry, str) else (entry[0], entry[1])
        try:
            world.perform(name, arg)
        except StepsExhaustedError:
            stopped = "steps_exhausted"
            break
        except RobotError:
            stopped = "error"
            break

    return {
        "frames": world.frames,
        "won": world.evaluate(),
        "steps": world.steps,
        "stopped": stopped,
    }


# ─── The surface a child programs against ────────────────────────────
#
# Bound to a module-level world so a pupil writes ``move_up()`` and not
# ``robot.move_up()`` — six characters off every line they type, on lines they
# type twenty times.

WORLD: World | None = None


def _act(name: str, arg: int | None = None) -> None:
    WORLD.perform(name, arg)


def move_up() -> None:
    _act("move_up")


def move_down() -> None:
    _act("move_down")


def move_left() -> None:
    _act("move_left")


def move_right() -> None:
    _act("move_right")


def move_forward() -> None:
    _act("move_forward")


def turn_left() -> None:
    _act("turn_left")


def turn_right() -> None:
    _act("turn_right")


def take() -> None:
    _act("take")


def drop() -> None:
    _act("drop")


def paint() -> None:
    _act("paint")


def read() -> int:
    _act("read")
    return WORLD.values[WORLD.here]


def write(n: int) -> None:
    _act("write", int(n))


def wall_ahead() -> bool:
    return WORLD.sense("wall_ahead")


def item_here() -> bool:
    return WORLD.sense("item_here")


def at_goal() -> bool:
    return WORLD.sense("at_goal")


def painted() -> bool:
    return WORLD.sense("painted")


def value_here() -> bool:
    return WORLD.sense("value_here")


def _boot(level_json: str) -> World:
    """Called by the generated sandbox program before the pupil's code runs."""
    global WORLD
    WORLD = World(json.loads(level_json))
    return WORLD

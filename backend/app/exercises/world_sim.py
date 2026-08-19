"""The rules of a World 3D level, written once.

The 2D twin of this file is ``robot_sim.py``, and the same split applies here:

* Inside the sandbox, as source text prepended to the pupil's program. Its
  ``WORLD`` answers ``wall_ahead()`` truthfully so their ``if`` branches the way
  the level actually is, and it records the command names they attempt.
* Inside the backend, replaying that recorded list with no pupil code present.
  That replay is the only thing whose verdict counts.

A pupil's program shares an interpreter with the copy running beside it and can
reach in and set any flag it likes, so nothing the sandbox concludes is believed.
What comes back is a list of command names, and a list of names has nothing to
forge.

What 3D adds to 2D is height. A block occupies the floor it is recorded at,
wall and platform alike. A square has a *surface* — one above the tallest
platform standing on it, or the floor when there is none — and moving puts the
character on that surface: up by one at most when walking, two when jumping,
down by any amount. Every refusal below is a consequence of those two sentences.

Because its own source is shipped into the sandbox, this module imports nothing
but the standard library. Adding an application import breaks the sandbox at
runtime, not at import time, so there is no compiler to catch it.
"""

import json

# ─── Geometry ────────────────────────────────────────────────────────

FACINGS = ("north", "east", "south", "west")

#: x runs left to right, z runs away from the camera. North is towards the back
#: of the level, which is what a child means by "forward" when looking at it.
DELTA = {
    "north": (0, -1),
    "east": (1, 0),
    "south": (0, 1),
    "west": (-1, 0),
}

#: Commands that cost a step. Sensors are free — a child should be able to look
#: around without paying for it, or ``while not wall_ahead()`` becomes a trap.
ACTIONS = (
    "move_forward",
    "turn_left",
    "turn_right",
    "jump",
    "take",
    "drop",
    "press",
)

SENSORS = (
    "wall_ahead",
    "gap_ahead",
    "step_ahead",
    "item_here",
    "at_goal",
    "button_ahead",
    "door_ahead",
)

COMMANDS = ACTIONS + SENSORS

#: How far the character can climb. Walking manages one level; jumping reaches
#: one higher than that. Falling has no limit — see the module docstring.
WALK_CLIMB = 1
JUMP_CLIMB = 2


class WorldError(Exception):
    """A mistake the pupil must fix, reported against the line that made it.

    Raised — rather than returned — when carrying on would mean inventing a
    value, or when the level does not offer the command at all.

    Movement is different. Walking into a wall is an ordinary thing a program
    does; the character stays put, the step is spent, and the run carries on.
    """

    def __init__(self, key: str):
        super().__init__(key)
        self.key = key


class StepsExhaustedError(Exception):
    """The level's allowance ran out.

    This is what makes ``while True: move_forward()`` end with something a child
    can read, instead of the sandbox's wall-clock timeout, which tells them
    nothing about their own program.
    """


#: The name the sandbox harness catches, so one harness serves both worlds.
#: ``robot_sim`` sets the same alias to its own error.
SimError = WorldError


class World:
    """One run of one level.

    Holds both records deliberately. ``commands`` is what the sandbox prints —
    names only. ``frames`` is what the replay builds for the browser to animate.
    One class, so the two can never drift into disagreeing about a rule.
    """

    def __init__(self, level: dict, *, enforce_offered: bool = True):
        self.width = int(level.get("grid_width", 6))
        self.depth = int(level.get("grid_depth", 6))

        start = level.get("start") or {}
        self.x = int(start.get("x", 0))
        self.z = int(start.get("z", 0))
        self.facing = start.get("facing", "north")
        if self.facing not in FACINGS:
            self.facing = "north"

        # Sparse, exactly as stored. A square absent from every set below is
        # bare floor at height 0.
        self.walls: set[tuple[int, int, int]] = set()
        self.platforms: set[tuple[int, int, int]] = set()
        self.items: set[tuple[int, int]] = set()
        self.goals: set[tuple[int, int]] = set()
        #: square -> the id of the door it opens
        self.buttons: dict[tuple[int, int], str] = {}
        #: door id -> the square it blocks
        self.doors: dict[str, tuple[int, int]] = {}

        for cell in level.get("cells") or []:
            x, z = int(cell["x"]), int(cell["z"])
            y = int(cell.get("y", 0))
            kind = cell.get("type", "floor")
            if kind == "wall":
                self.walls.add((x, z, y))
            elif kind == "platform":
                self.platforms.add((x, z, y))
            elif kind == "item":
                self.items.add((x, z))
            elif kind == "goal":
                self.goals.add((x, z))
            elif kind == "button":
                self.buttons[(x, z)] = str(cell.get("opens") or "")
            elif kind == "door":
                self.doors[str(cell.get("id") or f"door_{x}_{z}")] = (x, z)

        self.offered = set(level.get("commands") or COMMANDS)
        self.enforce_offered = enforce_offered
        self.max_steps = int(level.get("max_steps", 500))
        self.win = level.get("win")

        # The start's height is where it says, or the surface it stands on.
        self.y = int(start["y"]) if start.get("y") is not None else self.surface(self.x, self.z)
        self.carrying = 0
        self.pressed: set[tuple[int, int]] = set()
        self.opened: set[str] = set()
        self.steps = 0

        self.commands: list[str] = []
        self.frames: list[dict] = []

    # ─── Queries the rules are built on ──────────────────────────────

    def surface(self, x: int, z: int) -> int:
        """The height a character stands at on this square.

        One above the tallest platform there, or the floor when there is none.

        That "one above" is the whole of `specs/013-world-3d-climb`. A block
        occupies the floor it is recorded at, wall and platform alike, so
        standing on a platform means standing on top of it. Before, a
        platform's floor was the height a character stood *at*, which put the
        platform itself a floor below its own number: the two kinds of block
        counted differently, the editor's one floor control meant two things,
        and a platform placed on floor 0 raised the surface to 0, where it
        already was. The teacher's first click did nothing and drew nothing.

        Walls are not walkable and contribute nothing here; they block in
        ``_walled`` instead.
        """
        tops = [y for (px, pz, y) in self.platforms if px == x and pz == z]
        return max(tops) + 1 if tops else 0

    def _door_at(self, x: int, z: int) -> str | None:
        """The id of a closed door on this square, or None."""
        for door_id, (dx, dz) in self.doors.items():
            if (dx, dz) == (x, z) and door_id not in self.opened:
                return door_id
        return None

    def _walled(self, x: int, z: int, standing: int) -> bool:
        """Is a wall in the way of standing at this height on this square?

        A wall at or above the height being stood at blocks. Standing higher
        than every wall on the square — on a platform above it — does not.
        """
        return any(wx == x and wz == z and wy >= standing for (wx, wz, wy) in self.walls)

    def _in_bounds(self, x: int, z: int) -> bool:
        return 0 <= x < self.width and 0 <= z < self.depth

    def _refusal(self, x: int, z: int, climb_limit: int) -> str | None:
        """Why the character may not move onto (x, z), or None if it may."""
        if not self._in_bounds(x, z):
            return "edge"
        if self._door_at(x, z) is not None:
            return "door_closed"
        target = self.surface(x, z)
        if self._walled(x, z, target):
            return "wall"
        if target - self.y > climb_limit:
            return "too_high"
        return None

    def _ahead(self) -> tuple[int, int]:
        dx, dz = DELTA[self.facing]
        return self.x + dx, self.z + dz

    @property
    def here(self) -> tuple[int, int]:
        return self.x, self.z

    # ─── Performing one command ──────────────────────────────────────

    def perform(self, name: str, arg: int | None = None) -> dict:
        """Run one command and record a frame. Returns that frame.

        Every path through here appends exactly one frame and, for an action,
        spends exactly one step — including a refused move. A wall that silently
        costs nothing teaches a child that bumping into things is free, and makes
        the shortest-solution answer disagree with what they watched happen.
        """
        if name not in COMMANDS:
            raise WorldError("not_offered")
        if self.enforce_offered and name not in self.offered:
            raise WorldError("not_offered")

        if name in ACTIONS:
            if self.steps >= self.max_steps:
                raise StepsExhaustedError()
            self.steps += 1

        self.commands.append(name)
        changed: list[dict] = []
        refusal: str | None = None
        motion = "none"

        if name in ("move_forward", "jump"):
            limit = WALK_CLIMB if name == "move_forward" else JUMP_CLIMB
            nx, nz = self._ahead()
            refusal = self._refusal(nx, nz, limit)
            if refusal is None:
                target = self.surface(nx, nz)
                if name == "jump":
                    motion = "jump"
                elif target > self.y:
                    motion = "climb"
                elif target < self.y:
                    motion = "fall"
                else:
                    motion = "walk"
                self.x, self.z, self.y = nx, nz, target

        elif name == "turn_left":
            self.facing = FACINGS[(FACINGS.index(self.facing) + 3) % 4]
            motion = "turn"

        elif name == "turn_right":
            self.facing = FACINGS[(FACINGS.index(self.facing) + 1) % 4]
            motion = "turn"

        elif name == "take":
            if self.here in self.items:
                self.items.discard(self.here)
                self.carrying += 1
                changed.append({"x": self.x, "z": self.z, "y": self.y, "item": False})
            else:
                refusal = "nothing_here"

        elif name == "drop":
            if self.carrying <= 0:
                refusal = "hands_empty"
            elif self.here in self.items:
                refusal = "square_taken"
            else:
                self.items.add(self.here)
                self.carrying -= 1
                changed.append({"x": self.x, "z": self.z, "y": self.y, "item": True})

        elif name == "press":
            # Never refuses: pressing with nothing in front is a thing a child
            # tries, and it costs the step. What it must not do is open a door
            # other than the one its button names.
            ahead = self._ahead()
            if ahead in self.buttons:
                if ahead not in self.pressed:
                    self.pressed.add(ahead)
                    changed.append(
                        {
                            "x": ahead[0],
                            "z": ahead[1],
                            "y": self.surface(*ahead),
                            "pressed": True,
                        }
                    )
                door_id = self.buttons[ahead]
                # One-way. Pressing twice must not close it again, or a level
                # works only as long as the child does not experiment.
                if door_id in self.doors and door_id not in self.opened:
                    self.opened.add(door_id)
                    dx, dz = self.doors[door_id]
                    changed.append({"x": dx, "z": dz, "y": self.surface(dx, dz), "open": True})

        frame = {
            "i": len(self.frames),
            "cmd": name,
            "ok": refusal is None,
            "x": self.x,
            "z": self.z,
            "y": self.y,
            "facing": self.facing,
            "motion": motion,
            "carrying": self.carrying,
            "items_left": len(self.items),
            "cells": changed,
            "msg": refusal,
        }
        self.frames.append(frame)
        return frame

    def sense(self, name: str) -> bool:
        """Answer a sensor. Costs no step and records no frame."""
        if self.enforce_offered and name not in self.offered:
            raise WorldError("not_offered")
        x, z = self._ahead()

        if name == "wall_ahead":
            if not self._in_bounds(x, z):
                return True
            if self._door_at(x, z) is not None:
                return True
            return self._walled(x, z, self.surface(x, z))
        if name == "gap_ahead":
            return self._in_bounds(x, z) and self.surface(x, z) < self.y
        if name == "step_ahead":
            return self._in_bounds(x, z) and self.surface(x, z) == self.y + 1
        if name == "item_here":
            return self.here in self.items
        if name == "at_goal":
            return self.here in self.goals
        if name == "button_ahead":
            return (x, z) in self.buttons and (x, z) not in self.pressed
        if name == "door_ahead":
            return self._door_at(x, z) is not None
        raise WorldError("not_offered")

    # ─── State, for the search ───────────────────────────────────────

    def snapshot(self) -> tuple:
        """Everything a command can change, as a hashable value.

        The shortest-solution search walks a great many states. Building a fresh
        ``World`` for each would mean re-parsing the level every time, and
        re-deriving the rules by hand would mean a second copy of them. This is
        the third option: one world, restored between expansions.
        """
        return (
            self.x,
            self.z,
            self.y,
            self.facing,
            self.carrying,
            frozenset(self.items),
            frozenset(self.pressed),
            frozenset(self.opened),
            self.steps,
        )

    def restore(self, snap: tuple) -> None:
        (
            self.x,
            self.z,
            self.y,
            self.facing,
            self.carrying,
            items,
            pressed,
            opened,
            self.steps,
        ) = snap
        self.items = set(items)
        self.pressed = set(pressed)
        self.opened = set(opened)

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
        if cond == "all_buttons_pressed":
            return set(self.buttons) <= self.pressed
        if cond == "all_doors_open":
            return set(self.doors) <= self.opened
        if cond == "at":
            return self.here == (int(node["x"]), int(node["z"]))
        if cond == "height_at_least":
            return self.y >= int(node["n"])
        if cond == "steps_at_most":
            return self.steps <= int(node["n"])
        raise ValueError(f"unknown condition: {cond}")


def replay(level: dict, commands: list) -> dict:
    """Run a recorded command list against a fresh world. This is the verdict.

    What the server calls. No pupil code is present, so nothing here can be
    tampered with — the worst a doctored list can do is describe a run that
    loses.
    """
    world = World(level, enforce_offered=True)
    stopped = "end_of_program"
    for entry in commands:
        name = entry if isinstance(entry, str) else entry[0]
        try:
            world.perform(name)
        except StepsExhaustedError:
            stopped = "steps_exhausted"
            break
        except WorldError:
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
# Bound to a module-level world so a pupil writes ``move_forward()`` and not
# ``player.move_forward()`` — seven characters off every line they type, on
# lines they type twenty times.

WORLD: World | None = None


def _act(name: str) -> None:
    WORLD.perform(name)


def move_forward() -> None:
    _act("move_forward")


def turn_left() -> None:
    _act("turn_left")


def turn_right() -> None:
    _act("turn_right")


def jump() -> None:
    _act("jump")


def take() -> None:
    _act("take")


def drop() -> None:
    _act("drop")


def press() -> None:
    _act("press")


def wall_ahead() -> bool:
    return WORLD.sense("wall_ahead")


def gap_ahead() -> bool:
    return WORLD.sense("gap_ahead")


def step_ahead() -> bool:
    return WORLD.sense("step_ahead")


def item_here() -> bool:
    return WORLD.sense("item_here")


def at_goal() -> bool:
    return WORLD.sense("at_goal")


def button_ahead() -> bool:
    return WORLD.sense("button_ahead")


def door_ahead() -> bool:
    return WORLD.sense("door_ahead")


def _boot(level_json: str) -> World:
    """Called by the generated sandbox program before the pupil's code runs."""
    global WORLD
    WORLD = World(json.loads(level_json))
    return WORLD

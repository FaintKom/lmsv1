# Data model — Climbing a floor, made visible

Phase 1 of [plan.md](plan.md). What a level records, and what a floor number
means. This **corrects** `specs/012-world-3d-rework/data-model.md`, which states
the old meaning of a platform's floor. That document is to be changed when this
ships, not left standing beside this one as a second truth.

No field is added, removed or renamed. What changes is what one number means.

## The stored level

Unchanged in shape. A level is the exercise's `config`:

```json
{
  "grid_width": 3,
  "grid_depth": 3,
  "start": { "x": 0, "z": 2, "y": 0, "facing": "north" },
  "cells": [
    { "x": 0, "z": 1, "type": "goal" },
    { "x": 1, "z": 1, "y": 0, "type": "platform" },
    { "x": 2, "z": 1, "y": 0, "type": "wall" },
    { "x": 2, "z": 0, "type": "door", "id": "gate" },
    { "x": 1, "z": 2, "type": "button", "opens": "gate" }
  ],
  "commands": ["move_forward", "turn_left", "turn_right", "jump", "at_goal"],
  "win": { "cond": "at_goal" },
  "max_steps": 500,
  "star_steps": 4,
  "star_size": 3,
  "solution_code": null,
  "hints": [],
  "preset": "climbing"
}
```

## A floor, and what stands on it

**A block recorded at floor `N` occupies floor `N`.** One sentence, both kinds of
block, and it is the whole of this feature.

| Kind | Occupies | Can be stood on | A character standing there is at |
|---|---|---|---|
| `wall` | floor `y` | no | — |
| `platform` | floor `y` | yes | `y + 1` |

Surface-level things — `goal`, `item`, `button`, `door` — sit on whatever surface
their square has and carry no floor of their own. A `y` on one of them is
ignored, as it is today.

### Before and after

The same stored cell, `{ "x": 1, "z": 1, "y": 0, "type": "platform" }`:

| | Occupies | A character on it stands at | Drawn |
|---|---|---|---|
| Before | floor −1 | 0 | from one floor below the ground up to the ground — invisible |
| After | floor 0 | 1 | from the ground up one floor — a step |

Nothing in the file changed. A level saved before this feature and read after it
describes a different world, which is why production holding zero `world_3d`
rows is what makes the change permissible at all.

## Surface

**Surface** is the height a character stands at on a square:

> one above the highest platform on that square, or the ground when there is
> none.

That is the only definition, and it is implemented twice — once on the server,
where it decides the outcome, and once on the front, where it draws a level
before any program has run. Both must give the same answer for the same level. A
check that replays a server trace on the client and compares heights step by step
is what holds them together.

## Moving between floors

Unchanged by this feature, and stated here because nothing on screen states it
today:

| Command | Climbs at most |
|---|---|
| `move_forward` | one floor |
| `jump` | two floors |

Descending is unbounded: walking off a ledge lands on whatever surface is below,
however far down, and the character is unharmed.

A movement onto a square is refused for exactly one of four reasons, and the
reason is recorded, so the scene and the pupil both get the right one:

| Refusal | Meaning |
|---|---|
| `edge` | the square is off the board |
| `wall` | a wall occupies the height being moved into |
| `door_closed` | a closed door stands on the square |
| `too_high` | the surface there is further up than this command can climb |

`too_high` is the one this feature makes reachable in practice, because until now
a teacher could barely build a level with a step in it.

## Movement, as recorded on a frame

Unchanged. Each step of a run records what the movement was, and the scene reads
it to choose an animation:

| Movement | When |
|---|---|
| `walk` | moved to a square at the same height |
| `climb` | moved to a square higher up, within the command's limit |
| `jump` | jumped, whether or not the height changed |
| `fall` | moved to a square lower down |
| `turn` | turned on the spot |
| `none` | the command changed no position |

The jetpack fires on `climb` and `jump`, and not on `walk` or `fall`. That is
what makes the three tell apart on screen, and it needs no new field, because
the frame already carries the distinction.

## Validation, where the meaning bites

One rule changes with the definition.

**A goal under a platform.** The rule refuses a level where a platform buries the
flag. It used to test for a platform above floor 0, because floor 0 was the
ground. Every platform now stands above the ground, so the rule becomes: *any
platform on the goal's square buries it.*

Every other rule in the validator is unaffected — a start inside a wall, two
goals, an item where nothing can stand, a button with no door, a door with no
button, a win condition asking for what the level does not hold, a sensor with
nothing to act on. None of them reads a platform's floor.

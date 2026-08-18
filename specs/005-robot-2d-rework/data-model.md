# Phase 1 data model — Robot 2D rework

**Feature**: `specs/005-robot-2d-rework` · **Date**: 2026-08-18

Every value below is synthetic.

## No migration

Nothing here changes the database schema. A level lives in `exercises.config`, a
JSONB column that already exists, and a submission lives in
`exercise_submissions.answers`, likewise JSONB. Constitution: schema changes go
through Alembic — there is no schema change to put through it.

No dates are added anywhere. The timestamps a submission carries — `submitted_at`
and `graded_at` — are existing columns this feature does not touch.

The owner confirmed no robot levels exist in production, so the shape below
replaces the old one outright. There is no compatibility reader.

---

## Level — `exercises.config` where `exercise_type = 'robot_2d'`

```json
{
  "grid_width": 6,
  "grid_height": 6,
  "start": { "x": 0, "y": 5, "facing": "right" },
  "cells": [
    { "x": 5, "y": 0, "type": "goal" },
    { "x": 2, "y": 3, "type": "wall" },
    { "x": 1, "y": 1, "type": "item" },
    { "x": 4, "y": 4, "type": "empty", "mark": true },
    { "x": 3, "y": 2, "type": "empty", "value": 7 }
  ],
  "commands": [
    "move_forward", "turn_left", "turn_right",
    "take", "paint", "wall_ahead", "at_goal"
  ],
  "win": {
    "op": "and",
    "of": [{ "cond": "at_goal" }, { "cond": "all_marks_painted" }]
  },
  "max_steps": 500,
  "star_steps": 8,
  "star_size": 4,
  "solution_code": "while not at_goal():\n    move_forward()\n",
  "hints": ["Paint before you move on."],
  "preset": "intermediate"
}
```

| Field | Type | Rule |
|---|---|---|
| `grid_width`, `grid_height` | int | 2–10 each. FR-022 sets them as numbers, not from a fixed list. |
| `start` | object | Exactly one. `facing` is one of `up`/`right`/`down`/`left`. Must not sit on a wall (FR-020). |
| `cells` | array | Sparse. A position absent from the list is empty floor with no mark and no value. |
| `commands` | array | The offered set (FR-013). Drives palette, autocompletion and starter header from this one list (FR-014). |
| `win` | object | Expression tree, below. |
| `max_steps` | int | Default 500. The allowance of FR-004. |
| `star_steps` | int or null | Second-star threshold (FR-028). Filled by Check (FR-017). |
| `star_size` | int or null | Third-star threshold, in statements. |
| `solution_code` | string or null | The reference solution. **Already stripped** for non-staff readers by `router.py:531` — research Finding G. |
| `hints` | array of string | Unchanged from today. |
| `preset` | string | A label only. `commands` is the single record of what the level offers (FR-021). |

Removed from the old shape: `available_blocks` (never read), `custom_win_js`
(executable code shipped to the pupil), `win_condition`, `difficulty` as a source
of truth, `target_steps`, `optimal_blocks`.

### Cell

```json
{ "x": 4, "y": 4, "type": "empty", "mark": true, "value": 7 }
```

| Field | Type | Rule |
|---|---|---|
| `x`, `y` | int | Within the grid. `y` grows downward, as today. |
| `type` | enum | `empty` · `wall` · `item` · `goal`. The start is not a cell type; it lives in `start`. |
| `mark` | bool, optional | This floor is meant to be painted. A wall may not carry it. |
| `value` | int, optional | This floor carries a number `read` returns. A wall may not carry it. |

`painted` is **not** stored on the level. It is run state — a cell begins
unpainted every run.

Validation, surfaced together by FR-020:

- exactly one `goal` when the win condition mentions one
- `start` not on a wall; no `item` on a wall
- no two cells at the same `(x, y)`
- `mark` and `value` only on `empty` or `item`
- every cell inside the grid, after a resize as well as before

### Win condition

A tree. Branches are `and`, `or`, `not`; leaves name a condition.

```json
{ "op": "not", "of": [{ "cond": "facing", "dir": "down" }] }
```

| Branch | Shape | Rule |
|---|---|---|
| `and`, `or` | `{ "op": "and", "of": [ … ] }` | One or more children. |
| `not` | `{ "op": "not", "of": [ … ] }` | Exactly one child. |

| Leaf | Shape | True when |
|---|---|---|
| `at_goal` | `{ "cond": "at_goal" }` | the robot stands on the goal |
| `all_items_taken` | `{ "cond": "all_items_taken" }` | no `item` cell remains on the grid |
| `all_marks_painted` | `{ "cond": "all_marks_painted" }` | every cell with `mark` has been painted |
| `facing` | `{ "cond": "facing", "dir": "up" }` | the robot faces `dir` |
| `steps_at_most` | `{ "cond": "steps_at_most", "n": 12 }` | the run used `n` steps or fewer |
| `all_values_read` | `{ "cond": "all_values_read" }` | every cell with a `value` was read at least once |
| `values_total` | `{ "cond": "values_total", "n": 21 }` | the values now on the grid sum to `n` |

Not a leaf, and deliberately: arbitrary code. FR-029.

An expression naming a condition the grid cannot satisfy — painting where nothing
is marked, a total where nothing carries a value — is refused at save (FR-032).

---

## Command list — what the sandbox returns

The sandbox's whole output. It is not a verdict; see research Finding B.

```json
{
  "commands": ["move_forward", "move_forward", "turn_left", "paint"],
  "output": "7\n",
  "output_truncated": false,
  "error": {
    "type": "NameError",
    "line": 4,
    "message": "name 'movee_forward' is not defined"
  }
}
```

| Field | Type | Rule |
|---|---|---|
| `commands` | array of string | In attempt order, capped at `max_steps`. Names only — no coordinates, no outcomes. |
| `output` | string | What the pupil printed. Capped at 8 KB. |
| `output_truncated` | bool | Whether that cap was hit. |
| `error` | object or null | `line` counts from the first line of the pupil's program (research Finding A). |

A run that ends in an error still returns the commands attempted before it, so
the pupil watches the robot walk up to the point it broke.

---

## Run result — what the server returns, and what it records

Produced by replaying `commands` through `robot_sim` on the server.

```json
{
  "frames": [
    { "i": 0, "cmd": "move_forward", "ok": true,
      "x": 0, "y": 4, "facing": "up", "taken": 0, "carrying": 0,
      "cells": [], "msg": null },
    { "i": 1, "cmd": "paint", "ok": true,
      "x": 0, "y": 4, "facing": "up", "taken": 0, "carrying": 0,
      "cells": [{ "x": 0, "y": 4, "painted": true }], "msg": null },
    { "i": 2, "cmd": "move_forward", "ok": false,
      "x": 0, "y": 4, "facing": "up", "taken": 0, "carrying": 0,
      "cells": [], "msg": "wall" }
  ],
  "won": false,
  "steps": 3,
  "size": 3,
  "stars": 0,
  "stopped": "end_of_program",
  "output": "7\n",
  "error": null
}
```

| Field | Type | Meaning |
|---|---|---|
| `frames` | array | One per attempted command. `cells` lists only what that command changed, so the payload stays small on a 10×10 grid. |
| `won` | bool | The server's verdict, from evaluating `win` after the replay. FR-008. |
| `steps` | int | Commands performed, refusals included. FR-027. |
| `size` | int | Statements in the program that ran, counted with `ast`. FR-028. |
| `stars` | 0–3 | From `won`, `steps` against `star_steps`, `size` against `star_size`. FR-009. |
| `stopped` | enum | `end_of_program` · `steps_exhausted` · `error`. |
| `output` | string | Passed through. |
| `error` | object or null | Passed through. |

`msg` on a refused frame is a short reason — `wall`, `edge`, `no_item`,
`no_value`, `not_offered` — which the player turns into a sentence in the pupil's
language. FR-023: the reason is a key, never an English string.

---

## Submission — `exercise_submissions.answers`

```json
{
  "robot": {
    "source": "while not at_goal():\n    move_forward()\n",
    "mode": "python",
    "won": true,
    "steps": 6,
    "size": 2,
    "stars": 3
  }
}
```

`source` is what the pupil wrote — for block mode, the Python their blocks
generated. Everything beside it is the server's own figures from its own replay.
Nothing the client sent about the outcome is stored, which is FR-008 and the
close of Constitution III for this type.

`score` on the row is `stars / 3 * 100`; `passed` is `won`.

---

## Run state — held only while a run is replayed

Never stored, never sent. Listed because the simulator needs it and the search
enumerates it.

| Field | Type |
|---|---|
| position | `(x, y)` |
| facing | `up` · `right` · `down` · `left` |
| carrying | int — items picked up and not put down |
| grid items | which `item` cells remain |
| painted | which cells have been painted; one-way (FR-033) |
| values | current value of each valued cell |
| values read | which valued cells `read` has visited |
| steps | int |

The search in `robot_solver.py` walks `(x, y, facing, items_mask, painted_mask)`
and stops at 12 targets combined — research Finding D. `values` and `values read`
sit outside the search entirely, which is the limit FR-035 makes the editor
declare.

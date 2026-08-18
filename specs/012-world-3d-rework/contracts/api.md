# API contract — World 3D rework

Three new endpoints and one changed submission path. All under
`/api/v1/exercises`, all authenticated, all scoped to the caller's organisation:
another school's exercise reads as **404**, never 403 (Constitution I).

The shapes deliberately match the 2D routes. A reader who knows `/robot/run`
knows this one, and the two cannot drift apart unnoticed.

## POST `/{exercise_id}/world/run`

Run a program against a saved level. **Free** — it never consumes an attempt
(FR-008).

Any authenticated user who can see the exercise. Rate-limited per user, on the
same allowance the 2D route uses.

**Request**

```json
{"source": "while not at_goal():\n    move_forward()\n", "mode": "python"}
```

`mode` is `python` or `blocks`, and is informational: blocks arrive already
translated to Python, and both take the same path (FR-003).

**Response 200** — the Run of [data-model.md](../data-model.md#run--what-a-program-did).

```json
{
  "frames": [{"i": 0, "x": 0, "z": 1, "y": 0, "facing": "north", "ok": true, "motion": "walk", "cells": []}],
  "won": false, "steps": 1, "size": 2, "stars": 0,
  "stopped": "end_of_program",
  "output": "", "output_truncated": false,
  "error": null
}
```

**400** — the request carried no program.
**404** — no such exercise, not this organisation's, or not a 3D level.
**429** — too many runs.
**503** — the sandbox did not answer. Nothing is recorded; the pupil's work is
intact and Run can be pressed again.

## POST `/world/preview`

Run a program against a level that has **not been saved** — the editor's
playtest, and its reference-solution check (FR-028, FR-029).

**Staff only**: teacher, methodist or admin. A pupil gets 403 here rather than
404, because the route is not about a particular exercise and so hides nothing.

**Request**

```json
{"config": { "…a whole Level…": true }, "source": "move_forward()\n"}
```

**200**: the same Run shape as above.

## POST `/world/solve`

Answer the editor's Check: the shortest solution, or why there is none
(FR-026). Staff only.

**Request**

```json
{"config": { "…a whole Level…": true }}
```

**200** — the Solve of [data-model.md](../data-model.md#solve--the-answer-to-check).

```json
{"answer": "shortest", "steps": 7, "size": null, "reason": null, "blockers": []}
```

```json
{"answer": "unsolvable", "steps": null, "size": null, "reason": null,
 "blockers": [{"code": "button_without_door"}, {"code": "no_goal"}]}
```

```json
{"answer": "reference_only", "steps": 12, "size": 9, "reason": "too_many_targets", "blockers": []}
```

`reason` says why no search ran; `blockers` says what is wrong with the level.
One field cannot do both jobs — 2D tried, and its tests said so.

## POST `/{exercise_id}/submit` — changed

The request gains a `world` object, and the server stops believing the client.

**Request**

```json
{"world": {"source": "move_forward()\n", "mode": "python"}}
```

**What the server does** (FR-009 … FR-012):

1. Runs the submitted program itself, by the same path as `/world/run`.
2. Decides `passed` from its own replay.
3. **Ignores** `game_result` entirely — `completed`, `score` and `steps_used`
   included. A submission claiming a win it did not earn is recorded as not
   passed.
4. Records the attempt either way. A losing submission still costs an attempt;
   running is what is free.
5. Stores what it observed — steps, size, stars — under `answers.world`, never
   what was sent.

**400** — no `world.source`.
**503** — the sandbox did not answer: nothing recorded, no attempt consumed.

## Reading an exercise — same route, one more secret

`solution_code` is stripped from the configuration for anyone who is not staff,
by the helper that already strips it for 2D, through **every** read: the single
exercise, the list, and the by-lesson list (FR-030, SC-009).

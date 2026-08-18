# API contract — Robot 2D rework

**Feature**: `specs/005-robot-2d-rework` · **Date**: 2026-08-18

Shapes reference [`../data-model.md`](../data-model.md) rather than repeating it.
Every value is synthetic.

All four routes live in `backend/app/exercises/router.py`. Tenant scoping is the
existing per-domain guard — an exercise belonging to another school reads as 404,
never 403 (Constitution I).

---

## `POST /api/v1/exercises/{exercise_id}/robot/run`

Run a program against a saved level. Persists nothing, consumes no attempt
(FR-026).

**Who**: any user who may read the exercise — pupil, parent, staff.

**Rate limit**: `@limiter.limit(lambda: settings.robot_run_rate_limit)`, default
`60/minute`. The deferred form, so the limit is tunable by environment without a
deploy (research Finding H).

**Request**

```json
{ "source": "while not at_goal():\n    move_forward()\n", "mode": "python" }
```

| Field | Type | Rule |
|---|---|---|
| `source` | string | 1–20 000 characters. For block mode, the Python the blocks generated. |
| `mode` | enum | `python` · `blocks`. Recorded for analytics; it does not change how the program runs. |

Note what is absent: no `completed`, no `score`, no `steps`. The client has
nothing to assert (FR-008).

**Response `200`** — the run result of `data-model.md`.

```json
{
  "frames": [ … ],
  "won": true,
  "steps": 6,
  "size": 2,
  "stars": 3,
  "stopped": "end_of_program",
  "output": "",
  "error": null
}
```

`200` is returned for a program that fails to compile as well. A `SyntaxError` is
a result the pupil needs to read, not a bad request:

```json
{
  "frames": [],
  "won": false, "steps": 0, "size": 0, "stars": 0,
  "stopped": "error",
  "output": "",
  "error": { "type": "SyntaxError", "line": 2, "message": "expected ':'" }
}
```

**Errors**

| Status | When |
|---|---|
| `400` | `source` empty or over the cap |
| `404` | no such exercise, or it belongs to another school, or it is not `robot_2d` |
| `429` | over the rate limit — the player says so plainly (SC-010) |
| `503` | the sandbox did not answer. Nothing recorded, no attempt consumed (spec Assumptions) |

---

## `POST /api/v1/exercises/robot/preview`

Run a program against a level that has not been saved. The editor's playtest
(FR-018), and the check behind a reference solution (FR-019).

**Who**: staff only — the same check as editing an exercise. A pupil calling it
gets 403, because the caller supplies the level and could otherwise author a
trivial one.

**Request**

```json
{
  "config": { "grid_width": 6, "…": "a full level, as in data-model.md" },
  "source": "move_forward()\nmove_forward()\n"
}
```

**Response `200`**: identical shape to `/robot/run`.

**Errors**: `400` for a config that fails validation, listing every reason at
once (FR-020) rather than the first:

```json
{
  "detail": {
    "blockers": [
      { "code": "no_start" },
      { "code": "win_needs_marks_none_present" },
      { "code": "sensor_without_facing", "commands": ["wall_ahead"] }
    ]
  }
}
```

`code` is a key, never a sentence — the editor renders it in the teacher's
language (FR-023).

---

## `POST /api/v1/exercises/robot/solve`

Answer whether a level can be finished, and in how few steps. The Check button
(FR-016).

**Who**: staff only.

**Request**

```json
{ "config": { "…": "a full level" } }
```

**Response `200`** — one of three answers, and it always says which (FR-035,
SC-011).

Solvable, searched exhaustively:

```json
{ "answer": "shortest", "steps": 8, "size": null, "reason": null, "blockers": [] }
```

Not searched — too many targets, or the win condition mentions values. `reason`
says which, and `steps` comes from running the teacher's reference solution
instead:

```json
{
  "answer": "reference_only",
  "steps": 11,
  "size": 4,
  "reason": "win_uses_values",
  "blockers": []
}
```

Searched, and there is no path:

```json
{ "answer": "unsolvable", "steps": null, "size": null, "reason": null, "blockers": [ … ] }
```

| Field | Type | Meaning |
|---|---|---|
| `answer` | enum | `shortest` · `reference_only` · `unsolvable` |
| `steps` | int or null | Fills `star_steps` (FR-017), labelled by `answer` |
| `size` | int or null | Fills `star_size`; present only with a reference solution that wins |
| `reason` | enum or null | `too_many_targets` · `win_uses_values` |
| `blockers` | array | Same shape as `/robot/preview` |

`reason` and `blockers` answer different questions, and the split is deliberate.
`reason` says why no search was run — the teacher needs that whether or not they
have written a solution. Whether a *usable* solution exists is a blocker
(`no_reference_solution`), because it is a thing they can go and fix. A reference
solution that loses reports its figures nowhere: a run that did not finish the
level is not evidence the level can be finished.

`answer` exists so the editor can never render a reference-solution figure as an
optimum. A client that ignores it is a defect the tests catch.

---

## `POST /api/v1/exercises/{exercise_id}/submit` — changed

The existing submit route. For `robot_2d` the payload changes and the grading
moves.

**Request**

```json
{
  "robot": {
    "source": "while not at_goal():\n    move_forward()\n",
    "mode": "python"
  },
  "elapsed_seconds": 94
}
```

`elapsed_seconds` is the existing integer field, clamped server-side as it is
today. No date or timestamp is sent by the client.

`game_result` is no longer read for `robot_2d`. A request that still sends it is
accepted and the field ignored — an old client cannot forge a pass, it simply
gets graded on its code.

**Response**: the existing `ExerciseSubmissionResponse`. `score` is
`stars / 3 * 100`, `passed` is the server's `won`, and `answers.robot` holds the
figures from the server's own replay (`data-model.md`).

A submission whose program does not win is recorded, `passed: false`, and
consumes an attempt. That is the point: the pupil pressed Submit.

**What must be true after this change**

- `_submit_game_level` no longer reads `completed` or `score` from the body for
  `robot_2d`. `math_interactive` keeps the old path — out of scope, still tracked
  by `specs/004-exercise-answer-leak`.
- Experience is awarded on the server's `won`, never on the client's word.

---

## Sandbox — unchanged

No new endpoint, no change to `sandbox/runner/`. The runner keeps taking
`{language, source_code, stdin, timeout_seconds, memory_limit_mb}` and returning
`{stdout, stderr, exit_code, execution_time_ms, status}`.

`robot_runner.py` calls the existing `execute_code_remote` with
`language="python"`, 5 seconds, 128 MB (research Finding I), and reads the command
list off the last sentinel line of `stdout` (research Finding C).

That the sandbox needs no change is the reason this design was chosen over one
that gives it a robot-shaped API.

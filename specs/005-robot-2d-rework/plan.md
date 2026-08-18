# Implementation Plan: Robot 2D rework

**Branch**: `feat/robot-2d-rework` | **Date**: 2026-08-18 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/005-robot-2d-rework/spec.md`

## Summary

Robot 2D teaches programming by driving a robot across a grid, in blocks or in
Python. Today `while` never loops, "Python" is a set of regular expressions, the
teacher's command choice is discarded, nobody can ask whether a level is
solvable, and the browser declares its own victory — the last being the deferred
half of `specs/004-exercise-answer-leak` and a live breach of Constitution III.

The approach is one move: **the world's rules live once, in Python, and the
server is the only thing that judges a run.**

A pupil's program goes to the existing sandbox container, which answers a single
question — which commands did this program attempt, in what order? The server
replays that list through its own copy of the simulator, with no pupil code
present, and the replay produces the frames, the step count and the verdict.
Blocks already generate Python, so both editors take the same path, and the
frontend stops holding rules at all: it renders frames it is handed.

That deletes more than it adds — `grid-engine.ts`'s rules, both hand-written
parsers, and the control-flow half of `StepExecutor` all go — and it is what
makes the teacher's editor possible, because a Check button needs a simulator
that can be trusted to run six steps faithfully.

Full reasoning in [research.md](research.md); shapes in
[data-model.md](data-model.md); routes and the child-facing command surface in
[contracts/](contracts/).

## Technical Context

**Language/Version**: Python 3.12 (backend, simulator, sandbox), TypeScript 5 /
React 19 (frontend)

**Primary Dependencies**: FastAPI, SQLAlchemy 2 async, Pydantic v2; Next.js 16,
Blockly, Monaco. **Nothing new is added on either side** — the sandbox, the rate
limiter and the answer-stripping all exist.

**Storage**: PostgreSQL 16. **No migration**: a level is `exercises.config`
(JSONB), a submission is `exercise_submissions.answers` (JSONB), both existing
columns.

**Testing**: pytest against real PostgreSQL; Vitest; Playwright against the
ephemeral QA stack.

**Target Platform**: Linux containers behind nginx; the browser for player and
editor.

**Project Type**: web application — `backend/` and `frontend/`, plus the existing
`sandbox/` runner, which this feature does not modify.

**Performance Goals**: the robot starts moving within 3 s of Run, 19 runs in 20
(SC-009). Not yet measured — research Finding J says so, quickstart §7 says how.

**Constraints**: a run costs 5 s / 128 MB in the sandbox, capped at `max_steps`
(default 500) commands. Rate limit `60/minute` per user, in the deferred form so
it is tunable by environment. The shortest-solution search is capped at 12
targets and is not attempted at all where the win condition mentions values.

**Scale/Scope**: grids at most 10×10. Roughly 4 new backend modules, 3 new
routes, 1 rewritten editor, 1 rewritten player, 3 deleted parsers.

## Constitution Check

*GATE: must pass before Phase 0. Re-checked after Phase 1 — result below.*

| Principle | How this plan satisfies it |
|---|---|
| **I — Tenant isolation is a rule** | `/robot/run` resolves the exercise through the same per-domain guard as every other exercise read; another school's id reads as 404, never 403. `/robot/preview` and `/robot/solve` take a config rather than an id and are staff-only, so they expose no row to scope. |
| **II — A test that cannot fail is worse than none** | Every test names the behaviour it would have caught. The forgery test carries its positive control in the same test (quickstart §3) — an assertion that only rejects passes against an endpoint that rejects everything, which is exactly the failure this principle was written from. |
| **III — The server is the only judge** | This is the feature. `_submit_game_level` stops reading `completed` and `score` for `robot_2d`; the verdict comes from the server's own replay. The sandbox's opinion is discarded by construction (research Finding B), so moving execution off the browser does not merely relocate the same hole. `solution_code` reuses the existing strip. |
| **IV — Product and docs tell the same story** | The only files describing the old robot config sit under `docs/superpowers/archive/`, which CLAUDE.md declares history and does not update. No README or landing claim depends on the old shape. The new command surface is documented in `contracts/commands.md`, which becomes the reference for teacher-facing help. |
| **V — The smallest change that works** | The net diff is negative in the frontend. Deleted: the rules in `grid-engine.ts`, `parseCommands`, `parsePythonCommands`, the `_while`/`_if` machinery in `StepExecutor`, `custom_win_js`, `available_blocks`, `difficulty` as a source of truth. No abstraction arrives without a second caller — `robot_sim.py` has three: the sandbox, the replay, and the search. |

**Post-Phase-1 re-check**: passes, with one thing worth naming. Phase 1 found
that FR-031 as first written would have hidden the goal from the pupil — not a
security property but a usability defect wearing its clothes. The spec was
corrected during planning rather than after: the win condition is the pupil's
instructions and is shown; the verdict is what never reaches them.

**Gates before merge** (Constitution, Development Workflow): `ruff` and the full
pytest suite against real PostgreSQL; frontend lint, `tsc --noEmit`, build, and
Vitest including the six-locale parity gate; Playwright against the QA stack.
`/speckit-analyze` runs before implementation — this feature touches grading and
an answer key, where the constitution makes it mandatory.

## Project Structure

### Documentation (this feature)

```text
specs/005-robot-2d-rework/
├── plan.md              # This file
├── spec.md              # What and why
├── research.md          # Phase 0 — ten findings, one of which changed the design
├── data-model.md        # Phase 1 — level, command list, run result, submission
├── contracts/
│   ├── api.md           # Phase 1 — the routes
│   └── commands.md      # Phase 1 — the surface children type against
├── quickstart.md        # Phase 1 — how to prove it works
├── checklists/
│   └── requirements.md  # Spec quality, from /speckit-specify
└── tasks.md             # Phase 2 — /speckit-tasks, not created here
```

### Source code

```text
backend/app/exercises/
├── robot_sim.py         # NEW — the rules. Standard library only, so its own
│                        #   source runs unmodified inside the sandbox.
├── robot_runner.py      # NEW — build the program, call execute_code_remote,
│                        #   read the command list off the sentinel line.
├── robot_solver.py      # NEW — breadth-first shortest solution, capped at 12
│                        #   targets, declines where values are involved.
├── robot_validate.py    # NEW — every blocker at once, as keys (FR-020).
├── router.py            # +3 routes
├── service.py           # _submit_game_level: robot_2d grades from its own run
└── schemas.py           # Robot2DConfig rewritten; run/solve request + response

backend/tests/
├── test_robot_sim.py        # NEW — the rules, including the while regression
├── test_robot_solver.py     # NEW — shortest, unsolvable, and the declines
├── test_robot_runner.py     # NEW — sentinel parsing, line numbers, caps
└── test_robot_submit.py     # NEW — forgery, with its positive control

frontend/src/components/game/
├── robot-2d/
│   ├── grid-engine.ts        # rules deleted; types kept
│   ├── grid-renderer.tsx     # renders a frame rather than an engine
│   ├── robot-2d-exercise.tsx # player: run → trace → play. Stale deps fixed,
│   │                         #   Monaco theme from isDark, strings translated.
│   └── robot-2d-editor.tsx   # the main work — palette, Check, playtest,
│                             #   reference solution, blockers, drag paint, i18n
├── engine/
│   ├── step-executor.ts      # DELETED
│   └── trace-player.ts       # NEW — play / pause / step / seek / speed
└── blockly/
    ├── toolbox-configs.ts    # toolbox built from config.commands
    └── custom-blocks.ts      # generators emit move_up(), not robot.move_up()

frontend/e2e/journeys/
└── robot-2d.spec.ts          # NEW — teacher builds, Check answers, pupil solves
```

**Structure Decision**: the existing `backend/` + `frontend/` split, with the
robot's rules as a leaf module inside the `exercises` feature package rather than
a new top-level module. It is not a service — it is four files the exercises
router, the submission service and the editor all call. The `sandbox/` tree is
untouched, which is the point of the design in research Finding B.

## Complexity Tracking

No constitution violations to justify.

One deliberate limitation, recorded rather than hidden: Check cannot give a
shortest-solution answer for a level whose win condition mentions values, because
`write(n)` makes the state space unbounded. The editor says which of the two
answers it is giving (FR-035, SC-011). The owner chose the full command
vocabulary knowing this; the alternative — deferring values to a later feature —
was offered and declined.

# Implementation Plan: World 3D rework

**Feature**: [spec.md](spec.md) · **Branch**: `feat/world-3d-rework` · **Date**: 2026-08-19

## Summary

Give `world_3d` the architecture 2D already has, and the look it never had.

The rules stop being TypeScript in the pupil's browser and become one Python
module that runs inside the existing sandbox. The sandbox reports which commands
were attempted; the server replays them against the real level, and that replay
is the verdict. Real `while`, real Python, real line numbers and server-side
grading all fall out of that one move — they are not four features.

On top of it, the level stops looking like a night-time spreadsheet: toon
shading, rounded shapes, drawn outlines, and a character with weight.

The work lands in five merged stages, each verified in production before the
next begins, because a broken trace and a broken shader are indistinguishable in
review if they ship together.

## Technical Context

**Language/Version**: Python 3.12 (backend, sandbox), TypeScript 5 strict + React 19 (frontend)
**Primary Dependencies**: FastAPI, SQLAlchemy 2 async, Pydantic v2 · Next.js 16, Three.js 0.185, @react-three/fiber 9.7, @react-three/drei 10.7, Blockly 13, Monaco
**Storage**: PostgreSQL 16 — the level lives in `exercises.config` as JSON; no schema change, no migration
**Testing**: pytest (asyncio auto) against real Postgres; Vitest; Playwright
**Target Platform**: browser, desktop and tablet; the sandbox container for execution
**Project Type**: web (backend + frontend)
**Performance Goals**: Run answers within 3s at the 95th percentile (SC-005); a
ten-by-ten level with every object type holds a smooth frame rate (SC-010)
**Constraints**: no new dependency — drei already ships `RoundedBox`, `Outlines`,
`ContactShadows`, `Float`, `Sky`; no external asset host (the page's CSP forbids
it); `prefers-reduced-motion` already collapses motion globally and the scene
must not fight it; six locales, or the file joins the i18n allowlist
**Scale/Scope**: levels at most 10×10 with a handful of heights; one exercise
type; zero existing rows to migrate

**Resolved rather than assumed** (see [research.md](research.md)): whether to
share code with 2D, how to keep the solver from exploding once buttons and doors
multiply the state space, and how to get a cartoon read without downloading a
model.

## Constitution Check

| Principle | How this feature satisfies it |
|---|---|
| **I. Tenant isolation** | Every new endpoint resolves the exercise through the same per-domain guard the 2D routes use; another school's exercise reads as 404, never 403. The staff-only routes (`/world/preview`, `/world/solve`) check role *and* organisation. |
| **II. A test that cannot fail** | Every refusal test ships with its positive control in the same test — a losing submission graded `passed=False` proves nothing without the winning one beside it. The 3D-specific traps (jump height, falling off a ledge, a door that must stay open) are written before the code that satisfies them. |
| **III. The server is the only judge** | The whole architecture exists for this. The sandbox returns a list of attempted command names — a thing with nothing to forge — and the verdict comes from a replay that runs no pupil code. Closes defect 5, and the last of spec 004. |
| **IV. Product and documentation agree** | `custom_win_js` is deleted rather than deprecated (spec 005's T071); the QA fixture, the lifecycle spec and the axis probe all move to the new shape in the same feature, so nothing is left describing the old world. |
| **V. The smallest change that works** | `robot_runner.py` is parameterised, not copied: one runner, two worlds. The trace player, the Blockly host and the exercise-renderer wiring are reused untouched. The scene is rebuilt because that is the requested outcome, not because it was convenient. |

No violations to justify. Nothing in [Complexity Tracking](#complexity-tracking)
is a principle traded away.

## Project Structure

### Documentation (this feature)

```
specs/012-world-3d-rework/
├── spec.md
├── plan.md              # this file
├── research.md          # the decisions, with what was rejected
├── data-model.md        # the level, the run, the frames
├── contracts/
│   ├── api.md           # the three endpoints and the submit change
│   └── commands.md      # the vocabulary a child types
├── quickstart.md        # how to prove it works, end to end
├── tasks.md             # produced by /speckit-tasks
└── checklists/requirements.md
```

### Source code

```
backend/app/exercises/
├── world_sim.py           # NEW — the rules, standard library only, runs in the sandbox
├── world_solver.py        # NEW — shortest solution, or why there is none
├── world_validate.py      # NEW — every fault in a level, at once
├── robot_runner.py        # CHANGED — parameterised by sim module; 2D behaviour unchanged
├── schemas.py             # CHANGED — World3DConfig rewritten; custom_win_js deleted
├── router.py              # CHANGED — /world/run, /world/preview, /world/solve
└── service.py             # CHANGED — _submit_world grades from the server's own run

backend/tests/
├── test_world_sim.py      # NEW — the vocabulary, one test per command
├── test_world_height.py   # NEW — walking, jumping, falling, ledges
├── test_world_doors.py    # NEW — buttons, doors, and what press() must not touch
├── test_world_win.py      # NEW — every win leaf, and and/or/not over them
├── test_world_solver.py   # NEW — shortest, unsolvable, and the escape hatch
├── test_world_validate.py # NEW — one code per fault, never a sentence
└── test_world_submit.py   # NEW — the server is the judge, with controls

frontend/src/components/game/world-3d/
├── world-3d-exercise.tsx   # REBUILT — TracePlayer, output pane, step/pause/speed
├── world-3d-editor.tsx     # REBUILT — palette, win builder, Check, playtest, preview
├── scene-engine.ts         # REDUCED — types and projection only; the rules deleted
├── legacy-step-executor.ts # DELETED — its last reader goes with it
└── scene/                  # NEW — the look
    ├── world-scene.tsx     #   canvas, lights, camera rig
    ├── toon.ts             #   the gradient ramp and the token palette
    ├── character.tsx       #   chibi figure: idle, walk, turn, jump, bump
    ├── props.tsx           #   wall, platform, item, button, door, goal
    └── ground.tsx          #   floor, contact shadows, sky

frontend/e2e/journeys/world-3d.spec.ts   # NEW — the chain a school actually uses
qa/exercise-fixtures.json                # CHANGED — the world_3d level, new shape
```

## The five stages

Each ends: CI green → merge → watch the deploy → confirm the change in
production → next. Nothing starts before the previous stage is live.

| Stage | Lands | Proven by |
|---|---|---|
| **1. The rules** | `world_sim`, solver, validator, schema, endpoints, server-side grading | pytest against real Postgres; a claimed win refused, with the genuine win beside it |
| **2. The runtime** | Exercise view on the trace player; the two dead executors deleted | A loop run in blocks and in Python in the browser, taking identical paths |
| **3. The look** | The whole `scene/` directory; `scene-renderer.tsx` retired | Screenshots at both themes and both widths; a reduced-motion pass; frame rate on a full 10×10 |
| **4. The teacher** | Editor rebuilt to the 2D pattern, plus the live 3D preview | A level built from empty, checked, playtested, saved, then solved as a pupil |
| **5. The proof** | Journey, QA fixture, probe, `custom_win_js` deleted, docs | The journey running in CI against the ephemeral QA stack |

Stage 2 deliberately keeps the old scene rendering. It is the only way the
runtime change is reviewable on its own.

## Complexity Tracking

| Thing that looks like complexity | Why it is the smaller option |
|---|---|
| A second simulator module rather than one generalised world | 3D has heights, jumps and doors; 2D has painting and cell values. A shared abstraction would have to model both, and would be edited every time either changed. Two small modules sharing a *runner* keep the coupling at the one place that genuinely is identical. |
| A solver at all | Without it the teacher ships impossible levels and finds out from a child. It is a breadth-first search over a bounded state space, not a research project. |
| Inverted-hull outlines (two draw calls per object) | The single strongest cue that says "cartoon" rather than "engineering render", and drei already implements it. A ten-by-ten level is about a hundred meshes, and the floor is instanced. |
| Five pull requests instead of one | The alternative is a review in which nobody can tell whether the character is in the wrong place because the trace is wrong or because the shader is. |

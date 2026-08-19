# Tasks: World 3D rework

**Input**: design documents in `specs/012-world-3d-rework/`
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/)

**Tests**: requested. Constitution II applies to every one — a test that can only
reject is green against an endpoint that rejects everything, so each refusal
ships with its positive control **in the same test**.

**Organisation**: by user story, and each phase names the pull request it lands
in. A stage is merged and verified in production before the next begins.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel — different files, no dependency
- **[Story]**: US1 … US4 from [spec.md](spec.md)

---

## Phase 1: Setup (PR 1)

- [x] T001 Branch `feat/world-3d-rework` from `origin/main`, having confirmed `git log origin/main..main` is empty
- [x] T002 Write the isolated compose override to the scratch directory (backend 8010, sandbox and database internal) so shared ports and the other session's database are untouched
- [x] T003 [P] Seed one 3D lesson and a teacher/pupil pair into the isolated stack for browser checks

---

## Phase 2: Foundational (PR 2 — blocks every story)

**⚠️ No story work begins until this phase is done.**

- [x] T004 Parameterise `backend/app/exercises/robot_runner.py` by simulator module: lift `_SIM_SOURCE`, `_boot`, `RobotError` and `StepsExhaustedError` into arguments, keeping the sentinel protocol, the `compile(source, "program.py")` line-number trick, the output cap and the trace parser in one place
- [x] T005 Prove the parameterisation changed nothing for 2D: `tests/test_robot_runner.py` and `tests/test_robot_submit.py` pass untouched
- [x] T006 Rewrite `World3DConfig` in `backend/app/exercises/schemas.py` to [data-model.md](data-model.md): `start`, `cells`, `commands`, `win`, `max_steps`, `star_steps`, `star_size`, `solution_code`, `preset`; delete `available_blocks`, `win_condition`, `custom_win_js`, `difficulty`, `allow_python`, `max_blocks`
- [x] T007 Add `world: dict | None` to `SubmitExerciseRequest`, and the World run/preview/solve request and response schemas per [contracts/api.md](contracts/api.md)
- [x] T008 Add `solution_code` to what `router.py::_strip_answers` removes for non-staff readers of a 3D level

**Checkpoint**: the shape exists; nothing implements it yet.

---

## Phase 3: User Story 1 — a pupil's program runs and the server judges it (P1) 🎯 MVP

**Goal**: real Python, a `while` that loops, and a verdict the browser cannot forge.

**Independent test**: post a losing program together with
`{"completed": true, "score": 1.0}` and see the attempt refused — with a winning
program in the same test.

### Tests first (PR 2)

- [x] T009 [P] [US1] `backend/tests/test_world_sim.py` — one test per command in [contracts/commands.md](contracts/commands.md), including every refusal key
- [x] T010 [P] [US1] `backend/tests/test_world_height.py` — walk up one level, refuse two; jump up two, refuse three; walk off a ledge and land, with `motion: "fall"` recorded
- [x] T011 [P] [US1] `backend/tests/test_world_doors.py` — `press()` opens the door its button names and no other; an open door is still open ten commands later; pressing twice changes nothing and still costs a step
- [x] T012 [P] [US1] `backend/tests/test_world_win.py` — every leaf of the win vocabulary, and `and` / `or` / `not` over them
- [x] T013 [P] [US1] `backend/tests/test_world_runner.py` — a `while not at_goal()` loop that terminates; a syntax error reporting the pupil's own line; the step allowance ending a runaway program with no exception underneath; a forged command list replayed honestly
- [x] T014 [US1] `backend/tests/test_world_submit.py` — a claimed win beside a losing program graded `passed=False`, **and** the genuine win in the same test; a losing submission still recorded and still costing an attempt; running never costing one; another school's level reading as 404, with a positive control

### Implementation (PR 2)

- [x] T015 [US1] Write `backend/app/exercises/world_sim.py` — standard library only, so its own source runs inside the sandbox: grid with heights, facing, the seven actions, the seven sensors, the step cap, the trace recorder, and `replay()` as the single source of the verdict
- [x] T016 [US1] Bind the commands as module-level functions in `world_sim.py`, so a child writes `move_forward()` with no prefix, and refuse a command the level withholds with `not_offered`
- [x] T017 [US1] Implement `evaluate()` in `world_sim.py` over the win vocabulary of [data-model.md](data-model.md), with `and` / `or` / `not`
- [x] T018 [US1] Add `POST /{exercise_id}/world/run` to `backend/app/exercises/router.py` — rate-limited, organisation-scoped, 404 for a non-3D exercise
- [x] T019 [US1] Add `_submit_world()` to `backend/app/exercises/service.py`, grading from the server's own replay, ignoring `game_result` entirely, and storing what it observed under `answers.world`
- [x] T020 [US1] Route `world_3d` in `_submit_game_level` to `_submit_world`, leaving `math_interactive` on the old path

**Checkpoint (PR 2 merges here)**: the rules are real and the server judges.
Verify in production before Phase 4.

---

## Phase 4: User Story 1 continued — the pupil's screen (P1, PR 3)

- [x] T021 [US1] Rebuild `frontend/src/components/game/world-3d/world-3d-exercise.tsx` around the existing `TracePlayer`: Run posts the source and plays the frames; Step re-runs when the program has changed since the loaded trace
- [x] T022 [US1] Reduce `frontend/src/components/game/world-3d/scene-engine.ts` to types and projection — `stateAt(config, frames, count)` — and delete every rule from it
- [x] T023 [US1] Delete `frontend/src/components/game/world-3d/legacy-step-executor.ts` and confirm by grep that nothing imports it
- [x] T024 [P] [US1] Add the 3D calls to `frontend/src/lib/api/exercises.ts`: `runWorld`, `previewWorldLevel`, `solveWorldLevel`, with the Run and Solve types of [data-model.md](data-model.md)
- [x] T025 [US1] Show the pupil's printed output in its own pane, capped, apart from the level's messages
- [x] T026 [US1] Show an error with its line, and the step allowance as a sentence rather than an exception
- [x] T027 [US1] Wire play, pause, step and speed to the trace player, and key the component on the exercise id rather than resetting through effects

**Checkpoint (PR 3 merges here)**: blocks and Python take one path. The old scene
still renders — deliberately, so this change is reviewable alone.

---

## Phase 5: User Story 2 — the teacher chooses what the level offers (P2, PR 3)

**Independent test**: a level offering two commands shows exactly two in the
palette.

- [x] T028 [P] [US2] Add the 3D blocks to `frontend/src/components/game/blockly/custom-blocks.ts` with Python generators emitting bare names — `jump`, `press`, `gap_ahead`, `step_ahead`, `button_ahead`, `door_ahead` — leaving the JavaScript generators alone
- [x] T029 [US2] Build the 3D toolbox from `config.commands` in `frontend/src/components/game/blockly/toolbox-configs.ts`; control flow is always offered, because it is the language rather than the level's gift
- [x] T030 [US2] Generate the Python starter comment and the Monaco autocompletion from the same `commands` list
- [x] T031 [US2] Retire `DIFFICULTY_3D_TOOLBOXES` as a source of truth; presets become buttons that tick boxes

---

## Phase 6: User Story 4 — the level looks like something a child wants to touch (P2, PR 4)

**Goal**: the Duolingo read — rounded, outlined, flat-shaded, with weight.

**Independent test**: a still screenshot in which someone who has not been told
what they are looking at can name every object.

- [x] T032 [P] [US4] `frontend/src/components/game/world-3d/scene/toon.ts` — the three-step gradient ramp as a tiny nearest-filtered data texture, and the palette read from the design tokens at mount and on theme change
- [x] T033 [P] [US4] `frontend/src/components/game/world-3d/scene/ground.tsx` — instanced floor, contact shadows, a pastel sky, no fog
- [x] T034 [US4] `frontend/src/components/game/world-3d/scene/props.tsx` — wall, platform, item, button, door and goal as rounded boxes with outlines, each identifiable by shape alone
- [x] T035 [US4] `frontend/src/components/game/world-3d/scene/character.tsx` — chibi proportions, idle bob, anticipation before a turn, squash on landing, stretch on take-off, and a shake when the world refuses
- [x] T036 [US4] `frontend/src/components/game/world-3d/scene/world-scene.tsx` — canvas, two lights, and a camera that eases to follow with orbit clamped
- [x] T037 [US4] Drive the animations from `frame.motion` rather than by comparing coordinates, so a jump, a climb and a fall each read differently
- [x] T038 [US4] Honour `prefers-reduced-motion`: every interpolation becomes instant, and the scene stays readable
- [x] T039 [US4] Retire `frontend/src/components/game/world-3d/scene-renderer.tsx` once nothing imports it
- [x] T040 [US4] **SC-010**: measure a ten-by-ten level with every object type present, and record the frame rate in the pull request

**Checkpoint (PR 4 merges here)**: screenshots at both themes and both widths in
the PR body, plus the reduced-motion pass.

---

## Phase 7: User Story 3 — the teacher proves the level works (P3, PR 5)

**Independent test**: wall the goal off; Check says unsolvable and names what
blocks it.

### Tests first

- [x] T041 [P] [US3] `backend/tests/test_world_solver.py` — a corridor answering `shortest` with a countable number; a walled-off goal answering `unsolvable`; a level whose door must be opened first answering with the longer path; thirteen targets answering `reference_only` with `too_many_targets`, and never `shortest`
- [x] T042 [P] [US3] `backend/tests/test_world_validate.py` — one code per fault, every fault reported at once, and a sound level reporting none
- [x] T043 [US3] Extend `backend/tests/test_world_submit.py` — only staff may preview or solve, and a reference solution never reaches a pupil through any of the three reads

### Backend

- [x] T044 [US3] Write `backend/app/exercises/world_solver.py` — breadth-first over `(x, z, y, facing, items, doors)`, capped at twelve targets, returning `answer`, `steps`, `size`, `reason`, `blockers`
- [x] T045 [US3] Write `backend/app/exercises/world_validate.py` — every blocker code of [data-model.md](data-model.md), returned together, never as a sentence
- [x] T046 [US3] Add `POST /world/preview` and `POST /world/solve` to the router, staff only, per [contracts/api.md](contracts/api.md)

### The editor

- [x] T047 [US3] Rebuild `frontend/src/components/game/world-3d/world-3d-editor.tsx` on the 2D editor's `updateWith(previous => …)` primitive, so a drag firing many times a second cannot lose edits
- [x] T048 [US3] Paint the grid at a chosen height, and **only** at that height — the defect that deletes the platform below the one being placed
- [x] T049 [US3] Paint by dragging, with undo reaching at least twenty steps back
- [x] T050 [P] [US3] Command palette: grouped tick boxes over the whole vocabulary, with presets that tick boxes rather than hiding a second list
- [x] T051 [P] [US3] Win builder: rows of conditions joined by all/any, each negatable, covering the vocabulary of [data-model.md](data-model.md)
- [x] T052 [US3] Link a button to a door by choosing from the doors that exist; no free-text identifier anywhere in the editor
- [x] T053 [US3] Check: call solve, show the answer in words, fill `star_steps` and `star_size`, and list every blocker
- [x] T054 [US3] Playtest the unsaved level through `/world/preview`
- [x] T055 [US3] Reference solution: run it, refuse it when it loses, store it when it wins
- [x] T056 [US3] Star thresholds editable as numbers, pre-filled by Check
- [x] T057 [US3] Show the level live in 3D beside the grid, updating as the teacher paints
- [x] T058 [US3] Numeric width and depth, replacing the four fixed sizes

**Checkpoint (PR 5 merges here)**: a teacher builds a working level without ever
seeing the configuration.

---

## Phase 8: Polish and cross-cutting (PR 6)

- [x] T059 [P] Add every new string to all six locales in `frontend/src/lib/i18n/locales/`, including the refusal keys of [contracts/commands.md](contracts/commands.md)
- [x] T060 Keep `world-3d-editor.tsx` and `world-3d-exercise.tsx` off `frontend/src/lib/i18n/i18n-allowlist.ts`
- [x] T061 Show the win condition to the pupil in words — it is their instructions, not a secret
- [ ] T062 [P] Write `frontend/e2e/journeys/world-3d.spec.ts` on the 2D journey's pattern: a teacher paints, links a door, presses Check, saves; a pupil solves it in Python and again with a block; the submission is passed, read back through the API
- [x] T063 [P] Rewrite the `world_3d` entry in `qa/exercise-fixtures.json` to the new shape
- [ ] T064 Move `frontend/e2e/exercises/lifecycle.spec.ts` and `scripts/qa_axis_probe.py` off `game_result` for `world_3d`, as was done for `robot_2d`
- [ ] T065 **T071 of spec 005**: delete `custom_win_js` from `backend/app/exercises/schemas.py`, and prove by grep that nothing in `backend/` or `frontend/src/` still reads it
- [ ] T066 [P] Update `docs/ARCHITECTURE.md` and `docs/API_REFERENCE.md` with the three new endpoints and the new grading path
- [ ] T067 Run the whole of [quickstart.md](quickstart.md) and fix what it finds
- [ ] T068 Walk the five browser checks left unwalked by spec 005's T072, now that the same machinery exists in 3D
- [ ] T069 **SC-005**: measure the Run round trip against the real sandbox over twenty runs and record the 95th percentile in [research.md](research.md), whether or not it passes three seconds
- [x] T070 **SC-008**: add a determinism test to `backend/tests/test_world_runner.py` — the same program run twice produces the same steps, size and stars, compared as serialised values rather than by eye

---

---

## Where this stands

Stages 0 through 4 are merged and live: the spec, the rules in Python, the
pupil's screen, the look, the solver and validator, and the teacher's editor
(T047–T058) that calls them.

**What is left is the proof** (T062–T069) — the journey, the QA fixture, the
latency and determinism measurements, and deleting `custom_win_js` with a grep
to show nothing reads it.

---

## Dependencies & Execution Order

- **Phase 1 → Phase 2 → everything.** The runner parameterisation (T004) blocks
  every backend task; the schema (T006) blocks every frontend one.
- **US1 backend (Phase 3) before US1 frontend (Phase 4)**: the screen has nothing
  to play until the trace exists.
- **US2 (Phase 5) rides with Phase 4**: both are the pupil's screen, and both are
  reviewable together.
- **US4 (Phase 6) after Phase 4**: the scene needs `frame.motion`, which the
  runtime provides.
- **US3 (Phase 7) after Phase 3**: the editor's Check calls the solver.
- **Phase 8 last**: the journey needs everything it drives.

### Parallel opportunities

- T009–T013 are five separate test files and can be written together.
- T032–T036 are five separate scene files; only T037 joins them.
- T050 and T051 are separate panels of the editor.
- T062, T063 and T066 touch nothing each other touches.

---

## Implementation Strategy

Six pull requests, each merged only when CI is green, then watched to production
and checked there before the next begins:

1. **PR 1** — setup and the isolated stack (folds into PR 2 if it carries no
   repository change)
2. **PR 2** — the rules in Python, the schema, the run endpoint, server-side
   grading *(MVP: US1 is usable from an API client here)*
3. **PR 3** — the pupil's screen and the teacher's command set *(US1, US2)*
4. **PR 4** — the look *(US4)*
5. **PR 5** — the teacher's editor, solver and validator *(US3)*
6. **PR 6** — journey, QA data, `custom_win_js`, documentation

Stopping after PR 3 would leave a working, honestly graded 3D exercise that looks
like the old one. Stopping after PR 4 would leave it looking right but editable
only by someone willing to write JSON. Neither is the destination; both are safe
places to be interrupted.

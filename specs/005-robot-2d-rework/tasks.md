---

description: "Task list for Robot 2D rework"
---

# Tasks: Robot 2D rework

**Input**: Design documents from `/specs/005-robot-2d-rework/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/)

**Tests**: Included, and not optional here. Constitution principle II — a test
that cannot fail is worse than no test — makes them part of the work, and the
spec names the regression each one must catch.

**Organization**: Grouped by user story, so each ships and is tested on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel — different files, no dependency on unfinished work
- **[Story]**: US1 / US2 / US3, mapping to the user stories in spec.md

## Path Conventions

Web application, per plan.md: `backend/app/`, `backend/tests/`, `frontend/src/`,
`frontend/e2e/`. All paths are from the repository root.

---

## Phase 1: Setup

**Purpose**: make the worktree runnable, and add the one new setting.

- [ ] T001 Install frontend dependencies in the worktree with `npm ci --prefix frontend`, and copy `.env` and `.env.local` from the main checkout — neither is in git
- [ ] T002 [P] Add `robot_run_rate_limit: str = "60/minute"` to `backend/app/config.py`, beside the existing `sandbox_demo_rate_limit`
- [ ] T003 [P] Document `ROBOT_RUN_RATE_LIMIT` in `.env.example`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: the rules, written once, in Python. Everything else calls them — the
sandbox program, the server's replay, the search, the editor's checks.

**⚠️ CRITICAL**: no user story starts until `robot_sim.py` and its tests are green.

### Tests first

> Write these before the modules. They must fail against a wrong implementation,
> not merely error on a missing import.

- [ ] T004 [P] Failing tests for movement, refusals and the step allowance in `backend/tests/test_robot_sim.py` — walls and edges refuse and still consume a step (FR-025), a turn costs a step (FR-027), `steps_exhausted` ends a runaway program (FR-004)
- [ ] T005 [P] Failing tests for items, paint and values in `backend/tests/test_robot_world.py` — `take` then `drop` restores the count (FR-024), painting twice counts once toward the goal and twice in steps (FR-033), `read` on a bare floor refuses rather than returning `0` (FR-034)
- [ ] T006 [P] Failing tests for the win expression in `backend/tests/test_robot_win.py` — every leaf in data-model.md, and `and` / `or` / `not` over them, including a `not` given the wrong number of children
- [ ] T007 [P] Failing tests for level validation in `backend/tests/test_robot_validate.py` — every blocker in FR-020 reported **together**, not the first one only

### Implementation

- [ ] T008 Create `backend/app/exercises/robot_sim.py` with the world state, grid loading from the level shape in data-model.md, facing, and the standard-library-only rule that lets its own source run inside the sandbox (research Finding E)
- [ ] T009 Add the movement commands to `backend/app/exercises/robot_sim.py` — `move_up`, `move_down`, `move_left`, `move_right`, `move_forward`, `turn_left`, `turn_right`, per contracts/commands.md — and the step allowance itself: every command increments the count, and reaching `max_steps` stops the run with `steps_exhausted` (FR-004). This is the simulator's own guard, distinct from the payload cap in T025
- [ ] T010 Add items, paint and values to `backend/app/exercises/robot_sim.py` — `take`, `drop`, `paint`, `read`, `write`, with the refusal keys from contracts/commands.md
- [ ] T011 Add the sensors to `backend/app/exercises/robot_sim.py` — `wall_ahead`, `item_here`, `at_goal`, `painted`, `value_here`
- [ ] T012 Add the win-expression evaluator to `backend/app/exercises/robot_sim.py` over the vocabulary in data-model.md, rejecting a node shape it does not know rather than defaulting to false
- [ ] T013 Add the command-not-offered refusal to `backend/app/exercises/robot_sim.py` — calling a command the level withholds refuses by name (FR-015) rather than raising `NameError`
- [ ] T014 [P] Create `backend/app/exercises/robot_validate.py`, returning every blocker as a key and never a sentence (FR-020, contracts/api.md)
- [ ] T015 Rewrite `Robot2DConfig` in `backend/app/exercises/schemas.py` to the shape in data-model.md, deleting `available_blocks`, `custom_win_js`, `win_condition`, `target_steps` and `optimal_blocks`
- [ ] T016 Add the run, preview and solve request and response schemas to `backend/app/exercises/schemas.py`, matching contracts/api.md exactly — including `answer` and `reason` on the solve response

**Checkpoint**: the rules exist, are tested, and nothing yet calls them.

---

## Phase 3: User Story 1 — A pupil's program runs, and the server judges it (P1) 🎯 MVP

**Goal**: real Python, real loops, real error lines — and a verdict the browser
cannot forge.

**Independent Test**: write `while not at_goal(): move_forward()` on a corridor
level; the robot walks to the goal and stops. Then post a winning claim with a
losing program and watch it recorded as not passed.

### Tests for User Story 1

- [ ] T017 [P] [US1] Failing tests for the program builder in `backend/tests/test_robot_runner.py` — a pupil's source embedded via `json.dumps` survives quotes and backslashes, and `compile(src, "program.py", "exec")` reports line numbers relative to the pupil's first line (research Finding A)
- [ ] T018 [P] [US1] Failing tests for sentinel parsing in `backend/tests/test_robot_runner.py` — the command list is read from the **last** sentinel occurrence, so a pupil who prints the sentinel changes nothing (research Finding C)
- [ ] T019 [P] [US1] Failing test for tamper resistance in `backend/tests/test_robot_submit.py` — a program that reaches into the simulator and sets the win flag is graded not passed, because the server replays rather than trusts (research Finding B)
- [ ] T020 [P] [US1] Failing test for forgery in `backend/tests/test_robot_submit.py` — a submission carrying `game_result: {completed: true, score: 1.0}` beside a losing program is `passed: false`, **with the winning-program positive control in the same test** (Constitution II)
- [ ] T021 [P] [US1] Failing test in `backend/tests/test_robot_submit.py` that a pupil reading the exercise through all three read endpoints sees no `solution_code`, and a teacher reading the same one does (FR-010)
- [ ] T022 [P] [US1] Failing tests for the trace player in `frontend/src/components/game/engine/trace-player.test.ts` — play, pause, step, seek and speed over a fixed frame array
- [ ] T022a [P] [US1] Failing tenant-isolation test in `backend/tests/test_robot_submit.py` — a pupil of another school posting to `/robot/run` for this exercise gets 404, **and a pupil of the owning school gets 200 in the same test** (Constitution I). Without the positive control the assertion passes before the route exists
- [ ] T022b [P] [US1] Failing test in `backend/tests/test_robot_submit.py` that twenty runs leave `attempts_remaining` unchanged, and that submitting once decrements it (FR-026, SC-010)
- [ ] T022c [P] [US1] Failing tests for the star rules in `backend/tests/test_robot_stars.py` — the same program on the same level scores identically twice (SC-008), and each threshold is checked at its boundary, one either side (FR-028)

### Implementation

- [ ] T023 [US1] Create `backend/app/exercises/robot_runner.py` — read `robot_sim.py`'s own source, append the level and the pupil's program as JSON literals, append the sentinel print, and call the existing `execute_code_remote` with `language="python"`, 5 s, 128 MB (research Finding I)
- [ ] T024 [US1] Add error capture to `backend/app/exercises/robot_runner.py` — catch `SyntaxError` and any runtime exception, walk the traceback to the last `program.py` frame, return `{type, line, message}`
- [ ] T025 [US1] Add the caps to `backend/app/exercises/robot_runner.py` — command list at `max_steps`, printed output at 8 KB with `output_truncated`
- [ ] T026 [US1] Add the server-side replay to `backend/app/exercises/robot_runner.py` — run the returned command list through `robot_sim` in-process and produce the frames, `won`, `steps` and `stopped` of data-model.md
- [ ] T027 [US1] Add statement counting to `backend/app/exercises/robot_runner.py` using `ast`, so `size` comes from the program the system ran rather than from anything the client reports (FR-028)
- [ ] T028 [US1] Add `POST /exercises/{exercise_id}/robot/run` to `backend/app/exercises/router.py`, resolved through the existing per-domain guard so another school's id reads 404 (Constitution I), rate-limited with the deferred form
- [ ] T029 [US1] Return `503` from that route when the sandbox does not answer, recording nothing and consuming no attempt
- [ ] T030 [US1] Change `_submit_game_level` in `backend/app/exercises/service.py` so `robot_2d` grades from its own replay and ignores `completed` and `score` from the body; leave `math_interactive` on the old path, still tracked by `specs/004-exercise-answer-leak`
- [ ] T031 [US1] Store the submission as `answers.robot` per data-model.md, and award experience on the server's `won`
- [ ] T032 [P] [US1] Create `frontend/src/components/game/engine/trace-player.ts` — play, pause, step, seek and speed over a frame array
- [ ] T033 [US1] Move `step-executor.ts` into World 3D rather than deleting it — `frontend/src/components/game/world-3d/world-3d-exercise.tsx:22` imports `parseCommands` and calls it at line 113, so deleting the module stops World 3D compiling. Relocate it to `frontend/src/components/game/world-3d/legacy-step-executor.ts`, unreferenced by anything in `robot-2d/`, and delete it for real in `specs/006-world-3d-rework`
- [ ] T033a [US1] Confirm by grep that nothing under `frontend/src/components/game/robot-2d/` imports the relocated executor, and that `npx tsc --noEmit` is clean — the `_while` machinery that never re-read its condition must be gone from the 2D path even though the file survives for 3D
- [ ] T034 [US1] Strip the rules from `frontend/src/components/game/robot-2d/grid-engine.ts`, keeping only the types the renderer needs
- [ ] T035 [US1] Rewrite `frontend/src/components/game/robot-2d/grid-renderer.tsx` to draw a frame, including painted floors and values on cells
- [ ] T036 [US1] Add `runRobot` to `frontend/src/lib/api/exercises.ts`, posting `{source, mode}` and returning the run result — no completion field in either direction
- [ ] T037 [US1] Rewrite the run path in `frontend/src/components/game/robot-2d/robot-2d-exercise.tsx` to post the code, receive a trace and play it, **fixing the `[speed, handleReset]` dependency arrays** that made edited Python unrunnable
- [ ] T038 [US1] Show the error panel in `frontend/src/components/game/robot-2d/robot-2d-exercise.tsx` and mark the reported line in Monaco (FR-005)
- [ ] T039 [US1] Add the output pane to `frontend/src/components/game/robot-2d/robot-2d-exercise.tsx`, separate from the robot, with the truncation marker (FR-007)
- [ ] T040 [US1] Drive Monaco's theme from the `isDark` state already computed and thrown away in `frontend/src/components/game/robot-2d/robot-2d-exercise.tsx`

**Checkpoint**: levels are playable, loops loop, and the verdict is the server's.

---

## Phase 4: User Story 2 — A teacher chooses which commands a level offers (P2)

**Goal**: `config.commands` becomes the one record of what a level offers, and
the palette, the autocompletion and the starter header all read it.

**Independent Test**: tick only the four absolute moves, save, open as a pupil.
Four blocks, four commands in the starter, no turning command anywhere.

### Tests for User Story 2

- [ ] T041 [P] [US2] Failing test in `backend/tests/test_robot_sim.py` that a command outside the level's offered set refuses with `not_offered` and names the line (FR-015)
- [ ] T042 [P] [US2] Failing test in `frontend/src/components/game/blockly/toolbox-configs.test.ts` that the toolbox is built from an explicit command list, and that a list naming no loop yields no loop category
- [ ] T042a [P] [US2] Failing test in `backend/tests/test_robot_runner.py` that block-generated Python and hand-written Python expressing the same solution produce identical frames and step counts on one level (SC-007) — the only assertion that catches the two editors drifting apart
- [ ] T042b [P] [US2] Failing test in `backend/tests/test_robot_sim.py` that no command name in the vocabulary exceeds fourteen characters and none carries an object prefix (FR-011, SC-006) — one line, and it holds the contract the day someone adds `move_diagonally`

### Implementation

- [ ] T043 [US2] Change **only the Python generators** in `frontend/src/components/game/blockly/custom-blocks.ts` to emit `move_up()` rather than `robot.move_up()`, and add blocks for `paint`, `read`, `write`, `painted` and `value_here`. The JavaScript generators stay exactly as they are — `world-3d-exercise.tsx:113` parses their output with a regex expecting the `robot.` prefix, and this file is shared
- [ ] T044 [US2] Rebuild `frontend/src/components/game/blockly/toolbox-configs.ts` around `buildToolboxFromBlocks`. Three consumers outside this feature import from it and must keep working: `blockly-workspace.tsx:7-8` (`ToolboxDef`, `Difficulty`, `DIFFICULTY_TOOLBOXES`), `world-3d-exercise.tsx:23-24` (`Difficulty`, `DIFFICULTY_3D_TOOLBOXES`) and `world-3d-editor.tsx:7` (`Difficulty`). Keep those exports; demote them from source of truth to preset, without removing them
- [ ] T044a [US2] Open a World 3D level in the browser after T043 and T044 and confirm it still runs — this spec declares 3D out of scope, which protects it only if the tasks that touch shared files check
- [ ] T045 [US2] Pass `config.commands` to the workspace in `frontend/src/components/game/robot-2d/robot-2d-exercise.tsx`, replacing the `difficulty` prop that made the teacher's choice unreachable
- [ ] T046 [US2] Submit the generated Python in block mode from `frontend/src/components/game/robot-2d/robot-2d-exercise.tsx`, so blocks and Python share one execution path (FR-003)
- [ ] T047 [US2] Generate the starter file's comment header from `config.commands` in `frontend/src/components/game/robot-2d/robot-2d-exercise.tsx`, replacing the hardcoded Russian block
- [ ] T048 [US2] Register a Monaco completion provider in `frontend/src/components/game/robot-2d/robot-2d-exercise.tsx` offering exactly `config.commands`, disposed on unmount
- [ ] T049 [US2] Add the grouped command palette to `frontend/src/components/game/robot-2d/robot-2d-editor.tsx` — checkboxes over contracts/commands.md, with presets that tick boxes and leave them editable (FR-021)

**Checkpoint**: a course is a sequence of levels, not a pile of grids.

---

## Phase 5: User Story 3 — A teacher proves the level works before pupils see it (P3)

**Goal**: Check, playtest, reference solution, and every blocker in one place.

**Independent Test**: wall the goal off and press Check — it says no path exists
and names what blocks it. Remove one wall; the step count matches a hand count.

### Tests for User Story 3

- [ ] T050 [P] [US3] Failing tests for the search in `backend/tests/test_robot_solver.py` — a corridor answers `shortest` with a hand-countable number, a walled goal answers `unsolvable`
- [ ] T051 [P] [US3] Failing test in `backend/tests/test_robot_solver.py` that a level offering only absolute moves is answered for the commands it offers, not for the ones it withholds
- [ ] T052 [P] [US3] Failing tests in `backend/tests/test_robot_solver.py` that thirteen targets answers `reference_only` with `reason: too_many_targets`, and a win condition mentioning values answers `reference_only` with `reason: win_uses_values` — **and never `shortest`** (SC-011)

### Implementation

- [ ] T053 [US3] Create `backend/app/exercises/robot_solver.py` — breadth-first over `(x, y, facing, items_mask, painted_mask)`, expanding only the offered commands, capped at 12 targets combined (research Finding D)
- [ ] T054 [US3] Make `robot_solver.py` decline rather than guess — return `answer: "reference_only"` with the reason, and run the teacher's reference solution for the step and size figures
- [ ] T055 [US3] Add `POST /exercises/robot/solve` and `POST /exercises/robot/preview` to `backend/app/exercises/router.py`, staff-only, returning every blocker at once per contracts/api.md
- [ ] T056 [P] [US3] Add `solveRobotLevel` and `previewRobotLevel` to `frontend/src/lib/api/exercises.ts`
- [ ] T057 [US3] Add the Check button to `frontend/src/components/game/robot-2d/robot-2d-editor.tsx`, rendering the three answers distinctly so a reference-solution figure is never shown as an optimum (FR-035)
- [ ] T058 [US3] Fill `star_steps` and `star_size` from Check in `frontend/src/components/game/robot-2d/robot-2d-editor.tsx`, labelled by which answer produced them, and leave both editable (FR-017)
- [ ] T059 [US3] Add the playtest panel to `frontend/src/components/game/robot-2d/robot-2d-editor.tsx`, running the unsaved config through preview (FR-018)
- [ ] T060 [US3] Add the reference-solution field to `frontend/src/components/game/robot-2d/robot-2d-editor.tsx`, refusing one that loses and showing where its run ended (FR-019)
- [ ] T061 [US3] Add the blocker panel to `frontend/src/components/game/robot-2d/robot-2d-editor.tsx`, rendering every key from `robot_validate.py` at once (FR-020)
- [ ] T062 [US3] Add the win-condition builder to `frontend/src/components/game/robot-2d/robot-2d-editor.tsx` — leaves from data-model.md joined by `and` / `or` / `not`, with no free-text field anywhere (FR-029)
- [ ] T063 [US3] Add drag-to-paint, undo bounded at 50, and numeric width and height to `frontend/src/components/game/robot-2d/robot-2d-editor.tsx` (FR-022)
- [ ] T064 [US3] Add the mark and value tools to `frontend/src/components/game/robot-2d/robot-2d-editor.tsx`, refusing both on a wall

**Checkpoint**: no teacher can ship a level they have not seen finished.

---

## Phase 6: Polish & Cross-Cutting

- [ ] T065 [P] Add every new key to all six locales in `frontend/src/lib/i18n/locales/` — `en`, `ru`, `de`, `es`, `tr`, `uk` — including the refusal keys in contracts/commands.md
- [ ] T066 Confirm `robot-2d-editor.tsx` and `robot-2d-exercise.tsx` are **absent** from `frontend/src/lib/i18n/i18n-allowlist.ts`, and remove `grid-renderer.tsx` from it if its strings are now translated (FR-023)
- [ ] T067 Show the win condition to the pupil in words in `frontend/src/components/game/robot-2d/robot-2d-exercise.tsx` — it is their instructions, not a secret (FR-031)
- [ ] T068 [P] Write the journey in `frontend/e2e/journeys/robot-2d.spec.ts` — teacher builds a level, Check reports a step count, saves; pupil solves it; the submission is passed
- [ ] T069 [P] Register the journey with the QA stack alongside the eight existing ones in `frontend/e2e/`
- [ ] T070 Measure the Run round trip against the real sandbox per quickstart §7 and record the figure in `research.md` under Finding J, whether it passes SC-009 or not
- [ ] T071 Delete `custom_win_js` from `backend/app/exercises/schemas.py` and confirm by grep that nothing in `backend/` or `frontend/src/` still reads it
- [ ] T072 Run the whole of [quickstart.md](quickstart.md) and fix what it finds

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)**: no dependencies
- **Foundational (Phase 2)**: needs Setup. **Blocks every story** — the rules are what the runner runs, the search searches and the editor checks
- **US1 (Phase 3)**: needs Foundational. Nothing else
- **US2 (Phase 4)**: needs Foundational. Independently testable, though its value shows once US1 makes levels playable
- **US3 (Phase 5)**: needs Foundational. Its Check button calls the same `robot_sim`
- **Polish (Phase 6)**: needs the stories it touches

### The one cross-story constraint

US2 and US3 both rewrite
`frontend/src/components/game/robot-2d/robot-2d-editor.tsx`. They are
independently *testable* but not independently *editable* — two people on both at
once conflict in that file. One person takes the editor, or they land in order.

### Within each story

- Tests are written first and must fail before the implementation lands
- `robot_sim` before the runner; the runner before the routes; the routes before the frontend
- The API client before the components that call it

### Parallel opportunities

- T002 and T003 together
- T004, T005, T006, T007 together — four separate test files
- T017–T022c together — different files, no shared state
- T042, T042a, T042b together
- T050, T051, T052 together
- T065, T068, T069 together
- Once Phase 2 is green, US1 and US2 proceed side by side; US3 shares the editor with US2

### Tasks that reach outside this feature

Three tasks touch files World 3D depends on. Each names its consumers, and
T044a checks the result in the browser — "3D is out of scope" protects nothing
on its own when the shared file is edited here.

| Task | Reaches | Consumer |
|---|---|---|
| T033 | `engine/step-executor.ts` | `world-3d-exercise.tsx:22`, called at :113 |
| T043 | `blockly/custom-blocks.ts` | 3D reads the JavaScript generators, which stay untouched |
| T044 | `blockly/toolbox-configs.ts` | `blockly-workspace.tsx:7-8`, `world-3d-exercise.tsx:23-24`, `world-3d-editor.tsx:7` |

---

## Parallel Example: Phase 2 tests

```bash
backend/tests/test_robot_sim.py       # movement, refusals, the step cap
backend/tests/test_robot_world.py     # items, paint, values
backend/tests/test_robot_win.py       # the win expression
backend/tests/test_robot_validate.py  # every blocker at once
```

---

## Implementation Strategy

### MVP — User Story 1 only

1. Phase 1: Setup
2. Phase 2: Foundational — the rules and their tests
3. Phase 3: User Story 1
4. **Stop and validate**: quickstart §1, §3, §4, §6
5. This alone is shippable. Levels become playable, `while` loops, and the
   forgery hole closes — the deferred half of `specs/004-exercise-answer-leak`
   and Constitution III

### Incremental delivery

1. Setup + Foundational → the rules exist once
2. US1 → playable and honestly judged → **ship**
3. US2 → a level teaches what its teacher chose → ship
4. US3 → no unsolvable level reaches a pupil → ship
5. Polish → six locales, the journey, the measured figure

### Then

World 3D, in `specs/006-world-3d-rework`. It reuses `robot_runner`,
`trace-player` and the replay unchanged, adds `jump` and `interact` to the
simulator, and fixes the editor click that ignores `y` and deletes a platform two
levels down. The `while` defect, the fake parser and the client-side verdict are
already gone by then — 3D inherits all three fixed.

---

## Notes

- Commit after each task or logical group
- A test that passes the moment it is written was not written first
- The forgery test without its positive control proves nothing — an endpoint that
  rejects everything passes it
- Stop at any checkpoint and validate the story on its own

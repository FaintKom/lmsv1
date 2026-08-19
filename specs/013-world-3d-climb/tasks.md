---

description: "Task list for feature implementation"
---

# Tasks: Climbing a floor, made visible

**Input**: Design documents from `/specs/013-world-3d-climb/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/height.md](contracts/height.md), [quickstart.md](quickstart.md)

**Tests**: requested. Every refusal carries its positive control in the same
test, as Principle II requires — an assertion that only rejects is green against
a rule that rejects everything.

**Organization**: grouped by the three user stories. They ship in **one pull
request**, because the meaning of a platform cannot be half changed; the grouping
orders the work, it does not stage the merges. [plan.md](plan.md) says why.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel — different files, no dependency
- **[Story]**: US1, US2, US3 from [spec.md](spec.md)
- Exact file paths in every description

## Path Conventions

Web application: `backend/app/`, `backend/tests/`, `frontend/src/`, `frontend/e2e/`.

---

## Phase 1: Setup

**Purpose**: establish the baseline that must go red, and somewhere to watch it.

- [x] T001 Record the baseline: run `cd backend && python -m pytest tests/test_world_height.py tests/test_world_solver.py tests/test_world_validate.py -q` against the current rule and note that all pass. This is the "before" half of the demonstration Principle II asks for, and it cannot be reconstructed afterwards.
- [x] T002 Bring up an isolated stack and open a `world_3d` exercise in the editor, so the change can be watched rather than inferred — [quickstart.md](quickstart.md) sections 4 and 5 say what will be walked there.

---

## Phase 2: Foundational

**None.** No shared scaffolding is needed: every file this feature touches
already exists, no dependency is added, and no migration is owed because
production holds zero `world_3d` levels. Saying so beats inventing a phase to
fill.

**Checkpoint**: go straight to User Story 1.

---

## Phase 3: User Story 1 — A teacher builds a step and can see it (Priority: P1) 🎯 MVP

**Goal**: a platform placed on the floor the editor opens on is a step a
character can walk onto, and the teacher can see it.

**Independent Test**: place a platform without touching the floor control; the
preview shows a block standing on the ground, and Check reports the level
solvable by walking onto it.

### Tests for User Story 1 ⚠️

> Write these first and **watch them fail** against the current rule. T001
> recorded them passing; they must go red before the rule moves. A test
> rewritten to match new behaviour proves nothing.

- [x] T003 [US1] Rewrite the climb cases in `backend/tests/test_world_height.py` to the meaning in [contracts/height.md](contracts/height.md): a platform at floor 0 gives surface 1, floors 0 and 1 give surface 2, a lone platform at floor 3 gives surface 4 (H2). Keep each case's intent and move only the numbers.
- [x] T004 [US1] Add to `backend/tests/test_world_height.py`: a platform on floor 0 is a step — a character walks onto it and stands at 1 — with the bare square beside it as the control in the same test, where the same walk leaves the height at 0 (H2, H3).
- [x] T005 [US1] Add to `backend/tests/test_world_height.py`: a wall and a platform on the same floor stand at the same height, and a character on the platform still cannot enter the wall; the control in the same test is that it *can* enter the bare square on its other side (H5).
- [x] T006 [US1] Add to `backend/tests/test_world_height.py`: a movement refused for height reports `too_high`, and the same level with the step one floor lower reports no refusal at all — the control that stops `too_high` being returned for everything (H4).
- [x] T007 [US1] Add to `backend/tests/test_world_height.py`: a refused movement leaves square, height and facing untouched, with a permitted movement in the same test changing all three (H4).
- [x] T008 [P] [US1] Re-point the jump case in `backend/tests/test_world_solver.py` — the platform that needed a jump drops one floor so it still needs one — and add SC-006 as a test: a level's shortest path is the same number of steps as before.
- [x] T009 [P] [US1] Re-point the buried-goal case in `backend/tests/test_world_validate.py` to any platform on the goal's square, and keep the sound-level control that reports nothing.
- [x] T010 [US1] Run T003–T009 against the unchanged rule and record which fail and how, for the pull request body. **This task is the demonstration. Do not skip it, and do not proceed until the failures have been seen.**

### Implementation for User Story 1

- [x] T011 [US1] Change `surface()` in `backend/app/exercises/world_sim.py` to return one above the tallest platform on the square, and rewrite the docstring stating the old meaning. Nothing else in that module reads a platform's floor directly.
- [x] T012 [US1] Change the buried-goal rule in `backend/app/exercises/world_validate.py`: a goal is buried by any platform on its square, since every platform now stands above the ground.
- [x] T013 [P] [US1] Change `surfaceAt()` in `frontend/src/components/game/world-3d/scene-engine.ts` identically, and say in the comment that it is the second implementation of one rule, and why the front keeps its own.
- [x] T014 [P] [US1] Change the platform's geometry in `frontend/src/components/game/world-3d/scene/props.tsx` so it spans from the floor it occupies up one floor — the expression a wall already uses, at a different height (H8).
- [x] T015 [US1] Confirm `backend/app/exercises/world_solver.py` needs no edit — it builds the simulator and asks it — and say so in the pull request rather than leaving a reader to wonder whether it was forgotten.
- [x] T016 [US1] Run the whole backend suite and the frontend unit suite. The determinism check comparing server and client heights must pass (H6).

**Checkpoint**: a teacher can place a step and see it. The MVP stops here.

---

## Phase 4: User Story 2 — A pupil can tell how to get up (Priority: P2)

**Goal**: the climb rule is readable before the first run, in six languages.

**Independent Test**: open a level with a step as a pupil and, without running
anything, read from the screen which command gets the character up.

### Tests for User Story 2 ⚠️

- [x] T017 [P] [US2] Confirm the i18n parity test in `frontend/src/lib/i18n/` fails when one locale is missing one of the new keys, rather than assuming it does. A parity test nobody has seen fail is the same trap as any other.

### Implementation for User Story 2

- [x] T018 [US2] State what each movement command does about height in the pupil's starter header, in `frontend/src/components/game/world-3d/world-3d-exercise.tsx` (FR-006).
- [x] T019 [US2] State the same in the movement group of the command palette in `frontend/src/components/game/world-3d/world-3d-editor.tsx`, so a teacher deciding whether to offer jumping can see what it buys.
- [x] T020 [P] [US2] Add the climb strings to all six locales in `frontend/src/lib/i18n/locales/`, including a refusal that names height as the reason, distinct from the wall, door and edge strings already there (FR-007, FR-015).

**Checkpoint**: the rule is on screen before anything is run.

---

## Phase 5: User Story 3 — A pupil can see the robot climb (Priority: P3)

**Goal**: walking, climbing and falling look like three different things.

**Independent Test**: run one program containing all three and have someone who
has not read this spec name each from the animation alone.

### Implementation for User Story 3

- [x] T021 [US3] Add the jetpack to `frontend/src/components/game/world-3d/scene/character.tsx`: two small boxes on the back, present at rest, so it reads as equipment rather than an effect appearing from nowhere (FR-010).
- [x] T022 [US3] Fire thrust in the frame loop that already interpolates position, from the movement the frame already records — on a climb and a jump, and nothing else (FR-011, H7). No new field: the frame carries the distinction.
- [x] T023 [US3] Keep the three apart: a fall keeps its drop with no thrust, and a walk gets neither (FR-012).
- [x] T024 [US3] Collapse the jetpack with the rest of the scene under reduced motion — no thrust, no travel, the character simply at its new height (FR-013). One branch, where the existing collapse lives.

**Checkpoint**: all three stories work.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T025 Give the journey a step: change the level in `frontend/e2e/journeys/world-3d.spec.ts` so its route climbs one floor, and have the pupil climb it. The existing four tests keep their assertions.
- [x] T026 Break the surface rule on purpose, watch `frontend/e2e/journeys/world-3d.spec.ts` go red on the climb, restore it, and record the failure in the pull request. A journey nobody has seen fail is a journey nobody should trust.
- [x] T027 [P] Correct `specs/012-world-3d-rework/data-model.md`, which states the old meaning of a platform's floor. Two documents stating two meanings is Principle IV's defect, not untidiness.
- [x] T028 [P] Check `qa/exercise-fixtures.json` — its `world_3d` level is flat, so it should need no change. Confirm rather than assume, and say which it was.
- [x] T029 Walk [quickstart.md](quickstart.md) section 4 as a teacher and write down what was seen.
- [ ] T030 Walk [quickstart.md](quickstart.md) section 5 with someone who has not read this spec, covering SC-003 and SC-004, and write down what they said. "Walked section 5" with no observation is the same as not walking it.
- [x] T031 Run the gates in [quickstart.md](quickstart.md) section 7 before opening the pull request.

---

---

## What was done, and what was not

**T010, the demonstration.** The rewritten tests were run against the unchanged
rule first: **14 failed, 36 passed**, every failure on the meaning of a floor —
`surface` returning 1 where 2 was expected, `too_high` where a walk should have
been allowed, the buried goal not reported for a platform on floor 0. Then the
rule moved and the whole backend suite passed (1218 tests).

**T017, the parity test.** Checked rather than assumed: one climb key was
deleted from the German locale, the parity test failed naming
`world.climb.one`, and the key was restored.

**T026, the journey.** The first level written for this had a flag beyond the
step, and it **passed against the old rule** — a corridor is walkable whichever
way a platform's floor is counted, so the journey proved nothing about height.
The level now wins on height instead of on a flag, which cannot be satisfied by
accident: under the old counting nothing in it could leave the ground. With the
rule broken on purpose the journey goes red on the teacher's Check; restored, all
four pass.

**T020, partly.** The climb strings landed in all six locales. The refusal that
names height as the reason **did not**, and deliberately: no refusal reaches the
pupil as text today — a wall, a closed door and the edge of the board are all
equally silent, and the character shudders instead. Adding words for one of the
four would leave the other three unexplained, which is a worse state than the
one we are in. FR-007 is satisfied in the data, where the four causes are
already distinct; the screen half wants its own change and its own spec.

**T030, not done.** SC-003 and SC-004 need a person who has not read this spec —
a child naming a walk, a climb and a fall from the animation alone. Nobody has
been asked yet. It is left unticked rather than claimed.

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: first, because T001 is the "before" half of a
  demonstration that cannot be reconstructed afterwards.
- **Foundational (Phase 2)**: empty.
- **User Story 1 (Phase 3)**: after Setup. It is the substance of the feature.
- **User Story 2 (Phase 4)** and **User Story 3 (Phase 5)**: independent of each
  other and of US1. Either could ship without the height change and still be
  worth having — the words would describe a rule that works but is hard to build
  a level for, and the jetpack would animate a climb that is hard to reach.
- **Polish (Phase 6)**: after all three.

### Within User Story 1

T003–T009 (tests) → **T010, the demonstration** → T011–T014 (the rule) → T015,
T016 (verification). T010 is a gate, not a formality: the pull request must say
what was seen to fail.

### Parallel Opportunities

- T008 and T009 touch different test files and can run together.
- T013 and T014 touch different frontend files and can run together, once T011
  has settled what the rule is.
- T020 is one file per language and independent of T018 and T019.
- T027 and T028 are documentation and data, independent of everything.

---

## Parallel Example: User Story 1

```bash
# The two re-pointed test files, together:
Task: "Re-point the jump case in backend/tests/test_world_solver.py"
Task: "Re-point the buried-goal case in backend/tests/test_world_validate.py"

# The two frontend files, once the rule is decided:
Task: "Change surfaceAt() in frontend/src/components/game/world-3d/scene-engine.ts"
Task: "Change the platform geometry in frontend/src/components/game/world-3d/scene/props.tsx"
```

---

## Implementation Strategy

**One pull request.** The three stories are ordered, not staged. A merge between
US1 and the rest would leave the server and the scene agreeing while the words on
screen still described the old rule — worse than either state alone.

**MVP, if the work has to stop somewhere**: User Story 1. A teacher who can build
a visible step has the thing this feature came from; the words and the jetpack
make it easier to learn, not possible.

**Order**: Setup → US1 → US2 → US3 → Polish, exactly as [plan.md](plan.md) lists.

---

## Notes

- `[P]` means different files and no dependency.
- Every refusal test names its control in the same task, so a test that cannot
  fail is visible at review time rather than at incident time.
- T010, T026 and T030 cannot be satisfied by writing code. They are the three
  most likely to be quietly skipped, which is why each says what must be written
  down.

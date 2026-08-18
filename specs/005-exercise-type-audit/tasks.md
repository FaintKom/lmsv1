---

description: "Task list for 005-exercise-type-audit"
---

# Tasks: Finish the exercise-type corner-case run

**Input**: Design documents from `/specs/005-exercise-type-audit/`

**Prerequisites**: plan.md, spec.md, research.md, quickstart.md

**Tests**: no test tasks are generated up front. This run measures; a regression
test is written only where a finding is fixed, and FR-009 requires it to be shown
failing first.

**Organization**: grouped by user story, so a run that stops early still leaves
recorded results.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependencies)
- **[Story]**: US1 (wave 2), US2 (waves 3-5), US3 (reload axis)

## Path Conventions

Repository root is this worktree. The probe lives in `scripts/`, findings in
`tasks/qa-audit-exercise-types-2026-08-17.md`, regression tests in
`backend/tests/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: a stand that describes the code under test

- [x] T001 Create the worktree and branch `qa/exercise-axes-wave2` from `origin/main`
- [x] T002 Build and start the QA stack from this worktree: `docker compose -f docker-compose.qa.yml up -d --build --wait`
- [x] T003 Migrate and seed: alembic upgrade head, `scripts/seed_qa.py`, `scripts/seed_corner_cases.py` (52 exercises, 5 lessons)
- [x] T004 Record the commit under test (`68dedf7`) and prove the image carries it by grepping `max_attempts_exhausted` in the container's `app/exercises/service.py`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: the instrument every server-side measurement depends on

**⚠️ CRITICAL**: US1 and US2 cannot record axis A until T006 exists

- [ ] T005 Read the Corner Cases exercise list as `qa-student@qa.example.com` and write down id, type and variant for all 52 rows, so later output is keyed by type rather than by uuid
- [ ] T006 Write `scripts/qa_axis_probe.py`: sign in as the QA student, derive each type's correct answer from `qa/exercise-fixtures.json`, and per exercise send the correct answer, an empty answer, a wrong-shaped answer, then four submissions against the V2 two-attempt limit, printing type, variant, request, status and score per request
- [ ] T007 Prove the probe's positive control works: the correct answer must score above zero for at least one type per wave, or the corner-case results mean nothing (Constitution II)
- [ ] T008 Record in `scripts/qa_axis_probe.py` which types have no derivable answer (`file_upload`, `scorm_package`, `whiteboard`, plus any found in T006) and why, so FR-005 is satisfied by the tool rather than by memory

**Checkpoint**: the probe can be re-run after any fix and produce comparable rows

---

## Phase 3: User Story 1 - Wave 2 answers its server questions (Priority: P1) 🎯 MVP

**Goal**: `robot_2d`, `world_3d`, `stereometry` and `math_interactive` measured on axes A, B and D

**Independent Test**: run the probe restricted to wave 2, and open lesson `8e6b2293-bf5d-54a1-8666-41eeee72a4f7` in the browser at 375px

- [ ] T009 [US1] Run the probe over wave 2 and capture the request and response table for all eight exercises
- [ ] T010 [US1] Check wave 2's axis-A results against what the wave-1 fixes promise: an empty answer scores zero instead of 500, the attempt limit stops at two, and a wrong answer does not pass
- [ ] T011 [P] [US1] Axis B at `localhost:3000`: per wave-2 type record `disabled`, `aria-disabled`, computed `opacity` and `cursor` on the submit control before input, then press it and record what the page does
- [ ] T012 [P] [US1] Axis D at 375 x 812: record page-level horizontal overflow, the widest element inside each wave-2 exercise, and every tap target under 44px
- [ ] T013 [US1] Reopen a wave-2 exercise the probe solved and record whether score and last attempt are shown, which is finding 5 asked of a different wave
- [ ] T014 [US1] Write wave 2 up in `tasks/qa-audit-exercise-types-2026-08-17.md`, replacing the "серверные оси в этой волне не проводились" caveat with results, each carrying its status code or measurement

**Checkpoint**: wave 2 fully recorded, stale caveat gone

---

## Phase 4: User Story 3 - The reload claim is confirmed or withdrawn (Priority: P3, taken early)

**Goal**: axis C measured once instead of inferred

**Independent Test**: one exercise with no prior submission, half filled, reloaded

**Why here**: it costs one exercise and has to happen before the probe grades
every row. A graded exercise stops accepting input, which is exactly what blocked
this measurement on 2026-08-17

- [ ] T015 [US3] Pick an unsubmitted exercise, fill part of the answer, reload the page, record what survived
- [ ] T016 [US3] Replace the code-only note in the audit's axis C section with the measurement, keeping the grep result as supporting evidence rather than as the claim

---

## Phase 5: User Story 2 - Waves 3, 4 and 5 are walked at all (Priority: P2)

**Goal**: sixteen unmeasured types answered on all four axes

**Independent Test**: each wave is its own lesson and can be recorded alone

- [ ] T017 [US2] Wave 3 axis A (`code_challenge`, `web_editor`, `math_stepwise`, `math_system`), expecting `math_stepwise` to score zero on every submission because the server has no branch for it
- [ ] T018 [P] [US2] Wave 3 axes B and D in the browser, lesson `80901bec-2b1c-5337-b9d4-883019430864`
- [ ] T019 [US2] Write wave 3 up in the audit
- [ ] T020 [US2] Wave 4 axis A (`translation`, `sentence_builder`, `dialogue`, `conjugation`, `reading`)
- [ ] T021 [P] [US2] Wave 4 axes B and D in the browser, lesson `890e00a8-9282-5f5a-96cb-71bcaac0d7b0`
- [ ] T022 [US2] Write wave 4 up in the audit
- [ ] T023 [US2] Wave 5 axis A (`quiz`, `true_false`, `fill_blanks`, `srs_flashcard`, `bubble_sheet`, `file_upload`, `scorm_package`), recording the ungradeable types as skips with reasons
- [ ] T024 [P] [US2] Wave 5 axes B and D in the browser, lesson `b41202bb-8a37-555d-9be7-54b172ed6dff`
- [ ] T025 [US2] Write wave 5 up in the audit

**Checkpoint**: all 26 types carry a result or a written reason on every axis

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T026 Re-check finding 2 across every type walked here and say how far the dishonest submit control reaches, replacing the single-wave count
- [ ] T027 Re-check finding 7 by comparing each type's on-screen instruction with the condition its grader applies, and say whether the mismatch is one fixture or a pattern
- [ ] T028 Correct the audit's stale fix statuses against `main`: finding 6 fixed by `ae67aa4`, findings 3 and 4 by `59ba620`, finding 5 by `735e559`, all inside `#319`
- [ ] T029 Per new finding, decide fix-now or record-with-reason; where fixed, add the regression test to `backend/tests/` shown failing first
- [ ] T030 Run the backend suite against real PostgreSQL and confirm the QA seed data the Playwright gate reads is untouched
- [ ] T031 Open the pull request with the audit, the probe and any fixes, listing what was measured and what was skipped with reasons

---

## Dependencies & Execution Order

- Phase 1 is done; the stand is up at `68dedf7`.
- Phase 2 blocks every axis-A task. T006 depends on T005 for the exercise list.
- US3 (T015, T016) runs before the probe grades everything, so it sits ahead of
  US2 despite being P3.
- US1 depends only on Phase 2. US2 depends on Phase 2 and reuses US1's probe
  invocation, but no US2 task waits on a US1 result.
- Phase 6 depends on every wave being written up, because its subject is the
  document as a whole.

### Parallel Opportunities

- T011 and T012 share one browser session per wave and are collected in a single
  pass; they carry [P] because they are different measurements, not different
  files.
- Axis A for a later wave can run while an earlier wave's browser axes are still
  being recorded.

---

## Implementation Strategy

### MVP

Phase 2 plus US1. That alone turns wave 2 from "rendering looked fine" into a
measured wave, and it is the wave whose grading moved server-side this week.

### Incremental delivery

Each wave goes into the audit as it finishes. The document is the deliverable, so
an interrupted run still ships what it measured.

## Notes

- Reset the data, not the images, between passes: `down -v`, `up -d --wait`,
  migrate, then both seeds. About thirty-five seconds.
- The seed is idempotent, so submissions from an earlier pass survive a re-seed
  and read as an unresponsive interface. When a result looks like finding 5,
  check for an old submission first.
- Nothing here may modify the QA course, lesson or exercises that
  `scripts/seed_qa.py` creates. The Playwright PR gate reads them.

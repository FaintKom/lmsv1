---

description: "Task list for 006-exhausted-attempt-verdict"
---

# Tasks: Running out of attempts is not passing

**Input**: `/specs/006-exhausted-attempt-verdict/`

**Prerequisites**: spec.md, plan.md

## Phase 1: Test first

- [ ] T001 [US1] Add a regression test to `backend/tests/test_submissions.py`: a solved submission stays passed, two wrong attempts exhaust a two-attempt exercise, the third press stores `passed: false` with `score: 0` and the exhaustion marker, and a fourth press returns the same row
- [ ] T002 [US1] Run it against this branch's parent and confirm it fails on the verdict rather than on the setup

## Phase 2: Backend

- [ ] T003 [US1] In `backend/app/exercises/service.py`, write the exhaustion row with `passed=False`, and replace the "Mark as passed so student can proceed" comment with what actually lets the student continue
- [ ] T004 [US1] Green the test, then run the submissions, exercises, integrity and tenancy suites against real PostgreSQL

## Phase 3: Interface

- [ ] T005 [US2] In `frontend/src/components/exercises/exercise-renderer.tsx`, have the result panel name the exhausted state and offer no "Try Again" when `maxReached` is set
- [ ] T006 [US2] Lint and typecheck the frontend

## Phase 4: Record

- [ ] T007 Open the pull request stating what was checked before flipping the field: which modules read `passed`, and that none of them gates progression
- [ ] T008 Mark finding 10 fixed in `tasks/qa-audit-exercise-types-2026-08-17.md` once #339 has landed on `main`

## Dependencies

T001 before T003, or the fix arrives without evidence it was needed. T005 depends
on nothing, but reads better after T003: the panel's honest branch only matters
once the verdict is honest.

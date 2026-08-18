# Feature Specification: The server marks a step-by-step answer

**Feature Branch**: `fix/math-stepwise-server-graded`

**Created**: 2026-08-18

**Status**: Draft

**Input**: `math_stepwise` scoring zero for every answer — recorded in the corner-case run and in `tasks/todo.md`.

**One file, like 007 and 008**: a branch, a moved function and a test.

## What is wrong

`math_stepwise` had no branch in the submit dispatch, so it fell through to
`_submit_interactive`, and `grade_interactive` has no case for it either. Every
submission scored 0 and was recorded as not passed, whatever the student wrote.
Measured on all 26 types, 2026-08-18: the fixture's own correct answer, `3`,
came back `score: 0`, `passed: false`.

A student who solves the problem is told they failed it, and the class average
says the exercise is hard rather than unmarked.

The comparison itself is not missing from the product. `/math-validation/check-answer`
already does it, and the browser calls that endpoint while the student works, then
posts its verdict as `correct` in the submission. Nothing on the server reads that
field — which is right, since anyone can post `correct: true` — but it left the
type with no marking at all.

## Requirements *(mandatory)*

- **FR-001**: A correct final answer MUST score 100 and be recorded as passed.
- **FR-002**: A wrong final answer MUST score 0, whatever `correct` flag the
  client sends.
- **FR-003**: The comparison MUST be the one `/math-validation/check-answer` uses,
  so a student is marked the same way whether they check as they go or submit at
  the end. One implementation, not two.
- **FR-004**: An exercise with no expected answer MUST behave as every other
  grader does, full marks, and MUST leave the same empty-key warning behind, so a
  misconfigured exercise stays findable.
- **FR-005**: Steps MUST be stored and MUST NOT affect the score. Marking a route
  needs a per-step equivalence check the product does not have.

## Success Criteria *(mandatory)*

- **SC-001**: Submitting `3` to a fixture expecting `3` scores 100.
- **SC-002**: Submitting `x = 3` to the same exercise also scores 100, because the
  shared parser strips the `x =` prefix.
- **SC-003**: Submitting `4` with `correct: true` scores 0.
- **SC-004**: `/math-validation/check-answer` answers exactly as it did before.

## Plan

**Files**: `backend/app/math_validation/service.py` (gains `parse_answer_set` and
`answers_match`), `backend/app/math_validation/router.py` (loses its private copy
and calls the service), `backend/app/exercises/service.py` (dispatch plus
`_submit_math_stepwise`), `backend/app/submissions/service.py` (the empty-key
warning becomes public, `math_stepwise` joins the watchlist),
`backend/tests/test_submissions.py`, `backend/tests/test_math_validation.py`
(imports follow the moved function).

**Why the parser moves rather than being called over HTTP**: the endpoint's
`_parse_answer_set` was already the only implementation, and the submit path needs
that one. Moving it into the service — where `solve_linear_system` and
`solutions_match` already live for exactly this reason — leaves one parser.
Calling the endpoint from the server would mean an internal HTTP round trip for a
string comparison.

**What stays out**: stripping `final_answer` from the config a student receives.
The server marks now, so stripping becomes possible, but the browser still
compares locally for immediate feedback and would have to stop first. That is the
second half of `004-exercise-answer-leak` for this type, and it is tracked there.

## Tasks

- [x] T001 Move the answer parser into `math_validation/service.py`, leave the
      endpoint calling it, follow the imports in the existing test.
- [x] T002 Add `_submit_math_stepwise` and dispatch to it.
- [x] T003 Make the empty-key warning public and watch `math_stepwise`.
- [x] T004 Regression test: correct scores, `x = 3` scores, wrong with
      `correct: true` does not. Shown failing first.
- [x] T005 Backend suites against real PostgreSQL.
- [ ] T006 Mark it fixed in the audit and in `tasks/todo.md`.

## Assumptions

- Steps stay unmarked. Changing that is a teaching decision with a real
  implementation behind it, not a fix.
- The client keeps its local check. It is a hint for the student; the row is the
  server's.

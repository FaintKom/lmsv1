# Feature Specification: A code challenge its own solution can pass

**Feature Branch**: `fix/code-challenge-fixture-solvable`

**Created**: 2026-08-18

**Status**: Draft

**Input**: Finding 11 of the corner-case run, `tasks/qa-audit-exercise-types-2026-08-17.md`.

**One file, like 007**: a data fix and a test. Plan and tasks are sections here.

## What is wrong

The seeded `code_challenge` cannot be solved by the solution it ships with.

`solution_code` defines a function, `def add(a, b): return a + b`. The test cases
feed `1 2` on stdin and expect `3` on stdout. A function definition reads nothing
and prints nothing, so the sandbox ran it happily — `status: success`, 19 ms, empty
`stderr` — produced no output, and both cases failed. Measured 2026-08-18: the
reference solution scores 0.

`starter_code` points the same way. `def add(a, b): pass` tells the student to
write a function, which cannot pass either. A student who reads the test cases can
work out that a program is wanted; a student who trusts the starter cannot.

This fixture is not a corner of the QA stack. `seed_qa.py`, `seed_corner_cases.py`
and `create_kitchen_sink_course.py` all read it, so the same unsolvable exercise
sits in the Kitchen Sink course people click through by hand.

Nothing caught it. `scripts/check_python_content.py` runs exactly this check — a
reference solution against its own test cases — but only over the authored Python
course, never over the fixtures.

## Requirements *(mandatory)*

- **FR-001**: The seeded `code_challenge` MUST be passable by its own
  `solution_code`, judged the way the product judges it: stdin in, stdout out.
- **FR-002**: `starter_code` MUST lead to that shape, so a student following it can
  reach a pass.
- **FR-003**: A test MUST run every python `code_challenge` fixture's solution
  against its own test cases and fail when the solution does not pass, so this
  class of defect cannot return quietly.
- **FR-004**: The guard MUST run in CI with the rest of the backend suite. A check
  that has to be remembered is the reason this one was missed.
- **FR-005**: The QA course, its lesson and the Playwright gate MUST keep working.

## Success Criteria *(mandatory)*

- **SC-001**: Submitting the fixture's own `solution_code` scores 100.
- **SC-002**: The guard fails if the solution is changed back to a bare function.
- **SC-003**: No test case is dropped or weakened to make this pass.

## Plan

**Files**: `qa/exercise-fixtures.json`, `backend/tests/test_qa_fixtures.py` (new).

**The shape**, taken from how a submission is actually judged: the sandbox runs the
file, feeds `test_case.input` to stdin and compares stdout with `expected_output`.
So the solution reads a line, splits it and prints the sum, and the starter shows
the reading while leaving the printing.

**The guard** runs the solution in a subprocess with a timeout, the approach
`check_python_content.py` already uses, rather than importing that script: it lives
outside the backend package and is run by hand, while a test in `backend/tests/`
runs in CI on every pull request. Eight lines of subprocess beat making a hand-run
script importable across trees.

**Not fixed here**: the same class in the authored course content, which
`check_python_content.py` already covers. Wiring that script into CI is worth doing
and is not this change.

## Tasks

- [ ] T001 Test first: run each python `code_challenge` fixture's `solution_code`
      against its own `test_cases`. Red against the current fixture.
- [ ] T002 Rewrite `solution_code` and `starter_code` as a stdin/stdout program,
      leaving both test cases untouched.
- [ ] T003 Green, then the backend suites against real PostgreSQL.
- [ ] T004 Mark finding 11 fixed in the audit.

## Assumptions

- Only python fixtures are executed by the guard. Another language would need that
  runtime present in CI, and there is no such fixture today.
- The exercise stays a one-line adder. Making it a better teaching task is a
  content decision, not this fix.

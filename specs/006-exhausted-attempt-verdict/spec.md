# Feature Specification: Running out of attempts is not passing

**Feature Branch**: `fix/exhausted-attempt-not-passed`

**Created**: 2026-08-18

**Status**: Draft

**Input**: Finding 10 of the corner-case run, `tasks/qa-audit-exercise-types-2026-08-17.md`.

## What is wrong

A student who uses up their attempts without solving the exercise is recorded as
having passed it. Measured 2026-08-18 across all 26 exercise types: the third
press against a two-attempt exercise returns `passed: true` with `score: 0`, and
that row is what the gradebook, the analytics mastery figure and the student
profile read.

The row itself is deliberate. Being stuck forever on one exercise is worse than
being shown the answer, so the server writes an exhaustion row and lets the
student move on. What is wrong is the verdict it carries: "let through" and
"passed" are the same value in the database, so a school reading its own gradebook
cannot tell a class that solved the work from a class that ran out of tries.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The gradebook tells the truth (Priority: P1)

A teacher opens the journal after a class has worked through an exercise with a
two-attempt limit. Students who solved it show as passed. Students who ran out of
attempts show as not passed, marked as having exhausted their attempts.

**Why this priority**: it is the whole finding. Everything else follows from it.

**Independent Test**: exhaust the limit on one exercise, read the stored row and
the journal figure for that student.

**Acceptance Scenarios**:

1. **Given** an exercise with two attempts and two wrong submissions, **When** the
   student presses submit again, **Then** the stored row carries `passed: false`
   and `score: 0`, and the response says `max_attempts_reached: true` with
   `attempts_remaining: 0`.
2. **Given** the same exercise, **When** the student had already solved it,
   **Then** that submission stays `passed: true` and is not overwritten.
3. **Given** an exhausted exercise, **When** the student presses submit twice
   more, **Then** both presses return the same stored row and the attempt count
   does not move.

### User Story 2 - The student is not invited to retry what they cannot (Priority: P2)

A student whose attempts are gone sees that they are gone, rather than a "Try
Again" button leading back to the same wall.

**Why this priority**: the honest verdict makes the result panel say "Not quite"
with a retry button under it, which is worse than what it replaced unless the
exhausted state is handled.

**Independent Test**: exhaust an exercise in the browser and read what the result
panel offers.

**Acceptance Scenarios**:

1. **Given** an exhausted exercise, **When** the result panel renders, **Then** it
   names the exhausted state and offers no retry.

### Edge Cases

- An exercise with no attempt limit. `max_attempts = null` means 100 internally,
  so nothing here changes for it.
- A student who passed and then pressed submit again after exhaustion. The passing
  row must survive; that was fixed in `59ba620` and stays fixed.
- Types with no correct answer to reveal. The exhaustion row still has to be
  distinguishable, so the marker lives in the row rather than in what is shown.

## Requirements *(mandatory)*

- **FR-001**: The exhaustion row MUST carry `passed: false`.
- **FR-002**: The exhaustion row MUST stay distinguishable from an ordinary failed
  attempt through the marker it already carries,
  `answers.max_attempts_exhausted`.
- **FR-003**: The response MUST keep reporting `max_attempts_reached: true` and
  `attempts_remaining: 0`, so a client can tell the two apart without reading
  `answers`.
- **FR-004**: Letting the student move on MUST NOT depend on the verdict. No
  progression gate may start reading `passed` as permission to continue.
- **FR-005**: The student's own best result MUST NOT be overwritten by the
  exhaustion row.
- **FR-006**: The result panel MUST NOT offer a retry once attempts are gone.

## Success Criteria *(mandatory)*

- **SC-001**: After exhausting a two-attempt exercise, the journal counts that
  student as not passing it.
- **SC-002**: A student who solved the exercise before exhausting it still counts
  as passing.
- **SC-003**: The attempt count stops at the limit however many times submit is
  pressed.
- **SC-004**: A student with no attempts left can still leave the exercise and
  carry on with the lesson.

## Assumptions

- Nothing gates progression on `passed` today. Checked across the backend: the
  field is read by the journal, analytics, task stats and the student profile, all
  of them reporting rather than gating.
- The marker in `answers` is enough for reporting, so there is no new column and
  no migration.
- Existing rows are left alone. Rewriting them would change figures schools have
  already seen, and the audit records what those figures meant.

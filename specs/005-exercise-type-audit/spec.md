# Feature Specification: Finish the exercise-type corner-case run

**Feature Branch**: `qa/exercise-axes-wave2`

**Created**: 2026-08-18

**Status**: Draft

**Input**: Continue the run recorded in `tasks/qa-audit-exercise-types-2026-08-17.md`: wave 2 on the axes that never ran, then waves 3-5, against a QA stack built from the code under test.

## Why this exists

A school that buys this product buys 26 exercise types. Six of them have been
measured against a student who clears a field, runs out of attempts, comes back
to a solved task, or opens the lesson on a phone. The other twenty have been
measured against nothing.

The first wave found six defects in six types, and five of them are fixed and in
`main`. The remaining twenty types have not been asked the same questions, and
the one wave walked after those fixes ran against containers built from older
code, so its server answers were discarded rather than recorded.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Wave 2 answers its server questions (Priority: P1)

The four game and 3D types (`robot_2d`, `world_3d`, `stereometry`,
`math_interactive`) were walked for rendering only. Whether they survive an
empty answer, an exhausted attempt limit, a return visit after a correct
submission, or a 375px screen is unknown.

**Why this priority**: this wave is the one already half done, and it holds the
types whose grading moved server-side this week. A regression here is a
regression in work that just shipped.

**Independent Test**: seed the Corner Cases course on a stack built from the
commit under test, submit the corner-case bodies against each of the eight
exercises, and read the response codes.

**Acceptance Scenarios**:

1. **Given** a wave-2 exercise and an empty answer body, **When** the student
   submits, **Then** the server answers 200 with a score of zero, and the code
   is recorded next to the observation.
2. **Given** a wave-2 exercise with `max_attempts = 2`, **When** the student
   submits four times, **Then** the attempt count stops at the limit and later
   presses return the stored exhaustion row.
3. **Given** a solved wave-2 exercise, **When** the student reopens it,
   **Then** the last attempt and its score are on screen.
4. **Given** a wave-2 exercise at 375px, **When** the page is measured,
   **Then** nothing is wider than the viewport and every tap target is at least
   44px, or the failure is written down with its measurement.

---

### User Story 2 - Waves 3, 4 and 5 are walked at all (Priority: P2)

Sixteen types have never been opened by this run: code and maths
(`code_challenge`, `web_editor`, `math_stepwise`, `math_system`), languages
(`translation`, `sentence_builder`, `dialogue`, `conjugation`, `reading`), and
the plain ones (`quiz`, `true_false`, `fill_blanks`, `srs_flashcard`,
`bubble_sheet`, `file_upload`, `scorm_package`).

**Why this priority**: it is the bulk of the product surface and the cheapest
place left to find a defect. It sits below wave 2 only because wave 2 is half
finished.

**Independent Test**: each wave is its own lesson in the seeded course, so it
can be walked, recorded and stopped on its own.

**Acceptance Scenarios**:

1. **Given** any type in waves 3-5, **When** the four axes are run against it,
   **Then** each answer carries a response code, a traceback or a measured
   value, and no type is reported as covered without one.
2. **Given** a type whose axis cannot be run, such as `file_upload` with no
   server grade or `scorm_package` reporting through CMI, **When** that axis is
   skipped, **Then** the reason is written down instead of the cell being left
   blank.

---

### User Story 3 - The reload claim is confirmed or withdrawn (Priority: P3)

Axis C says no type keeps a draft across a reload. That came from reading the
code, not from pressing F5: the exercise picked for the click test had already
been graded and stopped accepting input.

**Why this priority**: the conclusion is probably right and costs one exercise
to settle. Left as it is, the audit carries a claim nobody measured.

**Independent Test**: open one unsubmitted exercise, fill part of it, reload,
and look.

**Acceptance Scenarios**:

1. **Given** an exercise with no prior submission, **When** the student answers
   half of it and reloads, **Then** the audit records what survived and the
   code-only note is replaced by the measurement.

---

### Edge Cases

- A wrong fixture reads exactly like a wrong renderer. The crossword taught
  this: the first note blamed the renderer, and the board was empty because the
  fixture used keys nothing reads. Every finding says which of the two it is
  before it is called a product defect.
- Some types cannot be graded by the server by design. `file_upload` goes to the
  teacher, `whiteboard` is manual, `scorm_package` reports through CMI. Those
  are skips with a reason, not passes.
- An exercise already solved by an earlier run reads as "the interface ignores
  my clicks" when the truth is "this was graded yesterday". Seeding is
  idempotent, so old submissions survive a re-seed.
- A finding can exist only because the stack is stale. Wave 2's server axes were
  discarded for that reason, and the same mistake is available again on every
  rebuild.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The run MUST execute against a stack built from the commit under
  test, and MUST record which commit that is. An observation taken against
  unknown code is not a result.
- **FR-002**: Every finding MUST carry its evidence: a response code, a
  traceback, or a measured number. No line is written from inference alone.
- **FR-003**: Every axis MUST open with a positive control proving the path
  works at all. A correct answer scores first; then the corner case is tried.
- **FR-004**: Every finding MUST say whether it is product code or fixture data,
  and name the file that holds the defect.
- **FR-005**: A skipped axis MUST be written down with its reason, so the audit
  never reads as covered where it is not.
- **FR-006**: Findings MUST extend `tasks/qa-audit-exercise-types-2026-08-17.md`
  rather than starting a second document.
- **FR-007**: The stale status in that document MUST be corrected: finding 6 is
  marked as not fixed while the fix is in `main`, which makes the audit lie
  about the product.
- **FR-008**: Findings 2 and 7 MUST be re-checked against the types walked here,
  so the audit says how far each spreads instead of leaving them as single-wave
  observations.
- **FR-009**: A defect found here MUST be either fixed in this run, with a test
  shown failing first, or recorded with the reason it was left. The choice is
  stated per finding.
- **FR-010**: Any fix MUST keep the backend suite green against real PostgreSQL
  and MUST NOT change the QA seed data the Playwright gate reads.

### Key Entities

- **Wave**: a lesson in the Corner Cases course holding one group of types,
  ordered so the riskiest renderers come first.
- **Variant**: every type is seeded twice, V1 without an attempt limit and V2
  with two, so the limit can be exhausted without spoiling the other copy.
- **Axis**: one question asked of every type. A is the server's answer to an
  empty or malformed submission, B is whether the submit control tells the
  truth, C is a reload mid-answer, D is a 375px screen.
- **Finding**: a defect with a reproduction, its evidence, its location, and a
  decision about fixing it.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 26 types have a recorded result on every axis, or a written
  reason why that axis does not apply.
- **SC-002**: Every finding can be reproduced by a reader holding only the
  document, the seed script and a QA stack.
- **SC-003**: No finding rests on reading the code alone, unless the document
  says so in the same sentence.
- **SC-004**: The audit's fix statuses match `main` when the run ends, so a
  reader can act on the document without checking commit history.
- **SC-005**: A student who clears a field, exhausts the attempt limit, returns
  to a solved task, or opens the lesson at 375px gets the same answer from every
  type, or the difference is written down.

## Assumptions

- The Corner Cases course from `scripts/seed_corner_cases.py` is the stand. It
  covers all 26 types twice and only adds rows, so it cannot disturb the QA
  course the Playwright gate depends on.
- `qa-student@qa.example.com` is the student, and the QA teacher account is used
  where a teacher's view is needed.
- The stack runs from an isolated worktree, so a neighbouring session's branch
  cannot become the code under test. That is what happened on 2026-08-17.
- Fixing the systemic pattern behind finding 6 across every grader is out of
  scope. This run records where it still applies.
- Mobile means 375 x 812 in the browser driving the QA stack. Real devices are
  out of scope.

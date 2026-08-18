# Feature Specification: A bubble sheet that can be answered, and a warning that fires

**Feature Branch**: `fix/bubble-sheet-unfailable`

**Created**: 2026-08-18

**Status**: Draft

**Input**: Findings 9 and 12 of the corner-case run, `tasks/qa-audit-exercise-types-2026-08-17.md`.

**One file on purpose**: the change is a data fix plus five dictionary entries.
Plan and tasks are sections here rather than separate documents, because a
three-file ceremony around ten lines of diff is what this project's constitution
tells us not to build.

## What is wrong

Two halves of one mistake, measured 2026-08-18 on the QA stack.

The grader awarded 100 to every bubble-sheet submission, an empty one included,
because `_grade_bubble_sheet_detail` walks `content["questions"]` while the seeded
config wrote `question_count`, `choices_per_question` and `correct_answers`. With
no questions found, the grader answered "full marks, passed" — its documented
behaviour for content that has nothing to get wrong.

The renderer reads the same key, so the card drew a heading, a CHECK button and
nothing else: no bubbles, not one A-to-D letter anywhere in it. A student saw
nothing to answer and was awarded full marks for it.

The warning built for this exact shape of defect stayed silent. Its watchlist held
nine types; `bubble_sheet` was not among them, and neither were `dialogue`,
`translation`, `sentence_builder` or `map_pin_drop`. The list was kept short
deliberately, on the grounds that a wrong entry warns about correctly configured
content — and then the first type outside it produced the failure the warning
existed to catch.

## Requirements *(mandatory)*

- **FR-001**: A configured bubble sheet MUST be markable: correct answers score,
  an empty answer scores zero.
- **FR-002**: The seeded bubble sheet MUST use the shape both the grader and the
  renderer read, so the card draws bubbles a student can fill.
- **FR-003**: Every type whose grader keys off a config field MUST be on the
  empty-key watchlist, so an unmarkable exercise of any type leaves a trace.
- **FR-004**: Each watchlist entry MUST name a key its grader really reads. A
  wrong entry warns about correct content, which is worse than silence.
- **FR-005**: The grade for an unmarkable exercise MUST stay as it is, full marks.
  Scoring zero would punish students for a mistake in the exercise, and the two
  cases cannot be told apart while marking.
- **FR-006**: The QA course and lesson the Playwright gate reads MUST keep
  working. This fixture is shared with `seed_qa.py`.

## Success Criteria *(mandatory)*

- **SC-001**: An empty submission against the seeded bubble sheet scores 0, not
  100.
- **SC-002**: The seeded card shows five numbered questions with four options
  each.
- **SC-003**: An unmarkable exercise of any watched type writes one warning naming
  the type and the missing key.
- **SC-004**: No warning is written for a correctly configured exercise of any
  watched type.

## Plan

**Files**: `qa/exercise-fixtures.json` (the `bubble_sheet` entry),
`backend/app/submissions/service.py` (`_ANSWER_KEY_BY_TYPE`),
`backend/tests/test_submissions.py`.

**Canonical shape**, taken from the two readers rather than invented:
`questions[{number, question, correct}]` where `correct` is the option letter,
plus `num_options`. `_grade_bubble_sheet_detail` compares `q["correct"]`
uppercased; `v2-exercise-live.tsx` turns that letter into the index its widget
draws. The answer-stripping path already removes `correct` before a student sees
the config.

**Why not teach the grader the old shape instead**: two readers already agree on
`questions`, the strip is written against it, and the admin editor has no
bubble-sheet form at all, so the only content in the old shape is seeded content.
Changing the data is smaller than changing two readers and a strip.

**Risk**: the fixture feeds `seed_qa.py`, which the Playwright PR gate reads. The
lifecycle spec asserts a submit returns below 500 and asserts no score for this
type, so a markable sheet does not break it.

## Tasks

- [x] T001 Test first: a configured sheet scores and can be failed; an unmarkable
      one still passes but warns. Red on both counts before the fix.
- [x] T002 Test that every watchlist entry names a key its grader reads, so a
      future addition cannot warn about correct content.
- [x] T003 Add `bubble_sheet`, `dialogue`, `translation`, `sentence_builder` and
      `map_pin_drop` to `_ANSWER_KEY_BY_TYPE`, having read each grader.
- [x] T004 Rewrite the `bubble_sheet` fixture into the shape both readers use,
      with a note recording which keys are read and why the old ones were not.
- [x] T005 Backend suites against real PostgreSQL.
- [ ] T006 Confirm in the browser that the seeded card draws bubbles. Blocked
      while another session holds the QA stack; the ports are shared.
- [ ] T007 Mark findings 9 and 12 fixed in the audit once #339 has landed on
      `main`.

## Assumptions

- Existing rows are left alone. A school that already saw 100 for an empty sheet
  keeps that row, and the audit records what it meant.
- No migration: nothing about the schema changes.

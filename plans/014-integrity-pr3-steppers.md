# 014 — Integrity model B, PR-3: quiz, reading, dialogue, crossword steppers

- **Status**: TODO
- **Commit**: a01d106
- **Severity**: HIGH (per-question answers readable in DevTools)
- **Category**: integrity model B (server-graded exercises)
- **Estimated scope**: backend (~120 lines + tests), 4 component dual-modes (~500 lines)

## Problem

Four per-question ("stepper") types still leak answers to students:

- **quiz** — answers live in the `questions` RELATION, not config.
  `_strip_answers` already removes `is_correct`/`correct_answer` from the
  serialized questions, BUT quiz-v2 grades locally from props and the live
  path has no per-question server check.
- **reading** — `config.questions[].correct_answer` and
  `options[].is_correct` reach the student.
- **dialogue** — `config.messages[].options[].is_correct` reaches the
  student.
- **crossword** — `config.words[].word` (the solution words) reach the
  student; only positions/clues/lengths are needed to render the grid.

These types give feedback per question/word (steppers), so they need the
non-persisting `/check` endpoint (shipped in PR-1) with per-item verdicts,
plus a final submit.

Prereq: plan 013 SHOULD land first (it establishes the onCheck plumbing in
`V2ExerciseLive`); if it hasn't, implement the onCheck plumbing here exactly
as specified in plan 013 step 7.

## Target

### Backend

1. `_strip_answers` (`backend/app/exercises/router.py`):
   - reading: in `config.questions[]` drop `correct_answer`; in each
     `options[]` entry drop `is_correct` (options may be plain strings —
     leave those untouched).
   - dialogue: in `config.messages[].options[]` drop `is_correct` (same
     string-tolerance).
   - crossword: in `config.words[]` keep `clue`, `row`, `col`, `direction`,
     and ADD `length: len(word)`; drop `word`.
   - quiz: verify nothing further needed (relation already stripped).
2. `grade_interactive_detail` (`backend/app/submissions/service.py`)
   branches:
   - reading → per_item `{str(question_index): bool}` (reuse
     `_grade_reading` comparison logic via a `_grade_reading_detail`
     refactor).
   - dialogue → per_item `{str(message_index): bool}`.
   - crossword → per_item `{str(word_index): bool}`.
3. Quiz check: `/check` currently grades from `exercise.config` only. Quiz
   needs the relation. In the `/check` endpoint
   (`backend/app/exercises/router.py`, `check_exercise_endpoint`), add a
   quiz branch: when `exercise.exercise_type == ExerciseType.quiz`, grade
   `data.interactive_answers["answers"]`
   (`{str(question_id): selected_option_id_or_text}`) against
   `exercise.questions` (compare like `_submit_quiz` does — read that
   function first and reuse its comparison, factored into a helper so the
   two stay in sync). Return per_item keyed by `str(question_id)`.
4. Tests (extend `backend/tests/test_exercises_integrity.py`): strip per
   type (incl. crossword `length` present, `word` absent), `/check`
   per-item + no submission row, quiz `/check` via relation.

### Frontend

5. Dual-mode conversions following `conjugation-v2.tsx` exemplar, each with
   `onCheck` (per-question feedback, non-persisting) + `onGrade` (final
   submit once the last question is answered):
   - `quiz-v2.tsx` — one-question-at-a-time; on Check for question i call
     `onCheck` with ALL answers so far, read `perItem[questionId]`.
   - `reading-v2.tsx` — same per-question flow keyed by index.
   - `dialogue-v2.tsx` — per-message selection; verdict per message index.
   - `crossword-v2.tsx` — grid cells sized from `length` when `word` absent;
     Check verdicts per word index; reveal-on-fail unavailable in server
     mode (no words in payload) — skip the reveal, show score only.
6. `v2-adapter.ts`: `V2_LIVE_TYPES` += `"quiz", "reading", "dialogue",
   "crossword"`; `V2ExerciseLive` maps each config → props (quiz maps the
   `questions` relation from the exercise object, NOT config).

## Repo conventions to follow

- Exemplar dual-mode: `conjugation-v2.tsx`; adapter mapping exemplars in
  `v2-exercise-live.tsx` (bubble_sheet block shows index↔letter mapping
  discipline).
- Submit payload shapes must match the graders exactly — read
  `_grade_reading` / `_grade_dialogue` / `_grade_crossword` /
  `_submit_quiz` in the backend BEFORE writing the frontend payloads.
- Tests: `_make_typed` helper file patterns.

## Steps

1. Backend strips + detail graders + quiz `/check` branch + tests; pytest
   green.
2. Adapter wiring (types + config→props).
3. quiz-v2 dual-mode. 4. reading-v2. 5. dialogue-v2. 6. crossword-v2.
7. Full verification.

## Boundaries

- Same-PR verticality: strip + component together, never strip alone.
- Do NOT touch matching/categorize/map_pin (plan 013).
- Do NOT change scoring thresholds (0.7 pass etc.) — grading semantics stay
  identical.
- Quiz comparison logic must be FACTORED, not duplicated, from
  `_submit_quiz`.
- If any grader's payload shape differs from what a component sends today,
  STOP and reconcile on the backend's terms (grader is the contract).

## Verification

- **Mechanical**: backend integrity+exercises pytest green; frontend tsc +
  vitest + build green.
- **Feel check** (student account): each of the four types — config in
  DevTools shows no answers (`correct_answer`/`is_correct`/`word` absent);
  per-question Check gives verdicts without consuming attempts; finishing
  records exactly one submission; crossword grid renders correct cell
  counts from `length`.
- **Done when**: all four stepper types play fully server-graded and leak
  nothing.

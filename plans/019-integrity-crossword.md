# 019 — Crossword goes server-graded (last integrity leak)

- **Status**: DONE (2026-08-03)
- **Commit**: 2978465
- **Severity**: MEDIUM (real leak, but **zero prod content** — see Facts)
- **Category**: integrity model B
- **Estimated scope**: 1 component (~120 lines), adapter block, strip + 2 tests

## Facts measured before planning (2026-08-03)

- **Prod has 0 crossword exercises** (`select count(*) … where
  exercise_type='crossword'` → 0). Nothing to break, no migration worry.
- Config shape (from the seeder / editor):
  `{grid_size, words: [{word, clue, row, col, direction: "across"|"down"}]}`.
- The **legacy** renderer `components/exercises/crossword-exercise.tsx` is
  what students get today. It derives grid geometry from
  `w.word.length` (lines 47, 87, 104) and grades locally at line 109
  (`answer.toLowerCase() === w.word.toLowerCase()`), so a naive strip blanks
  the puzzle. This is why plan 014 deliberately left crossword alone.
- The **V2** widget `components/exercises/v2/crossword-v2.tsx` is cell-based:
  `cells: Record<"r,c", {ch, num?}>` where `ch` is the expected letter, plus
  `clues: {across, down}`. It grades locally by comparing typed letters to
  `cells[k].ch` at lines 183, 226, 352 and reveals with `cell.ch` at 374 —
  i.e. the answer is baked into its data model.
- The backend already returns per-word verdicts: `_grade_crossword_detail`
  keys `per_item` by **word index** (`{"0": true, "1": false}`), and
  `/exercises/{id}/check` is non-persisting and rate-limited (shipped #224).

## Target

1. **CrosswordV2 dual-mode.**
   - `CrosswordCell.ch` becomes optional. Add `onCheck?`, `onGrade?`,
     `onAnswersChange?`, and `wordIndexByNum?: Record<number, number>` (clue
     number → word index, so verdicts can be mapped back onto the grid).
   - Server mode (`onCheck` present):
     - Check builds `{words: {"<wordIndex>": "<typed letters>"}}` from the
       derived word runs (the component already derives runs — reuse
       `DerivedWord.keys`) and posts it to `/check`.
     - `per_item[wordIndex]` marks each word right/wrong: correct words lock
       (existing `locked` state), wrong ones clear their unlocked cells.
     - When every word is correct, call `onGrade` **once** with the same
       payload to record the submission.
     - Skip the reveal path entirely: with `ch` absent there is nothing to
       reveal, so the out-of-hearts sheet shows the score only
       (`answerSummary` stays undefined live).
   - Preview mode (no `onCheck`) keeps today's letter comparison unchanged.
2. **Adapter** (`v2-exercise-live.tsx`): build the cell map from the stripped
   config — for each word, walk `length` cells from `(row, col)` in
   `direction`, writing `{num}` on the first cell (numbering: first-come
   order, across before down at the same cell, matching the legacy
   renderer's numbering so clue lists line up). Emit `clues.across` /
   `clues.down` from `clue`, and `wordIndexByNum`. Then
   `V2_LIVE_TYPES += "crossword"`.
3. **Strip** (`_strip_answers`): for a crossword config
   (`words` present **and** `grid_size` present — the sentence_builder
   `words` key must stay untouched, see the existing guard), replace each
   entry with `{clue, row, col, direction, length: len(word)}` and drop
   `word`.
4. **Tests** in `backend/tests/test_exercises_integrity.py`:
   - strip: `word` absent, `length` present, clue/geometry intact,
     sentence_builder unaffected (already covered — keep it passing)
   - `/check`: per-word verdicts, no submission row created

## Repo conventions to follow

- Dual-mode exemplars, in order of similarity: `reading-v2.tsx` (per-item
  verdicts keyed by index), `matching-v2.tsx` (lock-correct / clear-wrong on
  server verdicts), `dialogue-v2.tsx` (stepper state).
- Adapter mapping exemplar: the `reading` and `dialogue` blocks in
  `v2-exercise-live.tsx`.
- The grader is the contract: read `_grade_crossword_detail` before writing
  the payload — it lower-cases and trims, and keys by word index as a string.

## Steps

1. Component: make `ch` optional, add the three callbacks + `wordIndexByNum`,
   branch `handleCheck`.
2. Adapter: geometry → cells/clues, wire `onCheck`/`onGrade`, extend
   `V2_LIVE_TYPES`.
3. Backend strip + tests; `pytest tests/test_exercises_integrity.py`.
4. Verify: tsc, eslint on touched files, vitest, `next build`; then create one
   crossword exercise in prod through the teacher UI and play it as a student
   (config in DevTools must carry no `word`).

## Boundaries

- Do NOT touch the legacy `crossword-exercise.tsx`; once `crossword` is in
  `V2_LIVE_TYPES` students never reach it, and teachers keep the full config.
- Do NOT change grading thresholds or the payload shape the grader expects.
- Do NOT strip without the component in the same PR (the verticality rule
  that governed PR-1…PR-3).
- If the config in the wild turns out to carry `cells` rather than `words`,
  STOP and report — the plan assumes the `words[]` shape measured above.

## Verification

- **Mechanical**: backend integrity suite green; tsc + eslint + vitest +
  build green.
- **Feel check**: create a 2-word crossword as a teacher, open as a student —
  grid renders with correct cell counts, Check locks solved words and clears
  wrong ones without spending an attempt (Network shows `/check`), solving
  everything records exactly one submission, and the student config in
  DevTools has `length` but no `word`.
- **Done when**: crossword plays fully server-graded and the last integrity
  leak is closed.

# Implementation Plan: Unified Answer System

**Branch**: `feat/answer-system` | **Date**: 2026-08-19 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/019-answer-system/spec.md`

## Summary

One grading truth per behaviour, stored where the question already lives:

1. **Adaptive choice** — `is_answer_correct` (assessments/grading.py) gains a
   multi branch: >1 correct option ⇒ expect `selected_options: []`, grade by
   set equality; single stays `selected_option`. The student payload gets a
   derived `multi` flag added in `_strip_answers` (exercises/router.py:729),
   which already rewrites stripped questions — no schema change, options
   stay keyless. Student quiz components render checkboxes when `multi`.
2. **Text rules** — per-question settings live in the free `Question.options`
   JSONB for `text_answer` questions (`{case_sensitive, trim,
   ignore_punctuation, accepted: []}`); one shared normalizer used by
   `is_answer_correct`, hence automatically by submit, `/check` and live
   lessons (they all call the same helper). Defaults reproduce today's
   `strip().lower()` equality.
3. **Reading** — its per-question grading (`_grade_reading_detail`,
   submissions/service.py:488) reuses the same set-equality and text-rule
   helpers; option dicts with several `is_correct` grade as sets; the
   stripped reading config gains the same `multi` flag; passage becomes
   HTML-with-images via the existing `/courses/upload-image` (editor button)
   and renders through ContentRenderer (already HTML-capable).
4. **Translation** — `_grade_translation` keeps today's behaviour under
   `fuzzy_match: true` (default); `false` requires exact (case rule intact).
   Editor shows all three rules with plain-language labels.
5. **Instructions note** — `config.instructions` (string, default "")
   rendered by ExerciseRenderer and V2ExerciseLive above the task; one
   optional field added to the shared part of the exercise editor page (all
   types at once), not per-editor.

No migrations (Question.options and config are JSONB). No new endpoints.

## Technical Context

**Language/Version**: Python 3.12 backend graders; TS/React frontend.

**Storage**: existing JSONB columns; no migration.

**Testing**: pytest — grading matrix (single/multi/sets, text rules,
grandfathering: fixtures authored "the old way" grade identically),
translation fuzzy toggle; Vitest for the multi-render decision; browser
pass.

**Constraints**: FR-005 grandfathering is the hard wall — every default
must equal current behaviour; six-locale i18n; `multi` must not leak keys.

**Scale/Scope**: ~3 backend files + tests; quiz/reading/translation editors,
2 student quiz components, shared renderers; 6 locales.

## Constitution Check

- **I. Tenant isolation** — PASS: no id handling changes.
- **II. Tests that can fail** — PASS: multi-grading tests fail red against
  today's single-only grader; text-rule tests fail red before the
  normalizer honors settings; grandfather tests pin old fixtures.
- **III. Server is the only judge** — PASS and central: all rules live in
  server graders; the `multi` flag is derived server-side and keyless.
- **IV. Docs** — PASS: no counts/claims change (no 27th type — recorded
  assumption).
- **V. Smallest change** — PASS: rules ride existing JSON, one normalizer,
  one flag.

No violations.

## Project Structure

```text
backend/app/
├── assessments/grading.py        # multi-set branch + text-rule normalizer
├── exercises/router.py           # _strip_answers: + multi flag (quiz, reading)
└── submissions/service.py        # reading reuses helpers; translation fuzzy toggle

backend/tests/test_answer_system.py   # NEW: matrix + grandfathering

frontend/src/
├── components/exercises/v2/quiz-v2.tsx (актуальный V2 quiz-компонент)
├── components/exercises/exercise-renderer.tsx   # QuizExercise multi render; instructions note
├── components/exercises/v2-exercise-live.tsx    # instructions note
├── components/assessments/quiz-taker.tsx        # legacy quiz lessons: multi render
├── app/(admin)/admin/content-library/[exerciseId]/page.tsx
│     # QuizQuestionsEditor: text-rule controls + multi hint; shared
│     # optional instructions field for every type
├── .../exercise-config-editors.tsx  # Reading: passage images + same question
│     # controls; Translation: labelled rules + fuzzy toggle
└── lib/i18n/locales/{en,es,ru,tr,de,uk}.ts
```

## Design notes

- **Payload compat**: multi questions accept `selected_options` (list);
  a legacy `selected_option` against a multi question grades wrong, never
  500s. Single questions ignore `selected_options`.
- **Normalizer**: `normalize_text(value, rules)` in grading.py; text rules
  read via `question.options` when `question_type == text_answer` (that
  field is unused for text questions today — free storage). Reading's
  question dicts carry the same keys.
- **`multi` flag**: set in `_strip_answers` for quiz questions
  (`sum(opt.is_correct) > 1` computed before popping) and in the reading
  strip branch; staff responses may carry it too (harmless, derived).
- **Editors**: quiz question editor gets a "Checking rules" block for text
  questions (toggles + variants list) and an inline hint on choice
  questions («несколько правильных — у ученика будут чекбоксы»);
  translation editor relabels its fields and adds the fuzzy toggle with a
  sentence explaining the tolerance; reading editor reuses the same
  controls per question and gains an image-insert button for the passage.
- **Instructions note**: one optional textarea in the exercise editor's
  General Settings card writing `config.instructions`; rendered by both
  shared renderers when non-empty. Off (empty) by default per the owner.

## Verification

- pytest: new matrix file + full suite (real PostgreSQL).
- Vitest + tsc + build + locale parity.
- Browser: author multi question → checkboxes → exact-set grading via test
  mode; text variants; translation fuzzy off; reading image; instructions
  note visible only when set.

# Tasks: Unified Answer System

**Input**: Design documents from `specs/019-answer-system/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md

**Tests**: included; multi-grading and text-rule tests must be demonstrated
red first (constitution II), grandfather tests pin FR-005.

## Phase 1: Setup / Phase 2: Foundational

None.

---

## Phase 3: User Story 1 - Adaptive choice (Priority: P1) 🎯 MVP

- [ ] T001 [US1] pytest backend/tests/test_answer_system.py (multi part):
      set equality (exact/subset/superset/other), single unchanged, legacy
      payload vs multi question grades wrong — RED against today's grader;
      record in PR.
- [ ] T002 [US1] Multi branch in `is_answer_correct`
      (backend/app/assessments/grading.py) + display helpers handle lists
      (depends on T001 red).
- [ ] T003 [US1] `multi` flag in `_strip_answers`
      (backend/app/exercises/router.py) for quiz questions; pytest asserts
      flag present and options keyless.
- [ ] T004 [US1] Student quiz components render checkboxes when `multi` and
      submit `selected_options`: V2 quiz component
      (frontend/src/components/exercises/v2/*quiz*.tsx), `QuizExercise` in
      exercise-renderer.tsx, and quiz-taker.tsx (legacy quiz lessons).
- [ ] T005 [US1] Quiz question editor hint: marking 2+ correct shows «у
      ученика будут чекбоксы» (content-library/[exerciseId]/page.tsx).

---

## Phase 4: User Story 2 - Text rules (Priority: P1)

- [ ] T006 [US2] pytest (text part): variants, case toggle, punctuation
      toggle, defaults == today — variants/case RED first.
- [ ] T007 [US2] `normalize_text` + rules-aware text branch in grading.py;
      rules read from Question.options for text_answer (depends on T006).
- [ ] T008 [US2] Text-question editor: "Checking rules" block (case, trim,
      punctuation toggles + accepted-variants list) in the quiz questions
      editor.

---

## Phase 5: User Story 3 - Reading (Priority: P2)

- [ ] T009 [US3] Reading grader delegates to the shared helpers (multi sets
      + text rules) in backend/app/submissions/service.py; pytest covers
      both via reading fixtures + grandfathering.
- [ ] T010 [US3] `multi` in the stripped reading config (exercises/router.py).
- [ ] T011 [US3] Reading student component: checkboxes on multi.
- [ ] T012 [US3] Reading editor: image-insert button on the passage
      (existing /courses/upload-image), same per-question rule controls
      (exercise-config-editors.tsx); student passage renders HTML images.

---

## Phase 6: User Story 4 - Translation rules visible (Priority: P2)

- [ ] T013 [US4] `fuzzy_match` toggle in `_grade_translation` (default true)
      + pytest: off ⇒ near-miss fails; defaults unchanged.
- [ ] T014 [US4] Translation editor: labelled rules + fuzzy toggle with
      plain-language explanation (exercise-config-editors.tsx).

---

## Phase 7: User Story 5 - Instructions note (Priority: P3)

- [ ] T015 [US5] Optional instructions textarea in the exercise editor's
      General Settings (writes config.instructions, default "");
      ExerciseRenderer + V2ExerciseLive render it above the task when
      non-empty.

---

## Phase 8: Polish & Verification

- [ ] T016 i18n ×6 for every new string (rules labels, hints, fuzzy
      explanation, instructions label).
- [ ] T017 Gates: pytest new file + full suite; tsc, Vitest, build.
- [ ] T018 Browser pass per quickstart (uses the 018 test-mode panel);
      screenshots for the PR.
- [ ] T019 After merge + prod verify: mark этап 4 in
      tasks/feedback-2026-08-19-authoring.md.

## Dependencies

T001→T002→T003→T004/T005; T006→T007→T008; US3 after US1+US2 helpers; T013
independent; T015 independent; polish last.

## Implementation Strategy

Single PR, commits per story. MVP cut US1+US2 (the unified rules); reading/
translation/instructions ride along because they reuse the same helpers.

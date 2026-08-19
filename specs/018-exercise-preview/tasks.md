# Tasks: Live Exercise Preview & Anonymous Test Mode

**Input**: Design documents from `specs/018-exercise-preview/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md

**Tests**: included (constitution II). The no-persistence pytest is the
must-have red-capable test.

**Organization**: three user stories; no setup/foundational phases.

## Phase 1: Setup / Phase 2: Foundational

None — components and endpoints exist.

---

## Phase 3: User Story 1 - Live preview for every type (Priority: P1) 🎯 MVP

**Goal**: student-view preview in the exercise editor, rendering live local
state; math previews stop being stale.

**Independent Test**: quickstart §By hand 1–2.

- [x] T001 [P] [US1] ~~Pure helper `buildPreviewExercise`~~ — dropped at
      implementation: the assembly is a one-line object spread inside the
      panel; a helper and test for a spread would be ceremony (YAGNI). The
      no-persistence behaviour is covered by T006 instead.
- [ ] T002 [US1] Preview panel in
      frontend/src/app/(admin)/admin/content-library/[exerciseId]/page.tsx:
      collapsible section under the form, "nothing is saved / verdicts
      follow last save" banner, renders V2ExerciseLive or ExerciseRenderer
      by isV2LiveType with remount key on serialized config (depends on
      T001, T004, T005).
- [ ] T003 [P] [US1] Math staleness fix: remount key on the template
      component in TemplatePreview,
      frontend/src/components/game/math/math-editor.tsx.

---

## Phase 4: User Story 2 - Anonymous test mode (Priority: P1)

**Goal**: interactions grade via non-persisting paths; nothing recorded.

**Independent Test**: quickstart §By hand 3 + pytest.

- [ ] T004 [P] [US2] `previewMode` prop in
      frontend/src/components/exercises/v2-exercise-live.tsx: grade via
      /check only, never /submit.
- [ ] T005 [US2] `previewMode` prop in
      frontend/src/components/exercises/exercise-renderer.tsx: skip
      attempt-state fetch; route interactive/quiz submits to /check and map
      to the result UI; code challenge keeps Run, disables Submit with the
      test-mode note; file upload/whiteboard/scorm disable persisting
      actions with the note.
- [ ] T006 [P] [US2] pytest backend/tests/test_exercise_check_no_persist.py:
      submissions count unchanged after /check; positive control — /submit
      raises it. Real PostgreSQL.
- [ ] T007 [P] [US2] i18n keys ×6 (panel title, banner, verdicts-follow-save
      note, verdict-unavailable note) in
      frontend/src/lib/i18n/locales/{en,es,ru,tr,de,uk}.ts.

---

## Phase 5: User Story 3 - Bubble Sheet explained (Priority: P2)

- [ ] T008 [US3] Purpose description in `BubbleSheetConfigEditor`
      (frontend/src/app/(admin)/admin/content-library/[exerciseId]/exercise-config-editors.tsx)
      via i18n keys ×6.

---

## Phase 6: Polish & Verification

- [ ] T009 Gates: tsc, npm test, build; pytest new file + full backend
      suite.
- [ ] T010 Browser pass per quickstart across the representative types;
      verify submissions count untouched; screenshots for the PR.
- [ ] T011 After merge + prod verify: mark этап 3 in
      tasks/feedback-2026-08-19-authoring.md.

---

## Dependencies & Execution Order

- T001/T003/T004/T006/T007 parallel; T005 after T004 (same result-mapping
  shape); T002 last of the code tasks (integrates all).

## Implementation Strategy

Single PR, commits per story. MVP cut is US1 (render-only preview) but US2
ships in the same PR — the panel without test mode answers half the owner's
ask.

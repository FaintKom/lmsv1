# Implementation Plan: Live Exercise Preview & Anonymous Test Mode

**Branch**: `feat/exercise-preview` | **Date**: 2026-08-19 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/018-exercise-preview/spec.md`

## Summary

Everything needed already exists in halves: the student components render any
exercise, and non-persisting verdict paths exist (`POST
/exercises/{id}/check` for quiz + interactive types, `/math-validation/*`,
`/sandbox/execute` for running code). What's missing is (a) one preview
panel in the exercise editor that renders the student view from the
editor's **live local state**, and (b) a `previewMode` flag that reroutes
every verdict to a non-persisting path and forbids `/submit`. The math
templates' staleness is a mounting bug: they copy config into `useState`
once; a remount key on the config fixes all sixteen at once.

No new endpoints, no migrations, no new dependencies.

## Technical Context

**Language/Version**: TypeScript 5 / React 19 / Next.js 16; Python 3.12
(tests only)

**Primary Dependencies**: existing components — `ExerciseRenderer`,
`V2ExerciseLive`, math `TemplatePreview`.

**Storage**: none. The preview never persists anything — that is the
feature.

**Testing**: Vitest where logic is pure; pytest pinning FR-005 (a `/check`
call creates no submission — submissions count unchanged); browser pass
across representative types.

**Target Platform**: web, staff-only exercise editor page.

**Project Type**: web application.

**Performance Goals**: preview reflects edits <1s (SC-002) — remount on
config change is cheap at editor scale.

**Constraints**: six-locale i18n; never fall back to `/submit` in preview
(FR-006); student view must not reveal keys beyond what it already does.

**Scale/Scope**: ~4 frontend files + 6 locales + 1 backend test file.

## Constitution Check

- **I. Tenant isolation** — PASS. No new ids cross boundaries; `/check`
  already routes through `get_exercise(user)`.
- **II. Tests that can fail** — PASS. The no-persistence pytest counts
  submissions before/after `/check` (would fail if check ever persisted);
  a Vitest for the preview-exercise assembly helper.
- **III. Server is the only judge** — PASS, and strengthened: test-mode
  verdicts come from the same server paths; nothing is graded client-side
  that wasn't already (teacher-preview local grading is pre-existing and
  staff-only).
- **IV. Docs** — PASS, no claims change.
- **V. Smallest change** — PASS: one panel + one prop + one remount key,
  reusing every existing renderer and verdict path.

No violations.

## Project Structure

```text
frontend/src/
├── app/(admin)/admin/content-library/[exerciseId]/page.tsx
│     # Preview/Test-mode panel fed by live {title, config} state
├── app/(admin)/admin/content-library/[exerciseId]/preview-exercise.ts
│     # pure helper: assemble the preview exercise object from editor state (+ test)
├── components/exercises/exercise-renderer.tsx   # previewMode prop
├── components/exercises/v2-exercise-live.tsx    # previewMode prop → /check only
├── components/game/math/math-editor.tsx         # remount key on TemplatePreview
├── app/(admin)/admin/content-library/[exerciseId]/exercise-config-editors.tsx
│     # BubbleSheet editor: purpose description
└── lib/i18n/locales/{en,es,ru,tr,de,uk}.ts

backend/tests/test_exercise_check_no_persist.py  # FR-005 pin
```

## Design notes

### Preview panel (US1)

- Section on the exercise editor page under the config form: header +
  always-visible "test run — nothing is saved" banner (FR-007), collapsible.
- Renders `isV2LiveType(type) ? <V2ExerciseLive previewMode/> :
  <ExerciseRenderer previewMode/>` from a preview-exercise object assembled
  by a pure helper from current `{exercise, title, config}` state.
- `key={stableHash(config)}` remounts the student component on every config
  edit — the same trick fixes math staleness — with a small debounce via
  useMemo on the serialized config so typing doesn't thrash.

### previewMode (US2)

- `ExerciseRenderer`: skip the attempt-state fetch; `handleSubmit` routes
  interactive/quiz bodies to `POST /exercises/{id}/check` and maps booleans
  to the result UI; code challenge keeps Run (`/sandbox/execute`) and
  disables Submit with the "no verdicts in test mode" note; file upload,
  whiteboard, scorm: interaction visible, persist actions disabled with the
  same note.
- `V2ExerciseLive`: `previewMode` forces the `/check` path and never calls
  `/submit`.
- Types created moments ago exist server-side (editor edits an existing
  row), so `/check` works against the SAVED config; the panel notes that
  server verdicts follow the last save (the preview *rendering* is live;
  verdicts are as-saved — stated in the panel, honest and cheap).

### Math staleness (US1/FR-003)

- `TemplatePreview` in math-editor gets `key={JSON.stringify(config)}` on
  the template component. Sixteen templates fixed in one line; Equation
  Balance's "settings do nothing" preview symptom dies with it (its config
  completeness is этап 5).

### Bubble Sheet (US3)

- `BubbleSheetConfigEditor` gains a one-paragraph purpose description (an
  OMR/scantron-style answer sheet: numbered questions, A–D bubbles, graded
  against the key) via i18n keys ×6. Preview comes from the shared panel
  (bubble-sheet has a V2 live component).

## Verification

- pytest: `/check` leaves `exercise_submissions` count unchanged (with a
  positive control that `/submit` does change it).
- Vitest: preview-exercise assembly helper.
- Browser pass: word_search, code_challenge (Run), quiz (verdict via
  check), math number_line (edit targets → preview follows), bubble_sheet;
  confirm zero new submissions after the session.
- Gates: tsc, Vitest, build, backend suite, six-locale parity.

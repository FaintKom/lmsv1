# Feature Specification: Live Exercise Preview & Anonymous Test Mode

**Feature Branch**: `feat/exercise-preview`

**Created**: 2026-08-19

**Status**: Draft

**Input**: User description: "Этап 3 плана tasks/feedback-2026-08-19-authoring.md — превью и анонимный тест-режим (замечания 31, 16, части 6, 14, 22, 23, 28, 30, 32). Владелец: тест-режим не сохраняет решения; Bubble Sheet — разобраться, что это, превью обязательно."

Half the exercise editors ship without any preview (code challenge, web
editor, flashcards, word search, bubble sheet, step-by-step math, system of
equations, solids), and the math-interactive previews that do exist show
stale state — they read the config once and ignore every later edit. On top
of that there is no way for an author to *solve* their own exercise without
polluting real submissions. One cross-cutting preview panel with a
try-it-yourself mode closes all of it.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Every exercise type has a live preview (Priority: P1)

A teacher editing any exercise sees, on the same page, what the student will
see — rendered from the settings as they are right now in the form, unsaved
edits included. Change a field, the preview reflects it.

**Why this priority**: eight types have no preview at all and the math ones
lie (show pre-edit state); authors publish blind. This is the owner's most
repeated complaint (six list items).

**Independent Test**: open any exercise type in the editor, change a config
field, and watch the preview change without saving or reloading.

**Acceptance Scenarios**:

1. **Given** an exercise of any registered type open in the editor, **When**
   the teacher looks at the page, **Then** a student-view preview of it is
   available.
2. **Given** the preview is visible, **When** the teacher edits a setting
   (e.g. the word list, the equation, the starter code), **Then** the
   preview reflects the edit without a save or reload.
3. **Given** a math-interactive exercise, **When** the teacher changes the
   template settings (targets, range, equation), **Then** the template
   preview shows the new settings — not the state it mounted with.

---

### User Story 2 - Anonymous test mode (Priority: P1)

The preview is playable: the teacher can actually solve the exercise —
answer the quiz, drag the markers, run the code — and see the same verdicts
a student would get. Nothing is recorded: no submission, no attempt spent,
no XP, no gradebook trace.

**Why this priority**: owner's #31 — "для ВСЕХ заданий нужен анонимный
тестовый режим, который не сохраняет решения, чтобы проверить вообще
задание работает или нет".

**Independent Test**: solve an exercise in test mode, get a verdict, then
confirm no submission exists for it and the student-side attempt counter is
untouched.

**Acceptance Scenarios**:

1. **Given** the preview panel, **When** the teacher interacts and submits
   an answer, **Then** they see correct/incorrect feedback equivalent to the
   student experience.
2. **Given** a test-mode interaction happened, **When** anyone lists the
   exercise's submissions, **Then** nothing from the test run is there.
3. **Given** test mode, **When** the teacher looks at the panel, **Then**
   it plainly says this is a test run and nothing is saved.
4. **Given** an exercise with limited attempts, **When** the teacher tests
   it repeatedly, **Then** no attempts are consumed for anyone.

---

### User Story 3 - Bubble Sheet explained and previewable (Priority: P2)

Bubble Sheet gets the same live preview, and its editor explains what the
type is for, so a teacher who opens it understands what they are building
(owner: "не понимаю, как его задавать и создавать и в чем смысл").

**Independent Test**: open a bubble-sheet exercise; the editor states what
the type does; the preview shows the student-facing sheet reacting to config
changes.

**Acceptance Scenarios**:

1. **Given** the bubble-sheet editor, **When** the teacher opens it,
   **Then** a short description explains the type's purpose and how answers
   are marked.
2. **Given** the config (questions, options per question), **When** it
   changes, **Then** the preview updates like every other type.

---

### Edge Cases

- Types whose student view needs a server round-trip (code challenge run,
  server-graded checks): test mode uses the existing non-persisting paths;
  if a type has no non-persisting grade path, the preview still renders and
  interacts, and the panel says verdicts are unavailable in test mode for
  this type — it must never fall back to a real submission.
- A half-filled config (author mid-edit) must not crash the preview; it
  renders with whatever is valid and recovers as the config completes.
- SCORM packages host third-party content — preview stays the existing
  package player; test mode guarantees only that no attempt is recorded.
- The preview must not leak answer keys anywhere the student view would not:
  it is the teacher's own exercise (staff-only page), but the rendered
  student view must be the student view, not a solution reveal.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The exercise editor MUST offer a student-view preview for
  every registered exercise type.
- **FR-002**: The preview MUST render from the editor's current state,
  including unsaved edits, and update when that state changes.
- **FR-003**: Math-interactive template previews MUST reflect the current
  template settings at all times (no stale mounted state) — including
  Equation Balance, whose settings today have no visible effect.
- **FR-004**: The preview MUST be interactive (test mode): the teacher can
  perform the same actions a student can.
- **FR-005**: Test-mode interactions MUST NOT create submissions, consume
  attempts, award XP, or appear in any student-facing or gradebook data.
- **FR-006**: Where a non-persisting grading path exists, test mode MUST
  show real verdicts through it; where none exists, the panel MUST say
  verdicts are unavailable rather than silently recording a submission.
- **FR-007**: The test-mode panel MUST state visibly that nothing is saved.
- **FR-008**: The bubble-sheet editor MUST describe what the type is for.
- **FR-009**: New user-facing text MUST exist in all six locales.

### Key Entities

- **Preview state**: the editor's in-memory exercise (title, config,
  questions, test cases) — never persisted by the preview itself.
- **Non-persisting grade paths**: the existing check/validation endpoints
  that return verdicts without writing submissions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 26 of 26 exercise types show a preview in the editor (today:
  8 have none).
- **SC-002**: An edit to any config field is visible in the preview within a
  second, without saving.
- **SC-003**: After a full test-mode session on an exercise, its submission
  count is unchanged (verified by test).
- **SC-004**: A teacher can author and verify a working exercise end-to-end
  without ever leaving the editor or touching a student account.

## Assumptions

- The panel lives in the existing exercise editor page (single authoring
  surface from specs/017 routes there); the math editor's own preview stays
  and is fixed rather than replaced.
- "Anonymous" means not-recorded, not a separate anonymous account: the
  teacher stays logged in; anonymity is about the absence of any persisted
  trace.
- Verdicts in test mode come from the existing non-persisting endpoints
  (exercise check, math validation, sandbox execution); no new grading
  engines are introduced. Types without such a path (e.g. file upload's
  human grading) show the interaction without a verdict.
- Deep per-type config completeness (e.g. Equation Balance's missing
  actions) is этап 5; this stage makes previews truthful, not configs
  richer.

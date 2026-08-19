# Feature Specification: Authoring Quick Fixes

**Feature Branch**: `fix/authoring-quick-fixes`

**Created**: 2026-08-19

**Status**: Draft

**Input**: User description: "Этап 1 плана tasks/feedback-2026-08-19-authoring.md — четыре быстрых бага конструктора курсов: (1) у курса нельзя поменять картинку в редакторе курса; (2) кнопка «Назад» при создании квиза изнутри курса уводит в Content Library вместо возврата в курс; (3) в задании «числовая прямая» буквы в треугольниках-метках плохо читаются; (4) Graph Transformations, Inequality Graph и карточная сортировка встречаются в списке типов заданий дважды — дубли убрать."

Four independent authoring bugs reported by the owner on a walkthrough of the
course builder (2026-08-19). Each is small, none depends on another, together
they remove daily friction for teachers building courses.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Change a course's picture (Priority: P1)

A teacher editing a course wants to set or replace the course picture — the
image students see on the course card. Today the course model stores a picture,
the card displays it, but the course editor offers no way to set or change it.

**Why this priority**: The picture is the face of the course in the catalogue;
a teacher who cannot change it is stuck with either a blank card or whatever
was seeded. It is also the first item on the owner's list.

**Independent Test**: Open any course in the editor, set a picture, save,
and see it on the course card; change it again and see the replacement.

**Acceptance Scenarios**:

1. **Given** a course without a picture, **When** the teacher sets one in the
   course editor and saves, **Then** the course card shows that picture.
2. **Given** a course with a picture, **When** the teacher replaces it and
   saves, **Then** the card shows the new picture, not the old one.
3. **Given** a course with a picture, **When** the teacher removes it and
   saves, **Then** the card falls back to its default look without an error.
4. **Given** a teacher from another school, **When** they attempt to change
   this course's picture, **Then** the platform refuses as it does for any
   other cross-school edit.

---

### User Story 2 - Return to the course after editing an exercise (Priority: P1)

A teacher building a lesson inside a course opens an exercise (for example a
quiz) to create or edit it. When they are done — or press "back" — they expect
to land back in the course they came from. Today the exercise editor always
sends them to the Content Library, losing their place in the course.

**Why this priority**: This breaks the core authoring loop — every exercise
edited from a course costs the teacher a manual navigation back and scrolling
to find their lesson again.

**Independent Test**: From a course's lesson, open an exercise for editing,
press the editor's back control, and land back in that course's editor.

**Acceptance Scenarios**:

1. **Given** a teacher opened an exercise editor from within a course,
   **When** they use the back control, **Then** they return to that course's
   editor, not the Content Library.
2. **Given** a teacher opened the same exercise editor directly from the
   Content Library, **When** they use the back control, **Then** they return
   to the Content Library as before.
3. **Given** a teacher opened an exercise from a course and saved their
   changes, **When** they return to the course, **Then** the course editor
   reflects the saved exercise (no stale copy).

---

### User Story 3 - Legible marker letters on the number line (Priority: P2)

A student solving a number-line exercise drags lettered triangle markers onto
positions. The letters inside the triangles are too small and low-contrast to
read comfortably.

**Why this priority**: Purely visual, but it affects students (not just
authors) and makes an otherwise working exercise frustrating.

**Independent Test**: Open a number-line exercise with several markers and
confirm each marker's letter is comfortably readable at normal zoom, both
before and after checking answers.

**Acceptance Scenarios**:

1. **Given** a number-line exercise with multiple markers, **When** a student
   views it at 100% zoom, **Then** each marker's letter is legible without
   squinting or zooming.
2. **Given** the student has checked answers, **When** markers turn to their
   correct/incorrect colours, **Then** the letters remain legible on those
   colours too.

---

### User Story 4 - Each exercise template listed once (Priority: P2)

A teacher picking a math-interactive template sees Graph Transformations,
Inequality Graph, Function Graph and Card Sort each listed twice, with
identical descriptions. There is no way to tell the copies apart, and picking
"the wrong one" is indistinguishable from picking the right one.

**Why this priority**: Confusing but not blocking — both copies work. Still a
daily irritation and makes the catalogue look broken.

**Independent Test**: Open the math-interactive template picker and confirm
every template appears exactly once; open an old exercise saved under a
duplicate entry and confirm it still renders.

**Acceptance Scenarios**:

1. **Given** the math-interactive template picker, **When** a teacher scrolls
   the list, **Then** no template name appears more than once.
2. **Given** an existing exercise that was saved under one of the duplicate
   entries, **When** a student opens it, **Then** it renders and grades
   exactly as before.

---

### Edge Cases

- Course picture: a picture reference that no longer resolves (broken link)
  must degrade to the default card look, not a broken-image icon.
- Back navigation: a teacher opens an exercise from a course in a new tab —
  the back control in that tab must still know where "back" is.
- Back navigation: the course the teacher came from was deleted meanwhile —
  back falls back to the Content Library rather than a dead page.
- Duplicate templates: seed data and existing exercises reference the
  duplicate entries by their internal names; hiding duplicates from the picker
  must not break rendering or grading of that content.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The course editor MUST let a teacher set, replace and remove the
  course picture, and the result MUST be visible on the course card after
  saving.
- **FR-002**: Changing a course picture MUST respect the same school-isolation
  rules as every other course edit (another school's course reads as not
  found).
- **FR-003**: The exercise editor MUST return the teacher to wherever they
  came from: the course editor when opened from a course, the Content Library
  when opened from the library.
- **FR-004**: When the return target no longer exists, the exercise editor
  MUST fall back to the Content Library.
- **FR-005**: Marker letters on the number line MUST be legible at normal
  zoom in every marker state (unchecked, correct, incorrect).
- **FR-006**: The math-interactive template picker MUST list each template
  exactly once.
- **FR-007**: Exercises previously saved under a duplicate template entry
  MUST continue to render and grade unchanged.

### Key Entities

- **Course picture**: an image reference stored on the course; displayed on
  the course card; already exists in the data model, currently not editable
  from the UI.
- **Return context**: where the teacher opened the exercise editor from; determines
  the destination of the editor's back control.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A teacher can set or change a course picture in under a minute
  without leaving the course editor.
- **SC-002**: 100% of "back" presses from an exercise editor opened out of a
  course land in that course's editor.
- **SC-003**: The math-interactive picker contains zero duplicate names
  (today: four names listed twice).
- **SC-004**: No existing exercise changes behaviour: rendering and grading
  of content saved before this fix is byte-for-byte unaffected.

## Assumptions

- The course picture is set by URL or by picking an uploaded image — whichever
  the platform already supports for images elsewhere; no new storage mechanism
  is introduced for this fix.
- The duplicate picker entries exist to keep old seed-data names working;
  the fix hides them from the picker rather than deleting the names, so old
  content keeps rendering (FR-007).
- Number-line legibility is judged by eye against the acceptance scenario —
  no formal contrast measurement is required for this fix.
- "Back" covers the editor's own back controls; the browser's back button
  keeps its native history behaviour.

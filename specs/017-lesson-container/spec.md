# Feature Specification: Lesson Container & Exercise Catalogue

**Feature Branch**: `feat/lesson-container`

**Created**: 2026-08-19

**Status**: Draft

**Input**: User description: "Этап 2 плана tasks/feedback-2026-08-19-authoring.md — архитектура урока и каталога заданий (замечания владельца 2, 8, 11, 33, 34 и часть 22). Решение владельца: «урок должен быть уроком без типа, а внутри блоки с типами»."

The course builder currently forces a teacher to pick a lesson *type* before
the lesson exists, then offers three competing ways to put material inside it
(inline blocks on the course page, a separate full-page lesson editor, and a
detached "lesson exercises" list). Students already see one merged flow;
authors see three. This feature makes the lesson a typeless container of
typed blocks, gives authoring exactly one entry point, brings assignments
into the same block flow, and organises the 26-type exercise catalogue into
subject groups.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create a lesson without choosing a type (Priority: P1)

A teacher adds a lesson to a module by giving it nothing but a title. The
lesson is born as an empty container and opens ready to receive blocks —
text, video, HTML, exercises. No type decision is demanded up front, because
the type lives on each block, not on the lesson.

**Why this priority**: This is the owner's core architectural decision («урок
должен быть уроком без типа, а внутри блоки с типами») and every other story
builds on the container model.

**Independent Test**: Add a lesson with only a title; it opens as an empty
container; add a text block and an exercise block; a student sees both in
order.

**Acceptance Scenarios**:

1. **Given** a module, **When** the teacher adds a lesson, **Then** the only
   required input is a title — no type selector appears anywhere in the flow.
2. **Given** a freshly created lesson, **When** the teacher opens it,
   **Then** it is an empty container inviting them to add blocks.
3. **Given** lessons created before this change with a legacy type (quiz,
   code challenge, file upload, interactive, theory), **When** a student
   opens them, **Then** they render exactly as before.

---

### User Story 2 - One way to author a lesson (Priority: P1)

A teacher editing a lesson always lands in the same editor — the block-based
lesson editor. Exercises are attached to a lesson only as blocks; the
separate "lesson exercises" list disappears as an authoring surface. Material
that today lives outside blocks (exercises attached to the lesson but not
embedded in any block) is shown to the author inside the same single flow, so
nothing becomes unreachable.

**Why this priority**: Owner's complaint #8 — «я сейчас создал и не понимаю,
что к чему относится». Two parallel attachment mechanisms make authored
content unpredictable.

**Independent Test**: From the course page, every path into lesson content
leads to the one lesson editor; an exercise previously attached outside
blocks is visible and editable there; students see the same order the editor
shows.

**Acceptance Scenarios**:

1. **Given** the course editor, **When** the teacher goes to edit any
   lesson's content, **Then** there is exactly one editing surface they can
   land on.
2. **Given** a legacy lesson with exercises attached outside blocks,
   **When** the teacher opens the lesson editor, **Then** those exercises
   appear in the flow as blocks (adopted at the end, preserving today's
   student-visible order) and can be reordered or removed like any block.
3. **Given** a lesson authored in the single editor, **When** a student
   opens it, **Then** the student sees the blocks in the exact order the
   editor showed.

---

### User Story 3 - Assignment as a block in the course (Priority: P2)

A teacher building a lesson adds an *assignment* block right in the flow:
title, instructions, due date, max score, late policy — defined where the
students will meet it. The assignment still behaves as assignments do
(submissions, grading, gradebook, deadlines); the block is where it lives in
the course narrative.

**Why this priority**: Owner's #33 — assignments defined in a separate
section "теряется смысл": they are homework for specific material, so they
belong next to that material.

**Independent Test**: Create an assignment block inside a lesson; the
student sees it in the lesson and can submit; the teacher grades it through
the existing grading flow; it appears in the gradebook.

**Acceptance Scenarios**:

1. **Given** the lesson editor, **When** the teacher adds an assignment
   block and fills title and due date, **Then** an assignment exists in the
   course with those attributes, visible in the lesson at that position.
2. **Given** an assignment block, **When** a student opens the lesson,
   **Then** they can open the assignment and submit work from the lesson
   flow.
3. **Given** an assignment created as a block, **When** the teacher opens
   the existing assignments overview or gradebook, **Then** it is listed
   there like any other assignment.
4. **Given** an assignment block the teacher removes, **When** they confirm
   the removal warning, **Then** the assignment and its submissions are
   removed; declining keeps both.
5. **Given** assignments created before this change, **When** the teacher
   views the course, **Then** they remain reachable and gradable as today.

---

### User Story 4 - Exercise catalogue in subject groups (Priority: P2)

A teacher picking an exercise type sees a grouped catalogue instead of a
flat list of 26: **Basic** (quiz, matching, ordering, fill blanks,
true/false, categorize, file upload, map pin drop, bubble sheet),
**Mathematics** (math interactive with its subtypes, step-by-step, system of
equations, solids), **Languages**, **Programming**, and **SCORM / xAPI**
apart.

**Why this priority**: Owner's #34 and #22 — a maths teacher should not scan
crosswords and code challenges to find equation tools.

**Independent Test**: Open the exercise-type picker; every one of the 26
types appears in exactly one group; the groups match the owner's list.

**Acceptance Scenarios**:

1. **Given** the exercise-type picker, **When** the teacher opens it,
   **Then** types are presented under the five groups and each type appears
   exactly once.
2. **Given** the grouped picker, **When** the teacher picks any type,
   **Then** creation behaves exactly as before — grouping changes discovery,
   not behaviour.
3. **Given** the content library's type filter, **When** the teacher browses
   it, **Then** it reflects the same grouping.

---

### User Story 5 - Math Interactive shows what is inside (Priority: P3)

Math Interactive is not one exercise — it is a family of sixteen templates.
The picker communicates that: the entry names or lists its subtypes so a
teacher looking for "Number Line" or "Venn Diagram" finds it from the
catalogue, not by accident after creating a generic exercise.

**Why this priority**: Owner's #11; discovery problem, not a data problem.

**Independent Test**: In the picker, the Math Interactive entry reveals its
subtypes; choosing a subtype creates a math-interactive exercise with that
template preselected.

**Acceptance Scenarios**:

1. **Given** the grouped picker, **When** the teacher looks at Math
   Interactive, **Then** its subtypes are visible (expandable or listed)
   without creating anything first.
2. **Given** a subtype chosen from the picker, **When** the exercise opens
   in its editor, **Then** that template is already selected.

---

### Edge Cases

- Legacy lesson types (quiz, code challenge, file upload, interactive,
  theory as *lesson-level* types): still render for students and remain
  editable; no forced migration.
- A lesson whose only content is exercises attached outside blocks: the
  editor adopts them as blocks; the student-visible order does not change.
- Assignment block with existing submissions: removal warns that submissions
  are deleted too (same stakes as deleting an assignment today).
- An assignment whose lesson is deleted: the assignment must not become
  unreachable — course-level overview still lists it.
- Group membership: all 26 types must land in exactly one group — a type
  forgotten in the mapping must be impossible to lose silently (a test
  enumerates the full registry against the groups).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Creating a lesson MUST require only a title; no type choice is
  presented at creation anywhere in the product.
- **FR-002**: A new lesson MUST open as an empty block container; all
  material — text, video, HTML, exercises, assignments — is added as blocks.
- **FR-003**: Lessons created before this change MUST keep rendering and
  stay editable without migration.
- **FR-004**: There MUST be exactly one authoring surface for lesson
  content; every editing path from the course page leads there.
- **FR-005**: Exercises attached to a lesson outside blocks MUST be adopted
  into the block flow, preserving the order students saw before.
- **FR-006**: The student-facing lesson MUST render blocks in the exact
  order authored.
- **FR-007**: The lesson editor MUST offer an assignment block: creating one
  creates a real assignment (title, instructions, due date, max score, late
  policy) placed at that position in the lesson.
- **FR-008**: Assignments created as blocks MUST participate in the existing
  assignment lifecycle unchanged: student submission, teacher grading,
  gradebook, deadline behaviour.
- **FR-009**: Removing an assignment block MUST warn about deleting the
  assignment and its submissions, and proceed only on confirmation.
- **FR-010**: Assignments existing before this change MUST remain reachable
  and gradable.
- **FR-011**: The exercise-type picker and the content-library filter MUST
  present types in the owner's five groups — Basic, Mathematics, Languages,
  Programming, SCORM/xAPI — with every registered type in exactly one group.
- **FR-012**: A test MUST fail if any registered exercise type is missing
  from the grouping or listed twice.
- **FR-013**: The Math Interactive picker entry MUST expose its template
  subtypes before creation, and choosing a subtype MUST preselect that
  template in the created exercise.
- **FR-014**: All new user-facing text MUST exist in all six locales.

### Key Entities

- **Lesson**: a titled, ordered container of blocks inside a module; no
  longer carries a meaningful type for new content (legacy types tolerated
  for old lessons).
- **Block**: one unit of lesson material with a type — text, HTML, video,
  exercise, assignment — and a position.
- **Assignment block**: a block referencing a real assignment; the
  assignment keeps its own lifecycle (deadline, submissions, grading).
- **Exercise catalogue group**: a named subject group (Basic, Mathematics,
  Languages, Programming, SCORM/xAPI); every exercise type belongs to
  exactly one.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A teacher creates a lesson and places the first block in under
  a minute, with zero type decisions before the container exists.
- **SC-002**: The number of distinct lesson-content authoring surfaces
  reachable from the course page drops from three to one.
- **SC-003**: 100% of exercises previously attached outside blocks remain
  visible to students after the change, in the same order.
- **SC-004**: A teacher can author an assignment without leaving the lesson
  editor, and it appears in the gradebook like any other.
- **SC-005**: All 26 exercise types are findable under exactly one of five
  groups; a maths teacher reaches any math template from the picker without
  scrolling through unrelated subjects.
- **SC-006**: No existing lesson, exercise or assignment changes behaviour
  for students except the intended unified ordering.

## Assumptions

- Group composition beyond the owner's explicit list: **Languages** =
  translation, sentence builder, dialogue, conjugation, reading, crossword,
  word search, flashcards; **Programming** = code challenge, web editor, 2D
  robot, 3D world. The owner named Basic, Mathematics and SCORM explicitly;
  these two follow the subjects the platform sells (programming, maths,
  languages).
- Legacy lesson-level types are kept rendering rather than migrated; the
  type selector disappears from creation, not from the data model.
- Adoption of outside-block exercises happens in the editor (visible,
  reversible) rather than as a silent data migration.
- Removing an assignment block deletes the assignment (with an explicit
  warning naming submissions), matching today's assignment-delete
  semantics; there is no "detach" state that would leave orphan blocks.
- The inline lesson editing on the course page is removed in favour of the
  one editor; the course page keeps a compact read-only summary per lesson
  (title, duration, block count) with a single edit entry point.

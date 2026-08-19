# Tasks: Lesson Container & Exercise Catalogue

**Input**: Design documents from `specs/017-lesson-container/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md

**Tests**: included — constitution II demands tests that can fail for every
behaviour pinned here; the group-partition and adoption tests are the two
that must be demonstrated red first.

**Organization**: five user stories. No setup/foundational phases — the
container, the assignments module and the registry all exist. US4 (grouped
registry) must land before US5 (subtypes render inside the grouped picker);
US1/US2 both edit the course page — sequence them.

## Phase 1: Setup

None. No new dependencies, no migrations, no scaffolding.

## Phase 2: Foundational

None.

---

## Phase 3: User Story 1 - Lesson without a type (Priority: P1) 🎯 MVP

**Goal**: creation asks only for a title; new lesson opens as an empty block
container in the lesson editor.

**Independent Test**: quickstart.md §By hand 1.

- [ ] T001 [P] [US1] pytest in backend/tests/test_lesson_container.py:
      POST lesson with `{title}` only → 200, content_type defaults to text;
      cross-org module id → 404 with a positive control in the same test.
- [ ] T002 [US1] In frontend/src/app/(admin)/admin/courses/[courseId]/edit/page.tsx
      strip the content-type grid from the New Lesson form (title + optional
      duration only), create with the empty v2 block container exactly as
      `buildV2Content` writes it (verify the marker in code, don't guess),
      then route to /admin/lessons/{id}/edit?courseId&moduleId.
- [ ] T003 [P] [US1] i18n for any new/changed creation-form strings in all
      six frontend/src/lib/i18n/locales/{en,es,ru,tr,de,uk}.ts.

**Checkpoint**: a new lesson is born typeless and lands in the editor.

---

## Phase 4: User Story 2 - One authoring surface (Priority: P1)

**Goal**: the full-page lesson editor is the only way to author lesson
content; detached exercises are adopted as blocks with order preserved.

**Independent Test**: quickstart.md §By hand 2.

- [ ] T004 [P] [US2] Pure helper `adoptDetachedExercises(blocks, byLesson)`
      (append exercises whose ids are absent from blocks, in by-lesson
      order) + Vitest beside it in
      frontend/src/app/(admin)/admin/lessons/[lessonId]/edit/adopt-exercises.ts
      (+ .test.ts). The test must encode the same order the student page's
      merge produces today — write it against a fixture first, red on a
      naive "blocks only" result.
- [ ] T005 [US2] Wire the helper into the lesson editor's initial load in
      frontend/src/app/(admin)/admin/lessons/[lessonId]/edit/page.tsx;
      adopted blocks are visible, reorderable, and persist on save.
- [ ] T006 [US2] In frontend/src/app/(admin)/admin/courses/[courseId]/edit/page.tsx
      remove the inline lesson block editor, `LessonExercises`,
      `ExerciseBlockCreator` and quiz-loading for lesson rows; rows become
      summary (title, legacy-type badge, duration) + drag + delete + ONE
      Edit link. First check which legacy-type editors (quiz builder etc.)
      are reachable ONLY through the deleted UI and keep those reachable for
      legacy lessons via the row's Edit path.
- [ ] T007 [US2] Confirm the student page
      (frontend/src/app/(dashboard)/courses/[courseId]/lessons/[lessonId]/page.tsx)
      keeps its merge fallback for never-resaved lessons — change nothing
      unless it double-renders adopted blocks after save (then dedupe by
      exercise id there too).

**Checkpoint**: exactly one authoring surface; nothing hidden from students.

---

## Phase 5: User Story 3 - Assignment block (Priority: P2)

**Goal**: assignments authored inside the lesson flow, living the normal
assignment lifecycle.

**Independent Test**: quickstart.md §By hand 3.

- [ ] T008 [P] [US3] Widen `LessonBlock` with `assignment_id: str | None`
      in backend/app/courses/schemas.py; pytest in
      backend/tests/test_lesson_container.py: assignment created via the
      existing API participates in the lifecycle (student submits, teacher
      grades); cross-org assignment id → 404 with positive control.
- [ ] T009 [US3] Assignment block in the lesson editor
      (frontend/src/app/(admin)/admin/lessons/[lessonId]/edit/page.tsx):
      add-block menu entry; inline form (title, instructions, due date, max
      score, allow late) → POST /assignments with the course id; edit →
      PATCH; block removal → existing confirm dialog naming submissions →
      DELETE then drop the block (depends on T004/T005 landing first in the
      same file).
- [ ] T010 [US3] Student rendering in
      frontend/src/app/(dashboard)/courses/[courseId]/lessons/[lessonId]/page.tsx:
      assignment card (title, due date, max score) linking to
      /assignments/{assignment_id}; orphaned block (assignment deleted)
      hidden for students, marked "removed" for the teacher in the editor.
- [ ] T011 [P] [US3] i18n keys for the block form and card in all six
      locale files.

**Checkpoint**: homework lives next to its material; gradebook unchanged.

---

## Phase 6: User Story 4 - Grouped catalogue (Priority: P2)

**Goal**: five subject groups partition all 26 types in every picker.

**Independent Test**: quickstart.md §By hand 4.

- [ ] T012 [P] [US4] Vitest in frontend/src/lib/api/exercises.test.ts:
      groups partition `ALL_EXERCISE_TYPES` exactly (union complete,
      pairwise disjoint) — MUST fail before T013 adds the mapping; record
      the red run in the PR body.
- [ ] T013 [US4] In frontend/src/lib/api/exercises.ts add `group` to each
      `EXERCISE_TYPES_META` entry per data-model.md and export
      `EXERCISE_GROUPS`; group label i18n keys ×6.
- [ ] T014 [US4] Render groups in the exercise pickers: lesson editor block
      picker (frontend/src/app/(admin)/admin/lessons/[lessonId]/edit/page.tsx)
      and content-library create modal + type filter
      (frontend/src/app/(admin)/admin/content-library/page.tsx).

**Checkpoint**: a maths teacher finds everything mathematical in one group.

---

## Phase 7: User Story 5 - Math Interactive subtypes (Priority: P3)

**Goal**: subtypes discoverable from the picker; selection preselects the
template.

**Independent Test**: quickstart.md §By hand 5.

- [ ] T015 [US5] In the grouped picker (lesson editor), math_interactive
      expands to `TEMPLATE_LIST` entries; choosing one creates the exercise
      with `config.template_type` preset; the math editor opens on it
      (depends on T014).

---

## Phase 8: Polish & Verification

- [ ] T016 Gates locally: `npx tsc --noEmit`, `npm test`, `npm run build`;
      `pytest tests/test_lesson_container.py -v` then the full backend suite
      against real PostgreSQL.
- [ ] T017 Browser pass per quickstart.md on the dev stack, teacher AND
      student sides, including one legacy-type lesson; screenshots for the
      PR.
- [ ] T018 After merge + prod verification: mark этап 2 done in
      tasks/feedback-2026-08-19-authoring.md.

---

## Dependencies & Execution Order

- US1 → US2 touch the same course page: do T002 before T006 (or in one
  sitting); US2's editor tasks (T004/T005) before US3's T009 (same file).
- T012 (red) → T013 → T014 → T015.
- T001, T004, T008, T012 are parallel starts (different files).
- Polish last.

## Parallel Example

T001 (pytest), T004 (adopt helper), T012 (group test) — three files, no
shared state.

## Implementation Strategy

Single PR; commits per story (5) so each lands reviewable and revertable.
MVP cut is US1+US2 (the container itself); US3–US5 ride the same PR because
they touch the same two files and splitting means three rebases over one
editor.

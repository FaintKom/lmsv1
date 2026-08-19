# Implementation Plan: Lesson Container & Exercise Catalogue

**Branch**: `feat/lesson-container` | **Date**: 2026-08-19 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/017-lesson-container/spec.md`

## Summary

The data model already is a container: `Lesson.content` is JSONB carrying v2
blocks, `LessonCreate.content_type` defaults to `"text"`, blocks are not
schema-enforced server-side, and the student page already renders blocks plus
"outside" exercises as one flow. The whole feature is therefore **frontend
surgery plus one JSONB block kind — no migration, no new tables**:

1. **Lesson without a type** — the course page's New Lesson form stops asking
   for `content_type` (backend default applies) and routes straight to the
   lesson editor with an empty block container.
2. **One authoring surface** — the course page's inline lesson block editor,
   `LessonExercises` list and `ExerciseBlockCreator` are removed; lesson rows
   become a summary with a single Edit link into
   `/admin/lessons/{id}/edit` (which already exists and already handles
   blocks). The lesson editor adopts exercises attached outside blocks as
   trailing exercise blocks, preserving the student-visible order.
3. **Assignment block** — new block kind `{type: "assignment",
   assignment_id}` in the lesson editor: creating one POSTs to the existing
   assignments API; students see a card in the lesson linking to the
   existing `/assignments/{id}` page. Blocks live in JSONB, so the backend
   change is only widening the (non-enforced) `LessonBlock` schema.
4. **Grouped catalogue** — `EXERCISE_TYPES_META` gains a `group` field
   (basic / math / languages / programming / scorm); the exercise pickers and
   the content-library filter render grouped. A test enumerates
   `ALL_EXERCISE_TYPES` against the mapping.
5. **Math Interactive subtypes** — the picker entry expands to
   `TEMPLATE_LIST`; choosing a subtype presets `template_type` in the new
   exercise's config.

## Technical Context

**Language/Version**: TypeScript 5 strict / React 19 / Next.js 16 (frontend);
Python 3.12 / FastAPI (backend — schema widening + tests only)

**Primary Dependencies**: existing only. No new packages.

**Storage**: none changed. Blocks stay in `lessons.content` JSONB; assignment
rows in the existing `assignments` table. **No migration.**

**Testing**: Vitest (group mapping exhaustiveness, adoption ordering,
subtype preset), pytest (lesson create without content_type; assignment
lifecycle from block-created assignments), Playwright journeys must stay
green, browser pass on dev stack.

**Target Platform**: web (admin authoring + student lesson page)

**Project Type**: web application

**Performance Goals**: n/a — authoring UI; course page loses ~800 lines of
inline editor code, which only helps.

**Constraints**: six-locale i18n for every new string; legacy lessons
(content_type quiz/code_challenge/file_upload/interactive/theory and v1
content) keep rendering; no data migration.

**Scale/Scope**: ~6 frontend files heavily touched (course edit page shrinks,
lesson editor grows), 1 backend schema file, 2 test files, 6 locale files.

## Constitution Check

*Evaluated against constitution v1.0.0.*

- **I. Tenant isolation** — PASS. Assignment creation from the block flow
  uses the existing assignments API and its org checks; the lesson editor
  passes the same course/lesson ids it already does. New pytest keeps a
  cross-org negative with a positive control for the block-created
  assignment path.
- **II. Tests that can fail** — PASS. Group-mapping test enumerates the full
  registry (fails on any unmapped/duplicated type — impossible-to-lose per
  the spec's edge case); adoption test asserts the exact merged order
  against a fixture that fails on today's "blocks only" editor load;
  lesson-create test asserts no type is required.
- **III. Server is the only judge** — PASS. No grading paths touched;
  assignment grading stays server/teacher-side as today.
- **IV. Product/docs tell one story** — WATCH. README/marketing claim "26
  exercise types" — grouping does not change the count; no claims change.
- **V. Smallest change** — PASS with a note: the biggest diff is a
  *deletion* (inline editors on the course page). The assignment block
  reuses the assignments module wholesale instead of inventing a "task
  block" entity.

No violations. Complexity Tracking not needed.

## Project Structure

### Documentation (this feature)

```text
specs/017-lesson-container/
├── spec.md
├── plan.md              # this file
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/api.md
└── tasks.md             # /speckit-tasks output
```

### Source Code (repository root)

```text
frontend/src/
├── app/(admin)/admin/courses/[courseId]/edit/page.tsx
│      # New Lesson form loses the type picker; inline lesson block editor,
│      # LessonExercises and ExerciseBlockCreator removed; lesson rows
│      # become summary + single Edit link
├── app/(admin)/admin/lessons/[lessonId]/edit/page.tsx
│      # adoption of outside-block exercises; assignment block authoring;
│      # grouped exercise picker; math subtype pre-select
├── app/(dashboard)/courses/[courseId]/lessons/[lessonId]/page.tsx
│      # assignment block rendering for students (card → /assignments/{id})
├── app/(dashboard)/assignments/[assignmentId]/page.tsx   # unchanged, link target
├── lib/api/exercises.ts        # EXERCISE_TYPES_META gains group field + EXERCISE_GROUPS
├── lib/api/exercises.test.ts   # NEW: exhaustive group mapping test
├── app/(admin)/admin/content-library/page.tsx  # grouped filter
└── lib/i18n/locales/{en,es,ru,tr,de,uk}.ts     # group names, assignment-block strings

backend/
├── app/courses/schemas.py      # LessonBlock: + assignment_id (doc-level; JSONB unenforced)
└── tests/test_lesson_container.py  # NEW: create-without-type; assignment block lifecycle
```

**Structure Decision**: existing web-app layout; no new directories.

## Design notes per story

### US1 — lesson without a type

- Backend already defaults `content_type="text"`; the New Lesson form sends
  only title (+ optional duration) with `content: {blocks: []}` in the v2
  shape the lesson editor writes (`buildV2Content` — verify exact marker at
  implementation, don't guess).
- After create, navigate straight to
  `/admin/lessons/{id}/edit?courseId&moduleId` — the container invites
  blocks; no intermediate state on the course page.
- The legacy per-type lesson editors on the course page (quiz builder,
  code-challenge editor, etc. — `lesson.content_type === "quiz"` branches)
  remain reachable ONLY for legacy lessons whose type demands them; new
  lessons never hit those branches. If a legacy branch is reachable only
  from the deleted inline editor, it is kept behind the lesson row's Edit
  path for those lessons (decided in tasks against actual code paths).

### US2 — one authoring surface

- Delete from the course page: inline block editing UI, `LessonExercises`,
  `ExerciseBlockCreator`, the quiz-loading path (`loadQuizForLesson`) for
  new lessons. Lesson rows keep: title, type badge (legacy only), duration,
  block count, drag handle, delete, and ONE Edit link (already
  `/admin/lessons/{id}/edit?...` — shipped in specs/016 style with course
  context).
- Lesson editor on load: fetch `/exercises/by-lesson/{id}` (it already
  does), diff against block `exercise_id`s, append missing as exercise
  blocks *in the by-lesson order* — same order the student page uses today
  for its "not already embedded" tail, so adoption changes nothing visible.
  Saving persists the adopted blocks; until saved, the student path still
  merges, so there is no window where content hides.
- Student page keeps its merge fallback for never-resaved lessons (FR-003).

### US3 — assignment block

- Block payload: `{ id, type: "assignment", sort_order, page,
  assignment_id }`.
- Creating the block opens an inline form (title, instructions, due date,
  max score, allow late) → `POST /api/v1/assignments` with the lesson's
  course_id → block stores the returned id. Editing PATCHes; removing the
  block asks the existing confirm dialog with a submissions warning →
  `DELETE /api/v1/assignments/{id}` then drops the block.
- Student rendering: card with title, due date, max score and a link to
  `/assignments/{assignment_id}` — submission and grading flows untouched.
- Deleted-assignment orphan (block points at 404): render the card in an
  "assignment removed" state for the teacher, hide it for students.
- Course-page Assignments section stays as the overview/grading entry
  (FR-010); creation from there also stays — the block is an additional,
  preferred path, not a data model change.

### US4 — grouped catalogue

- `EXERCISE_TYPES_META` entries gain `group`; new exported
  `EXERCISE_GROUPS: {key, labelKey, types[]}` derived from it. Groups:
  basic (quiz, matching, ordering, fill_blanks, true_false, categorize,
  file_upload, map_pin_drop, bubble_sheet), math (math_interactive,
  math_stepwise, math_system, stereometry), languages (translation,
  sentence_builder, dialogue, conjugation, reading, crossword, word_search,
  srs_flashcard), programming (code_challenge, web_editor, robot_2d,
  world_3d), scorm (scorm_package).
- Pickers (lesson editor block-exercise picker, content-library create
  modal and filter) render group headers; group names via i18n keys ×6.
- Vitest: union of group types === ALL_EXERCISE_TYPES, pairwise disjoint.

### US5 — math subtypes in the picker

- The math_interactive entry in the grouped picker expands to
  `TEMPLATE_LIST` (already deduplicated in specs/016). Picking a subtype
  creates the exercise with `config.template_type` preset; the math editor
  opens on that template.

## Verification

- Vitest + tsc + build + six-locale parity (CI).
- pytest against real PostgreSQL (new test file + full suite locally before
  push).
- Playwright journeys in CI — teacher-homework journey exercises the
  assignments UI and must stay green.
- Browser pass on dev stack: create lesson (no type asked) → add text,
  exercise, assignment blocks → student sees all three in order → grade the
  assignment via existing flow → legacy lesson still renders; grouped picker
  screenshots.

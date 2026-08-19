# Research: Lesson Container & Exercise Catalogue

Code archaeology that shaped the plan; no NEEDS CLARIFICATION markers
remained (owner decisions recorded 2026-08-19 in
tasks/feedback-2026-08-19-authoring.md).

## The container already exists in the data model

- `Lesson.content` is JSONB (`models.py:80`); v2 blocks (`text | html |
  video | exercise`, plus `page`) are parsed/built entirely in the frontend
  (`parseContentToBlocks` / `buildV2Content` on the course page; the lesson
  editor writes the same shape).
- `LessonCreate.content_type` defaults to `"text"` (`schemas.py:78`) — the
  forced type choice is purely a frontend form.
- `LessonBlock` (schemas.py:62) is not enforced on write — blocks are
  free-form JSONB. Adding an `assignment` kind requires no migration.
- **Decision**: keep `content_type` in the model for legacy lessons; stop
  asking for it. No data migration.
- **Alternatives considered**: dropping the column + migrating legacy
  lessons to blocks — a data migration across every school for zero user
  value now; rejected.

## Three authoring surfaces today

1. Course page inline block editor (per-lesson expansion, ~800 lines,
   includes `ExerciseBlockCreator`).
2. Full-page lesson editor `/admin/lessons/{id}/edit` (blocks, inline
   exercise config, already carries `?courseId&moduleId` back-navigation).
3. Course page `LessonExercises` list (attaches exercises to the lesson
   outside any block).

The student page (`(dashboard)/.../lessons/[lessonId]/page.tsx:566-584`)
renders v2 blocks then appends exercises "not already embedded in v2
blocks" — so the student view is already unified.

- **Decision**: the full-page lesson editor is the single surface (it is the
  richest and already inline-configures exercises); the other two are
  removed. Outside-block exercises are adopted into blocks by the editor on
  load, appended in by-lesson order — mirroring the student page's merge, so
  order is provably unchanged.
- **Alternatives considered**: unifying on the inline course-page editor —
  loses the full-width editing surface and keeps the course page enormous;
  a silent backfill converting all lessons' exercises to blocks — invisible
  data rewrite, harder to verify, rejected per constitution V.

## Assignments

- `Assignment` (assignments/models.py:30): org_id + course_id scoped,
  due_date, max_score, allow_late, own submissions; existing CRUD API
  (`AssignmentCreate` takes course_id) and student page
  `/assignments/{id}`.
- **Decision**: block references the assignment by id; create/edit/delete
  from the lesson editor call the existing API. Deleting the block deletes
  the assignment after an explicit submissions warning (owner semantics:
  "задаваться там же" — the block is the assignment's home).
- **Alternatives considered**: `lesson_id` column on assignments (migration,
  and the block already encodes position); embedding assignment fields in
  the block JSON (forks the data model — gradebook/deadlines would need a
  second source of truth); rejected.

## Catalogue grouping

- `EXERCISE_TYPES_META` (lib/api/exercises.ts:200) — flat list of 26; the
  single source for every picker and filter (comment at course page line
  1922 confirms).
- **Decision**: `group` field on the meta + derived `EXERCISE_GROUPS`;
  exhaustiveness enforced by a Vitest test over `ALL_EXERCISE_TYPES`.
  Owner named basic/math/scorm compositions; languages and programming
  follow the platform's subjects: languages = translation, sentence_builder,
  dialogue, conjugation, reading, crossword, word_search, srs_flashcard;
  programming = code_challenge, web_editor, robot_2d, world_3d.
- **Alternatives considered**: separate grouping constant beside the meta —
  two lists to drift apart; grouping in each picker locally — same drift ×3.

## Math Interactive subtypes

- `TEMPLATE_LIST` (deduplicated in specs/016) carries the 16 real templates
  with icons and descriptions; the math editor already opens on
  `config.template_type`.
- **Decision**: expandable subtype list under the math_interactive picker
  entry; selection presets `template_type` in the created exercise's config.

# Contracts: Lesson Container & Exercise Catalogue

No new endpoints. Existing contracts relied on and pinned by tests:

## POST /api/v1/courses/{course_id}/modules/{module_id}/lessons

- Body: `{ title }` is sufficient — `content_type` defaults to `text`,
  `content` defaults to `{}`. The new frontend sends title (+ optional
  duration) and the empty v2 block container.

## PUT /api/v1/courses/{course_id}/modules/{module_id}/lessons/{lesson_id}

- `content` accepts the v2 block container including the new
  `assignment` block kind (JSONB, free-form; `LessonBlock` schema widened
  with `assignment_id` for documentation).

## Assignments API (unchanged, called from the lesson editor)

- `POST /api/v1/assignments` — `{ course_id, title, description, due_date,
  max_score, allow_late }` → assignment; block stores the returned id.
- `PATCH/PUT /api/v1/assignments/{id}` — edits from the block form.
- `DELETE /api/v1/assignments/{id}` — on confirmed block removal; cascades
  submissions exactly as the existing assignment delete does.
- Cross-org ids read as 404 (constitution I), pinned with a positive
  control in the new tests.

## GET /api/v1/exercises/by-lesson/{lesson_id}

- Source of the adoption diff: exercises attached to the lesson; those whose
  ids are absent from the lesson's blocks are appended as exercise blocks in
  this order.

## Frontend route contracts

- `/admin/lessons/{lessonId}/edit?courseId&moduleId` — the single authoring
  surface; creation flow lands here immediately after POST.
- Student `/courses/{courseId}/lessons/{lessonId}` — renders `assignment`
  blocks as cards linking to `/assignments/{assignment_id}`; hides blocks
  whose assignment no longer exists.

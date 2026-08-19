# Quickstart: validating Lesson Container & Exercise Catalogue

Prerequisites: dev stack (local postgres + `uvicorn app.main:app` +
`next dev`), QA-seeded accounts (qa-teacher / qa-student).

## Automated

```bash
cd frontend && npx tsc --noEmit && npm test && npm run build
```

```bash
cd backend && pytest tests/test_lesson_container.py -v && pytest tests/ -q
```

Expected: group-mapping test proves the five groups partition all 26 types;
adoption test proves outside-block exercises append in by-lesson order;
lesson-create test proves title alone suffices; assignment tests prove the
block-created assignment lives the normal lifecycle and cross-org reads 404
with a positive control.

## By hand (teacher, then student)

1. **Lesson without type**: course editor → Add Lesson → only title asked →
   lands in the lesson editor with an empty container. Before: a type grid
   blocked creation.
2. **One surface**: course page shows lesson rows with one Edit entry; no
   inline block editing, no separate "exercises" list. A legacy lesson with
   detached exercises opens in the editor with those exercises visible as
   trailing blocks; saving persists them; the student sees the same order
   as before.
3. **Assignment block**: in the lesson editor add an assignment block
   (title + due date) → student opens the lesson, sees the assignment card,
   submits from `/assignments/{id}` → teacher grades via the existing
   review flow → gradebook shows it. Removing the block warns about
   submissions and deletes the assignment on confirm.
4. **Grouped picker**: exercise picker shows Basic / Mathematics /
   Languages / Programming / SCORM; every type appears once; content-library
   filter mirrors the groups.
5. **Math subtypes**: Math Interactive entry expands to its 16 templates;
   picking "Number Line" opens the editor with Number Line preselected.
6. **Legacy**: an old quiz-type lesson still renders for the student and
   remains editable.

# Quickstart: validating Authoring Quick Fixes

Prerequisites: QA stack up (`docker compose -f docker-compose.qa.yml up -d
--wait`, or the worktree variant with `--env-file .env.qa.local`), seeded
teacher account.

## Automated

```bash
# frontend gates
cd frontend && npx tsc --noEmit && npm test && npm run build
```

```bash
# backend thumbnail test against real postgres
cd backend && pytest tests/test_courses_thumbnail.py -v
```

Expected: registry test proves no duplicate labels in the picker list and
that legacy alias names still resolve; back-target test maps UUID → course
editor and junk → library; thumbnail test proves set / clear / cross-org 404
with a positive control.

## By hand (QA stack, teacher account)

1. **Course picture**: Admin → Courses → edit any course → set a picture →
   save → the course card shows it; replace it; remove it → card falls back
   to default. Expected before fix: no picture control exists at all.
2. **Back to course**: in the course editor open any lesson exercise via its
   edit link → the exercise editor opens with `?courseId=...` in the URL →
   press the back arrow → you land in the same course's editor. Open the same
   exercise from Content Library → back lands in Content Library.
3. **Number line**: open a number-line exercise as a student (or preview) —
   marker letters are comfortably readable at 100% zoom, including after
   "Check Answer" recolours the markers.
4. **Picker dedupe**: course editor → add math-interactive exercise → the
   template picker lists Function Graph, Graph Transformations, Inequality
   Graph and Card Sort exactly once each.

# Quickstart: validating Live Exercise Preview & Anonymous Test Mode

Prerequisites: dev stack (local postgres, uvicorn, next dev), qa-teacher.

## Automated

```bash
cd frontend && npx tsc --noEmit && npm test && npm run build
```

```bash
cd backend && pytest tests/test_exercise_check_no_persist.py -v
```

Expected: `/check` leaves the submissions count unchanged while `/submit`
(positive control) raises it; preview-assembly helper tests green.

## By hand (teacher)

1. Open a **word search** exercise → preview panel shows the student grid;
   add a word → grid re-renders with it. Same check on **web editor**,
   **flashcards**, **step-by-step math**, **system of equations**,
   **solids**, **code challenge**, **bubble sheet** — every editor now has
   a preview (SC-001).
2. **Live updates**: in a math number-line exercise change targets/range →
   the template preview follows immediately (was: stale until reload).
3. **Test mode**: solve a quiz in the panel → verdict appears; open the
   exercise's Submissions page → nothing new (SC-003). Run code in a code
   challenge → output appears; Submit is disabled with the test-mode note.
4. **Banner**: the panel states nothing is saved, and that verdicts follow
   the last save.
5. **Bubble Sheet**: its editor now explains the type; config changes
   reflect in the preview.

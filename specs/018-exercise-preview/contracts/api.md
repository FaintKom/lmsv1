# Contracts: Live Exercise Preview & Anonymous Test Mode

No endpoints added or changed. Relied upon and pinned by tests:

## POST /api/v1/exercises/{exercise_id}/check

- Auth: current user (exercise resolved via org-scoped `get_exercise`).
- Body: `{interactive_answers: {...}}` (quiz shorthand supported).
- Returns per-item booleans only; **creates no submission, consumes no
  attempt** — the new pytest counts `exercise_submissions` before/after,
  with `/submit` as the positive control that the counter can move.
- Rate limit 30/min (unchanged).

## POST /api/v1/sandbox/execute

- Stateless code run (stdout/stderr); already used by the Run button; test
  mode keeps it.

## POST /api/v1/exercises/{exercise_id}/submit

- The only persisting verdict path. `previewMode` components MUST NOT call
  it — enforced by code path, verified by the browser pass and the
  submissions-count check in quickstart.

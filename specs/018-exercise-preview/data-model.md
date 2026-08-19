# Data Model: Live Exercise Preview & Anonymous Test Mode

Nothing is persisted by this feature — that is the feature. No schema
changes, no new storage.

## Preview exercise (in-memory only)

Assembled by a pure helper from editor state:

```
{
  ...savedExercise,          # id, exercise_type, display_id, questions, test_cases
  title:  <editor title state>,
  config: <editor config state>,   # unsaved edits included
}
```

Never written anywhere; feeds `V2ExerciseLive` / `ExerciseRenderer` under
`previewMode`.

## previewMode contract (component prop)

- skip attempt-state loading;
- grade via `POST /exercises/{id}/check` (booleans only);
- `/submit` and any persisting action disabled with an explanatory note;
- `/sandbox/execute` allowed (stateless).

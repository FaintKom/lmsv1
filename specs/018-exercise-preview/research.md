# Research: Live Exercise Preview & Anonymous Test Mode

## Why math previews lie (owner #16, #14)

`TemplatePreview` (math-editor.tsx:2072) passes the live `config` prop, but
every template copies config into `useState` at mount (e.g. NumberLine:
`useState(targets.map(...))`) and never re-syncs. The preview therefore
shows mount-time state forever.
- **Decision**: remount the template on config change via
  `key={JSON.stringify(config)}` — fixes all 16 templates in one place.
- **Alternatives**: adding effect-based re-sync to each template — 16 edits
  and a footgun per new template; rejected.

## Non-persisting verdict paths that already exist

- `POST /exercises/{id}/check` (exercises/router.py:266) — quiz +
  interactive types; per-item booleans, no submission, 30/min. Built for
  integrity model B deferred feedback.
- `POST /sandbox/execute` — runs code without any submission (used by the
  code component's Run button today).
- `/math-validation/*` — stateless equation checks.
- `/submit` is the only persisting verdict path; test mode must simply
  never call it.
- **Decision**: `previewMode` prop on `ExerciseRenderer` and
  `V2ExerciseLive` reroutes grade requests to `/check` and disables
  `/submit`-only actions with an explanatory note (FR-006).

## Where the panel lives

The exercise editor (`content-library/[exerciseId]/page.tsx`) holds live
`{title, config}` state and is the single authoring surface after specs/017
(the lesson editor embeds the same config panel, which links here for the
full page). One panel there covers all 26 types.
- **Alternatives**: per-type preview widgets inside each config editor —
  eight new implementations and continued drift; rejected.

## Verdicts follow the last save

`/check` grades against the SAVED exercise row, while the preview *render*
follows unsaved local state. Making verdicts follow unsaved state would
need a new "check this config" endpoint that accepts an answer key from the
client — new surface, new leak risk.
- **Decision**: keep `/check` as-is; the panel states that verdicts follow
  the last save. The editor already autosaves nothing here, but Save is one
  click and the honesty is cheap. Revisit only if the owner trips on it.

## Bubble Sheet

`bubble_sheet` is an OMR/scantron-style answer sheet: numbered questions,
A–D (configurable) bubbles, graded against the key — SAT-style bulk
answering. It has a V2 live component (`v2/bubble-sheet-v2.tsx`) and went
through integrity model B (PR-1). It lacks any editor explanation, hence
the owner's "в чем смысл". One description paragraph in its config editor
plus the shared preview covers #32.

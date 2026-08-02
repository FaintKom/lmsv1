# 013 — Integrity model B, PR-2: matching + categorize deferred check, multi-pin map

- **Status**: TODO
- **Commit**: a01d106
- **Severity**: HIGH (answer leak: pairs/categories readable in DevTools)
- **Category**: integrity model B (server-graded exercises)
- **Estimated scope**: backend strip+tests (~80 lines), 2 component refactors + adapter (~400 lines), map-pin multi-target (~150 lines)

## Problem

`matching` and `categorize` still ship their answer keys to students:
`config.pairs` (left→right mapping) and `config.categories[].items`
(category→items mapping) survive `_strip_answers`
(`backend/app/exercises/router.py`, function `_strip_answers`). Their V2
components grade locally from those props.

Infrastructure already shipped in PR-1 (#212) — reuse it, don't reinvent:
- `grade_interactive_detail()` in `backend/app/submissions/service.py`
  (per-item verdicts; add branches for these types).
- Non-persisting `POST /exercises/{id}/check` (already routes through
  `grade_interactive_detail`; rate-limited 30/minute; returns booleans only).
- `per_item` in the submit response + `V2GradeResult.perItem` on the
  frontend (`frontend/src/lib/exercises/v2-adapter.ts`).
- Dual-mode component pattern: `frontend/src/components/exercises/v2/conjugation-v2.tsx`
  is the exemplar (optional `onGrade`, `serverFlags` state, local grading
  kept for teacher preview).

Graders already exist server-side: `_grade_matching`, `_grade_categorize` in
`backend/app/submissions/service.py`.

## Target

### Backend

1. `_strip_answers` additions (keep display data, drop the mapping):
   - matching: replace `config.pairs` with two flat lists —
     `left_items` (all `pairs[].left`, original order) and `right_items`
     (all `pairs[].right`, SHUFFLED with `random.shuffle`); drop `pairs`.
   - categorize: replace `config.categories` with
     `category_names: [c["name"], ...]` and `items: shuffled flat list of
     all c["items"]`; drop `categories`.
2. `grade_interactive_detail` branches:
   - matching → per_item keyed by left value: `{left: bool}` (same compare
     as `_grade_matching`: `correct_map.get(sp["left"]) == sp["right"]`).
   - categorize → per_item keyed by item text: `{item: bool}` (item counted
     correct if placed in its config category).
   Refactor the existing graders into `_grade_X_detail` + thin `_grade_X`
   wrapper, exactly like `_grade_conjugation_detail` does.
3. Tests in `backend/tests/test_exercises_integrity.py` (follow the file's
   existing `_make_typed` helper): strip removes mapping + keeps display
   lists; `/check` returns per-pair verdicts and creates no submission row;
   submit passes/fails correctly with shuffled input.

### Frontend

4. `matching-v2.tsx` dual-mode:
   - Props: `pairs?: MatchingPair[]` becomes optional; add
     `leftItems?: string[]`, `rightItems?: string[]`, `onGrade?: V2GradeFn`,
     `onCheck?: V2GradeFn`, `onAnswersChange?`.
   - Server mode (when `onGrade` set): build columns from
     `leftItems`/`rightItems`. The deferred Check must NOT consume an
     attempt — it calls `onCheck` (wired to `POST /exercises/{id}/check`);
     `onGrade` (submit) fires ONCE when every pair is locked correct, to
     record the submission.
   - Wrong pairs unlink on verdicts from `per_item`; correct pairs lock (the
     existing local behavior, driven by server flags instead of local
     compare).
   - Preview mode (no `onGrade`): unchanged behavior from `pairs`.
5. `categorize-v2.tsx`: same dual-mode conversion (items + category names in
   server mode; deferred per-item verdicts via `onCheck`; final submit via
   `onGrade`).
6. `map-pin-v2.tsx` multi-target: current component takes ONE
   `target {x,y}`. Config shape is `pins: [{label, x, y, tolerance}]` and
   the stripped student config is `pins: [{label}]`. Convert to
   `pins: {label}[]` + place-one-pin-per-label flow (click places the pin
   for the currently active label; list of labels on the side, active one
   highlighted). Submit payload `{pins: [{x,y}, ...]}` in label order;
   verdicts from `per_item` (list of booleans) color the placed pins. Local
   preview mode keeps the single-target behavior via the existing props
   (do not break `admin/preview/v2-map-pin/page.tsx`).
7. `v2-adapter.ts`: `V2_LIVE_TYPES` += `"matching", "categorize",
   "map_pin_drop"`. `V2ExerciseLive`
   (`frontend/src/components/exercises/v2-exercise-live.tsx`) maps configs →
   props for the three types and provides both `onGrade` (submit) and
   `onCheck` (`apiClient.post(\`/exercises/${id}/check\`, {interactive_answers})`).

## Repo conventions to follow

- Exemplar dual-mode component: `conjugation-v2.tsx` (serverFlags state,
  `checking` guard on canCheck, `applyFlags`, no-reveal-in-server-mode).
- Exemplar strip/display asymmetry: `fill_blanks` in `V2ExerciseLive`
  (`cfg.word_bank ?? cfg.blanks`).
- Backend tests: `backend/tests/test_exercises_integrity.py` patterns.
- Oracle note: `/check` returns booleans only — never expected values — and
  is rate-limited; keep it that way.

## Steps

1. Backend strip + detail graders + tests. Run
   `cd backend && python -m pytest tests/test_exercises_integrity.py -q`.
2. `v2-adapter.ts` + `V2ExerciseLive` wiring (types + onCheck plumbing).
3. `matching-v2.tsx` dual-mode.
4. `categorize-v2.tsx` dual-mode.
5. `map-pin-v2.tsx` multi-target.
6. Full verification.

## Boundaries

- Do NOT ship the strip without the same-PR frontend — a stripped config
  with the old client-graded components makes the types unplayable (this is
  why PR-1 was vertical; PR-2 must be too).
- Do NOT touch quiz/reading/dialogue/crossword (that's plan 014).
- Do NOT modify legacy renderers (`components/exercises/matching-exercise*`
  etc.) — after `V2_LIVE_TYPES` grows, students never reach them; teachers
  keep full configs.
- Do NOT relax the `/check` rate limit or add expected answers to its
  response.
- If component internals drifted from the exemplar description, STOP and
  report.

## Verification

- **Mechanical**: backend
  `python -m pytest tests/test_exercises_integrity.py tests/test_exercises.py -q`
  green; frontend `npx tsc --noEmit && npm test && npm run build` green.
- **Feel check** (dev server or prod after deploy, student account):
  - matching: student GET config has no `pairs`; wrong pair flashes and
    unlinks, correct pair locks; DevTools network shows `/check` calls
    (no submission rows) until the final all-correct submit.
  - categorize: same pattern with items/buckets.
  - map-pin: placing pins per label works; verdict colors per pin.
  - Teacher preview pages (`/admin/preview/v2-*`) still grade locally.
- **Done when**: student payloads for all three types contain no answer
  mapping and the full play-flow works server-graded.

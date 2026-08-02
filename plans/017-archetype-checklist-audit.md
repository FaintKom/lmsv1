# 017 — Per-archetype v2 checklist walkthrough (migration-map §5)

- **Status**: TODO
- **Commit**: a01d106
- **Severity**: LOW (final compliance pass)
- **Category**: design-system v2
- **Estimated scope**: audit + small class-level fixes across ~15 pages; run AFTER plans 008-012

## Problem

The v2 migration landed the token layer, renames, and the flagship screens
(dashboard, sidebar, course-card). The per-archetype checklist in
`frontend/design/migration-map.md` §5 has not been walked screen by screen,
so deviations (arbitrary values, tinted headings, double accents, emoji)
likely survive on less-trafficked pages.

## Target

Walk every archetype below against its rules; fix small deviations in place
(className-level); log anything structural as a new finding instead of
fixing it. Rules source: `frontend/design/DESIGN_SPEC.md` (rules header +
§13 layout) and `frontend/design/migration-map.md` §4.

| Archetype | Pages | Key checks |
|---|---|---|
| Overview | `dashboard`, `progress`, `parent`, `admin` (home), `analytics` | flat hero, text-only KPIs, ONE accent per card, no emoji, `.eyebrow` labels |
| Catalog | `courses`, `assignments`, `users`, `groups`, `content-library` | tiles per course-card exemplar; filters column; no raw palette |
| Data | `journal`, `gradebook`, `review`, `submissions`, `attendance` | dense 32px rows (plan 011 covers journal/gradebook — here verify the rest) |
| Learning | `lesson/[id]`, course lesson page, live student page, `print` | 720px reading column (`--reading`), focus mode, no rail leakage |
| Exercises | spot-check 6 of the 44 V2 widgets | one shell: prompt header / field / footer; states idle-answered-correct-incorrect-reveal; shake 160ms ±4px ×2 |
| Rewards | `achievements`, `leaderboard`, `my-room`, `skills` | clay glyphs, no emoji in product UI, voxel palette untouched |
| Auth & text | `login`, `register`, legal pages, `offline` | single 480px column, sentence case, one sun-mark max per page, 68-char measure |

Mechanical sweeps to run per page (from migration-map §3) — any hit outside
globals.css is a defect:

```bash
rg -n "#[0-9a-fA-F]{6}" frontend/src --glob '!**/*.test.*' --glob '!**/voxels.ts' --glob '!**/globals.css'
rg -n "rounded-\[|text-\[[0-9]" frontend/src --glob '!**/globals.css'
rg -n "bg-(red|blue|orange|amber|emerald|slate|gray|zinc)-|from-(emerald|amber|orange|teal)" frontend/src
rg -n "[🔥🎉📚⭐✨🚀]" frontend/src --glob '!**/locales/*'
```

Known allowed exceptions (do NOT report): voxel palettes
(`lib/avatar/voxels.ts`, `lib/room/voxels.ts` — numeric hexes for three.js),
subject-gradient raw-scale classes per DESIGN_SPEC §4, `--font-math`,
`text-[10px]` in dense mono meta (spec uses 10px there), marketing/landing
pages (emoji + long animations allowed).

## Deliverable

1. Fixes: small className corrections committed in one PR.
2. Report appended to THIS plan file under a "## Findings" heading: one
   table `| page | check | verdict (OK/FIXED/LOGGED) | note |` covering
   every page listed above. LOGGED items get one line each with file:line.
3. Also verify the deferred item from the dashboard migration: the 4th KPI
   shows XP because "average grade" has no endpoint — log whether a grades
   aggregate exists by now (`grep -rn "avg\|average" backend/app/analytics/
   backend/app/gamification/ --include="*.py" -l`); if yes, note it as a
   candidate follow-up, do not implement.

## Boundaries

- className-level fixes only; anything structural (layout rebuilds, new
  components, new endpoints) is LOGGED, not implemented.
- Do NOT touch marketing pages, voxel files, generated `tokens.css`.
- Do NOT fix pages covered by pending plans 010 (catalogs) and 011 (dense
  data) — mark them "deferred to 010/011" in the report.

## Verification

- **Mechanical**: all four sweeps return only the allowed exceptions;
  `npx tsc --noEmit && npm run build` green.
- **Feel check**: pick one page per archetype in the dev server and squint:
  one accent per card, no tinted headings, visible focus ring on Tab.
- **Done when**: the Findings table covers all 7 archetypes and the sweeps
  are clean.

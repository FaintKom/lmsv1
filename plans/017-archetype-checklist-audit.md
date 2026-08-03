# 017 — Per-archetype v2 checklist walkthrough (migration-map §5)

- **Status**: DONE (2026-08-03, PR #239) — findings table at the end of this file.
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

---

## Findings — 2026-08-03

Ran the four sweeps from the plan across `frontend/src`.

| Check | Result | Verdict |
|---|---|---|
| Raw Tailwind palette (`amber/emerald/orange/…`) | 6 hits | **FIXED** (4) / LOGGED (2) |
| Emoji in product UI | 10 hits | **FIXED** (6) / allowed (4) |
| Arbitrary `rounded-[…]` / `text-[…]` | 421 hits | **FIXED** (112 exact-token matches) / allowed (~300) |
| Raw hex outside globals | 761 hits | allowed — canvas/3D palettes |

### Fixed
- `achievements`, `certificates`, `leaderboard`, `badge-card`: amber/orange
  gradients → `sun-*` / `clay-*` tokens.
- Emoji removed from chrome: "✨ Edit" (course editor), "🎉" (review-queue
  widget), "⭐" badge fallback → `•`, "📚" course glyph → `≡`, "🚀"
  (onboarding tour), and the flashcard celebration "🎉" → a Lucide
  `PartyPopper` icon.
- 112 arbitrary values whose pixel value matches a token exactly
  (`text-[13px]`→`text-sm`, `[12px]`→`text-xs`, `[15px]`→`text-base`,
  `rounded-[10px]`→`rounded-sm`, `[14px]`→`rounded-md`, `[18px]`→`rounded-lg`,
  `[24px]`→`rounded-xl`, `[6px]`→`rounded-xs`). Zero visual change by
  construction.

### Logged, not fixed (with reasons)
- **`app/page.tsx` (landing)** — two `amber/emerald` gradients. Marketing
  surface, and the file carries the owner's uncommitted work; not touched.
- **`components/landing/role-showcase.tsx`** — owner's untracked WIP.
- **Game sprites** (`robot-2d` ⭐ on the canvas) — content, not chrome.
- **`text-[10px]` (133) and `text-[11px]` (94)** — the spec itself uses 10px
  mono meta (§8 table headers) and 11px mono breadcrumbs (§7); these are the
  design, not debt.
- **`text-[9px]/[14px]/[28px]`, `rounded-[7px]/[8px]/[11px]/[12px]`** (~40) —
  no exact token; changing them alters the pixel result, so each needs a
  design decision rather than a sweep.
- **761 raw hex** — concentrated in `components/game/*`, `room`, `avatar`,
  `exercises/v2` math widgets: three.js materials, canvas fills and SVG
  strokes, which cannot read CSS custom properties. Same category as the
  voxel palettes the plan already exempts.

### Deferred item checked
Average-grade KPI (the dashboard shows XP instead): still no aggregate
endpoint — `grep -rn "avg\|average" backend/app/analytics backend/app/gamification`
returns only per-course helpers, nothing class-wide. Remains a follow-up.

---

## Follow-up work still needed (2026-08-03)

The sweep closed colour, radius, type and emoji compliance. Four gaps remain;
none block anything shipped, but 017 is NOT fully done until they are decided.

### 1. The motion layer is documented but unused — biggest gap

`frontend/design/MOTION.md` defines the contract and `globals.css` exports the
utilities, yet **adoption is zero**:

| utility | components using it |
|---|---|
| `.press-scale` | 0 |
| `.enter-fade-rise` | 0 |
| `.stagger-children` | 0 |
| `.btn-pop` (pre-existing) | 13 |

So the app's motion still comes from ad-hoc `transition-*` classes in 105 tsx
files plus the exercise-widget system (`.fb-*` / `.gp-*` / `.lf-*`). The rules
were written; nothing was migrated onto them. Needs a slice-by-slice adoption
pass like 018 had — starting with press feedback on primary buttons, then
entrance on dashboard/course cards.

### 2. ~40 arbitrary values with no exact token

`text-[9px]` (10), `text-[14px]` (7), `rounded-[7px]/[8px]/[11px]/[12px]` (~20).
Each changes pixels if converted, so each needs a design call: round to the
nearest token, or add the value to the scale. Do not sweep blindly.

### 3. `text-[10px]` / `text-[11px]` should be named

227 occurrences of the spec's own dense mono meta and breadcrumb sizes, written
as arbitrary values every time. Two named utilities (`.text-meta`,
`.text-crumb`) would make the intent legible and let the size change in one
place. Currently allowed by the exception list, but that list is hiding a
missing token.

### 4. Two surfaces were never audited

`app/page.tsx` and `components/landing/role-showcase.tsx` carry the owner's
uncommitted work; the audit skipped them to avoid touching it. They hold the
last two raw `amber`/`emerald` gradients and a `🔥` emoji. Re-run the four
sweeps over the landing surface once that work lands.

### 5. Known backend gap (unchanged)

The dashboard KPI shows XP because no class-wide average-grade endpoint exists
(`backend/app/analytics`, `gamification` have only per-course helpers).

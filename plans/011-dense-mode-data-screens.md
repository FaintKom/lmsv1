# 011 — Dense mode for data screens (journal, gradebook, users, groups, content-library)

- **Status**: TODO
- **Commit**: a01d106
- **Severity**: MEDIUM
- **Category**: design-system v2 (data archetype, DESIGN_SPEC §8)
- **Estimated scope**: 5 pages, class-level changes; journal/gradebook are large files — expect 1-2 sessions

## Problem

The v2 spec defines a dense mode for data-heavy screens
(`frontend/design/DESIGN_SPEC.md` §8 "Tables (dense mode)" and
migration-map §4.6), but the five data screens still use the comfortable
card scale (44px+ rows, radius 10-18, proportional digits):

- `frontend/src/app/(admin)/admin/journal/page.tsx` (~2900 lines — the god
  file; change classes only, do not refactor)
- `frontend/src/app/(admin)/admin/gradebook/page.tsx`
- `frontend/src/app/(admin)/admin/users/page.tsx`
- `frontend/src/app/(admin)/admin/groups/page.tsx`
- `frontend/src/app/(admin)/admin/content-library/page.tsx`

## Target (the dense contract, DESIGN_SPEC §8)

Apply to every TABLE/GRID region on these pages (page headers/toolbars stay
at normal scale):

- Row height 32px: cells `h-8` / `py-0 px-2.5` (spec: cell padding 0×10) —
  the token `--row-dense: 32px` exists in globals.css.
- Header row: `.eyebrow` styling on `bg-surface-2` (mono 10 caps
  `text-text-subtle`), sticky: `sticky top-0 z-10`.
- First column sticky where the table scrolls horizontally:
  `sticky left-0 z-10 bg-surface` on the `<th>`/`<td>` of column 1.
- All numeric cells: `tabular-nums font-mono`.
- Radius on cells/badges inside tables ≤ 6px → `rounded-xs` (6px) or none.
- Zebra striping: `odd:bg-transparent even:bg-surface-2` on `<tr>` (or the
  page's existing zebra mechanism recolored to `surface-2`).
- Selected row: `border-l-2 border-l-primary bg-green-25`.
- Grade cells (gradebook + journal): ≥85 → `bg-green-50`; 60-84 → no bg;
  <60 → `bg-clay-50 text-clay-700`; pending → mono 10 `text-info`; absent →
  `н` in `text-ink-300`. (The journal-status helper
  `frontend/src/lib/journal-status.ts` already encodes clay statuses — reuse
  it, don't fork the mapping.)
- Spacing between table blocks ×0.75 of the page default (e.g. `gap-4` →
  `gap-3`, `p-6` → `p-4` INSIDE table cards only).

## Repo conventions to follow

- Semantic utilities; the dense row height may use `h-8` (32px = Tailwind 8).
- `tabular-nums` utility exists in globals.css.
- Sticky pattern exemplar: none in repo yet — this plan introduces it; keep
  it plain CSS utilities as above, no new components.

## Steps

1. `gradebook/page.tsx` first (smallest risk, clear table): apply the full
   Target list. Screenshot before/after.
2. `users/page.tsx`, `groups/page.tsx`, `content-library/page.tsx`: same
   pass. These may render card lists rather than `<table>` — dense mode
   there means: row container `h-8` min, text `text-sm`, radius ≤ `rounded-xs`
   inside rows, numbers `tabular-nums`. If a page turns out to have NO
   tabular region (pure card grid), note it in the plan status and skip it.
3. `journal/page.tsx` last (largest): tables + grade cells + sticky axes.
   Change ONLY classNames and small style objects. If a change would require
   restructuring JSX, note it and skip that spot.
4. Verification.

## Boundaries

- Do NOT refactor or split the journal god-file (explicit prior owner
  decision: split opportunistically only).
- Do NOT change any data fetching, sorting, filtering logic.
- Do NOT introduce virtualization.
- Do NOT touch student-facing pages.
- The 46px bulk-selection toolbar from spec §8 is OUT of scope unless the
  page already has a bulk toolbar (then just set its height to `h-[46px]`).

## Verification

- **Mechanical**: `cd frontend && npx tsc --noEmit && npm run build` green.
- **Feel check** (dev server, teacher account):
  - /admin/gradebook: rows are visibly denser (~32px), headers stay visible
    while scrolling, first column stays put on horizontal scroll, grade
    numbers align vertically (tabular).
  - /admin/journal: grade/status cells show tint + number (color is never
    the only signal — the number/letter is always present).
  - No text clipped vertically at 32px (line-height must fit).
- **Done when**: all five pages pass the feel check or are explicitly noted
  as "no tabular region".

# 010 — Catalog pages Lively pass (student /courses + admin /admin/courses)

- **Status**: TODO
- **Commit**: a01d106
- **Severity**: MEDIUM
- **Category**: design-system v2 (catalog archetype)
- **Estimated scope**: 2 pages, ~150 lines of class changes

## Problem

Both catalog pages predate Lively v2 and still carry raw Tailwind palette
gradients and a low-contrast status chip.

1. `frontend/src/app/(admin)/admin/courses/page.tsx:195-206` — current:

```tsx
 const CATEGORY_GRADIENTS: Record<string, string> = {
 programming: "from-green-500 to-emerald-600",
 math: "from-emerald-500 to-teal-600",
 languages: "from-amber-500 to-orange-600",
 };
 ...
 const gradient = CATEGORY_GRADIENTS[category || ""] || (isTemplate ? "from-emerald-500 to-green-600" : "from-green-500 to-emerald-600");
```

`emerald/teal/amber/orange` are NOT design-system colors (the token sweep
only covered `bg-*` prefixes, so `from-*/to-*` survived).

2. `frontend/src/app/(admin)/admin/courses/page.tsx:180-191` — the status
   badge is rendered ON TOP of the course cover in some layouts and
   `bg-primary-soft text-success-fg` reads poorly there:

```tsx
 const statusBadge = (status: string) => {
 const colors: Record<string, string> = {
 draft: "bg-sun-100 text-warning-fg ",
 published: "bg-primary-soft text-success-fg ",
 archived: "bg-ink-100 text-text-muted ",
 };
```

3. `frontend/src/app/(dashboard)/courses/page.tsx` — general v1 leftovers:
   arbitrary `rounded-[...]`/`text-[...]` values and any non-token colors.

## Target

1. Category gradients use the SAME subject mapping as
   `frontend/src/components/courses/course-card.tsx` (the v2 exemplar,
   DESIGN_SPEC §4). Replace the `CATEGORY_GRADIENTS` map + fallback with:

```tsx
 const CATEGORY_GRADIENTS: Record<string, string> = {
 programming: "from-green-600 to-green-900",
 math: "from-green-400 to-green-800",
 languages: "from-clay-500 to-clay-700",
 sat: "from-sun-500 to-sun-700",
 };
 ...
 const gradient = CATEGORY_GRADIENTS[category || ""] || "from-green-400 to-green-800";
```

2. Status chip per DESIGN_SPEC §3 (chips): height 28, `rounded-pill`,
   12/700. When the chip sits on a cover/image, give it a solid surface so
   it always reads:

```tsx
 draft: "bg-sun-100 text-sun-700",
 published: "bg-green-100 text-green-800",
 archived: "bg-ink-50 text-ink-500",
```

   and on covers add `shadow-sm` + keep the pill on a solid (non-soft)
   background — never a translucent tint over an image.

3. On BOTH pages, sweep and replace:
   - `rounded-[24px]`→`rounded-xl`, `rounded-[18px]`→`rounded-lg`,
     `rounded-[14px]`→`rounded-md`, `rounded-[10px]`/`rounded-[12px]`→`rounded-sm`
   - `text-[28px]`+ → `text-xl`, `text-[17px]`→`text-md`, `text-[15px]`→`text-base`
   - any `emerald|teal|amber|orange|slate|gray|blue|red` utility (including
     `from-`/`to-`/`ring-`/`border-` prefixes) → nearest token per the table
     in `frontend/design/migration-map.md` §1-2 (emerald/teal→green,
     amber→sun, orange→clay, slate/gray→ink, blue→lagoon)
   - mono uppercase labels → the `.eyebrow` utility class.

## Repo conventions to follow

- Exemplar card: `frontend/src/components/courses/course-card.tsx` (v2
  gradients, hover `transition duration-200 hover:-translate-y-0.5
  hover:border-green-300 hover:shadow-md`).
- Semantic utilities preferred (`bg-surface-2`, `text-text-muted`); raw scale
  (`green-600`) allowed only for the subject gradients per spec.
- Check compliance after editing with:
  `grep -n "emerald\|teal\|amber\|orange\|slate-\|gray-\|blue-\|red-" <file>`
  → must return nothing.

## Steps

1. Edit `frontend/src/app/(admin)/admin/courses/page.tsx`: gradients map
   (Target 1), status chip (Target 2), sweep (Target 3).
2. Edit `frontend/src/app/(dashboard)/courses/page.tsx`: sweep (Target 3).
3. Verification.

## Boundaries

- Do NOT change data fetching, filtering, or handlers — class/visual only.
- Do NOT restructure the page into new components.
- Do NOT touch `course-card.tsx` (already migrated).
- If the excerpts above don't match (drift), STOP and report.

## Verification

- **Mechanical**: `cd frontend && npx tsc --noEmit && npm run build` green;
  the greps in "Repo conventions" return nothing for both files.
- **Feel check** (dev server): /courses and /admin/courses — covers show
  green/clay/sun subject gradients; the `published` chip is legible on every
  card variant (cover and no-cover); hover lift is 120-200ms, no layout
  shift.
- **Done when**: both pages contain zero non-token color utilities and the
  chips pass a squint test on covers.

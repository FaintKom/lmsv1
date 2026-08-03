# 020 — Motion adoption, slice 1: buttons and cards

- **Status**: DONE (2026-08-03) — see Deviations below
- **Commit**: 8aababd
- **Severity**: MEDIUM (the design system's motion layer is currently dead code)
- **Category**: design-system v2 · motion
- **Estimated scope**: 2 shared components + ~2 call sites. Small diff, wide
  blast radius — `ui/button.tsx` is imported by 76 files.

## Problem

`frontend/design/MOTION.md` defines the contract and `globals.css` exports the
utilities, but **adoption is zero** (measured 2026-08-03):

| utility | components using it |
|---|---|
| `.press-scale` | 0 |
| `.enter-fade-rise` | 0 |
| `.stagger-children` | 0 |

Two concrete consequences visible in the shared primitives:

1. **`frontend/src/components/ui/button.tsx`** — the solid variants get
   `btn-pop` (a shadow shift), but `outline` and `ghost` have only
   `transition-colors`. Pressing them produces no tactile response at all.
2. **`frontend/src/components/ui/card.tsx:13`** — `"rounded-lg transition
   duration-200"`. That bare `transition` is Tailwind's `transition: all`,
   which MOTION.md §5 forbids: it animates layout properties, so any
   width/height/padding change on a card animates too, and it is a classic
   source of first-paint jank.

## Target

### 1. `ui/button.tsx` — press feedback on every variant

Add `press-scale` to the shared class string (the one that already carries
`inline-flex items-center …`), NOT per variant. `.press-scale` is defined in
`globals.css` and applies `scale(0.96)` on `:active` with
`transition-property: transform` only.

Keep `btn-pop` where it already is — the two compose: `btn-pop` moves the
shadow, `press-scale` moves the surface.

Do NOT add it to:
- `<button>` elements that are toggles inside dense tables (journal cells),
  because the row is the hit target and scaling a cell shifts the grid;
- icon-only buttons smaller than 32px, where 0.96 is invisible and just costs
  a repaint.

### 2. `ui/card.tsx` — replace `transition: all`

Line 13: `"rounded-lg transition duration-200"` →
`"rounded-lg transition-[box-shadow,border-color,background-color] duration-[--motion-base] ease-[--motion-ease]"`.

Rationale: those three are the only properties any card variant actually
changes on hover/focus. Transform is deliberately excluded — cards that lift
on hover opt in individually (see 3).

### 3. Entrance on the two card grids the student sees first

Add `enter-fade-rise` + `stagger-children` to the grid CONTAINER (not the
cards) in:
- `frontend/src/app/(dashboard)/dashboard/page.tsx` — the KPI/summary row
- `frontend/src/app/(dashboard)/courses/page.tsx` — the course grid

`.stagger-children` delays children by `--motion-stagger` (60ms), capped at
the 6th child so a 30-course catalog does not take two seconds to appear.

**Hard rule from MOTION.md §1**: entrance animations run on *navigation*, not
on every re-render. If the grid re-renders on filter/search input, the
animation will replay on every keystroke — verify this by typing in the
catalog search box. If it replays, drop the entrance from that grid and say so
in the PR rather than reaching for a keyed remount hack.

## Repo conventions to follow

- Utilities live in `globals.css`; read `.press-scale` and `.enter-fade-rise`
  there before using them — do not redefine them locally or inline the
  keyframes.
- Tailwind arbitrary-property syntax for the tokens: `duration-[--motion-base]`
  resolves the CSS variable; do NOT hardcode `200ms`.
- `cn()` from `@/lib/utils` for class composition, as both files already do.

## Steps

1. Read `globals.css` around the utilities block to confirm the exact class
   names and what each animates.
2. `ui/button.tsx`: add `press-scale` to the shared class string.
3. `ui/card.tsx`: replace the bare `transition duration-200`.
4. Add the entrance pair to the two grid containers.
5. Verification below.

## Boundaries

- Do NOT touch the exercise-widget motion (`.fb-*` / `.gp-*` / `.lf-*`) — that
  is plan 021.
- Do NOT install a motion library. There is none in `package.json` today and
  adding one inflates the prod build (see the root CLAUDE.md memory note).
- Do NOT add motion to high-frequency controls: sidebar items, table rows,
  pagination. MOTION.md §1 — the attention cost repeats on every trigger.
- Do NOT touch `app/page.tsx` or `components/landing/role-showcase.tsx` — the
  owner has uncommitted work there.

## Verification

- **Mechanical**: `npx tsc --noEmit && npm test && npm run build`.
- **Feel check** (this is the one that matters — motion cannot be verified by
  a typecheck):
  - press a primary, an outline and a ghost button: all three depress, none
    shifts its neighbours;
  - load /dashboard and /courses: cards rise once, staggered, and the last
    card is not visibly late;
  - type in the catalog search: the grid must NOT re-animate;
  - resize a card's container (e.g. toggle the sidebar): no width animation —
    that is the `transition: all` regression this plan removes;
  - set `prefers-reduced-motion: reduce` in devtools: entrances become instant,
    press still gives colour feedback.
- **Done when**: the three utilities have non-zero adoption, the bare
  `transition` in card.tsx is gone, and none of the above feel checks regress.


---

## Deviations from this plan, found while executing (2026-08-03)

1. **`press-scale` does NOT compose with `btn-pop`.** The plan said to add it to
   the shared class string on every variant. Wrong: `.btn-pop:active` sets
   `transform: translateY(4px)` and `.press-scale:active` sets `scale(0.96)` —
   same property, same element. `.press-scale` is defined later in
   `globals.css` (489 vs 409), so it would have won and silently replaced the
   signature press on every primary button. Applied to `outline` and `ghost`
   only, which is what the utility's own comment already said.

2. **`.press-scale` had to learn colours.** `globals.css` uses no `@layer`, so
   its rules are unlayered and beat Tailwind's layered utilities. With
   `transition-property: transform` alone it overrode `transition-colors` on
   those two variants and hover became instant. Verified in the browser before
   and after: `transitionProperty` read `transform`, now reads
   `transform, background-color, border-color, color`. The utility now carries
   both.

3. **Containers get `stagger-children` only**, not `enter-fade-rise` as well —
   `.stagger-children > *` already applies that animation to the children, so
   adding both would animate the grid and its cards.

4. **The search-replay risk did not materialise.** The student catalog holds no
   filter state (`useState` only for `courses`, `progressMap`, `loading`), so
   the grid mounts once. Nothing to guard against there; it stays a live risk
   for the admin catalog, which does filter.

### Tooling note

Turbopack dev served the OLD css under an unchanged chunk name
(`[root-of-the-server]__1u_kw8y._.css`) across a server restart AND a
`.next/cache` wipe. Only deleting the whole `.next` directory picked up the
edit. If a CSS change appears not to apply, verify what the server actually
serves (`fetch(cssHref, {cache:'reload'})`) before assuming the edit is wrong.

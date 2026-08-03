# 018 — Dark readiness: raw scale utilities → semantic (unblocks theme = system)

- **Status**: DONE (2026-08-03) — seven slices, ~1500 substitutions; theme
  default flipped back to `system`. Slices 5 and 6 were not in the original
  list: the prod check found white course cards (component folders outside
  ui/layout/lesson/exercises) and a white exercise shell (the `.lf-*`/`.gp-*`
  classes in globals.css). Mechanical gates could not have caught either.
- **Commit**: 82bad96
- **Severity**: HIGH (blocks the dark theme from being usable)
- **Category**: design-system v2 compliance
- **Estimated scope**: ~1500 utility occurrences across most pages; do it in
  slices (one PR per area), not one mega-diff

## Problem

`.dark` in `frontend/src/app/globals.css` flips only the SEMANTIC aliases
(`--color-bg`, `--color-surface`, `--color-text`, …). The design system's
rule is "semantic utilities only in components" — but the app widely uses
RAW scale utilities, which keep their light values in dark mode:

| utility | occurrences (2026-08-02) | flips in dark? |
|---|---|---|
| `bg-paper` / `bg-paper-2` | 459 / 442 | **no** |
| `text-ink-700` | 466 | **no** |
| `bg-ink-50`, `border-ink-100`, `text-ink-900` | 55 / 34 / 20 | **no** |
| `bg-white`, `text-white` on light surfaces | 25 | **no** |
| `bg-surface`, `text-text`, `border-border` | 243 / 1818 / 677 | yes |

Result: with `.dark` applied the page background and body text flip, but
cards stay white with near-black text — the half-dark UI observed on the
dev server on 2026-08-02. This is why the theme default was set to `light`
in `layout.tsx` (see the comment there) instead of `system`.

**A blanket "invert the ink ramp inside .dark" is NOT a valid shortcut**:
`ink-900` also serves as an always-dark surface — modal scrims
(`bg-ink-900/40`, e.g. `components/assessments/quiz-submission-breakdown.tsx`),
code blocks (`bg-ink-900 text-ink-100`, e.g.
`app/(admin)/admin/content-library/[exerciseId]/submissions/page.tsx:330`)
and `.rail-dark` (`--color-surface: var(--ink-900)`). Inverting would turn
scrims white and make code blocks unreadable.

## Target

1. **Substitution table** (apply per file, verify visually):

| raw | semantic replacement |
|---|---|
| `bg-paper` | `bg-bg` |
| `bg-paper-2` | `bg-surface` |
| `bg-ink-50` | `bg-surface-2` |
| `border-ink-100` | `border-border` |
| `border-ink-200`/`border-ink-300` | `border-border-strong` |
| `text-ink-900` | `text-text` |
| `text-ink-700` | `text-text` (body) — use `text-text-muted` only where the design intends secondary text |
| `text-ink-500` | `text-text-muted` |
| `text-ink-400`/`text-ink-300` | `text-text-subtle` |
| `bg-white` on a card | `bg-surface` |

2. **Keep as raw (intentional, always-dark or brand-fixed)** — do not
   convert, add a short comment where it isn't obvious:
   - scrims: `bg-ink-900/40`, `/45`, `/60`
   - code/terminal blocks: `bg-ink-900` + `text-ink-100`
   - `.rail-dark` block in globals.css
   - subject gradients in `course-card.tsx` and the catalog pages
   - voxel palettes (`lib/avatar/voxels.ts`, `lib/room/voxels.ts`)
   - `text-white` on `bg-primary` / `bg-danger` / gradient covers

3. **Slices** (one PR each, in this order — highest traffic first).
   Remaining counts measured 2026-08-03 after slice 1:
   `(auth)` 14 · `(dashboard)` 89 · `(admin)` 387 · `components/exercises` 126.
   1. ~~shared components: `components/ui/*`, `components/layout/*`,
      `components/lesson/*`~~ — **DONE** (28 substitutions; `components/lesson`
      had none). Verified in the browser: inputs/buttons/cards flip with
      `.dark`, while page shells (e.g. the login panel) stay light — that is
      slice 1a/2 below, not a regression.
   1a. **auth pages** (`app/(auth)/*`, 14 hits) — small and high-visibility:
      the login panel currently renders near-white heading on cream in dark.
   2. student surface: `(dashboard)/dashboard`, `courses`, `lesson/*`,
      `assignments`, `achievements`
   3. teacher surface: `(admin)/admin/*` except journal/gradebook
   4. data screens: journal, gradebook (coordinate with plan 011)
   5. exercises: `components/exercises/v2/*` (44 widgets — many use inline
      `style={{ background: "var(--paper-2)" }}`; those need the same
      substitution at the CSS-variable level: `var(--color-surface)` etc.)

4. After slice 5: flip the default in `layout.tsx` and `theme-toggle.tsx`
   from `light` to `system`, and delete the explanatory comments.

## Repo conventions to follow

- Tailwind utility names map 1:1 to the `@theme inline` block in
  `globals.css` — `bg-surface` exists because `--color-surface` is exported
  there. Check the block before inventing a utility name.
- Exemplar of correct semantic usage:
  `frontend/src/components/live/lesson-review.tsx` (post-2026-08-02).
- Inline `style={{ ... "var(--paper-2)" }}` in V2 widgets → swap the CSS var,
  not the class.

## Verification (per slice)

- **Mechanical**: `npx tsc --noEmit && npm run build`; then
  `rg -n "bg-paper|text-ink-700|bg-ink-50|border-ink-100" <slice paths>` →
  only intentional hits remain.
- **Feel check**: with `localStorage["lms.theme"]="dark"` walk the slice's
  pages — every card, input, table and chip must be dark; no white boxes,
  no near-black text on dark surfaces; scrims still dark; code blocks still
  dark-on-light-text; the sidebar rail unchanged.
- Contrast spot-check: body text on `--color-bg` ≥ 4.5:1 in BOTH themes.
- **Done when**: the slice shows no light-mode leftovers in dark, and the
  light theme is pixel-identical to before (the substitutions are
  value-identical in light).


---

## Slice 7 (2026-08-03) — the surfaces the first six slices never covered

The owner photographed the public landing rendering white in dark mode. Root
cause: `app/page.tsx` was skipped by every earlier slice because it carries
uncommitted work, and flipping the default to `system` made that the front
page for every dark-OS visitor. Sweeping the rest of the app afterwards found
the same class elsewhere:

| surface | hits | note |
|---|---|---|
| legal pages (privacy, terms, refund, cookies, acceptable-use, copyright) | 98 | every `h2`/`h3` was `text-ink-700` — 1.29:1 on the dark background, i.e. invisible |
| SAT components (runner, results, desmos, review) | 41 | retired from the student surface but still in the repo |
| admin/game/misc icon buttons, demo, offline, quiz-taker, badge-card | 26 | `text-ink-300`, `bg-paper-2`, `bg-white` on token surfaces |
| room editor toolbar + HUD hint pill | 3 | see below |

**Intentional, left raw and now commented in place** — a future sweep must not
"fix" these:
- `(print)/*` — printing is light by definition;
- the room HUD (`bg-white/90` glass over the 3D scene) and its buttons, which
  must keep raw ink text; the hint pill next to it was the opposite bug — it
  used semantic `text-text` on that same always-light glass, so it would have
  turned near-white on white;
- the QR code's white backing in `direct-crypto.tsx` — scanners need the quiet
  zone in both themes;
- translucent `bg-white/15…/[0.12]` on dark gradients and the sidebar rail;
- `text-ink-900` on sun surfaces (the no-white-on-yellow rule);
- item/avatar preview stages (`bg-white`) and the code block
  (`bg-ink-900 text-ink-100`).

Verified in the browser, per page rather than by grep: `/terms` went from 21
sub-4.5:1 texts to 0, `/privacy` and `/demo` show 0 low-contrast text and 0
white surfaces in dark. Light mode is unchanged except that legal headings are
now `#0d150d` instead of `#232b22`.

**Known, NOT fixed here** (needs a design decision, not a sweep): the primary
button in dark is `text-white` on `#35d07f` — 2.0:1. Same failure mode as
white-on-sun, but changing it repaints every primary button in dark mode.

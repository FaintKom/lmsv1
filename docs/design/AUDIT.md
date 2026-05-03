# Design System Audit — GrassLMS

State as of 2026-05-03 after token migration.

## Auto-migrated (no code changes needed)

The Tailwind 4 `@theme inline` bridge in `frontend/src/app/globals.css`
re-points default `green-*` color utilities to the GrassLMS palette.
Every existing class becomes brand-correct on next build:

- 679 occurrences of `bg-green-X` / `text-green-X` / `border-green-X`
  across components and routes
- `themeColor` meta in `layout.tsx`: `#22c55e` → `#3fb04b`
- Body font: Inter → Manrope (CSS variable name preserved)
- Lesson content callouts (`.lms-callout--*`, `.lms-example`,
  `.lms-pitfall-*`) re-mapped to `--green-*` / `--sun-*` / `--coral-*`
- `*:focus-visible` outline: indigo → `--green-600`
- Selection color: `#bbf7d0` → `--green-100`

## Off-palette (needs manual migration)

518 references to non-DS colors across 40+ files.

| Tailwind family | Suggested DS mapping                                     |
|-----------------|----------------------------------------------------------|
| indigo / purple | → `green-700` (callouts) or `sun-500` (highlights)       |
| blue            | keep for "info" callouts only                            |
| amber / orange  | → `sun-400` / `sun-500`                                  |
| red / rose      | → `coral-500` / `coral-700`                              |
| emerald / teal  | → `green-500` / `green-600`                              |
| slate / gray / zinc / neutral / stone | → `ink-{50..900}` scale            |

Top files to migrate first (highest off-palette density):
- `components/sat/sat-test-runner.tsx`
- `components/sat/sat-review-screen.tsx`
- `components/sat/sat-results.tsx`
- `components/onboarding/teacher-onboarding.tsx`
- `components/onboarding/newcomer-checklist.tsx`
- `components/math/problem-generator.tsx`
- `components/exercises/*.tsx`
- `components/game/math/templates/*.tsx` (~12 files)

## Page-level alignment vs mockups

| Mockup                  | Current LMS page                                  | Gap                                                                                              |
|-------------------------|---------------------------------------------------|--------------------------------------------------------------------------------------------------|
| student-dashboard.html  | `app/(dashboard)/dashboard/page.tsx`              | Hero gradient card + grand greeting missing. No `.gl-highlight` on h1. Streak widget present.    |
| course-catalog.html     | `app/(dashboard)/courses/page.tsx`                | Verify search-bar layout, tag chips, hero highlight.                                             |
| course-builder.html     | `app/(admin)/admin/...` (course CRUD)             | Builder UI is functional; needs DS pass on toolbar, segmented controls, sun-accent CTAs.         |
| lesson-player.html      | `app/(dashboard)/courses/[id]/lessons/[lid]/...`  | TipTap rendering uses `.lms-lesson-content` (now DS-aligned). Player chrome may still need pass. |
| admin-panel.html        | `app/(admin)/admin/page.tsx`                      | Stat cards / KPI tiles need DS shadows + ink scale.                                              |
| tasks-audit.html        | `app/(admin)/admin/...` (assignments / submissions) | Table chrome, filter chips need DS pass.                                                        |
| moodboard.html          | (no equivalent)                                   | Decorative reference only.                                                                       |
| roadmap.html            | `ROADMAP.md`                                      | Mockup is 2KB stub; ROADMAP.md is the live source.                                               |

## Primitives not yet adopted

Defined in `globals.css` but no current usage:

- `.gl-highlight` — 0 usages → add to dashboard h1 greeting word, course
  catalog title, marketing hero
- `.gl-btn-pop` — 0 usages → use for primary CTA on landing, signup,
  course-enroll, lesson-complete
- `--shadow-pop` token — 0 usages → use on hero cards, KPI tiles

## Components requiring rework

- `components/ui/button.tsx` — currently uses `shadow-md shadow-green-200`.
  Mockup spec: `box-shadow: 0 4px 0 0 var(--green-700)` (cartoon press).
  Either swap default variant to `.gl-btn-pop` style, or keep current as
  `secondary` and add new `pop` variant.
- `components/layout/sidebar.tsx` — currently dark with green-600 active.
  Matches mockup rail closely; verify visually.
- `components/landing/landing-header.tsx` — landing hero CTA should adopt
  `.gl-btn-pop`.

## Suggested next sprints

1. **DS-1: Apply primitives.** Add `.gl-highlight` to top-level page
   headlines and `.gl-btn-pop` to primary CTAs across landing, dashboard,
   course catalog.
2. **DS-2: Migrate off-palette colors.** Sweep slate/gray → ink, amber →
   sun, red → coral. Prioritise SAT components (3 files) and onboarding
   (2 files) as they are user-facing.
3. **DS-3: Page-by-page hero rework.** Dashboard greeting card,
   course-catalog header, admin KPI tiles, against the mockups.
4. **DS-4: Button variants.** Add `pop` and `pop-coral` variants to
   `components/ui/button.tsx`.

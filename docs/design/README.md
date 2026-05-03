# GrassLMS Design System

Source-of-truth files for the GrassLMS visual language ("Lively").

## Files

- `design-system.html` — full DS spec (tokens, colors, typography, components,
  primitives). Open in browser to view.
- `mockups/` — page-level reference designs:
  - `student-dashboard.html`
  - `course-catalog.html`
  - `course-builder.html`
  - `lesson-player.html`
  - `admin-panel.html`
  - `tasks-audit.html`
  - `moodboard.html`
  - `roadmap.html`
- `AUDIT.md` — current LMS vs DS gap analysis.

## Tokens

All tokens live in `frontend/src/app/globals.css` under `:root` and are
exposed to Tailwind 4 via `@theme inline`. Existing utility classes
(`bg-green-600`, `text-green-700`, etc.) automatically use the GrassLMS
palette — no class rewrites required.

New token families available as Tailwind utilities:
- `bg-sun-{50,100,300,400,500,700}` — yellow accent
- `bg-coral-{50,300,500,700}` — streak / danger accent
- `bg-ink-{50,100,200,300,400,500,700,900}` — warm neutrals
- `bg-paper`, `bg-paper-2` — canvas / card surfaces

## Primitives (added in globals.css, not auto-applied)

- `.gl-highlight` — sun-300 highlight on a word inside `<h1>` (rotated -1deg).
  Used in mockup hero headlines.
- `.gl-btn-pop` — cartoon "press" CTA (4px bottom shadow, compresses on
  click). Variant: `.gl-btn-pop.coral`.
- `--shadow-pop` / `--shadow-pop-coral` — signature shadow tokens.

## Fonts

- **Sans:** Manrope (400/500/600/700/800)
- **Mono:** Geist Mono (400/500)

Loaded via `next/font/google` in `frontend/src/app/layout.tsx`. CSS variable
names `--font-geist-sans` / `--font-geist-mono` preserved for backward
compatibility — do not rename.

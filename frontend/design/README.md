# LMS 2.0 — Design Export

Package handed off from the design project (`LMS Assignments Redesign.html`) to the
production frontend (`F:\lms\frontend\`). Drop the **whole folder** into
`frontend/design/` and treat it as the single source of truth for visuals.

## Files

| File | Role | Edited by |
|---|---|---|
| `tokens.json` | Flat token export (colors, radii, shadows, typography, spacing). Source of truth. | Designer (this project) |
| `tokens.css` | Generated CSS layer — drop into `frontend/src/app/globals.css` (replaces hand-written `:root` + `.dark` blocks). Maps tokens into Tailwind 4 via `@theme inline`. | Designer (regenerated from `tokens.json`) |
| `DESIGN_SPEC.md` | Component-by-component spec: structure, variants, states (hover/focus/disabled/loading/error), tokens used. | Designer |
| `migration-map.md` | Concrete `find → replace` table for stripping hardcoded Tailwind colors and hex values out of `frontend/src/`. References real files and line numbers. | Designer (curated), Claude Code (executes) |
| Page specs | Layouts for all pages (dashboard, catalog, lesson, builder, admin, profile, exercises) — included as section "Page specs" inside `DESIGN_SPEC.md`. | Designer |
| `mocks/` | Reference HTML mocks (Student Dashboard, Course Catalog, Lesson Player, Course Builder, Admin Panel, Design System). Open in browser as visual reference. | Designer |

## Round-trip

```
designer edits LMS Assignments Redesign.html
        │
        ▼
designer regenerates tokens.json + tokens.css + spec
        │
        ▼  (PR / paste into frontend/design/)
        ▼
Claude Code:
  1. drops tokens.css into globals.css
  2. updates components per migration-map + DESIGN_SPEC
  3. removes hardcoded hex / Tailwind palette colors
```

**Never** edit `tokens.css` by hand on the frontend side — it gets overwritten next sync.
**Never** introduce raw colors (`bg-green-600`, `dark:bg-[#1E1E1E]`, `#22c55e`) in components — only token-bound utilities (`bg-primary`, `bg-surface-1`, `border-border`).

## Theme contract

- **Selector:** `.dark` class on `<html>`. Light is the default (no class).
- **Persistence:** `localStorage["lms.theme"] = "light" | "dark" | "system"`.
- **No-FOUC:** an inline `<script>` in `<head>` of root layout reads the stored value
  and toggles `<html>.classList` **before** React hydrates. Spec in `DESIGN_SPEC.md → Theme`.
- All tokens flip via the `.dark` block in `tokens.css`. No component should branch
  on theme directly — the token does.

## What's ported vs invented

The hand-off includes pages that **don't yet exist** in the frontend repo
(dashboard, lesson view, profile, navigation chrome). These are designed from scratch
in `pages-spec.md` based on the conventions of the assignments redesign. They are
proposals, not ports — review and push back where they don't match product intent.

Pages that **do** exist in the repo (assignments list, assignment detail, admin
assignments CRUD, exercises) are specified to match the existing component contracts
so migration is mechanical: change classes, don't restructure.

## Versioning

- Bump `tokens.json → meta.version` (semver) on every change.
- Breaking token rename → major. Adding a new token → minor. Color tweak → patch.
- `tokens.css` carries the version in its top comment.

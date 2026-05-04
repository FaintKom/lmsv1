# Migration Map — Hardcoded → Tokens

> Drop-in find/replace table for the frontend codebase.
> Apply in this order: (1) globals.css, (2) component-by-component using `migration-map`'s "byFile" sections, (3) acceptance checklist (§13 of `DESIGN_SPEC.md`).

---

## Phase 0 — globals.css

**Action:** Open `frontend/src/app/globals.css`. Replace the entire `@theme` block AND any hand-written `:root` / `.dark` variable blocks with the contents of `design-export/tokens.css`.

After this, **delete the `.dark` block** if one exists. v1 is light-only; carrying `.dark` overrides will produce ghost styles that fight tokens.

---

## Phase 1 — Global find/replace (whole codebase)

Run these as global, case-sensitive replaces in `frontend/src/`. The right side is what they should become.

### Backgrounds

| Find | Replace with | Note |
|---|---|---|
| `bg-white` | `bg-paper-2` | only in components; root html/body should be unstyled (use bg-bg in body via globals) |
| `bg-black` | `bg-ink-900` | |
| `bg-gray-50` | `bg-surface-2` | |
| `bg-gray-100` | `bg-ink-100` | borders/dividers prefer `border-border` instead |
| `bg-gray-200` | `bg-ink-200` | |
| `bg-gray-900` / `bg-zinc-900` / `bg-slate-900` | `bg-ink-900` | |
| `bg-green-500` | `bg-primary` | unless you're rendering the design-system swatch grid |
| `bg-green-600` | `bg-primary` | |
| `bg-emerald-*` | `bg-primary` (or `bg-green-{N}` if a specific tint is intended) | normalize to brand green |
| `bg-blue-*` | `bg-info` (semantic) or **remove** — info should be rare | |
| `bg-indigo-*`, `bg-violet-*`, `bg-purple-*` | **remove** — not in palette | this includes `text-indigo-900` on green plates → just drop the override |
| `bg-red-*`, `bg-rose-*` | `bg-danger` or `bg-danger-soft` | |
| `bg-amber-*`, `bg-yellow-*` | `bg-warning` or `bg-sun-{50,100,300,400}` | sun-300 is the marker tone |
| `bg-orange-*` | `bg-coral-{50,300,500}` or `bg-warning` | |

### Text

| Find | Replace with |
|---|---|
| `text-black`, `text-gray-900`, `text-zinc-900`, `text-slate-900` | `text-text` |
| `text-gray-700`, `text-zinc-700` | `text-ink-700` |
| `text-gray-500`, `text-zinc-500` | `text-text-muted` |
| `text-gray-400`, `text-zinc-400` | `text-text-subtle` |
| `text-gray-300` | `text-ink-300` |
| `text-white` | `text-text-inverse` (or keep `text-white` on color plates) |
| `text-green-{600,700,800}` | `text-success-fg` (semantic) or `text-green-{N}` (brand-specific) |
| `text-red-*`, `text-rose-*` | `text-danger-fg` |
| `text-amber-*`, `text-yellow-*` | `text-warning-fg` |
| `text-blue-*` | `text-info-fg` (sparingly) |
| `text-indigo-*`, `text-violet-*`, `text-purple-*` | **remove** — pick `text-text` or `text-success-fg` based on context |

### Borders

| Find | Replace with |
|---|---|
| `border-gray-100`, `border-zinc-100` | `border-border` |
| `border-gray-200`, `border-zinc-200` | `border-border-strong` |
| `border-gray-300` | `border-ink-300` |
| `border-green-{500,600}` | `border-primary` |
| `border-red-*` | `border-danger` |

### Radii

| Find | Replace with |
|---|---|
| `rounded-md` | `rounded-md` (no change — Tailwind 4 uses our token) |
| `rounded-xl` | `rounded-lg` (our `lg` = 18px ≈ Tailwind xl) |
| `rounded-2xl`, `rounded-3xl` | `rounded-xl` (= 24px) |
| `rounded-full` | `rounded-pill` |

### Shadows

| Find | Replace with |
|---|---|
| `shadow`, `shadow-sm` | `shadow-sm` |
| `shadow-md` | `shadow-md` |
| `shadow-lg`, `shadow-xl`, `shadow-2xl` | `shadow-lg` |
| Buttons with any `shadow-*` | replace with `shadow-pop` (primary) / `shadow-pop-coral` (danger) |

### Theme

| Find | Replace with |
|---|---|
| any `dark:bg-...`, `dark:text-...`, `dark:border-...` | **delete the variant** — light only |
| `dark:bg-[#1E1E1E]`, `dark:bg-[#0F1A14]`, `dark:bg-[#101410]` | delete |
| `<html className="dark">` or `useTheme()` | delete; remove next-themes / theme switcher entirely |

### Arbitrary hex values

Run `grep -nE "#[0-9a-fA-F]{3,8}" src/` after the above. Any remaining hits should be:
- a token (`var(--green-600)`) or
- a Tailwind utility from our scale, or
- explicitly justified in a `// design-allow:` comment.

---

## Phase 2 — Per-file migration

Files are sorted by impact. Each entry has:
- **What's wrong** — the recurring issue.
- **Replace** — concrete substitutions.
- **Restructure** — anywhere classes alone aren't enough.

### `frontend/src/app/globals.css`

- **Replace** the file body (after `@import "tailwindcss";`) with `design-export/tokens.css` contents starting at the `:root {` block. Keep your `@import` lines for Tailwind v4 if any.
- **Delete** any `.dark { ... }` block.
- **Delete** any custom `--background`, `--foreground`, `--primary` definitions outside our scheme — we own those.

### `frontend/src/app/(dashboard)/layout.tsx` & `(admin)/layout.tsx` & root `layout.tsx`

- **Replace** any `<ThemeProvider>` / `next-themes` import with nothing. Delete.
- **Restructure:** ensure `<body>` does NOT have `bg-white` or hardcoded color classes — globals owns body bg.
- Confirm `<html lang="ru">` (or your locale) and **no** `className="dark"` on it.

### `frontend/src/components/exercises/exercise-renderer.tsx`

- **What's wrong:** `isDark` branching, line 706.
- **Replace:** delete `isDark` and all dark-conditional class strings. Keep the light-mode classes only.
- **Restructure:** any class like `cn(isDark ? "bg-[#1E1E1E]" : "bg-white")` becomes `bg-paper-2`. `cn(isDark ? "text-white" : "text-black")` becomes `text-text`.

### `frontend/src/components/assessments/quiz-taker.tsx`

- **What's wrong (line ~177):** `text-indigo-900` on a green-tinted plate.
- **Replace:** that whole class chain → `bg-primary-soft text-success-fg`. Drop indigo entirely.
- **Replace** any `bg-green-100/text-green-900` → `bg-primary-soft text-success-fg`.
- **Replace** all "correct/incorrect" answer states:
  - correct: `border-green-500 bg-green-50` → `border-primary bg-success-soft`
  - incorrect: `border-red-500 bg-red-50` → `border-danger bg-danger-soft`

### `frontend/src/components/exercises/conjugation-exercise.tsx`, `dialogue-exercise.tsx`, `reading-exercise.tsx`, `sentence-builder-exercise.tsx`, `translation-exercise.tsx`

- Each has its own surface color (5 different `#hex` for "card"). **Standardize:** outer card `bg-paper-2 border border-border rounded-lg`. Inner choice tiles `bg-surface-2`.
- Per-subject hue accents: replace ad-hoc colors with the per-exercise hue map (`hue-quiz` etc. — ALREADY in tokens; expose via inline `style={{ "--accent": "var(--coral-500)" }}` if needed, but Tailwind utilities `border-coral-500`, `bg-sun-100` are preferred).

### `frontend/src/components/code-editor/editor-layout.tsx`

- Editor surface: `bg-ink-900 text-paper`. Line numbers `text-ink-400`. Active line `bg-ink-700`.
- Toolbar above editor: `bg-paper-2 border-b border-border`.

### `frontend/src/components/game/math/math-exercise.tsx` & `templates/*`

- **What's wrong:** SVG `fill="..."` hardcoded hex.
- **Replace:** `fill="currentColor"` and set color via parent class `text-primary` / `text-coral-500` / `text-sun-500`.
- For multi-color illustrations, expose CSS variables on the SVG root (`style={{ "--c1": "var(--green-500)", "--c2": "var(--sun-400)" }}`) and use `fill="var(--c1)"`.

### `frontend/src/app/(dashboard)/assignments/page.tsx`

- Use the catalog/dashboard list patterns from `DESIGN_SPEC.md` §P2 / §P1.
- Search bar = §2.6. Filter chips = §3.

### `frontend/src/app/(admin)/admin/style-preview/page.tsx`

- Replace whatever's there with a render of the design-system swatches from `Design System.html` (§01 colors, §02 type, §03 spacing/radii/elevation, §04+ components). This becomes the **internal design-system reference page** for the team.

### `frontend/src/app/(admin)/admin/assignments/*`

- Use the admin patterns from `DESIGN_SPEC.md` §P5: KPI strip, table (§8), row hover actions.
- Replace any modal-as-dialog with §9 modal.

---

## Phase 3 — verify

```bash
# 1. No raw greens/blues/etc. in components
grep -rEn "(bg|text|border)-(green|blue|emerald|indigo|violet|purple|red|rose|amber|yellow|orange|sky|teal|cyan)-(50|100|200|300|400|500|600|700|800|900)" \
  frontend/src/components frontend/src/app

# Allowed: bg-green-{N} ONLY in style-preview/page.tsx (the design-system showcase).

# 2. No arbitrary hex
grep -rEn "#[0-9a-fA-F]{3,8}" frontend/src/components frontend/src/app

# Allowed: SVG fills you've explicitly chosen NOT to tokenize (illustrations); justify in comment.

# 3. No dark variants
grep -rn "dark:" frontend/src/

# Should be 0 hits.

# 4. No legacy theme provider
grep -rn "next-themes\|useTheme\|ThemeProvider" frontend/src/

# Should be 0 hits.
```

If all four return clean (modulo the explicit allowlist), Phase 3 is done — open the app, screenshot every page in `pages-spec`, compare to mocks in `uploads/`.

---

## Phase 4 — re-introduce intentional variety

After everything is tokenized, layer back the brand moves that the migration stripped:

- **Sun marker** on dashboard / catalog hero headings (§0.3 #2).
- **Shadow-pop** on every primary button (§1.1).
- **Per-subject hue** on course cards (§4.1).
- **Streak pill + XP token** in the right places (§3.1).
- **Empty / loading / error** states for every async surface (§11).

These are not migrations — they're the personality. Don't ship without them.

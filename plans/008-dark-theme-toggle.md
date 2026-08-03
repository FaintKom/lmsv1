# 008 — Ship the dark theme: no-FOUC script + Light/Dark/System toggle

- **Status**: DONE (2026-08-03) — toggle + no-FOUC script shipped; default flipped to `system` in PR #238 once plan 018 landed.
- **Commit**: a01d106
- **Severity**: MEDIUM
- **Category**: design-system v2 (theme contract)
- **Estimated scope**: 4 files + 6 locale files, ~150 lines

## Problem

The `.dark` token block already ships in `frontend/src/app/globals.css`
(section "DARK THEME") and flips every semantic alias, but nothing ever adds
the `.dark` class to `<html>`. The theme contract in
`frontend/design/README.md` requires:

- Selector: `.dark` on `<html>`; light is the default.
- Persistence: `localStorage["lms.theme"] = "light" | "dark" | "system"`.
- A no-FOUC inline script in the root layout `<head>`.
- A Light / Dark / System toggle in `/profile` and `/admin/settings`.

Current root layout (`frontend/src/app/layout.tsx:49-50`):

```tsx
 <html lang="en">
 <head>
```

## Target

1. Inline no-FOUC script as the FIRST child of `<head>` in
   `frontend/src/app/layout.tsx` (code from `frontend/design/migration-map.md`
   §0):

```tsx
 <html lang="en" suppressHydrationWarning>
 <head>
 <script
   dangerouslySetInnerHTML={{
     __html: `(function () {
  var t = localStorage.getItem('lms.theme') || 'system';
  var dark = t === 'dark' || (t === 'system' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
})();`,
   }}
 />
```

`suppressHydrationWarning` on `<html>` is required — the class is set before
React hydrates.

2. New client component `frontend/src/components/ui/theme-toggle.tsx`:
   - Three-segment control (Light / Dark / System), Lucide icons `Sun`,
     `Moon`, `Monitor`, 16px.
   - Reads initial value from `localStorage["lms.theme"]` (default
     `"system"`); guard all `localStorage`/`matchMedia` access behind
     `typeof window !== "undefined"`.
   - On select: write localStorage, then recompute and toggle the class with
     the same expression as the no-FOUC script.
   - When value is `"system"`, subscribe to
     `window.matchMedia('(prefers-color-scheme: dark)')` `change` events in a
     `useEffect` (cleanup on unmount) and re-toggle the class.
   - Styling: segmented pill, container `rounded-pill border border-border
     bg-surface-2 p-1`, each segment `rounded-pill px-3 py-1.5 text-sm
     font-semibold transition-colors`, active segment `bg-surface text-text
     shadow-xs`, inactive `text-text-muted hover:text-text`. All three
     segments ≥44px touch height including padding.
   - i18n: `useTranslation()`; keys below.

3. Mount the toggle:
   - `frontend/src/app/(dashboard)/profile/page.tsx` — new settings row/card
     titled with `profile.theme`, following the visual pattern of the
     existing cards on that page (read the page first; place after the
     locale/password section, same card chrome).
   - `frontend/src/app/(admin)/admin/settings/page.tsx` — same component,
     same pattern as that page's existing setting rows.

4. i18n keys — add to ALL SIX locale files
   `frontend/src/lib/i18n/locales/{en,es,ru,tr,de,uk}.ts` (CI parity test
   fails on any miss). Insert each key near other `profile.` keys:

| key | en | ru |
|---|---|---|
| `profile.theme` | Theme | Тема |
| `profile.themeLight` | Light | Светлая |
| `profile.themeDark` | Dark | Тёмная |
| `profile.themeSystem` | System | Системная |

   es: Tema / Clara / Oscura / Sistema · tr: Tema / Açık / Koyu / Sistem ·
   de: Design / Hell / Dunkel / System · uk: Тема / Світла / Темна / Системна.

## Repo conventions to follow

- Client components start with `"use client"`; icons from `lucide-react`.
- Translations via `useTranslation()` from `@/lib/i18n/context` — no
  hardcoded UI strings (CI ratchet on new .tsx files).
- Semantic color utilities only (`bg-surface`, `text-text-muted`) — never raw
  scale (`bg-ink-50`) and never hex.
- Exemplar for a small stateful UI control: `frontend/src/components/ui/chip.tsx`.

## Steps

1. Edit `frontend/src/app/layout.tsx`: add `suppressHydrationWarning` to
   `<html>`, insert the script tag as the first element inside `<head>`.
2. Create `frontend/src/components/ui/theme-toggle.tsx` per Target 2.
3. Add the 4 keys ×6 locales (Target 4).
4. Mount in `/profile` page (Target 3a).
5. Mount in `/admin/settings` page (Target 3b).
6. Run verification.

## Boundaries

- Do NOT touch the `.dark` token values in `globals.css` — they are correct
  and generated from the design export.
- Do NOT branch any component on theme (`isDark ? … : …`) — tokens flip,
  components don't.
- Do NOT add a dependency (no `next-themes`).
- Do NOT edit `frontend/design/tokens.css` (generated file).
- If `layout.tsx` no longer matches the excerpt (drift), STOP and report.

## Verification

- **Mechanical**: `cd frontend && npx tsc --noEmit && npm test` — both clean
  (translation parity test included in `npm test`).
- **Feel check** (dev server `npm run dev`):
  - Pick Dark in /profile → whole app flips instantly, no reload; reload the
    page → no flash of light theme before dark applies.
  - Pick System + OS in dark mode → dark; flip OS theme → app follows
    without reload.
  - Cards in dark mode have NO `shadow-xs/sm` (they are `none` in `.dark` by
    design — elevation via surface steps).
  - Text contrast on `--color-bg` vs `--color-text` remains readable on
    dashboard, course page, admin journal.
- **Done when**: toggle present in both pages, choice survives reload, no
  FOUC, CI green.

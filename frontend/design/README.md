# GrassLMS — Design export · Lively v2

Package for `frontend/design/`. Single source of truth for visuals.

## Files

| File | Role | Edited by |
|---|---|---|
| `tokens.json` | Flat token export — colours (light + dark), radii, spacing, sizes, type, shadows, motion. Source of truth. | Designer |
| `tokens.css` | Generated CSS layer — drop into `frontend/src/app/globals.css`. Maps tokens into Tailwind 4 via `@theme inline`. Includes the `.dark` block. | Designer (regenerated from `tokens.json`) |
| `migration-map.md` | Concrete find → replace table for `frontend/src/`, plus rules that need human judgement and a per-archetype checklist. | Designer (curated), Claude Code (executes) |
| `DESIGN_SPEC.md` | Component-by-component spec: structure, variants, states, tokens used. | Designer |
| `MOTION.md` | Animation contract — frequency rules, easing/duration budgets, physicality, interruptibility, perf, a11y, utility classes. | Claude Code (curated from Emil Kowalski's philosophy) |
| `../GrassLMS Design System v2.dc.html` | Live visual reference — open in a browser. Every token, state and component rendered. | Designer |

## What changed in v2

Brand pair `green-600 #0a8754` + `sun-400 #ffd84d` is unchanged. Everything else was retuned:

- `coral-*` → **`clay-*`** — `#ff7a5c` was a pastel pink-orange next to a fully saturated sun; `#e2552f` matches sun's saturation and stays in the orange family.
- `info #2b91ff` → **`lagoon-600 #12798f`** — the only cool, generic colour in a warm palette; teal-blue sits next to the brand green on the wheel.
- **Ink ramp rebuilt** on one warm green undertone — v1 mixed a green-black `#0a1a10` with neutral greys `#9aa39d`, which read dirty on warm paper and made borders look blue.
- **green-400/500 re-hued** (`#6bc44d`/`#3fb04b` → `#34a06a`/`#17915e`) — they were yellow-green and broke the ramp between 300 and 600.
- **Dark theme implemented.** v1's README declared the `.dark` + `localStorage["lms.theme"]` contract but `tokens.css` said "Light only". The `.dark` block now ships; elevation there comes from surface steps, not shadows.
- New tokens: control heights, row heights, layout widths (`--rail`, `--reading`, `--inspector`), `--motion-instant`, `--motion-stagger`, `--ring-focus`, `.eyebrow` and `.skeleton` utilities.

## Theme contract

- **Selector:** `.dark` on `<html>`. Light is the default.
- **Persistence:** `localStorage["lms.theme"] = "light" | "dark" | "system"`.
- **No-FOUC:** inline script in the root layout `<head>` (snippet in `migration-map.md` §0).
- All tokens flip via `.dark`. No component branches on theme — the token does.

## Round-trip

```
designer edits the design system doc
        │
        ▼
regenerate tokens.json → tokens.css → spec
        │
        ▼  (PR into frontend/design/)
        ▼
Claude Code:
  1. drops tokens.css into globals.css
  2. runs migration-map §1–§3 (mechanical)
  3. reviews §4 by hand, walks the §5 checklist per archetype
```

**Never** hand-edit `tokens.css` in the app repo — it is overwritten on the next sync.
**Never** put a raw colour (`bg-green-600`, `#22c55e`, `dark:bg-[#1e1e1e]`) in a component —
semantic utilities only (`bg-primary`, `text-muted`, `border-border`).

## Ratchet

`src/lib/design/design-system.test.ts` counts, per file, the places that bypass
this system: raw hex, raw Tailwind palette classes, gradients, mono uppercase
labels, `btn-pop`, backdrop blur, `transition-all`, hand-typed durations and
curves, animated layout properties, `scale(0)` and View Transitions outside the
allowed files. The full list and the reasons are in
`specs/071-design-system-v2/contracts/`.

The counts live in `design-baseline.json` and only go down:

- a file may not gain a violation, and a new file must have none;
- when a count drops, the test fails until the baseline is rewritten, so a
  clean-up cannot be undone by accident.

After cleaning something up:

```bash
cd frontend
UPDATE_DESIGN_BASELINE=1 npx vitest run src/lib/design
```

Review the baseline diff before committing it: every line should go down.
Colour that encodes data or scene content (charts, the voxel room and avatar,
game scenes, print forms, the logo) is exempt, and each exemption in the test
states why.

## Versioning

- `tokens.json → meta.version` is semver: token rename → major, new token → minor, value tweak → patch.
- Current: **2.0.0** (major — `coral` and `info` were renamed).

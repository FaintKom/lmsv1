# Migration map — Lively v1 → v2

Concrete `find → replace` for `frontend/src/`. Run top to bottom; each block is
independently safe. After every block: `npm run lint && npm run build`.

Ordered by risk: token renames first (mechanical), then hardcoded values, then
behaviour rules that need eyes.

---

## 0 · Drop in the new tokens

1. Copy `design/tokens.css` over the `:root` + `@theme inline` block in
   `frontend/src/app/globals.css`. Restore the `@import "tailwindcss";` line at the top.
2. Copy `design/tokens.json` to `frontend/design/tokens.json` (source of truth, version 2.0.0).
3. Add the no-FOUC theme script to the root layout `<head>` — the `.dark` contract from
   `frontend/design/README.md` is now actually implemented:

```html
<script>
  (function () {
    var t = localStorage.getItem('lms.theme') || 'system';
    var dark = t === 'dark' || (t === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
  })();
</script>
```

4. Add a Light / Dark / System toggle in `/profile` and `/admin/settings`, persisting to
   `localStorage["lms.theme"]`.

---

## 1 · Token renames (mechanical, whole repo)

`coral` no longer exists. `info` is no longer blue.

| find | replace |
|---|---|
| `coral-50` | `clay-50` |
| `coral-300` | `clay-300` |
| `coral-500` | `clay-500` |
| `coral-700` | `clay-700` |
| `--coral-` | `--clay-` |
| `bg-coral-` | `bg-clay-` |
| `text-coral-` | `text-clay-` |
| `border-coral-` | `border-clay-` |
| `shadow-pop-coral` | `shadow-pop-clay` |
| `--info` | `--lagoon-600` |
| `--color-info-soft: #e6f2ff` | `--color-info-soft: var(--lagoon-50)` |

`coral-100` and `clay-600` are new steps — no v1 equivalent, use where a mid tone is needed.

## 2 · Re-hued values (search by hex, whole repo)

| old hex | new | note |
|---|---|---|
| `#6bc44d` | `var(--green-400)` `#34a06a` | was yellow-green, broke the ramp |
| `#3fb04b` | `var(--green-500)` `#17915e` | same |
| `#ff7a5c` | `var(--clay-500)` `#e2552f` | pastel pink-orange → clay |
| `#c33d22` | `var(--clay-700)` `#9e300f` | |
| `#ffae9a` | `var(--clay-300)` `#f6b394` | |
| `#fff0eb` | `var(--clay-50)` `#fdefe7` | |
| `#2b91ff` | `var(--lagoon-600)` `#12798f` | system blue → teal-blue |
| `#e6f2ff` | `var(--lagoon-50)` `#e4f1f4` | |
| `#0a3a7a` | `var(--lagoon-800)` `#0a4652` | |
| `#fafbf6` | `var(--paper)` `#fbfcf7` | |
| `#f4f5f1` | `var(--ink-50)` `#f3f5ef` | |
| `#e6e8e4` | `var(--ink-100)` `#e3e8dd` | |
| `#c9cec9` | `var(--ink-200)` `#c4cdbe` | |
| `#9aa39d` | `var(--ink-300)` `#93a08d` | |
| `#6b7a70` | `var(--ink-400)` `#6a7568` | |
| `#4d5a51` | `var(--ink-500)` `#485444` | |
| `#1a2a1f` | `var(--ink-700)` `#232b22` | |
| `#0a1a10` | `var(--ink-900)` `#0d150d` | |

## 3 · Known hardcoded spots

| file | find | replace |
|---|---|---|
| `app/(dashboard)/dashboard/page.tsx` | `🔥` in the streak tile | Lucide `<Flame className="h-5 w-5" />`, white on `bg-danger` |
| `app/(dashboard)/dashboard/page.tsx` | `linear-gradient(135deg, var(--green-600) 0%, var(--green-700) 100%)` | flat `bg-primary` — the gradient dirties the sun marker |
| `app/(dashboard)/dashboard/page.tsx` | the two decorative `radial-gradient` blobs in the hero | delete |
| `app/(dashboard)/dashboard/page.tsx` | `rounded-[24px]`, `rounded-[18px]`, `rounded-[14px]`, `rounded-[10px]` | `rounded-xl` / `rounded-lg` / `rounded-md` / `rounded-sm` |
| `app/(dashboard)/dashboard/page.tsx` | KPI strip: 4 tiles with icon chips, `Streak` duplicated from the hero card | 4 text-only KPIs; replace the duplicate with average grade |
| `app/(dashboard)/dashboard/page.tsx` | `text-[28px]`, `text-[36px]`, `text-[64px]` | `text-xl` / `text-2xl` / `text-4xl` |
| `components/courses/course-card.tsx` | subject gradients | code → `green-600→900`, math → `green-400→800`, lang → `clay`, SAT → `sun-500→700` |
| `components/layout/sidebar.tsx` | active item on `ink-900` rail | `text-reward` on `bg-reward/16` — green disappears on the dark rail |
| `app/globals.css` | `.btn-pop` | replace with the v2 version from `tokens.css` (green-800 on hover) |

Sweep for the rest:

```bash
rg -n "#[0-9a-fA-F]{6}" frontend/src --glob '!**/*.test.*'
rg -n "rounded-\[|text-\[|bg-\[|shadow-\[" frontend/src
rg -n "bg-(red|blue|orange|amber|emerald|slate|gray|zinc)-" frontend/src
```

Any hit outside `globals.css` is a bug: components use tokens only.

## 4 · Rules that need eyes (not find/replace)

1. **One accent per card.** No card shows sun and clay at the same time. Dashboard
   recommendations currently do — pick one per chip type.
2. **Sun is never a primary CTA background** except "claim XP" and the marketing hero.
   The `Browse Courses` button in the dashboard hero becomes `bg-reward` only because
   it sits on green; anywhere on paper it is `bg-primary`.
3. **Colour never carries meaning alone.** Overdue = clay chip **and** the word
   "Просрочено". Journal cells: background tint **and** the number.
4. **Headings are never tinted green.** Hierarchy is size + weight.
5. **Emoji are out of product UI** entirely — marketing pages only.
6. **Dense mode** (`journal`, `gradebook`, `content-library`, `users`, `groups`): row 32px,
   radius ≤ 6, spacing scale × 0.75, mono tabular numbers.
7. **Focus is always visible.** Never `outline: none` without a replacement ring.
8. **Dark mode**: elevation comes from surface steps, not shadows. `--shadow-xs/sm` are
   `none` in `.dark` by design — don't add them back per-component.

## 5 · Checklist per screen archetype

- [ ] **Overview** (`dashboard`, `progress`, `parent`, `analytics`) — flat hero, text KPIs, one accent
- [ ] **Catalog / lists** (`courses`, `assignments`, `users`, `groups`, `content-library`) — tiles + dense list mode, 240px filters
- [ ] **Data** (`journal`, `gradebook`, `review`, `submissions`, `attendance`) — 32px rows, sticky axes, inspector
- [ ] **Learning session** (`lesson`, `sat-practice`, `live`, `print`) — focus mode, 720px column, paired dark sandbox
- [ ] **Exercises** (44 widget types) — one shell: prompt header / field / check footer / 5 states / AI hint slot
- [ ] **Rewards & world** (`achievements`, `leaderboard`, `my-room`, `avatar`, `skills`) — clay glyphs, no emoji, voxel sub-palette from tokens
- [ ] **Auth & text** (`login`, `register`, legal, `offline`) — sentence case, one marker per page, 68-char measure

## 6 · Versioning

- Bump `tokens.json → meta.version`: token rename = major, new token = minor, value tweak = patch.
- `tokens.css` carries the version in its header comment — keep them in sync.
- Never hand-edit `tokens.css` in the app repo; it is regenerated from `tokens.json`.

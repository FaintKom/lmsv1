# GrassLMS — Design Spec v1 (Lively)

> Source of truth for components and page layouts. Read alongside `tokens.css`.
> Every visual decision below derives from a token — never reach for raw hex.

---

## 0. Foundation

### 0.1 Theme
- **Light only.** v1 ships no dark theme. Strip `.dark:` variants from all components.
- Page bg = `bg-paper` (not `#fff`). Cards = `bg-paper-2` (= `#fff`). Nested panels = `bg-surface-2` (= `--ink-50`).
- Never use pure `#000` or `#fff` for text. Use `text-text` (= `--ink-900`) and `text-text-muted` / `text-text-subtle`.

### 0.2 Type
- All UI in **Manrope** (400, 500, 600, 700, 800).
- **Geist Mono** ONLY for: eyebrow labels, code, numeric IDs, table headers, micro-meta (timestamps, counts, percentages).
- Hierarchy via size + weight, never via color. Don't make headings green.

### 0.3 Signature moves (don't drop these)
1. **Shadow-pop button physics.** Primary buttons sit on a 4px solid shadow in `--green-700` (or coral / sun / ink). Hover: `translateY(2px)` + shadow shrinks to 2px. Active: `translateY(4px)` + shadow collapses to 0. No shadow softening — these are sharp solid offsets, not blurs.
2. **Sun-300 marker on hero words.** ONE word per page heading wrapped in `<em>` with `bg-sun-300`, padding 0 8px, `border-radius: 8px`, `transform: rotate(-1deg)`. NEVER use as a UI background — it's a typographic device only.
3. **Logo dot.** The `g` mark always has a 5–8px sun-400 dot at bottom-right. It's the brand fingerprint.
4. **Warm paper, never white.** Page background is `--paper` (#fafbf6). White (`--paper-2`) is a card/elevated surface, never the canvas.

---

## 1. Buttons

### 1.1 Variants

| Variant | Background | Text | Shadow | Use |
|---|---|---|---|---|
| **Primary** | `bg-primary` (green-600) | white | `shadow-pop` (green-700) | Main CTA — one per view |
| **Secondary** | white (paper-2) | `text-text` (ink-900) | `0 4px 0 0 var(--ink-100)` | Alt action next to primary |
| **Ghost** | transparent | `text-ink-700` | none | Tertiary, in cards/toolbars |
| **Danger** | `bg-danger` (coral-500) | white | `shadow-pop-coral` (coral-700) | Destructive (delete, reset) |
| **Dark** | `bg-ink-900` | white | none (or `shadow-pop-ink`) | Admin / advanced contexts |
| **Sun** | `bg-sun-400` | `text-ink-900` | `shadow-pop-sun` (sun-500) | Reward / streak / "claim XP" |

### 1.2 States (apply to ALL variants)

```
default → resting (full shadow)
hover   → translateY(2px); shadow halved (e.g. 0 2px 0 0 var(--green-700))
active  → translateY(4px); shadow collapsed to 0
focus   → outline 2px var(--color-border-focus); offset 2px
disabled→ opacity 0.4; cursor not-allowed; transform: none !important; pointer-events still on for tooltip
loading → spinner replaces leading icon; text stays; button is aria-busy + disabled
```

### 1.3 Sizes

| Size | Padding | Font | Radius |
|---|---|---|---|
| `sm` | 8px 14px | `text-xs` (12px) bold | `radius-sm` (10px) |
| default | 12px 20px | `text-sm` (13px) bold | `radius-md` (14px) |
| `lg` | 16px 26px | `text-base` (15px) bold | `radius-lg` (18px) |
| `icon` | 0; 40×40 square | — | `radius-md` |

Icon-only buttons require `aria-label`. Leading icons are 16–18px stroke-2.

---

## 2. Inputs

### 2.1 Text input / textarea
- Background `bg-paper-2`, border `2px solid var(--color-border)`, radius `radius-md`, padding `12px 16px`, font 15/1.55.
- **Focus:** `border-color: var(--color-border-focus)` + `box-shadow: 0 0 0 4px var(--color-primary-soft)` (= green-100 ring).
- **Error:** `border-color: var(--color-danger)`; helper text below in `text-danger-fg` (coral-700), prefixed with a 12px `!` glyph.
- **Disabled:** `bg-surface-2`, border `var(--color-border)`, text `text-ink-400`, cursor not-allowed.
- **Placeholder:** `var(--ink-300)`.
- Helper text: `text-xs text-text-subtle`. Error helper: `text-danger-fg` weight 600.

### 2.2 Label
- Font-mono, 12px, weight 700, uppercase, tracking 0.06em, color `text-ink-700`. Sits 6px above input.
- Optional: trailing badge for "(required)" `text-danger` or "(optional)" `text-text-subtle`.

### 2.3 Select / dropdown
- Same chrome as text input. Trailing chevron 16px `text-ink-400`.
- Open menu: `bg-paper-2`, `shadow-md`, `radius-md`, max-height 280px, scroll. Options: 10×16 padding, hover `bg-surface-2`, selected `bg-primary-soft text-success-fg`.

### 2.4 Checkbox / Radio
- 18×18, `border-2 border-ink-200`, `radius-sm` (4px for radio). Checked: `bg-primary` + white check icon.
- Label: 13px weight 600. 10px gap between control and label.
- Group spacing: 12px vertical, 16px horizontal (chips-row).

### 2.5 Switch / Toggle
- Track 36×20, off `bg-ink-200`, on `bg-primary`. Knob 16×16 white, `shadow-sm`.

### 2.6 Search bar
- Larger: padding `0 16px`, height 48px, leading search icon 16px `text-ink-400`, optional `kbd` chip (`⌘K`) trailing — font-mono 10px on `bg-surface-2`.

---

## 3. Chips / Badges

| Class | Bg | Text | Use |
|---|---|---|---|
| `chip-green` | `green-100` | `green-800` | success status, "in progress" |
| `chip-sun` | `sun-100` | `sun-700` | "new", warning |
| `chip-coral` | `coral-50` | `coral-700` | "overdue", urgency |
| `chip-ink` | `ink-100` | `ink-700` | neutral / "draft" |
| `chip-solid-green` | `green-600` | white | featured / PRO |
| `chip-solid-ink` | `ink-900` | white | featured / hero callout |

- Padding `5px 10px`, font-mono OR sans 12 weight 700, `radius-pill`.
- Optional 6px leading dot in `currentColor` (`.chip-dot::before`).
- Counts in nav rail use coral-500 + white + font-mono.

### 3.1 Special chips (don't replace with generic chips)

- **XP token:** `bg-sun-300`, `text-sun-700`, leading 16px sun-700 circle with white star glyph, font weight 800, `radius-pill`. Format: `+50 XP`.
- **Streak pill:** `bg-coral-500`, white text, weight 800, leading 22px white circle with coral flame glyph, soft coral glow shadow `0 6px 18px -8px rgba(255,122,92,0.7)`. Format: `🔥 7 days`.

---

## 4. Cards

| Variant | Bg | Border | Shadow | Use |
|---|---|---|---|---|
| `card` (default) | `bg-paper-2` | `1px solid var(--color-border)` | `shadow-sm` | Resting state |
| `card-elevated` | `bg-paper-2` | none | `shadow-md` | Hover / interactive / featured |
| `card-flat` | `bg-surface-2` | none | none | Inside another card / inline |

- Padding 24px, radius `radius-lg` (18px).
- Card title `h4`: 17px weight 700, `mb-1.5` from body.
- Card body: 13px line 1.5, `text-text-muted`.
- Hover transition: `transform 120ms, box-shadow 120ms`. Translate up 2px and switch to `shadow-md` + `border-color: var(--green-300)` if interactive.

### 4.1 Course card (catalog/dashboard)
- Aspect 16:9 cover with **radial gradient**, NEVER stock photo. Per-subject hue:
  - Algebra/Math → `radial-gradient(circle at 75% 25%, var(--green-500), var(--green-800))`
  - JS/Code → `radial-gradient(circle at 75% 25%, var(--green-600), var(--ink-900))`
  - Spanish/Lang → `radial-gradient(circle at 75% 25%, var(--coral-500), #7a2e15)`
  - SAT/Test → `radial-gradient(circle at 75% 25%, var(--sun-400), var(--sun-700))`
- Cover overlay: dark gradient bottom (`linear-gradient(180deg,transparent 30%,rgba(0,0,0,0.4))`) for legibility.
- Top-right glyph: 32px font-mono symbol, `rgba(255,255,255,0.25)` — subject letter (`Σ`, `</>`, `Ñ`, `★`).
- Bottom of cover: meta line, font-mono 10px uppercase, white 85%.
- Body section: 14px weight 800 title, 12px muted "next up" line, then `progress` or CTA.

---

## 5. Progress

### 5.1 Linear progress
- Track 10px high (8px in dense contexts, 14px in hero), `bg-ink-100`, `radius-pill`.
- Fill: `linear-gradient(90deg, var(--green-400), var(--green-600))`. Color variants: `sun` (`sun-400→500`), `coral` (`coral-500` solid).
- Animate `width` over 400ms ease.
- Pair with above-bar percent label: font-mono 11 weight 700 in matching theme color (`green-700` / `sun-700` / `coral-700`).

### 5.2 Step / module progress
- Pill row, gap 6px. Each step 28×28, `radius-md`, font-mono 11 weight 800.
  - **Done:** `bg-green-500` white check.
  - **Current:** `bg-green-600` white number + 3px green-100 outer ring.
  - **Todo:** `bg-transparent`, `border-2 border-ink-200`, `text-ink-300`.
  - **Locked:** same as todo, with lock glyph instead of number.

### 5.3 Streak calendar (week)
- 7-col grid, `aspect-ratio:1`, gap 5px, `radius-sm`.
  - **Done:** `bg-coral-500`, white numbers font-mono 9 weight 600.
  - **Today:** `bg-coral-50`, `text-coral-700`, `border:2px dashed var(--coral-500)`.
  - **Future:** `bg-surface-2`, `text-ink-300`.

---

## 6. Alerts / Toasts

Grid `36px 1fr`, gap 12, padding 14×16, radius `radius-md`. 36×36 leading icon tile in semantic color, white glyph weight 800.

| Variant | Bg | Icon bg |
|---|---|---|
| success | `success-soft` (green-50) | `bg-primary` (green-600) |
| warning | `warning-soft` (sun-50) | `bg-warning` (sun-500) |
| error | `danger-soft` (coral-50) | `bg-danger` (coral-500) |
| info | `info-soft` (#e6f2ff) | `bg-info` (#2b91ff) |

- Title: 13 weight 700 `text-text`.
- Body: 13 line 1.5 `text-text-muted`.
- Toast (transient): same chrome + `shadow-md`, slides in from top-right, dismissable via X icon button (ghost-sm).

---

## 7. Navigation

### 7.1 Left rail (global)
- 240px wide, `bg-ink-900`, padding 18×16, sticky to viewport.
- **Logo block:** 32×32 mark `bg-green-500` with sun-400 dot bottom-right, name "GrassLMS" weight 800 + tiny mono caption "lively v1". Bottom-border `1px solid rgba(255,255,255,0.08)`.
- **Section header:** font-mono 10 uppercase, `rgba(255,255,255,0.4)`, padding `14px 8px 6px`.
- **Item:** 13 weight 600, `rgba(255,255,255,0.65)`, padding `9px 10px`, gap 11, leading 16px icon, optional trailing badge (coral count or sun "new").
  - **Hover:** `bg-rgba(255,255,255,0.05)` + white text.
  - **Active:** `bg-primary` (green-600) + white. Pure flat fill, no shadow.
- **Foot:** avatar 30 + name/role; menu opens upward popover.

### 7.2 Top bar (course/lesson context)
- 56–64px tall, `bg-paper-2`, bottom-border `1px solid border`.
- Left: back chevron + breadcrumbs `text-text-muted` weight 600 13px, current page weight 800 `text-text`.
- Right: streak pill, XP total, avatar.

### 7.3 Tabs (in-content)
- Horizontal row, `bg-paper-2`, bottom-border `1px solid border`, padding `0 32px`.
- Tab: padding `14px 18px`, 13 weight 700, `text-text-muted`. Active: `text-text` + 2px bottom-border `var(--color-primary)`. Optional trailing count chip (`bg-ink-100` neutral, `bg-primary-soft text-success-fg` when active).

### 7.4 Breadcrumbs
- Font-mono 11 uppercase tracking 0.06em, `text-text-subtle`. Separators `/` in `text-ink-300`. Last crumb `text-text` weight 800 sans (escape from mono).

---

## 8. Tables

- Wrapper `bg-paper-2`, `border 1px solid border`, `radius-lg`, overflow hidden.
- `thead th`: font-mono 11 uppercase tracking 0.08em, weight 600 `text-text-subtle`, padding `14px 20px`, `bg-surface-2`, bottom-border `1px solid border`.
- `tbody td`: 13 `text-ink-700`, padding `14px 20px`, bottom-border `1px solid border`.
- Last row: no bottom-border.
- Row hover: `bg-green-25` (#f4fbef). Selected row: `bg-primary-soft` (green-100).
- Sortable column header: trailing 12px chevron `text-ink-300`. Active sort: chevron `text-primary` and weight 700.
- Empty state inline: see §11.

---

## 9. Modals / Dialogs

- Backdrop `rgba(10,26,16,0.45)`, blur 4px optional.
- Panel `bg-paper-2`, `radius-xl` (24px), `shadow-lg`, max-width 560px (or 720 for forms), padding 32.
- Header row: 22 weight 700 title; close icon-button top-right (ghost-sm).
- Footer: right-aligned actions, gap 8. Primary CTA on right.

---

## 10. Avatars

- Circle, `border-3 solid var(--paper-2)`, weight 800, color contrast pair from palette.
- Sizes: `sm` 28 (border-2), default 40 (border-3), `lg` 64 (border-4).
- Stack: `display:flex`, items overlap −10px.
- Background colors cycle through: green-600, green-400, sun-400 (text sun-700), coral-500.
- Fallback initials, never letter-only on busy backgrounds.

---

## 11. Empty / Loading / Error states

### 11.1 Empty state (in card or table)
- 64×64 sun-100 tile with sun-700 line icon, `radius-lg`.
- 17 weight 800 title.
- 13 muted body, max 280px wide.
- One primary CTA below.
- Centered, padding 48 vertical.

### 11.2 Loading
- **Skeleton blocks:** `bg-ink-100`, `radius-md`, animated shimmer `linear-gradient(90deg, var(--ink-100), var(--ink-50), var(--ink-100))` translating left→right over 1.5s.
- **Inline spinner:** 16px or 20px, 2px stroke, color `var(--color-primary)`. Use over button text on submit.
- Don't show spinners for >2s — switch to skeleton.

### 11.3 Error / 404 / 500
- Same shape as empty state but tile is `coral-50` with coral-700 icon.
- Body explains what happened in plain language. Primary CTA is "Go back" or "Retry"; secondary is "Contact support".

---

## 12. Theme contract

```html
<!-- root layout -->
<html lang="ru">
  <body>
    <!-- no theme class — light is the only theme -->
  </body>
</html>
```

- **No** `dark:` Tailwind variants in v1.
- **No** theme switcher in UI.
- Future dark theme: when added, will be a separate token export and a `.dark` class — design-spec will be updated. Until then, treat dark as out-of-scope.

---

# Page specs

Each page below is a port of an existing mock in `LMS Assignments Redesign.html` or the `uploads/` set. Layouts are described as grids; concrete component mappings reference §1–11 above.

## P1. Student Dashboard (`/dashboard`)

**Layout:** `grid-template-columns: 240px 1fr` (rail + main). Main padding `36 48`.

**Sections, top to bottom:**

1. **Hero greeting** — 2-col grid `1.2fr 1fr`, gap 24.
   - Left: green-600→700 gradient panel, `radius-xl`, padding `36 36 32`. Eyebrow font-mono "TODAY · WED MAY 4". H2 36 weight 800 white with one `<em>` sun-300 marker word ("Готово к старту"). Sub line rgba(white,0.85). Two CTAs: sun primary "Continue lesson →", ghost-translucent "Browse catalog".
   - Right: streak card. White, `radius-xl`, border-1 ink-100. Top: label "STREAK" font-mono + 48px coral flame tile with `shadow-pop-coral`. Big number 64 weight 800 coral-500 with small "days" suffix. Title 18 weight 800. 7-day streak grid (§5.3). Note line 12 muted with `<b class="text-coral-700">` highlight.

2. **Stats row** — 4-col grid, gap 14. Each tile: white card, `radius-md`, padding `18 20`. Top row: 10 mono uppercase label + 32×32 themed icon tile (green / sun / coral / ink). Big number 30 weight 800 + small unit. Delta line 11 weight 700 in green-700 (up) or coral-700 (down). Suggested KPIs: Courses active · Lessons this week · Avg score · Time spent.

3. **Two-column layout** — `1.7fr 1fr`, gap 24.
   - **Left panel "Continue learning"**: header 17 weight 800 + "View all" green-700 link. Body: 2-col grid of course cards (§4.1) with progress.
   - **Right panel "Today's tasks"**: vertical list of task rows. Each row: 6×6 dot in subject hue + 14 weight 700 title + 12 mono meta ("DUE 14:00 · 12 MIN") + trailing chevron.

4. **Activity timeline** — full-width white panel, header "Recent activity", body is a vertical list with day separators (font-mono 10 uppercase). Each item: avatar + sentence ("Anna assigned you SAT Practice 4") + 11 mono timestamp.

## P2. Course Catalog (`/courses`)

**Layout:** rail + main; main is `grid-template-columns: 240px 1fr`, gap 32. (Filters left, results right.)

1. **Page head:** breadcrumbs (§7.4), H1 36 weight 800 with `<em>` sun marker ("Найди свой <em>предмет</em>"), sub line muted, right side count "324 курса" weight 800 24.
2. **Search row:** full-width grid `1fr auto auto`. Search bar (§2.6) + view-mode segmented (`Grid` / `List`, ink-900 active state) + "Sort by" button.
3. **Filters sidebar** — sticky, `radius-lg`, padding 20. Header "Filters" with font-mono coral "CLEAR ALL" link. Groups separated by 1px ink-100 dividers: Subject (checkboxes), Level (chips: Beginner / Intermediate / Advanced — selected = `chip-solid-green`), Duration (slider double-thumb, primary track), Format (radio).
4. **Results grid:** 3-col course cards (§4.1) gap 20. Each card has trailing "Enrolled · 68%" or "Start →" CTA.
5. **Pagination footer:** centered, font-mono 11. Prev / 1 2 [3] 4 … 27 / Next. Active page = `bg-primary` white pill.

## P3. Lesson Player (`/lessons/[id]`)

**Layout:** `grid-template-columns: 240px 320px 1fr` (rail + lesson outline + content).

1. **Lesson outline (320 col):**
   - Head: back link, eyebrow "ALGEBRA · CHAPTER 4", title 16 weight 800, progress row `bar | 42%`.
   - Body: scrollable list of modules. Module head: 22×22 numbered tile + module title + meta-mini (font-mono "12 LESSONS · 2H 30M"). Lesson items: 15×15 status circle (todo border-ink-200, done `bg-green-500` check, current `bg-green-600` ring, locked lock icon) + title + duration mono 10.
2. **Top bar:** breadcrumbs left, streak pill + XP token + avatar right.
3. **Lesson content:** padding `40 80`, max-content 720px centered.
   - Eyebrow font-mono "LESSON 6 / 12 · 12 MIN".
   - H1 40 weight 800 (no sun marker on lesson titles — reserved for hero/dashboard).
   - Body 18 line 1.5.
   - Inline blocks: math formula in `font-mono` 18 on `bg-surface-2` panel, code blocks `bg-ink-900` text `text-paper`, callouts (tip/note/warning) using §6 alerts inline.
4. **Footer bar:** sticky bottom inside content column, padding 20 80. Left: "← Previous". Right: primary "Mark complete →" + sun XP chip.

## P4. Course Builder (`/admin/courses/[id]`)

**Layout:** topbar + tabs + 3-col `340px 1fr 320px` (outline · canvas · inspector).

1. **Topbar:** back link mono left, breadcrumbs middle (course title is editable input — see §2.1, transparent until focused), right: "Saved 2m ago" green dot + "Preview" ghost + "Publish" primary.
2. **Tabs:** Outline · Settings · Audience · Insights · Versions. Active green underline (§7.3).
3. **Outline column:** "Modules" header + green-700 "+ ADD" mono link. List of module cards (`bg-paper`, border-1.5 ink-100, `radius-md`). Expanded module = `border-green-300` + white bg. Drag handle, mono num pill (active = `bg-primary` white), title, more-menu (•••), meta line "8 LESSONS · 95M", lessons sublist (active = green-50 + green-300 border).
4. **Canvas column:** lesson editor. Title input (large 24 weight 800), block list — each block (text/video/quiz/file) is a card with hover toolbar (move/duplicate/delete, ghost-icon).
5. **Inspector column:** properties of selected block. Sections collapse: General · Visibility · Schedule · Conditions. Each property is label (§2.2) + control.

## P5. Admin Panel (`/admin`)

**Layout:** rail + main, main is full-bleed dashboard.

1. **Page head:** breadcrumbs, H1 32 with `<em>` sun marker, sub muted; right: range segmented control (`24h | 7d | 30d | 90d` mono, ink-900 active).
2. **KPI strip:** 5-col grid. Each KPI: white card `radius-md`, top label row (mono 10 + 22×22 themed icon tile), big number 28 weight 800 with mono unit, delta 11 weight 700 (green/coral arrow), 24px sparkline svg below. KPIs: Active students · Courses live · Completion rate · Avg score · Revenue.
3. **2-col content layout:** charts panel left (signups over time, course mix donut), right column stack: Recent enrollments table mini, Pending reviews list, System status (4 dots).
4. **Tables under:** Students / Courses / Teachers list. Standard table (§8) with row actions overlay on hover (right-aligned ghost icon buttons: edit, archive, more).

## P6. Quiz / Exercise runner (port from `LMS Assignments Redesign.html`)

Already designed in main artifact. For frontend reference:
- ExerciseShell: §1 + §3 + §5 + §6.
- Choice tiles: white card, hover `border-green-300` + lift. Selected: `bg-primary-soft` + `border-primary` + green check chip top-right. Correct after submit: `bg-success-soft` + green-600 left rail (4px). Incorrect: `bg-danger-soft` + coral-500 left rail.
- Footer with timer (mono mm:ss, `text-coral-700` last 30s) + xp pill + Submit primary.

## P7. Profile / Settings (`/settings/*`)

**Layout:** rail + main. Main has secondary nav top tabs (§7.3): Account · Notifications · Billing · Integrations · Sessions.

- **Account form:** 2-col grid for fields (label + input), max 720 wide. Avatar uploader: 96×96 circle, hover overlay "Change". Section dividers: 32px vertical gap + 1px ink-100 line + section title (17 weight 800).
- **Save bar:** sticky bottom-of-card, white with shadow-md, "Discard" ghost + "Save changes" primary, only visible when dirty.

---

## 13. Migration acceptance checklist

When migrating an existing page to this spec, it's done when:

- [ ] No raw hex codes in JSX/TSX (`grep -E "#[0-9a-f]{3,8}"` returns 0 in component files).
- [ ] No `bg-green-500`, `bg-blue-*`, `text-indigo-*`, etc. — only token utilities (`bg-primary`, `bg-success`, `bg-surface-2`, `text-text-muted`).
- [ ] No `dark:` variants.
- [ ] All buttons use `shadow-pop` family or are explicitly secondary/ghost.
- [ ] Page bg is `bg-paper`, not `bg-white` or `bg-surface`.
- [ ] Headings use Manrope; eyebrow/meta uses Geist Mono uppercase.
- [ ] Focus ring visible everywhere (no `outline:none` without replacement).
- [ ] Empty / loading / error states implemented (§11).

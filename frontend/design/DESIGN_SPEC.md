# DESIGN_SPEC — GrassLMS v3 «Colour fields»

Component-by-component contract. Every value references a token from `tokens.css`.
v3 (specs/071, 2026-09-30) keeps the v2 palette and changes everything else:
Onest for text, Geologica for headings, radii capped at 14px, flat buttons,
and a course's subject as a field of colour. The v3 reference is the
direction-C prototype in `specs/071-design-system-v2/prototype/b-and-c.html`.

Rules that apply everywhere:

- Colour never carries meaning alone — always paired with text or an icon.
- Hierarchy is size + weight, never colour. Headings are never tinted.
- One accent per card. Sun and clay never appear in the same card.
- Shadows only on layers that float: menus, dialogs, toasts. Cards sit flat.
- Focus is always visible: `2px solid var(--color-border-focus)`, offset 2.
- Minimum touch target 44×44 including invisible padding.
- Emoji: never in product UI.

Never, anywhere (the spec's list of generated looks, checked by the ratchet
in `src/lib/design/design-system.test.ts`):

1. Purple-to-blue gradients, or any gradient as a fill.
2. Emoji instead of icons.
3. Glass: translucent fill with backdrop blur, glow on the edge.
4. A grid of identical "icon in a circle + title + two lines" cards as the
   main device of a page.
5. Large radius and a shadow on everything.
6. Blurred colour blobs and glows in the background.
7. Mono uppercase labels over every block; highlighter marks on headline words.
8. "Unlock your potential" copy; numbers and testimonials that did not happen.

---

## 1 · Buttons

All buttons are pills (`--radius-pill`), flat, no shadow.

| Variant | Background | Text | Border | Use |
|---|---|---|---|---|
| primary | `--color-primary` | `--color-primary-fg` | none | main action, one per view |
| secondary | `--color-surface` | `--color-text` | `1px --color-border` | alternative action |
| outline | `--color-surface` | `--color-text` | `1px --color-border-strong` | alternative action on a filled area |
| ghost | transparent | `--color-text` | none | tertiary, inline |
| sun | `--color-reward` | `--ink-900` | none | claim XP, hero CTA on green only |
| destructive | `--color-danger` | `--ink-900` | none | destructive, always with confirm |
| dark | `--ink-900` | `#fff` | none | admin bulk actions |

**Never hardcode `text-white` on a brand surface.** Use the row's token. The
foreground is theme-dependent and white fails §14 on both brand colours
(measured 2026-08-03): white on `--color-primary` is 4.56:1 light but **2.00:1
dark**; white on `--color-danger` is **3.77:1 light and 2.57:1 dark**. The
tokens pass: `--color-primary-fg` gives 4.56 / 9.31, `--ink-900` on danger
gives 4.93 / 7.22. Same reasoning as the long-standing ink-on-sun rule — a
bright surface takes dark text, whatever the hue.

Sizes: sm 36px / `--t-xs` / padding 0×16; md 44px / `--t-sm` / 0×20;
lg 48px / `--t-base` / 0×24. Weight 600. Icon 18px, gap 8, before the label.

States (120ms, `--motion-ease`, `.press-scale`):

```
default  resting, flat
hover    background one step darker (primary → primary-hover, others → surface-2)
active   scale(0.96); none under reduced motion (MOTION.md M3)
focus    outline 2px border-focus, offset 2
loading  13px spinner, label → present-tense verb ("Отправка…"), width frozen, disabled
disabled opacity 0.5, cursor not-allowed
```

## 2 · Inputs

Height 44, radius `--radius-sm`, border **2px** `--color-border`, padding 11×13, `--t-base`.
Label 13/600 above, gap 6. Helper text 12 `--color-text-muted`, 6 below.

| State | Border | Extras |
|---|---|---|
| default | `--color-border` | — |
| hover | `--color-border-strong` | — |
| focus | `--color-border-focus` | `box-shadow: var(--ring-focus)` |
| valid | `--green-500` | check glyph right, `--color-success` |
| error | `--color-danger` | message 12px `--color-danger-fg` below, `aria-invalid` |
| disabled | `--color-border` | bg `--color-surface-2`, text `--ink-300` |
| loading | `--color-border` | `.skeleton` fills the field box |

Textarea: same, min-height 96, resize vertical. Select: same + 16px chevron `--ink-400`.
Search: 16px icon left, padding-left 38, `⌘K` mono chip right.
Checkbox / radio 18px, radius 4 / pill, checked `--color-primary`, transition 80ms.
Toggle 34×20, knob 16, off `--ink-200`, on `--color-primary`, 120ms.

## 3 · Chips, badges, pills

Height 28, radius pill, padding 5×11, 12/700, no border unless it is a removable filter
(1px `--color-border-strong` + `×`).

| Kind | Background | Text |
|---|---|---|
| subject | `--green-100` | `--green-800` |
| reward / SAT | `--sun-100` | `--sun-700` |
| overdue / error | `--clay-50` | `--clay-700` |
| info / live | `--lagoon-50` | `--lagoon-800` |
| neutral | `--ink-50` | `--ink-500` |

Notification badge: 18px min, pill, `--color-danger`, white mono 10px.
Kbd chip: mono 11, `--ink-50`, 1px border, radius `--radius-xs`.

## 4 · Cards

| Variant | Spec |
|---|---|
| default | `--color-surface`, no border, no shadow, `--radius-lg` (14), padding 20–24 |
| elevated | `--shadow-md` — only for something that floats |
| flat | `--color-surface-2` — nested panel |
| subject | the course's field (`--subject-lang/math/code/other`), text `--subject-ink` |
| interactive | default + hover: translateY(−2px), pointer devices only, 120ms (MOTION.md M5) |

**Subject fields.** A course's subject comes from `courses.category` through
`subjectOf()` in `src/lib/subject.ts`: languages → `--subject-lang` (green-100),
maths → `--subject-math` (sun-100), programming → `--subject-code` (lagoon-50),
anything else → `--subject-other` (ink-100). Dark theme has its own fields.
Text on a field is always `--subject-ink`, never white.

**Course card.** Without a thumbnail the cover is the subject field, 144px, the
category small at the top and the title in the display face at the bottom. No
gradient, no watermark glyph. With a thumbnail: the image, no overlay. Body:
description two lines, `ProgressBar` sm and the percentage.

**Summary numbers.** One strip of label + value, not a row of identical tiles.
Label 12–13 sans sentence case, value 22–28/600 tabular. Never repeat a value
already shown in the hero.

## 5 · Progress

Linear: `components/ui/progress-bar.tsx`, the only one. Height 6 / 10 / 12
(sm / md / lg), radius pill, track `--color-surface-2`, fill `--color-primary`.
The fill scales from the left and grows from zero on first paint (MOTION.md M2);
it never animates `width`. At risk → `fillClassName="bg-danger"`.
Segmented (lesson steps): equal 6px segments, gap 4, done `--color-primary`, current
2px `--color-primary` ring, locked `--ink-100`.
Ring (XP, SAT score): stroke 6, track `--ink-100`, value `--color-primary`, number in the middle,
mono tabular.

## 6 · Alerts

Radius `--radius-md`, padding 12×14, 1px border, 20px dot or Lucide icon, gap 11.
Title 13.5/700 in the `-fg` token, body 13 `--color-text-muted`.

| Kind | bg / border / fg |
|---|---|
| success | `--color-success-soft` / `--green-200` / `--color-success-fg` |
| warning | `--color-warning-soft` / `--sun-300` / `--color-warning-fg` |
| danger | `--color-danger-soft` / `--clay-300` / `--color-danger-fg` |
| info | `--color-info-soft` / `--lagoon-200` / `--color-info-fg` |

Toast: same palette, `--shadow-lg`, top-right, slide-in 200ms ease-out, auto-dismiss 5s,
max 3 stacked, gap 8.

## 7 · Navigation

**Rail** 240px, `--ink-900`, sticky. Item 36px, radius `--radius-sm`, icon 16 stroke 2, gap 10.
Idle `rgba(255,255,255,0.62)`; hover `rgba(255,255,255,0.06)` + white;
**active `--color-reward` text on `rgba(255,216,77,0.16)`** — green disappears on the dark rail.
Section header mono 10 caps `rgba(255,255,255,0.4)`, margin-top 16.
Collapsed: 64px, icons only, tooltip right.

**Top bar** 56px, `--color-surface`, 1px bottom border, sticky. Breadcrumbs mono 11 caps with
`/` separators in `--ink-300`. Search chip, notification bell, 26px avatar.

**Mobile tab bar** (<1024px): 5 items, 56px tall, safe-area padding, active `--color-primary`,
icon 22 + label 10.

**Tabs**: 40px, 2px bottom indicator `--color-primary`, idle `--color-text-muted`, 120ms.

## 8 · Tables (dense mode)

Row 32px, header mono 10 caps `--color-text-subtle` on `--color-surface-2`, cell padding 0×10,
`tabular-nums`, radius ≤ 6, zebra via `--color-surface-2`.
First column and header sticky. Selected row: 2px `--color-primary` inset-left + `--green-25`.
Grade cells: ≥85 `--green-50` bg, 60–84 no bg, <60 `--clay-50` bg + `--clay-700` text,
pending mono 10 `--color-info`, absent `н` in `--ink-300`.
Bulk selection: 46px toolbar appears above the table with the count and actions.
Sorting: header click, 12px chevron; sorted column header text `--color-text`.

## 9 · Modals & overlays

Backdrop `rgba(13,21,13,0.45)` + `backdrop-filter: blur(4px)`, fade 200ms.
Panel `--radius-xl`, `--shadow-lg`, padding 22, widths 340 / 480 / 720.
Enter: scale .98→1 + 8px up, 200ms `--motion-ease`. Esc closes; focus trapped; focus returns
to the trigger. Destructive confirm: danger button first, cancel second, consequence spelled out
in the body ("28 учеников потеряют доступ").
Dropdown / popover: `--radius-md`, `--shadow-md`, 1px border, item 36px, 200ms.
Tooltip: `--ink-900`, white 12, radius `--radius-xs`, padding 6×9, delay 400ms.

## 10 · Avatars

28 / 36 / 44, pill. Initials, weight 700, background from a fixed 6-colour set hashed by user id
(`green-600`, `lagoon-600`, `clay-500`, `sun-500`, `ink-500`, `green-800`), text always white
except on sun (ink-900). Stack: −8px overlap, 2px `--color-surface` ring, "+N" chip last.

## 11 · Empty / loading / error

**Empty.** 48px tinted tile (`--sun-100` + `--sun-700` icon), title 15/700, one sentence of body,
one primary action. Helpful, never apologetic: "Пока нет курсов / Выберите первый курс —
расписание соберётся автоматически".

**Loading.** Skeletons mirroring the real geometry (`.skeleton`, shimmer 1.5s). Never a
full-page spinner; spinners exist only inside buttons. Skeleton after 200ms, not instantly.

**Error.** 48px `--clay-50` tile + `--clay-700` icon, plain-language title, action first:
"Повторить" primary, "Назад" secondary. Support link is tertiary. Never show a raw stack trace.

## 12 · Exercise shell (one for all 44 widget types)

```
┌ header  mono kind chip + prompt 13.5/600
├ field   the widget itself, padding 14, min-height 120
└ footer  [Проверить] · attempts left · [Подсказка ИИ]  — bg surface-2, top border
```

States: idle · answered (option border 1.5px `--color-primary`, bg `--green-25`) ·
correct (border `--color-success`, check, 200ms) · incorrect (border `--color-danger`,
±4px shake ×2, 160ms) · reveal (correct option `--green-50`, chosen wrong `--clay-50`).
Attempts and the AI hint slot are part of the shell, not the widget.
AI hint opens a `--color-info-soft` panel below the footer — it explains, never answers.

## 13 · Layout

| Archetype | Grid |
|---|---|
| Overview / admin | full-bleed 12 col, gap 16, page gutter 48 |
| Catalog | 240px filters + 1fr results, gap 32 |
| Lesson | 220px outline + 720px content + 300–420px sandbox, rail hidden |
| Data | full-width table + 240–320px inspector, 46px toolbar |
| Auth / legal | single 480px column centred, 68-char measure |

Gutters 24 → 32 → 48 → 64 (≥1600). Section gap 32. Reading measure 68 characters.

## 14 · Accessibility

Text contrast ≥ 4.5:1, large text and UI elements ≥ 3:1 (checked for both themes).
Keyboard: every interactive element reachable, visible focus, logical order, Esc closes overlays.
Headings h1 → h3 without skipping. Icons need `aria-label` when they are the only content.
`prefers-reduced-motion` collapses all durations to 0.01ms.
Never disable zoom; never lock font size in px below 12.

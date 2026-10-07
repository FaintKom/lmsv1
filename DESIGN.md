---
name: GrassLMS
description: A learning platform for schools, set in an open field — calm frame, warm subject colour, one green.
colors:
  primary: "#0a8754"
  primary-hover: "#07683f"
  primary-soft: "#d4f1c4"
  paper: "#fbfcf7"
  surface: "#ffffff"
  surface-2: "#f3f5ef"
  ground: "#b6e69e"
  ink: "#0d150d"
  ink-muted: "#485444"
  ink-subtle: "#677265"
  border: "#e3e8dd"
  border-strong: "#c4cdbe"
  subject-lang: "#d4f1c4"
  subject-math: "#fff2b3"
  subject-code: "#e4f1f4"
  subject-other: "#e3e8dd"
  reward: "#ffd84d"
  danger: "#e2552f"
  danger-fg: "#9e300f"
  warning-fg: "#7a5500"
  info-fg: "#0a4652"
typography:
  display:
    fontFamily: "Geologica, Onest, system-ui, sans-serif"
    fontSize: "44px"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Geologica, Onest, system-ui, sans-serif"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Geologica, Onest, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Onest, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "Onest, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.4
  mono:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "13px"
rounded:
  xs: "6px"
  sm: "10px"
  md: "14px"
  pill: "999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "6": "24px"
  "8": "32px"
  "12": "48px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    height: "44px"
    padding: "0 20px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    height: "44px"
  button-danger-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.danger-fg}"
    rounded: "{rounded.pill}"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "24px"
  stat-tile:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.headline}"
    rounded: "{rounded.md}"
    padding: "20px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    height: "44px"
  filter-chip-pressed:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    height: "36px"
---

# Design System: GrassLMS

## Overview

**Creative North Star: "The Open Field"**

GrassLMS is a field under an open sky: a wide, quiet ground where the work
stands out. The frame of every screen is calm and identical — one page header,
one width, one way to show a number, one way to say "nothing here yet" — so a
student or teacher never relearns the page. Character comes in on purpose and
in few places: the colour of a course's subject, the field on the sign-in
screen, the greeting on the student's home.

The system serves two moods at once. Students come back daily and should feel
the place is warm and theirs; teachers and admins work dense screens and need
the interface to disappear into the task. The field gives both: ground for the
student, a clean grid for the teacher.

What it refuses, by name (`frontend/design/DESIGN_SPEC.md`, checked by
`src/lib/design/design-system.test.ts`): purple-to-blue gradients, emoji for
icons, glass and blur, grids of identical icon-in-a-circle cards, radii over
14px, blurred colour blobs, labels over headings, a coloured stripe down the
side of a card, hard step shadows, and invented numbers.

**Key Characteristics:**
- One frame for every screen: `PageHeader`, `StatTile`, `Tabs`, `FilterChips`,
  `EmptyState`, `PageLoading` from `src/components/ui/page-kit.tsx`.
- Width is the layout's job: one cap (`max-w-7xl`), pages never centre themselves.
- Colour carries a subject, never a status alone; words carry meaning.
- Flat surfaces; shadow only on what floats.
- Pills for actions, 14px corners for containers.

## Colors

A warm off-white page, one brand green, and four pale subject fields.

### Primary
- **Grass Green** (#0a8754): the one fill per view — the main action, the
  active nav item, a pressed filter, the progress bar. Hover deepens to
  Forest (#07683f). Schools can override it with their own brand colour;
  the system derives the hover and the text on it.

### Secondary
- **Subject fields**: Meadow (#d4f1c4) for languages, Butter (#fff2b3) for
  maths, Lagoon Mist (#e4f1f4) for code, Fog (#e3e8dd) for anything else. A
  course wears its subject as a surface — cover, "continue" card, sign-in
  panel — always with ink text on it.

### Tertiary
- **Sun** (#ffd84d): reward only — XP, streaks. Never white text on it.

### Neutral
- **Paper** (#fbfcf7): the page. Never pure white; contrast is computed
  against Paper, not #ffffff.
- **Surface** (#ffffff) and **Surface 2** (#f3f5ef): cards and quiet fills.
- **Ground** (#b6e69e): the open field behind the sign-in screen.
- **Ink** (#0d150d), **Ink Muted** (#485444), **Ink Subtle** (#677265):
  text by importance, never by colour.
- **Border** (#e3e8dd), **Border Strong** (#c4cdbe): hairlines only.

### Named Rules
**The One Green Rule.** One filled green control per view. Everything else is
outline, ghost or text.

**The Words Carry It Rule.** A status is said in words; colour only repeats
it. No side stripes, no coloured numbers standing in for a label.

## Typography

**Display Font:** Geologica (with Onest, system-ui)
**Body Font:** Onest (with system-ui)
**Label/Mono Font:** Geist Mono, for code and measured data only

**Character:** Geologica is round and confident for headings; Onest is plain
and legible in six languages, Cyrillic included.

### Hierarchy
- **Display** (700, 44px → 32px on phones, 1.1): the student's greeting only.
- **Headline** (700, 32px → 24px on phones, 1.15): one page title per screen,
  via `PageHeader`; also the figure in a `StatTile`.
- **Title** (600, 20px, 1.3): section headings inside a page.
- **Body** (400, 15px, 1.65): prose; descriptions capped at 65ch.
- **Label** (500, 13px): field labels, tile labels, meta lines. Sentence case.

### Named Rules
**The No Eyebrow Rule.** Nothing sits above a heading — no crumb, no
uppercase label. The date on the greeting goes under it.

**The Sentence Case Rule.** Labels, tabs and buttons are sentence case.
Uppercase survives only in table column heads.

## Layout

A sidebar and one content column capped at `max-w-7xl`, left-aligned edge
the same on every screen. Pages are a vertical stack spaced `gap-8`; inside a
section, `gap-3`. Narrow forms and reading text cap themselves (`max-w-3xl`,
65ch) but stay left-aligned. Headers wrap their actions under the title on
narrow screens (six languages make labels long). Lessons, live lessons and
editors bring their own full-bleed layout and opt out of the cap. On phones
the sidebar becomes a bottom tab bar and every tap target is at least 44px.

## Elevation & Depth

Flat by default. Depth comes from tone: Paper under Surface under content.
Shadows exist only for things that float above the page — menus, dialogs,
toasts — and are soft and offset (`0 8px 24px -8px`). A card never casts a
shadow at rest; a hover may raise one.

### Named Rules
**The Flat Card Rule.** Cards sit flat. A shadow with no blur (the "step"
under a button) is banned and the guard test fails on it.

## Shapes

Containers top out at 14px corners (`rounded-lg` = `--radius-md`); small
pieces use 10px and 6px. Every action is a pill: buttons, filter chips,
search fields, status badges. Borders are 1px hairlines; anything thicker on
one side is decoration and is refused.

## Components

### Buttons
- **Shape:** pill (999px), 44px tall (36px small).
- **Primary:** Grass Green fill, white text, one per view.
- **Outline / Secondary:** Surface fill, 1px border, ink text.
- **Danger ghost:** red words on transparent, soft red on hover — for delete
  actions that are not the point of the screen. A solid red button only
  inside a confirmation.
- **Press:** scales to 0.96 over 120ms; no scale under reduced motion.

### Chips
- **Filter chips** (`FilterChips`): outlined pills; pressed is Grass Green
  fill with white text, the same in both themes.
- **Status chips:** soft tint plus the word, never the tint alone.

### Cards / Containers
- **Corner Style:** 14px.
- **Background:** Surface on Paper; subject colour when the card is a course.
- **Shadow Strategy:** none at rest (see Elevation).
- **Border:** none, or a 1px hairline in dense tables.
- **Internal Padding:** 20–24px.

### Inputs / Fields
- **Style:** Surface fill, 1px Border Strong, pill for search, 10px for text
  areas; 44px tall.
- **Focus:** 2px Grass Green outline, 2px offset — always visible.

### Navigation
- **Sidebar:** grouped links, active item on a soft green pill.
- **Tabs** (`Tabs`): underlined, 2px green bar on the active tab; a strip that
  scrolls sideways rather than clipping.

### Page Header (signature)
`PageHeader`: optional back link, one heading, an optional description under
it, actions on the right that wrap below on narrow screens. No eyebrow slot,
by design.

### Stat Tile (signature)
`StatTile`: muted label with an optional icon, the figure in Geologica with
tabular numerals, an optional hint line. No colour, no circle around the icon.
Hidden until there is something to count.

### Empty State
`EmptyState`: an outline icon, a heading, what to do next, an optional action.
Never just "nothing here".

## Do's and Don'ts

### Do:
- **Do** build every screen from `page-kit`: `PageHeader`, `StatTile`,
  `Tabs`, `FilterChips`, `EmptyState`, `PageLoading`.
- **Do** keep one filled Grass Green control per view.
- **Do** let a course's subject colour be its surface, with ink text.
- **Do** compute contrast against Paper (#fbfcf7) in both themes.
- **Do** translate every string in all six locales in the same change.

### Don't:
- **Don't** centre a page with `mx-auto max-w-*`; the layout owns width.
- **Don't** put a label, crumb or date above a heading.
- **Don't** draw a coloured stripe down the side of a card or a step shadow
  under a button.
- **Don't** use emoji, gradients, glass or blurred blobs.
- **Don't** show a row of zeros to someone who has not started yet.
- **Don't** put white text on Sun or on the danger red.

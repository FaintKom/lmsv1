# MOTION — GrassLMS Lively v2 animation contract

Extends `tokens.css` (--motion-*) and DESIGN_SPEC. Sources: Emil Kowalski's
animation philosophy + "details that make interfaces feel better". Every rule
here is enforceable in review; values are exact — copy, don't approximate.

## Tokens (single source, tokens.css)

| Token | Value | Use |
|---|---|---|
| `--motion-instant` | 80ms | checkbox/radio/toggle ticks, tab indicator |
| `--motion-fast` | 120ms | hover, press, button state machines |
| `--motion-base` | 200ms | dropdowns, popovers, toasts, modal enter |
| `--motion-slow` | 400ms | progress bars, page-level reveals |
| `--motion-stagger` | 60ms | per-child delay in group entrances |
| `--motion-ease` | cubic-bezier(0.2, 0.8, 0.2, 1) | default UI curve |
| `--motion-ease-out` | cubic-bezier(0, 0, 0.2, 1) | gentle exits |
| `--motion-ease-in` | cubic-bezier(0.4, 0, 1, 1) | never on entrances (see below) |
| `--motion-ease-out-strong` | cubic-bezier(0.23, 1, 0.32, 1) | deliberate entrances that must feel snappy |
| `--motion-ease-drawer` | cubic-bezier(0.32, 0.72, 0, 1) | drawers / sheets (iOS-like) |

No hand-typed cubic-beziers or millisecond literals in components — tokens only.
Five near-identical curves is a consolidation bug.

## 1 · Purpose & frequency

Every animation answers "why": spatial continuity, state indication, feedback,
or preventing a jarring change. "Looks cool" is not a purpose on anything seen
often.

| Frequency | Decision |
|---|---|
| 100+/day — keyboard actions, conductor step switch, command-K | **No animation. Ever.** |
| Tens/day — hover, list navigation, exercise Check | ≤150ms opacity/color only |
| Occasional — modals, drawers, toasts, scene switch | standard (`--motion-base`) |
| Rare — streak milestones, confetti, first-run | delight budget allowed |

Motion is never the only feedback channel — every animated state change also
has a static cue (color, icon, label).

## 2 · Easing & duration

Decision order:

- Entering/exiting → **ease-out** (`--motion-ease` or `--motion-ease-out-strong`)
- Moving/morphing on screen → ease-in-out (pair `--motion-ease`)
- Hover / color → `--motion-ease`, ≤150ms
- Constant motion (shimmer, marquee, progress) → `linear`

**`ease-in` on UI entrances is a bug** — it delays the exact moment the user is
watching. `--motion-ease-in` exists only for the *exit half* of paired
transitions.

Duration budget: UI stays **under 300ms**. Button press 100–160ms · tooltip
125–200ms · dropdown 150–250ms · modal/drawer 200–400ms. Longer is allowed only
on marketing/explanatory surfaces.

## 3 · Physicality

- **Never `scale(0)`.** Enter from `scale(0.96–0.98)` + `opacity: 0` (modal
  spec: `.98 → 1` + 8px rise, 200ms).
- Popovers/dropdowns/tooltips scale **from their trigger**
  (`transform-origin` at the trigger side). Modals are exempt — centered is
  correct.
- Press feedback: buttons with pop shadows use the `.btn-pop` translateY state
  machine (the signature). Flat pressables use `active:scale-[0.96]` —
  exactly 0.96, never below 0.95.
- Icon state swaps cross-fade (`opacity` + `scale(0.25→1)` + `blur(4px→0)`),
  both icons in the DOM — never unmount/remount.

## 4 · Interruptibility

- Rapidly-triggered or reversible UI (toggles, toasts, expand/collapse, hover)
  uses CSS **transitions**, not keyframes — transitions retarget mid-flight,
  keyframes restart from zero.
- Keyframes are reserved for one-shot sequences (confetti, fb-* feedback
  grammar, skeleton shimmer).
- Enter-on-mount without JS: `@starting-style`.
- Asymmetric timing: user-deliberate phases (hold-to-confirm) animate slower;
  the system's response snaps.

## 5 · Performance

- Animate **`transform` and `opacity` only**. Layout properties
  (width/height/top/left/margin) are off-budget; use transforms
  (`translateY(100%)` = own height) or `clip-path`.
- **`transition: all` is banned** — name the properties
  (`transition-property: transform, opacity`).
- `will-change` only for transform/opacity/filter, only after observing
  first-frame stutter.
- Transition-time `filter: blur()` stays under 20px.
- Exception already in the system: progress bars animate `width`
  (400ms, DESIGN_SPEC §5) — accepted tradeoff, don't copy the pattern
  elsewhere.

## 6 · Accessibility

- `prefers-reduced-motion` collapses movement globally (globals.css). When
  adding bespoke motion, keep opacity/color feedback under reduced motion —
  fewer and gentler, not zero.
- Hover motion is gated: `@media (hover: hover) and (pointer: fine)` — touch
  fires false hovers on tap.
- Focus rings are never animated away.

## 7 · Group entrances

Infrequent staged entrances (dashboard sections, review summary) stagger
semantic chunks by `--motion-stagger` (60ms, 30–80ms band), capped at ~5 chunks.
Stagger is decorative — it must never block interaction, and never applies to
high-frequency lists (roster updates, chat).

Exits are softer than enters: small fixed `translateY` + fade, `--motion-ease-out`,
shorter than the enter.

## Utilities (globals.css)

| Class | What it does |
|---|---|
| `.btn-pop` (+ `--sun/--clay/--ink/--secondary`) | signature press physics: translateY 2/4px + shadow collapse, 120ms |
| `.press-scale` | flat-control press feedback, `scale(0.96)` @ 120ms |
| `.enter-fade-rise` | one-shot enter: opacity 0→1 + translateY(8px)→0, 200ms ease-out |
| `.stagger-children > *` | staggered `.enter-fade-rise` for up to 6 children, 60ms step |
| `.skeleton` / `.lms-skeleton` | 1.5s linear shimmer; show after 200ms, never a full-page spinner |

## Review checklist

- [ ] No animation on keyboard-initiated or 100+/day actions
- [ ] No `ease-in` on entrances; no bare `ease`/`linear` on entrances
- [ ] No `transition: all`; transforms/opacity only
- [ ] No `scale(0)`; origins from trigger; press = btn-pop or 0.96
- [ ] Rapid UI on transitions, not keyframes
- [ ] Durations within budget; tokens, not literals
- [ ] Reduced-motion and hover-gating respected
- [ ] Motion never the only feedback channel

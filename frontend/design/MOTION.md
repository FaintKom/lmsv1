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
- Press feedback: every pressable uses `.press-scale` — `scale(0.96)`,
  exactly, never below 0.95. The `.btn-pop` shadow-and-drop was removed in v3
  (specs/071).
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
- Progress bars no longer animate `width`: `.progress-fill` scales from the
  left (M2). There is no layout-property exception left in the system.

## 6 · Accessibility

- `prefers-reduced-motion` collapses movement globally (globals.css). When
  adding bespoke motion, keep opacity/color feedback under reduced motion —
  fewer and gentler, not zero.
- A collapsed duration is not the same as no movement: a transform with a
  0.01ms transition still jumps. Anything that moves or scales needs an
  explicit reset under reduced motion (`.press-scale` has one in globals.css).
  For Tailwind lifts, gate the movement instead of resetting it:
  `motion-safe:hover:-translate-y-0.5`. Tailwind 4 moves with the `translate`
  property, so `motion-reduce:transform-none` resets nothing, and
  `motion-reduce:translate-none` loses to the hover rule in the cascade. Both
  passed review and failed `e2e/motion.spec.ts` M5.
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

## 8 · Patterns (v3, specs/071)

Each pattern has a test in `e2e/motion.spec.ts` that runs twice: once with
motion, where it must move, and once under `reducedMotion: 'reduce'`, where it
must not move or scale. Details and the test for each: 
`specs/071-design-system-v2/contracts/motion.md`.

| Id | Where | What | Time, curve |
|---|---|---|---|
| M2 | `ProgressBar` | `.progress-fill` grows by `scaleX` from 0 on first paint (`@starting-style`) | slow, ease-out-strong |
| M3 | every pressable | `.press-scale`: `scale(0.96)` on `:active` | fast, ease |
| M4a | exercise result, correct | the existing `fb-pop` on `.lf-fb-icon` and on correct pieces, curve `--motion-ease-spring` | 300–400ms × `--mdur` |
| M4b | exercise answer, wrong | the existing `fb-shake`, amplitude × `--mamp`; the hint text carries the meaning | 400ms × `--mdur` |
| M4c | XP for a correct answer | **deferred**: the submission response does not say how much XP it earned, and the page will not guess | — |

The exercise feedback grammar (`fb-*` in globals.css) already covered 44
widget types before v3; M4 names it rather than adding a second one. Its two
knobs are the reduced-motion switch: `--mdur` scales every duration,
`--mamp` every amplitude, and `--mamp` is 0 under `prefers-reduced-motion`,
so no shake, lift or tilt moves while colour and text still change.
| M5 | course card, tile | lifts 2px on hover, pointer devices only | fast, ease |
| M6 | block menu in the builder | scales .96→1 from its button | base, ease-out-strong |
| M7 | new block in the builder | rises 8px, green wash fades | base, ease-out |
| M8 | toast | in from below on the drawer curve, out faster | base / fast |
| M9 | student home | sections in with a 60ms step, max 5, first visit only | base |
| M10 | catalog filter | View Transition reflows the grid | base, ease-out |

### View Transitions: reflows only

`document.startViewTransition` blocks input while it captures the old frame:
a second click inside the 200ms is lost, and `::view-transition
{ pointer-events: none }` does not bring it back. In a hidden tab the update
callback waits for a frame that never comes, so nothing changes at all. Both
were found on the specs/071 prototype.

So: a View Transition only where the movement carries meaning and the action
is occasional (M10). Never on navigation, theme switching, or anything done
tens of times a day. Guard every call with `!document.hidden`, and
`skipTransition()` one that is already running. The ratchet rule `vt-nav`
fails any call outside its allow-list.

## Utilities (globals.css)

| Class | What it does |
|---|---|
| `.press-scale` | press feedback, `scale(0.96)` @ 120ms, none under reduced motion; also carries the colour transitions, see the layering note below |
| `.progress-fill` | M2: `scaleX(var(--p))` from the left, grows from 0 on first paint; used by `components/ui/progress-bar.tsx` |
| `.enter-fade-rise` | one-shot enter: opacity 0→1 + translateY(8px)→0, 200ms ease-out |
| `.stagger-children > *` | staggered `.enter-fade-rise` for up to 6 children, 60ms step |
| `.skeleton` / `.lms-skeleton` | 1.5s linear shimmer; show after 200ms, never a full-page spinner |

### Two traps in these utilities

**They do not stack on `transform`.** `.press-scale:active` sets
`scale(0.96)`; a hover lift on the same element sets `translateY`. Same
property, same element — one silently wins. Put the lift on a wrapper.

**`globals.css` declares no `@layer`,** so everything in it is unlayered and
beats Tailwind's layered utilities regardless of source order. A utility that
sets `transition-property` there will override `transition-colors` on the same
element and make hover snap. Any new motion utility must therefore list every
property it should not break — that is why `.press-scale` transitions colours
as well as transform.

## Review checklist

- [ ] No animation on keyboard-initiated or 100+/day actions
- [ ] No `ease-in` on entrances; no bare `ease`/`linear` on entrances
- [ ] No `transition: all`; transforms/opacity only
- [ ] No `scale(0)`; origins from trigger; press = `.press-scale` (0.96)
- [ ] No View Transition outside the reflow allow-list
- [ ] New pattern listed in §8 with a test in `e2e/motion.spec.ts`, both modes
- [ ] Rapid UI on transitions, not keyframes
- [ ] Durations within budget; tokens, not literals
- [ ] Reduced-motion and hover-gating respected
- [ ] Motion never the only feedback channel

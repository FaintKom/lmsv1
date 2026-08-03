# 021 — Lift the exercise motion system into the design system

- **Status**: TODO
- **Commit**: 8aababd
- **Severity**: MEDIUM (no user-visible bug; it is the rule set future
  exercises will be built against)
- **Category**: design-system v2 · motion
- **Estimated scope**: mostly documentation + ~4 CSS consolidations. No widget
  rewrites.

## Problem

The richest motion in the product is the exercise-widget system
(`.fb-*`, `.gp-*`, `.lf-*` in `frontend/src/app/globals.css`, referenced by 39
`.tsx` files under `components/exercises/`). It is 25 keyframes covering wrong
answers, matches, card decks, confetti and typing indicators, and it is better
engineered than the general system: every duration multiplies `--mdur` and
every displacement multiplies `--mamp` (`globals.css:1080`), so the whole
vocabulary can be damped from one place.

But it exists **outside** the design system:

- `frontend/design/MOTION.md` does not mention it. A model building the next
  exercise type reads MOTION.md, finds three general utilities, and invents its
  own keyframes — which is exactly how this file grew to 25.
- Nothing states what each animation *means*. `fb-shake` is "wrong answer" and
  `fb-settle` is "dropped into place", but that is only discoverable by reading
  call sites.
- The vocabulary already duplicated itself:

  | duplicate | definition | scales with `--mamp`/`--mdur`? |
  |---|---|---|
  | `fb-pop` (`:1565`) | `0.25 → 1+0.18 → 1` | yes |
  | `gp-pop` (`:1058`) | `0.6 → 1.15 → 1`, fixed 400ms | **no** |
  | `fb-bump` (`:1570`) | `1 → 1+0.22 → 1` | yes |
  | `gp-pulse-heart` (`:1065`) | `1 → 1.4 → 1`, fixed 500ms | **no** |

  Two pairs, same semantics, and the `gp-` half ignores the damping knobs — so
  "reduce motion" reduces half the vocabulary.

## Target

### 1. Document the vocabulary in `frontend/design/MOTION.md`

Add a section **"Exercise motion vocabulary"** with a semantic table. Read each
keyframe in `globals.css` before writing its row — describe what it does, not
what its name suggests:

| meaning | animation | typical trigger |
|---|---|---|
| wrong answer | `fb-shake` | a submitted answer is rejected |
| appear with overshoot | `fb-pop` | a new chip/icon enters |
| attention bump on something already present | `fb-bump` | counter increments |
| settled into place | `fb-settle` | a dragged item lands |
| candidate / awaiting input | `fb-halo` | the slot the learner should fill |
| accepted | `fb-ripple-g`, `fb-slot-flash` | correct drop |
| connection drawn | `fb-line-draw`, `fb-line-fade`, `fb-dash-flow` | matching pairs |
| deck advance | `fb-card-enter` / `fb-card-exit` | flashcards |
| conversational | `fb-bubble-in`, `fb-typing-bounce` | dialogue steppers |
| celebration | `gp-fall` (confetti), `gp-pop` | task solved |
| life lost | `gp-pulse-heart` | attempt consumed |

Then state the rule the owner asked for, plainly:

> New exercise types pick an animation from this table. Adding a keyframe means
> adding a row here in the same PR, with its meaning — otherwise the next
> author cannot know it exists and will invent a third `pop`.

### 2. Document the damping contract

`--mamp` (amplitude, default 1) and `--mdur` (duration, default 1) are the
system's real accessibility lever and are currently undocumented. Write:

- every exercise animation must express displacement as
  `calc(<px> * var(--mamp))` and duration as `calc(<s> * var(--mdur))`;
- `--mamp: 0` must leave a still, readable UI (no displacement), which is a
  gentler degrade than the global `prefers-reduced-motion` block at
  `globals.css:384` that flattens everything to `0.01ms`.

### 3. Consolidate the four duplicates

- `gp-pop` → delete the keyframe, point `.gp-pop` at `fb-pop`.
- `gp-pulse-heart` → delete, point `.gp-heart-loss` and
  `.lf-hearts .hrt.popping` at `fb-bump`.

Both replacements are visually close (overshoot 1.15 vs 1.18, 1.4 vs 1.22) and
the amplitude difference is the point: the survivors respect `--mamp`. If the
heart pulse looks too weak at 1.22, raise `fb-bump` rather than reviving a
second keyframe — but check the other `fb-bump` call sites first.

### 4. Cross-link both directions

- `MOTION.md` gains a pointer to `globals.css` where the vocabulary lives.
- The `/* ---------- fb keyframes ---------- */` comment block in `globals.css`
  (`:1557`) gains a one-line pointer back to MOTION.md.

## Repo conventions to follow

- `frontend/design/` holds the design system's prose; `globals.css` holds the
  implementation. Do not duplicate the CSS into the docs — reference it by
  section, since the CSS is the source of truth.
- Keyframe names stay as they are. Renaming `fb-*` would touch 39 widget files
  for no user-visible gain.

## Steps

1. Read `globals.css:1049-1080` and `:1557-1655` — the `gp-` and `fb-` blocks.
2. Read enough call sites under `components/exercises/v2/` to confirm each
   animation's actual meaning (at minimum: one shake, one halo, one line-draw).
3. Write the two MOTION.md sections.
4. Do the two keyframe consolidations.
5. Verification.

## Boundaries

- No widget rewrites, no renames, no new animations.
- Do NOT change `--mamp`/`--mdur` defaults — only document them.
- Do NOT touch the general utilities (`.press-scale`, `.enter-fade-rise`) —
  plan 020 owns those.

## Verification

- **Mechanical**: `npm run build`; then
  `grep -c "gp-pop\|gp-pulse-heart" frontend/src/app/globals.css` shows only
  the class selectors, not the deleted keyframes.
- **Feel check**: open an exercise that pops (`arithmetic-puzzle-v2`), one that
  shakes on a wrong answer (`card-sort-v2`), and one with hearts
  (`.lf-hearts`): the consolidated animations look the same as before, and
  setting `--mamp: 0` in devtools stills them without freezing the layout.
- **Done when**: MOTION.md describes the vocabulary and the damping contract,
  the two duplicate keyframes are gone, and a reader who has never seen the
  exercise widgets can pick the right animation from the table alone.

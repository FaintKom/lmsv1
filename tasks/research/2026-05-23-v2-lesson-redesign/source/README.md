# GrassLMS · Exercise types redesign · handoff package

40 polished interactive prototypes for every exercise type in the LMS,
designed in the Duolingo-style posture using the GrassLMS Lively design system.

## What's in this archive

| File | What it is |
|---|---|
| **`SPEC.md`** | Full integration spec — every task type with config schema, UI, and use cases. Start here. |
| **`NEW.md`** | What's actually new vs. your existing `lmsv1` codebase — backend changes, schema additions, new types. |
| **`index.html`** | Open in a browser — interactive canvas with all 40 prototypes laid out. Pan, zoom, click into any artboard. |
| `tokens.css` | GrassLMS design tokens (drop-in replacement for the @theme block in `frontend/src/app/globals.css`) |
| `shell.jsx` | `LessonShell` component + `useConfetti()` hook + icon set — shared chrome |
| `app.jsx` | Wires all components into the design canvas (handoff visualization only — not for ship) |
| `design-canvas.jsx` | Canvas wrapper (handoff only) |
| `q-basics.jsx` | 7 quiz-family exercises |
| `q-language.jsx` | 8 language exercises |
| `q-programming.jsx` | 4 programming exercises (code · web · robot · world) |
| `q-math.jsx` | 6 base math exercises |
| `q-math-templates.jsx` | 11 interactive math templates · Venn has 3 modes |
| `q-other.jsx` | 3 misc (map · file · scorm) |
| `q-fullscreen.jsx` | Wide 16:9 fullscreen variants for Robot 2D / World 3D / SCORM |
| `q-theory.jsx` | New **theory** content type — inline · fullscreen · mobile · teacher upload card |
| `q-mobile.jsx` | iPhone-sized variants of canonical types (Replit-style code editor included) |

## How to read it

1. **Open `index.html` in a browser** — pan and zoom around the canvas, click any artboard's expand icon (top-right ↗) to focus it fullscreen. Every prototype is interactive — pick answers, drag tiles, run code, drop pins, get feedback with confetti.
2. **Read `NEW.md`** — short list of what's actually new to your codebase, with migration code.
3. **Read `SPEC.md`** — full reference. Each task type has config schema, UI behavior, and the source file/component to lift.

## How to ship it

`SPEC.md §9` has the suggested 6-phase rollout order. TL;DR:
- Phase 1: Quiz family (biggest visual win, smallest backend churn)
- Phase 2: Language family
- Phase 3: Code + Robot fullscreen (with new `repeat` blocks)
- Phase 4: Math + 11 templates
- Phase 5: Map, file, SCORM fullscreen, **theory** (new)
- Phase 6: Mobile PWA polish

The components are pure React 18 with no external deps beyond Monaco (which you already use). Drop them into your existing tree, swap the renderer cases in `exercise-renderer.tsx`, done.

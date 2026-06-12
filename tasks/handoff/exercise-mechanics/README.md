# Handoff: Exercise Mechanics V2 — UX/UI Overhaul (GrassLMS · lmsv1)

## Overview

This package documents a full UX/UI audit and redesign of the **39 V2 exercise mechanics** in
`FaintKom/lmsv1` (`frontend/src/components/exercises/v2/*` + the shared
`frontend/src/components/lesson/lesson-shell.tsx` chrome). The goals, in priority order:

1. **Kid-friendly clarity (ages 7–14)** — legible status, gentle error handling, no unfair heart losses.
2. **Rich interaction feedback** — micro-animations on every action, celebratory success, three-tone feedback.
3. **Real adaptiveness** — every mechanic usable at a 320 px-wide container, by touch, mouse, and keyboard.

The work shipped as a live playground (`Exercise Playground.html`) where every fix can be
experienced interactively, plus six severity-rated audit documents (~130 findings, 17 outright bugs).

**→ `FIX_MAP.md` in this folder is the implementation map: every fix → its production file → what to change.**

## About the Design Files

The files in this bundle are **design references created in HTML** — working prototypes that show
intended look and behavior. They are NOT production code to copy directly. The task is to
**re-apply each documented fix to the existing React/TypeScript components in lmsv1**, keeping the
codebase's established patterns (Tailwind 4 tokens in `globals.css`, the `.lf-*`/`.gp-*`/`.fb-*`
class grammar, `V2GradeFn` server-grading contract, LessonShell composition).

The playground components were deliberately written as close ports of the production components —
same class names, same CSS variables, same state shapes — so most fixes translate 1:1.

## Fidelity

**High-fidelity.** The playground uses the production design tokens verbatim (copied from
`frontend/src/app/globals.css`): Manrope / Geist Mono, the green/sun/coral/ink palettes, the
shadow-pop button physics, the `--mamp`/`--mdur` animation dials. Visual output in the playground
is the target visual output in production.

## Structure of this bundle

| Path | What it is |
|---|---|
| `FIX_MAP.md` | **The core artifact.** Fix-by-fix map to production files, ranked by priority. |
| `Exercise Playground.html` + `playground/` | Live reference implementation of all 39 mechanics. Open in a browser. |
| `audits/UX Audit — Exercises Batch 1…6.html` | Full audit documents with reasoning per finding. Batch 6 contains the series summary. |

## How to use the playground while implementing

- Sidebar → pick a mechanic → scenarios cover the edge cases named in the audits
  (long text, duplicates, dense data, empty config).
- Width switcher (Desktop / 768 / 390 / 320) exercises the container-query behavior.
- Tweaks panel drives `--mamp`/`--mdur` (playfulness), confetti, hearts pool, deferred/instant
  grading, and a network simulator (slow/flaky) for the async/error states.

## Approved defaults (settle these as production config)

These were reviewed and approved by the design owner:

| Setting | Default | Implementation note |
|---|---|---|
| Playfulness | **playful** (`--mamp: 1.45`, `--mdur: 1.2`) | Expose as a per-context dial: `calm` (0.5/0.7) for assessments, `normal` (1/1), `playful` (1.45/1.2) default for lessons. Reduced-motion clamp overrides all. |
| Confetti | **on** | Keep a kill-switch (assessment mode). |
| Hearts per task | **3** | Uniform across mechanics — replaces `pairs.length`-derived pools (MT-04). TrueFalse is the exception candidate: 1 heart (TF-02). |
| Grading | **deferred** | For matching/categorize: child completes everything, then checks. Instant mode stays as an authoring option. |
| Server sim | off | Playground-only tool; not a production setting. |

## Design principles to encode in the design system

1. **Meaning first, form coached** — case, punctuation, accents, single typos, equivalent numeric
   forms never cost a heart; they earn a gentle note.
2. **Three tones, always** — green = success · coral = a miss · grey "meh" = the system hiccuped
   (network/config; never the child's fault, never costs hearts or streak).
3. **The answer is sacred** — never visible in any channel (tiles, placeholders, ARIA, DOM attrs)
   while retries remain.
4. **Retries protect progress** — correct parts lock green and become untouchable; the feedback
   sheet leads with the win ("3 of 5 right").
5. **Every drag has a tap twin** — tap-to-arm → tap-target is simultaneously the touch fallback,
   keyboard path, and screen-reader path.
6. **Check is earned, never free** — disabled until first interaction; a blocked press wiggles and
   explains ("Pick an answer first") instead of dead-clicking.
7. **Feedback names the dial, not the direction** — "the slope is off" guides; "go higher" solves.
8. **Playfulness is a dial** — all animation amplitudes/durations route through `--mamp`/`--mdur`.

## Design Tokens

All tokens already exist in `frontend/src/app/globals.css` — the playground introduced **no new
token values**. New CSS it did introduce (port these classes/keyframes from `playground/grass.css`):
`.lf-reveal`, `.lf-hearts .hrt`, `.gp-spin`, `.gp-checkhint`, `.gp-tile.eliminated`,
`.lf-bottom.notice` / `.lf-fb-icon.meh`, `.fb-pad` (resized), `.fb-marker-bubble`, `.fb-tick.sparse`,
`.fb-bubble-*` (dialogue), `.cw-*` (crossword), `.fb-card3d`/`.fb-rate`/`.fb-dots` (flashcards),
`.tb-input` (table cells), `.gx-layout`/`.gx-svg`/`.fb-pt` (graphs), `.cc-grid`, `.fb-beam`/`.fb-pan`
(balance), and the container-query block at the bottom of the file.

## State Management

No new global state. Per-mechanic additions are local component state, all demonstrated in the
playground ports: `eliminated[]` (remembered wrong picks), `lockedOk` (retry locks), `checking`
(async grading), `announce` (aria-live strings), undo stacks (equation balance). The shared retry
behavior is a candidate for one `useRetryContract()` hook — see FIX_MAP §0.

## Assets

No binary assets. All icons are inline SVG; the island map in the map-pin scenario is inline SVG
demo content (production uses real map content from the exercise config).

## Implementation order

Work through `FIX_MAP.md` top-down: §1 touch-blocking bugs → §2 answer leaks → §3 unsolvable
configs → §4 container queries → §5 shared retry contract → §6 keyboard paths → then per-file
polish. Sections 1–3 are child-facing breakage and should ship first.

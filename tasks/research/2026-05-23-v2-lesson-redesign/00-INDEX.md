# V2 Lesson Redesign — Duolingo-style chrome adoption

**Date:** 2026-05-23
**Source:** "GrassLMS · Exercise types redesign · handoff package" (40 prototypes, design canvas, integration spec)
**Status:** Phase 1A landed (`LessonShell`, CSS, `QuizV2`, demo route). 7+ phases remaining.

---

## Why this exists

The handoff package contains 40 polished interactive prototypes for every exercise type in the LMS. Visual posture is **Duolingo-style** — one exercise per screen, progress bar / hearts / streak chrome on top, big green shadow-pop CTA on bottom, green/coral feedback sheet that swaps in after submit. Adopting it touches:

- Every exercise renderer in `frontend/src/components/exercises/`
- The student lesson player (currently multi-block per page → must become one-block-at-a-time for the chrome to make sense)
- New CSS classes `.lf-*` and `.gp-*` (already added to `globals.css`)
- New `LessonShell` / `FeedbackSheet` / `useConfetti` primitives (already in `components/lesson/`)
- One brand-new content type: **theory** (PDF/PPTX/Keynote/Google Slides slide block)
- New Blockly **repeat N [...]** block for Robot 2D
- Two new Venn modes: **elements** and **text**
- `FULLSCREEN_TYPES` set extended with `theory` + `scorm_package`
- Hearts/heart-loss animation + confetti hook
- Mobile-PWA variants (custom code keyboard, etc.)

Tokens match — colour palette already identical between repo `globals.css` and the package's `tokens.css`.

---

## Phase plan

Each phase = its own PR. Order is the package's suggested rollout (SPEC §9).

| Phase | What | PR status |
|---|---|---|
| **1A** | Foundation: `globals.css` (`.lf-*` / `.gp-*`), `LessonShell`, `FeedbackSheet`, `useConfetti`, `QuizV2`, demo route `/admin/preview/v2-quiz` | **landed** |
| 1B | Wire V2 chrome into 6 remaining quiz-family types (`true_false`, `fill_blanks`, `matching`, `ordering`, `categorize`, `bubble_sheet`) | pending |
| 2 | Language family (8 types — `translation`, `sentence_builder` canonical Duolingo, `dialogue`, `conjugation`, `reading`, `crossword`, `word_search`, `srs_flashcard`) | pending |
| 3 | Programming family: `code_challenge` new editor split, **Robot 2D fullscreen + `repeat` block**, World 3D fullscreen | pending |
| 4 | Math: 6 base types + 11 interactive templates (one at a time) — start with `function_graph` + `scatter_plot` | pending |
| 5 | Other: `map_pin_drop`, `file_upload`, SCORM fullscreen, **theory** content type (backend table + worker + endpoints + 4 UI variants) | pending |
| 6 | Mobile PWA polish: code keyboard, mobile sentence builder, mobile theory | pending |
| 7 | Lesson player refactor — move student `(dashboard)/courses/[id]/lessons/[id]` to step-by-step Duolingo mode (one block per view, prev/next arrows, completion screen) | pending |

---

## What's actually NEW to the backend (from `NEW.md`)

| Item | Phase | Notes |
|---|---|---|
| `theory_blocks` table + `block_type` enum extended | 5 | Alembic migration + worker for PPTX→PDF (LibreOffice headless or CloudConvert) |
| `POST /api/theory-blocks`, `GET /api/theory-blocks/:id` | 5 | Multipart upload OR URL paste |
| Google Slides URL → embed URL converter (one regex) | 5 | Pure stateless util |
| `repeat` Blockly block in custom-blocks.ts + step-executor wrapping | 3 | Big UX win for advanced robot levels |
| `mode` field on Venn template config | 4 | Two new modes: `elements` (drag items into regions), `text` (free-text per region) |
| `loses_heart_on_wrong: boolean` on Exercise | 1A or 1B | Default true; false for `code_challenge`, `web_editor`, `robot_2d`, `world_3d`, `srs_flashcard`, `file_upload`, `scorm_package`, `theory` |
| `FULLSCREEN_TYPES` extended with `theory` + `scorm_package` | 5 | One-line set update + `defaultFullscreen: true` flag |

Everything else is frontend-only.

---

## File map (source package)

Stored verbatim at `tasks/research/2026-05-23-v2-lesson-redesign/source/`. Each file's role:

| Source | Role | Used by phase |
|---|---|---|
| `README.md`, `NEW.md`, `SPEC.md` | Docs — read these first | All |
| `tokens.css` | Design tokens (already match repo `globals.css`) | 1A (no-op) |
| `shell.jsx` | LessonShell + FeedbackSheet + useConfetti reference | 1A (ported) |
| `index.html` | Global CSS for `.lf-*` / `.gp-*` chrome | 1A (ported) |
| `q-basics.jsx` | 7 quiz family components | 1A (Quiz), 1B (rest) |
| `q-language.jsx` | 8 language components | 2 |
| `q-programming.jsx` | 4 programming components | 3 |
| `q-math.jsx` | 6 base math components | 4 |
| `q-math-templates.jsx` | 11 math template components (Venn 3 modes) | 4 |
| `q-other.jsx` | map, file, scorm | 5 |
| `q-fullscreen.jsx` | Robot/World/SCORM fullscreen variants | 3, 5 |
| `q-theory.jsx` | New theory content type — 4 variants | 5 |
| `q-mobile.jsx` | iPhone-sized variants (code keyboard etc.) | 6 |
| `app.jsx`, `design-canvas.jsx` | Canvas wrapper — handoff only, not shipped | — |

---

## Phase 1A — what landed (this PR)

- `frontend/src/app/globals.css` — appended `.lf-*` + `.gp-*` + animations (~190 lines)
- `frontend/src/components/lesson/lesson-shell.tsx` — `LessonShell`, `FeedbackSheet`, `useConfetti` (TS port of `shell.jsx`)
- `frontend/src/components/exercises/v2/quiz-v2.tsx` — `<QuizV2>` reading existing question shape, one-question-at-a-time, hearts + feedback
- `frontend/src/app/(admin)/admin/preview/v2-quiz/page.tsx` — demo route at `/admin/preview/v2-quiz` (hardcoded 3-question sample)
- Source package preserved at `tasks/research/2026-05-23-v2-lesson-redesign/source/`

### What to look at on prod after deploy

`https://grasslms.online/admin/preview/v2-quiz` (login as teacher first). Try:
- Pick an option (tile turns green-tinted)
- Click Check → green feedback sheet swaps in + confetti
- Click Continue → next question
- Pick wrong on next → coral feedback + heart-pulse animation + reveals correct answer
- Top × button bound to demo alert (will wire to navigation in production)

### What is NOT touched

- `exercise-renderer.tsx` — legacy renderer still runs everywhere. Nothing in the student lesson view changes.
- `QuizTaker` and per-type builders — untouched.
- No backend changes.

This is **infrastructure + proof**. Apply the same pattern to other 39 types in the following phases.

---

## Phase 1B brief (next session)

Replicate the QuizV2 pattern for the 6 remaining quiz-family types:
- `true_false` — two big shadow-pop tiles (True / False) over a centered statement card
- `fill_blanks` — sentence with underlined slots + bank of word pills, tap to place / tap to remove
- `matching` — 2×N grid, tap left then tap right to pair; correct match green permanent, wrong flashes coral
- `ordering` — draggable list, grip icon, number badges
- `categorize` — bucket containers above, unsorted pills below, drag pill into bucket (each bucket tinted)
- `bubble_sheet` — per-question row of A/B/C/D bubble buttons

Each gets its own `frontend/src/components/exercises/v2/<type>-v2.tsx` and a demo route in `/admin/preview/v2-*`. After all 7 are validated, swap the seven `case "..."` arms in `exercise-renderer.tsx` to call the V2 components and retire the legacy ones.

Risk: the legacy renderer assumes multi-block per page. V2 wants one-block-at-a-time. Phase 7 refactors the student lesson player; until then, V2 lives behind the preview routes only.

---

## Open questions

- [ ] Should V2 ship behind a feature flag (per-org rollout) or as a hard switch?
- [ ] Hearts persistence — local component state today; production needs `user.hearts` in backend (`POST /api/v1/users/me/lose-heart` or computed from attempts)
- [ ] Streak — already in `app/gamification/` module? Need to check + wire
- [ ] Theory blocks: server-side PPTX→PDF conversion — CloudConvert is paid; LibreOffice headless adds 200MB+ to backend container

# 016 — Conductor v2: lesson programme editor (reorder / hide steps)

- **Status**: TODO
- **Commit**: a01d106
- **Severity**: LOW (enhancement; v1 works)
- **Category**: live lessons
- **Estimated scope**: 1 page (teacher live console), ~150 lines; no backend

## Problem

Conductor v1 (shipped 2026-08-02) auto-builds the lesson programme as
`[material, ...its exercises]` and walks it with ‹/›. Teachers cannot
reorder steps, skip an exercise, or insert a board step. Source:
`frontend/src/app/(admin)/admin/live/[lessonId]/page.tsx` — the
"conductor" section:

- `steps` useMemo builds `[{kind:"material",id}, ...exercises.map(e =>
  ({kind:"task",id,title}))]` from `programExs` (a `useQuery` keyed
  `["live", lessonId, "program", materialLessonId]`).
- `goStep(idx)` pushes the scene for `steps[idx]`; `liveStepIndex` derives
  the highlighted position from `currentScene`; ArrowLeft/Right hotkeys.

## Target

Client-side programme editing (session-local state, NO persistence — the
programme is rebuilt per lesson; persistence is a later decision):

1. New state `programme` initialised from the auto-built `steps` whenever
   `materialLessonId`/`programExs` changes (keep auto-sync UNLESS the
   teacher has edited — then keep their edit for the session; a "Reset"
   action restores auto).
2. Editor UI: a small popover/panel opened from a `ListOrdered` (lucide)
   icon button next to the ‹ 2/5 › navigator:
   - rows = steps: icon (BookOpen for material, Puzzle for task) + title +
     per-row controls: move up (`ChevronUp`), move down (`ChevronDown`),
     hide/show toggle (`Eye`/`EyeOff`).
   - hidden steps stay in the list (dimmed, `opacity-50`) but are SKIPPED by
     goStep/next/prev navigation and excluded from the "n/m" counter.
   - "+ Board" button appends `{kind:"board"}` — when navigated to, it
     invokes the existing `switchToBoard` logic (reuses `lastBoard`).
   - "Reset" restores the auto programme.
   - Panel chrome: `rounded-md border border-border bg-surface shadow-md
     p-2`, rows `h-9 rounded-sm hover:bg-surface-2`; design-system modal/
     popover spec (DESIGN_SPEC §9); close on Esc and outside click.
3. Navigation (`goStep`, canNext/canPrev, hotkeys, `liveStepIndex`) all
   operate on the VISIBLE programme (filter hidden before indexing).
4. No drag-and-drop — up/down buttons only (dnd is out of scope).

i18n keys ×6 locales: `live.programme` (Programme / Программа),
`live.programmeReset` (Reset / Сбросить), `live.programmeAddBoard`
(+ Board / + Доска), `live.stepHidden` (Hidden / Скрыто). es: Programa /
Restablecer / + Pizarra / Oculto · tr: Program / Sıfırla / + Tahta / Gizli ·
de: Programm / Zurücksetzen / + Tafel / Ausgeblendet · uk: Програма /
Скинути / + Дошка / Приховано.

## Repo conventions to follow

- This page already has modal + hotkey patterns (End-lesson modal,
  ArrowLeft/Right guards for INPUT/TEXTAREA and open modals) — extend the
  same guards so the editor popover blocks the arrow hotkeys while open.
- Hooks MUST stay above the early returns in this component (React #310
  regression happened here before — see the comment near the conductor
  block). New hooks go next to the existing conductor hooks.
- Icons: lucide, 16px in rows.

## Steps

1. Read the whole conductor section of the page (state, goStep, hotkeys).
2. Add `programme` state + visible-steps derivation; rewire goStep/counter.
3. Build the editor popover UI.
4. Add board-step handling via `switchToBoard`.
5. i18n ×6.
6. Verification.

## Boundaries

- No backend/schema changes; no persistence of the programme.
- No drag-and-drop libraries.
- Do NOT break the v1 auto-programme default (zero-edit path must behave
  exactly as today).
- Hotkeys must not fire while the editor panel, End modal, or a picker is
  open.

## Verification

- **Mechanical**: `npx tsc --noEmit && npm test && npm run build` green.
- **Feel check** (live lesson with the QA course):
  - Default flow identical to v1 (‹/› walks material→tasks).
  - Hide a task → counter shrinks, ‹/› skips it, students never receive its
    scene.
  - Move a task up → order respected in navigation.
  - + Board step → navigating to it broadcasts the board scene (same board
    as `switchToBoard`).
  - Reset restores the auto list.
  - Arrow keys do nothing while the panel is open.
- **Done when**: teacher can reorder/hide/insert-board without breaking the
  zero-edit default.

# Live Player — Full Exercise-Type Coverage (Plan 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every exercise type works in the live `task` scene (owner decision 2026-07-23). Path A confirmed by investigation: reuse `ExerciseRenderer` — the universal, server-graded player already serving all 24 types on the regular lesson page.

**Architecture:** Live `TaskPane` renders `V2ExerciseLive` for the three polished V2 live types (unchanged) and falls back to `ExerciseRenderer` for everything else. The live submit hook is already type-agnostic; only the `/upload` endpoint needs the same hook. Answer-strip audit hardens `_strip_answers` for non-V2 configs. Draft capture extends to the high-value typing types (code, web, text).

**Tech Stack:** existing — no new deps.

**Investigation facts (verified in code, 2026-07-24):**
- `frontend/src/components/exercises/exercise-renderer.tsx` (1140 lines) — switch over ALL 24 `exercise_type`s; fetches `/exercises/{id}/attempts` on mount; submits to `POST /exercises/{id}/submit` (all types) or `POST /exercises/{id}/upload` (file_upload); fullscreen for `robot_2d|math_interactive|world_3d`; default export, props `{ exercise, courseId?, prevLesson?, nextLesson? }` — nav props optional.
- `backend/app/exercises/service.py:495-517` — `submit_exercise` grades server-side per type: `_submit_quiz` / `_submit_code` / `_submit_game_level` / `_submit_web_editor` / `_submit_interactive` (matching, ordering, fill_blanks, true_false, categorize, translation, sentence_builder, dialogue, conjugation, reading).
- `GET /exercises/{id}` (router.py:139) strips answers for students via `_strip_answers` (router.py Helpers) — strips `is_correct`, `correct_answer` (questions), hidden test cases, and config keys `solution_code|correct_order|blanks|correct_answer`.
- Live submit hook (P1-T11) sits in `submit_exercise_endpoint` — fires for ALL types already. `upload_file_endpoint` (router.py:~289) has NO hook.
- Reveal-on-max-attempts: `service.py:369-410` reads per-type answer keys — the authoritative list of what the grader knows: `math_interactive` (expected), `quiz` (questions), `matching`, `ordering` (correct_order), `fill_blanks` (blanks), `true_false` (correct_answer).

Run backend commands from `backend/`, frontend from `frontend/`.

---

### Task 1: Live TaskPane → universal player

**Files:**
- Modify: `frontend/src/components/live/scene-view.tsx` (TaskPane)

- [ ] **Step 1:** In `TaskPane`, keep `V2ExerciseLive` for V2 live types and fall back to `ExerciseRenderer` otherwise:

```tsx
import ExerciseRenderer from "@/components/exercises/exercise-renderer";
import { isV2LiveType } from "@/lib/exercises/v2-adapter";
```

Replace the interactive return branch:

```tsx
  if (isV2LiveType(exercise.exercise_type)) {
    return (
      <V2ExerciseLive key={exercise.id} exercise={exercise} onAnswersChange={handleAnswers} />
    );
  }
  return (
    <div className="mx-auto h-full max-w-[880px] overflow-y-auto p-4">
      <ExerciseRenderer key={exercise.id} exercise={exercise as never} />
    </div>
  );
```

Check `isV2LiveType` exact export name in `frontend/src/lib/exercises/v2-adapter.ts` (used by the lesson page at its line 581) and the `Exercise` type ExerciseRenderer expects — the `GET /exercises/{id}` response (with stripped `questions`/`test_cases`) is exactly what the lesson page passes today.

- [ ] **Step 2:** `npx tsc --noEmit` clean.

- [ ] **Step 3:** Manual check (local stack from the smoke setup): teacher assigns a `quiz` and a `code_challenge` from the picker → student's live page renders them; submit works; teacher progress grid updates via the existing SSE `submission` event.

- [ ] **Step 4: Commit** — `feat(live-frontend): all exercise types in live task scene via ExerciseRenderer`

---

### Task 2: Submission hook for the /upload endpoint

**Files:**
- Modify: `backend/app/exercises/router.py` (`upload_file_endpoint`)
- Test: `backend/tests/test_live_lessons.py` (append)

- [ ] **Step 1: Failing test** — mirror `test_submission_event_published_and_progress`, but create a `file_upload` exercise (`make_exercise(db, lesson_row.id, org.id, exercise_type=ExerciseType.file_upload)`), student heartbeats, then POSTs `/exercises/{ex.id}/upload` with a small text file (`files={"file": ("a.txt", b"hi", "text/plain")}` httpx multipart); assert a `submission` envelope arrives on the lesson channel.

- [ ] **Step 2:** Copy the try/except hook block from `submit_exercise_endpoint` into `upload_file_endpoint` right after `submission = await upload_file_submission(...)` (same payload fields; `passed`/`score` may be None for ungraded uploads — fine, the event schema allows null).

- [ ] **Step 3:** Test passes; run the four live test files. **Step 4: Commit** — `feat(live-lessons): publish submission event from file uploads`

---

### Task 3: Answer-strip audit for non-V2 configs

**Files:**
- Modify: `backend/app/exercises/router.py` (`_strip_answers`)
- Test: `backend/tests/test_exercise_stripping.py` (create)

The grader is the source of truth: any config key read by `service.py` grading/reveal code (`_submit_interactive`, `_submit_game_level`, `_submit_web_editor`, reveal block at 369-410) is an answer and must not reach students.

- [ ] **Step 1:** Grep the graders and enumerate the keys they read per type (do this first, in code — the list below is the starting hypothesis to VERIFY, not final truth):
  - matching: `pairs` / question-based
  - categorize: `categories` item→bucket mapping
  - translation/conjugation/dialogue/sentence_builder/reading: `correct_answer(s)` / `expected`
  - math_interactive: `expected`
  - math_stepwise: `steps` solutions
  - crossword / word_search: `words`/`solution` grids
  - map_pin_drop: target coordinates
  - bubble_sheet: answer key
  - web_editor: `expected_output` / checks

- [ ] **Step 2: Failing tests** — one parametrized test over a `(exercise_type, leaked_key, config)` table: build the exercise via `make_exercise(..., exercise_type=..., config={...})`, GET as `student` → key absent; GET as `teacher` → key present.

- [ ] **Step 3:** Extend the strip set in `_strip_answers` config handling with the verified keys. Keep the existing `word_bank` reconstruction behaviour intact (fill_blanks / sentence_builder renderers depend on it); where a renderer needs a derived safe value, derive it the same way.

- [ ] **Step 4:** Full exercises test files + the new one green. **Step 5: Commit** — `fix(exercises): strip answer keys from all exercise-type configs for students`

Note: this hardens the REGULAR lesson page too (same endpoint) — not live-specific, which is why it ships here as a proper fix rather than a live-only patch.

---

### Task 4: Draft capture for typing types (code / web / text)

**Files:**
- Modify: `frontend/src/components/exercises/exercise-renderer.tsx` (+ the code/web/text child components it renders — identify exact files in Step 1)
- Modify: `frontend/src/components/live/scene-view.tsx` (thread `onAnswersChange` into ExerciseRenderer)

- [ ] **Step 1:** Read the renderer switch (lines 498-694) and find the child components for `code_challenge` (Monaco), `web_editor`, `translation`, `dialogue`. Each holds the in-progress value in local state.

- [ ] **Step 2:** Add optional `onAnswersChange?: (a: Record<string, unknown>) => void` to ExerciseRenderer props and those four children; call on editor/text change with the SAME shape their submit uses (`{source_code, language}` for code, `{web_code: {html,css,js}}` for web, `{interactive_answers: ...}` for text types). Click-only types stay untouched (low draft value — established v1 decision).

- [ ] **Step 3:** In live `TaskPane`, pass the existing throttled `handleAnswers` into ExerciseRenderer. Route code into the draft's `source_code` column: `saveDraft(exerciseId, answers, (answers as {source_code?: string}).source_code)` — teacher drawer then shows code as code.

- [ ] **Step 4:** `npx tsc --noEmit && npx vitest run` green. Manual: student types code in live task → teacher drawer shows the draft within ~10s (GET-polling path from Plan 2 — no server changes).

- [ ] **Step 5: Commit** — `feat(live-frontend): draft capture for code/web/text exercises`

---

### Task 5: Verification + docs

- [ ] **Step 1:** Full gates: backend `pytest tests/ -q` + ruff; frontend tsc/vitest/lint/build.
- [ ] **Step 2:** Local smoke (stack from Plan 2 smoke): assign quiz, code_challenge, matching in a live lesson; verify render+submit+grid for each; code draft visible in drawer.
- [ ] **Step 3:** Docs: tick the Plan-3 milestone in `docs/superpowers/specs/2026-07-23-live-lesson-mode-design.md` §13; update `tasks/todo.md` (Plans 1+2 deployed 2026-07-24, Plan 3 status).
- [ ] **Step 4: Commit** — `docs: live player full-type coverage shipped`

---

## Explicitly out of scope (unchanged backlog)
Projector-window token refresh after 30-min idle (SSE 401 reconnect loop for passive clients); classroomscreen widgets; Jitsi; collaborative board; global draft autosave; invites for students added mid-lesson.

## Self-review notes
- Path A everywhere; no Path B (V2_LIVE_TYPES extension) needed — V2ExerciseLive stays exactly for its 3 polished types.
- Biggest real work = Task 3 audit; its parametrized test table forces enumeration instead of guessing.
- ExerciseRenderer nav props optional — verified at the props interface (renderer lines 161-166); no lesson-nav coupling enters the live scene.

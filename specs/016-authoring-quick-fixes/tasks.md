# Tasks: Authoring Quick Fixes

**Input**: Design documents from `specs/016-authoring-quick-fixes/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md

**Tests**: included — the constitution (principle II) requires tests that can
fail for every guard/behaviour this fix pins down.

**Organization**: four independent user stories; no setup or foundational
phase is needed — the app, endpoints and test harnesses all exist.

## Phase 1: Setup

None. Existing app; no new dependencies, no migrations, no scaffolding.

## Phase 2: Foundational

None. The four stories share no new infrastructure and touch disjoint files.

---

## Phase 3: User Story 1 - Change a course's picture (Priority: P1) 🎯 MVP

**Goal**: teacher sets/replaces/removes the course picture from the course
editor; card reflects it.

**Independent Test**: quickstart.md §By hand 1.

- [ ] T001 [P] [US1] Backend regression test in backend/tests/test_courses_thumbnail.py:
      PATCH sets `thumbnail_url`, PATCH `null` clears it, absent field leaves
      it unchanged, cross-org PATCH → 404 **with positive control** (own-org
      PATCH succeeds in the same test). Run against real PostgreSQL.
- [ ] T002 [P] [US1] Add i18n keys for the thumbnail control (label, upload,
      replace, remove, upload-failed) to all six files
      frontend/src/lib/i18n/locales/{en,es,ru,tr,de,uk}.ts.
- [ ] T003 [US1] Thumbnail control in
      frontend/src/app/(admin)/admin/courses/[courseId]/edit/page.tsx:
      preview + hidden file input → POST /courses/upload-image → PATCH
      `{thumbnail_url}`; remove → PATCH `{thumbnail_url: null}`; wire into
      the existing course-settings save flow (depends on T002).
- [ ] T004 [US1] Verify frontend/src/components/courses/course-card.tsx
      degrades gracefully on a broken image URL (fallback, not broken-image
      icon); fix only if it does not.

**Checkpoint**: story 1 fully testable via quickstart §1.

---

## Phase 4: User Story 2 - Return to the course after editing an exercise (Priority: P1)

**Goal**: back controls in the exercise editor return to the origin (course
or library).

**Independent Test**: quickstart.md §By hand 2.

- [ ] T005 [P] [US2] Pure helper `backTarget(courseId: string | null)` (valid
      UUID → `/admin/courses/{id}/edit`, else `/admin/content-library`) +
      Vitest beside it, in
      frontend/src/app/(admin)/admin/content-library/[exerciseId]/back-target.ts
      and back-target.test.ts.
- [ ] T006 [US2] Use the helper for every hardcoded
      `router.push("/admin/content-library")` back control in
      frontend/src/app/(admin)/admin/content-library/[exerciseId]/page.tsx
      (header back, not-found back); read `courseId` via useSearchParams;
      propagate the param on the submissions link so back works from there
      too (depends on T005).
- [ ] T007 [P] [US2] Append `?courseId=${courseId}` to both exercise-editor
      links in
      frontend/src/app/(admin)/admin/courses/[courseId]/edit/page.tsx
      (lines ~1359 and ~2132).
- [ ] T008 [US2] FR-004: confirm the course editor page shows a usable state
      (not a dead end) for a deleted/missing course; if it dead-ends, add an
      escape link to /admin/courses in the same page.

**Checkpoint**: stories 1–2 independently testable.

---

## Phase 5: User Story 3 - Legible number-line letters (Priority: P2)

**Goal**: marker letters readable at 100% zoom in all marker states.

**Independent Test**: quickstart.md §By hand 3.

- [ ] T009 [P] [US3] In
      frontend/src/components/game/math/templates/number-line.tsx enlarge the
      marker triangle (~×1.3) and the letter (≥12px bold) with dark stroke via
      `paint-order: stroke`; bump the value label to 11–12px; verify visually
      in unchecked/correct/incorrect states.

---

## Phase 6: User Story 4 - Each template listed once (Priority: P2)

**Goal**: picker shows every math template exactly once; legacy content keeps
working.

**Independent Test**: quickstart.md §By hand 4.

- [ ] T010 [P] [US4] Vitest in
      frontend/src/components/game/math/template-registry.test.ts:
      (a) TEMPLATE_LIST labels are unique — MUST fail against current code;
      (b) each alias key (function_graphing, graph_transformation,
      inequality_graphing, card_sorting) resolves in MATH_TEMPLATES to the
      same component as its canonical twin. Record the pre-fix failure in the
      PR body (constitution II).
- [ ] T011 [US4] In frontend/src/components/game/math/template-registry.ts
      exclude the four alias keys (plus custom_html) from TEMPLATE_LIST;
      keep MATH_TEMPLATES intact (depends on T010 red first).

---

## Phase 7: Polish & Verification

- [ ] T012 Frontend gates locally: `npx tsc --noEmit`, `npm test`
      (six-locale parity included), `npm run build`; backend:
      `pytest tests/test_courses_thumbnail.py -v` against real PostgreSQL.
- [ ] T013 Browser pass on the QA stack per quickstart.md; screenshots of all
      four fixes for the PR body.
- [ ] T014 Mark этап 1 done in tasks/feedback-2026-08-19-authoring.md after
      merge + prod verification.

---

## Dependencies & Execution Order

- No setup/foundational phases; all four stories start immediately and touch
  disjoint files, except US1/US2 both edit the course edit page (T003 vs
  T007 — sequence them or merge carefully).
- Within US1: T002 → T003; T001, T004 parallel.
- Within US2: T005 → T006; T007 parallel; T008 anytime.
- Within US4: T010 (red) → T011 (green).
- Polish (T012–T014) after all stories.

## Parallel Example

T001, T005, T009, T010 — four different files, no shared state; run together.

## Implementation Strategy

Single PR: the stories are too small to ship separately and share one review
context. MVP cut, if ever needed, is US1+US2 (the two P1s). Commit per story
(4 commits) so each fix is revertable alone.

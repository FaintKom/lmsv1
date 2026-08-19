# Implementation Plan: Authoring Quick Fixes

**Branch**: `fix/authoring-quick-fixes` | **Date**: 2026-08-19 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/016-authoring-quick-fixes/spec.md`

## Summary

Four independent authoring bugs, all grounded in code before this plan was
written. Three are frontend-only; one gets a backend regression test on an
endpoint that already works. No new dependencies, no migrations, no new
endpoints.

1. **Course picture** — `Course.thumbnail_url` exists, `CourseUpdate` accepts
   it ([schemas.py:18](../../backend/app/courses/schemas.py)), `update_course`
   applies it with `exclude_unset=True` ([service.py:204](../../backend/app/courses/service.py)),
   the card renders it — but the course editor UI never exposes it. Fix: a
   thumbnail control on the course edit page that uploads via the existing
   `POST /courses/upload-image` and PATCHes `thumbnail_url` (null to remove).
2. **Back goes to Content Library** — the exercise editor hardcodes
   `router.push("/admin/content-library")` in its back controls
   ([content-library/[exerciseId]/page.tsx:163,175](../../frontend/src/app/(admin)/admin/content-library/[exerciseId]/page.tsx)).
   The course editor links into it with no context
   ([courses/[courseId]/edit/page.tsx:1359,2132](../../frontend/src/app/(admin)/admin/courses/[courseId]/edit/page.tsx)).
   Fix: pass the origin course id as a query parameter; back controls derive
   their target from it, defaulting to the library.
3. **Number-line letters illegible** — 9px white text inside an 18px-wide
   triangle ([number-line.tsx:140-141](../../frontend/src/components/game/math/templates/number-line.tsx)).
   Fix: larger triangle + larger letter with contrast-preserving outline.
4. **Duplicate picker entries** — `MATH_TEMPLATES` carries four legacy alias
   keys "for backward compatibility with seed data"
   ([template-registry.ts:198-230](../../frontend/src/components/game/math/template-registry.ts)),
   and `TEMPLATE_LIST` filters out only `custom_html`, so Function Graph,
   Graph Transformations, Inequality Graph and Card Sort each appear twice in
   the picker (`math-editor.tsx` is the only consumer). Fix: exclude aliases
   from `TEMPLATE_LIST`; keep them in `MATH_TEMPLATES` so saved content still
   resolves.

## Technical Context

**Language/Version**: TypeScript 5 strict / React 19 / Next.js 16 (frontend);
Python 3.12 / FastAPI (backend — tests only)

**Primary Dependencies**: existing only — TanStack Query, axios apiClient,
lucide-react. No new packages.

**Storage**: none touched. `thumbnail_url` column exists; no migration.

**Testing**: Vitest (registry dedupe, back-target derivation), pytest
(thumbnail PATCH set/clear + cross-org 404), manual browser verification via
QA stack for the visual fix.

**Target Platform**: web (admin authoring UI + student exercise renderer)

**Project Type**: web application (frontend + backend)

**Performance Goals**: n/a — no hot paths touched

**Constraints**: no new i18n keys without all six locales; no tokens in
localStorage; smallest diffs that close each bug

**Scale/Scope**: 4 bugs, ~5 frontend files, 1 backend test file

## Constitution Check

*GATE: evaluated against constitution v1.0.0.*

- **I. Tenant isolation** — PASS. No new id crosses a trust boundary. The
  course-picture PATCH rides the existing `get_course` + `_check_course_owner`
  guard; the new pytest asserts cross-org PATCH reads as 404 **with a
  positive control** (own-org PATCH succeeds) per the isolation-test lesson.
  The `courseId` query parameter drives client-side navigation only — it
  fetches nothing by itself.
- **II. Tests that can fail** — PASS. Registry test fails on today's code
  (duplicates present); thumbnail test fails if the field stops persisting;
  back-target unit test fails on today's hardcoded value. Each will be
  demonstrated against pre-fix behaviour.
- **III. Server is the only judge** — PASS. Grading untouched; alias removal
  is picker-only (FR-007), renderer keeps resolving legacy type names.
- **IV. Product/docs tell one story** — PASS. No advertised claims change.
- **V. Smallest change** — PASS. Reuses existing upload endpoint and PATCH;
  deletes nothing that has a reader; adds no abstraction.

No violations; Complexity Tracking not needed.

## Project Structure

### Documentation (this feature)

```text
specs/016-authoring-quick-fixes/
├── spec.md
├── plan.md              # this file
├── research.md          # decisions per bug
├── data-model.md        # touched fields (no schema changes)
├── quickstart.md        # validation walkthrough
├── contracts/api.md     # existing endpoints relied upon
└── tasks.md             # /speckit-tasks output
```

### Source Code (repository root)

```text
frontend/src/
├── app/(admin)/admin/courses/[courseId]/edit/page.tsx   # thumbnail control; pass courseId in editor links
├── app/(admin)/admin/content-library/[exerciseId]/page.tsx  # back-target from query param
├── components/game/math/template-registry.ts            # TEMPLATE_LIST excludes aliases
├── components/game/math/templates/number-line.tsx       # legible marker letters
└── lib/i18n/locales/{en,es,ru,tr,de,uk}.ts              # new keys for thumbnail control (all six)

backend/tests/
└── test_courses_thumbnail.py                            # PATCH set/clear + cross-org 404 with positive control
```

**Structure Decision**: existing web-app layout; no new directories.

## Design notes per bug

### 1. Course picture

- Course edit page already loads and PATCHes the course; add a thumbnail
  section to the course settings block: preview (or default placeholder),
  "upload" via hidden file input → `POST /courses/upload-image` (same wiring
  as [block-editor.tsx:369](../../frontend/src/components/editor/block-editor.tsx)) →
  PATCH `{thumbnail_url: url}`; "remove" → PATCH `{thumbnail_url: null}`
  (`exclude_unset=True` keeps absent ≠ null semantics).
- Broken-link edge case is already the card's problem: `course-card.tsx`
  falls back when the image fails; verify, don't rebuild.
- i18n: new UI strings added to all six locales (CI parity gate).

### 2. Back to the course

- Course editor's two `<a href="/admin/content-library/${id}">` links gain
  `?courseId=${courseId}` (links stay new-tab; the param travels with the URL,
  covering the new-tab edge case by construction).
- Exercise editor derives its back target with a small pure helper
  (`backTarget(courseId: string | null): string`): valid UUID →
  `/admin/courses/{courseId}/edit`, anything else → `/admin/content-library`.
  Unit-tested; UUID check keeps arbitrary strings out of the path.
- All three hardcoded `router.push("/admin/content-library")` call sites use
  the helper (back arrow, not-found screen; the submissions button keeps its
  own target but passes the param through so back still works from there —
  verified during implementation).
- Deleted-course fallback (FR-004): the course editor's own missing-course
  state is the surface; if it renders a dead end today, it gets a
  "back to courses" escape as part of this fix — checked during
  implementation, not assumed.

### 3. Number-line letters

- Triangle grows (≈ ×1.3), letter goes to ≥12px bold with
  `paintOrder: stroke` + dark stroke so white glyphs survive light marker
  fills and the success/danger states. Value label above the marker bumps to
  11–12px. Judged by eye against the acceptance scenario (spec assumption).

### 4. Deduplicated picker

- `TEMPLATE_LIST` filter excludes a named alias set
  (`function_graphing`, `graph_transformation`, `inequality_graphing`,
  `card_sorting`) alongside `custom_html`. `MATH_TEMPLATES` keeps the alias
  entries so legacy content resolves (FR-007).
- Vitest: (a) `TEMPLATE_LIST` labels are unique — fails on today's code;
  (b) every alias key still resolves in `MATH_TEMPLATES` to the same
  component as its canonical twin.

## Verification

- Vitest + tsc + build + six-locale parity gate (CI).
- pytest against real PostgreSQL for the thumbnail test (CI + locally before
  push, per feedback_ci).
- Browser pass on the QA stack: set/replace/remove a course picture; open an
  exercise from a course and return; view a number-line exercise; open the
  math template picker. Screenshots into the PR.

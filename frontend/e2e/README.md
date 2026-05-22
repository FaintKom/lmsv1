# E2E Tests (Playwright)

Browser-level end-to-end tests. These run a real Chromium against a
running GrassLMS deployment and exercise the actual UI.

## Run locally

Start the dev server first:

```bash
npm run dev
# in another terminal:
npm run test:e2e
```

Or run against prod:

```bash
PLAYWRIGHT_BASE_URL=https://204-168-165-41.nip.io npm run test:e2e
```

## Run unit / component tests instead

```bash
npm test
```

Unit tests live in `src/**/*.test.ts(x)` and use Vitest + jsdom.

## What goes here vs in vitest?

- **Vitest** (unit/component):
  - Pure functions (utils, translations parity, validators)
  - React components in isolation with mocked deps
  - Fast, run in parallel on every commit via CI

- **Playwright** (e2e):
  - Full flows that cross client + server (login, register, buy a
    plan, complete a lesson)
  - Anything that needs a real browser (layout, navigation,
    third-party embeds)
  - Slower; run less often but still in CI on PRs to main

## Adding a test

1. Create `e2e/<feature>.spec.ts`.
2. Each test should be self-contained: no reliance on data created by
   other tests. Use the backend directly (via fetch) to seed/cleanup
   if needed, not by clicking through other tests.
3. Keep each smoke test under 10 seconds. Long flows go in their own
   file, not `smoke.spec.ts`.

## QA harness layout

The QA system (see `docs/superpowers/specs/2026-05-22-qa-system-design.md`)
adds these subdirectories:

- `e2e/poms/` - Page Object Models (LoginPage, CourseEditorPage,
  ExerciseRendererPage). Spec files import these instead of clicking
  selectors directly so a UI rewrite touches one POM, not 20 specs.
- `e2e/registry/exercise-types.ts` - declarative registry of all 24
  exercise types, sourced from `qa/exercise-fixtures.json` (the same
  file `scripts/seed_qa.py` consumes).
- `e2e/exercises/lifecycle.spec.ts` - parameterised over the registry:
  creates each exercise type via API, submits, asserts non-5xx.
- `e2e/roles/` - one happy-path file per role (student / teacher /
  methodist / admin).
- `e2e/auth.spec.ts` - login form, redirect, API token.

Smoke runs (PR): tests tagged `@smoke`. Full runs (nightly): every test.

## Quarantine

Tests tagged `@quarantine` in the title still run (so they don't
bit-rot) but failures don't block the PR. Add to `quarantine.ts` for
visibility. File a GitHub issue every time and reference it in the
inline comment. Goal: empty quarantine at release.

Example:

```typescript
test("flaky thing @quarantine", async ({ page }) => { ... });
```

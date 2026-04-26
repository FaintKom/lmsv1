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

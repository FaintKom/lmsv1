# QA System Design — GrassLMS

**Date:** 2026-05-22
**Status:** Approved (pending user review)
**Owner:** FaintKom
**Goal:** Release-readiness via automated regression coverage of role flows and all 24 exercise types.

---

## 1. Problem

GrassLMS has grown to 24 exercise types, 4 user roles (student / teacher / methodist / admin), and dozens of cross-cutting features (auth, RBAC, grading, certificates, knowledge module). Existing test coverage is fragmented:

- `backend/tests/*.py` — pytest suite covers most backend modules in isolation, but no end-to-end role journeys.
- `frontend/e2e/{smoke,rbac}.spec.ts` — two Playwright files only. No coverage of exercise lifecycle, no per-role full journeys.
- No CI job runs e2e on PRs. `ci.yml` runs unit-tests + lint only.
- No staging environment is reachable as of 2026-05-22 (`staging.grasslms.online` returns 000). All tests must run in ephemeral environments.

Result: regressions in role flows or exercise rendering are caught by users, not CI. Adding a new exercise type requires manual smoke-testing on prod, which is unsafe and inconsistent.

## 2. Goals

- **Automated** end-to-end regression coverage for every role and every exercise type.
- **Repeatable** in CI (PR + nightly) and locally via one command.
- **Extensible** — adding a new exercise type requires adding one entry to a declarative registry, not authoring a new test from scratch.
- **Release-blocking** — failure of auth flow or any exercise lifecycle test red-lights the PR.
- **No reliance on staging or prod.** Ephemeral docker compose in GitHub Actions runner.

## 3. Non-goals

- Billing / Stripe coverage (deferred until monetization is enabled).
- Performance / load testing (separate effort).
- Visual regression (Percy / Chromatic) — not required for release.
- Cross-browser (Firefox / Safari / Edge) — Chromium only until a real user-reported browser-specific bug exists.
- Mobile viewport coverage (separate sprint).
- Manual QA checklists — user explicitly requested fully automated coverage.

## 4. Architecture

```
.github/workflows/qa.yml                  ← new CI workflow (PR + nightly cron + manual dispatch)
└── runs on ubuntu-latest GitHub runner
    ├── docker compose -f docker-compose.qa.yml up -d --wait
    │   ├── db (pgvector/pgvector:pg16, tmpfs volume)
    │   ├── backend (FastAPI + sandbox container linked)
    │   ├── frontend (Next.js production build)
    │   └── redis
    ├── alembic upgrade head (inside backend container)
    ├── python scripts/seed_qa.py (creates deterministic test data)
    ├── pytest backend/tests/role_flows/   ← API-level role journeys
    └── npx playwright test (inside frontend/)
        ├── poms/                          ← Page Object Model classes
        ├── registry/exercise-types.ts     ← declarative spec for 24 types
        ├── exercises/lifecycle.spec.ts    ← parameterized × 24 types
        ├── roles/{student,teacher,methodist,admin}.spec.ts
        └── auth.spec.ts                   ← login, refresh, logout, RBAC sanity
```

Two independent layers of automated tests:

| Layer | Tooling | Speed | Catches |
|---|---|---|---|
| Backend role flows | pytest + httpx | ~30-60 sec | RBAC, business logic, API contract regressions |
| Frontend e2e | Playwright + Chromium | ~5-7 min smoke / ~12-15 min full | UI rendering, integration bugs, broken submit flows |

Both layers run against the same ephemeral docker compose stack.

## 5. Components

### 5.1 `docker-compose.qa.yml` (new)

Derived from `docker-compose.prod.yml` with these differences:

- Drop `cloudflared` and `nginx` services. Frontend exposes 3000 directly on the runner's loopback. Backend exposes 8000.
- Drop `backups` volume mount.
- DB uses tmpfs volume (`/var/lib/postgresql/data` on tmpfs) — ephemeral, fast, no disk persistence required for CI.
- All environment via `.env.qa` checked into the repo. Contains only deterministic non-secret values (e.g., `JWT_SECRET=qa-jwt-secret-not-for-prod`, `SUPER_ADMIN_EMAIL=qa-admin@test.local`, Stripe/Voyage env values pointing to placeholder strings since those features are disabled in QA).
- Healthchecks on backend (`GET /health` returns 200) and frontend (`GET /` returns 200) so `--wait` blocks until ready.

### 5.2 `scripts/seed_qa.py` (new)

Idempotent script run inside the backend container after `alembic upgrade head`.

Creates:
- **4 users** with deterministic UUIDs via `uuid.uuid5(NAMESPACE_QA, "qa-student")` etc.
  - `qa-student@test.local`, `qa-teacher@test.local`, `qa-methodist@test.local`, `qa-admin@test.local`
  - All share password `QaTest2026!`
- **1 organization** `qa-org` (deterministic UUID).
- **1 course** `qa-course` with 1 module and 1 lesson, owned by `qa-teacher`.
- **24 exercises**, one of each type from `ExerciseType` enum, with `minimalConfig` loaded from `qa/exercise-fixtures.json` (the shared fixture file, see 5.3).
- Enrollment of `qa-student` into `qa-course`.

Idempotent: running twice does not create duplicates (uses `INSERT ... ON CONFLICT DO NOTHING` patterns or upserts by deterministic UUID).

Exit codes: 0 = success, non-zero = abort CI before tests run.

### 5.3 `frontend/e2e/registry/exercise-types.ts` (new — keystone)

Declarative spec for all 24 exercise types. Single source of truth for the frontend e2e layer.

```typescript
export interface ExerciseTypeSpec {
  type: ExerciseType;
  label: string;
  minimalConfig: Record<string, unknown>;
  sampleCorrectAnswer: unknown;
  sampleWrongAnswer: unknown;
  expectedCorrectScore: number;        // typically 100
  rendererSelector: string;            // data-testid expected on student view
  submitSelector: string;
  skipReason?: string;                 // optional: skip with documented reason
}

export const EXERCISE_REGISTRY: ExerciseTypeSpec[] = [
  { type: "quiz", label: "Quiz", minimalConfig: { ... }, ... },
  // ... 23 more entries, one per ExerciseType
];
```

A companion JSON file `qa/exercise-fixtures.json` holds the same `minimalConfig` data as machine-readable input for `seed_qa.py`. Sync between TS registry and JSON fixtures is enforced by a unit test that asserts the two files have the same set of types and identical `minimalConfig` shapes.

### 5.4 `frontend/e2e/poms/` (new — Page Object Model)

Thin wrappers over Playwright `Page` for each major UI surface:

- `LoginPage.ts` — `loginAs(role: "student"|"teacher"|"methodist"|"admin")`. Performs `POST /api/v1/auth/login` directly and sets the resulting tokens in `localStorage` via `page.addInitScript`, then navigates to the role's default landing page. Bypasses the UI login form for speed and stability; the form itself is covered by `auth.spec.ts`.
- `CourseEditorPage.ts` — `addExercise(type, config)`, `gotoExercise(id)`, `deleteExercise(id)`.
- `ExerciseRendererPage.ts` — `goto(exerciseId)`, `submitAnswer(answer)`, `getScore()`, `getFeedback()`.
- `GradebookPage.ts` — `getSubmissionScore(studentId, exerciseId)`.
- `KnowledgePage.ts` — `search(query)`, `getResults()`.

POM classes contain selectors and interaction primitives. Tests contain assertions and flow logic. When UI changes, only the POM is updated; tests remain stable.

### 5.5 `frontend/e2e/exercises/lifecycle.spec.ts` (new — parameterized)

```typescript
for (const spec of EXERCISE_REGISTRY) {
  test.describe(spec.type, () => {
    test.skip(!!spec.skipReason, spec.skipReason ?? "");

    test("teacher creates → student renders → submits correct → score 100", async ({ browser }) => {
      // teacher context: create via API
      // student context: render + submit + assert score
    });

    test("submits wrong answer → score < 100", async ({ browser }) => {
      // student context: submit wrong, assert score lower than expectedCorrectScore
    });
  });
}
```

48 test entries generated automatically from the 24-entry registry. Sharded across Playwright workers.

### 5.6 `frontend/e2e/roles/` (new — full role journeys)

One file per role. Each file = one happy-path scenario from login to a feature endpoint visible to that role.

- `student.spec.ts`: login → list courses → enter `qa-course` → open lesson → complete exercise → see progress increment → trigger certificate generation when course is complete.
- `teacher.spec.ts`: login → create new course → add module → add lesson → add quiz exercise → switch to student context → submit → switch back → see submission in gradebook → manual override grade.
- `methodist.spec.ts`: login → open knowledge module → search → view entry detail → create new knowledge entry → verify it appears in search.
- `admin.spec.ts`: login → user management page → create user → view org list → switch org context → view analytics dashboard.

### 5.7 `backend/tests/role_flows/` (new — pytest API layer)

API-level mirror of the role journeys, running 10x faster than the UI tests. Uses the existing `conftest.py` httpx client.

- `test_student_journey.py`
- `test_teacher_journey.py`
- `test_methodist_journey.py`
- `test_admin_journey.py`
- `test_rbac_matrix.py` — parameterized over `(role, critical_endpoint)` pairs, asserts expected 200 / 403 / 404. Covers ~20 critical endpoints × 4 roles = 80 quick assertions in under 5 seconds.

### 5.8 `frontend/e2e/auth.spec.ts` (new)

Dedicated to login form UI, refresh-token rotation correctness (regression for 2026-05-04 incident), logout, RBAC redirect on protected routes.

### 5.9 `.github/workflows/qa.yml` (new)

```yaml
name: QA
on:
  pull_request: { branches: [main] }
  schedule: [{ cron: "0 3 * * *" }]   # 03:00 UTC nightly
  workflow_dispatch: {}

concurrency:
  group: qa-${{ github.ref }}
  cancel-in-progress: true

jobs:
  qa:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
      - name: Start QA stack
        run: docker compose -f docker-compose.qa.yml up -d --wait
      - name: Apply migrations
        run: docker compose -f docker-compose.qa.yml exec -T backend alembic upgrade head
      - name: Seed QA data
        run: docker compose -f docker-compose.qa.yml exec -T backend python scripts/seed_qa.py
      - name: Backend role-flow tests
        run: docker compose -f docker-compose.qa.yml exec -T backend pytest tests/role_flows/ -v
      - uses: actions/setup-node@v4
        with: { node-version: "20" }
      - name: Install frontend deps
        working-directory: frontend
        run: npm ci --legacy-peer-deps
      - name: Install Playwright browsers
        working-directory: frontend
        run: npx playwright install --with-deps chromium
      - name: Run Playwright suite
        working-directory: frontend
        env: { PLAYWRIGHT_BASE_URL: "http://localhost:3000" }
        run: npx playwright test ${{ github.event_name == 'pull_request' && '--grep @smoke' || '' }}
      - name: Upload Playwright report
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: frontend/playwright-report/
          retention-days: 7
      - name: Stop stack
        if: always()
        run: docker compose -f docker-compose.qa.yml down -v
```

PR runs only `@smoke`-tagged tests (~5-7 min). Nightly runs the full suite including deep tests on top-5 exercise types (~12-15 min).

## 6. Data flow

**A successful CI run, end-to-end:**

1. Runner checks out the branch.
2. `docker compose up -d --wait` (~90 sec): db, backend, frontend, redis come up. Healthchecks gate readiness.
3. Alembic migrations applied to the empty DB.
4. `seed_qa.py` creates the 4 users, 1 org, 1 course, 24 exercises, 1 enrollment. Deterministic UUIDs via `uuid.uuid5` so tests can reference them without round-tripping to the DB.
5. **Backend pytest** runs (`tests/role_flows/`). If this fails, the job exits without launching Playwright — saves 10 minutes of compute on a clearly broken build.
6. **Playwright** runs in 4 parallel workers:
   - Workers 1-2: `exercises/lifecycle.spec.ts` (48 tests, sharded automatically)
   - Worker 3: `roles/student.spec.ts` + `roles/teacher.spec.ts`
   - Worker 4: `roles/methodist.spec.ts` + `roles/admin.spec.ts` + `auth.spec.ts`
7. On failure: HTML report, screenshots, video, and trace files are uploaded as a GitHub Actions artifact (retention 7 days).
8. `docker compose down -v` cleans up.

**Within a single exercise lifecycle test:**

```
Teacher context (browser A):
  POST /api/v1/auth/login (qa-teacher) → store tokens in localStorage
  POST /api/v1/exercises { type, config } → exerciseId

Student context (browser B):
  POST /api/v1/auth/login (qa-student) → store tokens
  GET /lessons/{lessonId} → wait for ExerciseRenderer with data-testid={spec.rendererSelector}
  click submitSelector after filling form per spec.sampleCorrectAnswer
  poll GET /api/v1/exercises/{exerciseId}/submissions/me until score is set
  expect(score).toBe(spec.expectedCorrectScore)
```

Two browser contexts run on one page each, no cross-context state leakage. Backend is shared.

## 7. Error handling and stability

**Anti-flake rules:**

- No `page.waitForTimeout(ms)` anywhere. Only `waitForSelector` / `waitForResponse` / `expect(...).toBeVisible()` with Playwright's auto-wait.
- Retries: `retries: process.env.CI ? 2 : 0`. Tests that pass on retry are flagged `flaky` in the report but do not fail the build. Tests flaky 3+ runs in a row get added to the quarantine list and an issue filed manually.
- Trace and video are `retain-on-failure` only. Artifacts are uploaded only when the job fails, keeping CI storage usage low.
- A `quarantine.ts` file exports an array of test titles. Tests tagged `@quarantine` are excluded from the failing set but reported separately in the workflow summary. Quarantine count is a release-gate metric — aim for zero before tagging a release.
- Healthcheck poll loop: after `docker compose up --wait`, an additional `curl --retry 10 --retry-delay 3 http://localhost:3000` step confirms Next.js has finished its initial server build. Without this, Playwright connects before the app is ready and fails with empty pages.
- Seed failure aborts the workflow with exit 1 before any tests run. A cascade of "user not found" errors is harder to diagnose than a single seed traceback.

**Out of scope for error handling:**

- Third-party network flake — there are no third-party calls in the QA stack (Stripe disabled, Voyage embedding calls mocked at the seed layer or skipped entirely).
- DB concurrency between workers — each test operates on data either seeded or created within its own browser context; mutations are isolated by `student_id` on the `submissions` table.

## 8. Testing strategy (what is covered and at what depth)

### Smoke set (PR + nightly, ~5-7 min)

Every PR runs this. Tagged `@smoke` in Playwright.

- All 24 exercise types: create → render → submit correct → verify score.
- All 24 exercise types: submit wrong → verify score < 100.
- Auth flow: login, refresh, logout, RBAC redirect on protected route.
- One happy-path per role (login → land on default page → click one key feature).
- Backend pytest `tests/role_flows/` (all of it — fast enough to run on every PR).

### Full set (nightly only, ~12-15 min)

Includes smoke + the items below.

- Deep coverage of top-5 exercise types: `quiz`, `code_challenge`, `fill_blanks`, `matching`, `math_stepwise`.
  - Edge cases: empty config rejection, max-length text, KaTeX in question text, special characters.
  - Multi-question variants (3+ questions per exercise where supported).
  - Max-attempts enforcement.
  - Partial credit where the type supports it.
  - `code_challenge`: hidden test cases pass, sandbox timeout returns expected error.
  - `math_stepwise`: SymPy validation per step + final-answer equivalence checking.
- Full role journeys (everything in `roles/` files in depth, not just happy path).

### RBAC matrix (PR, pytest, <5 sec)

`test_rbac_matrix.py` parameterized over `(role, endpoint)` pairs. Critical endpoints: create-course, delete-user, view-gradebook, edit-knowledge, ingest-knowledge, admin-analytics, billing-config (if enabled), org-switch. Expected status codes per role asserted.

### Release-blocking criteria

A PR cannot merge to `main` if any of these fail:

- Any auth or RBAC test
- Any exercise `lifecycle.spec.ts` smoke test (create or submit-correct fails)
- Backend role-flow pytest

Other failures (deep edge cases in nightly) are tracked as issues but do not block PRs.

## 9. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Adding a new exercise type to enum without registry entry | Unit test in registry file asserts `EXERCISE_REGISTRY.length === ExerciseType count` and all types are present. Build fails locally and in CI. |
| Seed script and registry drift out of sync | Single JSON fixture file (`qa/exercise-fixtures.json`) consumed by both. Unit test asserts equality. |
| Playwright tests too slow → developers skip CI | Smoke set capped at 7 min via sharding. Deep tests nightly only. PR comments show timing breakdown. |
| Flaky tests erode trust | Auto-retry + quarantine list + release-gate metric on quarantine count. |
| Docker compose flake on runner | Healthcheck `--wait` + additional curl-retry step + 30-min job timeout (typically completes in 7-15 min). |
| Frontend build time eats CI budget | `docker-compose.qa.yml` uses prebuilt frontend image cached via GitHub Actions cache between runs. |
| Sandbox container privileges in CI | Already runs in prod with restricted profile. CI uses the same compose file values; no privileged mode required. |

## 10. Open questions for implementation phase

These are not architecture decisions but should be resolved during implementation planning:

- Exact set of "critical endpoints" for `test_rbac_matrix.py` — initial list will be derived from `backend/app/*/api.py` requireRole decorators.
- Whether to cache Playwright browser install in CI (saves ~30 sec per run, costs cache storage).
- Whether to cache the docker compose build context between runs (saves ~2 min on cold runs).
- Naming convention for `data-testid` attributes that POMs depend on — likely `{component-kebab}-{purpose}` (e.g., `quiz-renderer`, `quiz-submit`).

## 11. Migration / rollout

1. Land the design doc (this file) and implementation plan.
2. Build `docker-compose.qa.yml` and verify it boots locally.
3. Write `seed_qa.py`, verify against a fresh local stack.
4. Write `EXERCISE_REGISTRY` and `qa/exercise-fixtures.json` for all 24 types — this is the biggest single chunk of work, ~half a day.
5. Write POM classes.
6. Write `exercises/lifecycle.spec.ts`, `auth.spec.ts`, `roles/*.spec.ts`.
7. Write `backend/tests/role_flows/`.
8. Add `.github/workflows/qa.yml`.
9. Run once manually via `workflow_dispatch`, debug, iterate.
10. Open PR. After it goes green, enable as a required check on `main` via branch protection.
11. Add `npm install --legacy-peer-deps` and Playwright browser install to a Dockerfile or cache config to keep CI under 10 minutes.

The whole effort is estimated at 2-4 working days of focused implementation, including debugging the first green run.

## 12. Success metrics

- Time from "new exercise type added to enum" to "covered by QA" = under 30 minutes (one registry entry + one fixture entry).
- PR feedback time (CI green or red) = under 10 minutes for smoke set.
- Quarantine count at release time = 0.
- Number of role-flow regressions caught by users (vs. CI) after rollout = 0 within 3 months.

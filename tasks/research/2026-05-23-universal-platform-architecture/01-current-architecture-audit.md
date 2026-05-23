# Current Architecture Audit — F:\lms (2026-05-23)

Synthesised from three parallel Explore-agent passes: backend, frontend, AI integration readiness.

## Verdict

Above-average SaaS quality. Backend disciplined, frontend cleaner than most Next.js codebases, AI foundations already partially laid. Three architectural items block a full AI lesson-generation pipeline (see end of doc).

---

## Backend (FastAPI async / SQLAlchemy 2 / Postgres 16 + pgvector)

### Module layout
`backend/app/` contains 35+ feature modules following a uniform `models.py / schemas.py / router.py / service.py` layout:

`admin, ai, assessments, assignments, attendance, auth, billing, calendar, certificates, courses, db, discussions, email, exercises, gamification, integrations, knowledge, learning_paths, math_problems, meetings, metered_billing, notifications, orgs, parent, peer_review, plagiarism, progress, recommendations, recording, sandbox, scorm, skills, submissions, team_projects, waitlist, webhooks`.

### Layering
Strong: routers → services → models. Pydantic v2 schemas at boundary. No cross-module imports except via `common/` utilities (rate_limit, file_validation, storage). Database access bottlenecked through `service.py` — routers never touch ORM directly. `AsyncSession` injected via `Depends(get_db)`; commits on success, rolls back on exception.

### Multi-tenancy
Row-level via `org_id` FK on data tables. Isolation enforced explicitly in router/service (`current_user.org_id == resource.org_id` checks). No leakage observed. Pattern consistent across modules.

### Auth
JWT via `python-jose`. Access token 30 min, refresh token with `jti` stored in `refresh_tokens` (revocation list). `get_current_user` dependency validates token, returns `User`. RBAC: enum roles (`super_admin`, `admin`, `teacher`, `student`, `parent`) with explicit checks in routers. Email verification off by default. Bcrypt for passwords.

### Migrations
Alembic autogenerate. Naming: `<6-char-id>_<verb>_<entity>.py`. Operations must be **rerun-safe** (`IF NOT EXISTS`, `ON CONFLICT`) because `_run_setup()` fallback in `main.py:88` duplicates ALTER statements as schema bootstrap. No pure-data migrations observed.

### Tests
pytest + pytest-asyncio (`asyncio_mode="auto"`). Fixtures: `db` (transactional with rollback), `client` (httpx ASGITransport), factory functions. Rate limiter auto-reset between tests. Role flow tests present.

### Background jobs
APScheduler 3.10.0 **in-process only**. Jobs registered in `scheduler.py`, started in `main.py` lifespan after DB ready. **No Celery/Arq.** Single-worker assumption baked in. Rate limiter uses Redis backend in prod, but memory:// in dev.

### Top 3 backend strengths
1. Strict async-first discipline — zero sync code, no `requests`. Proper `AsyncSession` + transactional semantics.
2. Clean feature-module architecture — 35+ modules with enforced layer isolation.
3. Row-level multi-tenancy baked in — `org_id` isolation consistent.

### Top 3 backend weaknesses
1. **In-process scheduler = single-worker bottleneck.** APScheduler cannot scale horizontally. Cron jobs, email batches, report generation block under load. **Critical blocker for AI lesson generation.**
2. No background task queue abstraction — tight coupling to APScheduler makes future migration to Celery/Arq costly. No retry/DLQ pattern.
3. Migration rerun-safety relies on discipline — no tooling to enforce `IF NOT EXISTS`. One careless `op.execute("DROP TABLE")` breaks dev/prod sync.

---

## Frontend (Next.js 16 App Router / React 19 / TS strict / Tailwind 4)

### Route organisation
Route groups `(auth) / (dashboard) / (admin)` cleanly separate concerns without URL pollution. Server Components default; `'use client'` only where state/effects needed. Ratio skews toward Server Components, reducing hydration payload.

### State management
Zustand stores (`src/stores/`) handle global UI state (locale, sidebar, AI tutor context). TanStack Query 5.90.21 manages server state, caching, mutations. **No query results cached in Zustand** — clean separation. Eliminates duplication common in poorly-designed apps.

### API layer
Hand-rolled Axios client (`src/lib/api-client.ts`) with:
- JWT interceptor (lines 71-79)
- **Concurrent 401 refresh prevention via shared `refreshPromise`** (lines 46-69) — prevents token rotation race bugs
- Exponential backoff retry for 429/502/503 with wake-up toast (lines 94-104)
- Automatic `/login` redirect on auth failure (lines 112-129)

Domainised wrappers in `src/lib/api/` — only `exercises.ts` currently exists. Hand-rolled, not OpenAPI-generated.

### Data fetching
Server Components use direct fetch; client-side via TanStack Query hooks. Consistency enforced through API module layer.

### Component library
Custom design system in `frontend/design/`: `tokens.json`, `tokens.css`, `DESIGN_SPEC.md`. Tailwind 4. No shadcn dependency.

### Type safety
TypeScript 5 strict mode. **Hand-rolled types — no OpenAPI codegen.** API types duplicated across frontend/backend (drift risk).

### Editor integration
TipTap 3, Monaco, Three.js + React Three Fiber, Blockly. **All bundled eagerly.** No lazy-load strategy documented.

### i18n
next-intl 4.8 with 6 locales: EN, ES, RU, TR, DE, UK. Single `translations.ts`, 354+ keys. Vitest parity check ensures no orphaned keys.

### Build/test
Next.js 16 `output: "standalone"`, API rewrites to backend. No Turbopack configured. Vitest (jsdom, globals) for unit; Playwright for E2E (`e2e/`, `widget-tests/`). CI retries 2, workers 4.

### Top 3 frontend strengths
1. **Auth-refresh excellence** — concurrent 401 refresh dedup; rare in codebases.
2. **Clean state separation** — Zustand UI + TanStack Query server-state with zero redundancy.
3. **Production-grade i18n** — 6 locales, parity validation, single source of truth.

### Top 3 frontend weaknesses
1. **No API codegen.** Hand-rolled types risk drift between FE/BE.
2. **Editor bundle risk.** TipTap + Monaco + Three.js + Blockly bundled eagerly. Likely > 500 KB overhead per editor not used on initial page.
3. **Sparse API layer.** Only `exercises.ts` exists. Onboarding new features requires boilerplate.

---

## AI lesson generation pipeline — what already exists vs what to build

### Already in place
1. **LLM client.** Ollama AsyncClient with streaming (`app/ai/service.py`), SSE router (`app/ai/router.py:28-45`), semaphore-gated, language-aware system prompts (en/ru/es/tr).
2. **Embedding pipeline.** Voyage AI client (`app/knowledge/service.py:41-57`), pgvector storage, hybrid search with facet filtering.
3. **Exercise schema.** 8 validated types (`quiz`, `code_challenge`, `matching`, `ordering`, `fill_blanks`, `true_false`, `categorize`, `file_upload`) with Pydantic configs.
4. **Async infrastructure.** FastAPI 0.115+, async SQLAlchemy 2, asyncpg, httpx.
5. **Rate limiting.** Slowapi + Redis support via `RATE_LIMIT_STORAGE_URI`.
6. **Job scheduling.** APScheduler in `pyproject.toml:23`, configured in `app/scheduler.py` (in-process).

### To build
| Item | Size | Notes |
|---|---|---|
| Lesson generation service | M | 4 LLM calls per lesson (theory + exercises) |
| Output validators with retry | S | Pydantic catches ~80 % of malformed output |
| **Job queue (Celery / Arq)** | **M-L** | **Blocker:** APScheduler won't scale for 30-60 s generation tasks |
| Author/methodist review UI | L | Form + diff + edit-in-place + publish |
| LLM upgrade | S | `qwen2.5:3b` weak; swap to Anthropic Claude 3.5 Sonnet via OpenRouter |
| Token/cost tracking | S | Extend `app/billing/service.py` |
| Frontend SSE consumption | S | Backend SSE ready; FE hook missing |

### Single biggest risk
**Job queue.** APScheduler in-process cannot handle 30-60 s LLM tasks for multiple concurrent users. Must migrate to Celery+Redis or Arq **before** AI pipeline work. Not "we'll do it later" — it's a blocker.

### Effort estimate (MVP for AI lesson generation in current lms)
- Core pipeline: **Medium** (service + validators + queue)
- Author UX: **Large** (frontend build-out)
- Production hardening: **Small** (LLM swap, quota tracking)
- **Total: 4-6 weeks MVP, +2 weeks for Anthropic + billing.**

---

## Three blockers for AI lesson generation

Ranked by severity:

1. **APScheduler in-process → no horizontal scale.** Must introduce Celery/Arq before lesson gen.
2. **No OpenAPI codegen → FE/BE type drift.** Will get worse as more domains added.
3. **Editor bundle eagerness → first-load TTI suffers.** Needs dynamic imports per editor.

Architecture as a whole is ready to accept the AI pipeline without core refactor. The blockers above are surgical, not structural.

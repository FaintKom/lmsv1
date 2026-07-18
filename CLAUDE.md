# GrassLMS — Project Quick Reference

This file is loaded automatically by Claude Code when working in this repo.
For deeper context, read the memory at `~/.claude/projects/F--lms2-9/memory/`
(especially `project_prod_hosting.md` and `feedback_deploy.md`) before
proposing any infrastructure or deploy action.

## Navigation

Project docs are split by audience — load only what you need.

**Auto-loaded when you `cd` into the subfolder (Claude Code reads
`CLAUDE.md` from the current working directory):**
- [`backend/CLAUDE.md`](backend/CLAUDE.md) — async patterns, models, auth,
  migrations workflow, tests, lifespan
- [`frontend/CLAUDE.md`](frontend/CLAUDE.md) — Next.js 16, route groups,
  TanStack Query, i18n, Vitest, Playwright

**Read on demand:**
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — module map, multi-tenancy,
  knowledge RAG pipeline
- [`docs/API_REFERENCE.md`](docs/API_REFERENCE.md) — router index (auth flow,
  rate limits, webhooks)
- [`docs/MIGRATIONS.md`](docs/MIGRATIONS.md) — Alembic recipes + PostgreSQL
  gotchas (enums, pgvector)
- [`docs/TESTING.md`](docs/TESTING.md) — pytest fixtures, Playwright local
  setup, CI gates
- [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) — local setup from zero,
  troubleshooting, Makefile targets
- [`docs/LMS_UX_DESIGN_GUIDE.md`](docs/LMS_UX_DESIGN_GUIDE.md) — UX standards
- [`docs/exercises-api-guide.md`](docs/exercises-api-guide.md) — exercises API
- [`ROADMAP.md`](ROADMAP.md) — feature list (80+ shipped) + phases
- [`tasks/todo.md`](tasks/todo.md) — active items only
- [`tasks/lessons.md`](tasks/lessons.md) — incident learnings (read before deploy)
- [`tasks/archive/`](tasks/archive/) — completed sprint archives

## Production

- **Host:** Hetzner VPS `204.168.165.41` (CX22 in hel1, ~€4/mo)
- **SSH:** `ssh root@204.168.165.41` (ed25519 key-only; password auth disabled; fail2ban active)
- **Project path on server:** `/opt/lms`
- **Compose file:** `docker-compose.prod.yml` (the one in the repo root)
- **Primary public URL:** **https://grasslms.online** (this is what users see; DNS A-record → 204.168.165.41)
- **Backup public URL:** https://204-168-165-41.nip.io (Let's Encrypt SSL fallback, same backend)
- **Specs:** CX22 — 2 vCPU, ~3.7GB RAM, 2GB swap, 40GB disk (83% used). Measure, don't assume.
- **Running containers (~14, verified 2026-07-17):** prod LMS = `lms-db-1`, `lms-backend-1`, `lms-frontend-1`, `lms-sandbox-1`, `lms-nginx-1`, `lms-cloudflared-1`, `lms-redis-1`. Plus a full **staging** stack (`lms-staging-{db,redis,backend,frontend,sandbox}-1`) and two unrelated projects (`aimath-backend`, `topdown-rpg`) sharing the same 3.7GB.
- **DB image:** `pgvector/pgvector:pg16` (drop-in replacement for `postgres:16-alpine`, includes pgvector extension for the knowledge module)
- **Backups:** daily `pg_dump` at 04:00, 7-day retention in `/opt/lms/backups/`

Production is NOT on Render, NOT on Coolify. Migrated from Render to a plain
Hetzner VPS in March 2026. Anything you find in the repo mentioning Render or
Coolify is outdated; ignore or delete it.

## Deploy workflow

**Merging to `main` deploys to production. Automatically. Within minutes.**

There is no manual step and no human review between the merge and prod. Merge to
`main` → CI runs → on CI success `.github/workflows/deploy.yml` **builds changed
images in CI, pushes them to GHCR** (`ghcr.io/faintkom/lmsv1-*`), then SSHes into
the server, `git reset --hard`, `docker compose pull`, `up -d`, runs migrations,
smoke-checks `/login`. **Read that workflow before you merge anything.** It is the
most consequential file in this repo. (Since 2026-07-19 the box only pulls; an
on-server build remains solely as a transitional fallback if the GHCR pull fails.)

**⚠️ Claude MUST NOT hand-deploy via SSH.** No `cat | ssh`, no `scp`, no direct file
copy of code. Code reaches prod exactly one way: PR → CI green → merge. (Config-only
ops on the box — `.env` edits, restarts, read-only inspection — are separately
permitted; see the SSH safe-ops memory.)

To ship:
1. Branch, commit, push, open a PR.
2. Wait for CI green.
3. **Before merging, ask: what will this build consume on the prod box?**
   `deploy.yml` runs `docker compose build` **on the production host**, next to the
   running stack. See below.
4. Merge — this is the deploy.
5. **Poll both** the CI run and the "Deploy to Hetzner" run to completion
   (`gh run list`). Nobody else is watching. A green merge is not a green deploy.
6. Verify the thing you shipped actually works in prod.

### The prod box is memory-tight — not a footnote

CX22: **2 vCPU, ~3.7GB usable RAM, 2GB swap** (`/swapfile` already in fstab — do NOT
"add swap"). It runs ~14 containers: the prod LMS, a full **staging** stack, plus
unrelated `aimath-backend` and `topdown-rpg`. On top of that, `deploy.yml` runs a
full `next build` there.

On 2026-07-17 an unbounded `next build` exhausted RAM. Because swap exists the kernel
never OOM-killed it — it thrashed, and prod stopped answering SSH and HTTPS for ~25
minutes until a hard reset. **Fixed 2026-07-19: images are built in CI and pushed to
GHCR; the box only pulls.** The heap cap (`NODE_OPTIONS=--max-old-space-size=1536`)
stays as belt-and-braces for the transitional on-server fallback build.

**Never state this box's specs from memory. Measure them:**
`ssh root@204.168.165.41 "free -h; swapon --show; nproc; df -h /"` — read-only, one
call. On 2026-07-17 two confident wrong guesses (2GB RAM; "no swap") sent the owner
down false paths during a live outage.

## Stack

- **Backend:** FastAPI (async), SQLAlchemy 2 async, Alembic, Pydantic v2, Python 3.12. `backend/app/` is feature-module organised (auth, courses, assessments, assignments, billing, knowledge, etc.). The `knowledge` module is the distilled edtech knowledge base (Voyage 3-large embeddings + pgvector for RAG); ingestion pipeline lives at `F:\sources\` (see `F:\sources\AGENTS.md` and `F:\sources\MASS_DISTILL.md`).
- **Frontend:** Next.js 16 (App Router), React 19, TypeScript strict, Tailwind 4, Zustand, TanStack Query, Axios, TipTap, Monaco, Three.js + R3F. `frontend/src/app/(dashboard)`, `(admin)`, `(auth)` route groups.
- **DB:** PostgreSQL 16 (docker volume `pgdata`).
- **Sandbox:** separate container for untrusted code execution (read-only tmpfs, resource-limited).
- **Reverse proxy:** nginx in `nginx/nginx.conf` (NOT `deploy/nginx.conf` which was deleted).

## Test accounts (prod)

Renamed from legacy `@learnhub.app` to `@grasslms.online` on 2026-04-25 to align
with the rebrand. Passwords rotated 2026-05-24 ahead of public-repo flip — no
longer stored in source. Owner keeps current creds in their password manager.

| Role | Email | Password |
|---|---|---|
| Student | student@grasslms.online | (in owner's password manager) |
| Teacher | teacher@grasslms.online | (in owner's password manager) |
| Methodist | methodist@grasslms.online | (in owner's password manager) |
| Demo "Alex" | alex@grasslms.online | (in owner's password manager) |
| Super Admin | faintkom@gmail.com | (owner's account, rotate via /profile UI) |

For automated E2E tests, set env vars `E2E_STUDENT_PASSWORD`,
`E2E_TEACHER_PASSWORD`, `E2E_METHODIST_PASSWORD`, `E2E_ADMIN_PASSWORD` in CI
secrets and local `.env.local` (not committed).

## What to NOT do

- Do not merge to `main` casually. **Merging IS deploying** — CI green auto-triggers
  `deploy.yml`, which rebuilds images on the prod box. Read it first, then poll the
  deploy run to completion.
- Do not run `docker compose` on your laptop expecting it to affect prod.
- Do not "add swap" to the prod box — it already has 2GB, and more swap makes an OOM
  thrash *longer*, not safer.
- Do not look for `render.yaml` or `deploy/` — they were deleted in March 2026 (Render → Hetzner migration). If you see references in old commits or memory, ignore them.
- Do not edit production migrations after they've been applied. Create a new migration instead.
- Do not run scripts from `scripts/legacy/` — they're archived one-offs, may break data. See `scripts/legacy/README.md`.

## Current priorities

See `tasks/todo.md` for the active sellability plan (P0/P1/P2 items).
P0 security hardening (JWT enforcement, rate limiting, file upload validation,
nginx headers) was added in commit `d391386` on 2026-04-09.

## Knowledge module notes (updated 2026-07-18: DORMANT)

**Status: backend dormant, frontend removed.** UI и роутер вырезаны 2026-05-31
(pre-test cleanup): страницы `(dashboard)/knowledge/` нет, ссылки в сайдбаре
нет, роутер НЕ смонтирован в `main.py` — `/api/v1/knowledge/*` отдаёт 404.
Код `app/knowledge/` (5 файлов) и данные в БД живы — модуль можно вернуть,
смонтировав роутер и восстановив страницу.

Что остаётся правдой:
- DB: `knowledge_entries` + `knowledge_entry_sources`, `vector` extension, HNSW + GIN + FTS индексы (hybrid search).
- Migration: `m1n2o3p4q5r6_add_knowledge_module.py` — применена, не трогать.
- Voyage AI key (embeddings): `F:\google-secrets\voyage-api-key.txt` локально; в проде `VOYAGE_API_KEY` env.
- Distillation pipeline — вне LMS, в `F:\sources\` (см. `F:\sources\AGENTS.md`): `_verified/*.json` → `python F:\sources\_prompts\ingest.py` → Postgres.

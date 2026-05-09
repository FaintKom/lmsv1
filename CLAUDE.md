# GrassLMS — Project Quick Reference

This file is loaded automatically by Claude Code when working in this repo.
For deeper context, read the memory at `~/.claude/projects/F--lms/memory/`
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
- **Running containers:** `lms-db-1`, `lms-backend-1`, `lms-frontend-1`, `lms-sandbox-1`, `lms-nginx-1`, `lms-cloudflared-1`, `lms-redis-1`
- **DB image:** `pgvector/pgvector:pg16` (drop-in replacement for `postgres:16-alpine`, includes pgvector extension for the knowledge module)
- **Backups:** daily `pg_dump` at 04:00, 7-day retention in `/opt/lms/backups/`

Production is NOT on Render, NOT on Coolify. Migrated from Render to a plain
Hetzner VPS in March 2026. Anything you find in the repo mentioning Render or
Coolify is outdated; ignore or delete it.

## Deploy workflow

**NEVER deploy via direct SCP or file copy.** All changes MUST go through GitHub:

```bash
# 1. Commit changes on a branch, push, create PR, merge to main

# 2. Pull on server
ssh root@204.168.165.41 "cd /opt/lms && git pull origin main"

# 3. Rebuild the affected service
ssh root@204.168.165.41 "cd /opt/lms && docker compose -f docker-compose.prod.yml build backend"

# 4. Restart it
ssh root@204.168.165.41 "cd /opt/lms && docker compose -f docker-compose.prod.yml up -d backend"

# 5. If nginx config changed
ssh root@204.168.165.41 "docker exec lms-nginx-1 nginx -s reload"
```

Direct SCP creates undocumented state drift. The server must always match git main.

## Stack

- **Backend:** FastAPI (async), SQLAlchemy 2 async, Alembic, Pydantic v2, Python 3.12. `backend/app/` is feature-module organised (auth, courses, assessments, assignments, billing, knowledge, etc.). The `knowledge` module is the distilled edtech knowledge base (Voyage 3-large embeddings + pgvector for RAG); ingestion pipeline lives at `F:\sources\` (see `F:\sources\AGENTS.md` and `F:\sources\MASS_DISTILL.md`).
- **Frontend:** Next.js 16 (App Router), React 19, TypeScript strict, Tailwind 4, Zustand, TanStack Query, Axios, TipTap, Monaco, Three.js + R3F. `frontend/src/app/(dashboard)`, `(admin)`, `(auth)` route groups.
- **DB:** PostgreSQL 16 (docker volume `pgdata`).
- **Sandbox:** separate container for untrusted code execution (read-only tmpfs, resource-limited).
- **Reverse proxy:** nginx in `nginx/nginx.conf` (NOT `deploy/nginx.conf` which was deleted).

## Test accounts (prod)

Renamed from legacy `@learnhub.app` to `@grasslms.online` on 2026-04-25 to align
with the rebrand. Verified in DB.

| Role | Email | Password |
|---|---|---|
| Student | student@grasslms.online | Student2026! |
| Teacher | teacher@grasslms.online | Teacher2026! |
| Methodist | methodist@grasslms.online | Methodist2026! |
| Demo "Alex" | alex@grasslms.online | Alex2026! |
| Super Admin | faintkom@gmail.com | (owner's account, rotate via /profile UI) |

## What to NOT do

- Do not push to `origin/main` expecting auto-deploy. There is no webhook.
- Do not run `docker compose` on your laptop expecting it to affect prod.
- Do not assume there is CI/CD for deployment. CI runs lint+tests on PRs (`.github/workflows/ci.yml`), but deployment is manual SSH+rebuild.
- Do not look for `render.yaml` or `deploy/` — they were deleted in March 2026 (Render → Hetzner migration). If you see references in old commits or memory, ignore them.
- Do not edit production migrations after they've been applied. Create a new migration instead.
- Do not run scripts from `scripts/legacy/` — they're archived one-offs, may break data. See `scripts/legacy/README.md`.

## Current priorities

See `tasks/todo.md` for the active sellability plan (P0/P1/P2 items).
P0 security hardening (JWT enforcement, rate limiting, file upload validation,
nginx headers) was added in commit `d391386` on 2026-04-09.

## Knowledge module notes (added 2026-04-25)

- New module `app/knowledge/` exposes `/api/v1/knowledge/{search,facets,list,{id}}`.
- Frontend at `frontend/src/app/(dashboard)/knowledge/` (list + detail).
- Sidebar: ✨ "Knowledge" link added to studentNav.
- DB: `knowledge_entries` + `knowledge_entry_sources` tables, `vector` extension required, HNSW + GIN + FTS indexes for hybrid search.
- Migration: `m1n2o3p4q5r6_add_knowledge_module.py`. Prod was already stamped to head.
- Voyage AI key (for embeddings): `F:\google-secrets\voyage-api-key.txt` locally; in prod set `VOYAGE_API_KEY` env on backend container.
- Distillation pipeline runs OUTSIDE the LMS server, in `F:\sources\` via Claude Desktop sessions. Result: `_verified/*.json` → `python F:\sources\_prompts\ingest.py` writes to Postgres.

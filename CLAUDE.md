# LearnHub LMS — Project Quick Reference

This file is loaded automatically by Claude Code when working in this repo.
For deeper context, read the memory at `~/.claude/projects/F--lms/memory/`
(especially `project_prod_hosting.md` and `feedback_deploy.md`) before
proposing any infrastructure or deploy action.

## Production

- **Host:** Hetzner VPS `204.168.165.41` (CX22 in hel1, ~€4/mo)
- **SSH:** `ssh root@204.168.165.41` (ed25519 key-only; password auth disabled; fail2ban active)
- **Project path on server:** `/opt/lms`
- **Compose file:** `docker-compose.prod.yml` (the one in the repo root)
- **Public URL:** https://204-168-165-41.nip.io (Let's Encrypt SSL, auto-renew)
- **Running containers:** `lms-db-1`, `lms-backend-1`, `lms-frontend-1`, `lms-sandbox-1`, `lms-nginx-1`, `lms-cloudflared-1`
- **Backups:** daily `pg_dump` at 04:00, 7-day retention in `/opt/lms/backups/`

Production is NOT on Render, NOT on Coolify. Migrated from Render to a plain
Hetzner VPS in March 2026. Anything you find in the repo mentioning Render or
Coolify is outdated; ignore or delete it.

## Deploy workflow

Changes go live via SSH file copy + container rebuild. There is no CI/CD.
There is no staging (pending — see `project_staging_env.md`).

```bash
# 1. Copy a changed file
cat backend/app/auth/router.py | ssh root@204.168.165.41 "cat > /opt/lms/backend/app/auth/router.py"

# 2. Rebuild the affected service
ssh root@204.168.165.41 "cd /opt/lms && docker compose -f docker-compose.prod.yml build backend"

# 3. Restart it
ssh root@204.168.165.41 "cd /opt/lms && docker compose -f docker-compose.prod.yml up -d backend"

# 4. If nginx config changed
ssh root@204.168.165.41 "docker exec lms-nginx-1 nginx -s reload"
```

For multiple files in the same service, batch the copies before the rebuild.

## Stack

- **Backend:** FastAPI (async), SQLAlchemy 2 async, Alembic, Pydantic v2, Python 3.12. `backend/app/` is feature-module organised (auth, courses, assessments, assignments, billing, etc.).
- **Frontend:** Next.js 16 (App Router), React 19, TypeScript strict, Tailwind 4, Zustand, TanStack Query, Axios, TipTap, Monaco, Three.js + R3F. `frontend/src/app/(dashboard)`, `(admin)`, `(auth)` route groups.
- **DB:** PostgreSQL 16 (docker volume `pgdata`).
- **Sandbox:** separate container for untrusted code execution (read-only tmpfs, resource-limited).
- **Reverse proxy:** nginx in `nginx/nginx.conf` (NOT `deploy/nginx.conf` which was deleted).

## Test accounts (prod)

| Role | Email | Password |
|---|---|---|
| Student | student@learnhub.app | Student2026! |
| Teacher | teacher@learnhub.app | Teacher2026! |
| Methodist | methodist@learnhub.app | Methodist2026! |
| Super Admin | faintkom@gmail.com | (owner's account, rotate via /profile UI) |

## What to NOT do

- Do not push to `origin/main` expecting auto-deploy. There is no webhook.
- Do not run `docker compose` on your laptop expecting it to affect prod.
- Do not use `render.yaml`, `deploy/setup-server.sh`, `deploy/docker-compose.hetzner.yml` — they were deleted as outdated.
- Do not assume there is CI/CD. There isn't yet.

## Current priorities

See `tasks/todo.md` for the active sellability plan (P0/P1/P2 items).
P0 security hardening (JWT enforcement, rate limiting, file upload validation,
nginx headers) was added in commit `d391386` on 2026-04-09.

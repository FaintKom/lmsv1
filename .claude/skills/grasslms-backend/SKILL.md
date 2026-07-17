---
name: grasslms-backend
description: Use when writing or changing backend code in this repo (FastAPI async, SQLAlchemy 2 async, Alembic, Pydantic v2) — encodes the traps this codebase has actually hit, not generic FastAPI advice.
---

# GrassLMS Backend

Written for `backend/app/` specifically. Generic FastAPI advice will lead you wrong here in
at least three places; this file is the difference. `backend/CLAUDE.md` is the reference —
this is the "what bites" layer on top.

## Non-negotiables

- **Everything is `async def`.** No sync routers, no sync services, no `requests` — use
  `httpx.AsyncClient`. A sync call in a router blocks the event loop for every user.
- **DB session comes from `Depends(get_db)`.** It commits on success, rolls back on
  exception — don't commit by hand, don't open your own session.
- **Never call sync Alembic from lifespan.** `command.upgrade()` runs `asyncio.run` inside
  the running loop and dies. Schema changes go through migrations.
- **`org_id` on every tenant-owned table**, and isolation is enforced *explicitly* in the
  router/service (`current_user.org_id == resource.org_id`). Nothing enforces it for you.
- **New model?** Import it in `main.py` lifespan AND `tests/conftest.py`. Missing from
  `Base.metadata` = invisible, and the failure surfaces as an unrelated table error.

## The traps that actually cost time here

**Migrations run AFTER the container starts.** `_run_setup` in `main.py` does
`Base.metadata.create_all`, so the backend creates tables from models *before*
`alembic upgrade head` runs during deploy. A migration doing plain `op.create_table` for a
model already in `Base.metadata` dies with `DuplicateTableError` on prod. Guard it:

```python
if sa.inspect(op.get_bind()).has_table("your_table"):
    return
```

Same for `add_column` (check `get_columns`). `op.execute(...)` must be rerun-safe
(`IF NOT EXISTS`, `ON CONFLICT`) — `_run_setup` repeats some ALTERs on every start.

**Rate limiting needs `request: Request` in the signature.** slowapi reads it positionally;
omit it and it fails at import. In prod the storage is Redis — `memory://` silently gives
each worker its own counter, i.e. no limit at all.

**Dependency floors are a real trap.** `fastapi>=0.115.0` + `pydantic>=2.10` both resolve and
are broken together: FastAPI below 0.115.6 reads body models as query params and 422s every
POST taking a schema. Floor is now `>=0.115.6`. If a fresh install 422s on a body you know is
correct, check versions before debugging your code (cost ~30min on 2026-07-17).

**`EmailStr` rejects dotless domains.** `admin@local` → 422; use `admin@local.dev`. Bites
when bootstrapping a local super admin.

## Writing an endpoint

Schemas are `...Request` / `...Response`; validators live in the schema (`@field_validator`),
not the router. Public endpoints get a rate limit. Anything returning user data gets an
explicit RBAC check — roles are `super_admin | admin | teacher | student | parent`.

Emails are best-effort and must never break the request path: `queue_email(send_x, ...)` runs
off the loop and swallows failures. Anything interpolated into an email template from a
public endpoint gets `html.escape()` first.

## Tests

`pytest-asyncio` in `auto` mode — plain `async def test_*`, no marker. Fixtures in
`tests/conftest.py`: `db` (session in a rolled-back transaction), `client` (httpx
ASGITransport), plus user/org factories. The rate limiter resets per-test via an autouse
fixture; without it one file poisons the next.

Needs Postgres: `docker compose up -d db` — image must be `pgvector/pgvector:pg16`, the
`vector` extension isn't in stock postgres.

**Don't assert absolute counts against the dev DB.** It holds rows from earlier manual
testing; `assert total == 1` passes alone and fails in suite. Assert a delta or `>= 1`.

## Before you say it works

Run the tests. Then exercise the real endpoint — curl it, read the log line, confirm the side
effect (the row, the email, the 200). CI green is not proof the feature works; it's proof
nothing else broke.

## Deploying

You don't. Merging to `main` deploys, and `deploy.yml` rebuilds the backend image **on the
prod box**. Read `.github/workflows/deploy.yml` before merging, then poll the deploy run to
completion. See root `CLAUDE.md` → "Deploy workflow" and `tasks/lessons.md` (2026-07-17).

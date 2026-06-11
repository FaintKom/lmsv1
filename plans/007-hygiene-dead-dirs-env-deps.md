# Plan 007: Hygiene — delete dead dirs, fix .env.example & deps

> **Executor instructions**: Follow step by step. Run every verification command.
> If a STOP condition occurs, stop and report. When done, update the 007 row in
> `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 0521717..HEAD -- backend/app backend/pyproject.toml .env.example backend/.env.example`
> Compare to live state; on mismatch, STOP.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tech-debt / dx
- **Planned at**: commit `0521717`, 2026-06-11

## Why this matters

Cleanup that cuts confusion and onboarding friction: three empty module dirs left
after a feature removal still imply live features; `.env.example` is missing
required vars (notably `VOYAGE_API_KEY`) so a fresh knowledge-module setup fails
silently; `httpx` is declared twice in `pyproject.toml`.

## Current state

- **Dead dirs**: `backend/app/ai/`, `backend/app/discussions/`,
  `backend/app/plagiarism/` each have **0 `.py` files** (verified). Not imported in
  `main.py`. Removed in 8186c29.
- **.env.example gaps**: `backend/app/config.py` Settings declares vars absent from
  `.env.example`: `VOYAGE_API_KEY`, `RATE_LIMIT_STORAGE_URI`, others. Confirm delta:
  `grep -n "= " backend/app/config.py` vs the `.env.example` file(s).
- **httpx double-declare**: `backend/pyproject.toml` lists `httpx>=0.28.0` in main
  deps AND in `[project.optional-dependencies] dev` (~line 36). Prod dep (used in
  `knowledge/service.py`); dev entry redundant.
- **Stale doc (optional)**: root `CLAUDE.md` claims the Knowledge frontend at
  `frontend/src/app/(dashboard)/knowledge/` — that page does NOT exist. Flag only.

Commands: `cd backend && pytest -q`, `ruff check app/`. Do NOT run installs — read
manifests only.

## Scope

**In scope:** delete the three empty dirs; `.env.example` / `backend/.env.example`;
`backend/pyproject.toml` (httpx dev line).
**Out of scope:** re-implementing removed features; CLAUDE.md doc fix (optional);
version bumps beyond removing the duplicate.

## Steps

### Step 1: Remove dead dirs
Confirm empty: `find backend/app/ai backend/app/discussions backend/app/plagiarism -name "*.py"`
→ no output. Delete the three dirs. Then
`grep -rn "app\.ai\b\|app\.discussions\|app\.plagiarism" backend/app` → no matches.
If any import exists, STOP.
**Verify**: `cd backend && python -c "import app.main"` → exit 0; `pytest -q` → pass.

### Step 2: Complete .env.example
Add missing vars (placeholder value + short comment each) to the relevant
`.env.example`. At minimum `VOYAGE_API_KEY=your-voyage-key-here`,
`RATE_LIMIT_STORAGE_URI=`, plus any other no-default Settings field the grep
surfaced. NEVER a real secret — placeholders only.
**Verify**: every required no-default `config.py` field appears in `.env.example`
(manual diff).

### Step 3: De-dupe httpx
Remove `httpx>=0.28.0` from `[project.optional-dependencies] dev` in
`backend/pyproject.toml`; keep the main-deps entry.
**Verify**: `grep -n "httpx" backend/pyproject.toml` → exactly one match.

### Step 4: (Optional) note stale CLAUDE.md Knowledge path
If trivial, correct/annotate the root `CLAUDE.md` Knowledge-frontend line; else
note in report. Do not block.

## Test plan

No new tests. Gate: app imports, `pytest -q` green, single httpx entry,
.env.example covers required vars.

## Done criteria

- [ ] `backend/app/{ai,discussions,plagiarism}/` deleted; no stray imports
- [ ] `cd backend && python -c "import app.main"` exit 0
- [ ] `cd backend && pytest -q` exit 0
- [ ] `.env.example` includes `VOYAGE_API_KEY` + other required no-default vars (placeholders)
- [ ] `grep -n httpx backend/pyproject.toml` → one match
- [ ] `plans/README.md` row 007 set to DONE

## STOP conditions

- A live import references `app.ai`/`app.discussions`/`app.plagiarism`.
- A `config.py` field's required-vs-default status is ambiguous — add as commented placeholder, don't guess.

## Maintenance notes

- Reviewer: confirm no secret value landed in `.env.example` (placeholders only).
- Deferred: re-surfacing the Knowledge frontend page (DIR-A).

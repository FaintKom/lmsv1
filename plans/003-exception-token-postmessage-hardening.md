# Plan 003: Stop leaking exception text; harden tokens & postMessage

> **Executor instructions**: Follow step by step. Run every verification command.
> If a STOP condition occurs, stop and report. When done, update the 003 row in
> `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 0521717..HEAD -- backend/app/main.py frontend/src/components`
> Compare excerpts to live code; on mismatch, STOP.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `0521717`, 2026-06-11

## Why this matters

Three low-effort hardening fixes: (1) the global 500 handler returns `str(exc)` to
the client, which can echo SQL fragments / paths / internal detail; (2) the SCORM
player passes the JWT as a URL query param (lands in history, proxy logs, CDN
caches); (3) three iframe/widget bridges post messages with target origin `'*'`,
letting any window forge them.

## Current state

**(1)** `backend/app/main.py:490-493`:
```python
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.method} {request.url.path}: {exc}\n{traceback.format_exc()}")
    return JSONResponse(status_code=500, content={"detail": str(exc)})
```
Keep the `logger.error(... traceback ...)`. Only `content={"detail": str(exc)}` leaks.

**(2)** `frontend/src/components/exercises/scorm-package-exercise.tsx` (~line 196):
reads token from `localStorage`, builds
``fetch(`${filesBase}${manifest}?token=${encodeURIComponent(token)}`, { credentials: "include" })``.

**(3)** `postMessage(..., '*')` at: `content-renderer.tsx:313` (iframe resize),
`game/math/math-exercise.tsx:130`, `game/math/math-editor.tsx:2083`.

Frontend commands (from `frontend/`): `npm run lint`, `npm run build`,
`npx tsc --noEmit`. Backend: `cd backend && pytest -q`, `ruff check app/`.

## Scope

**In scope:** `backend/app/main.py` (500 handler body only);
`frontend/src/components/exercises/scorm-package-exercise.tsx`;
`frontend/src/components/common/content-renderer.tsx`;
`frontend/src/components/game/math/math-exercise.tsx`;
`frontend/src/components/game/math/math-editor.tsx`.
**Out of scope:** the `logger.error` line; JWT→httpOnly migration (S6); receiver-side
postMessage validation (already checks `e.source`).

## Steps

### Step 1: Generic 500 body
`main.py:493` → `content={"detail": "Internal server error"}`. Keep the logger
line. Optionally add a request_id if present on `request.state`, never the
exception text. Touch ONLY the catch-all `Exception` handler — leave
validation/HTTPException messages alone.
**Verify**: `cd backend && pytest -q` → pass; `grep -n 'str(exc)' backend/app/main.py`
→ no match in the 500 handler.

### Step 2: SCORM token to header
Move token from URL into `Authorization: Bearer` header on every `fetch` in
`scorm-package-exercise.tsx`:
```ts
fetch(`${filesBase}${manifest}`, {
  credentials: "include",
  headers: token ? { Authorization: `Bearer ${token}` } : {},
});
```
If the backend SCORM file route reads only the query-param token (not the
`Authorization` header), STOP and report — needs a paired backend change. Check
`backend/app/scorm_import/router.py` / `scorm/router.py`.
**Verify**: `cd frontend && npx tsc --noEmit` → exit 0;
`grep -n 'token=' frontend/src/components/exercises/scorm-package-exercise.tsx`
→ no token-in-URL.

### Step 3: Replace wildcard postMessage origins
In the three files, `'*'` → `window.location.origin`. For the
`content-renderer.tsx:313` srcdoc-internal string, use `parent.postMessage(msg,
window.location.origin)`. If the iframe srcdoc has a `"null"` origin so wildcard
is load-bearing, STOP and report (needs receiver-side origin allowlist instead).
**Verify**: `cd frontend && npx tsc --noEmit` → exit 0; grep the three files for
`postMessage(..., '*')` → no matches.

### Step 4: Build
**Verify**: `cd frontend && npm run build` → exit 0; `cd backend && pytest -q` → pass.

## Test plan

No new unit tests (config/string hardening). Gate = typecheck + build + grep
absence + suites green. If `tests/test_p0_security.py` asserts the old 500 body,
update that assertion to the generic message.

## Done criteria

- [ ] no `str(exc)` in the `main.py` 500 handler
- [ ] no `?token=` token-in-URL in scorm-package-exercise.tsx
- [ ] no `postMessage(..., '*')` in the three named files
- [ ] `npx tsc --noEmit` exit 0; `npm run build` exit 0; `pytest -q` exit 0
- [ ] `plans/README.md` row 003 set to DONE

## STOP conditions

- SCORM file route authenticates only via query-param token.
- iframe srcdoc `"null"` origin requires wildcard.
- A pre-existing security test asserts the old leaky 500 body you don't understand.

## Maintenance notes

- Reviewer: confirm nothing relied on the verbose 500 body (Sentry/logs keep full traceback).
- Deferred: httpOnly-cookie auth (S6) would moot the SCORM token issue.

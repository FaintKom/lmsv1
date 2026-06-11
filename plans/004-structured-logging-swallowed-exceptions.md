# Plan 004: Replace silent `except: pass` with structured logging

> **Executor instructions**: Follow step by step. Run every verification command.
> If a STOP condition occurs, stop and report. When done, update the 004 row in
> `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 0521717..HEAD -- backend/app`
> Compare excerpts to live code; on mismatch, STOP.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW (logging only — must NOT change control flow)
- **Depends on**: none
- **Category**: bug (observability)
- **Planned at**: commit `0521717`, 2026-06-11

## Why this matters

Critical best-effort paths swallow every exception with `except Exception: pass`
and no log. When badge award, XP grant, certificate issuance, or an email send
fails — including on a dropped DB connection — there is zero signal. The
tolerate-failure behavior is correct; the silence is the bug. This plan keeps the
behavior but makes every swallow observable.

## Current state

`structlog` is the logging lib (`backend/CLAUDE.md`); most modules have a
module-level `logger`. Confirm with
`grep -rn "get_logger\|^logger =" backend/app/progress backend/app/assignments backend/app/admin`
and reuse the module's existing handle.

Known swallow sites (line numbers are leads — verify each):
- `progress/router.py:72` (gamification), `:182` (auto-complete)
- `progress/service.py:114-118` (certificate), `:120-125` (XP)
- `assessments/service.py:159-163` (XP on submit_quiz)
- `assignments/service.py:66-67`, `:414-415` (email)
- `admin/service.py:101-102`, `:129-130` (analytics rollup)
- `auth/router.py` — up to 4 broad swallows during signup

Find the full set: `grep -rn -A1 "except Exception:" backend/app` and pick the
ones whose body is a bare `pass` on a side-effect path.

## Commands you will need

| Purpose | Command | Expected |
|---------|---------|----------|
| Find swallows | `grep -rn -A1 "except Exception:" backend/app` | site list |
| Tests | `cd backend && pytest -q` | pass |
| Lint | `cd backend && ruff check app/` | exit 0 |

## Scope

**In scope:** the swallow sites above + near-identical bare-`pass` swallows on
best-effort side-effect paths.
**Out of scope:** `except` blocks that already log/re-raise; `except` that
translates to an HTTP error (control flow); the donation status no-op (Plan 005);
any change to whether the primary operation succeeds.

## Steps

### Step 1: Replacement shape
Replace `except Exception:\n    pass` with
`except Exception:\n    logger.warning("…what failed + relevant id", exc_info=True)`,
matching the module's logger call style. Include operation + id (`user_id`,
`lesson_id`, …) but NEVER secret values. If a module lacks a logger, add one from a
sibling exemplar. Behavior after logging is unchanged (primary write still commits).

### Step 2: Apply
Edit each site. No re-raise. Do not narrow `Exception` unless the surrounding code
already uses a specific type.
**Verify**: `cd backend && ruff check app/` → exit 0.

### Step 3: Confirm no behavioral change
**Verify**: `cd backend && pytest -q` → all pass. Remaining `except Exception:`
matches all log or re-raise.

## Test plan

No new tests required. Optional: a test that a failing gamification hook does not
break lesson completion, added to `tests/test_progress.py` only if it fits
existing fixtures cleanly.

## Done criteria

- [ ] Every listed swallow logs (`exc_info=True`) instead of bare `pass`
- [ ] `grep -rn -A1 "except Exception:" backend/app` → no bare-`pass` side-effect swallows
- [ ] `cd backend && pytest -q` exit 0 (no behavioral change)
- [ ] `cd backend && ruff check app/` exit 0
- [ ] `plans/README.md` row 004 set to DONE

## STOP conditions

- A swallow is actually control-flow (the `pass` is load-bearing) — leave it, note it.
- Adding a logger trips a circular import — report.

## Maintenance notes

- Reviewer: confirm no `except` was narrowed so a tolerated failure now breaks the primary op.
- New best-effort side-effects must log on failure, never `pass` silently.

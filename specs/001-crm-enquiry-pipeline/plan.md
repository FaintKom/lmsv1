# Implementation Plan: School enquiry pipeline

**Branch**: `feat/crm-spec` | **Date**: 2026-08-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-crm-enquiry-pipeline/spec.md`

## Summary

v1 of the pipeline shipped on 2026-08-16 (PR #295): enquiries, stages, history,
reminders, conversion, and an admin board. This plan covers only what the spec asks for
and the code does not yet do — six things, in the order they pay off:

1. **A converted family can actually sign in.** Conversion creates accounts with a
   random password and tells nobody. Fixed by issuing the existing single-use token and
   sending an invitation.
2. **The board is exercised by a browser.** 400 lines of untested UI, in the same shape
   as two features that shipped broken this month.
3. **The school's website feeds the pipeline** through a public page we host.
4. **A lost enquiry can be reopened**, so a returning family stays one record.
5. **Reminders reach people who are not signed in**, and unassigned ones reach the
   office rather than nobody.
6. **The funnel can be reported on**, so a school can tell which channel earns its
   money.

The technical shape is unusual and worth stating up front: **it needs no migration.**
Every requirement is served by tables that already exist, a token flow that already
exists, and vocabulary that lives in Python tuples rather than PostgreSQL enums.

## Technical Context

**Language/Version**: Python 3.12 (backend), TypeScript 5 with React 19 (frontend)

**Primary Dependencies**: FastAPI, SQLAlchemy 2 async, Alembic, Pydantic v2, slowapi,
APScheduler; Next.js 16 App Router, Tailwind 4, TanStack Query

**Storage**: PostgreSQL 16. **No schema change in this plan** — see
[data-model.md](./data-model.md) and research §6.

**Testing**: pytest against a real PostgreSQL instance; Playwright journeys against an
ephemeral QA stack; Vitest including a six-locale parity gate

**Target Platform**: Linux containers on a single Hetzner CX22; browsers including
phones — the board must survive a narrow viewport, which `e2e/mobile.spec.ts` gates

**Project Type**: multi-tenant web application, backend + frontend in one repository

**Performance Goals**: a school holds tens to low hundreds of enquiries; the report is
an aggregate over that, not over a warehouse. No new index is needed — the two that
exist, `(org_id, stage)` and `(lead_id, created_at)`, already serve every query added
here.

**Constraints**: outbound mail is optional in a deployment and its failures are
swallowed by design, so nothing here may depend on an email having arrived; the prod box
is memory-tight, so no new service or worker

**Scale/Scope**: six requirements, two new public endpoints, two new authenticated
endpoints, two email templates, one Playwright journey, no migration

## Constitution Check

*GATE: must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | How this plan satisfies it | Verdict |
|---|---|---|
| **I. Tenant isolation is a rule** | Every new authenticated endpoint resolves its lead through the existing org-scoped guard. The public endpoint resolves a school by slug and writes only into that school. The report aggregates within one org. Cross-org stays 404. | PASS |
| **II. A test that cannot fail is worse than no test** | Each new guard is demonstrated failing against the unguarded behaviour before it is trusted — written into [quickstart.md](./quickstart.md) as a step, not an aspiration. The invitation test asserts the token *signs somebody in* rather than that a row exists, because a row-exists test would pass against today's broken behaviour. | PASS |
| **III. Server is the only judge of an answer** | Not engaged: no grading here. | N/A |
| **IV. Product and documentation tell the same story** | The public page states what the school actually offers, read from its published courses rather than typed twice. | PASS |
| **V. The smallest change that works** | No new table, no new token type, no new job, no denormalised column, no CAPTCHA dependency. Four rejected alternatives are recorded in [research.md](./research.md) with the reason each was heavier than the problem. | PASS |

Post-design re-check: unchanged. The design added no table, no service and no
dependency, so no gate moved.

## Project Structure

### Documentation (this feature)

```text
specs/001-crm-enquiry-pipeline/
├── plan.md              # This file
├── spec.md              # What and why
├── research.md          # Phase 0 — decisions, with what was rejected
├── data-model.md        # Phase 1 — no migration; state transitions; derived values
├── contracts/api.md     # Phase 1 — the endpoints that change, and what they refuse
├── quickstart.md        # Phase 1 — how to prove it works
├── checklists/
│   └── requirements.md  # Spec quality gate
└── tasks.md             # Phase 2 — created by /speckit-tasks, not by this command
```

### Source code (repository root)

```text
backend/
├── app/
│   ├── crm/
│   │   ├── models.py        # EVENT_KINDS gains "reopened" — no migration
│   │   ├── service.py       # reopen, report, invitations on convert
│   │   ├── router.py        # /leads/{id}/reopen, /report
│   │   └── public_router.py # NEW — the two unauthenticated endpoints
│   ├── email/service.py     # two templates: invitation, reminder due
│   ├── auth/service.py      # issue an invitation token (reuses password reset)
│   └── scheduler.py         # sweep: unassigned → admins; also email
└── tests/
    └── test_crm.py          # extended; every guard proven failing first

frontend/
├── src/
│   ├── app/
│   │   ├── s/[slug]/enquire/page.tsx   # NEW — public enquiry page
│   │   └── (admin)/admin/crm/page.tsx  # reopen, report panel
│   ├── lib/api/crm.ts                  # the new calls
│   └── lib/i18n/locales/*.ts           # six files, or the parity gate fails
└── e2e/journeys/crm-board.spec.ts      # NEW — the board through a browser
```

**Structure Decision**: the existing backend/frontend split, with the CRM's public
surface kept in its own router rather than mixed into the authenticated one. Two routers
make the boundary visible in the file tree: anything in `public_router.py` is reachable
by a stranger, and reviewing it is a different kind of reading.

## Complexity Tracking

No constitution violations. Nothing to justify.

The one judgement worth recording: the public enquiry endpoint accepts writes from
anonymous callers into a tenant's data, which is the only place in the product that does
so besides the platform waitlist. It is deliberately narrow — one row, in one stage,
with fields capped and the source forced — rate-limited, and it answers identically
every time so it cannot be used to ask who has been in touch.

<!--
Sync Impact Report
- Version change: (none) → 1.0.0
- Initial ratification. The template's five placeholder principles were replaced
  with five drawn from defects actually found in this codebase, not generic
  advice; each names the incident it came from.
- Added sections:
  - Core Principles (I–V)
  - Operating Rules Live in CLAUDE.md (SECTION_2)
  - Development Workflow (SECTION_3)
  - Governance
- Removed sections: none (initial adoption)
- Deferred TODOs: none
-->

# GrassLMS Constitution

GrassLMS is a multi-tenant SaaS learning platform for small private schools and
learning centres — 10 to 300 pupils, teaching programming, maths and languages,
sold in the EU and US in English. Backend: Python 3.12, FastAPI, SQLAlchemy 2
async, PostgreSQL. Frontend: Next.js 16, React 19, TypeScript.

Every principle below is written from a defect this codebase actually shipped.
None of them are aspirations.

## Core Principles

### I. Tenant isolation is a rule, not a habit

Every id that arrives in a request — body, path or query — MUST be checked
against the caller's organisation before it is used. Authorising the parent
object never implies its children are authorised: a group being ours says
nothing about the user ids posted into it, and a lead being ours says nothing
about the course id attached to it.

Another school's row MUST read as 404, never 403, so its existence stays
hidden. Scoping MUST live in one shared guard per domain rather than being
re-derived per endpoint.

Rationale: four modules violated this at once. Exercises could be read, edited
and deleted across schools by id alone, and a test case could be bolted onto
another school's code challenge — changing how their pupils were marked. Group
membership and enrolment accepted any uuid. The gradebook and the parent portal
leaked inside a single school. In every case a correct rule already existed
elsewhere in the codebase and simply was not reused.

### II. A test that cannot fail is worse than no test

A test MUST be capable of failing against the behaviour it describes.
Prohibited: assertions of the shape `status in (200, 403)`; asserting only that
a response carries the expected keys; exercising an endpoint against an empty
table and calling that coverage.

Every new guard MUST be demonstrated failing against the pre-fix behaviour
before it is trusted. State that demonstration in the pull request.

Rationale: a billing test named `test_student_cannot_access_billing` asserted
"200 or 403" against an endpoint that is public by design — it could never
fail, and it claimed a rule nobody enforced. Invoice and subscription tests
passed for months against empty tables, hiding a schema bug that returned 500
to every school that had ever been invoiced.

### III. The server is the only judge of an answer

Grading happens server-side. Answer keys MUST NOT reach a non-staff reader —
students and parents both, because a parent is linked to a child and would
otherwise hold the answers to that child's homework. The client is never
trusted with the key, and "the UI does not show it" is not a control.

Rationale: answer stripping keyed on `role == student`, which silently exempted
the one other non-staff role in the product.

### IV. The product and its documentation tell the same story

Claims in the README, the landing page, the pricing page and the legal pages
MUST be checked against the code that backs them. Drift is a defect, not
untidiness, and is fixed with the same seriousness as a bug.

Rationale: the README advertised 24 exercise types while the registry held 26,
and the Terms and Privacy pages told customers the AI tutor ran self-hosted and
sent nothing outward, while it called an external provider.

### V. The smallest change that works

Prefer deleting to adding. No abstraction without a second caller. A field
nobody sends is removed rather than validated. A dead translation key is
deleted rather than kept "just in case".

Rationale: the checkout endpoint accepted caller-supplied return URLs that no
caller ever sent — removing the field closed a redirect hazard and shrank the
code, where validating it would have done neither.

## Operating Rules Live in CLAUDE.md

The root `CLAUDE.md` is the single source of truth for deployment,
infrastructure, production access and money. This constitution MUST NOT restate
those rules; forking them guarantees the two copies drift and nobody knows
which is binding.

Read there, and treat as binding here:

- Merging to `main` deploys to production automatically, within minutes, with
  no human review between the merge and prod.
- Code reaches production exactly one way: pull request → CI green → merge.
  Never by SSH, `scp`, or file copy.
- Production specifics — host, resources, containers, backups — are measured,
  never asserted from memory.
- No spending without explicit per-action approval.

Module conventions in `backend/CLAUDE.md` and `frontend/CLAUDE.md` are equally
binding: schema changes only by Alembic migration, no tokens in localStorage,
translation keys present in all six locales, exercise answers stripped
server-side.

## Development Workflow

All work goes through Spec Kit, regardless of size:

1. `/speckit-specify` — what and why, no implementation choices.
2. `/speckit-clarify` — resolve the ambiguities before planning, not during.
3. `/speckit-plan` — how: architecture, files, migrations.
4. `/speckit-tasks` — dependency-ordered work.
5. `/speckit-implement` — build it.

Small changes get short specs, not skipped ones. A one-line fix may have a
five-line spec; what it may not have is none, because the changes that hurt
this codebase were all small ones nobody wrote down.

`/speckit-analyze` runs before implementation on anything touching access
control, the database schema, or money. `/speckit-converge` checks a finished
feature against its own spec.

Gates, all of which MUST be green before merge:

- Backend: `ruff` lint and the full pytest suite against real PostgreSQL.
- Frontend: lint, `tsc --noEmit`, production build, and Vitest including the
  six-locale parity gate.
- Playwright E2E against an ephemeral QA stack.

Nothing is reported as done on the strength of a green build alone. Verify the
behaviour — in the browser, in the API, or in production after the deploy.

## Governance

This constitution governs how features are specified, built and reviewed. Where
it conflicts with habit, the constitution wins; where it conflicts with
`CLAUDE.md` on deployment, infrastructure or money, `CLAUDE.md` wins and this
document is corrected.

Amendments: proposed in a pull request that states what changed and which
incident or decision prompted it. Versioning is semantic — MAJOR for removing or
redefining a principle, MINOR for adding one or materially widening guidance,
PATCH for clarifications.

Compliance: every pull request is expected to satisfy the principles above, and
to say plainly when it does not and why. A principle that is routinely waived is
either wrong or unenforced; both are amendments waiting to be written, not
things to leave in place.

**Version**: 1.0.0 | **Ratified**: 2026-08-16 | **Last Amended**: 2026-08-16

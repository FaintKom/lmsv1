---
description: "Task list for the school enquiry pipeline — remaining work"
---

# Tasks: School enquiry pipeline

**Input**: Design documents from `/specs/001-crm-enquiry-pipeline/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: Required, not optional. Constitution Principle II — every guard gets a test
demonstrated failing against the unguarded behaviour before it is trusted. That
demonstration is its own task below, because a guard whose test never went red has been
described rather than tested.

**Organization**: grouped by user story. Phases run in the order the plan gives — by
payoff, not by story number — so the broken thing is fixed before anything new is built.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallelisable — different files, no dependency on an unfinished task
- **[Story]**: US1…US5 from spec.md

## Path Conventions

Web application: `backend/app/`, `backend/tests/`, `frontend/src/`, `frontend/e2e/`.

---

## Phase 1: Setup

**Purpose**: know the ground is solid before standing on it

- [X] T001 Start PostgreSQL (`docker compose up -d db redis sandbox`) and run `cd backend && python -m pytest tests/ -q` to confirm the suite is green before any change
- [X] T002 [P] Run `cd backend && python -m alembic heads` and record the single head — this plan adds no migration, so the head must be unchanged when it ends

---

## Phase 2: Foundational

**Purpose**: none.

v1 shipped the models, the org-scoped guard, the router, the board and the daily sweep.
There is no blocking prerequisite left, and inventing one would be ceremony. Every story
below is independently implementable from here.

**Checkpoint**: the foundation already exists — story work can begin immediately.

---

## Phase 3: User Story 1 — Work an enquiry through to an enrolled pupil (P1) 🎯 MVP

**Goal**: close the defect that makes the funnel end in nothing, and put a browser over
the board that carries it.

**Independent Test**: convert an enquiry, follow the emailed link as the pupil, set a
password, sign in. Then run the board journey and watch it exercise the same flow
through the interface.

### Tests for User Story 1 — write first, prove they fail

- [X] T003 [US1] Failing test in `backend/tests/test_crm.py`: after conversion the pupil sets a password using the issued token and authenticates successfully. Must fail today — conversion issues no token
- [X] T004 [P] [US1] Failing test in `backend/tests/test_crm.py`: the guardian created by conversion receives a usable invitation of their own
- [X] T005 [P] [US1] Failing test in `backend/tests/test_crm.py`: an invitation works exactly once; a second use is refused
- [X] T006 [P] [US1] Failing test in `backend/tests/test_crm.py`: the conversion response reports whether invitations were actually sent, so an office with mail switched off is told rather than left assuming

### Implementation for User Story 1

- [X] T007 [US1] Add `issue_invitation_token(db, user, ttl)` to `backend/app/auth/service.py`, writing a `PasswordResetToken` with a longer expiry than an ordinary reset (research §1) — no new table
- [X] T008 [P] [US1] Add `send_account_invitation(to_email, full_name, school_name, token, expires_at)` to `backend/app/email/service.py`, linking to the existing reset page
- [X] T009 [US1] Call both from `convert_lead` in `backend/app/crm/service.py` for the pupil and, when created, the guardian; return `invitations_sent` in the result (depends on T007, T008)
- [X] T010 [US1] Show the invitation outcome after conversion in `frontend/src/app/(admin)/admin/crm/page.tsx`, with its strings in all six files under `frontend/src/lib/i18n/locales/`
- [X] T011 [US1] Write `frontend/e2e/journeys/crm-board.spec.ts`: record an enquiry, move it between columns, log a note, set a reminder, convert — all through the interface, asserting the enquiry's own row rather than that the page rendered
- [X] T012 [US1] Demonstrate T011 failing: break the conversion step, confirm the journey goes red, restore it, confirm green

**Checkpoint**: a converted family can sign in, and the board is exercised by a browser.

---

## Phase 4: User Story 3 — The school's website feeds the pipeline (P2)

**Goal**: an enquiry can arrive without anyone at the school retyping it.

**Independent Test**: submit the public page signed out; see the enquiry on the board
with the website as its source; confirm no other school can see it.

### Tests for User Story 3 — write first, prove they fail

- [X] T013 [US3] Failing test in `backend/tests/test_crm.py`: an anonymous submission creates a lead in the named school, stage `new`, source `website`, no owner
- [X] T014 [P] [US3] Failing test: two submissions of the same address return byte-identical responses, so the form cannot be used to ask who has been in touch (FR-019)
- [X] T015 [P] [US3] Failing test: an unknown slug and an inactive school both answer 404, revealing nothing
- [X] T016 [P] [US3] Failing test: submissions past the rate limit answer 429
- [X] T017 [P] [US3] Failing test: a course id belonging to another school is ignored rather than attached

### Implementation for User Story 3

- [X] T018 [US3] Create `backend/app/crm/public_router.py` with `GET /{org_slug}` (school name plus published course titles) and `POST /{org_slug}/enquiries`, rate-limited through the existing `slowapi` limiter, fields capped per `contracts/api.md`
- [X] T019 [US3] Mount it in `backend/app/main.py` at `/api/v1/crm/public`, separate from the authenticated router so the public surface is visible in the file tree
- [X] T020 [P] [US3] Add the public calls to `frontend/src/lib/api/crm.ts`
- [X] T021 [US3] Create `frontend/src/app/s/[slug]/enquire/page.tsx` — the school's public enquiry page — with its strings in all six locale files
- [X] T022 [US3] Add a journey step that submits the public page signed out and finds the enquiry on the board as an administrator

**Checkpoint**: enquiries arrive without being retyped.

---

## Phase 5: User Story 5 — A closed enquiry that comes back (P3)

**Goal**: a returning family is one record with one history, not two.

**Independent Test**: close an enquiry as lost, reopen it, confirm it returns to the
board with its earlier history and the reopening recorded.

### Tests for User Story 5 — write first, prove they fail

- [X] T023 [US5] Failing test in `backend/tests/test_crm.py`: reopening a lost enquiry returns it to `contacted`, keeps `lost_reason`, and appends a `reopened` history entry
- [X] T024 [P] [US5] Failing test: reopening a converted enquiry is refused — the pupil already exists
- [X] T025 [P] [US5] Failing test: reopening an already-open enquiry is refused
- [X] T026 [P] [US5] Failing test: another school's enquiry cannot be reopened and reads as 404

### Implementation for User Story 5

- [X] T027 [US5] Add `reopened` to `EVENT_KINDS` in `backend/app/crm/models.py` — a Python tuple, so no migration (data-model.md)
- [X] T028 [US5] Add `reopen_lead` to `backend/app/crm/service.py`, resolving the lead through the existing org guard
- [X] T029 [US5] Add `POST /leads/{lead_id}/reopen` to `backend/app/crm/router.py`
- [X] T030 [US5] Offer reopening on a closed enquiry in `frontend/src/app/(admin)/admin/crm/page.tsx`, strings in all six locale files

**Checkpoint**: the funnel's numbers stop being corrupted by duplicates.

---

## Phase 6: User Story 2 — The follow-up nobody forgets (P2)

**Goal**: a reminder reaches its owner even when they are not signed in, and an
unassigned one reaches the office rather than nobody.

**Independent Test**: set an overdue reminder with no assignee, run the sweep, confirm
the school's administrators are notified and emailed exactly once.

### Tests for User Story 2 — write first, prove they fail

- [X] T031 [US2] Failing test in `backend/tests/test_crm.py`: a due reminder with no assignee notifies the school's administrators
- [X] T032 [P] [US2] Failing test: a due reminder is emailed as well as put in the bell, exactly once
- [X] T033 [P] [US2] Failing test: a reminder whose enquiry has been closed notifies nobody — it belongs to work that no longer exists

### Implementation for User Story 2

- [X] T034 [P] [US2] Add `send_crm_reminder(to_email, title, contact_name)` to `backend/app/email/service.py`, linking to the board
- [X] T035 [US2] Extend `_sweep_crm_task_reminders` in `backend/app/scheduler.py`: fall back to org administrators when unassigned, queue the email alongside the notification, and skip reminders on closed enquiries (depends on T034)

**Checkpoint**: no enquiry passes its follow-up date unnoticed.

---

## Phase 7: User Story 4 — The owner sees which channel is worth the money (P3)

**Goal**: a school can state its conversion rate and its best source without leaving the
product.

**Independent Test**: with a known set of enquiries across sources and outcomes, the
reported numbers match what was entered.

### Tests for User Story 4 — write first, prove they fail

- [X] T036 [US4] Failing test in `backend/tests/test_crm.py`: counts and conversion rate over a window match a known set
- [X] T037 [P] [US4] Failing test: the breakdown by source counts nulls as unknown rather than dropping them
- [X] T038 [P] [US4] Failing test: median time to first contact is derived from the earliest contact event per enquiry
- [X] T039 [P] [US4] Failing test: a reversed range and a range over 366 days both answer 422; an empty window answers zeroes and a null median rather than an error
- [X] T040 [P] [US4] Failing test: the report counts only the caller's school

### Implementation for User Story 4

- [X] T041 [US4] Add `funnel_report(db, user, from_date, to_date)` to `backend/app/crm/service.py`, computed from existing rows — no denormalised column (research §4)
- [X] T042 [US4] Add `GET /crm/report` to `backend/app/crm/router.py` with range validation
- [X] T043 [US4] Add the report to `frontend/src/app/(admin)/admin/crm/page.tsx` with its strings in all six locale files

**Checkpoint**: the school can tell which channel earns its money.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T044 [P] Add the CRM to `tasks/todo.md` — it was built on request and never entered the plan, so the plan currently understates what exists
- [X] T045 [P] Add the CRM routers to the index in `docs/API_REFERENCE.md`
- [X] T046 Run `specs/001-crm-enquiry-pipeline/quickstart.md` end to end and record what was actually seen, not what was expected
- [X] T047 Confirm `alembic heads` still reports the head recorded in T002 and that no migration was added
- [ ] T048 After merge, verify the deploy reached production and the board still works there — a green merge is not a green deploy

---

## Dependencies & Execution Order

### Phase order

Setup → (no foundational work) → US1 → US3 → US5 → US2 → US4 → Polish.

Payoff order, not story-number order. US1 comes first because it is broken today: every
conversion since the module shipped has produced two accounts nobody can use. The board
journey rides with it because it exercises the same flow and would have caught the
defect had it existed.

### Story independence

Each story stands alone after Phase 1. US3, US5, US2 and US4 touch different files and
could be done in any order or in parallel; the sequence above is about value, not
constraint.

### Within each story

Failing test → prove it fails → implement → prove it passes. Backend before frontend,
because the interface is built against a contract that already works.

### Parallel opportunities

- T004, T005, T006 — independent assertions, write and run together
- T014, T015, T016, T017
- T024, T025, T026
- T032, T033
- T037, T038, T039, T040
- T044, T045

---

## Implementation Strategy

### MVP for this increment

Phase 3 alone. It turns a funnel that ends in nothing into one that ends in a pupil who
can sign in, and it puts the board under a browser for the first time. Ship it, verify
in production, then continue.

### Incremental delivery

Each phase is its own pull request with its own CI run. Merging is deploying, so nothing
waits for the whole feature to be finished. If work stops after any checkpoint, what
shipped is coherent on its own.

---

## Notes

- No migration in any task. If one appears, something has been designed that the plan
  did not intend — stop and re-read `data-model.md`.
- Every string added to the interface goes into all six locale files, or the parity gate
  fails. It has caught this exact omission before.
- Commit per task or per logical group. The pre-commit formatter rewrites files on the
  first attempt; re-add and commit again rather than fighting it.

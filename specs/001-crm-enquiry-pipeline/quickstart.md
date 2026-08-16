# Phase 1 — Validation guide: school enquiry pipeline

How to prove the remaining work actually works. Every check below fails today; that is
the point of writing them before the code.

## Prerequisites

```bash
docker compose up -d db redis sandbox
cd backend && pip install -e .[dev]
```

Postgres is required — the suite refuses to run without it.

For the browser journey, the ephemeral QA stack rather than the dev server:

```bash
docker compose -f docker-compose.qa.yml up -d
python scripts/seed_qa.py
```

## Backend

```bash
cd backend
python -m pytest tests/test_crm.py -q
python -m pytest tests/ -q
python -m ruff check app/ tests/
```

**Expected**: every new guard has a test that fails against the unguarded behaviour.
Before trusting one, break the guard, watch the test go red, put it back. A guard whose
test never went red has not been tested — it has been described.

## The invitation, end to end

```bash
cd backend && python -m pytest tests/test_crm.py -k invitation -q
```

**Expected**: converting an enquiry issues one single-use token per created account,
each usable exactly once at the existing reset endpoint, and a second use is refused.
The test asserts the token *works* — not merely that a row was written, which is what
the current code would already pass.

Manually, against a stack with mail configured: convert an enquiry, receive two emails,
follow the pupil's link, set a password, sign in as that pupil. That last step is the
whole requirement; anything short of it repeats the defect this spec found.

## The public enquiry page

```bash
cd frontend && npm run dev
```

Open `http://localhost:3000/s/qa-org/enquire` signed out, submit the form, then sign in
as `qa-admin@qa.example.com` and confirm the enquiry sits in the first column with its
source recorded as the website.

Then check what it refuses:

- submit repeatedly until the rate limit answers 429;
- submit the same address twice and confirm both answers are byte-identical;
- open `/s/does-not-exist/enquire` and confirm it 404s rather than revealing anything.

## The board, through a browser

```bash
cd frontend && npx playwright test e2e/journeys/crm-board.spec.ts
```

**Expected**: the journey records an enquiry, moves it between columns, logs a note,
sets a reminder and converts — all through the interface, not the API. It must assert
the enquiry's own row, not merely that the page rendered: the class journal and the
mobile chrome both shipped broken behind assertions that loose.

## The reminder sweep

```bash
cd backend && python -m pytest tests/test_crm.py -k reminder -q
```

**Expected**: a due reminder notifies once and emails once; a second sweep does
nothing; an unassigned reminder reaches the school's admins; a reminder on a closed
enquiry reaches nobody.

## The report

```bash
cd backend && python -m pytest tests/test_crm.py -k report -q
```

**Expected**: with a known set of enquiries across sources and outcomes, the reported
counts, conversion rate and median time to first contact match what was entered. An
empty window returns zeroes rather than an error.

## Frontend gates

```bash
cd frontend
npx tsc --noEmit
npm test -- --run
npm run lint
```

Any new string is in all six locale files or the parity test fails. That gate exists
because it has caught this exact omission before.

## Done means

All of the above pass, **and** the behaviour has been seen working — in the browser for
the page and the board, in a real inbox for the invitation. A green suite is evidence,
not proof; the constitution asks for both.

# GrassLMS

A learning platform for schools and course creators, running in production at
**[grasslms.online](https://grasslms.online)**.

Built for the three subjects where a generic LMS gives up: programming needs a
place to run code, mathematics needs the answer checked rather than the
keystrokes matched, and languages need drills that are more than multiple
choice. GrassLMS grades all three on the server.

> **Licence: All Rights Reserved.** The source is published for transparency and
> reference — reading it is welcome, using it is not licensed. See
> [LICENSE](LICENSE). For school or commercial licensing, write to
> `faintkom@gmail.com` — the address the licence itself names.

---

## What it does

**Runs a lesson while it is happening.** A teacher opens a live lesson and the
class follows: everyone on the same task, a shared board, hands raised, polls,
and a panel showing who is stuck right now. State travels over SSE with Redis
pub/sub, so a reload mid-lesson picks up where the tab left off.

**Marks the work.** 26 exercise types, from multiple choice through matching,
ordering and cloze to code challenges, systems of equations and solids. Student
code runs in an isolated container — no network, read-only filesystem, CPU and
memory capped — across Python, JavaScript, Java, C++ and Go.

**Keeps the answers on the server.** Correct answers are stripped from
everything a student's browser receives, and grading happens server-side. A
student can read every byte the page loaded and still not find the key.

**Handles the rest of a school.** Courses and lessons with a block editor,
homework, a gradebook, attendance and a journal, certificates, groups,
scheduling, analytics, SCORM import, and a parent view.

Six interface languages: English, Spanish, Russian, Turkish, German, Ukrainian.

---

## Numbers worth checking

Every figure here is countable in this repository, and the landing page has a
test that fails if the exercise count drifts from the code.

| | |
|---|---|
| Exercise types | 26 (`frontend/src/lib/api/exercises.ts`) |
| API endpoints | 362 across 45 backend modules |
| Interface languages | 6, with a key-parity test as a CI gate |
| Sandbox languages | 5 |

---

## Stack

**Backend** — Python 3.12, FastAPI, SQLAlchemy 2 (async), Alembic, PostgreSQL 16
with pgvector, Redis. Feature-modular: every module owns its `models.py`,
`schemas.py`, `router.py`, `service.py`.

**Frontend** — Next.js 16 (App Router), React 19, TypeScript strict, Tailwind 4,
TanStack Query, Zustand. TipTap for authoring, Monaco for code, Three.js and
React Three Fiber for 3D exercises, Blockly for block programming.

**Infrastructure** — Docker Compose on a single VPS behind nginx. Images build
in CI and are pulled by the host; merging to `main` deploys.

Multi-tenancy is enforced by an `org_id` on every business table plus
authorization checks per request. Sessions live in httpOnly cookies — no tokens
in `localStorage`.

---

## Running it locally

```bash
docker compose up -d db redis sandbox

cd backend && pip install -e ".[dev]" && uvicorn app.main:app --reload
cd frontend && npm install && npm run dev
```

The app is then on `http://localhost:3000` and the API on `http://localhost:8000`
(`/docs` for Swagger). Full setup, including environment variables, is in
[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

---

## Testing

- **Backend** — pytest against a real PostgreSQL, ~770 tests.
- **Frontend** — Vitest for units, including the locale-parity gate.
- **End to end** — Playwright against an ephemeral Docker stack seeded from
  `qa/exercise-fixtures.json`; it runs on every pull request that touches the
  app.

Recipes are in [docs/TESTING.md](docs/TESTING.md).

---

## What is not here

Stated plainly, because a feature list that only ever grows is not worth
trusting.

- **The knowledge module is dormant.** The tables, the migration and the
  ingestion code exist; the router is not mounted and there is no UI.
- **The lesson Q&A widget is off unless a key is configured.** Without
  `LLM_API_KEY` the endpoint answers 503 and the rest of the app is unaffected.
- **No traction to report.** No customer logos, no testimonials, no growth
  charts — there are no customers yet, and inventing them was never an option.

---

## Documentation

| | |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Module map and multi-tenancy |
| [docs/API_REFERENCE.md](docs/API_REFERENCE.md) | Router index |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Local setup from zero |
| [docs/TESTING.md](docs/TESTING.md) | pytest, Vitest, Playwright |
| [docs/MIGRATIONS.md](docs/MIGRATIONS.md) | Alembic recipes and PostgreSQL notes |

---

Licensing: `faintkom@gmail.com`. Anything about the running service:
`support@grasslms.online`.

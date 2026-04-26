# GrassLMS

**Modern Learning Platform for schools teaching programming, mathematics, and languages.**

Live at **https://grasslms.online**.

GrassLMS is a self-hosted, B2B learning management system built from the
ground up for schools where students write real code, solve real math, and
learn real skills — not just check boxes on a quiz.

## What's inside

- **Real code sandbox** — 37 programming languages, auto-graded test cases,
  Monaco editor, sandboxed execution.
- **Interactive math** — coordinate planes, equation balance, fraction
  manipulators, Desmos integration, full SAT Math curriculum pre-loaded.
- **Self-hosted AI Tutor** — Socratic-style hints, no student data sent to
  third-party AI providers.
- **9 lesson types** + **11 exercise formats** (matching, ordering, fill-in,
  categorize, code, quiz, 2D robot, 3D world, ...).
- **Gamification** — XP, streaks, badges, 5-tier leagues, leaderboards.
- **Knowledge module** — pgvector-backed RAG over a curated edtech corpus.
- **Course tooling** — gradebook, assignments, review queue, analytics,
  CSV import, certificates, learning paths.
- **Multi-role** — admin, teacher, student, parent.
- **i18n** — English, Russian, German, Ukrainian.
- **GDPR-ready** — Article 20 export, consent tracking, EU hosting.

See [`ROADMAP.md`](ROADMAP.md) for the full feature list (80+ shipped) and
phase plan.

## Stack

- **Backend** — FastAPI (async), SQLAlchemy 2 async, Alembic, Pydantic v2,
  Python 3.12.
- **Frontend** — Next.js 16 (App Router), React 19, TypeScript strict,
  Tailwind 4, Zustand, TanStack Query, TipTap, Monaco, Three.js + R3F.
- **Database** — PostgreSQL 16 with pgvector for semantic search.
- **Sandbox** — separate container, read-only tmpfs, resource limits.
- **Reverse proxy** — nginx with HSTS + CSP.
- **Hosting** — single Hetzner VPS, Docker Compose, daily Postgres backups.

## Status

Closed-source production deployment maintained by the project owner. This
repo is published for transparency, not external contribution. Issues and
feedback welcome; PRs from outside the team will not be reviewed by default.

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — module map, multi-tenancy,
  knowledge RAG pipeline.
- [`docs/API_REFERENCE.md`](docs/API_REFERENCE.md) — 193+ endpoints index.
- [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) — local setup from zero.
- [`docs/MIGRATIONS.md`](docs/MIGRATIONS.md) — Alembic recipes.
- [`docs/TESTING.md`](docs/TESTING.md) — pytest + Playwright.
- [`docs/LMS_UX_DESIGN_GUIDE.md`](docs/LMS_UX_DESIGN_GUIDE.md) — UX standards.
- [`CLAUDE.md`](CLAUDE.md) — production deploy notes.

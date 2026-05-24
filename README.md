# GrassLMS

**AI-native learning management system for K-12 schools and universities.**
Live at **[grasslms.online](https://grasslms.online)**.

GrassLMS is a modern alternative to Moodle, Canvas, and Schoology — built from the ground up around AI-assisted teaching, automatic grading, and multilingual delivery. Designed for schools that want a single platform for courses, assessments, scheduling, communications, and reporting without vendor lock-in or per-seat SaaS pricing.

License: **All Rights Reserved** — source published for transparency only. See [LICENSE](LICENSE). For commercial / school licensing, contact `ceo@grasslms.online`.

---

## Status

- **In production** at [grasslms.online](https://grasslms.online) — daily Postgres backups, fail2ban, Cloudflare tunneling, JWT enforcement, rate limiting, file upload validation.
- **Hardened for public source release** — secrets externalised, test passwords rotated, security policy applied.
- **Solo-built** in 2.5 months — 400+ commits, 36 backend modules, 193+ API endpoints, 20+ interactive exercise types.

---

## What's in the box

### Core platform

| Module | What it does |
|--------|--------------|
| **auth** | Email/password sign-in with JWT (rotating refresh tokens, revocation list), bcrypt-hashed passwords, email verification, 5 roles (super_admin / admin / teacher / student / parent), forgot/reset flow, rate-limited login |
| **orgs** | Multi-tenancy — every resource scoped by `org_id`. Per-user organization memberships for users who belong to several institutions |
| **admin** | User CRUD, role assignment, organization management, bulk operations |
| **courses** | Course creation, lessons, modules, theory blocks (TipTap rich text), KaTeX math rendering, content library, enrollment management |
| **learning_paths** | Multi-course curricula with prerequisite gating ("unlock next course on completion") |
| **assignments** | Homework with deadlines, late-submission handling, file uploads, teacher grading workflow, student submission history |
| **exercises** | 20+ exercise types — quiz, multiple choice, code challenge, matching, ordering, fill-blanks, true/false, categorize, file upload, crossword, interactive math widgets, function graphing, 3D world tasks |
| **assessments** | Quizzes with multiple question types, time limits, randomization, retries |
| **submissions** | Unified submission store across exercises, assignments, code challenges |
| **progress** | Per-student progress tracking, percent-complete per course, learning analytics |
| **gradebook** *(in admin)* | Matrix view of all student scores across quizzes + assignments + code challenges, color-coded, CSV/Excel export, manual override |

### Engagement & retention

| Module | What it does |
|--------|--------------|
| **gamification** | XP, streaks, daily challenges, badges, leaderboard |
| **certificates** | Auto-generated PDF completion certificates with unique verification codes |
| **discussions** | Per-course / per-lesson threaded discussions, attachments, notifications |
| **notifications** | In-app + email notifications (graded work, deadlines, replies, announcements) |
| **calendar** | Course-aware calendar — assignments, meetings, deadlines as events |
| **meetings** | Video meetings (Jitsi / Zoom / Google Meet integrations) with attendance tracking |
| **attendance** | Per-session attendance records, group-level reports |

### Assessment & integrity

| Module | What it does |
|--------|--------------|
| **math_problems** | Math problem bank — author once, randomize parameters per student |
| **math_validation** | Symbolic equivalence checking (SymPy) — student types `2x+4` and the platform accepts `4+2x` as correct |
| **plagiarism** | Submission similarity detection across student work |
| **peer_review** | Anonymous peer assessment with teacher-defined rubrics |
| **team_projects** | Group assignments with per-member contribution tracking |
| **sandbox** | Isolated container for untrusted student code (read-only tmpfs, CPU/memory limits, no network) |

### Admin & operations

| Module | What it does |
|--------|--------------|
| **billing** | Plan management, subscription state, invoices |
| **metered_billing** | Usage-based billing for institutions (per-student / per-course pricing tiers) |
| **export** | Course / data export for migration and backup |
| **scorm** | SCORM 1.2 + 2004 content playback inside the LMS |
| **scorm_import** | Import third-party SCORM packages into the course library |
| **integrations** | Webhook + third-party tool integrations |
| **webhooks** | Outbound event delivery (course completed, assignment graded, certificate issued) |
| **recording** | Video/audio recording capture for lessons and submissions |
| **parent** | Parent portal — read-only view of child's courses, grades, attendance |
| **skills** | Skill-graph tagging across courses and exercises |
| **recommendations** | Next-course / next-exercise suggestions based on completed work |
| **waitlist** | Pre-launch / closed-course interest capture |

### AI features (shipped)

- **AI tutor** — streaming chat assistant for students inside lessons and exercises. Runs on a **self-hosted Ollama instance** (qwen2.5:3b) — no third-party LLM API costs in the default setup. Per-user rate limit (30 messages/hour). LaTeX-aware math responses.
- **AI-assisted exercise authoring** — teachers describe a topic; the platform generates exercise variants.
- **Multilingual prompts** — English, Russian, Turkish UI and tutor responses out of the box. Spanish coming.

---

## Tech stack

| Layer | What |
|-------|------|
| **Backend** | Python 3.12, FastAPI (async), SQLAlchemy 2 (async), asyncpg, Alembic, Pydantic v2, python-jose, bcrypt, slowapi, APScheduler, structlog, Sentry SDK |
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript strict, Tailwind 4, Zustand, TanStack Query, Axios, TipTap, Monaco editor, Three.js + React Three Fiber, JSXGraph |
| **Database** | PostgreSQL 16 (with pgvector extension), Redis |
| **AI** | Ollama (self-hosted local LLM) for tutor; pluggable provider layer ready for Claude / GPT / Gemini / Mistral / Llama hosted endpoints |
| **Infra** | Docker Compose, nginx reverse proxy, Cloudflare Tunnel, fail2ban, daily `pg_dump` backups |
| **Runtime** | One small VPS in production today; scales horizontally with shared Postgres + Redis |

193+ REST endpoints under `/api/v1/`. Full OpenAPI spec at `/docs` (Swagger) and `/redoc`.

---

## Architecture

Feature-modular backend — every module owns `models.py`, `schemas.py`, `router.py`, `service.py`. Multi-tenancy enforced by `org_id` FK on every business table plus per-request authorization checks. JWT auth with rotating refresh tokens and a revocation list. Rate limiting via SlowAPI with Redis-backed storage in production.

Frontend uses Next.js App Router with three route groups:

- `(auth)` — sign in, register, forgot password
- `(dashboard)` — student/parent UI (courses, assignments, calendar, certificates, leaderboard, skills)
- `(admin)` — teacher/admin UI (courses, lessons editor, gradebook, review queue, analytics, content library, org members)

Detailed docs:

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — module map and dependencies
- [`docs/API_REFERENCE.md`](docs/API_REFERENCE.md) — endpoint index
- [`docs/MIGRATIONS.md`](docs/MIGRATIONS.md) — Alembic workflow + Postgres gotchas
- [`docs/TESTING.md`](docs/TESTING.md) — pytest fixtures, Playwright local setup
- [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) — local setup from zero

---

## For schools

GrassLMS is being made available to schools under a commercial license. Typical engagement:

- Managed hosting on your subdomain (e.g. `<school>.grasslms.online`) — backups, updates, monitoring handled by us.
- Self-hosted under licence — you run it on your own infrastructure.
- Migration assistance from Moodle / Canvas / Google Classroom.
- Custom course library curation.
- Multilingual support (English / Russian / Turkish today; Spanish next).

To start a pilot conversation: **`ceo@grasslms.online`**.

---

## For grant programs and accelerators

GrassLMS is bootstrapped, solo-founded, pre-revenue, with a production deployment serving real users at grasslms.online. The platform's narrow scope (K-12, multilingual, AI-assisted) targets segments where incumbents underperform.

If you run an EdTech accelerator, AI credit programme, or grant scheme aligned with affordable schooling, multilingual education, or AI in learning, we'd welcome a conversation: **`ceo@grasslms.online`**.

A one-pager and product demo are available on request.

---

## Source visibility ≠ open source

This repository is public so that schools, researchers, security auditors, and grant reviewers can verify what the code actually does — but the licence is restrictive.

**You may:** read the source on GitHub; fork the repo solely to submit PRs back to this repository.

**You may not (without written permission):** run the software, use snippets in other projects, train ML models on this code, republish or redistribute it, use the GrassLMS name or logo in derivative works.

Full terms in [LICENSE](LICENSE).

If you want to use GrassLMS commercially, in a research collaboration, or as a base for school deployments — write to `ceo@grasslms.online`. We expect to publish a separate school-friendly license and pricing in due course.

---

## Contact

- **Product:** [grasslms.online](https://grasslms.online)
- **Commercial and partnership inquiries:** `ceo@grasslms.online`
- **License inquiries:** `ceo@grasslms.online`
- **Security disclosure:** `ceo@grasslms.online` (please do not file public issues for vulnerabilities)

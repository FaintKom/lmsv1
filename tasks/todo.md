# LearnHub LMS — Sellability Plan

**Audit date:** 2026-04-09
**Current state:** Product 7/10, go-to-market 3/10
**Goal:** First paying customer within ~5 weeks

---

## Summary of findings

### What's strong (don't touch)
- Lesson player with 10+ interactive exercise types (Monaco, TipTap+KaTeX, Three.js, Desmos, dnd-kit, robot/math widgets)
- Drag-drop course builder with reordering
- 4C/ID pedagogy + SAT Math course as differentiator
- Modern stack: Next.js 16, React 19, FastAPI async, SQLAlchemy async, Alembic, Pydantic v2
- Multi-tenancy via `org_id` correctly implemented
- Stripe integration: checkout, customer portal, webhooks, invoices
- GDPR Article 20 data export actually implemented in `backend/app/auth/gdpr.py`
- Deploy: Hetzner CX22 + Coolify + Cloudflared tunnel, €3.79/mo
- 176 API endpoints, ~3k lines of backend tests (13 test files)

### Audit scope
Four parallel explore agents analyzed: backend, frontend, deployment/ops, product/marketing. Findings consolidated below by priority.

---

## P0 — Critical blockers (must fix before showing to any prospect)

### Security

- [ ] **P0-1. Remove hardcoded admin credentials from `backend/app/main.py:145`**
      Current: `faintkom@gmail.com` / `REDACTED_PASSWORD` hardcoded in source.
      Fix: move to env vars (`SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`), fail-fast if unset in production, require change on first login.

- [ ] **P0-2. JWT_SECRET enforcement in `backend/app/config.py`**
      Current: default value `"change-me-in-production"` with no check.
      Fix: on startup, raise error if secret equals default value or is shorter than 32 chars. Only allow default in `ENV=development`.

- [ ] **P0-3. Rate limiting on `/auth/login` and `/auth/register`**
      Current: no rate limit; brute-force possible.
      Fix: install `slowapi`, apply `@limiter.limit("5/minute")` on login, `@limiter.limit("3/hour")` on register. Use Redis backend for distributed state (or in-memory as starter).

- [ ] **P0-4. Refresh token revocation / expiry**
      Current: refresh tokens valid indefinitely after grant, no revocation list.
      Fix: add `refresh_token_jti` table with `revoked_at`, check on refresh endpoint. Rotate on each refresh. Logout endpoint revokes.

- [ ] **P0-5. File upload validation**
      Current: no MIME type check, size only enforced in config not in endpoint.
      Fix: whitelist extensions, verify actual file type (not just extension), enforce size at endpoint level.

- [ ] **P0-6. Email verification on registration**
      Current: new accounts active immediately.
      Fix: send verification email with token, block `is_active=False` until clicked. Wire to existing email infrastructure.

### Operations

- [ ] **P0-7. Sentry error tracking**
      Current: no error tracking, no logs aggregation.
      Fix: `sentry-sdk[fastapi]` + Next.js `@sentry/nextjs`. Free tier. ~30 min.

- [ ] **P0-8. Automated Postgres backups**
      Current: undocumented, manual only.
      Fix: cron `pg_dump` → S3/R2/B2 nightly, 30-day retention, scripted restore test.

- [ ] **P0-9. Nginx security headers**
      Current: `deploy/nginx.conf` missing HSTS, CSP, X-Frame-Options, X-Content-Type-Options.
      Fix: add security headers block. Test with securityheaders.com.

- [ ] **P0-10. Migrations on startup — move to pre-start**
      Current: migrations run in background after API accepts requests (`main.py:46-77`).
      Fix: run before API starts accepting requests, or move to init container.

### Product

- [ ] **P0-11. Stripe checkout flow end-to-end**
      Current: billing page shows "not configured" error in some states.
      Fix: verify full flow works dev→prod, test with real cards in test mode, document required env vars.

- [ ] **P0-12. Public `/pricing` page**
      Current: no pricing visible on public site.
      Fix: add pricing page with 4 tiers (Free, Starter $29, Professional $79, Enterprise $199), feature comparison table, FAQ, CTAs per plan.

- [ ] **P0-13. i18n implementation — English + Russian**
      Current: locale context and switcher exist, but no translation files; UI is English-only.
      Fix: extract strings to `locales/en.json` and `locales/ru.json`, wire `t()` throughout UI, test switcher, set default based on `Accept-Language`.

- [ ] **P0-14. Auto-seed demo course on new org creation**
      Current: new admin sees empty org.
      Fix: on org creation, clone SAT Math course (or a purpose-built "Welcome to LearnHub" course) into the new org as a template.

---

## P1 — High priority (before first real customer onboarding)

### Infrastructure

- [ ] **P1-1. GitHub Actions CI/CD**
      Lint + test + build on PR, auto-deploy main → staging. Path: `.github/workflows/ci.yml`.
- [ ] **P1-2. Background task queue (Celery or RQ + Redis)**
      Move email sending off request thread; enable cron for deadline reminders (A8).
- [ ] **P1-3. Structured logging**
      `structlog` + JSON output, request ID correlation, log levels per environment.
- [ ] **P1-4. Health check endpoint with dependency checks**
      Current `/health` only returns ready bool. Add DB, Redis, Judge0, Stripe ping. Expose `/health/live` and `/health/ready` for k8s-style probes.
- [ ] **P1-5. Redis for rate limiting + caching + session state**
      Current rate limit is in-memory; breaks on multi-instance.
- [ ] **P1-6. Distributed file storage (S3/R2)**
      Current `/data/uploads` on local disk; breaks horizontal scaling. Migrate to S3-compatible.

### Testing

- [ ] **P1-7. Frontend test setup (0% → baseline)**
      Install Vitest + React Testing Library + Playwright. Write 5-10 E2E tests on critical paths: signup → enroll → complete lesson → get grade; teacher creates course; student submits assignment.
- [ ] **P1-8. Backend test coverage to ~50%**
      Current ~25%. Add tests for Stripe webhook handlers, rate limiting, concurrent access, assignment submission edge cases.

### Product UX

- [ ] **P1-9. Video progress tracking**
      Persist video timestamp per lesson, resume from last position, mark as watched at 90%.
- [ ] **P1-10. Bulk student enrollment (CSV import)**
      Admin UI: upload CSV, preview, confirm. Error handling for invalid rows.
- [ ] **P1-11. Gradebook XLSX export**
      Current CSV only. Add XLSX with formatting (color-coded scores, formulas).
- [ ] **P1-12. Teacher onboarding tour**
      3-minute product tour (Intro.js or Driver.js) for first-time teachers covering: create course, add module, add lesson, publish, enroll student.
- [ ] **P1-13. Wire email notifications UI to backend**
      Email preferences page exists as backend; add frontend UI under `/profile/notifications`.
- [ ] **P1-14. WCAG 2.1 AA accessibility audit + fixes**
      Alt text on icons, ARIA landmarks, keyboard nav, focus management, form label associations. Use `accessible-learning-designer` skill.

### Go-to-market

- [ ] **P1-15. 5-minute demo video**
      Script teacher + student experience. Record with Loom or OBS. Publish on landing page and YouTube.
- [ ] **P1-16. Sales one-pager PDF**
      Value prop, features, pricing, comparison table (vs Moodle/Teachable/Thinkific), contact.
- [ ] **P1-17. Public live demo**
      Read-only view account with SAT Math course preloaded. Bypass signup friction.
- [ ] **P1-18. Pick ONE target segment**
      Proposal: SAT prep (strongest content, clearest differentiation). Create dedicated landing page `/for-test-prep`.
- [ ] **P1-19. First beta customer acquisition**
      Find 1 real school or tutor with 10+ students, pilot for free or reduced price, gather feedback.

---

## P2 — Nice to have (after first customer)

- [ ] P2-1. SCORM/xAPI export (corporate clients)
- [ ] P2-2. White label + custom domain (Enterprise tier feature)
- [ ] P2-3. Plagiarism detection
- [ ] P2-4. Peer code review
- [ ] P2-5. Team projects
- [ ] P2-6. Offline/PWA
- [ ] P2-7. In-app video/audio recording
- [ ] P2-8. Attendance tracking
- [ ] P2-9. Metered billing / usage-based pricing
- [ ] P2-10. Postgres read replicas
- [ ] P2-11. Multi-org for single user
- [ ] P2-12. Webhook API for customers
- [ ] P2-13. Waitlist / pre-launch community mechanism

---

## Execution order — First wave (current session)

Starting with the highest-impact lowest-risk security fixes that can be done without running services:

1. **P0-1** — Remove hardcoded admin creds
2. **P0-2** — JWT secret enforcement
3. **P0-3** — Rate limiting on login/register
4. **P0-5** — File upload validation
5. **P0-9** — Nginx security headers

After that wave: P0-4 (refresh token revocation), P0-7 (Sentry), P0-8 (backups), P0-10 (migrations timing), P0-6 (email verification), P0-11 (Stripe end-to-end), P0-12 (pricing page), P0-13 (i18n), P0-14 (demo seed).

---

## Review section

### First wave — security hardening (completed 2026-04-09)

**P0-1. Hardcoded admin credentials removed.** `backend/app/main.py` no longer contains `faintkom@gmail.com` / `REDACTED_PASSWORD`. Super admin is now bootstrapped from `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` env vars — if either is unset, no admin is created (warning logged in production). Also swept 15 dev/seed scripts (`fix_*.py`, `seed_*.py`, `scripts/create_demo_courses.py`, `create_super_admin.py`) and replaced hardcoded literals with `os.environ.get("LMS_ADMIN_EMAIL", "")` + `os.environ.get("LMS_ADMIN_PASSWORD", "")`. `.env.example` updated to document the new bootstrap variables. Added `ENVIRONMENT` variable to distinguish dev/staging/production.

  **Action required after pull:** the old admin password is now in git history. **Rotate it immediately** once the current prod server picks up the new code: login, change password via the app, and never set `SUPER_ADMIN_PASSWORD` to a value you can't rotate later.

**P0-2. JWT secret enforcement.** Added `validate_production()` method on `Settings` in `backend/app/config.py` that checks: (a) `jwt_secret` is not the default sentinel `"change-me-in-production"`, (b) `jwt_secret` is at least 32 chars, (c) `debug` is false. Called in `lifespan` startup in `main.py` — in production, any failure raises `RuntimeError` and the app refuses to start. In non-production, errors log as warnings so dev servers still boot. Added unit tests confirming correct rejection and acceptance behaviour.

**P0-3. Rate limiting on auth endpoints.** Added `slowapi>=0.1.9` to `pyproject.toml`. Created `backend/app/common/rate_limit.py` with a shared `Limiter` instance that reads `RATE_LIMIT_STORAGE_URI` env var (defaults to `memory://`; set to a Redis URI in production for multi-worker correctness). Wired into `main.py` via `app.state.limiter` + `RateLimitExceeded` exception handler. Applied decorators:
  - `POST /auth/login`: `5/minute`
  - `POST /auth/register`: `3/hour`
  - `POST /auth/forgot-password`: `3/hour`
  - `POST /auth/reset-password`: `10/hour`
  
  Added `request: Request` to each endpoint signature as slowapi requires it for client IP extraction. `X-RateLimit-*` headers enabled in responses.

**P0-5. File upload validation.** Created `backend/app/common/file_validation.py` — a single source of truth for upload security. Features:
  - Hard ceiling of 50 MB regardless of endpoint config overrides
  - Extension allowlist with leading-dot normalization
  - **Magic-byte sniffing** for PNG, JPEG, GIF, WebP, PDF, DOCX/PPTX/XLSX/ZIP, legacy DOC/PPT — client-reported `Content-Type` is never trusted
  - SVG text-level validation: rejects `<script>`, `<foreignObject>`, `onload=`, `onerror=`, `javascript:` references to prevent stored XSS
  - Filename sanitization: strips path separators, control characters, leading dots; caps length at 200
  - Generates UUID-only `safe_name` for disk storage — never embeds user input in stored filename
  - Optional category enforcement (image / document / archive / audio / video)
  - Custom `UploadValidationError` with user-safe messages
  - 11 unit tests passing: valid files, magic mismatch, path traversal, size limit, empty file, disallowed extension, malicious SVG, category mismatch, DOCX

  Refactored 4 call sites to use the shared helper:
  - `backend/app/submissions/service.py` — `upload_file()`
  - `backend/app/assignments/service.py` — `submit_assignment()`
  - `backend/app/exercises/service.py` — `upload_file_submission()`
  - `backend/app/courses/router.py` — `upload_image()` + `serve_image()` (tightened UUID-hex regex to exactly 32 chars)
  
  `courses/router.py` previously hardcoded `/data/uploads/images/`; now uses `settings.upload_dir` for consistency with other endpoints.

**P0-9. Nginx security headers.** Added to both `deploy/nginx.conf` and `nginx/nginx.conf` (prod actually uses `nginx/nginx.conf` per `docker-compose.prod.yml`):
  - `Strict-Transport-Security: max-age=15552000; includeSubDomains` (6 months, no preload yet — add after verifying)
  - `X-Frame-Options: SAMEORIGIN`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()`
  - `Content-Security-Policy` (permissive; allows Next.js + Stripe.js + Monaco + Jitsi + YouTube/Vimeo embeds; `'unsafe-eval'` kept for Next.js dev — tighten in P1 pass)
  - `X-XSS-Protection: 1; mode=block` (legacy, harmless)
  
  All directives use `always` so they apply to error responses too. Offline syntax check passed: braces balanced, all directives terminated.

### Verification
Final import test: `create_app()` produces 181 routes, all critical endpoints (`/auth/login`, `/courses/upload-image`) present, limiter attached to `app.state`, JWT validation tests pass (4/4), file validation tests pass (11/11).

### Deferred (next waves)

**Remaining P0 (next session):** P0-4 refresh token revocation, P0-6 email verification, P0-7 Sentry, P0-8 automated Postgres backups, P0-10 migrations timing, P0-11 Stripe end-to-end, P0-12 public pricing page, P0-13 i18n, P0-14 demo seed course.

**Follow-ups identified during this wave:**
- The old `faintkom@gmail.com:REDACTED_PASSWORD` password exists in git history. Rotate the actual production password immediately on next deploy and never reuse it. Consider `git filter-repo` on the history if the repo will go public, but note that this rewrites history and requires force-push.
- The seed scripts now require `LMS_ADMIN_EMAIL` and `LMS_ADMIN_PASSWORD` env vars — document in the developer README or create a `.envrc` template for direnv users.
- CSP currently permits `'unsafe-eval'` — needed by Next.js dev mode but can be tightened for production-only builds in a follow-up.
- Rate limit storage is in-memory by default — set `RATE_LIMIT_STORAGE_URI=redis://...` in production once Redis is part of the stack (P1-5).


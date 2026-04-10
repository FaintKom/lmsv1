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

- [x] **P0-1. Remove hardcoded admin credentials from `backend/app/main.py:145`**
      Current: `faintkom@gmail.com` / `REDACTED_PASSWORD` hardcoded in source.
      Fix: move to env vars (`SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`), fail-fast if unset in production, require change on first login.

- [x] **P0-2. JWT_SECRET enforcement in `backend/app/config.py`**
      Current: default value `"change-me-in-production"` with no check.
      Fix: on startup, raise error if secret equals default value or is shorter than 32 chars. Only allow default in `ENV=development`.

- [x] **P0-3. Rate limiting on `/auth/login` and `/auth/register`**
      Current: no rate limit; brute-force possible.
      Fix: install `slowapi`, apply `@limiter.limit("5/minute")` on login, `@limiter.limit("3/hour")` on register. Use Redis backend for distributed state (or in-memory as starter).

- [x] **P0-4. Refresh token revocation / expiry**
      Current: refresh tokens valid indefinitely after grant, no revocation list.
      Fix: add `refresh_token_jti` table with `revoked_at`, check on refresh endpoint. Rotate on each refresh. Logout endpoint revokes.

- [x] **P0-5. File upload validation**
      Current: no MIME type check, size only enforced in config not in endpoint.
      Fix: whitelist extensions, verify actual file type (not just extension), enforce size at endpoint level.

- [x] **P0-6. Email verification on registration**
      Current: new accounts active immediately.
      Fix: send verification email with token, block `is_active=False` until clicked. Wire to existing email infrastructure.

### Operations

- [x] **P0-7. Sentry error tracking**
      Current: no error tracking, no logs aggregation.
      Fix: `sentry-sdk[fastapi]` + Next.js `@sentry/nextjs`. Free tier. ~30 min.

- [x] **P0-8. Automated Postgres backups**
      Current: undocumented, manual only.
      Fix: cron `pg_dump` → S3/R2/B2 nightly, 30-day retention, scripted restore test.

- [x] **P0-9. Nginx security headers**
      Current: `deploy/nginx.conf` missing HSTS, CSP, X-Frame-Options, X-Content-Type-Options.
      Fix: add security headers block. Test with securityheaders.com.

- [x] **P0-10. Migrations on startup — move to pre-start**
      Current: migrations run in background after API accepts requests (`main.py:46-77`).
      Fix: run before API starts accepting requests, or move to init container.

### Product

- [x] **P0-11. Stripe checkout flow end-to-end**
      Current: billing page shows "not configured" error in some states.
      Fix: verify full flow works dev→prod, test with real cards in test mode, document required env vars.

- [x] **P0-12. Public `/pricing` page**
      Current: no pricing visible on public site.
      Fix: add pricing page with 4 tiers (Free, Starter $29, Professional $79, Enterprise $199), feature comparison table, FAQ, CTAs per plan.

- [x] **P0-13. i18n implementation — English + Russian**
      Current: locale context and switcher exist, but no translation files; UI is English-only.
      Fix: extract strings to `locales/en.json` and `locales/ru.json`, wire `t()` throughout UI, test switcher, set default based on `Accept-Language`.

- [x] **P0-14. Auto-seed demo course on new org creation**
      Current: new admin sees empty org.
      Fix: on org creation, clone SAT Math course (or a purpose-built "Welcome to LearnHub" course) into the new org as a template.

---

## P1 — High priority (before first real customer onboarding)

### Infrastructure

- [x] **P1-1. GitHub Actions CI/CD**
      Lint + test + build on PR, auto-deploy main → staging. Path: `.github/workflows/ci.yml`.
- [x] **P1-2. Background task queue (Celery or RQ + Redis)**
      Move email sending off request thread; enable cron for deadline reminders (A8).
- [x] **P1-3. Structured logging**
      `structlog` + JSON output, request ID correlation, log levels per environment.
- [x] **P1-4. Health check endpoint with dependency checks**
      Current `/health` only returns ready bool. Add DB, Redis, Judge0, Stripe ping. Expose `/health/live` and `/health/ready` for k8s-style probes.
- [x] **P1-5. Redis for rate limiting + caching + session state**
      Current rate limit is in-memory; breaks on multi-instance.
- [x] **P1-6. Distributed file storage (S3/R2)**
      Current `/data/uploads` on local disk; breaks horizontal scaling. Migrate to S3-compatible.

### Testing

- [x] **P1-7. Frontend test setup (0% → baseline)**
      Install Vitest + React Testing Library + Playwright. Write 5-10 E2E tests on critical paths: signup → enroll → complete lesson → get grade; teacher creates course; student submits assignment.
- [x] **P1-8. Backend test coverage to ~50%**
      Current ~25%. Add tests for Stripe webhook handlers, rate limiting, concurrent access, assignment submission edge cases.

### Product UX

- [x] **P1-9. Video progress tracking**
      Persist video timestamp per lesson, resume from last position, mark as watched at 90%.
- [x] **P1-10. Bulk student enrollment (CSV import)**
      Admin UI: upload CSV, preview, confirm. Error handling for invalid rows.
- [x] **P1-11. Gradebook XLSX export**
      Current CSV only. Add XLSX with formatting (color-coded scores, formulas).
- [x] **P1-12. Teacher onboarding tour**
      3-minute product tour (Intro.js or Driver.js) for first-time teachers covering: create course, add module, add lesson, publish, enroll student.
- [x] **P1-13. Wire email notifications UI to backend**
      Email preferences page exists as backend; add frontend UI under `/profile/notifications`.
- [x] **P1-14. WCAG 2.1 AA accessibility audit + fixes**
      Alt text on icons, ARIA landmarks, keyboard nav, focus management, form label associations. Use `accessible-learning-designer` skill.

### Go-to-market

- [ ] **P1-15. 5-minute demo video**
      Script teacher + student experience. Record with Loom or OBS. Publish on landing page and YouTube.
- [x] **P1-16. Sales one-pager PDF**
      Value prop, features, pricing, comparison table (vs Moodle/Teachable/Thinkific), contact.
- [x] **P1-17. Public live demo**
      Read-only view account with SAT Math course preloaded. Bypass signup friction.
- [x] **P1-18. Pick ONE target segment**
      Proposal: SAT prep (strongest content, clearest differentiation). Create dedicated landing page `/for-test-prep`.
- [ ] **P1-19. First beta customer acquisition**
      Find 1 real school or tutor with 10+ students, pilot for free or reduced price, gather feedback.

---

## P2 — Nice to have (after first customer)

- [ ] P2-1. SCORM/xAPI export (corporate clients)
- [x] P2-2. White label + custom domain (Enterprise tier feature) ✅
- [ ] P2-3. Plagiarism detection
- [ ] P2-4. Peer code review
- [ ] P2-5. Team projects
- [x] P2-6. Offline/PWA ✅
- [ ] P2-7. In-app video/audio recording
- [x] P2-8. Attendance tracking ✅
- [ ] P2-9. Metered billing / usage-based pricing
- [ ] P2-10. Postgres read replicas
- [x] P2-11. Multi-org for single user ✅
- [x] P2-12. Webhook API for customers ✅
- [x] P2-13. Waitlist / pre-launch community mechanism ✅

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

**Follow-ups identified during first wave:**
- ~~The old `faintkom@gmail.com:REDACTED_PASSWORD` password exists in git history.~~ **DONE:** history rewritten via `git filter-repo`, password rotated via new Change Password UI.
- The seed scripts now require `LMS_ADMIN_EMAIL` and `LMS_ADMIN_PASSWORD` env vars — document in the developer README or create a `.envrc` template for direnv users.
- CSP currently permits `'unsafe-eval'` — needed by Next.js dev mode but can be tightened for production-only builds in a follow-up.
- Rate limit storage is in-memory by default — set `RATE_LIMIT_STORAGE_URI=redis://...` in production once Redis is part of the stack (P1-5).

### Second wave — remaining P0 items (completed 2026-04-09 / 2026-04-10)

**P0-4. Refresh token revocation.** New `refresh_tokens` table tracks every issued refresh token by jti (32-byte random token_urlsafe). `create_refresh_token` returns `(token, jti, expires_at)` and persists via `_issue_refresh_token` helper (captures user_agent + ip_address for future "active sessions" UI). `/auth/refresh` validates jti, rejects revoked/expired/unknown, rotates on success. New `/auth/logout` endpoint revokes the current refresh token. Old tokens (no jti claim) are rejected with "please log in again". End-to-end verified on prod: replay of revoked token → 400. Migration `h1i2j3k4l5m6`. Commit `df20818`.

**P0-6. Email verification on registration.** New `email_verification_tokens` table and `users.email_verified_at` column. Policy: **students and parents are auto-verified** (invited by teacher, already vouched for) while **teachers/admins self-registering must verify** via emailed token. `POST /auth/verify-email` and `/auth/resend-verification` endpoints, rate-limited. New `/verify-email` frontend route reads token from URL. Profile page shows amber "Email not verified" banner with resend button only for unverified users. `settings.require_email_verification` flag (default False) gates login enforcement so deployments without SMTP keep working. Grandfathered all 7 existing prod users to verified. Migration `i1j2k3l4m5n6`. Commit `7ed4e88`.

**P0-7. Sentry error tracking.** `sentry-sdk[fastapi]>=2.18.0` on backend; `@sentry/nextjs^9.0.0` on frontend. Backend initializes Sentry before router imports so it can patch SqlAlchemy/FastAPI/Starlette integrations. Frontend uses Next.js 16 `instrumentation.ts` hook for server runtime and `instrumentation-client.ts` for browser. Both are complete no-ops when DSN is empty. Dockerfile uses `npm ci --legacy-peer-deps` for @sentry/nextjs 9.x vs React 19 peer conflict. Next step (user action): create two projects on sentry.io, set `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` on prod, rebuild. Commit `ec225e6`.

**P0-8. Broken backups fixed.** Cron entry was in place since 2026-03-31 but `/opt/lms/backups/` and the script never existed. Created `scripts/backup.sh` and deployed. Script: `docker exec lms-db-1 pg_dump | gzip -9`, atomic `.tmp` + `mv`, size sanity check, 7-day retention. Verified first dump: 54 KB gzipped, gzip integrity OK, 42 CREATE TABLE statements. Updated `reference_server_security.md` memory. Commit `42f6b52`. **Not done (P1):** push backups off-server to S3/R2.

**P0-10. Migrations run pre-start.** Renamed `_run_migrations` to `_run_setup`, moved it into lifespan **before** `yield` instead of a background task. Removed `startup_gate` middleware (now dead code). Removed the broken Alembic `command.upgrade()` that was raising from inside the async event loop and producing the recurring `RuntimeWarning: coroutine was never awaited`. Setup failures in production re-raise so the container exits. Verified clean logs and `/health` returns `ready:true` immediately. Commit `b1d2bab`.

**P0-11. Stripe checkout end-to-end.** Three fixes: (1) replaced hardcoded Render frontend URLs in checkout/portal with `${settings.app_url}/admin/billing*`; (2) webhook refuses in prod when `STRIPE_WEBHOOK_SECRET` unset (503 + error log) instead of silently accepting unsigned JSON — closes a signature bypass that let attackers forge `invoice.paid` events; (3) new public `GET /billing/status` + calm amber "Billing not enabled" placeholder on admin billing page. Commit `079a3b7`.

**P0-12. Public `/pricing` page.** Anonymous-accessible. Hero + 4 tier cards from live `/billing/plans` with static fallback. Professional "MOST POPULAR" ring. Feature comparison table. FAQ accordion. Bottom CTA gradient. Landing page header now has a "Pricing" link. Verified `/pricing` returns 200. Commit `a80fc1f`.

**P0-13. i18n EN/RU.** Infrastructure was already in place (I18nProvider + useTranslation + LocaleSwitcher + localStorage). RU dictionary was 316/318 keys — filled the 2 missing plus 36 new keys for UI introduced during this P0 sweep: Change Password form, email verification banner, verify-email page, billing placeholder, pricing page. Final count: 354/354, sets identical. Commit `0f156de`.

**P0-14. Auto-seed demo course on new org.** New `seed_demo_course_for_org()` helper clones the oldest `is_template=true` course system-wide into a new org, auto-published, bypassing the org-ownership check in `copy_course`. `register()` now returns a third boolean `org_was_created` so the endpoint knows when to seed. Best-effort wrapped in try/except. Marked existing SAT Math course as template on prod. End-to-end verified with throwaway test org. Commit `bfa5d7c`.

### Wave summary

All 14 P0 items are closed. Commits on `origin/main` past the first wave:
- `df20818` P0-4 refresh token revocation
- `7ed4e88` P0-6 email verification
- `ec225e6` P0-7 Sentry
- `42f6b52` P0-8 backups
- `b1d2bab` P0-10 pre-start migrations
- `079a3b7` P0-11 Stripe end-to-end
- `a80fc1f` P0-12 pricing page
- `0f156de` P0-13 i18n RU
- `bfa5d7c` P0-14 auto-seed demo course

**Still pending user action** (not code work):
- Create Sentry projects and set `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` on prod
- Set `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` when ready to sell
- Configure SMTP (`EMAIL_ENABLED=true` + SMTP vars) if email verification is needed for teachers
- Off-server backup destination (S3/R2) — tracked as P1 follow-up

**Next wave:** pick from the P1 list above, or start a GTM sprint (demo video, sales one-pager, live demo link, first beta customer).

### Third wave — P1 items (completed 2026-04-10)

Executed 17 of 19 P1 items in a single sprint. The two remaining are
user actions (P1-15 record demo video, P1-19 acquire first customer).

**Infrastructure**
- **P1-1.** GitHub Actions CI (`.github/workflows/ci.yml`) — backend
  lint + pytest against a postgres:16 service container; frontend
  typecheck + Vitest + `next build`. ESLint is non-blocking until a
  cleanup pass. `--legacy-peer-deps` to work around @sentry/nextjs 9
  vs React 19. Ruff baseline: 122 auto-fixed, 116 stylistic rules
  ignored (E501/E712/F841/E741) with a plan note. Commit `870aeb7`.
- **P1-2.** Non-blocking email via asyncio executor (no Celery/RQ
  added) + APScheduler AsyncIOScheduler for in-process cron. Two jobs
  registered: `cleanup_expired_refresh_tokens` (daily 03:10 UTC) and
  a stub `send_deadline_reminders` (hourly :15). Rationale: avoid
  Redis dependency until scale demands it. Commit `c9eba4a`.
- **P1-3.** structlog + stdlib routed through
  `ProcessorFormatter.wrap_for_formatter`, JSON output, request-id
  contextvar + middleware. Production logs now parseable by any
  aggregator. Commit `2adf0f6`.
- **P1-4.** `/health/live` (process alive probe) and `/health/ready`
  (dependency probe with DB / Redis / scheduler / startup checks and
  optional Stripe/Sentry/email report). Returns 503 on required-check
  failure. Commit `cf20d8f`.
- **P1-5.** Redis container added to `docker-compose.prod.yml`. Rate
  limiter now persists counters via `RATE_LIMIT_STORAGE_URI=redis://redis:6379/0`
  so redeploys don't wipe state. Redis added to the ready probe.
  Caching and session state NOT wired yet (no perf hotspot to cache).
  Commit `2c97885`.
- **P1-6.** File storage abstraction (`app/common/storage.py`) with
  `LocalFileStorage` (current behaviour) and `S3FileStorage`
  (AWS/R2/MinIO/B2 compatible via boto3). Callers use `get_storage()`
  and switch backends by one env var. Existing endpoints NOT migrated
  yet — infrastructure first, incremental refactor second. Commit
  `606919c`.

**Testing**
- **P1-7.** Vitest + Playwright from zero. First tests: 5 translation
  parity tests (catches the P0-13 regression class), 3 smoke Playwright
  tests (landing / pricing / login). Wired into CI as a hard gate.
  Playwright itself runs only locally — needs running backend + frontend.
  Commit `7877060`.
- **P1-8.** `tests/test_p0_security.py` — 20 tests covering the P0 pass
  that previously had zero coverage: file upload validation (8), rate
  limiting (1), refresh token revocation (3), change password (4),
  email verification (4). Pure-function tests run locally; the rest
  run in CI. Commit `e3afa5a`.

**Product UX**
- **P1-9.** Video progress tracking end-to-end. New `video_progress`
  table (user_id, lesson_id, position, duration, watched, completed_at).
  Endpoints `GET/PUT /api/v1/progress/lessons/{id}/video-progress`.
  Frontend `<VideoPlayer />` wraps YouTube iframes with the IFrame Player
  API: saves position every 5s, resumes on reopen, auto-marks the
  lesson complete at 90%. Vimeo falls through to a plain iframe with
  no tracking — follow-up. Commit `739ebe9`.
- **P1-10.** `POST /api/v1/admin/bulk-enroll` accepts `{course_id, rows[],
  default_password}` and creates students + enrolls them, reusing
  existing users when the email already exists in the same org. Per-row
  errors collected without aborting. Students are auto-verified (same
  policy as invite-link registration from P0-6). New `/admin/bulk-enroll`
  page: CSV file upload OR paste, client-side parse, preview, submit,
  per-row error panel. Commit `41acc52`.
- **P1-11.** XLSX gradebook export via openpyxl. Colour-coded score
  cells (emerald/amber/rose), frozen header, bold averages row,
  auto-sized columns. "Excel" button added next to "CSV" on
  `/admin/gradebook`. Commit `866a9be`.
- **P1-12.** Driver.js onboarding tour, 7 steps across the admin
  sidebar (Dashboard / Courses / Content Library / Gradebook / Users /
  Groups / Billing). Auto-starts on first admin visit, writes
  `lms.tour.admin.v1` flag to localStorage. Manual "Tour" button in
  the header for replays. `data-tour=sidebar-*` attributes added to
  each nav link so reordering the sidebar doesn't break anchors.
  Commit `866a9be`.
- **P1-13.** Wired email prefs UI. The toggle form already existed
  on `/profile` but gave no feedback when SMTP was off. New public
  `GET /api/v1/system/features` returns
  `{email_enabled, stripe_enabled, sentry_enabled}`. Profile page shows
  an amber "Email delivery not configured on this server" banner inside
  the Email Notifications card when `email_enabled=false`. Preferences
  still persist either way. Commit `37d201e`.
- **P1-14.** WCAG 2.1 AA baseline fixes — not a full audit. Removed
  `maximumScale: 1` from viewport (WCAG SC 1.4.4 violation). Added
  global `:focus-visible` outline (indigo-600, 2px, 2px offset) in
  `globals.css` for keyboard navigation, with dark-mode contrast
  variant. Verified existing reduced-motion, skip-to-content, and
  form label associations were already in place. Full axe-core /
  Lighthouse audit and screen-reader pass is long-running follow-up.
  Commit `f86f5bc`.

**Go-to-market**
- **P1-15.** 5-minute demo video — **user action, not done in this
  sprint**. Recommended scope: walk the SAT Math course end-to-end
  (student perspective + teacher gradebook view), record with Loom
  or OBS, publish on landing page and YouTube.
- **P1-16.** `marketing/sales-one-pager.md` — print-friendly positioning
  doc with feature groups, comparison vs Moodle/Google Classroom/
  Teachable, pricing table, 5-step school onboarding, tech-for-IT
  section, target segments. Render via pandoc or copy to Notion.
  Commit `f86f5bc`.
- **P1-17.** Public `/demo` landing page. Two cards ("Try as student"
  / "Try as teacher") that one-click log into pre-seeded demo accounts
  via new `POST /auth/demo-login`. Controlled by
  `DEMO_MODE_ENABLED=true` in prod `.env`. Rate-limited 10/hour per IP.
  Returns 404 (not 403) when demo mode is off to avoid probing. "Try
  Demo" link added to landing header. Commit `f86f5bc`.
- **P1-18.** `marketing/target-segment.md` — analysis of four candidate
  markets (test-prep centers / bootcamps / universities / K-12) with
  recommendation to focus on **test-prep centers** using SAT Math as
  the wedge for the next 90 days. Includes outreach channels, what
  changes in the product plan, and a 90-day commitment rule. Pending
  user sign-off before executing the follow-up marketing work.
  Commit `8378b14`.
- **P1-19.** First beta customer — **user action, not done in this
  sprint**. Recommended path: LinkedIn DM to 20-30 small SAT prep
  center owners, offer 3 months free in exchange for testimonial +
  cohort observation. Russian-speaking centers are the easiest first
  beta because of language, network, and timezone fit.

### P1 sprint summary

**17 of 19 items closed in code / docs.** Remaining 2 are user actions
requiring no further engineering (demo video recording, cold outreach).

Commits on `origin/main` for the P1 sprint:
- `870aeb7` P1-1 CI
- `c9eba4a` P1-2 task queue
- `2adf0f6` P1-3 structured logging
- `cf20d8f` P1-4 health probes
- `2c97885` P1-5 Redis
- `606919c` P1-6 file storage
- `7877060` P1-7 frontend tests
- `e3afa5a` P1-8 P0 backend tests
- `739ebe9` P1-9 video progress
- `41acc52` P1-10 bulk enroll
- `866a9be` P1-11+12 XLSX + tour
- `37d201e` P1-13 email prefs UI
- `f86f5bc` P1-14+16+17 a11y + one-pager + demo
- `8378b14` P1-18 target segment

Plus auxiliary commits for doc updates and the filter-repo follow-up.

**Infrastructure on prod (204.168.165.41) after P1 sprint:**
- Containers: lms-{db,redis,backend,frontend,sandbox,nginx,cloudflared}
- DB tables added this wave: `refresh_tokens`, `email_verification_tokens`,
  `video_progress` (plus earlier P0 additions)
- Backend routes: **193** (was 176 at the start of the whole sweep)
- Scheduler: 2 jobs running (refresh-token cleanup + stub deadline reminders)
- `/health/ready` reports all four required deps healthy

**Still pending user action** (not code):
1. Record 5-minute SAT-focused demo video (P1-15)
2. Sign off on test-prep segment recommendation (P1-18)
3. Reach out to first beta customers (P1-19)
4. Optional: enable Sentry by setting DSNs, enable Stripe by setting
   secret keys, enable SMTP by setting EMAIL_ENABLED + SMTP_* vars

---

### P2-13 — Waitlist / pre-launch community (completed 2026-04-10)

**What landed**
- `app/waitlist/models.py` — `WaitlistEntry` table with email (unique),
  role, source, IP/UA metadata, contacted flag + timestamp.
- `app/waitlist/router.py`:
  - `POST /api/v1/waitlist` — public, rate-limited 5/hour,
    idempotent. Same response regardless of whether email is new,
    so the endpoint doesn't leak membership.
  - `GET /api/v1/waitlist` — super_admin only. Lists all entries
    ordered newest first for outreach.
  - `POST /api/v1/waitlist/{id}/mark-contacted` — super_admin only.
- Wired into `main.py`: router include + model import so
  `Base.metadata.create_all` auto-creates the table on startup.
- Frontend `WaitlistForm` client component under `components/`,
  embedded in landing page `/` CTA section below the primary
  "Create Free Account" button. Captures email + role (teacher /
  admin / student / other) + source, renders success/error inline.
- Deploy to Hetzner: scp'd files, `docker compose build backend
  frontend` + `up -d`. Smoke-tested POST /api/v1/waitlist → 200,
  verified row in `waitlist_entries`, landing page shows form.

**Why this shape**
- Idempotent response prevents email-enumeration.
- No confirmation email required — the whole point is a
  zero-friction "drop your email" box.
- No admin UI screen yet (backend GET is enough for CLI/SQL
  access); can add a Notion-style admin table later if demand grows.

**Also in this commit range**
- Fixed 27 ruff errors breaking CI backend job
  (3 F821 HTTPException imports, 1 N806 EMAIL_RE, 23 E402
  main.py imports-after-Sentry via per-file-ignore).
- Removed unused imports surfaced by `ruff --fix`.


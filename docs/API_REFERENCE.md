# API Reference — GrassLMS

Индекс backend-роутеров. **Полная схема каждого endpoint'а — Swagger
по адресу http://localhost:8000/docs (или https://grasslms.online/docs)**.
Этот файл — навигатор: какой роутер за что отвечает и где искать код.

База: все эндпоинты под `/api/v1/`. Фронт обращается через
`NEXT_PUBLIC_API_URL`.

## Роутеры (по алфавиту префикса)

| Префикс | Файл | Что внутри |
|---|---|---|
| `/admin` | `app/admin/router.py` | Super-admin: users CRUD, gradebook (CSV/XLSX), bulk-enroll, аналитика, branding |
| `/admin/plagiarism` | `app/plagiarism/router.py` | Запуск проверки, отчёты, similarity matrix |
| `/admin/scorm` | `app/scorm/router.py` | Импорт SCORM пакетов |
| `/ai` | `app/ai/router.py` | AI tutor: hint, pre-grade essay |
| `/assessments` | `app/assessments/router.py` | Quiz CRUD, attempts, auto-grading |
| `/assignments` | `app/assignments/router.py` | Assignment CRUD, submissions, grading |
| `/attendance` | `app/attendance/router.py` | Отметка присутствия по группам |
| `/auth` | `app/auth/router.py` | register, login, refresh, logout, forgot/reset password, verify-email, demo-login, profile, change-password, GDPR data export |
| `/billing` | `app/billing/router.py` | Stripe checkout/portal/webhook, plans, status, invoices, Lemon Squeezy |
| `/billing` (metered) | `app/metered_billing/router.py` | Usage-based pricing |
| `/calendar` | `app/calendar/router.py` | Events CRUD, iCal feed |
| `/certificates` | `app/certificates/router.py` | Generate, list, public verify |
| `/courses` | `app/courses/router.py` | Course/Module/Lesson CRUD, image upload, publish/archive, copy, templates |
| `/discussions` | `app/discussions/router.py` | Comments, threading |
| `/exercises` | `app/exercises/router.py` | Унифицированные интерактивные упражнения |
| `/gamification` | `app/gamification/router.py` | XP, leagues, badges, streaks, leaderboard |
| `/integrations` | `app/integrations/router.py` | Zoom/Google/Microsoft/YouTube OAuth |
| `/knowledge` | `app/knowledge/router.py` | RAG search, facets, list, detail |
| `/learning-paths` | `app/learning_paths/router.py` | Path CRUD, enroll, progress |
| `/math-problems` | `app/math_problems/router.py` | Generate / check математические задачи |
| `/meetings` | `app/meetings/router.py` | Jitsi rooms, JWT-auth |
| `/notifications` | `app/notifications/router.py` | List, mark read, preferences |
| `/parent` | `app/parent/router.py` | Read-only родительский dashboard |
| `/peer-review` | `app/peer_review/router.py` | Distribution, rubrics, submit review |
| `/progress` | `app/progress/router.py` | Enrollment, lesson completion, video progress |
| `/recommendations` | `app/recommendations/router.py` | Personalized recs |
| `/recordings` | `app/recording/router.py` | Audio/video submissions |
| `/sandbox` | `app/sandbox/router.py` | Прокси к Judge0 для исполнения кода |
| `/skills` | `app/skills/router.py` | Skill XP, радар |
| `/submissions` | `app/submissions/router.py` | Generic file submissions |
| `/team-projects` | `app/team_projects/router.py` | Команды, групповые задания |
| `/orgs` | `app/orgs/router.py` | Organization endpoints, multi-org membership |
| `/waitlist` | `app/waitlist/router.py` | Public POST, admin GET |
| `/webhooks` | `app/webhooks/router.py` | Customer webhooks (HMAC) |
| `/system/features` | `app/main.py` | Public флаги для фронта (email_enabled, stripe_enabled, sentry_enabled) |
| `/health`, `/health/live`, `/health/ready` | `app/main.py` | Liveness + readiness probes |

Полная регистрация — `app/main.py`, функция `create_app()` (примерно
строки 453-486).

## Auth flow

1. **Register** → `POST /api/v1/auth/register`
   - Создаёт `User` (+ `Organization` если первый юзер). Students/parents
     auto-verified, teachers/admins получают verification email.
2. **Verify email** (только teachers/admins, если `require_email_verification=true`):
   `GET /api/v1/auth/verify-email?token=...`
3. **Login** → `POST /api/v1/auth/login`
   - Возвращает `{access_token, refresh_token, user}`. Access — 30 мин,
     refresh — 7 дней с jti в таблице `refresh_tokens`.
4. **Use access token** в заголовке: `Authorization: Bearer <access_token>`
5. **Refresh** → `POST /api/v1/auth/refresh` с `{refresh_token}`
   - Старый jti revoke'ится, выдаётся новая пара. Replay → 400.
6. **Logout** → `POST /api/v1/auth/logout` — revoke текущего refresh.
7. **Forgot password** → `POST /api/v1/auth/forgot-password`
   - 1-hour token, email отправляется через SMTP (если включён).
   - `POST /api/v1/auth/reset-password` с `{token, new_password}`.

## Demo mode

Если `DEMO_MODE_ENABLED=true`:
- `POST /api/v1/auth/demo-login` с `{role: "student"|"teacher"}`
- Возвращает обычные токены для pre-seeded демо-аккаунтов.
- Rate-limited 10/hour per IP.
- Если выключено — endpoint возвращает 404 (не 403, чтобы не
  signalить о существовании).

## Rate limits

`slowapi`, storage из `RATE_LIMIT_STORAGE_URI`. Текущие лимиты:

| Endpoint | Limit |
|---|---|
| `POST /auth/login` | 5/minute |
| `POST /auth/register` | 3/hour |
| `POST /auth/forgot-password` | 3/hour |
| `POST /auth/reset-password` | 10/hour |
| `POST /auth/demo-login` | 10/hour |
| `POST /auth/verify-email`, `/auth/resend-verification` | 5/hour |
| `POST /waitlist` | 5/hour |

Заголовки `X-RateLimit-*` включены в response.

## Stripe webhook

Endpoint: `POST /api/v1/billing/webhook`
- Требует `STRIPE_WEBHOOK_SECRET` в проде. Если не задан — endpoint
  возвращает 503 (а не silently accept, потому что незащищённый webhook
  позволяет форжить `invoice.paid`).
- Обрабатывает: `checkout.session.completed`, `customer.subscription.*`,
  `invoice.paid`, `invoice.payment_failed`.

Lemon Squeezy webhook: `POST /api/v1/billing/lemonsqueezy/webhook`
- HMAC-SHA256 проверка по `LEMONSQUEEZY_WEBHOOK_SECRET`.

Customer webhooks (P2-12): admin создаёт URL в `/admin/settings/webhooks`,
бэкенд POST'ит payload с подписью HMAC-SHA256 в заголовке
`X-Webhook-Signature`.

## Errors

- 4xx — ожидаемые ошибки клиента, body `{detail: "..."}`.
- 422 — Pydantic validation, body — стандартный FastAPI формат
  с location/message.
- 429 — rate limit hit.
- 5xx — unhandled. Перехватывается `global_exception_handler` в
  `app/main.py:407`, отправляется в Sentry, фронт показывает Sonner toast.
- Каждый response несёт `X-Request-ID` (12 hex chars) — клиенты могут
  включать его в bug-репорты для корреляции с логами.

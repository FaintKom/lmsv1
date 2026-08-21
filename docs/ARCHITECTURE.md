# Архитектура GrassLMS

Высокоуровневая карта проекта. Для деталей конкретной зоны — `backend/CLAUDE.md`,
`frontend/CLAUDE.md` и `docs/API_REFERENCE.md`.

## Топология

```
Browser ─────► Cloudflare Tunnel / nginx (TLS)
                         │
                         ▼
              ┌──────────────────────┐
              │  lms-frontend (3000) │  Next.js 16 SSR + React 19
              └──────────┬───────────┘
                         │ /api/v1/*
                         ▼
              ┌──────────────────────┐
              │  lms-backend (8000)  │  FastAPI async
              └─┬──────┬──────┬──────┘
                │      │      │
       ┌────────▼┐  ┌──▼──┐  ┌▼────────────┐  ┌──────────────┐
       │ lms-db  │  │redis│  │ lms-sandbox │  │ lms-livekit  │
       │ pg16+pgv│  │     │  │ свой раннер │  │ SFU, 1.2 CPU │
       └─────────┘  └─────┘  └─────────────┘  └──────────────┘
                                                     ▲
                              медиа идёт мимо backend ┘
                              (WebRTC: UDP 7882-7883, TURN 3478)
```

Медиа-стрелка нарисована отдельно не для красоты: кадры и звук идут
браузер ↔ LiveKit напрямую, backend в этом пути не стоит. Он только
подписывает токен и решает, кому что можно, — поэтому его перезапуск
урок не рвёт.

Восемь контейнеров — на одном Hetzner CX22 (`/opt/lms`). Подробности
production-хостинга — в корневом `CLAUDE.md`.

Внешние сервисы (опциональные, включаются env-переменными):
- **Stripe** — billing
- **Lemon Squeezy** — Merchant of Record альтернатива Stripe
- **Sentry** — error tracking
- **Voyage AI** — embeddings для knowledge module
- **SMTP-провайдер** — email (Resend / SES / другое)
- **S3-compatible** — file uploads (R2 / B2 / AWS), пока не используется,
  fallback на локальный диск

## Backend модули (37 основных)

Feature-модульная организация. Каждый модуль обычно: `models.py`,
`schemas.py`, `router.py`, `service.py`. Префиксы — в [`API_REFERENCE.md`](API_REFERENCE.md).

Таблица покрывает основные модули; полный список — `ls backend/app/`.
Если модуля нет в таблице, это пробел в документе, а не признак того,
что его нет в коде.

| Модуль | Что делает |
|---|---|
| **auth** | JWT, регистрация, login, refresh tokens, email verification, password reset, demo-login. Базовые модели User / Organization. |
| **orgs** | Organization CRUD, multi-org membership (P2-11) |
| **admin** | Super-admin endpoints: users CRUD, gradebook, bulk-enroll, analytics |
| **courses** | Course/Module/Lesson CRUD, publish/archive, templates, image upload |
| **assessments** | Quiz / quiz attempts / auto-grading |
| **assignments** | Assignment CRUD, submissions, grading, deadline reminders |
| **submissions** | Файловые submissions, общие upload-эндпоинты |
| **exercises** | Унифицированные интерактивные упражнения (5+ типов). Уровни `robot_2d` и `world_3d` считает сервер: программа ученика исполняется в песочнице и возвращает список выполненных команд, который сервер проигрывает у себя через `robot_sim.py` / `world_sim.py` — оценка ставится по своему следу, а не по тому, что заявил браузер. Рядом `*_solver.py` (поиск в ширину: решаем ли уровень и за сколько шагов) и `*_validate.py` (что в уровне мешает), оба доступны только учителю и админу |
| **sandbox** | Прокси к Judge0 для исполнения кода (Python/JS/Java/C++/Go) |
| **progress** | Enrollment, lesson completion, video progress, course % |
| **gamification** | XP, leagues, badges, streaks, leaderboard |
| **certificates** | Auto-генерация при завершении курса, public verify |
| **notifications** | In-app уведомления + email-prefs |
| **email** | SMTP-обёртка, Jinja-шаблоны |
| **billing** | Stripe checkout/portal/webhook + Lemon Squeezy |
| **metered_billing** | Usage-based pricing (P2-9) |
| **calendar** | События, RRULE, iCal export |
| **live_lessons** | Живой урок: комната, роль, доска, опросы, сигналы, SSE |
| **live_media** | Видео и звук урока: подпись LiveKit-токена, модерация, брейкауты. Единственное место, где собираются права |
| **recording** | Audio/video submissions и записи уроков (MediaRecorder в браузере), хранение и срок жизни |
| **tutor** | AI-тьютор: подсказки, не решения. Провайдер модели внешний (`config.llm_base_url`) |
| **learning_paths** | Цепочки курсов с unlock |
| **skills** | Skill XP, радар-чарт |
| **recommendations** | AI-рекомендации (rule-based + Claude API) |
| **peer_review** | Peer-grading с distribution и rubrics |
| **team_projects** | Командные assignment'ы |
| **knowledge** | RAG поверх pgvector + Voyage AI embeddings (см. ниже) |
| **scorm** | Импорт SCORM 1.2/2004 пакетов |
| **attendance** | Отметка присутствия по группам |
| **parent** | Read-only родительский dashboard |
| **integrations** | OAuth (Zoom, Google, Microsoft, YouTube) |
| **webhooks** | Customer webhooks (HMAC-signed) |
| **math_problems** | Генерация и проверка матзадач |
| **waitlist** | Pre-launch email capture |
| **common** | Кросс-модульное: rate_limit, file_validation, storage |
| **db** | Base, миксины, async session factory |

## Multi-tenancy

- Все business-данные имеют `org_id` FK.
- `User.org_id` — primary org (legacy).
- `OrganizationMembership` — many-to-many для multi-org access (P2-11).
- Изоляция enforce'ится в роутерах/сервисах вручную: фильтр по
  `current_user.org_id` или явная проверка `resource.org_id == ...`.
- **Нет** middleware, который автоматически фильтрует по org. Это
  осознанный выбор — позволяет super-admin видеть всё.

## Knowledge module (RAG)

Особый модуль с внешним pipeline'ом:

1. **Distillation** — отдельный workflow в `F:\sources\` (Claude Desktop
   sessions). Производит `_verified/*.json` с структурированным
   edtech-контентом.
2. **Ingestion** — `python F:\sources\_prompts\ingest.py` запускается
   локально, бьёт на чанки, прогоняет через Voyage 3-large (embedding
   1024-dim), пишет в `knowledge_entries` + `knowledge_entry_sources`
   на проде через DATABASE_URL.
3. **Storage** — Postgres 16 с расширением `vector` (образ
   `pgvector/pgvector:pg16`).
   Индексы: HNSW по embeddings + GIN на trgm + Postgres FTS — гибридный
   поиск.
4. **Serving** — `app/knowledge/router.py`: `/api/v1/knowledge/{search,
   facets,list,{id}}`. Frontend: `(dashboard)/knowledge/`.

Voyage API key — в `VOYAGE_API_KEY` env на backend (используется только
ingest.py локально, не самим backend'ом).

## Frontend архитектура

См. `frontend/CLAUDE.md`. Ключевое:
- App Router с route groups `(auth)`, `(dashboard)`, `(admin)`
- Server-state через TanStack Query (никогда не Zustand)
- API-клиент `src/lib/api-client.ts` — Axios с JWT-interceptor

## Зависимости между модулями

- `auth` — все остальные импортируют `get_current_user`, `User`,
  `UserRole`, `Organization`.
- `orgs` зависит от `auth`.
- `billing` зависит от `auth`, `orgs` (subscription per org).
- `courses` базовый, от него зависят `assessments`, `assignments`,
  `progress`, `certificates`, `discussions`, `learning_paths`.
- `notifications` вызывается из почти всех модулей (создание уведомлений).
- `email` — по аналогии: вызывается из `auth`, `assignments`,
  `notifications`, ...
- `sandbox` — отдельный сервис, общается через HTTP (не in-process).

При изменении модели в одном модуле — проверь импорты в `main.py`
lifespan и `tests/conftest.py`. Новые модели должны быть импортированы
явно для регистрации в `Base.metadata`.

## Background jobs (APScheduler)

In-process (не Celery, чтобы не плодить Redis-зависимости пока не
понадобится). Конфигурация — `app/scheduler.py`. Текущие jobs:
- `cleanup_expired_refresh_tokens` — daily 03:10 UTC
- `send_deadline_reminders` — hourly :15
- `send_crm_task_reminders` — напоминания по заявкам
- `purge_inactive_students` — удаление неактивных по политике школы
- `purge_unconfirmed_consent_accounts` — аккаунты без подтверждённого согласия
- `sweep_stale_recording_uploads` — hourly :25; запись, зависшая в
  `uploading` дольше четырёх часов, помечается `failed`, иначе интерфейс
  обещает файл, которого не будет
- `purge_expired_recordings` — daily 03:50 UTC, до бэкапа в 04:00.
  Порядок выбран нарочно: после бэкапа истёкшее видео попадало бы в
  каждую копию ещё на сутки

Backup БД — отдельный cron на хосте, не в backend (`scripts/backup.sh`,
запускается через crontab пользователя `root` на проде).

## Что НЕ автоматизировано

Два пункта, которые стояли здесь до 2026-08-18, были уже неправдой, и
неправдой опасной — по ним можно было пойти и сломать прод. Что на самом
деле происходит:

- **Alembic миграции на старте — запускаются.** С 2026-07-19 lifespan
  гоняет `alembic upgrade head` (`backend/CLAUDE.md`, раздел про async).
  Слоя `ALTER TABLE IF NOT EXISTS` больше нет: изменение схемы, не
  оформленное миграцией, до прода не доедет.
- **Деплой — это мерж в `main`, и он автоматический.** CI собирает образы,
  кладёт их в GHCR, `deploy.yml` заходит на хост и делает `pull` + `up -d`.
  Ручного шага между мержем и продом нет. **`scp` кодом на сервер —
  запрещён** (корневой `CLAUDE.md`); строка про него жила здесь месяцами
  и противоречила единственному правилу, которое стоит соблюдать буквально.

Чего действительно нет:

- **Staging** — состояние в memory `project_staging_env.md`.
- **Медиа-контейнер в QA-стеке** — `docker-compose.qa.yml` без LiveKit,
  пока нет e2e-сценария урока с видео.

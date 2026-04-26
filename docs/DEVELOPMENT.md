# Локальная разработка — GrassLMS

Setup от нуля до работающего dev-окружения. Деплой на прод — см.
корневой `../CLAUDE.md`.

## Требования

- Python 3.12+
- Node.js LTS (20+)
- Docker + Docker Compose
- (опционально) `uv` или `pipx` для Python tooling

## Setup от нуля

```bash
# 1. Клон
git clone <repo-url> lms
cd lms

# 2. .env
cp .env.example .env
# открой .env и заполни как минимум:
#   POSTGRES_PASSWORD=что-нибудь
#   JWT_SECRET=$(python -c "import secrets; print(secrets.token_hex(32))")
#   SUPER_ADMIN_EMAIL=admin@local
#   SUPER_ADMIN_PASSWORD=Admin2026!

# 3. Поднять инфру (БД, Redis, sandbox)
docker compose up -d db redis sandbox

# 4. Backend
cd backend
pip install -e .[dev]
alembic upgrade head
uvicorn app.main:app --reload
# → backend на http://localhost:8000, /docs — Swagger

# 5. Frontend (в новом терминале)
cd frontend
npm install --legacy-peer-deps   # ОБЯЗАТЕЛЬНО (Sentry 9 vs React 19)
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
npm run dev
# → фронт на http://localhost:3000
```

Открыть http://localhost:3000, залогиниться как
`admin@local` / `Admin2026!` (super-admin создастся автоматически из
env-переменных при первом старте бэкенда).

## Полезные команды (Makefile)

В корне есть `Makefile` с шорткатами:

```bash
make up           # docker compose up -d
make down         # docker compose down
make build        # docker compose build
make logs         # docker compose logs -f
make migrate      # alembic upgrade head
make migrate-new msg="add foo column"   # новая миграция
make test         # pytest -v (backend)
make lint         # ruff check + ruff format --check
make format       # ruff fix + ruff format
make fe-dev       # npm run dev (frontend)
make fe-build     # npm run build
make fe-lint      # npm run lint
```

## Запуск всего через docker-compose

Если не хочешь возиться с локальным Python и Node:

```bash
docker compose up -d   # поднимает db, backend, frontend, sandbox, redis, nginx
```

Проблема: hot reload работает только если `volume`-маунтить исходники
(в `docker-compose.yml` это уже настроено для backend и frontend).
Для активной разработки локальный режим (uvicorn/npm dev) удобнее —
быстрее перезагрузка, прямой доступ к стектрейсам.

## Структура `.env`

Полный шаблон — `.env.example`. Минимум для dev:

```
ENVIRONMENT=development
POSTGRES_DB=lms
POSTGRES_USER=lms
POSTGRES_PASSWORD=<random>
DATABASE_URL=postgresql+asyncpg://lms:<random>@db:5432/lms

JWT_SECRET=<64 char hex>
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

SUPER_ADMIN_EMAIL=admin@local
SUPER_ADMIN_PASSWORD=Admin2026!

CORS_ORIGINS=http://localhost:3000
SANDBOX_URL=http://sandbox:8001
```

В проде дополнительно — Stripe, SMTP, Sentry, Voyage. См. `.env.example`
для полного списка с комментариями.

## Создать тестовый super-admin

Два способа:

**Через env (рекомендую для dev):**
```bash
SUPER_ADMIN_EMAIL=admin@local SUPER_ADMIN_PASSWORD=Admin2026! \
    uvicorn app.main:app --reload
```
Бэкенд при старте создаст юзера, если такого ещё нет.

**Через скрипт (legacy):**
```bash
python create_super_admin.py
```

## Демо-курс на чистой БД

После регистрации новой организации авто-сидится демо-курс
(SAT Math, помеченный `is_template=true`). Если хочешь принудительно:
- Залогинься как super-admin
- В админке создай новый курс с нуля, или
- Запусти один из seed-скриптов из `scripts/` (актуальные —
  `create_python_course.py`, `create_test_course.py`)

⚠️ Не запускай скрипты из `scripts/legacy/` — они для исторических
версий контента и могут сломать данные.

## Воркфлоу разработки

1. Создай ветку: `git checkout -b feat/short-name`
2. Изменения в коде
3. Если меняешь модели — новая миграция
   (`make migrate-new msg="..."`), читаешь сгенерированное.
4. Тесты:
   ```bash
   cd backend && pytest tests/
   cd frontend && npm test
   ```
5. Lint: `make lint && cd frontend && npm run lint`
6. Commit, push, PR.

CI бежит на PR. Подробности — `docs/TESTING.md`.

## Деплой на прод

См. корневой `../CLAUDE.md`. Краткий сценарий:
1. Скопировать изменённые файлы через `scp` / `cat | ssh`.
2. Если есть миграция — `alembic upgrade head` через docker exec.
3. `docker compose -f docker-compose.prod.yml build <service> && up -d <service>`.
4. Smoke-проверка: https://grasslms.online/health

Нет CI/CD деплоя. Нет staging. Это техдолг — см. memory
`project_staging_env.md`.

## Troubleshooting

### `npm install` падает с peer dep error
Забыл `--legacy-peer-deps`. Это из-за `@sentry/nextjs@9` vs React 19.
См. `tasks/lessons.md`.

### Backend стартует, но `/health` показывает `ready: false`
Скорее всего `_run_setup` упал. Смотри логи — типичные причины:
- `DATABASE_URL` неправильный
- pgvector extension не установлен в БД
- Недостаточно прав у пользователя `lms` на создание таблиц

### `pytest` падает с `database does not exist`
БД не поднята: `docker compose up -d db`. Или `DATABASE_URL` указывает
на несуществующее имя. Тесты используют ту же БД, что и прод-режим
(в одну и ту же DB пишут через transaction-rollback).

### Rate limiter не работает / падает на стартe
Если `RATE_LIMIT_STORAGE_URI=redis://...` — Redis должен быть запущен.
Без Redis — поставь `RATE_LIMIT_STORAGE_URI=memory://` (default), но
в multi-worker дев-режиме счётчики не делятся между воркерами.

### `frontend` не может достучаться до backend
- Проверь, что `NEXT_PUBLIC_API_URL` в `frontend/.env.local` указывает
  на http://localhost:8000 (для dev) или на прод-URL.
- CORS: `CORS_ORIGINS` в backend `.env` должен содержать origin фронта
  (`http://localhost:3000`).

### Sentry не видит ошибок
Это не баг. Без `SENTRY_DSN` Sentry — no-op. Чтобы тестировать —
создай свободный проект на sentry.io, скопируй DSN в env.

## Полезные ссылки

- [`backend/CLAUDE.md`](../backend/CLAUDE.md) — backend conventions
- [`frontend/CLAUDE.md`](../frontend/CLAUDE.md) — frontend conventions
- [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) — карта модулей
- [`docs/API_REFERENCE.md`](API_REFERENCE.md) — индекс API
- [`docs/MIGRATIONS.md`](MIGRATIONS.md) — Alembic подробно
- [`docs/TESTING.md`](TESTING.md) — pytest / Vitest / Playwright
- [`../CLAUDE.md`](../CLAUDE.md) — продакшн (Hetzner, deploy)
- [`../ROADMAP.md`](../ROADMAP.md) — фичи и план

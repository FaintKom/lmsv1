# Backend — GrassLMS

FastAPI async backend. Загружается автоматически, когда работаешь в `backend/`.
Корневой `../CLAUDE.md` — production/deploy. Этот файл — про код.

## Стек

- Python 3.12, FastAPI 0.115+, Uvicorn
- SQLAlchemy 2 async + asyncpg
- Alembic для миграций
- Pydantic v2 + pydantic-settings
- python-jose (JWT) + bcrypt
- slowapi (rate limiting), structlog, APScheduler, sentry-sdk, redis, boto3, openpyxl, pgvector

Зависимости — `pyproject.toml`. Установка: `pip install -e .[dev]` (CI делает так же).

## Структура `app/`

Feature-модульная: каждый модуль — отдельная зона ответственности с одинаковой
внутренней раскладкой `models.py` / `schemas.py` / `router.py` / `service.py`
(где применимо).

Список модулей: admin, ai, assessments, assignments, attendance, auth, billing,
calendar, certificates, common, courses, db, discussions, email, exercises,
gamification, integrations, knowledge, learning_paths, math_problems, meetings,
metered_billing, notifications, orgs, parent, peer_review, plagiarism, progress,
recommendations, recording, sandbox, scorm, skills, submissions, team_projects,
waitlist, webhooks.

Особые папки:
- `common/` — кроссмодульные утилиты (rate_limit, file_validation, storage).
- `db/` — Base, IDMixin, TimestampMixin, async engine + `get_db` dependency.
- `email/` — SMTP-обёртка, шаблоны.
- `main.py` — `create_app()`, lifespan, регистрация роутеров.
- `config.py` — единственный источник env-настроек (Pydantic Settings).
- `logging_config.py`, `scheduler.py` — общие синглтоны.

## Async-конвенции

- **Везде `async def`.** Нет sync-роутеров, нет sync-сервисов, нет `requests`
  (используем `httpx.AsyncClient`).
- **Сессия БД** — `AsyncSession`, инжектится через `Depends(get_db)`.
  `get_db` коммитит на успехе, откатывает на исключении ([db/session.py:16](app/db/session.py)).
- **Никогда не вызывай sync-Alembic из lifespan** —
  `command.upgrade()` запускает asyncio.run внутри уже-работающего loop'а
  и падает. Изменения схемы делаются через миграции вручную (см. ниже),
  плюс fallback `Base.metadata.create_all` + `ALTER TABLE IF NOT EXISTS` в
  `_run_setup` ([main.py:88](app/main.py)). Это техдолг — см. P1 follow-up.

## Модели

Все модели наследуют `IDMixin` (UUID PK) и `TimestampMixin` (created_at,
updated_at, server_default=now()). См. [db/base.py](app/db/base.py).

```python
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, ForeignKey
from app.db.base import Base, IDMixin, TimestampMixin

class Course(Base, IDMixin, TimestampMixin):
    __tablename__ = "courses"
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    org_id: Mapped[UUID] = mapped_column(ForeignKey("orgs.id"), nullable=False)
```

**Multi-tenancy.** Любая таблица данных, принадлежащая организации, имеет
`org_id` FK на `orgs.id`. Изоляция enforce'ится в роутере/сервисе через
проверку `current_user.org_id == resource.org_id`. Single-org user'ы получают
права через `organization_memberships` (P2-11).

**Регистрация модели для метаданных.** Каждая модель должна импортироваться
в `main.py` lifespan и в `tests/conftest.py` (см. оба файла, секции
`# noqa`). Если новый модуль не виден в `Base.metadata` — забыл импорт.

## Pydantic v2 схемы

Суффиксы `Request` (входящие) и `Response` (исходящие). Валидаторы — внутри
схем (`@field_validator`, `@model_validator`), не в роутерах.

```python
class CourseCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str = ""

class CourseResponse(BaseModel):
    id: UUID
    title: str
    org_id: UUID
    model_config = {"from_attributes": True}
```

## Аутентификация и роли

- JWT через `python-jose`, секрет в `JWT_SECRET` (≥32 символа в проде —
  `validate_production()` падает, если default).
- Access token (30 мин) + refresh token с jti, хранится в `refresh_tokens`
  (revocation list). См. P0-4 в архиве.
- `get_current_user` — FastAPI dependency, валидирует JWT, возвращает `User`.
- Роли: `super_admin`, `admin`, `teacher`, `student`, `parent` (enum
  `UserRole`). RBAC-проверка — в роутере/сервисе явно.
- Email verification по умолчанию выключена (`require_email_verification=False`).
  Включать только когда SMTP настроен — иначе невалидируемые юзеры не залогинятся.

## Rate limiting

- `slowapi` через `app.state.limiter` ([common/rate_limit.py](app/common/rate_limit.py)).
- Storage: `RATE_LIMIT_STORAGE_URI` env (default `memory://`, в проде —
  `redis://redis:6379/0`). На multi-worker memory:// **не работает** —
  каждый воркер имеет свой счётчик. См. tasks/lessons.md.
- Шаблон применения:
  ```python
  from app.common.rate_limit import limiter

  @router.post("/login")
  @limiter.limit("5/minute")
  async def login(request: Request, ...):  # request обязателен для slowapi
      ...
  ```

## Миграции (Alembic)

Файлы в `alembic/versions/`. Naming: `<6-char-id>_<verb>_<entity>.py`
(пример: `e1f2a3b4c5d6_unified_exercises.py`).

```bash
# создать новую (autogenerate из изменений в моделях)
cd backend && alembic revision --autogenerate -m "add foo column"

# применить локально
cd backend && alembic upgrade head

# откатить на одну ревизию
cd backend && alembic downgrade -1
```

⚠️ **Не редактируй уже отгруженную на прод миграцию** — пометки stamped в DB
не совпадут. Создай новую.

⚠️ **`op.execute(...)` должен быть rerun-safe** (`IF NOT EXISTS`,
`ON CONFLICT`), потому что `_run_setup` в `main.py` дублирует часть
ALTER-ов как fallback и они выполняются на каждом старте.

Подробнее: [`docs/MIGRATIONS.md`](../docs/MIGRATIONS.md).

## Тесты

- **pytest + pytest-asyncio**, `asyncio_mode = "auto"` ([pyproject.toml:71](pyproject.toml)) —
  `@pytest.mark.asyncio` НЕ нужен, любой `async def test_*` подхватывается.
- Фикстуры в [tests/conftest.py](tests/conftest.py): `db` (async session
  внутри транзакции с rollback), `client` (httpx ASGITransport),
  factories для пользователей/орг.
- Rate limiter resette'ится автоматически перед каждым тестом
  (autouse fixture `_reset_rate_limiter`) — иначе один файл портит счётчики
  всем последующим.
- Запуск: `pytest tests/` или `pytest tests/test_p0_security.py -v`.

Подробнее: [`docs/TESTING.md`](../docs/TESTING.md).

## Lifespan / порядок инициализации

В [`main.py`](app/main.py) важен порядок — не переставлять:

1. `configure_logging()` (до первого импорта)
2. **Sentry init** (если DSN задан) — до импорта роутеров, чтобы SDK
   успел пропатчить FastAPI/Starlette/SQLAlchemy
3. Импорт роутеров
4. `lifespan` startup:
   a. `validate_production()` — fail-fast на небезопасных дефолтах
   b. Импорт всех моделей (для `Base.metadata`)
   c. DB-коннект с retry (3 попытки)
   d. `_run_setup()` — `Base.metadata.create_all` + ALTER'ы +
      super-admin bootstrap + plan seeding
   e. APScheduler start (jobs из `scheduler.py`)
5. `yield` — приложение принимает запросы
6. shutdown: stop scheduler, dispose engine

В CLI коммент `# E402` отключает запрет "import not at top of file"
для `main.py` именно из-за пункта 2 ([pyproject.toml:65](pyproject.toml)).

## Локальный запуск

```bash
# 1. Установка
cd backend
pip install -e .[dev]

# 2. Поднять postgres + redis + sandbox
cd .. && docker compose up -d db redis sandbox

# 3. Миграции
cd backend && alembic upgrade head

# 4. Bootstrap super-admin (опционально)
SUPER_ADMIN_EMAIL=admin@local SUPER_ADMIN_PASSWORD=Admin2026! \
    uvicorn app.main:app --reload

# или без env — скопировать .env.example → .env, заполнить, запустить
uvicorn app.main:app --reload
```

API docs: http://localhost:8000/docs (Swagger), `/redoc` (ReDoc).

Полный setup (включая фронт) — [`docs/DEVELOPMENT.md`](../docs/DEVELOPMENT.md).

## Смежные документы

- [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) — карта модулей и зависимостей
- [`../docs/API_REFERENCE.md`](../docs/API_REFERENCE.md) — индекс роутеров (193 endpoint'а)
- [`../docs/MIGRATIONS.md`](../docs/MIGRATIONS.md) — Alembic workflow подробно
- [`../docs/TESTING.md`](../docs/TESTING.md) — pytest рецепты
- [`../CLAUDE.md`](../CLAUDE.md) — production deploy

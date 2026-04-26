# Тестирование — GrassLMS

Backend: pytest + pytest-asyncio. Frontend: Vitest (unit) + Playwright (E2E).
CI gate'ит оба. См. `.github/workflows/ci.yml`.

## Backend (pytest)

### Запуск

```bash
cd backend
pytest tests/                            # всё
pytest tests/test_p0_security.py -v      # один файл
pytest tests/test_auth.py::test_login    # один тест
pytest -k "rate" -v                      # по подстроке
pytest --collect-only                    # только список, не запускать
```

Тесты требуют запущенный Postgres. Локально:
```bash
docker compose up -d db
```

### Конвенции

- `asyncio_mode = "auto"` (`pyproject.toml`) — `@pytest.mark.asyncio` НЕ
  нужен. Любой `async def test_*` запустится как async.
- Файлы: `tests/test_<module>.py`. Подкаталоги для группировки
  (`test_assessments/`, `test_courses/`, ...).
- Имена тестов: `test_<что_проверяем>__<условие>` (например
  `test_login__rejects_wrong_password`).

### Фикстуры (`tests/conftest.py`)

| Фикстура | Что даёт |
|---|---|
| `db` | `AsyncSession` внутри транзакции, которая роллбэкается после теста |
| `client` | `httpx.AsyncClient` через `ASGITransport` (без сети) |
| `_reset_rate_limiter` (autouse) | Сбрасывает slowapi-счётчики перед каждым тестом |
| `test_user`, `test_teacher`, `test_admin`, `test_super_admin` | Pre-created users в свежей org |
| `test_org` | Свежая Organization |
| `auth_headers(user)` | `{"Authorization": "Bearer ..."}` для http-вызовов |

Транзакционный rollback означает: можно создавать что угодно, состояние
не утечёт между тестами. **Но**: `await session.commit()` тоже откатится —
это by design (см. `restart_savepoint` в conftest).

### Что покрыто

`backend/tests/`:
- `test_auth.py`, `test_auth/` — register/login/refresh/logout/email-verify
- `test_p0_security.py` — file upload validation, rate limiting, refresh
  revocation, change password, email verification (P0 backstop)
- `test_admin.py`, `test_rbac.py` — RBAC проверки
- `test_courses.py`, `test_courses/` — Course/Module/Lesson CRUD
- `test_assessments.py`, `test_assessments/` — quiz attempts
- `test_assignments.py` — submissions + grading
- `test_progress.py`, `test_gamification.py` — XP, badges, leagues
- `test_collaboration.py` — discussions, peer-review
- `test_exercises.py` — interactive
- `test_billing/` — Stripe webhook handlers
- `test_sandbox/` — прокси к Judge0
- `test_misc.py` — то, что не влезло в категории

Текущее покрытие — около 50% (P1-8 baseline). Не статус-кво, расширять.

### Что НЕ покрыто (стоит добавлять при изменениях)

- Большая часть `knowledge` модуля
- Customer webhooks (P2-12)
- Lemon Squeezy webhook
- SCORM импорт
- Recording (audio/video submissions)

## Frontend (Vitest)

### Запуск

```bash
cd frontend
npm test                # один прогон (CI)
npm run test:watch      # watch mode для разработки
```

Конфиг — `vitest.config.ts`. JSDOM environment. Вспомогательные
утилиты — `@testing-library/react` + `@testing-library/jest-dom`.

### Что покрыто

- `src/lib/i18n/translations.test.ts` — парность EN/RU словарей. **Этот
  тест критичен**: ловит регрессию класса P0-13 (один язык отстал по
  ключам).
- Smoke unit-тесты компонентов в `src/test/`.

Покрытие — baseline. Расширять при добавлении новой логики, особенно
формы и edge cases TanStack Query.

### Конвенции

- Тесты рядом с кодом: `Component.tsx` → `Component.test.tsx`.
- Общие фикстуры — `src/test/`.
- Mock'ать API-запросы через MSW не настроен — пока mock'аются `vi.mock`
  на модули `src/lib/api/*`.

## E2E (Playwright)

### Запуск

```bash
cd frontend
npm run test:e2e
```

**Требует запущенных backend и frontend.** Локально это значит — три
терминала:

```bash
# Терминал 1: БД и периферия
docker compose up -d db redis sandbox

# Терминал 2: Backend
cd backend && uvicorn app.main:app

# Терминал 3: Frontend
cd frontend && npm run dev

# Терминал 4: Тесты
cd frontend && npm run test:e2e
```

### Что покрыто

`frontend/e2e/`:
- Smoke: лендинг (`/`), pricing (`/pricing`), login (`/login`) — 200 + ключевые
  элементы видны
- `rbac.spec.ts` — student vs teacher vs admin доступы

### CI

В CI (`.github/workflows/ci.yml`) Playwright **не запускается** — слишком
тяжёлый стек поднимать в GitHub Actions для каждого PR. Запускается
только локально, перед релизами. План на будущее: dedicated workflow
с docker-compose сервисами.

## CI (`.github/workflows/ci.yml`)

Что бежит на каждом PR:
- **backend lint:** `ruff check`, `ruff format --check`. Baseline ignores
  E501/E712/F841/E741 (см. `pyproject.toml`).
- **backend tests:** `pytest tests/` против postgres:16 service container.
- **frontend typecheck:** `tsc --noEmit`.
- **frontend tests:** `npm test` (Vitest, не Playwright).
- **frontend build:** `next build` — ловит SSR-ошибки.

ESLint — пока non-blocking (есть unbalanced legacy warnings, чистится
отдельно).

`--legacy-peer-deps` нужен на фронте из-за `@sentry/nextjs@9` vs React 19.
Документировано в `frontend/CLAUDE.md` и `tasks/lessons.md`.

## Локальная репродукция CI

```bash
# backend
cd backend
ruff check .
ruff format --check .
pytest tests/

# frontend
cd frontend
npx tsc --noEmit
npm test
npm run build
```

Если что-то падает локально, но проходит в CI — проверь Python
версию (нужна 3.12+) и Node (LTS, см. `frontend/Dockerfile`).

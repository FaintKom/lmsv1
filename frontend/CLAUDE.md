# Frontend — GrassLMS

Next.js 16 (App Router) + React 19. Загружается автоматически, когда работаешь
в `frontend/`. Корневой `../CLAUDE.md` — production/deploy. Этот файл — про код.

## Стек

- **Next.js 16.1.6** App Router (НЕ Pages). `src/app/` — единственная зона роутов.
- **React 19.2.3** + TypeScript 5 strict
- **Tailwind CSS 4** — стилизация
- **Zustand 5** — глобальный UI-state (locale, sidebar)
- **TanStack Query 5** — серверный state (кэш, рефетч, mutations). Server-state
  НЕ хранится в Zustand.
- **Axios** — HTTP клиент с JWT-interceptor (`src/lib/api-client.ts`)
- **next-intl 4.8** — i18n (EN / RU, словарь в `src/lib/i18n/translations.ts`)
- **TipTap 3** — rich text editor (lessons, assignments)
- **Monaco Editor** — code challenges
- **Three.js + R3F** — 3D-контент (`world_3d` exercises)
- **Blockly** — визуальное программирование (`robot_2d` exercises)
- **FullCalendar 6** — calendar view
- **Stripe.js** — checkout
- **Sonner** — toasts (через global error interceptor)
- **Driver.js** — onboarding tour для админов
- **Recharts** — графики аналитики
- **Zod** + react-hook-form — валидация форм
- **dnd-kit** — drag & drop

Полный список — `package.json`.

## Routing — App Router с route groups

```
src/app/
├── (auth)/              # без сайдбара
│   ├── login/
│   ├── register/
│   ├── forgot-password/
│   ├── reset-password/
│   └── verify-email/
├── (dashboard)/         # student + общее, с сайдбаром
│   ├── achievements/
│   ├── assignments/
│   ├── calendar/
│   ├── certificates/
│   ├── courses/
│   ├── dashboard/
│   ├── knowledge/       # knowledge module (RAG)
│   ├── leaderboard/
│   ├── meetings/
│   ├── parent/
│   ├── paths/
│   ├── profile/
│   ├── progress/
│   ├── sat-practice/
│   └── skills/
├── (admin)/admin/       # teacher + admin, отдельный сайдбар
│   ├── billing/
│   ├── gradebook/
│   ├── users/
│   ├── analytics/
│   ├── bulk-enroll/
│   └── ...
└── <публичные>/         # лендинг, юридика
    ├── page.tsx         # /
    ├── pricing/
    ├── demo/
    ├── terms/, privacy/, cookies/, refund/, copyright/, acceptable-use/
    └── offline/         # PWA fallback
```

Группы `(auth)` / `(dashboard)` / `(admin)` не попадают в URL — используются
для общих layout'ов и middleware-проверок.

## Конвенции

1. **Functional components с hooks.** Никаких class components.
2. **`'use client'` только когда нужно** (state, effects, browser API).
   Server Components — дефолт.
3. **Server-state → TanStack Query** (`useQuery` / `useMutation`).
   Локальный UI-state → `useState`. Глобальный UI-state → Zustand store
   в `src/stores/`. Мешать не надо.
4. **Импорты через `@/`** алиас на `src/` (`tsconfig.json`).
5. **API-вызовы — через `src/lib/api/*` модули**, не напрямую из компонентов.
   Каждый домен (auth, courses, ...) имеет свой файл с типизированными
   функциями.
6. **Формы:** `react-hook-form` + `zod` resolver. Серверные ошибки —
   через `setError`.
7. **Локализация:** не хардкодим строки UI — через `useTranslation()`,
   ключи добавляем сразу в `en` И `ru`. Vitest-тест парности упадёт,
   если забыл.

## API клиент

`src/lib/api-client.ts` — Axios instance:
- `baseURL` из `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`)
- Request interceptor — добавляет `Authorization: Bearer <token>` из
  localStorage
- Response interceptor — на 401 чистит токен и редиректит на `/login`,
  на 5xx показывает Sonner toast

Доменные обёртки — в `src/lib/api/` (auth.ts, courses.ts и т.д.).
Они возвращают типизированные данные и используются внутри
TanStack Query хуков.

## i18n

6 локалей (en/es/ru/tr/de/uk), **code-split по локали** (с 2026-07-18):

- Словари — `src/lib/i18n/locales/{en,es,ru,tr,de,uk}.ts`, по файлу на локаль.
- `src/lib/i18n/meta.ts` — `Locale`, `LOCALES`, `DEFAULT_LOCALE`,
  `TranslationMap`. **Компоненты импортируют константы ТОЛЬКО отсюда.**
- `src/lib/i18n/context.tsx` — `en` статически (дефолт + fallback),
  остальные локали через ленивый `import()` при переключении.
- `src/lib/i18n/translations.ts` — агрегатор всех словарей **только для
  Node-тестов/скриптов**. Импорт из компонента ломает code-split —
  затягивает ~1MB словарей обратно в клиентский бандл.
- Парность ключей проверяет `translations.test.ts` (Vitest, CI-gate).
- Хук `useTranslation()`, компонент `<LocaleSwitcher />`.
- Дефолтная локаль — localStorage → язык браузера → en.

При добавлении ключа: добавь его во ВСЕ 6 файлов `locales/*.ts` —
тест парности упадёт, если забыл хотя бы один.

## Тесты

- **Vitest** — unit/integration: `npm test` (CI gate). Конфиг
  `vitest.config.ts`, тесты лежат рядом с кодом (`*.test.ts`) и в
  `src/test/`.
- **Playwright** — E2E: `npm run test:e2e`. Конфиг `playwright.config.ts`,
  тесты в `e2e/`. **Требует запущенных backend + frontend.**
  Локально:
  ```bash
  # терминал 1
  cd backend && uvicorn app.main:app
  # терминал 2
  cd frontend && npm run dev
  # терминал 3
  cd frontend && npm run test:e2e
  ```

Подробнее: [`../docs/TESTING.md`](../docs/TESTING.md).

## Локальный запуск

```bash
cd frontend
npm install    # с @sentry/nextjs@10 (2026-07-18) peer-конфликтов нет;
               # CI/Dockerfile всё ещё используют --legacy-peer-deps (follow-up: снять)
cp .env.local.example .env.local  # если есть; иначе создать руками
npm run dev                        # http://localhost:3000
```

Минимум для `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Для Sentry — `NEXT_PUBLIC_SENTRY_DSN`. Без него — no-op, ничего не падает.

## Sentry

- `instrumentation.ts` — server runtime (Next.js Edge / Node)
- `instrumentation-client.ts` — browser
- Полный no-op без DSN. С DSN — автокаптура ошибок, source maps в build'е.

При апгрейде на `@sentry/nextjs@10` проверить, поддержан ли React 19 —
тогда можно убрать `--legacy-peer-deps` (сейчас он только из-за этой
peer-dep'ы).

## Build / production

- `npm run build` — Next.js production build
- `npm start` — production server (используется в Docker-контейнере)
- ESLint: `npm run lint` (не блокирует CI пока что — см. todo)

В Dockerfile: `npm ci --legacy-peer-deps && npm run build`.

## Смежные документы

- [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) — high-level карта
- [`../docs/API_REFERENCE.md`](../docs/API_REFERENCE.md) — что отдаёт backend
- [`../docs/TESTING.md`](../docs/TESTING.md) — Vitest + Playwright рецепты
- [`../docs/DEVELOPMENT.md`](../docs/DEVELOPMENT.md) — full-stack setup
- [`../CLAUDE.md`](../CLAUDE.md) — production deploy

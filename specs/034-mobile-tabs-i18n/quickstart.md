# Quickstart: как проверить нижние вкладки

## Что должно получиться

Пять подписей внизу экрана телефона меняются вместе с языком, в одну строку,
без роста панели по высоте.

## Тесты

```bash
cd frontend && npx vitest run src/lib/i18n
```

Два прогона, оба обязательны:

1. **До** удаления строки из `i18n-allowlist.ts` — тест обязан упасть на
   «allowlist entries all NOT using useTranslation». Красный прогон
   доказывает, что проверка живая (принцип II конституции).
2. **После** — зелёный, включая паритет шести локалей
   (`translations.test.ts`).

Плюс типы:

```bash
cd frontend && npx tsc --noEmit
```

## Браузер

Этот worktree пришёл без `node_modules` и без `.env.local` — их в git нет.
Здесь `node_modules` подключён junction'ом к основному чекауту (`package-lock`
у них побайтово один), а `frontend/.env.local` содержит одну строку:

```
BACKEND_URL=http://localhost:8000
```

`NEXT_PUBLIC_API_URL` намеренно не задан: тогда `api-client` ходит по
относительному `/api/v1`, а Next переписывает его на бэкенд сам. Браузер
видит один источник, поэтому ни CORS, ни httpOnly-куки проверке не мешают —
и порт dev-сервера может быть любым свободным.

Одна оговорка про junction: Turbopack его не принимает («Symlink
[project]/node_modules is invalid, it points out of the filesystem root»), а
webpack принимает. Поэтому dev-сервер здесь запускается как
`npx next dev --webpack`. На CI и в проде это ничего не меняет — там
настоящий `npm ci`.

Бэкенд — уже поднятый QA-стек на 8000. Учётки из `scripts/seed_qa.py`:
`qa-student@qa.example.com` и `qa-teacher@qa.example.com`, пароль
`qa-test-not-for-prod`.

Сценарий, дважды — под учеником и под преподавателем:

1. Ширина окна 375 px.
2. Войти, дождаться нижней панели (она под `md:hidden`, на широком экране её
   нет).
3. Переключить язык на русский. Подписи меняются сразу, без перезагрузки.
4. Пройти по остальным пяти языкам и на каждом посмотреть на панель:
   перенос, обрезка, изменение высоты — дефект.

Язык лежит в `localStorage` под ключом `locale`, в базу не пишется:
переключение ничего не оставляет в чужом QA-стеке.

## После проверки

Junction и `.env.local` — локальные леса, в git их нет. Снять, если worktree
больше не нужен:

```bash
rm frontend/node_modules frontend/.env.local
```

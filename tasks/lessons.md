# Уроки из инцидентов

Краткие правила, выработанные после реальных факапов. Цель — не повторить.

---

## 2026-04-02 — Деплой сломал SSL и БД

**Что случилось.**
- `docker compose up -d --force-recreate` пересоздал DB-контейнер, сбросив пароль.
- nginx потерял сетевые соединения с новыми backend/frontend.
- SSL уже был настроен через Let's Encrypt — не проверил перед деплоем,
  сгенерировал лишний self-signed.

**Правила.**
1. **Перед ЛЮБЫМ деплоем:** `docker ps`, проверить сети, `curl https://...`
   и сохранить вывод.
2. **Никогда не использовать `--force-recreate`**, если не критично нужно —
   `docker compose restart` достаточно.
3. **Сверять `.env` vs `docker-compose.yml`** на password/config-mismatch
   ДО любых действий с контейнерами.
4. **Проверять `/etc/letsencrypt/`** до генерации новых SSL-сертов.
5. **Порядок деплоя:** pull code → rebuild images → restart по одному
   контейнеру → verify после каждого шага.
6. **Не чинить то, что не сломано** — если SSL работает, не трогать
   nginx SSL-конфиг.

---

## 2026-04-09 — Hardcoded credentials в git history

**Что случилось.**
- В `backend/app/main.py` лежал `faintkom@gmail.com` / `REDACTED_PASSWORD`
  как fallback для super-admin bootstrap.
- Удалили из кода в P0-1, но история git осталась с паролем.

**Правила.**
1. **Никаких secrets в коде, даже как fallback.** Bootstrap — только
   через env vars (`SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD`),
   с fail-soft если пусто.
2. **Если secret попал в git** — `git filter-repo` (не `filter-branch`!),
   потом ротация секрета. Force-push на main только после согласования.
3. **Перед коммитом seed-скриптов** — `grep -r "@gmail" .` на всякий случай.

---

## 2026-04-10 — Sentry 9.x vs React 19 (peer deps)

**Что случилось.**
- `@sentry/nextjs@^9.0.0` имеет peerDep на React 18.x, а у нас React 19.
- `npm install` упал в Dockerfile фронтенда.

**Правило.**
- В `frontend/Dockerfile` и в локальной разработке использовать
  `npm install --legacy-peer-deps`. Документировано в `frontend/CLAUDE.md`.
- При апгрейде Sentry на 10.x — проверить, добавили ли поддержку React 19,
  и убрать `--legacy-peer-deps`.

---

## 2026-04-25 — Ребрендинг `learnhub.app` → `grasslms.online`

**Что случилось.**
- Сменили домен и rebrand. Тест-аккаунты (`student@learnhub.app` и т.п.)
  остались в БД со старыми email.
- `seed_*.py` и тесты ломались на несоответствии.

**Правило.**
- Любые **домен-зависимые литералы** (test emails, URL'ы в шаблонах
  писем, страницы лендинга) централизуем в `app/config.py` через env-vars
  (`DEMO_STUDENT_EMAIL`, `APP_URL`). Не зашиваем `@grasslms.online` в код.
- При следующем rebrand — поменять только env, не код.

---

## 2026-04-10 — Rate limiter падал при перезапуске

**Что случилось.**
- `slowapi` с `memory://` хранилищем — каждый рестарт обнуляет счётчики
  (можно было обходить лимиты простым redeploy).
- На multi-worker запуске (uvicorn --workers 4) каждый worker имел свой
  счётчик — тоже фактически no-op.

**Правило.**
- В проде всегда `RATE_LIMIT_STORAGE_URI=redis://redis:6379/0`.
  Если Redis в стеке нет — добавить **до** уделичения числа воркеров.
- Сделано в P1-5; проверять при настройке любого нового окружения.

---

## 2026-05-04 — Staging захватил половину prod-трафика через shared docker-сеть

**Что случилось.**
- Юзеры на `grasslms.online` ловили `Failed to load chunk df94...js`,
  бесконечный редирект на `/login`, рандомные `400` на `/auth/login`.
- Контейнеры `lms-staging-frontend-1` и `lms-staging-backend-1`
  были подключены к **двум** сетям: своему `lms-staging_internal` и
  общему `lms_internal` (где живёт prod nginx). Compose без явных
  `aliases:` регистрирует service-name (`backend`, `frontend`) как
  network-alias на ВСЕХ сетях, включая `lms_internal`.
- Внутри `lms_internal` имя `frontend` → 2 IP (prod + staging),
  то же для `backend`. Docker DNS round-robin → ~50 % nginx-запросов
  попадало в staging:
  - static chunks 404 (у staging другой build → другие хэши),
  - `POST /auth/login` 400 (в staging-DB нет prod-юзеров),
  - `POST /auth/refresh` 400 (тот же flap).
- Сверху ехал service worker со стратегией cache-first, который
  кэшировал stale HTML с битыми чанками — поэтому одна реклоада
  чинила, две — нет.

**Правила.**
1. **Никогда не делать сервис `backend` / `frontend`** в staging-compose
   если он подключён к prod-network. Renamed services
   (`staging-backend`, `staging-frontend`) — единственный способ
   полностью убрать дефолтный alias на shared-network. `aliases:`
   аддитивен, дефолт не убирает.
2. **Перед подключением к external network** сделать `docker exec
   <prod-resolver> nslookup <service>` и убедиться что один IP.
   Команда:
   ```
   ssh root@204.168.165.41 "docker exec lms-nginx-1 nslookup backend; docker exec lms-nginx-1 nslookup frontend"
   ```
   Должна возвращать ровно один Address на каждый.
3. **nginx upstream — explicit container_name**, не network alias.
   `set $frontend_upstream http://lms-frontend-1:3000;` вместо
   `http://frontend:3000;`. Container-name всегда уникален.
4. **Service Worker = бомба замедленного действия.** Cache-first SW
   на статике лочит юзеров на старых чанках. Если SW нужен — сделать
   network-first для HTML, версионировать `CACHE_NAME` и удалять
   старые на activate. Лучше — не делать SW пока нет реального
   offline-юзкейса.
5. **HTML не должно кэшироваться `s-maxage`-долго.** Next.js по
   умолчанию шлёт `Cache-Control: s-maxage=31536000` на пререндернутые
   страницы. Cloudflare/CDN уносит в кэш на год. После каждого
   ребилда фронта чанк-хэши меняются → старый HTML 404'ит. Override
   в nginx:
   ```
   map $uri $cache_control_override {
       default              "no-store, must-revalidate";
       "~^/_next/static/"   "public, max-age=31536000, immutable";
   }
   ```
6. **Refresh token rotation** на бэке = на фронте дедупить параллельные
   refresh. Иначе первый рефреш ротирует, второй приходит со старым
   jti → 400 → `window.location.href = "/login"` → пользователь
   выкинут несмотря на верный пароль.

---

## Шаблон для новых уроков

```
## YYYY-MM-DD — короткое описание инцидента

**Что случилось.**
- Цепочка событий, конкретные команды, последствия.

**Правило.**
- Что делать, чтобы не повторить. Желательно — проверяемое (чеклист или
  команда), а не "быть внимательнее".
```

# 🎯 Активная задача: завершить деплой staging

PR с инфраструктурой готов и ждёт двух действий: одно от пользователя, одно я делаю через SSH.

**PR:** https://github.com/FaintKom/lmsv1/pull/2
**Документация:** [docs/STAGING.md](../docs/STAGING.md)

## Этап 2 — нужно от пользователя (~2 мин)

- [ ] **DNS.** В Cloudflare для `grasslms.online` добавить A-запись:
  - Name: `staging`
  - Content: `204.168.165.41`
  - Proxy: **DNS only (серое облако)** — обязательно, иначе Let's Encrypt HTTP-01 не пройдёт.
- [ ] Подтвердить мерж PR #2 (или сказать что поправить).

## Этап 3 — я делаю через SSH после "go" (~20 мин)

- [ ] `git clone https://github.com/FaintKom/lmsv1.git /opt/lms-staging` на проде
- [ ] Заполнить `.env.staging` (POSTGRES_PASSWORD + JWT_SECRET — НОВЫЕ, не от прода)
- [ ] `certbot certonly --webroot -w /var/www/certbot -d staging.grasslms.online`
- [ ] Скопировать серт в `/opt/lms/nginx/ssl/staging-{cert,key}.pem`
- [ ] Хук certbot для авто-копирования при renewal
- [ ] `cd /opt/lms && git pull && docker exec lms-nginx-1 nginx -t && nginx -s reload`
- [ ] Первый `bash /opt/lms-staging/scripts/staging-deploy.sh`
- [ ] Smoke: `curl -sI https://staging.grasslms.online | head -5`
- [ ] Логин под staging super-admin, создать тестовый курс
- [ ] Если всё ОК — **удалить этот файл** (`git rm tasks/active.md`) или заменить на следующую активную задачу

## Когда задача закроется

Удалить `tasks/active.md` — hook автоматически замолчит. Шаблон для следующей
активной задачи (любой) — просто положить новый `tasks/active.md` в репо.

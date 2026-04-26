# Активные задачи

Только то, что реально в работе или ждёт действий пользователя.
История завершённых спринтов — `tasks/archive/`.

---

## В работе

_(пусто)_

---

## Ждёт действий пользователя

- [ ] **P1-15.** Записать 5-минутное demo-видео (SAT-курс end-to-end:
      студент → учитель/gradebook). Loom или OBS. Опубликовать на лендинге
      и YouTube. Скрипт см. в `marketing/launch-posts.md`.
- [ ] **P1-19.** Найти первого beta-клиента: 20-30 владельцам небольших
      SAT prep-центров — DM в LinkedIn, оффер 3 месяца бесплатно
      за testimonial + cohort observation. Целевой сегмент описан в
      `marketing/target-segment.md`.

## Опциональные конфиги (когда понадобится монетизация)

- [ ] Включить Sentry: `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` на проде,
      ребилд контейнеров.
- [ ] Включить Stripe: `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`.
- [ ] Включить email: `EMAIL_ENABLED=true` + `SMTP_*` переменные.
- [ ] Перенести бэкапы Postgres off-server (S3/R2). Сейчас локально
      в `/opt/lms/backups/` с 7-дневной ретеншн.

---

## Идеи на потом

### Staging — вариант B (отдельная VPS)

Сейчас staging живёт на той же CX22, что и прод (вариант A,
см. `docs/STAGING.md`). Когда переезжать на отдельную VPS:

- ≥1 платящий клиент (production isolation становится критичной)
- Staging упёрся в OOM хотя бы раз
- Нужно тестировать infra-изменения (Postgres major upgrade, OS upgrade,
  Cloudflare-конфиг) без риска для прода
- В команде >1 человека и они одновременно деплоят на staging

План миграции (из `docs/STAGING.md`, секция "Variant B"):
1. Поднять вторую Hetzner CX22 (~€4/мес), отдельный IP
2. Перенаправить `staging.grasslms.online` A-record на новый IP
3. Перенести `/opt/lms-staging/` на новый сервер
4. Поправить `docker-compose.staging.yml`: убрать `external: true` из
   network, добавить свой `internal` network, добавить nginx +
   cloudflared service по аналогии с прод-стеком
5. Новый SSL-серт через certbot
6. Обновить корневой `CLAUDE.md` с новым host'ом

Эстимейт: 2-3 часа, без изменений в коде.

### Прочие идеи

_(добавляй сюда фичи/улучшения, до которых пока не дошли руки)_

---

## Архив

- [`tasks/archive/sellability-2026-04.md`](archive/sellability-2026-04.md) —
  P0/P1/P2 sellability sprint, выполнено 2026-04-09 / 2026-04-10. Включает
  security hardening, инфраструктуру (CI, Redis, S3-абстракция), UX
  (video progress, bulk-enroll, XLSX export, onboarding tour), GTM
  (pricing, demo, sales one-pager).

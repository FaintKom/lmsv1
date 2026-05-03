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

- [ ] **DS-finish.** Подсказать дизайнеру — список ⚠️-страниц / компонентов
      см. в `docs/design/AUDIT.md` секцию «Pending design work».
      Главное: 9 из 15 типов exercises имеют визуальные edge cases
      (Quiz container, Translation hero, Sentence Builder бар,
      Dialogue layout) — нужны дизайн-проходы.
- [ ] **FrameBox lesson type.** В рабочей папке Minecraft (нужно найти —
      на F:\ нет директории `Minecraft`, проверить другие диски / OneDrive)
      есть готовая фича FrameBox. Перенести как новый `ContentType`
      и/или `ExerciseType`. Шаги: (1) найти исходники, (2) описать
      контракт (что хранится в config), (3) зарегистрировать тип в
      backend `app/exercises/models.ExerciseType`, (4) добавить
      `FrameBoxConfig` в `schemas.py` + entry в `CONFIG_SCHEMAS`,
      (5) сделать React-компонент-рендер в `frontend/src/components/`,
      (6) тулзу `create_framebox(...)` в `mcp-grasslms/server.py`.
- [ ] **MCP security model.** Сейчас MCP server использует один JWT из
      env (`LMS_TOKEN`). Backend enforce-ит роли (`require_role`,
      `_check_permission`) — учитель видит/правит только свои курсы,
      super_admin — всё. Это уже secure by design. Паттерн использования:
      одна .env-конфигурация Claude Desktop на одного пользователя
      (учитель / админ / super_admin), их JWT никогда не пересекаются.
      Если в будущем нужен multi-user MCP бот — добавить login-tool +
      token rotation в server.py.

_(добавляй сюда фичи/улучшения, до которых пока не дошли руки)_

---

## Архив

- [`tasks/archive/sellability-2026-04.md`](archive/sellability-2026-04.md) —
  P0/P1/P2 sellability sprint, выполнено 2026-04-09 / 2026-04-10. Включает
  security hardening, инфраструктуру (CI, Redis, S3-абстракция), UX
  (video progress, bulk-enroll, XLSX export, onboarding tour), GTM
  (pricing, demo, sales one-pager).

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

## Уборка после инцидента 2026-05-04 (некритично, не блокирует работу)

- [ ] Удалить остатки worktree-директории `F:/lms/.claude/worktrees/focused-tereshkova-b85ccf/`.
      git её уже не видит (`git worktree list` чистый), но Windows-процесс
      держит файлы. Закрой редактор/Explorer на этой папке и выполни
      `rm -rf F:/lms/.claude/worktrees/focused-tereshkova-b85ccf`. Освободит ~15 MB.
- [ ] Удалить 5 stale веток на origin (мусор в GitHub UI):
      `chore/session-start-hook`, `claude/focused-tereshkova-b85ccf`,
      `claude/goofy-bouman-3add21`, `docs/claude-md-suite`, `infra/staging-on-same-vps`,
      плюс `claude/confident-chatterjee-e2138c` (уже смерджена через PR #6).
      Через GitHub UI → Branches → trash icon, или `git push origin --delete <name>`.
- [ ] Через 1-2 недели удалить kill-switch SW: `frontend/public/sw.js` +
      убедиться что `frontend/src/app/layout.tsx` не регистрирует SW
      (registration уже выпилена в `9f3f42c`). После того как все активные
      браузеры один раз навигировались и kill-switch unregister'нул старый SW.
- [ ] Восстановить или дропнуть stash из main worktree:
      `git -C F:/lms stash list` → `stash@{0}` (48 файлов прошлой сессии).
      `git stash show -p stash@{0}` чтобы посмотреть. Если ценно — apply,
      если нет — `git stash drop stash@{0}`.
- [ ] Решить судьбу staging-фич, дропнутых в Variant B (5 новых exercise
      типов: srs_flashcard, crossword, word_search, map_pin_drop, bubble_sheet).
      Код жив на ветке `origin/claude/focused-tereshkova-b85ccf`, миграция
      `n1o2p3q4r5s6_add_5_exercise_types`. Backup staging DB:
      `/opt/lms-staging/backups/pre-rollback-2026-05-04.sql.gz`. Если фича
      нужна — открыть PR с этой веткой в main; если нет — branch удалить.

## Опциональные конфиги (когда понадобится монетизация)

- [ ] Включить Sentry: `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` на проде,
      ребилд контейнеров.
- [ ] Включить Stripe: `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`.
- [ ] Включить email: `EMAIL_ENABLED=true` + `SMTP_*` переменные.
- [ ] Перенести бэкапы Postgres off-server (S3/R2). Сейчас локально
      в `/opt/lms/backups/` с 7-дневной ретеншн.

---

## Идеи на потом

_(добавляй сюда фичи/улучшения, до которых пока не дошли руки)_

---

## Архив

- [`tasks/archive/sellability-2026-04.md`](archive/sellability-2026-04.md) —
  P0/P1/P2 sellability sprint, выполнено 2026-04-09 / 2026-04-10. Включает
  security hardening, инфраструктуру (CI, Redis, S3-абстракция), UX
  (video progress, bulk-enroll, XLSX export, onboarding tour), GTM
  (pricing, demo, sales one-pager).

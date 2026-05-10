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
- [ ] Разобрать локальную ветку `wip/recovered-stash-2026-05-04` —
      48 файлов prior-session work из бывшего `stash@{0}`. Содержит
      реальные billing/config/main.py изменения + brand-cleanup hunks
      (последние стейл — уже в PR #4). Cherry-pick valuable hunks или
      `git branch -D wip/recovered-stash-2026-05-04` если не нужно.
      Push на origin сейчас отклонён OAuth-scope'ом на `.github/workflows/ci.yml`
      — нужен токен с `workflow` scope, либо amend commit без ci.yml.
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

## Протестировать фичи (UI walkthrough)

- [ ] **Сертификаты** — автогенерация при завершении курса, номер, скачивание, верификация
- [ ] **Домашки/задания** — CRUD, сдача, оценки, файлы, дедлайны, статусы
- [ ] **Прогресс/аналитика** — дашборд, детальная аналитика, CSV экспорт, XP/лиги
- [ ] **Запись на курсы** — самозапись, массовая, групповая, learning paths
- [ ] **Библиотека материалов** — Knowledge base + RAG + pgvector поиск
- [ ] **Мультиязычность** — UK, RU, EN + ещё 3 языка
- [ ] **Календарь/расписание** — Events, повторения, iCal, auto-дедлайны

## Идеи на потом

- [ ] **Экспорт курсов и заданий** — экспорт в PDF, JSON или HTML/CSS/JS,
      чтобы учитель мог сохранить свою работу локально (backup / портативность)
- [ ] **Математика: пошаговое решение с feedback** — задачи с поэтапным вводом
      решения, проверка каждого шага, подсказки при ошибках (как в Dogl)
- [ ] **Интеграция с TinkerCAD** — встраивание 3D-моделирования / электроники
      в уроки через iframe/API TinkerCAD
- [ ] **Аналог Wolfram Alpha для проверки решений** — интеграция с Wolfram Alpha
      API или собственный math solver для автоматической проверки математических
      выражений, уравнений, графиков
- [ ] **Поддержка продвинутой математики** — убедиться, что платформа корректно
      поддерживает создание и решение: квадратные уравнения с заменой переменных,
      дробно-рациональные уравнения, стереометрия (призмы, пирамиды, двугранные
      углы), графики функций и системы линейных уравнений, разложение на множители,
      задачи с физическим смыслом (сопротивление проводников → квадратные уравнения),
      олимпиадные задачи

---

## Архив

- [`tasks/archive/sellability-2026-04.md`](archive/sellability-2026-04.md) —
  P0/P1/P2 sellability sprint, выполнено 2026-04-09 / 2026-04-10. Включает
  security hardening, инфраструктуру (CI, Redis, S3-абстракция), UX
  (video progress, bulk-enroll, XLSX export, onboarding tour), GTM
  (pricing, demo, sales one-pager).

# Активные задачи

Только то, что реально в работе или ждёт действий пользователя.
История завершённых спринтов — `tasks/archive/`.

---

## В работе — Massive Feature Push (2026-05-13, ветка `claude/recursing-booth-ac4fdb`)

Задачи в порядке приоритета. Коммиты в текущую ветку, в конце — PR в `main` → авто-deploy через GitHub Actions.

**Решения (зафиксированы пользователем 2026-05-13):**
- SCORM/xAPI: новый exercise type `scorm_package`, `scorm-again` (MIT), внутренний LRS (таблица `xapi_statements`).
- Wolfram → SymPy backend (бесплатно).
- Математический редактор: **mathlive** (~200kb, полный equation editor).
- Step-by-step: гибрид, флаг `validate_steps` в config упражнения.
- TinkerCAD: **скип** (нет публичного embed API).
- Course export: PDF через Playwright (визуально точный) + JSON re-import (schema v1).
- PDF варианты: `?variant=student|teacher` query-param.
- Advanced math: исследовать после остального, решения принимать автономно.

**Итеративные цели:**

- [x] **F1.** Унификация exercise menu — commit `2831e8d`. Новые типы `scorm_package` + `math_stepwise` в backend enum + frontend ExerciseType + content-library + course editor. Migration `n2p3q4r5s6t7`. Все 19 типов теперь читаются из единого `EXERCISE_TYPES_META` в `frontend/src/lib/api/exercises.ts`.
- [x] **F2.** SCORM/xAPI — commits `a48e945` (backend), `226cb2b` (frontend). Module `app/scorm_import/` (upload .zip / extract / serve / per-package + generic xAPI inbox), internal LRS table `xapi_statements`. Migration `o3p4q5r6s7t8`. Frontend: `SCORMConfigEditor` + `SCORMPackageRenderer` (iframe + scorm-again CMI bridge). `scorm-again@^3.0.4` added to package.json — **run `npm install --legacy-peer-deps` after pull to activate CMI tracking**.
- [x] **F3.** SymPy `app/math_validation/` — commit `96aee11`. Endpoints `/validate-step`, `/check-answer`, `/solve`, `/factor`, `/simplify`, `/steps`. SymPy added to backend `pyproject.toml`. Handles `^` / implicit multiplication / multi-root answer sets.
- [x] **F4.** `math_stepwise` — commit `a5558b7`. Teacher editor (problem / variable / max-steps / final-answer / `validate_steps` toggle / auto-generate via SymPy). Student renderer (mathlive `<math-field>` per step, per-step equivalence-checked, final-answer SymPy-checked). `mathlive@^0.105.2` in package.json — **run `npm install --legacy-peer-deps` to enable the equation editor; falls back to plain text input otherwise**.
- [x] **F5.** Course export `app/export/` — commit `c207835`. GET `/api/v1/courses/{id}/export?format=json|pdf&variant=student|teacher`, POST `/api/v1/courses/import`. JSON schema `grasslms-course-v1`. PDF via Playwright + Chromium; if playwright not installed the endpoint returns 503 with install instructions. **Frontend export/import buttons are not wired yet** — admins can hit the URL directly. Backlog item below.
- [x] **F6.** Advanced math research — see [`docs/RESEARCH_advanced_math.md`](../docs/RESEARCH_advanced_math.md). Decision: F1-F5 already covers 5 of the 7 listed topics through `math_stepwise` + SymPy. Function plotting (TipTap `<MathPlot>` node) and stereometry editor (`world_3d` extension) and `math_system` (linear systems) are deferred to follow-up sprints with separate todo entries below.
- [ ] **F7.** UI walkthrough (7 features) — **deferred this session**. Plan: see "Backlog from this push" below.
- [ ] **F8.** Open PR to `main` (manual step after review).

### Backlog from this push

- [ ] **Wire frontend export/import buttons** for course-edit page (button bar: Export PDF · Export JSON · Import JSON). Backend ready, just needs UI in `(admin)/admin/courses/[courseId]/edit/page.tsx`.
- [ ] **Add `npm install --legacy-peer-deps`** as a Dockerfile-frontend step (already there, just confirming) and verify Sentry/React-19 peer-dep still resolves with the two new deps.
- [ ] **Install Playwright + chromium in backend Docker image** to enable PDF export. Currently the endpoint returns 503 because the dep isn't in `pyproject.toml` (Playwright is heavyweight; not added in this push).
- [ ] **Frontend `/courses/{id}/print` page** for Playwright to render. Should iterate modules → lessons → exercises with print-friendly CSS, honour `?variant=student|teacher`.
- [ ] **Wire `math_stepwise` xAPI emit** — on submission, POST a Statement to `/api/v1/scorm-import/xapi/statements` so the LRS captures completion analytics from native exercises too. Currently only SCORM packages emit.
- [ ] **F7 UI walkthrough** — certificates / ДЗ / прогресс / enrollment / knowledge / i18n / calendar. Use Playwright or Claude Preview against staging.grasslms.online with the test accounts. Capture screenshots + file bugs as discovered.
- [ ] **Math follow-ups** (from `docs/RESEARCH_advanced_math.md`):
  - [ ] `math_system` exercise type (linear systems + Plotly visual)
  - [ ] `<MathPlot>` TipTap inline block for graphs
  - [ ] Stereometry editor on top of `world_3d`

---

## Ждёт действий пользователя

- [ ] **P1-15.** Записать 5-минутное demo-видео (SAT-курс end-to-end:
      студент → учитель/gradebook). Loom или OBS. Опубликовать на лендинге
      и YouTube. Скрипт см. в `marketing/launch-posts.md`.
- [ ] **P1-19.** Найти первого beta-клиента: 20-30 владельцам небольших
      SAT prep-центров — DM в LinkedIn, оффер 3 месяца бесплатно
      за testimonial + cohort observation. Целевой сегмент описан в
      `marketing/target-segment.md`.
- [ ] **P1-20.** Outreach к Teachers for Ukrainian Kids (УУ) — волонтёрский
      проект для украинских детей, ~30+ учителей, курсы по математике,
      английскому, творчеству, физике, истории. Контакт: Tali Green
      (@green_mammy в Telegram), руководитель проекта. Сооснователь —
      Mikhail Khotyakov (aimathic, Lyzeum 2). Сейчас используют EduRouter
      (админка, £50/мес), Google Classroom (начинают), aimathic (ДЗ по
      математике), Google Meet, Luma, Telegram. Боли: фрагментация
      инструментов, нет единой системы упражнений/ДЗ/прогресса для всех
      предметов кроме математики, сертификаты вручную, материалы разбросаны.
      GrassLMS закрывает всё + бесплатно + UI на украинском/русском/английском.
      Предложить: бесплатный доступ, помощь с миграцией, demo.

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
- [ ] **SCORM / xAPI поддержка** — импорт SCORM 1.2 / 2004 пакетов и xAPI
      (Tin Can) активностей. Импорт из Articulate Storyline/Rise, iSpring,
      Adobe Captivate и аналогичных authoring tools. Плеер SCORM-пакетов
      внутри платформы, трекинг прогресса/оценок через xAPI statements,
      LRS (Learning Record Store) — встроенный или интеграция с внешним.
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

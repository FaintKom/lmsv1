# Активные задачи

Только то, что реально в работе или ждёт действий пользователя.
История завершённых спринтов — `tasks/archive/`.

---

## Live Lesson Mode (2026-07-23)

Спека: `docs/superpowers/specs/2026-07-23-live-lesson-mode-design.md`.
Планы: `docs/superpowers/plans/2026-07-23-live-lesson-{backend,frontend}.md`,
`docs/superpowers/plans/2026-07-24-live-player-full-types.md`.

- [x] Plan 1: backend (SSE + Redis pub/sub, доски, сигналы, опросы, черновики,
      журнал) — **задеплоен в прод 2026-07-24** (PR #179).
- [x] Plan 2: frontend (экран препода layout A, экран ученика, проектор,
      ревью) — в том же PR #179. Смоук-фиксы: SSE no-transform (gzip-прокси
      буферизовал стрим); dev BACKEND_URL смотрел в прод.
- [x] Plan 3: все 24 типа в live-плеере через ExerciseRenderer + upload-хук +
      черновики code/web — ветка `feat/live-player-full-types` (2026-07-24).
- [ ] Backlog: integrity model B для не-V2 типов (ответы в config у клиента —
      инвентаризация в Plan 3 Task 3); refresh токена для пассивного проектора
      (SSE 401-луп после 30 мин); invite ученикам, добавленным в группу
      после старта урока.

---

## Feedback-grammar integration: design handoff → v2 exercises (2026-06-10)

Source: `GrassLMS Design System.zip` → `%TEMP%\grasslms-design-system\design_handoff_grasslms\feedback\`.
Handoff = reference JSX + feedback.css for the feedback grammar:
invite → grab → guide → result → reward. Fixed: --mamp:1 --mdur:1,
link = green-500 w3, errors = coral, deferred check for pairs/categories, confetti on.

- [x] 1. globals.css: motion tokens, upgraded .gp-tile states, fb-* classes
      + keyframes, sheet slide-up, th-* annotation/term CSS.
- [x] 2. lesson-shell.tsx: sheet animation, instant/instantLabel props;
      fb-motion.ts (flyClone/flyXP).
- [x] 3. translations.ts: 33 new keys × 6 locales (en/es/ru/tr/de/uk) +
      fixed EN exercise.dialogue.goodReply ("Buena respuesta." leak).
- [x] 4. 13 v2 components upgraded: matching (drag-thread + deferred),
      fill-blanks (flyClone), ordering (FLIP pointer-drag), categorize
      (buckets + deferred), quiz, numeric-input, number-line, coordinate-plane,
      equation-balance, math-stepwise, sentence-builder, dialogue (typing dots),
      srs-flashcard (3D flip). Contracts preserved.
- [x] 5. NEW: theory annotations — student highlights/underlines persist
      (lesson_highlights table, /progress/lessons/{id}/highlights API,
      HighlightableContent wrapper with offset+snippet anchoring, block_key
      per text block) + hover term hints (TipTap Term mark → span[data-term],
      pure-CSS tooltip via ::after so offsets stay stable).
- [x] 6. Verified: next build green, vitest 78/78, backend pytest
      test_progress 8/8 (incl. 2 new highlight tests), live preview E2E
      (matching deferred flow, categorize drag, flashcard flip, highlight
      create→persist-after-reload→delete, term tooltip content).
- [x] 7. Committed (a82e635 + migration-guard fix 0521717) and deployed
      2026-06-11. First deploy failed: lifespan create_all made the table
      before alembic ran (lesson in tasks/lessons.md); has_table() guard
      fixed it. Prod verified: frontend 200, API up, highlights endpoint
      live (401 unauth, not 404).

Out of scope (follow-up): full theory.jsx reading UX (progress bar, section
rail, spoiler — repo theory-viewer is iframe-based; text lessons got the
annotation layer only), flyXP wiring (no #xp-anchor in lesson chrome yet —
util shipped dormant).

---

## Avatar chibi restyle + bed default nudge (2026-05-31)

Branch: `feat/avatar-chibi-restyle`

Owner decisions: art = **chibi cute** (big head ~44% height, stubby rounded body,
big eyes; ref Crossy Road / Animal Crossing). Run = **fully autonomous**, all ~45
items, ≤3 iterations each, no check-ins.

- [x] Bed default coords +0+1 (placement.ts: bed z 0→1)
- [x] Chibi anchor spec `A` in avatar/voxels.ts (source of truth)
- [x] Boy + girl base bodies (chibi: head ~43% of 6.5-tall figure, stubby body)
- [x] Face variants (big cute eyes; all 6 verified front view)
- [x] Fitting-room harness `/avatar-fitting` (public dev route, 1 GL context, contact sheet, dev-guarded)
- [x] Refit hair (6) / hats (6) / glasses (5) / outfits (6) / back (5) / hand (6) / accessory (5) — all screenshot-verified
- [x] detect-overlaps clean + tsc + lint + vitest (voxels, i18n) all green
- [ ] Commit + PR (awaiting owner go — global rule: commit/push only when asked)

### Review
- Chibi rewrite of `frontend/src/lib/avatar/voxels.ts` against a shared `A` anchor
  spec. All 12 builder exports + signatures preserved (room scene, avatar canvas,
  detect-overlaps, export-vox, vitest unchanged).
- Iterations: hand-held items hidden behind the arm (z+) → moved in front of the
  hand / outboard (book, sword, flower, controller); balloon raised to float above
  the head. acc-book likewise. 2–3 passes per problem item.
- Bodies kept gender-neutral (girl slightly narrower); gender read via hair/outfit
  — standard voxel-avatar approach. Can add a distinct girl default if owner wants.
- Room furniture untouched (per owner: avatars + clothing/accessories only). Bed
  change is the +0+1 default-coordinate nudge only.
- Dev harness at /avatar-fitting kept for future passes; 404s/no-ops in production,
  allowlisted for the i18n ratchet. Remove before public-repo flip if undesired.

---

## Research / Design — Universal Education Platform (2026-05-23)

Перевод lms из mono-app в multi-service universal education platform (любой K12/university предмет со стандартным skill-set). Текущий статус: **только дизайн-доки, кода ещё нет**.

См. [`tasks/research/2026-05-23-universal-platform-architecture/00-INDEX.md`](research/2026-05-23-universal-platform-architecture/00-INDEX.md) — 6 файлов: audit текущей архитектуры, спецификации серверa, разбор external lesson generator + external curriculum service, предложенная 4-сервисная архитектура (SAS/KGS/LGS/LMS), шаблонная подсистема для plans/tasks/decks.

Решения, зафиксированные на этом этапе:
- Cloud LLM only (текущий Hetzner CX22 не тянет полезный local LLM)
- Template-first generation (~8× экономия cloud LLM vs zero-shot)
- 4 сервиса: SAS (sortation block) + KGS (knowledge graph + BKT) + LGS (lesson generator) + LMS (UI/ops)
- External curriculum service production-grade — берём BKT, EM-калибровку, LessonFixture как есть, math-specific бьём в plugin
- Pluggable mastery model (BKT/FSRS/Rubric/DKT/IRT) — strategy registry, не if/else
- Subject = YAML manifest + plugin = 2-4 недели на новый предмет

Открытые вопросы (next session):
- Fork external curriculum service в lms-monorepo или отдельный package?
- Methodist UI: extend lms `(admin)` или Vite+React SAS standalone?
- Миграция lms `app/skills/` / `app/learning_paths/` / `app/exercises/` в KGS-owned модели без поломки текущих юзеров
- Subject manifest schema — нужен отдельный design pass
- Plugin packaging mechanism — installable Python package или directory + manifest

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
- [x] ~~Wire frontend export/import buttons~~ — **commit `622a885`**. Three buttons in course-edit toolbar (Export JSON, Export PDF, Import JSON) using apiClient + Blob download + hidden `<input type="file">`. PDF button surfaces a clear toast when backend returns 503 (Playwright not yet installed).
- [x] ~~Wire `math_stepwise` xAPI emit~~ — **commit `ca8351d`**. Fire-and-forget POST to `/scorm-import/xapi/statements` after every submission with verb `answered`, success/score/response/steps. Failures swallowed.
- [x] ~~Frontend `/courses/{id}/print` page~~ — **commit `dbeef09`**. New route group `app/(print)/` with minimal no-sidebar layout. Page fetches `/courses/{id}/export?format=json&variant=...` via apiClient and renders modules→lessons→exercises top-to-bottom. Teacher variant shows quiz ✓ marks, correct_answer, hidden test-case outputs, math_stepwise expected_steps, code_challenge solution_code. CSS `@media print` rules + A4 page size + `.no-print` button class. Today: teacher can open URL + Cmd+P. After the backend gets chromium, Playwright will navigate to this same URL.
- [ ] **Install Playwright + chromium in backend Docker image** to enable Playwright-driven PDF export. Steps: add `playwright>=1.49` to `backend/pyproject.toml`; in `backend/Dockerfile` after `pip install -e .` add `RUN playwright install --with-deps chromium`. Image size grows ~600 MB.
- [ ] **Auth for Playwright-driven PDF export.** The print page currently relies on the apiClient's JWT-from-localStorage. Playwright (running in the backend container) has no localStorage. Plan: backend mints a single-use HMAC-signed `?token=...` query param scoped to one course+variant+expiry; print page recognises it and short-circuits localStorage; backend Playwright invocation passes the token through to `page.goto(...)`.
- [ ] **F7 UI walkthrough** — certificates / ДЗ / прогресс / enrollment / knowledge / i18n / calendar. Use Playwright or Claude Preview against staging.grasslms.online with the test accounts. Capture screenshots + file bugs as discovered. Requires owner-supplied test-account credentials in the harness.
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
- [ ] **P1-20.** Отправить Tali Green (@green_mammy, Teachers for Ukrainian Kids,
      ~30 учителей) ссылку на demo: https://grasslms.online/demo + краткое
      сопроводительное письмо. Demo-стек готов (2026-05-25):
      `scripts/seed_demo_org.py` создаёт "GrassLMS Demo" org с 3 курсами
      (Math 5 / English B1 / CS Web Basics), реальным прогрессом, ДЗ, XP,
      сертификатом. Запуск в проде по runbook
      [`docs/DEPLOY_DEMO.md`](../docs/DEPLOY_DEMO.md): pull → flip
      `DEMO_MODE_ENABLED=true` в `/opt/lms/.env` → rebuild backend →
      `docker compose exec backend python scripts/seed_demo_org.py`.
      Контекст контакта: сооснователь — Mikhail Khotyakov (external math tutor, Lyzeum 2).
      Текущий стек: EduRouter (£50/мес), Google Classroom, external math tutor (math
      homework), Google Meet, Luma, Telegram. Боли: фрагментация инструментов,
      нет единой системы упражнений/ДЗ/прогресса по non-math предметам,
      сертификаты вручную. Оффер: бесплатный доступ, помощь с миграцией.

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
- [ ] **Система обратной связи по урокам и контенту** — две связанные сущности:
      (1) lesson-level feedback в конце урока (быстрый rating 1–5 + опциональный
      комментарий: «было понятно / темп ОК / нужно ещё примеров»);
      (2) content-unit feedback на каждый блок (задание / текст / видео):
      кнопка «🚩 проблема с этим блоком», категория (опечатка / непонятно /
      ошибка в проверке / битая ссылка), свободный текст. Анонимно для студента,
      но привязано к user_id для админов.
      - Backend: новая таблица `content_feedback` (lesson_id или content_block_id,
        kind enum, rating int|null, comment text, user_id, created_at, status).
        Эндпоинт POST `/feedback`, list для админов `/admin/feedback?status=open`.
      - Frontend: feedback widget внизу lesson page (rating + комментарий) +
        небольшой 🚩 на каждом content block / exercise card. Modal с формой.
      - Админка: /admin/feedback страница, фильтры по курсу/типу/статусу,
        кнопки resolved/wontfix, ссылка прямо в lesson editor на проблемный блок.
      - Гамификация: +5 XP студенту за полезный отзыв (после ручной модерации).

---

## Live-урок: дашборд преподавателя + AI-сигналы (2026-06-11)

Источник: дизайн-макет «AI Math / Урок (live)» — фазы урока
(Разминка/Объяснение/Практика/Рефлексия), сетка ученик × задание в реальном
времени, KPI (в темпе / опередили / застряли / misconception), панель
«AI-сигналы» с подсказками преподавателю.

**Разведка 2026-06-11 (что есть сейчас):**
- Live-прогресс по заданиям во время урока — **НЕ существует**. Realtime-слоя
  нет вообще (ни WebSocket, ни SSE, ни polling — всё request/response). Есть
  только POST-HOC: `/journal/student-activity` (срез за день по ученику,
  [journal/service.py:548](backend/app/journal/service.py:548)) и `/journal/day`
  (агрегаты по классу) — гранулярность «урок/упражнение», НЕ сетка
  ученик×задание в реальном времени.
- AI-сигналы преподавателю — **НЕ существует**. Модуль `ai/` удалён;
  `recommendations/` ([recommendations/service.py](backend/app/recommendations/service.py))
  — rule-based и **только для студентов**. Нет detection «застрял / опередил /
  misconception», нет генерации подсказок преподавателю.

- [ ] **Live-дашборд урока (per-task grid в реальном времени)** — преподаватель
      видит сетку ученик × задание текущей фазы: статус каждой ячейки (решено
      с 1-й / решено с попыток / ошибается / решает сейчас / не дошёл), live-KPI
      (в темпе / опередили / застряли / misconception). Требует realtime-слоя:
      решить SSE vs WebSocket vs short-poll (на 30 планшетов класса polling 3–5с
      может хватить и проще). Backend: эндпоинт live-состояния урока (агрегирует
      ExerciseSubmission/попытки по сессии журнала), фаза урока (модель сессии).
      Frontend: новый экран «Урок (live)» в journal, сетка + KPI + трекер фаз.
      Зависит от модели session/group журнала (уже есть).
- [ ] **Режим «дирижёр»: ведение урока по блокам с бесшовным переключением** —
      урок = упорядоченная последовательность блоков/фаз (разминка → объяснение →
      практика → рефлексия, и блоки контента/задания внутри). Учитель ведёт урок
      шаг за шагом: «дальше / назад / перейти к блоку N» одним движением, без
      перезагрузок и потери состояния. Текущий активный блок подсвечен (как
      трекер фаз в макете), переходы плавные (предзагрузка следующего блока,
      без мигания). Активный блок пушится на планшеты учеников и проектор
      (синк) — что ведёт учитель, то у всех на экране. Backend: «активный блок»
      в модели сессии урока (+ отдаётся через realtime-слой live-дашборда).
      Frontend: панель-конструктор урока (лента блоков), хоткеи (→/←/пробел как
      в reveal.js), стыкуется с reveal-плеером презентаций (Фаза 1 ниже) и
      live-сеткой. Решить: блоки = фазы журнала + контент-блоки урока, или
      отдельная «runtime-программа урока» поверх существующих lesson content.
- [ ] **AI-сигналы преподавателю (real-time hints)** — поверх live-состояния
      генерировать действия: «N застряли на обратной операции → собрать на
      5-мин разбор», «X закончил трек за 6 мин → выдать челлендж», детект
      misconception по паттерну ошибок. Кнопки «Собрать группу» / «Выдать».
      Сначала rule-based (пороги по попыткам/времени), потом LLM-слой
      (Claude) для формулировки и детекта misconception. ⚠️ AI = платный API,
      нужен бюджет/ключ — согласовать перед включением.
- [ ] **Управление классом во время урока** (из макета, ниже приоритет):
      синхронизация с проектором, блокировка планшетов, мультиязычные ярлыки
      ученика (RU/AZ/HM в макете). Вынести в отдельный спринт.

---

## Огромная задача: генерация презентаций (reveal.js + AI) (2026-06-11)

Референс: `F:\repos-review\reveal.js\tour-lxd.html` — ручной reveal.js-деck
(169 строк) с образовательным контекстом: фазы урока как вложенные слайды,
fragments (пошаговый показ), auto-animate (морфинг между фазами), speaker
notes (окно докладчика + таймер), gradient-фоны. «Обновить под мою штуку» =
адаптировать этот сетап под модель урока GrassLMS.

**Разведка 2026-06-11:** презентаций/слайдов в платформе **НЕТ**. `ContentType`
([courses/models.py:17](backend/app/courses/models.py:17)) — 8 типов
(text/video/quiz/code_challenge/file_upload/interactive/robot_2d/
math_interactive/world_3d/theory), нет `slide`/`presentation`. content-renderer
рендерит markdown/HTML/TipTap, reveal.js в `package.json` отсутствует.
Фича может «навеситься» на существующую модель урока через новый ContentType +
ветку в content-renderer.

- [ ] **Фаза 1 — модель + плеер.** Новый `ContentType.presentation`; структура
      `Lesson.content` для деки (список слайдов: заголовок/текст/медиа/fragments/
      speaker notes/фон). Ветка в content-renderer: reveal.js-плеер (vendored
      `dist/` из клона, не CDN — наши PWA/offline и no-store правила). Режимы:
      студент (просмотр), преподаватель (speaker view + проектор-синк → стыкуется
      с live-дашбордом выше).
- [ ] **Фаза 2 — редактор деки.** Авторинг слайдов в админке (как lesson editor):
      добавить/упорядочить слайды (dnd-kit уже есть), на слайд — текст (TipTap),
      изображение (S3-аплоад уже есть), fragments, заметки, выбор перехода/фона.
      Маппинг в reveal.js-разметку при рендере.
- [ ] **Фаза 3 — генерация через ИИ.** По теме урока / существующему theory-
      контенту LLM (Claude) генерит черновик деки (слайды + speaker notes +
      предложения fragments) → преподаватель правит в редакторе. Переиспользовать
      knowledge-модуль (RAG) как источник фактов. ⚠️ платный API — бюджет/ключ
      согласовать.
- [ ] **Фаза 4 — экспорт/доп.фичи.** PDF/standalone-HTML экспорт деки, тема
      под бренд GrassLMS (sun-tinted, ink-900-on-yellow правило), вставка
      интерактивных виджетов/упражнений прямо в слайд (iframe-sandbox как у
      content-renderer).

Заметка: reveal.js — MIT, можно vendored. Большая многоспринтовая задача —
разбить на отдельные PR по фазам; Фаза 1 (модель+плеер) разблокирует остальное.

---

## Архив

- [`tasks/archive/sellability-2026-04.md`](archive/sellability-2026-04.md) —
  P0/P1/P2 sellability sprint, выполнено 2026-04-09 / 2026-04-10. Включает
  security hardening, инфраструктуру (CI, Redis, S3-абстракция), UX
  (video progress, bulk-enroll, XLSX export, onboarding tour), GTM
  (pricing, demo, sales one-pager).

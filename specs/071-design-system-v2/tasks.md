# Tasks: дизайн-система v2 «Цветные поля»

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/tokens.md](contracts/tokens.md),
[contracts/motion.md](contracts/motion.md), [quickstart.md](quickstart.md)

**Tests**: требуются спекой (FR-011, FR-012, FR-018) и конституцией (принцип II).
Каждый тест сначала показывается падающим, это записывается в тело PR.

**PR**: границы PR совпадают с фазами 3–8. Мёрж по одному, после деплоя
предыдущего.

**Строки**: каждая новая или изменённая видимая строка в задачах T035–T055
добавляется во все шесть локалей (`en`, `es`, `ru`, `tr`, `de`, `uk`) в том же
коммите, иначе `translations.test.ts` уронит CI. Английские тексты проходят
скиллы письма до вставки.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: можно параллельно (разные файлы, нет зависимостей)
- **[Story]**: US1–US4 из spec.md

---

## Phase 1: Setup — направление и прототипы (US1, US2, сделано)

- [x] T001 [US1] Доска референсов опубликована, 12 референсов, ссылка в specs/071-design-system-v2/spec.md
- [x] T002 [US1] Выбор владельца записан в раздел Clarifications в specs/071-design-system-v2/spec.md
- [x] T003 [US2] Прототип B и C, светлая и тёмная тема, в specs/071-design-system-v2/prototype/b-and-c.html
- [x] T004 [US2] Прототип проверен в Chrome владельца, исправлены View Transition в скрытой вкладке и потеря клика

---

## Phase 2: Foundational — общее для всех фаз

- [ ] T005 Сверить с `main` перед стартом: `git log origin/main..main` пуст, номер спеки 071 свободен на origin/main, в ветке нет чужих коммитов
- [ ] T006 [P] Снять значения `courses.category` на проде одним read-only запросом (`SELECT category, count(*) FROM courses GROUP BY 1`) и записать их в specs/071-design-system-v2/data-model.md

**Checkpoint**: база известна, можно начинать PR 1.

---

## Phase 3: US4 — нарушение ловится до мержа (Priority: P3, но идёт первым) · PR 1

**Goal**: число нарушений дизайн-системы может только уменьшаться.

**Independent Test**: PR с `className="bg-[#ff0000]"` в любом компоненте краснеет
в CI с именем файла и правилом `raw-hex`.

### Tests

- [ ] T007 [US4] Написать храповик frontend/src/lib/design/design-system.test.ts по образцу frontend/src/lib/i18n/no-hardcoded-strings.test.ts: обход `src/**/*.{tsx,ts,css}`, правила из contracts/tokens.md (`raw-hex`, `raw-palette`, `gradient`, `mono-eyebrow`, `tiny-text`, `btn-pop`, `glass`) и contracts/motion.md (`transition-all`, `ms-literal`, `bezier-literal`, `layout-anim`, `scale-zero`, `vt-nav`); блоки токенов в globals.css (`:root`, `.dark`, `@theme inline`) не считаются
- [ ] T008 [US4] Список исключений с причиной в том же тесте: графики аналитики, `src/components/room/**`, аватар, рендер контента уроков, `src/app/(print)/**`
- [ ] T009 [US4] Сгенерировать frontend/design/design-baseline.json текущими счётчиками (запись базы внутри теста по флагу `UPDATE_DESIGN_BASELINE=1`)
- [ ] T010 [US4] Позитивный контроль: вписать `bg-[#ff0000]` в frontend/src/components/ui/card.tsx и `transition-all` в frontend/src/components/ui/button.tsx, убедиться, что тест падает с понятным сообщением; откатить; записать вывод в тело PR
- [ ] T011 [US4] Проверить, что уменьшение счётчика без обновления базы тоже валит тест и подсказывает команду обновления

### Implementation

- [ ] T012 [US4] Убедиться, что фронтенд-job в .github/workflows запускает новый тест в общем прогоне Vitest; если да, CI не меняется
- [ ] T013 [US4] Раздел «Храповик» в frontend/design/README.md: что считает, как обновить базу, почему база только уменьшается

**Checkpoint**: PR 1 зелёный, визуально ничего не изменилось. Мёрж, деплой, проверка прода.

---

## Phase 4: US3 — фундамент · PR 2

**Goal**: новые шрифты, форма и токены предметов действуют на всех экранах сразу.

**Independent Test**: все 85 маршрутов открываются на 390 и 1440 в обеих темах,
журналы `e2e/journeys` зелёные, храповик зелёный с уменьшенной базой.

### Tests

- [ ] T014 [P] [US3] Юнит-тест frontend/src/lib/subject.test.ts по таблице из data-model.md плюс «неизвестная категория даёт other»; сначала красный
- [ ] T015 [P] [US3] Тест контраста frontend/src/lib/design/contrast.test.ts: все пары «текст / фон» семантических токенов в обеих темах читаются из globals.css — `--color-text*` на `--color-bg`/`--surface*`, `*-fg` на `*-soft` (чипы), `--color-primary-fg` на `--color-primary`, `--subject-ink` на `--subject-*`; текст не ниже 4.5:1, рамки и крупный текст не ниже 3:1; фон страницы `#fbfcf7`, не белый
- [ ] T016 [US3] Флаг `--shots` в frontend/e2e/mobile-audit.mjs: снимок каждого маршрута на 390 и 1440 в `test-results/shots/<route>-<width>.png`; снять набор «до» с main

### Implementation

- [ ] T017 [P] [US3] Скачать Geologica (500, 600, 700) и Onest (400–700) woff2, подмножества cyrillic, latin, latin-ext, в frontend/public/fonts/; проверить лицензию OFL
- [ ] T018 [US3] В frontend/src/app/globals.css: `@font-face` для обоих шрифтов, `--font-sans: Onest`, новый `--font-display: Geologica`, `h1–h3` на `--font-display`; `@font-face` и файлы Manrope удалить
- [ ] T019 [US3] В frontend/src/app/globals.css в `:root` и `.dark`: радиусы по contracts/tokens.md, токены `--subject-*` и `--subject-ink`, проброс в `@theme inline` (`bg-subject-lang` и остальные)
- [ ] T020 [US3] Перенести те же значения в frontend/design/tokens.json (версия 3.0.0, заметка в `meta.notes`) и пересобрать frontend/design/tokens.css
- [ ] T021 [US3] Удалить `.btn-pop*` и `--shadow-pop*` из frontend/src/app/globals.css; все 49 мест с `btn-pop` и `text-[10px]/[11px]` перевести на `Button` и `text-3xs/2xs`
- [ ] T022 [P] [US3] frontend/src/lib/subject.ts: `subjectOf(category)` по data-model.md
- [ ] T023 [US3] Переделать frontend/src/components/ui/button.tsx: круглая форма, нажатие `scale(.96)` (M3), без смещённой тени
- [ ] T024 [P] [US3] Переделать frontend/src/components/ui/card.tsx: без рамки в светлой теме, радиус 14, вариант `subject` с цветной поверхностью
- [ ] T025 [P] [US3] Переделать frontend/src/components/ui/chip.tsx, input.tsx, tooltip.tsx, skeleton.tsx под новые радиусы и шрифт
- [ ] T026 [P] [US3] frontend/src/components/ui/xp-pill.tsx и streak-pill.tsx: форма пилюли из прототипа, цвета reward-soft и danger-soft; поведение не меняется (игровые элементы остаются по решению владельца)
- [ ] T027 [US3] Полоса прогресса: найти компонент (`grep -rn 'role="progressbar"' frontend/src`), перевести с `width` на `scaleX` (M2)
- [ ] T028 [US3] Убрать маркер с жёлтой подложкой из заголовков: frontend/src/components/ui/highlight.tsx и его вызовы
- [ ] T029 [US3] Обновить frontend/design/DESIGN_SPEC.md: шрифты, радиусы, кнопка, карточка, цвет предмета, список запретов (восемь примет из spec.md)
- [ ] T030 [US3] Обновить frontend/design/MOTION.md: приёмы M2–M10 из contracts/motion.md, правило про View Transitions (research R6), убрать исключение про `width` у прогресса
- [ ] T031 [US3] Обновить frontend/design/design-baseline.json: счётчики только уменьшились
- [ ] T031a [US3] Остальные базовые компоненты из FR-008 под новые радиусы, шрифт и тени: frontend/src/components/ui/confirm-dialog.tsx, bottom-sheet.tsx, error-boundary.tsx, access-denied.tsx, toaster.tsx; найти общие таблицу и пустое состояние (`grep -rln "EmptyState\|<table" frontend/src/components`) и привести их к одному экземпляру
- [ ] T031b [US3] Каркас frontend/e2e/motion.spec.ts (хелпер «дважды: обычный режим и `reducedMotion: 'reduce'`») и тесты M2 (полоса прогресса) и M3 (нажатие кнопки), сначала красные: эти приёмы появляются в этом PR
- [ ] T032 [US3] Снять набор «после» (`node e2e/mobile-audit.mjs --shots`), приложить пары к PR, проверить на снимках 390px (FR-005 для прототипа проверить не удалось); прогнать frontend/e2e/dark-theme.spec.ts и frontend/e2e/mobile.spec.ts

**Checkpoint**: PR 2 зелёный, снимки приложены. Мёрж, деплой, проверка прода глазами.

---

## Phase 5: US3 — экраны ученика и их движение · PR 3

**Goal**: главная, каталог, урок и соседние экраны в цветных полях, с движением M2, M4, M5, M9, M10.

**Independent Test**: демо-ученик проходит главная → каталог → урок → ответ;
`e2e/motion.spec.ts` зелёный для M2–M5, M9, M10 в обоих режимах.

### Tests

- [ ] T033 [US3] Дописать в frontend/e2e/motion.spec.ts тесты M4a, M4b, M4c, M5, M9, M10 по contracts/motion.md; каждый сначала красный на текущем коде
- [ ] T034 [P] [US3] Дополнить сценарий ученика в frontend/e2e/journeys проверкой, что плитки курсов получают `data-subject` по категории

### Implementation

- [ ] T035 [US3] Главная ученика frontend/src/app/(dashboard)/dashboard/page.tsx и её компоненты: карточка «продолжить» на цвете предмета, «Due this week», полоса сводки вместо четырёх плиток, плитки курсов; появление блоками M9 только при первом открытии
- [ ] T036 [US3] Каталог frontend/src/app/(dashboard)/courses/page.tsx: обложка в цвете предмета без градиента и иконки, фильтр по предмету, подъём при наведении M5, перестроение через View Transition M10 с защитой `!document.hidden` и `skipTransition()`
- [ ] T037 [US3] Страница курса frontend/src/app/(dashboard)/courses/[courseId]/page.tsx
- [ ] T038 [US3] Урок: frontend/src/app/(dashboard)/courses/[courseId]/lessons/[lessonId]/page.tsx и frontend/src/app/(dashboard)/lesson/[lessonId]/page.tsx; оглавление слева, ширина строки 66ch
- [ ] T039 [US3] Обратная связь упражнения (компонент проверки ответа в frontend/src/components/exercises/): M4a галочка, M4b вздрагивание с подсказкой, M4c «+10 XP»; результат по-прежнему с сервера (принцип III)
- [ ] T040 [P] [US3] frontend/src/app/(dashboard)/progress, achievements, leaderboard, certificates, skills, paths, paths/[pathId]
- [ ] T041 [P] [US3] frontend/src/app/(dashboard)/assignments, assignments/[assignmentId], calendar, schedule, attendance, live, peer-review, team-projects
- [ ] T042 [P] [US3] frontend/src/app/(dashboard)/profile, support, support/thanks, parent, parent/children, parent/children/[childId], а также frontend/src/app/student-cabinet
- [ ] T043 [US3] Боковое меню и нижняя панель на телефоне (frontend/src/app/(dashboard)/layout.tsx): активный пункт на `primary-soft`, переходы без анимации
- [ ] T044 [US3] Обновить design-baseline.json, снимки «до/после» экранов ученика, прогнать проверки specs/065–067 (`node e2e/mobile-audit.mjs`)

**Checkpoint**: PR 3. Мёрж, деплой, проверка прода демо-учеником.

---

## Phase 6: US3 — преподаватель и методист · PR 4

**Goal**: конструктор, журнал, библиотека, проверка работ в новой системе, движение M6, M7, M8.

**Independent Test**: демо-преподаватель добавляет блок в урок и сохраняет;
`e2e/motion.spec.ts` зелёный для M6–M8.

- [ ] T045 [US3] Тесты M6, M7, M8 в frontend/e2e/motion.spec.ts, сначала красные
- [ ] T046 [US3] Конструктор урока frontend/src/app/(admin)/admin/lessons/[lessonId]/edit/page.tsx: меню блоков от кнопки M6, новый блок M7, тост M8 через frontend/src/components/ui/toaster.tsx
- [ ] T047 [US3] Конструктор курса frontend/src/app/(admin)/admin/courses/page.tsx и courses/[courseId]/edit
- [ ] T048 [P] [US3] frontend/src/app/(admin)/admin/journal, journal/student/[studentId], gradebook, groups, calendar, live, live/[lessonId], live/[lessonId]/screen
- [ ] T049 [P] [US3] frontend/src/app/(admin)/admin/content-library и вложенные, assignments и вложенные, review, peer-review, paths, team-projects, students/[studentId]
- [ ] T050 [US3] Обновить design-baseline.json, снимки, проверки телефона

**Checkpoint**: PR 4.

---

## Phase 7: US3 — админка, вход, публичные страницы · PR 5

- [ ] T051 [P] [US3] frontend/src/app/(admin)/admin (главная), analytics, users, org-members, organizations и вложенные, billing, bulk-enroll, crm, integrations, settings, waitlist; графики аналитики остаются в исключениях с цветами данных
- [ ] T052 [P] [US3] frontend/src/app/(auth)/*: login, register, forgot-password, reset-password, verify-email, parental-consent
- [ ] T053 [US3] Лендинг frontend/src/app/page.tsx, frontend/src/app/demo, frontend/src/app/pricing: убрать свечение, пилюлю над заголовком, карточки «иконка в квадрате»; тексты проходят скиллы письма, цифры только проверенные (принцип IV)
- [ ] T054 [P] [US3] Юридические страницы terms, privacy, cookies, refund, copyright, acceptable-use, contact и frontend/src/app/s/[slug]/enquire
- [ ] T055 [P] [US3] Печатные формы frontend/src/app/(print)/**: читаются в чёрно-белой печати
- [ ] T056 [US3] Обновить design-baseline.json, снимки, проверки телефона

**Checkpoint**: PR 5.

---

## Phase 8: Polish — ноль · PR 6

- [ ] T057 Свести frontend/design/design-baseline.json к нулю по всем файлам вне исключений; тест перестаёт читать базу и требует ноль
- [ ] T058 Переписать frontend/design/migration-map.md под v3 или удалить, если после T057 он никому не нужен (принцип V)
- [ ] T059 Пройти все 85 экранов по списку примет ИИ-дизайна из spec.md, результат таблицей в PR
- [ ] T060 `/speckit-converge`: сверить готовое со spec.md, SC-001…SC-006 с цифрами
- [ ] T060a Напомнить владельцу про SC-005: слепое сравнение главной и урока на трёх знакомых; результат записать в spec.md
- [ ] T061 Обновить память `reference_design_system.md`: v3, Geologica + Onest, цвет предмета, храповик

---

## Dependencies

- Phase 2 → Phase 3 (PR 1) → Phase 4 (PR 2) → Phase 5, 6, 7 → Phase 8.
- Фазы 5, 6, 7 не пересекаются по файлам, но мёржатся по одному.
- T033 (каркас motion.spec.ts) идёт до T045.
- T022 `subjectOf` идёт до T035 и T036.

## Parallel

- PR 2: T017, T022, T024, T025, T026 в разных файлах.
- PR 3: T040, T041, T042 после T035–T039.
- PR 5: T051, T052, T054, T055.

## Implementation Strategy

MVP — PR 1 и PR 2: после них всё новое делается в системе v3, а старое уже не
может ухудшиться. Каждый следующий PR самостоятелен и проверяется на проде до
следующего мёржа.

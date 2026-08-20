---

description: "Task list for 029-editor-keeps-text"
---

# Tasks: Редактор не теряет текст урока

**Input**: Design documents from `/specs/029-editor-keeps-text/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [quickstart.md](./quickstart.md)

**Tests**: тесты обязательны и пишутся первыми — так просил владелец («Red test
first») и того же требует конституция (принцип II).

**Organization**: задачи сгруппированы по историям из спеки. Оговорка честности:
US1 и US2 — две половины одной развилки и уезжают одним коммитом. Проверить их
можно порознь, а выпустить US1 без US2 нельзя: показать текст и потерять его на
сохранении — не починка.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: можно делать параллельно (разные файлы, нет незакрытых зависимостей)
- **[Story]**: US1 / US2 / US3
- Пути указаны от корня репозитория

## Path Conventions

Фронтенд: `frontend/src/…`. Каталог страницы редактора сокращён ниже до
`…/edit/` = `frontend/src/app/(admin)/admin/lessons/[lessonId]/edit/`.

---

## Phase 1: Setup

**Purpose**: рабочее окружение worktree

- [x] T001 Поставить зависимости фронтенда в этом worktree: `cd frontend && npm ci` (node 22; `node_modules` между worktree не общий)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: чистая функция, на которой стоят обе истории P1

**⚠️ CRITICAL**: без неё ни US1, ни US2 не начинаются

- [x] T002 Написать красный тест `…/edit/text-block-editor.test.ts`: непустое тело-строка обязано доехать до редактора с текстом; тело-объект остаётся богатым; пустое тело и пробелы — тоже богатым
- [x] T003 Убедиться, что T002 красный на сегодняшнем коде, и сохранить вывод для тела PR: `npx vitest run "src/app/(admin)/admin/lessons/[lessonId]/edit/text-block-editor.test.ts"`
- [x] T004 Создать `…/edit/text-block-editor.ts`: тип `TextBlockEditor` и функцию `textBlockEditor(body)` по таблице решений из [plan.md](./plan.md), с комментарием-шапкой в стиле `exercise-block-state.ts` — почему строка не идёт в TipTap
- [x] T005 Прогнать T002 зелёным

**Checkpoint**: развилка описана и покрыта; компонент ещё не тронут

---

## Phase 3: User Story 1 — Учитель видит свой текст (P1) 🎯 MVP

**Goal**: блок со строковым телом показывает это тело, а не пустоту

**Independent Test**: открыть урок «Solving linear equations» в редакторе и
увидеть содержимое, начинающееся с `<h2>Goal: get $x$ alone</h2>`

- [x] T006 [US1] Переписать `TextBlockBody` в `…/edit/page.tsx` (строки 875–887): развилку взять из `textBlockEditor(block.body)`, ветку `rich` оставить прежней, ветку `source` показать в `<textarea>` с видимым значением
- [x] T007 [US1] Дать `source`-ветке разумную высоту и моноширинный шрифт токенами проекта: 1828 символов в поле на шесть строк не читаются

**Checkpoint**: текст виден; сохранение ещё не проверено

---

## Phase 4: User Story 2 — Правка не меняет формат за спиной (P1)

**Goal**: правка строкового блока сохраняет строку и не трогает `format`

**Independent Test**: изменить символ в блоке с `format: "html"`, сохранить,
перечитать урок: тело — строка, формат — `html`, правка на месте

- [x] T008 [US2] В ветке `source` слать `onUpdate({ body: e.target.value })` — **без** поля `format`, чтобы прежнее значение осталось нетронутым
- [x] T009 [US2] Добавить в `…/edit/text-block-editor.test.ts` случаи US2: строка с `format: "markdown"` и строка вовсе без `format` попадают в `source` одинаково — решает тело, а не ярлык

**Checkpoint**: US1 + US2 закрывают дефект целиком

---

## Phase 5: User Story 3 — Новый блок остаётся богатым редактором (P2)

**Goal**: сценарий, который работал, продолжает работать

**Independent Test**: добавить текстовый блок — видна панель, работает `/`-меню

- [x] T010 [P] [US3] Добавить в `…/edit/text-block-editor.test.ts` случай нового блока: `body: ""` при `format: "tiptap"` идёт в `rich` с `content: null`
- [x] T011 [US3] Проверить в браузере: новый текстовый блок открывается в TipTap, набранный текст сохраняется объектом с `format: "tiptap"`

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T012 [P] Добавить ключ подписи над `source`-веткой во все шесть словарей `frontend/src/lib/i18n/locales/{en,es,ru,tr,de,uk}.ts` (FR-007) и вывести его через `useTranslation()`
- [x] T013 Прогнать `cd frontend && npm test` — включая парность локалей
- [x] T014 Прогнать `cd frontend && npx tsc --noEmit`
- [x] T015 Пройти [quickstart.md](./quickstart.md) в браузере на реальном уроке: до правки поле пустое, после — с текстом; в запросе сохранения тело осталось строкой, формат прежним
- [x] T016 [P] Записать итог в `tasks/todo.md`, а урок «строку не отдают редактору объектов» — в `tasks/lessons.md`
- [ ] T017 Открыть PR, положив в тело красный вывод T003: чем доказано, что тест способен упасть

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (T001)** — без зависимостей
- **Foundational (T002–T005)** — блокирует US1, US2, US3
- **US1 (T006–T007)** — после Foundational
- **US2 (T008–T009)** — после Foundational; T008 правит тот же участок `page.tsx`, что и T006, поэтому идёт следом, а не параллельно
- **US3 (T010–T011)** — после Foundational; T010 параллелен всему остальному
- **Polish (T012–T017)** — после US1 и US2

### Within Each User Story

- Тест написан и **упал** до реализации: T002 → T003 → T004
- Чистая функция до компонента
- Компонент до проверки в браузере

### Parallel Opportunities

- T010 и T012 [P] — разные файлы, ничего не ждут
- T016 [P] — документация, ни на что не влияет
- Остальное последовательно: US1 и US2 правят один и тот же `TextBlockBody`

---

## Implementation Strategy

### MVP

MVP здесь — Foundational + US1 + US2 вместе. Дробить их на две поставки
бессмысленно: US1 в одиночку показывает учителю текст, который он всё равно
потеряет на первом сохранении.

### Incremental Delivery

1. T001 — окружение готово
2. T002–T003 — красный тест: дефект доказан, а не описан
3. T004–T005 — развилка зелёная
4. T006–T009 — дефекта нет
5. T010–T011 — старый сценарий цел
6. T012–T017 — подпись, шлюзы, браузер, PR

---

## Notes

- Коммит после законченной группы, а не после каждой строки
- `git add` пофайлово: worktree делится с другой сессией, `git add -A` заберёт чужое
- Ветка `fix/text-block-keeps-string-body` отведена от `origin/main`
- Слияние в `main` — это выкладка на прод: сначала зелёный CI, потом слияние, потом проверка на живом уроке

---

description: "Task list for 028 — удаление задания убирает за собой"
---

# Tasks: Удаление задания убирает за собой

**Input**: Design documents from `/specs/028-delete-cleans-pages/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: обязательны и идут первыми. Конституция, принцип II: новый
охранник демонстрируется падающим против прежнего поведения, и это падение
называется в теле PR.

**Пересмотрено после `/speckit-analyze`**: добавлены блокировка строки
урока (FR-010), уборка домашек как требование (FR-008), сообщение об
удалённом задании в редакторе (FR-009), починка четырёх уже существующих
висящих блоков (SC-005). Тестовый файл переименован — в нём лежат и
домашки.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: можно делать параллельно (разные файлы, нет зависимостей)
- **[Story]**: US1 / US2 / US3 / US4
- Пути к файлам — точные

---

## Phase 1: Setup

- [ ] T001 Поднять postgres: `docker compose up -d db` — образ обязан быть `pgvector/pgvector:pg16`
- [ ] T002 Снять базовый прогон `cd backend && python -m pytest -q` и записать число зелёных

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: до конца этой фазы код не пишется

- [x] T003 Прогнать `/speckit-analyze` по `specs/028-delete-cleans-pages` — сделано; нашёл противоречие в порядке вызова, задачу без требования и незакрытую гонку
- [ ] T004 Создать `backend/tests/test_delete_cleans_lesson_blocks.py` с фикстурой урока-страниц: организация, курс, модуль, урок с `content` вида `{version:3, pages:[…]}`, задание и блок-ссылка на него
- [ ] T005 Добавить в `backend/tests/test_delete_cleans_lesson_blocks.py` отрицательный контроль: вторая организация со своим курсом, уроком и тем же uuid в тексте контента

---

## Phase 3: User Story 1 — Удалённое задание исчезает и из урока (P1) 🎯 MVP

**Independent Test**: страница «текст, задание, текст»; удалить задание; в
уроке два текстовых блока и ни одной ссылки на удалённое

### Tests ⚠️

- [ ] T006 [P] [US1] Тест «блок исчезает со страницы» в `backend/tests/test_delete_cleans_lesson_blocks.py`
- [ ] T007 [P] [US1] Тест «задание на двух страницах одного урока исчезает с обеих» в `backend/tests/test_delete_cleans_lesson_blocks.py`
- [ ] T008 [P] [US1] Тест «задание в двух разных уроках исчезает из обоих» в `backend/tests/test_delete_cleans_lesson_blocks.py`
- [ ] T009 [P] [US1] Тест «урок без ссылки не переписан» — сравнение контента до и после, в `backend/tests/test_delete_cleans_lesson_blocks.py`
- [ ] T010 [P] [US1] Тест «урок другой организации не тронут» в `backend/tests/test_delete_cleans_lesson_blocks.py`
- [ ] T011 [US1] Прогнать `backend/tests/test_delete_cleans_lesson_blocks.py`, увидеть падение, записать сообщения — идут в тело PR

### Implementation

- [ ] T012 [US1] Создать `backend/app/courses/lesson_blocks.py` с чистой функцией `content_without_block(content, block_type, ref_field, ref_id)` — словарь на входе и выходе, БД не трогает, `None` если ничего не выброшено
- [ ] T013 [US1] Добавить в `backend/app/courses/lesson_blocks.py` корутину `remove_block_references(db, org_id, block_type, ref_field, ref_id)`: join `Lesson → Module → Course`, фильтр `Course.org_id == org_id`, отбор по вхождению `ref_id` в `content::text`, **`.with_for_update()`** на выборке (FR-010), присвоение НОВОГО словаря в `lesson.content`
- [ ] T014 [US1] Позвать `remove_block_references` из `delete_exercise` в `backend/app/exercises/service.py` — **до** `db.delete(exercise)`, пока `exercise.org_id` доступен
- [ ] T015 [US1] Прогнать `backend/tests/test_delete_cleans_lesson_blocks.py` — зелёный

---

## Phase 4: User Story 2 — Порядок и нумерация (P2)

### Tests ⚠️

- [ ] T016 [P] [US2] Тест «`sort_order` пересобран с нуля, без пропуска» в `backend/tests/test_delete_cleans_lesson_blocks.py`
- [ ] T017 [P] [US2] Тест «удаление блока со второй страницы не сдвигает `page` у блоков третьей» в `backend/tests/test_delete_cleans_lesson_blocks.py`

### Implementation

- [ ] T018 [US2] Пересборка в `content_without_block` (`backend/app/courses/lesson_blocks.py`): `sort_order` от позиции с нуля, `page` от индекса страницы с единицы — то же правило, что `buildPagesContent` в `frontend/src/lib/lessons/lesson-pages.ts`

---

## Phase 5: User Story 3 — Пустая страница остаётся страницей (P3)

### Tests ⚠️

- [ ] T019 [P] [US3] Тест «страница с единственным блоком-заданием остаётся, пустая» в `backend/tests/test_delete_cleans_lesson_blocks.py`
- [ ] T020 [P] [US3] Тест «контент не-страницы переживает удаление без изменений и без ошибки» в `backend/tests/test_delete_cleans_lesson_blocks.py`

### Implementation

- [ ] T021 [US3] Сохранение пустых страниц и ранний выход на контенте не-страницах в `backend/app/courses/lesson_blocks.py`

---

## Phase 6: User Story 4 — Учитель видит, что задание удалили (P2)

**Independent Test**: блок со ссылкой на несуществующее задание; открыть
редактор — блок сообщает об удалении, а не зовёт выбирать тип

### Tests ⚠️

- [ ] T022 [P] [US4] Тест «блок с `exercise_id`, которого нет среди заданий урока, показывает сообщение об удалении» в `frontend/src/app/(admin)/admin/lessons/[lessonId]/edit/orphan-block.test.tsx`
- [ ] T023 [P] [US4] Тест «блок без `exercise_id` по-прежнему предлагает выбрать тип» в том же файле

### Implementation

- [ ] T024 [US4] Развести две ветки в `frontend/src/app/(admin)/admin/lessons/[lessonId]/edit/page.tsx`: `block.exercise_id` есть, а задания нет → сообщение «задание удалено» и кнопка убрать блок; `exercise_id` нет → прежний выбор типа
- [ ] T025 [P] [US4] Добавить ключи сообщения и кнопки во все шесть локалей `frontend/src/lib/i18n/locales/{en,es,ru,tr,de,uk}.ts` — тест парности упадёт, если забыть хоть одну

---

## Phase 7: Polish & Cross-Cutting

- [ ] T026 Позвать уборщик из `delete_assignment` в `backend/app/assignments/service.py` с `block_type="assignment"`, `ref_field="assignment_id"` (FR-008)
- [ ] T027 [P] Тест «удаление домашки убирает свой блок» в `backend/tests/test_delete_cleans_lesson_blocks.py`
- [ ] T028 [P] Тест «два удаления в один урок доходят оба» в `backend/tests/test_delete_cleans_lesson_blocks.py` — FR-010; без `with_for_update` обязан падать
- [ ] T029 Прогнать `cd backend && python -m pytest -q`, сверить с базовым числом из T002
- [ ] T030 Прогнать `cd frontend && npm test` и `npx tsc --noEmit`
- [ ] T031 `ruff check` и `ruff format` по `backend/`
- [ ] T032 Браузер по `specs/028-delete-cleans-pages/quickstart.md`: страница «текст, задание, текст», удалить задание, посмотреть редактор и ученический вид
- [ ] T033 PR с описанием падения из T011; CI, мерж, деплой, проверка прода

---

## Phase 8: Чистка прода — только после выката

- [ ] T034 Объявить запись в прод в чате, затем убрать четыре висящих блока в уроках «Adding fractions (same denominator)», «Decimal arithmetic», «From equation to points», «Solving linear equations» (SC-005)
- [ ] T035 Удалить 24 негодных задания — через штатное удаление, чтобы сработала новая уборка
- [ ] T036 Проверить запросом из `specs/028-delete-cleans-pages/quickstart.md`, что висящих ссылок ноль

---

## Dependencies & Execution Order

- **Phase 1** → **Phase 2**: без БД тесты не запустятся
- **Phase 2** → **Phase 3** → **Phase 4** → **Phase 5**: все три истории правят один `lesson_blocks.py`, поэтому по очереди
- **Phase 6** независима от 3–5 — другой файл, другой язык; может идти параллельно бэкенду
- **Phase 7** после 3–6
- **Phase 8** строго после выката: выполненная раньше, чистка и оставит 21 дыру

### Parallel Opportunities

Тесты внутри фазы (T006–T010, T016–T017, T019–T020, T022–T023, T027–T028).
Фаза 6 целиком параллельна фазам 3–5. Реализация бэкенда не параллелится —
`lesson_blocks.py` один.

---

## Implementation Strategy

MVP — фаза 3. Останавливаться на ней нельзя: без фазы 4 номера блоков
разъедутся с редактором, без фазы 5 уборщик молча удалит страницу учителя,
без фазы 6 гонка с автосохранением вернёт ссылку и никто не заметит, без
T028 чистка 24 заданий сработает наполовину.

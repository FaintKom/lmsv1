---

description: "Task list for 029 — сводка урока читает страницы"
---

# Tasks: Список уроков перестаёт врать, что они пусты

**Input**: Design documents from `/specs/029-lesson-summary-reads-pages/`

**Tests**: обязательны и первыми — принцип II конституции.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [ ] T001 Снять базовый прогон `cd frontend && npm test` и записать число зелёных

---

## Phase 2: User Story 1 — Автор видит, что внутри урока (P1) 🎯 MVP

### Tests ⚠️

- [ ] T002 [P] [US1] Тест «урок из блоков описывается их количеством по видам, а не как пустой» в `frontend/src/app/(admin)/admin/courses/[courseId]/edit/lesson-summary.test.ts`
- [ ] T003 [P] [US1] Тест «урок из нескольких страниц называет их число» в том же файле
- [ ] T004 [P] [US1] Тест «урок с одной страницей о страницах не говорит» в том же файле
- [ ] T005 [P] [US1] Тест «урок без блоков описывается как пустой» в том же файле
- [ ] T006 [P] [US1] Тест «контент не-страницы не роняет и описывается как пустой» — `{}`, `null`, `{version: 2, blocks: []}` — в том же файле
- [ ] T007 [P] [US1] Тест «виды идут в порядке меню добавления, пустые не показываются» в том же файле
- [ ] T008 [US1] Прогнать файл, увидеть падение, записать сообщения — идут в тело PR

### Implementation

- [ ] T009 [US1] Создать `frontend/src/app/(admin)/admin/courses/[courseId]/edit/lesson-summary.ts`: `lessonSummary(content)` возвращает `{kind: "empty"}` либо `{kind: "filled", pages, counts}` — ни БД, ни переводов не трогает
- [ ] T010 [US1] Заменить `getContentSummary` в `frontend/src/app/(admin)/admin/courses/[courseId]/edit/page.tsx` вызовом `lessonSummary` плюс подстановка переводов
- [ ] T011 [US1] Удалить из `page.tsx` мёртвые ветки v1 (`switch (lesson.content_type)`) и v2 — после миграции такого контента не существует

---

## Phase 3: User Story 2 — Сводка на языке школы (P2)

- [ ] T012 [P] [US2] Добавить восемь ключей в `frontend/src/lib/i18n/locales/en.ts`
- [ ] T013 [P] [US2] То же в `frontend/src/lib/i18n/locales/ru.ts`
- [ ] T014 [P] [US2] То же в `frontend/src/lib/i18n/locales/es.ts`
- [ ] T015 [P] [US2] То же в `frontend/src/lib/i18n/locales/tr.ts`
- [ ] T016 [P] [US2] То же в `frontend/src/lib/i18n/locales/de.ts`
- [ ] T017 [P] [US2] То же в `frontend/src/lib/i18n/locales/uk.ts`

---

## Phase 4: Polish

- [ ] T018 Прогнать `cd frontend && npm test` и сверить с базовым числом из T001
- [ ] T019 Прогнать `npx tsc --noEmit`
- [ ] T020 Браузер: редактор курса Kitchen Sink — под каждым уроком состав вместо «No content yet»
- [ ] T021 PR с описанием падения из T008; CI, мерж, деплой, проверка прода

---

## Dependencies & Execution Order

- **Phase 2** до **Phase 3**: ключи добавляются под уже написанный формат, иначе шесть файлов придётся править дважды
- Тесты фазы 2 параллельны между собой, локали фазы 3 — тоже; реализация нет

## Notes

Метка типа урока рядом со сводкой («Text» у всех подряд) здесь не трогается —
она уходит вместе со старой моделью урока в `specs/027`, на который согласие
уже дано. См. раздел «Out of scope» в спеке.

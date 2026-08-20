# Tasks: Lesson Pages

**Input**: specs/023-lesson-pages/

Setup/Foundational фаз нет. US1+US2 неразделимы в редакторе — идут одной
фазой. Один PR, коммиты по историям.

## Phase 3: формат + редактор (US1, US2) 🎯 MVP

- [x] T001 [P] [US2] Чистый модуль frontend/src/lib/lessons/lesson-pages.ts:
      типы Page/LessonBlock(+presentation), extractPages(content,
      contentType), buildV3Content(pages), generatePageId; юнит-тесты
      lesson-pages.test.ts (v3 как есть; v2 → одна страница; v1
      text/video → одна страница; пусто → одна пустая; round-trip
      buildV3Content→extractPages).
- [x] T002 [US1] [US2] Редактор admin/lessons/[lessonId]/edit/page.tsx:
      состояние pages; секции страниц («Page N» + editable title,
      ↑/↓/delete с подтверждением для непустых); ПОСТОЯННАЯ кнопка
      «+ Add content» в конце каждой страницы (тот же набор типов, что
      AddZone) и «+ Add page» внизу; hover-AddZone остаётся внутри
      страниц; dnd блоков в пределах страницы; автосейв пишет v3;
      legacy-guard этапа 2 сохраняется.

## Phase 4: плеер ученика (US3, US4)

- [x] T003 [US3] Студенческий плеер
      (dashboard)/courses/[courseId]/lessons/[lessonId]/page.tsx:
      extractPages; ?page=N (clamp); рендер только текущей страницы;
      Next + «X / Y» внизу (скролл вверх при переходе); на последней
      странице — прежний «следующий урок»; при одной странице пагинация
      скрыта (US4 покрыт этим же).
- [x] T004 [P] [US3] i18n-ключи пагинации (lesson.pageOf, lesson.nextPage
      и т.п.) в 6 локалей.

## Phase 5: презентация (US5) + тьютор

- [x] T005 [P] [US5] Компонент PresentationEmbed (iframe sandbox,
      http(s)-валидация, заглушка) + поле URL в редакторе блока; тип
      presentation в BlockKind/рендерах редактора и плеера.
- [x] T006 [P] RED-тест бэкенда: v3-урок → _lesson_text возвращает текст
      страниц (падает до правки); правка tutor/router.py _lesson_text
      (flatten pages→blocks).

## Phase 6: Polish

- [x] T007 Гейты: Vitest (+i18n), pytest (tutor + полный), tsc, build;
      браузер по quickstart.md (6 сценариев, включая QA Lesson на 231
      блок).
- [ ] T008 PR, CI, мерж, деплой-вотч, прод-проверка; отметить этап 7 в
      tasks/feedback-2026-08-19-authoring.md (+ записать этап 8:
      интерфейс ученика робота 2D/3D по образцу Codecademy + замена
      эмодзи на кастомные значки — задача владельца от 2026-08-20).

## Dependencies

T001 → T002 → T003; T005 после T002 (тип в редакторе); T006 независим.

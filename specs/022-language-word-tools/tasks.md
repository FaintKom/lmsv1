# Tasks: Language & Word-Game Authoring Tools

**Input**: specs/022-language-word-tools/

Setup/Foundational фаз нет: проект и инфраструктура на месте, бэкенд не
трогаем. Истории независимы — каждая правит свои файлы.

## Phase 3: US1 — crossword generator (P1) 🎯 MVP

- [x] T001 [P] [US1] Чистая функция buildCrosswordLayout(words, gridSize)
      в frontend/src/components/exercises/crossword-layout.ts +
      юнит-тесты crossword-layout.test.ts (6 слов без конфликтов; слово
      без общих букв кладётся отдельно; непоместившиеся — в unplaced;
      одно слово; кириллица).
- [x] T002 [US1] CrosswordConfigEditor
      (frontend/src/app/(admin)/admin/content-library/[exerciseId]/exercise-config-editors.tsx):
      кнопка «Собрать сетку» (применяет layout, показывает unplaced),
      Row/Col/direction/Place-on-grid → <details> «Advanced: manual
      placement».

## Phase 4: US2 — word search determinism (P1)

- [x] T003 [P] [US2] Чистая generateWordSearchGrid(words, gridSize, seed)
      (mulberry32 + хеш-фоллбек) в
      frontend/src/components/exercises/word-search-grid.ts + тесты
      (один seed → одна сетка; разные seed → разные; все слова лежат;
      слово длиннее сетки — пропущено с пометкой, не вечный цикл).
- [x] T004 [US2] Плеер word-search-exercise.tsx использует общий модуль
      и config.seed ?? hash(words) вместо Math.random().
- [x] T005 [US2] WordSearchConfigEditor: превью сетки + кнопка
      «Перегенерировать» (новый seed в config).

## Phase 5: US3–US6 — мелкие правки редакторов и плееров

- [x] T006 [P] [US3] SentenceBuilderConfigEditor: поле «Вставьте
      предложение» → split на слова (пунктуация прилипает, двойные
      пробелы схлопываются), заполняет correct_order/words.
- [x] T007 [P] [US4] DialogueConfigEditor: подпись «Correct» у радио
      (заголовок колонки + aria-label), выделение отмеченного варианта.
- [x] T008 [P] [US5] Чистый parseTestCaseCsv(text) в
      frontend/src/lib/test-case-csv.ts + тесты (кавычки/запятые внутри
      полей, CRLF, BOM, пустые строки, отсутствие expected_output =
      ошибка всего файла) + buildTestCaseCsvTemplate().
- [x] T009 [US5] TestCasesEditor (content-library/[exerciseId]/page.tsx):
      «Import CSV» (валидация всего файла до первого POST, затем
      addTestCase по строкам, итоговый счёт) и «Download template»
      (Blob).
- [x] T010 [US5] Проверено: Instructions (config.instructions) виден
      ученику во всех типах, включая code challenge — общий
      instructionsNote в exercise-renderer.tsx:325 (specs/019 US5).
      Чинить нечего.
- [x] T011 [US6] fill-blanks-v2.tsx: подсказка под зоной слотов;
      ключ exercise.fillBlanks.howTo в 6 локалей.

## Phase 6: Polish

- [x] T012 Гейты: Vitest (252, из них 19 новых) + tsc чистый;
      браузерная проверка по quickstart.md — все 6 сценариев прошли.
- [ ] T013 После мержа и деплоя: прод-проверка, отметить этап 6 в
      tasks/feedback-2026-08-19-authoring.md.

## Dependencies

T001 → T002; T003 → T004/T005; T008 → T009. US3/US4/US6 независимы.
Один PR, коммиты по историям.

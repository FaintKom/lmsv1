# Quickstart: Language & Word-Game Authoring Tools

## Prerequisites

- Dev-стек: postgres (`lms29-db-1`), uvicorn :8000, `npm run dev` :3000.
- Учитель залогинен, открыт Content Library → Exercises.

## Validation scenarios

1. **Crossword (US1)**: открыть crossword-упражнение → ввести 6 слов с
   определениями → «Собрать сетку» → превью без конфликтов, часть слов
   пересекается; ручные Row/Col спрятаны под «Advanced»; двинуть слово
   вручную — работает.
2. **Word search (US2)**: открыть word search → сетка видна сразу;
   «Перегенерировать» меняет раскладку; сохранить; открыть плеер дважды
   (превью-панель) — сетка идентична обеим и равна редакторской.
3. **Sentence builder (US3)**: вставить «Der Hund läuft im Park» в поле
   вставки → 5 фишек в правильном порядке; превью ученика показывает
   слова в перемешанном порядке (word_bank с сервера).
4. **Dialogue (US4)**: точка выбора — у радио подпись «Correct»,
   отмеченный вариант визуально выделен.
5. **CSV (US5)**: «Download template» отдаёт CSV с шапкой и примерами;
   загрузка файла на 10 строк создаёт 10 кейсов; файл без
   `expected_output` даёт ошибку и ноль импортированного; скрытые кейсы
   не видны в превью ученика.
6. **Fill blanks (US6)**: в плеере подсказка стоит под зоной ответа.

## Gates

Vitest (`npm test`) — новые `crossword-layout.test.ts`,
`word-search-grid.test.ts`, `test-case-csv.test.ts` + i18n-паритет;
`npx tsc --noEmit`; `npm run build`.

# Implementation Plan: Language & Word-Game Authoring Tools

**Branch**: `feat/language-tools` | **Date**: 2026-08-20 | **Spec**: [spec.md](spec.md)

## Summary

Шесть точечных доводок без новой схемы и без новых эндпоинтов. Все данные
живут в config JSONB упражнения; сервер уже умеет всё нужное.

1. **Crossword generator** (US1): чистая функция
   `buildCrosswordLayout(words, gridSize)` в
   `frontend/src/components/exercises/crossword-layout.ts` — жадное
   перекрещивание: первое слово в центр, каждое следующее через общую
   букву с уже лежащими, без конфликтов; возвращает
   `{placed: [{word, row, col, direction}], unplaced: string[]}`.
   Юнит-тесты рядом (`crossword-layout.test.ts`). В
   `CrosswordConfigEditor` — кнопка «Собрать сетку», ручные
   Row/Col/direction/Place-on-grid сворачиваются в `<details>`
   «Advanced: manual placement». Clue-поле не трогаем.
   `_strip_answers` (router.py:811) уже заменяет word→length — генератор
   ничего не ослабляет.

2. **Word search determinism** (US2): чистая
   `generateWordSearchGrid(words, gridSize, seed)` (mulberry32 PRNG) в
   `frontend/src/components/exercises/word-search-grid.ts` + тесты.
   Config получает `seed: number`; редактор рисует сетку и кнопкой
   «Перегенерировать» меняет seed; плеер (`word-search-exercise.tsx`)
   использует `config.seed ?? хеш слов` вместо `Math.random()` — старые
   упражнения становятся стабильными без миграции. Seed не секрет:
   буквенная сетка и так целиком видна ученику.

3. **Sentence builder paste** (US3): в `SentenceBuilderConfigEditor`
   поле «Вставьте предложение» — split по пробелам (пунктуация
   прилипает к словам), заполняет `correct_order`/`words`. Шафл ученика
   уже серверный: `_strip_answers` отдаёт перемешанный `word_bank`
   (router.py:775–783) — в плеере ничего не менять, констатировать
   проверкой.

4. **Dialogue editor** (US4): радио получает подпись — колонка
   «Correct» над радио + `aria-label`; выбранный вариант подсвечен.
   Только разметка `DialogueConfigEditor`.

5. **CSV test cases** (US5): в `TestCasesEditor`
   (content-library/[exerciseId]/page.tsx:902) — кнопка «Import CSV»
   (file input) и «Download template». Парсер CSV — маленькая чистая
   функция с тестами (кавычки, CRLF, BOM); валидация всего файла ДО
   первого POST (формат-ошибка = ноль импортированного), затем
   последовательные `exercisesApi.addTestCase`. Шаблон — генерируемый
   Blob с шапкой `input,expected_output,is_hidden` и двумя строками
   примеров. Instructions ученику: проверить в плеере code challenge,
   что description упражнения виден (починить, если нет).

6. **Fill blanks hint** (US6): подсказка — внутри `fill-blanks-v2.tsx`
   под зоной слотов (не через общий LessonShell.checkHint, чтобы не
   двигать все типы).

Бэкенд не меняется вовсе (0 эндпоинтов). i18n: новые строки редакторов
следуют существующему стилю файла; строки плеера fill blanks — через
ключи в 6 локалей.

## Constitution Check

- **I (изоляция)**: id не трогаем. Pass.
- **II (тесты, способные упасть)**: crossword-layout, word-search-grid,
  CSV-парсер — чистые функции с юнит-тестами; детерминизм word search
  фиксируется тестом «один seed → одна сетка, разные seed → разные».
- **III (сервер — единственный судья)**: не ослабляется. Crossword strip
  уже прячет слова; word search seed — не ответ (сетка видна целиком);
  скрытые тест-кейсы идут существующим API и не показываются.
- **IV (докам верить)**: клеймов не меняем.
- **V (наименьшее изменение)**: 0 миграций, 0 эндпоинтов, три новых
  чистых модуля + правки четырёх редакторов и одного плеера.

## Verification

Vitest (новые модули + i18n-паритет), tsc, build; браузер: собрать
кроссворд из 6 слов, перегенерировать word search и убедиться в
стабильности после сохранения, вставить предложение, импортировать CSV
на 10 строк, увидеть подпись «Correct» в диалоге и подсказку под
слотами fill blanks.

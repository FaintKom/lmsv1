# Implementation Plan: Lesson Pages

**Branch**: `feat/lesson-pages` | **Date**: 2026-08-20 | **Spec**: [spec.md](spec.md)

## Summary

Страницы — новый уровень группировки внутри lesson.content (JSONB, без
миграций): `{version: 3, pages: [{id, title?, blocks: [...]}]}`. Блоки
остаются блоками этапа 2 (text/html/video/exercise/assignment) + новый
`presentation` (embed URL). Одна чистая функция чтения обслуживает
редактор и плеер.

1. **Формат и грандфазер** — `frontend/src/lib/lessons/lesson-pages.ts`:
   `extractPages(content, contentType): Page[]` — v3 как есть; v2
   (плоские blocks) → одна страница; v1 (body/url) → одна страница;
   `buildV3Content(pages)` — сериализация с sort_order. Юнит-тесты на
   все три входа + пустоту.
2. **Редактор** (`admin/lessons/[lessonId]/edit/page.tsx`): состояние
   `pages` вместо `blocks`; каждая страница — очерченная секция
   («Страница N», редактируемый заголовок) с постоянно видимой кнопкой
   «+ Add content» в конце (открывает тот же выбор типов, что AddZone) и
   кнопками ↑/↓/удалить (подтверждение, если не пуста) на странице;
   внизу постоянная «+ Add page». Hover-AddZone остаётся между
   элементами внутри страницы. Существующий dnd — в пределах страницы
   (SortableContext на страницу). Автосейв пишет v3 всегда.
3. **Плеер ученика**
   (`(dashboard)/courses/[courseId]/lessons/[lessonId]/page.tsx`):
   `extractPages` тем же модулем; `?page=N` (1-based, clamp);
   рендерятся ТОЛЬКО блоки текущей страницы; внизу «Next» + «X / Y»
   (прогресс-точки), на последней — прежний блок «следующий урок»;
   Next скроллит вверх. v2/v1-уроки = 1 страница → пагинация не
   показывается, вид прежний.
4. **Presentation-блок**: BlockKind + иконка; редактор — поле URL с
   подсказкой (Google Slides «publish to web», ссылка на PDF); рендер —
   `<iframe sandbox="allow-scripts allow-same-origin" ...>` с
   заглушкой при пустом/невалидном URL (http(s) only). В редакторе и
   плеере один компонент.
5. **Бэкенд, единственная правка** — `tutor/router.py:_lesson_text`
   читает v3: плоский обход pages→blocks (иначе тьютор теряет текст
   урока). RED-тест в test_tutor*. `normalize_lesson_content` не
   трогаем: `version == 2` проверка пропускает v3 нетронутым (проверено
   чтением). Экспорт курса копирует JSONB как есть.

## Constitution Check

- **I**: id/org не трогаем. Pass.
- **II**: юнит-тесты extractPages (v1/v2/v3/пусто), RED-тест тьютора на
  v3-урок (падает до правки `_lesson_text`), тест presentation-URL
  валидации.
- **III**: страницы не касаются ответов; exercise-блоки рендерятся теми
  же плеерами с теми же strip/check путями. Pass.
- **IV**: обновить frontend/CLAUDE.md-описание формата урока не нужно
  (не документирован); tasks/feedback-план получит этап 7.
- **V**: без миграций, один новый модуль, одна бэкенд-функция.

## Verification

Vitest (extractPages, presentation URL, i18n-паритет), pytest
(тьютор v3), tsc, build. Браузер: создать 2 страницы со смешанным
контентом, пройти учеником по Next с прогрессом; старый v2-урок — вид
не изменился; QA Lesson (231 блок) открывается одной страницей.

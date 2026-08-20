# Data Model: Lesson Pages

Без таблиц и миграций — всё в `lessons.content` (JSONB).

## v3 (новый формат записи)

```json
{
  "version": 3,
  "pages": [
    {
      "id": "page_1755640000000_ab12cde",
      "title": "Введение",
      "blocks": [
        { "id": "b1", "type": "text", "sort_order": 0, "body": "<p>…</p>", "format": "html" },
        { "id": "b2", "type": "video", "sort_order": 1, "url": "https://…" },
        { "id": "b3", "type": "presentation", "sort_order": 2, "url": "https://docs.google.com/presentation/d/e/…/embed" },
        { "id": "b4", "type": "exercise", "sort_order": 3, "exercise_id": "…uuid…" }
      ]
    }
  ]
}
```

- `pages[].title` — опционален; UI показывает «Page N».
- Блоки — те же, что в v2 (типы: text, html, video, exercise,
  assignment) + `presentation {url}`; `sort_order` — внутри страницы.
- `presentation.url` — только http(s); валидация в редакторе, заглушка в
  плеере.

## Чтение (extractPages)

| Вход | Результат |
|---|---|
| v3 | pages как есть (сортировка по порядку массива) |
| v2 `{version:2, blocks:[…]}` | одна страница со всеми блоками |
| v1 `{body}` / `{url}` + content_type | одна страница c одним блоком |
| пусто | одна пустая страница |

## Кто ещё читает content

- `normalize_lesson_content` (бэкенд): v3 проходит нетронутым (проверка `== 2`).
- `_lesson_text` (тьютор): учится обходить pages — единственная правка бэкенда.
- Экспорт/импорт курса: JSONB копируется как есть.

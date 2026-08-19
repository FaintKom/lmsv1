# Data Model: Language & Word-Game Authoring Tools

Ни одной новой таблицы и миграции. Всё — поля внутри существующего
`exercises.config` (JSONB) и существующая таблица тест-кейсов.

## Crossword config (без изменений формата)

```json
{
  "grid_size": 12,
  "words": [{ "word": "APPLE", "clue": "Fruit", "row": 3, "col": 2, "direction": "across" }]
}
```

Генератор лишь заполняет row/col/direction. Строгих новых правил нет;
непоместившиеся слова остаются в списке с прежними координатами и
показываются в предупреждении редактора.

## Word search config (+1 поле)

```json
{
  "grid_size": 12,
  "words": ["APPLE", "PEAR"],
  "seed": 174253
}
```

- `seed`: целое; отсутствует у старых упражнений → плеер берёт
  детерминированный хеш списка слов. Никогда не секрет.

## Sentence builder config (без изменений)

Вставка заполняет существующие `correct_order` + `words` (дубликат,
который strip выбрасывает).

## Test case (существующая сущность, новый способ ввода)

CSV-строка → `{input: string, expected_output: string, is_hidden: bool}`.
`is_hidden` в CSV: `true/false/1/0/yes/no` (без регистра); пустое = false.
Валидация: колонка `expected_output` обязательна и непуста; файл с
ошибкой формата не импортируется вовсе.

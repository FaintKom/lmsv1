# Data Model: дизайн-система v2

Базы данных фича не касается. Сущности здесь — токены и одно правило
сопоставления.

## Токен

| Поле | Пример | Правило |
|---|---|---|
| имя | `--subject-math` | по смыслу, не по цвету (`--subject-math`, а не `--yellow-soft`) |
| светлое значение | `#fff2b3` (sun-100) | только из палитры `tokens.json` |
| тёмное значение | `#33301a` | контраст `--subject-ink` на нём не ниже 4.5:1 |
| где применяется | обложка курса, плитка на главной | перечислено в `DESIGN_SPEC.md` |

Полный список изменений — в [contracts/tokens.md](contracts/tokens.md).

## Предмет курса

`subjectOf(category: string | null): "lang" | "math" | "code" | "web" | "other"`

| category (без регистра, любая из шести локалей) | предмет |
|---|---|
| languages, language, english, german, spanish… | lang |
| math, mathematics, algebra, geometry | math |
| programming, python, javascript, computer science | code |
| web, web development, html, css | web |
| пусто или неизвестно | other |

Проверка: юнит-тест на эту таблицу плюс «неизвестная категория даёт other».
Словарь сверяется с реальными значениями `courses.category` на проде перед PR 3.

## Нарушение (храповик)

`{ file: string, rule: RuleId, count: number }` в `design/design-baseline.json`.
Файл есть в базе: счётчик может только уменьшаться. Файла нет в базе: должен
быть 0.

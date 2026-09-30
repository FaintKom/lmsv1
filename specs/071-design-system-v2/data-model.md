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

`subjectOf(category: string | null): "lang" | "math" | "code" | "other"`
в `frontend/src/lib/subject.ts`.

Значения `courses.category` на проде 2026-09-30 (T006, read-only запрос):

| category | курсов | предмет |
|---|---|---|
| пусто | 4 | other |
| Languages | 3 | lang |
| Programming | 2 | code |
| programming | 2 | code |
| Mathematics | 2 | math |
| platform | 1 | other |
| testing | 1 | other |

Категории «Web» нет: курс по HTML и CSS лежит в Programming. Поэтому отдельного
предмета и токена `web` нет (принцип V). Сопоставление идёт по основам слов на
шести языках интерфейса; тест `subject.test.ts` проверяет все значения выше и
русские варианты.

## Нарушение (храповик)

`{ file: string, rule: RuleId, count: number }` в `design/design-baseline.json`.
Файл есть в базе: счётчик может только уменьшаться. Файла нет в базе: должен
быть 0.

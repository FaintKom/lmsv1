# 089 — удаление девяти мёртвых компонентов

**Ветка**: `chore/remove-dead-components` · **Создано**: 2026-10-08

## Что не так

Девять компонентов никто не импортирует. Проверено двумя способами:
- скрипт обошёл `src/` и искал имя каждого файла в импортах;
- `grep` нашёл упоминания только в `i18n-allowlist.ts`.

| Файл | Что это было |
|---|---|
| `common/auto-youtube.tsx` | автоматическая вставка YouTube |
| `gamification/streak-widget.tsx` | виджет серии дней |
| `math/problem-generator.tsx` | генератор задач |
| `onboarding/teacher-onboarding.tsx` | старый онбординг учителя |
| `skills/skill-graph-v2.tsx` | граф навыков v2 |
| `submissions/exercises/fill-blanks.tsx` | старый экран «вставь слово» |
| `submissions/exercises/true-false.tsx` | старый экран «верно/неверно» |
| `ui/chip.tsx` | чип; его роль выполняют `FilterChips` и статусные пилюли |
| `waitlist-form.tsx` | форма листа ожидания |

Все девять стояли в allowlist i18n: мёртвый код числился непереведённым
интерфейсом.

## Что меняется

Файлы удалены вместе со своими строками в allowlist. Бэкенд не тронут:
эндпоинт листа ожидания остаётся, у него могут быть другие клиенты.

Юридические страницы (privacy, terms, cookies и другие) остаются на
английском по решению владельца.

## Проверка

- `tsc --noEmit` проходит без ошибок, Vitest — 78 файлов, 691 тест.
- На эти файлы не ссылаются ни DESIGN.md, ни `.impeccable/design.json`,
  ни документация. «Filter Chip» в sidecar — это `FilterChips` из
  page-kit, а не удалённый `ui/chip`.

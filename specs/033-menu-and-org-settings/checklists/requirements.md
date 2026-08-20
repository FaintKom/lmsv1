# Specification Quality Checklist: Меню короче, настройки школы достижимы

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-08-20
**Feature**: [spec.md](../spec.md)

## Content Quality

- [~] No implementation details (languages, frameworks, APIs) — осознанное
      отступление, см. «Notes»
- [x] Focused on user value and business needs
- [~] Written for non-technical stakeholders — разделы «Что происходит сейчас»
      и «Что в списке было сказано неточно» технические намеренно
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [~] No implementation details leak into specification — то же отступление

## Notes

**Два пункта помечены `~`, а не `[x]`, и это выбор, а не недосмотр.**

Шаблон Spec Kit запрещает имена файлов и полей в спеке. Домашний стиль этого
репозитория — обратный: спеки `031-live-exercise-preview` и
`032-comma-lists-typeable` называют файлы, поля и ключи прямо в диагнозе.
CLAUDE.md прямо говорит, что ограничения проекта важнее умолчаний скилла, а
конституция (принцип V, «наименьшее изменение, которое работает») требует
чинить в одном месте — для этого место надо назвать.

Что сделано, чтобы отступление не расползлось:

- Имена файлов и полей живут только в диагностических разделах: «Что
  происходит сейчас», «Что в списке было сказано неточно», «Out of scope»,
  «Assumptions».
- Требования FR-001…FR-022 сформулированы через поведение. Три исключения
  названы сознательно: `sidebar-collapsed` в FR-004 — ключ уже опубликован на
  странице `/cookies`, и требование состоит в том, чтобы код догнал обещание;
  адреса `/admin/recordings` и `/admin/courses` в FR-015 и FR-021 — это то,
  что пользователь видит в адресной строке, а не внутренняя деталь.
- Success Criteria SC-001…SC-008 не называют ни файлов, ни технологий.

**Вопросов к владельцу не осталось.** Три развилки — судьба поиска, вид
свёрнутого меню, вид категорий — разобраны до написания спеки, поэтому ни
одного `[NEEDS CLARIFICATION]` в тексте нет.

**Готово к `/speckit-plan`.** `/speckit-clarify` пропускается осознанно: он
задаёт вопросы по дырам в спеке, а дыры закрыты заранее.

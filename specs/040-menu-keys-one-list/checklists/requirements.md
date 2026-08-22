# Specification Quality Checklist: Один список пунктов меню вместо двух

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-08-22
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
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
- [x] No implementation details leak into specification

## Notes

Спека называет `MENU_ITEM_KEYS`, `buildNavTree` и `nav.*` — не как выбор
реализации, а потому что расхождение именно этих двух списков и есть описываемая
проблема. Назвать её, не называя их, значит описать симптом.

Допущение «все шестнадцать пунктов школа вправе прятать» проверяемо и проверено:
меню уже спрашивает карту видимости про каждый из них. Правка не расширяет права
школы, а даёт дотянуться до того, что меню умеет.

SC-002 (пункт пропадает из меню после выключения) на QA-стенде подтвердить не
удалось: его образ бэкенда старше `specs/034` и не отдаёт карту в `/auth/me`.
Записано в `tasks.md` как есть, а не отмечено выполненным.

# Specification Quality Checklist: Six menu items a school cannot switch off

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

Правки по итогам проверки:

- Первый счёт недостающих пунктов был **три**, а не шесть — он снят с неполного
  поиска по коду. Пересчитан множествами: меню спрашивает 16 ключей, форма
  предлагает 10, не хватает шести. Спека написана уже по верному числу; это
  записано здесь, потому что цифра «три» звучала в разговоре и может всплыть.

Решения, принятые вместо вопросов владельцу:

- **Поддержку выключить можно.** Владелец просил решить. Запрет означал бы
  решать за школу, которая отвечает на вопросы лично; вместо запрета —
  предупреждение (FR-011, FR-012). Тот же приём, что с контрастом в `specs/037`.
- **Подписи берутся у меню.** У нынешних десяти переключателей свои строки,
  отдельные от строк меню. Две строки на один пункт однажды разойдутся, и
  расхождение будет тихим (FR-010).
- **Группировка берётся у меню**, а не изобретается (FR-008).

Проверки против конституции:

- **Принцип I** (изоляция арендаторов): карта принадлежит школе и приходит с
  сессией; новых путей к чужим настройкам работа не заводит. FR-013 отдельно
  фиксирует, что права не участвуют — иначе «скрыть пункт» однажды прочитают как
  «закрыть доступ».
- **Принцип II** (тест, способный упасть): US2 целиком про это. Проверка
  «прежние решения не изменились» красная против наивной реализации, которая
  соберёт карту заново со всеми шестнадцатью по умолчанию и перезапишет чужие
  выключения.
- **Принцип IV** (продукт и документы говорят одно): FR-002 требует совпадения
  двух наборов ключей. Именно их расхождение и породило эту работу.
- **Принцип V** (наименьшее изменение): подписи не заводятся заново, а
  переиспользуются; десять дублирующих строк уходят. Группировка берётся
  существующая. Схема базы не меняется.

Область намеренно не расширена: три пункта без ключа видимости
(«Лист ожидания», «Организации», «Интеграции») вынесены в Out of scope. Там
сначала решается, вправе ли школа их скрывать, — это другой вопрос, а не
недостающий переключатель.

# Tasks: Один список пунктов меню вместо двух

**Input**: [plan.md](./plan.md), [spec.md](./spec.md)

## Фаза 1 — Список переезжает к меню (User Story 1, P1)

- [x] **T001** В `frontend/src/components/layout/nav-tree.ts` объявить
  `MENU_ITEM_KEYS` — все шестнадцать ключей в порядке групп меню (learning,
  people, sessions, progress, school), подписи `nav.*`, `adminOnly: true` у
  `users`, `crm`, `paths`. Закрывает FR-001, FR-002, FR-003, FR-004, FR-007.

- [x] **T002** В `frontend/src/components/admin/org-settings-form.tsx` убрать
  собственный список и импортировать его из `nav-tree`. Больше ничего в форме не
  меняется: `settings.menu_visibility?.[key] !== false` по-прежнему читает
  отсутствие ключа как «показывать», поэтому шесть новых переключателей
  открываются включёнными (FR-006).

## Фаза 2 — Подписи и лишние строки (User Story 2, P2)

- [x] **T003** Удалить `admin.settings.menuUsers`, `menuGroups`, `menuCourses`,
  `menuAssignments`, `menuGradebook`, `menuReview`, `menuPaths`, `menuCalendar`,
  `menuLiveLessons`, `menuAnalytics` из всех шести локалей. Оставить
  `menuVisibility`, `menuVisibilityHint`, `adminOnly` — они используются.
  Закрывает SC-003.

- [x] **T004** `npx vitest run translations` — паритет шести локалей не нарушен.

## Фаза 3 — Забор (User Story 3, P3)

- [x] **T005** Тест в `frontend/src/components/layout/nav-tree.test.ts`: вызвать
  `buildNavTree` для `super_admin`, `admin`, `teacher` с картой видимости —
  Proxy, чей `get` записывает спрошенный ключ, — и сравнить набор спрошенного с
  ключами `MENU_ITEM_KEYS`.

  Три роли, а не одна: `visible("crm")` стоит за `isAdminOnly &&`, и у
  преподавателя до него не доходит очередь. Закрывает FR-005, SC-004.

- [x] **T006** Проверить, что тест краснеет — по разу в каждую сторону: лишний
  ключ в списке и ключ, убранный из списка при живом пункте меню.

## Фаза 4 — Проверка вживую

- [x] **T007** `npx tsc --noEmit` и `npx vitest run nav-tree translations
  no-hardcoded-strings` — зелёные.

- [x] **T008** В браузере под администратором (свой дев-сервер на :3010, QA-бэкенд
  на :8000): в настройках шестнадцать переключателей в порядке меню, подписи
  совпадают, «Admin only» ровно на трёх — «Траектории», «Пользователи»,
  «Заявки». Живой контроль: у QA-школы `gradebook` уже выключен, и форма
  показывает его выключенным. Закрывает SC-001.

  Сохранение не проверялось: QA-стек смонтирован из чужого чекаута
  (`F:\lms2.9`), писать в его данные — мешать соседней сессии. Путь записи
  правка не трогала, и он закрыт тестом из `specs/039`.

  Там же выяснилось, почему меню QA не прячет `gradebook`: образ бэкенда
  собран 2026-08-21 и не знает `menu_visibility` в `/auth/me` — он старше
  `specs/034`. К этой правке отношения не имеет; SC-002 остаётся за
  юнит-тестами до пересборки QA.

## Зависимости

T001 → T002 → T005 → T006. T003 → T004. T007 и T008 в конце.

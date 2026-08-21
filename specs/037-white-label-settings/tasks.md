---

description: "Task list for white-label settings in one place"
---

# Tasks: White-label settings in one place

**Input**: Design documents from `specs/037-white-label-settings/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/ui.md](./contracts/ui.md), [quickstart.md](./quickstart.md)

**Tests**: обязательны. Принцип II конституции: каждая проверка сначала
демонстрируется падающей против нынешнего поведения, и это указывается в теле PR.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: можно вести параллельно — другие файлы, нет незавершённых зависимостей
- **[Story]**: US1…US7 из спеки

## Что нельзя забыть ни в одной задаче

- Новый `.tsx` обязан звать `useTranslation()`, иначе падает
  `no-hardcoded-strings.test.ts`.
- Каждый новый ключ — во **все шесть** локалей (`en, es, ru, tr, de, uk`) в той
  же правке, иначе падает `translations.test.ts`.
- Вызовы API — через `src/lib/api/*`.
- Токены Lively. Белый текст на солнечных поверхностях запрещён всегда.
- Проверка в браузере **начинается** с чтения `document.visibilityState`: в
  фоновой вкладке переходы замирают на начальном значении и читаются как
  поломка вёрстки.

---

## Phase 1: Setup

**Purpose**: убедиться, что стенд поднят и исходное поведение зафиксировано

- [x] T001 Поднять QA-стек: `docker compose -f docker-compose.qa.yml up -d --build --wait`
- [x] T002 Зафиксировать исходное: подтвердить, что `var(--secondary)` не читает ни одна строка в `frontend/src` и `frontend/design`, и что `--color-primary-fg` в `frontend/design/tokens.css` — константа. Это состояние, против которого будут краснеть тесты.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: расчёт цвета, от которого зависят US1, US2 и US3

**⚠️ Ни одна история не начинается, пока эта фаза не закрыта.**

- [x] T003 Написать падающие юнит-тесты расчёта в `frontend/src/lib/brand/contrast.test.ts`: `contrastRatio` симметрична и даёт 21 для чёрного на белом; `readableOn("#facc15")` — тёмный, `readableOn("#0f172a")` — светлый; `readableAs` не меняет тон и достигает 4.5:1; `suggestSecondary` возвращает четыре цвета в устойчивом порядке; `tooClose` срабатывает ниже 1.3:1. Красные: файла ещё нет.
- [x] T004 Реализовать `frontend/src/lib/brand/contrast.ts` — чистые функции без React и DOM по контракту в `contracts/ui.md` §1
- [x] T005 Написать падающий тест в `frontend/src/components/layout/brand-vars.test.tsx`: при заданном `primary_color` переменная `--primary-fg` переопределена расчётным значением; при незаданном — не тронута; при размонтировании все выставленные переменные сняты
- [x] T006 Реализовать `frontend/src/components/layout/brand-vars.tsx` по контракту `contracts/ui.md` §2
- [x] T007 **Удалить** дублированный эффект применения цветов из `frontend/src/app/(admin)/layout.tsx` и `frontend/src/app/(dashboard)/layout.tsx`, заменив его на `<BrandVars />`. Это удаление: после задачи в проекте должна остаться **одна** реализация, а не три.

**Checkpoint**: расчёт есть, применяется из одного места, дублей нет

---

## Phase 3: User Story 1 — Фирменный цвет не делает текст нечитаемым (P1) 🎯 MVP

**Goal**: цвет текста на заливке выводится из фирменного цвета, а не берётся из константы

**Independent Test**: задать `#facc15` — надпись на кнопке тёмная, контраст ≥ 4.5:1; задать `#0f172a` — светлая

- [ ] T008 [US1] Написать падающий сквозной тест в `frontend/e2e/journeys/brand-colors.spec.ts`: администратор задаёт светлый фирменный цвет, и `getComputedStyle` кнопки основного действия даёт тёмный текст с контрастом ≥ 4.5:1. Красный: сегодня цвет текста от фирменного цвета не зависит вообще.
- [x] T009 [US1] Сделать `--color-primary-fg` переопределяемым в `frontend/design/tokens.css` так, чтобы при незаданном бренде значение осталось прежним
- [ ] T010 [US1] Применить расчётный `--primary-fg` и оттенок для текста на подложке в `frontend/src/components/layout/brand-vars.tsx`, отдельно для светлой и тёмной темы

**Checkpoint**: US1 работает и проверяется сама по себе

---

## Phase 4: User Story 2 — Администратор видит результат до сохранения (P1)

**Goal**: превью с живыми элементами в обеих темах, предупреждения по контрасту

**Independent Test**: изменить цвет — образцы перерисовались; уйти не сохранив — школа на прежних цветах

- [ ] T011 [US2] Написать падающие тесты в `frontend/src/components/admin/brand-preview.test.tsx`: перерисовка на смену пропса; предупреждение при контрасте ниже 4.5:1 с указанием значения; предупреждение при `tooClose`; переключатель темы меняет фон образцов, не трогая тему приложения
- [ ] T012 [US2] Реализовать `frontend/src/components/admin/brand-preview.tsx` по контракту `contracts/ui.md` §3 — вход только два цвета, ни `orgId`, ни сети, ни сохранения. Ключи в шесть локалей.
- [ ] T013 [US2] Выделить `frontend/src/components/admin/brand-section.tsx` из `org-settings-form.tsx` и встроить в неё превью. Ключи в шесть локалей.
- [ ] T014 [US2] Написать падающий сквозной тест в `frontend/e2e/journeys/brand-settings.spec.ts`: изменение цвета без сохранения не меняет сохранённое значение после перезагрузки

---

## Phase 5: User Story 3 — Второй цвет предлагается и наконец что-то делает (P2)

**Goal**: подбор второго цвета от первого, флаг ручного выбора, три места применения

**Independent Test**: сменить основной — второй следует; выбрать второй вручную; снова сменить основной — второй остался

- [ ] T015 [US3] Написать падающий тест на `secondary_is_custom` в `frontend/src/components/admin/brand-section.test.tsx`: пока флаг не поднят, смена основного двигает второй; после ручного выбора — не двигает
- [ ] T016 [US3] Добавить в `frontend/src/components/admin/brand-section.tsx` четыре образца второго цвета и произвольный выбор; поднимать `secondary_is_custom` при первом ручном выборе. Ключи в шесть локалей.
- [ ] T017 [P] [US3] Добавить `secondary_is_custom` в `OrgSettings` в `frontend/src/lib/api/organizations.ts`
- [ ] T018 [US3] Написать падающий тест в `frontend/src/components/analytics/widgets/activity-timeline-widget.test.tsx`: серии берут `var(--primary)` и `var(--secondary)`. Красный: сегодня там литеральные `#3b82f6` и `#10b981`.
- [ ] T019 [US3] Заменить два литеральных hex на переменные в `frontend/src/components/analytics/widgets/activity-timeline-widget.tsx:67,74`
- [ ] T020 [P] [US3] Перевести `frontend/src/components/ui/chip.tsx` и `frontend/src/components/ui/streak-pill.tsx` на `var(--secondary)`, не трогая цвета успеха, ошибки и предупреждения
- [ ] T021 [US3] Расширить сквозной тест в `frontend/e2e/journeys/brand-settings.spec.ts`: после сохранения пары цветов второй виден на `/admin/analytics`

---

## Phase 6: User Story 4 — Вкладка браузера принадлежит школе (P2)

**Goal**: заголовок и значок вкладки от школы, без мигания в первом кадре

**Independent Test**: задать название и значок, прочитать `document.title`; перезагрузить и убедиться, что «GrassLMS» не мелькает

- [ ] T022 [US4] Написать падающий сквозной тест в `frontend/e2e/journeys/brand-tab.spec.ts`: `document.title` начинается с названия школы, значок вкладки — заданный. Красный: сегодня заголовок статический для всех.
- [ ] T023 [US4] Добавить встроенный сценарий в `<head>` в `frontend/src/app/layout.tsx` по образцу уже работающего переключателя темы — чтение до первого кадра
- [ ] T024 [US4] Обновлять заголовок и значок после `/me` в `frontend/src/components/layout/brand-vars.tsx`, если значения разошлись
- [ ] T025 [US4] Создать `frontend/src/components/admin/school-contacts-section.tsx` с полем значка вкладки. Ключи в шесть локалей.

---

## Phase 7: User Story 5 — Ученик входит через страницу своей школы (P2)

**Goal**: `/login?s=slug` показывает бренд, слаг запоминается

**Independent Test**: открыть вход по ссылке школы — виден логотип; войти, выйти, открыть без параметра — бренд остался

- [ ] T026 [P] [US5] Написать падающий сквозной тест в `frontend/e2e/journeys/branded-login.spec.ts`: три случая — со слагом, после входа без слага, с несуществующим слагом (нейтральный экран, ничего не сообщающий о существовании школы)
- [ ] T027 [P] [US5] Показывать бренд на `frontend/src/app/(auth)/login/page.tsx` по слагу из адреса или из `localStorage["school-slug"]`. Ключи в шесть локалей.
- [ ] T028 [P] [US5] Записывать `localStorage["school-slug"]` после успешного входа
- [ ] T029 [US5] **Дописать строку `school-slug` в таблицу на** `frontend/src/app/cookies/page.tsx`. Принцип IV: запись на устройстве без строки в таблице — расхождение продукта и его документов, то есть дефект. Ключи в шесть локалей.

---

## Phase 8: Бэкенд — публичное описание школы (обслуживает US5 и US6)

- [ ] T030 [P] Написать падающий тест в `backend/tests/test_crm_public.py`: ответ по слагу содержит `branding` ровно с четырьмя ключами; контакта поддержки, состава меню и значка вкладки в нём нет; неактивная и несуществующая школа дают одинаковый 404
- [ ] T031 [P] Добавить `branding` в ответ `backend/app/crm/public_router.py:38`
- [ ] T032 [P] Добавить ограничение частоты на `GET /crm/public/{slug}` в `backend/app/crm/public_router.py` — сегодня оно стоит только на POST заявки, а страница входа делает этот адрес горячим
- [ ] T033 [P] Добавить проверки новых полей при сохранении организации: цвета `#rrggbb`, адреса только `https:`, почта обычной проверкой; всё остальное — 422
- [ ] T034 [P] Расширить `PublicSchool` полем `branding` в `frontend/src/lib/api/crm.ts`

---

## Phase 9: User Story 6 — Публичная страница заявки несёт бренд школы (P3)

**Independent Test**: открыть страницу заявки школы с логотипом и цветами, не входя

- [ ] T035 [P] [US6] Написать падающий сквозной тест в `frontend/e2e/journeys/public-enquiry-brand.spec.ts`: логотип и цвета школы видны без входа; отправка заявки работает как прежде
- [ ] T036 [P] [US6] Показывать бренд на `frontend/src/app/s/[slug]/enquire/page.tsx`

---

## Phase 10: User Story 7 — Поддержка ведёт в школу (P3)

**Independent Test**: задать почту — пункт ведёт на `mailto:`; очистить — ведёт на `/support`

- [ ] T037 [US7] Написать падающие тесты в `frontend/src/components/layout/nav-tree.test.ts`: `supportHref` пуст — `/support`; `mailto:`/`https:` — внешний адрес; любая другая схема — считается незаданным
- [ ] T038 [US7] Добавить `supportHref` в `frontend/src/components/layout/nav-tree.ts` по контракту `contracts/ui.md` §4
- [ ] T039 [US7] Передавать контакт школы в `buildNavTree` из `frontend/src/components/layout/sidebar.tsx`
- [ ] T040 [US7] Добавить поля контакта поддержки в `frontend/src/components/admin/school-contacts-section.tsx` с проверкой схемы. Ключи в шесть локалей.
- [ ] T041 [US7] Встроить `school-contacts-section` в `frontend/src/components/admin/org-settings-form.tsx`

---

## Phase 11: Изоляция арендаторов и сохранность нынешнего поведения

- [ ] T042 Написать тест изоляции в `frontend/e2e/journeys/org-settings-isolation.spec.ts`, **начиная с положительного контроля**: суперадмин открывает чужую школу и меняет её цвет — сохраняется; оформление его собственного сеанса не меняется; и только потом — администратор школы получает 404 по чужому идентификатору. Без положительного контроля тест зеленеет на несуществующем экране.
- [ ] T043 Прогнать существующий обход тёмной темы на организации, где не задано ничего: ни одного отличия от нынешнего продукта (FR-034)
- [ ] T044 Проверить, что `org-settings-form.tsx` после выделения секций сократился, а секции не знают про сохранение

---

## Phase 12: Polish

- [ ] T045 Прогнать `npx tsc --noEmit`, `npm test`, `npm run test:e2e`, `pytest` — всё зелёное
- [ ] T046 Пройти [quickstart.md](./quickstart.md) целиком, включая раздел про `document.visibilityState`
- [ ] T047 Открыть PR, указав в теле, какие проверки были продемонстрированы падающими до правки (принцип II)
- [ ] T048 После мержа: дождаться деплоя, проверить в проде вкладку, вход по слагу и настройки школы

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)** → **Phase 2 (Foundational)**: расчёт цвета блокирует всё
- **Phase 3–4 (US1, US2)**: после Phase 2, строго по порядку — обе правят `brand-vars.tsx` и форму
- **Phase 5 (US3)**: после Phase 4 — правит ту же `brand-section.tsx`
- **Phase 6 (US4)**: после Phase 2; трогает `layout.tsx` и заводит `school-contacts-section.tsx`
- **Phase 7 (US5)** и **Phase 8 (бэкенд)**: параллельны друг другу и всему выше — отдельные файлы
- **Phase 9 (US6)**: после Phase 8 (нужен `branding` в публичном ответе)
- **Phase 10 (US7)**: после Phase 6 — делит `school-contacts-section.tsx`
- **Phase 11–12**: после всего

### Узкие места

`org-settings-form.tsx`, `brand-section.tsx` и `school-contacts-section.tsx` —
общие для US2, US3, US4 и US7. Эти истории идут **подряд**, а не параллельно,
иначе правки столкнутся.

### Parallel Opportunities

- T017, T020 внутри US3
- T026, T027, T028 внутри US5
- Вся Phase 8 (T030–T034) параллельна фронтенду
- T035, T036 внутри US6

---

## Implementation Strategy

### MVP

Phase 1 → Phase 2 → Phase 3. На этом продукт уже перестаёт делать текст
нечитаемым — единственный дефект здесь, который сегодня вредит молча.

### Инкрементально

1. Setup + Foundational → расчёт есть, дублей нет
2. US1 → цвет читаем (MVP)
3. US2 → администратор видит, что делает
4. US3 → второй цвет перестаёт быть пустой ручкой
5. US4, US5, US6, US7 → охват бренда
6. Изоляция и сохранность → PR

---

## Notes

- Коммит после каждой задачи или связной группы.
- Тест сначала красный. В теле PR — какой именно и против чего.
- Проверка в браузере: `document.visibilityState` первой строкой.

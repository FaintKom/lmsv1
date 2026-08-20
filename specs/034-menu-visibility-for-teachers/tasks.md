---

description: "Task list for 034-menu-visibility-for-teachers"
---

# Tasks: Спрятанный пункт меню спрятан и у преподавателя

**Input**: Design documents from `/specs/034-menu-visibility-for-teachers/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[contracts/auth-me.md](./contracts/auth-me.md), [quickstart.md](./quickstart.md)

**Tests**: тесты входят в состав задачи — владелец потребовал тест изоляции,
открытый положительным контролем. Конституция (принцип II) требует показать
контроль красным до правки.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: можно делать параллельно (разные файлы, нет зависимостей)
- **[Story]**: к какой пользовательской истории относится задача

## Path Conventions

Веб-приложение: `backend/app/`, `backend/tests/`, `frontend/src/`.

---

## Phase 1: Setup

**Purpose**: то, без чего не запустятся тесты

- [x] T001 Поднять PostgreSQL для тестов: `docker compose up -d db` (образ `pgvector/pgvector:pg16`, см. `docker-compose.yml`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: карта видимости приезжает вместе с сессией. Пока этого нет,
ни одна история не работает.

**Порядок внутри фазы обязателен**: тест пишется до правки и показывается
красным — иначе он не доказывает ничего (конституция, принцип II).

- [x] T002 Написать тест `test_me_returns_org_menu_visibility` в `backend/tests/test_auth.py`: школа спрятала `gradebook`, преподаватель этой школы получает `org_branding["menu_visibility"] == {"gradebook": False}`
- [x] T003 Прогнать T002 на текущем коде и убедиться, что он красный (ключа `menu_visibility` в ответе нет); записать результат для описания PR
- [x] T004 Добавить `"menu_visibility": org_settings.get("menu_visibility") or {}` в `org_branding` эндпоинта `/me` в `backend/app/auth/router.py`
- [x] T005 Прогнать T002 снова — зелёный

**Checkpoint**: ответ `/auth/me` несёт карту видимости своей школы

---

## Phase 3: User Story 1 — Преподаватель не видит спрятанный пункт (P1) 🎯 MVP

**Goal**: спрятанный школой пункт исчезает из меню преподавателя

**Independent Test**: спрятать «Оценки» под администратором, войти
преподавателем той же школы, пункта в меню нет

- [x] T006 [P] [US1] Добавить необязательное поле `menu_visibility?: Record<string, boolean>` в интерфейс `OrgBranding` в `frontend/src/stores/auth-store.ts` (необязательное — окно выката, когда фронт новый, а бэкенд ещё старый)
- [x] T007 [US1] Удалить `useState` для `menuVisibility` и `useEffect` с запросом `/admin/organizations/{org_id}` в `frontend/src/components/layout/sidebar.tsx`
- [x] T008 [US1] Переписать `isMenuVisible` в `frontend/src/components/layout/sidebar.tsx` на чтение из хранилища: `branding.menu_visibility?.[key] !== false`
- [x] T009 [US1] Проверить в браузере по шагам 1–4 из [quickstart.md](./quickstart.md): под преподавателем спрятанного пункта нет
- [x] T010 [US1] Проверить на вкладке сети, что запроса к `/admin/organizations/…` со страницы преподавателя больше нет — ни 200, ни 403 (SC-003)

**Checkpoint**: US1 работает и проверена в браузере

---

## Phase 4: User Story 2 — Настройки чужой школы не видны (P1)

**Goal**: карта одной школы не приезжает участнику другой

**Independent Test**: школа A прячет `gradebook`; преподаватель школы B
получает пустую карту

- [x] T011 [US2] Написать тест `test_me_menu_visibility_is_own_org_only` в `backend/tests/test_auth.py`: настройка задана школе `org`, преподаватель школы `org2` (через `_make_user(db, org2, UserRole.teacher)`) получает `menu_visibility == {}`
- [x] T012 [US2] Убедиться, что тест из T011 стоит в файле после положительного контроля (T002) и читается как пара: сначала «свою карту получил», потом «чужую не получил»

**Checkpoint**: изоляция закреплена тестом, который не зеленеет на пустом ответе

---

## Phase 5: User Story 3 — Изменение доходит без перезагрузки (P2)

**Goal**: администратор видит результат сохранения сразу

**Independent Test**: снять галочку, сохранить, пункт исчезает без обновления
страницы

- [x] T013 [US3] Проверить в браузере по шагам 1–2 из [quickstart.md](./quickstart.md): после «Сохранить» пункт исчезает из меню администратора без перезагрузки (работает за счёт `fetchUser()` в `frontend/src/app/(admin)/admin/settings/page.tsx`)

**Checkpoint**: все три истории работают

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T014 [P] Написать тест `test_me_menu_visibility_defaults_to_empty` в `backend/tests/test_auth.py`: школа ничего не настраивала — карта `{}`, не `null`
- [x] T015 Гейты бэкенда: `cd backend && ruff check . && python -m pytest`
- [x] T016 Гейты фронтенда: `cd frontend && npm run lint && npx tsc --noEmit && npm test`
- [ ] T017 Открыть PR с описанием, где сказано: тест T002 показан красным до правки (принцип II), лишних запросов не добавилось, права записи не менялись

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: без зависимостей
- **Foundational (Phase 2)**: блокирует все истории; внутри фазы порядок
  T002 → T003 → T004 → T005 строгий
- **US1 (Phase 3)**: после Phase 2
- **US2 (Phase 4)**: после Phase 2, независима от US1 — тест бэкенда,
  фронтенда не касается
- **US3 (Phase 5)**: после Phase 3, потому что проверяется то же меню
- **Polish (Phase 6)**: после всего

### Parallel Opportunities

- T006 (хранилище) и T011/T014 (тесты бэкенда) — разные файлы, идут
  параллельно
- T007 и T008 — один файл, только последовательно
- US2 целиком независима от US1: один разработчик может закрывать тесты
  изоляции, пока другой правит меню

---

## Implementation Strategy

MVP — Phase 1 + Phase 2 + Phase 3: карта приезжает и меню преподавателя ей
подчиняется. Phase 4 закрепляет изоляцию тестом, Phase 5 подтверждает
побочный выигрыш, который правка даёт бесплатно.

Правка мелкая, поэтому разбиение на коммиты по фазам не обязательно: один
коммит бэкенда с тестами, один фронтенда.

## Notes

- Ветка идёт параллельно `specs/033`, который тоже правит
  `frontend/src/components/layout/sidebar.tsx`. Правка держится в одном месте
  файла (T007, T008 рядом), чтобы слияние осталось дешёвым.
- Тесты живут в `backend/tests/test_auth.py`, а не в
  `backend/tests/test_cross_org_isolation.py`: там доступ к чужому объекту по
  идентификатору, здесь идентификатора в запросе нет.

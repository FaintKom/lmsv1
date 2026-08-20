# Implementation Plan: Нижние вкладки говорят на языке ученика

**Branch**: `claude/objective-aryabhata-130102` | **Date**: 2026-08-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/034-mobile-tabs-i18n/spec.md`

## Summary

`mobile-tab-bar.tsx` не вызывает `useTranslation()` вовсе: пять подписей
лежат в двух массивах прямо в коде. Правка — вызвать хук и подставить шесть
уже существующих ключей `nav.*`, после чего убрать файл из
`i18n-allowlist.ts`, иначе третья проверка ратчета уронит CI.

Файлы локалей не трогаем. Все шесть ключей проверены во всех шести
словарях до написания плана:

| Ключ | en | es | ru | tr | de | uk |
|---|---|---|---|---|---|---|
| `nav.dashboard` | Dashboard | Panel | Главная | Panel | Dashboard | Головна |
| `nav.courses` | Courses | Cursos | Курсы | Kurslar | Kurse | Курси |
| `nav.assignments` | Assignments | Tareas | Задания | Ödevler | Aufgaben | Завдання |
| `nav.review` | Review | Revisión | Проверка | İnceleme | Bewertung | Перевірка |
| `nav.progress` | Progress | Progreso | Прогресс | İlerleme | Fortschritt | Прогрес |
| `nav.profile` | Profile | Perfil | Профиль | Profil | Profil | Профіль |

## Technical Context

**Language/Version**: TypeScript 5 (strict), React 19, Next.js 16 App Router
**Primary Dependencies**: `@/lib/i18n/context` — тот же `useTranslation`,
которым уже пользуется `sidebar.tsx:87`
**Storage**: N/A
**Testing**: Vitest — `no-hardcoded-strings.test.ts` (ратчет),
`translations.test.ts` (паритет шести локалей); проверка в браузере на 375 px
**Target Platform**: мобильный веб, панель под `md:hidden`
**Project Type**: web (правка только во фронтенде)
**Constraints**: ширина 375 px, пять вкладок по `flex-1` — на подпись
приходится около 67 px при `text-xs`
**Scale/Scope**: два файла, ноль новых ключей, ноль миграций

## Constitution Check

| Принцип | Как соблюдён |
|---|---|
| I. Изоляция арендаторов | Не затронута: правка не читает и не пишет ни одного id. |
| II. Тест, способный упасть | Ратчет уже умеет падать — и упадёт сразу, если оставить запись в allowlist после добавления хука. Именно это и проверю: сначала красный, потом зелёный. |
| III. Сервер судит ответы | Не затронуто. |
| IV. Продукт и документация говорят одно | Панель и боковое меню после правки называют раздел одним словом — расхождение уходит. |
| V. Наименьшее изменение | Ноль новых ключей, ноль новых компонентов, минус одна строка из allowlist. |

Нарушений нет, раздел Complexity Tracking не нужен.

## Project Structure

### Documentation (this feature)

```text
specs/034-mobile-tabs-i18n/
├── spec.md
├── plan.md              # этот файл
├── quickstart.md        # как проверить
├── checklists/
│   └── requirements.md
└── tasks.md             # /speckit-tasks
```

`research.md`, `data-model.md` и `contracts/` не создаются: неизвестных нет
(таблица ключей выше — результат проверки, а не план проверки), сущностей
нет, наружу правка ничего не показывает. Принцип V.

### Source Code

```text
frontend/src/
├── components/layout/
│   ├── mobile-tab-bar.tsx      # ← хук + шесть t("nav.*")
│   └── sidebar.tsx             # образец: те же ключи, те же значки
└── lib/i18n/
    ├── context.tsx             # useTranslation
    ├── i18n-allowlist.ts       # ← минус строка 119
    └── no-hardcoded-strings.test.ts
```

**Structure Decision**: правка целиком во `frontend/src`, бэкенда не
касается.

## Design

**Хук вызывается один раз, массив собирается в теле компонента.** Массив
`tabs` уже вычисляется при каждом рендере, а `useTranslation` перерисовывает
подписчиков при смене языка — значит FR-002 выполняется сам собой, без
`useMemo` и без `key` на панели.

**Длина подписи — единственный риск.** `Assignments` (en) и `Fortschritt`
(de) — самые длинные, около 65 px при `text-xs`, а места примерно 67.
Порядок действий: сначала правка без единой строки CSS, затем замер в
браузере на 375 px на всех шести языках. Если хоть одна подпись переносится
или обрезается — держим её в одну строку уменьшением кегля на этой панели,
а не переносом и не многоточием. Решение принимается по замеру; заранее CSS
не трогаем.

**Ратчет снимаем в том же коммите.** Порядок обратный привычному: сначала
добавить хук и увидеть красный тест («remove them from i18n-allowlist.ts to
ratchet down»), потом убрать строку и увидеть зелёный. Красный прогон —
доказательство, что проверка живая (принцип II).

## Phase 1 output

- [quickstart.md](./quickstart.md) — команды и сценарии проверки.

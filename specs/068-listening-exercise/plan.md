# 068 — аудирование: план

**Ветка**: `feat/listening-exercise` · **Дата**: 2026-08-31 · **Спека**:
[spec.md](./spec.md)

## Суть

Аудирование — это чтение, где вместо текста запись. Схема вопросов, проверка
(`_grade_reading_detail`), срезание ключа в роутере и запись попытки уже
написаны и подходят без единой правки. Требование FR-003 — «новых правил
проверки не появляется» — не только сохраняет поведение, но и убирает три
четверти работы.

Настройка задания:

```json
{
  "audio_url": "/api/v1/courses/audio/0f1e2d3c4b5a69788796a5b4c3d2e1f0.mp3",
  "questions": [
    {
      "question": "¿Dónde vive Marta?",
      "type": "multiple_choice",
      "options": [{ "id": "a", "label": "En Madrid", "is_correct": true }]
    }
  ],
  "max_plays": 2,
  "transcript": "— Hola, me llamo Marta y vivo en Madrid…"
}
```

Студенту уходит `audio_url`, `questions` без ключей и `max_plays`.
`transcript` не уходит.

## Три решения, которые пришлось принять

### 1. Расшифровка приходит отдельным запросом

Расшифровка содержит все ответы, поэтому в настройке задания, которая уходит
студенту, ей не место (принцип III конституции, specs/004).

Существующий механизм показа ответа не годится: `_correct_answer` прикрепляется
к работе только на пути «попытки кончились» (`exercises/service.py:753`), а
расшифровка нужна и тому, кто решил. Переделывать общий путь ради одного типа —
трогать все двадцать шесть.

Поэтому `GET /exercises/{id}/transcript`: отдаёт расшифровку, если у студента
есть сданная работа с `passed=True` либо попытки исчерпаны. Иначе 404 —
существование расшифровки не подтверждается. Гейт на сервере, интерфейс к нему
не причастен.

### 2. Лимит прослушиваний считает клиент, и редактор об этом говорит

Аудиофайл отдаётся ссылкой. Сколько раз его проиграли, сервер знать не может:
браузер кэширует файл, перемотка запроса не делает, а скачать его может кто
угодно. Считать прослушивания серверными запросами — придумать себе цифру.

Значит счётчик живёт в плеере и обнуляется перезагрузкой страницы. Это
договорённость со студентом, и редактор пишет это словами рядом с полем, чтобы
преподаватель не строил на ней экзамен.

### 3. Плеер живёт внутри ReadingV2

Разница между чтением и аудированием — одна панель слева. Отдельный компонент
повторил бы шаги по вопросам, сердечки, серию, серверную проверку и разбор
конфигурации — триста строк ради тега `<audio>`.

`ReadingV2` получает необязательный `audioUrl` (плюс `maxPlays` и расшифровку) и
рисует плеер вместо панели с текстом. Чтение не меняется: без `audioUrl`
компонент ведёт себя ровно как сейчас.

## Изменения по файлам

### Бэкенд

| Файл | Что |
|---|---|
| `app/exercises/models.py` | `listening = "listening"` в `ExerciseType`, префикс `"LI"` |
| `alembic/versions/<rev>_add_listening_type.py` | `ALTER TYPE exercisetype ADD VALUE IF NOT EXISTS 'listening'` — рецепт из `p4q5r6s7t8u9`, повторный прогон безопасен |
| `app/submissions/service.py` | `_ANSWER_KEY_BY_TYPE["listening"] = "questions"`; обе диспетчеризации (`grade_interactive`, `grade_interactive_detail`) — на существующий `_grade_reading_detail` |
| `app/exercises/service.py` | `listening` в перечень типов, идущих в `_submit_interactive` (рядом с `reading`) |
| `app/exercises/router.py` | `transcript` — в список ключей, которые срезаются из конфига; новый `GET /{exercise_id}/transcript` |
| `app/common/file_validation.py` | `.mp3 .m4a .ogg .wav` с сигнатурами, `AUDIO_EXTENSIONS` |
| `app/courses/router.py` | `POST /upload-audio` (25 МБ, категория `AUDIO`) и `GET /audio/{filename}` — зеркало картинок |

Срезание ответов из `questions` уже общее по ключу `questions`
(`exercises/router.py:843`) — правки не требует, требует теста, который это
докажет.

### Фронтенд

| Файл | Что |
|---|---|
| `lib/api/exercises.ts` | тип в объединении, подпись, цвет, строка в `EXERCISE_TYPE_META` (группа `languages`, иконка `Headphones`); функция запроса расшифровки |
| `lib/exercises/v2-adapter.ts` | `listening` в `V2_LIVE_TYPES` |
| `lib/exercises/answer-key.ts`, `components/exercises/live-preview-state.ts` | `listening: "questions"` |
| `components/exercises/exercise-renderer.tsx` | тип в объединении |
| `components/exercises/v2-exercise-live.tsx` | ветка `case "listening"` — тот же разбор вопросов, что у чтения, плюс `audioUrl`, `maxPlays` и запрос расшифровки по завершении |
| `components/exercises/v2/reading-v2.tsx` | необязательные `audioUrl`, `maxPlays`, расшифровка; плеер вместо панели с текстом |
| `components/exercises/exercise-config-panel.tsx` | настройка по умолчанию и ветка редактора |
| `app/(admin)/admin/content-library/[exerciseId]/page.tsx` | то же для страницы правки |
| `app/(admin)/admin/content-library/[exerciseId]/exercise-config-editors.tsx` | `ListeningConfigEditor`: поле записи с загрузкой (образец — `MapPinDropConfigEditor`), лимит, расшифровка, дальше — существующий список вопросов чтения |
| `lib/i18n/locales/{en,es,ru,tr,de,uk}.ts` | строки плеера во все шесть локалей |

### Тесты и стенд

| Файл | Что |
|---|---|
| `qa/exercise-fixtures.json` | образец задания — иначе парити-тесты красные |
| `lib/api/exercises.qa-parity.test.ts` | `listening` в `ALL_TYPES` |
| `backend/tests/test_submissions.py` | проверка ответов через существующий грейдер |
| `backend/tests/test_exercises_integrity.py` | студенту не уходит ни ключ вопроса, ни расшифровка |
| `backend/tests/test_exercises_integrity.py` | `GET /transcript`: 404 до завершения, текст после, чужая школа — 404 |

## Проверка конституции

- **I. Изоляция арендаторов.** Эндпоинт расшифровки берёт задание тем же
  `_get_exercise_with_relations`, что и остальные, — чужая школа читается как
  404. Загрузка записи ограничена той же ролью, что загрузка картинок.
- **II. Тест, способный упасть.** Тест расшифровки открывается положительным
  случаем: сперва 404 до завершения, затем текст после. Тест срезания ключа
  ставится на задание, где ключ заведомо есть.
- **III. Судья ответа — сервер.** Проверяет `_grade_reading_detail`.
  Расшифровка уходит только после завершения и только с сервера.
- **IV. Продукт и документация говорят одно.** Число типов заданий названо в
  README и на посадочной странице — обновить вместе с кодом.

## Чего план не покрывает

Плеер на телефоне проверяется руками: автотест не скажет, попадает ли палец в
кнопку. Прогон по FR-008 — вручную, в узком окне.

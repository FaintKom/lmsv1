# 068 — аудирование: задачи

Порядок такой: сервер целиком, потом клиент. Клиент нечем проверить, пока тип
не заводится в базе.

## Сервер

- [ ] **T1** `ExerciseType.listening` и префикс `"LI"` — `app/exercises/models.py`
- [ ] **T2** Миграция: `ADD VALUE IF NOT EXISTS 'listening'`. Перед тем как
      писать, сверить `alembic heads` — параллельная сессия могла отвести свою
      от той же головы
- [ ] **T3** Проверка ответов через существующий `_grade_reading_detail`,
      `_ANSWER_KEY_BY_TYPE["listening"] = "questions"` — `app/submissions/service.py`
- [ ] **T4** `listening` рядом с `reading` в перечне типов `_submit_interactive` —
      `app/exercises/service.py`
- [ ] **T5** `transcript` срезается из настройки, уходящей студенту —
      `app/exercises/router.py`
- [ ] **T6** `GET /exercises/{id}/transcript`: 404, пока работа не завершена;
      текст, когда завершена; чужая школа — 404
- [ ] **T7** `.mp3 .m4a .ogg .wav` с сигнатурами и `AUDIO_EXTENSIONS` —
      `app/common/file_validation.py`
- [ ] **T8** `POST /courses/upload-audio` и `GET /courses/audio/{filename}` —
      зеркало картинок, 25 МБ, категория `AUDIO`
- [ ] **T9** Тесты: проверка ответов, срезание ключа и расшифровки, гейт
      расшифровки, отказ на файл не того вида. Каждый открывается положительным
      случаем (принцип II)

## Клиент

- [ ] **T10** Реестр типа: объединение, подпись, цвет, `EXERCISE_TYPE_META`,
      `V2_LIVE_TYPES`, `answer-key.ts`, `live-preview-state.ts`,
      `exercise-renderer.tsx`
- [ ] **T11** `ReadingV2`: необязательные `audioUrl`, `maxPlays`, расшифровка;
      плеер вместо панели с текстом. Чтение без `audioUrl` не меняется
- [ ] **T12** Ветка `case "listening"` в `v2-exercise-live.tsx`, запрос
      расшифровки по завершении
- [ ] **T13** `ListeningConfigEditor` и его подключение в двух местах
      (`exercise-config-panel.tsx`, страница правки задания)
- [ ] **T14** Строки во все шесть локалей — `en es ru tr de uk`

## Стенд и документация

- [ ] **T15** Образец в `qa/exercise-fixtures.json` и `listening` в `ALL_TYPES`
      парити-теста
- [ ] **T16** 26 типов → 27: README (2 места), страница условий, четыре ключа
      в шести локалях, два комментария в коде

## Проверка

- [ ] **T17** `pytest` против настоящего Postgres, `vitest`, `tsc --noEmit`
- [ ] **T18** Руками: завести задание с записью, пройти его студентом, увидеть
      расшифровку после завершения и не увидеть до
- [ ] **T19** Руками в узком окне: плеер и вопросы помещаются, кнопки
      нажимаются пальцем (FR-008)
- [ ] **T20** PR, дождаться зелёного CI, влить, проследить выкладку

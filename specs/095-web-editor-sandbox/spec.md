# 095 — превью веб-редактора без allow-same-origin

**Ветка**: `fix/web-editor-sandbox-095` · **Создано**: 2026-10-08

## Что не так

`WebEditorExercise` показывал превью в
`<iframe srcDoc sandbox="allow-scripts allow-same-origin">`. С двумя флагами
сразу sandbox ничего не ограничивает: скрипт в srcdoc получает origin LMS. Он
может звать `/api/v1/*`, и браузер приложит httpOnly-сессию того, кто смотрит.
Ещё он читает localStorage и снимает атрибут `sandbox` со своего фрейма через
`frameElement`.

Код в превью пишет не всегда тот, кто его открывает. Пути, где они расходятся:

- **Ученик открывает задание.** Превью сразу исполняет `starter_html`,
  `starter_css` и `starter_js` из конфига, а их пишет автор задания.
- **Админ или методист смотрит чужое задание** в библиотеке контента или в
  редакторе урока. `LivePreview` рендерит тот же компонент через
  `ExercisePreview`, поэтому код автора исполняется с сессией проверяющего.
  Учитель может вписать скрипт в `starter_js`, и он выполнится от имени
  супер-админа, когда тот откроет задание.

Пути «код ученика в сессии учителя» сейчас нет. Отправленный `web_code`
нигде не рендерится. Черновики живого урока учитель видит в `<pre>` как
текст (`review-inspector.tsx`, `student-drawer.tsx`). Но любой будущий
просмотрщик отправок, собранный на этом компоненте, такой путь откроет.

## Что меняется

- `sandbox="allow-scripts"`, без `allow-same-origin`. Документ превью
  получает opaque origin (`null`), и ни cookie, ни API, ни хранилище LMS ему
  не видны.
- Тест `web-editor-exercise.test.tsx` требует, чтобы в sandbox стоял ровно
  `allow-scripts`. Любой добавленный флаг его роняет: расширить права можно
  только сознательно, вместе с этой спекой.

## Чего правка не закрывает

Ещё два iframe с `allow-same-origin` исполняют чужой код на origin LMS. Им
нужна своя спека: флаг там просто так не снять.

- `scorm-package-exercise.tsx` грузит загруженный учителем пакет с
  `/api/v1/scorm-import/packages/.../files/`, то есть с того же origin.
  SCORM-контенту нужен `API` у родителя, поэтому лечится отдельным origin
  для файлов пакетов или мостом через `postMessage`.
- `presentation-embed.tsx` принимает любой http(s) URL, включая адреса
  самой LMS, например файл из SCORM-пакета.

У `sanitize-html.ts` список хостов закрытый (YouTube, Vimeo, GeoGebra и
другие), `allow-same-origin` даёт им только их собственный origin.

## Что может сломаться

Превью собирается из srcdoc со встроенными CSS и JS, ему не нужен общий
origin с LMS. Перестанут работать только `localStorage`, `sessionStorage` и
`document.cookie` в коде самого ученика: они бросают `SecurityError`, и
превью покажет его красной строкой, как любую ошибку. `fetch` к внешним API
с `Access-Control-Allow-Origin: *` работает.

## Проверка

- Тест падал на старом коде (`allow-same-origin` в списке) и проходит на
  новом. Vitest по `components/exercises/`: 108 из 108.
- Тот же шаблон srcdoc с `sandbox="allow-scripts"` открыт в браузере:
  скрипт выполнился, CSS применился, `location.origin` равен `null`.
  `parent.document`, `document.cookie` и `localStorage` бросили
  `SecurityError`, `frameElement` равен `null`.

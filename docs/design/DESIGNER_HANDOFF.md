# GrassLMS — Designer Hand-off

**Контекст для дизайнера.** Список того, что ещё нужно нарисовать /
дополировать после того, как разработчик прогнал DS-миграцию по всему
коду.

**Где смотреть текущее состояние:** https://staging.grasslms.online
**Где брать ориентиры:** `docs/design/mockups/*.html` — открой в
браузере.
**Где взять токены:** `docs/design/design-system.html`. Все цвета
доступны как CSS-переменные: `var(--green-600)`, `var(--sun-400)`,
`var(--coral-500)`, `var(--ink-700)` и т.д.

## Тестовые аккаунты (staging)

| Роль | Email | Пароль |
|---|---|---|
| Студент | student@grasslms.online | Student2026! |
| Учитель | teacher@grasslms.online | Teacher2026! |
| Методист | methodist@grasslms.online | Methodist2026! |
| Демо-ученик | alex@grasslms.online | Alex2026! |
| Супер-админ | faintkom@gmail.com | Admin2026! |

В курсе **DS Showcase Course** есть 14 уроков, по одному на каждый
тип упражнений — открывай их под student@, чтобы увидеть текущее
состояние каждого экрана.

## Как читать пункты

Каждый: **Что / Где / Сейчас / Хочется / Токены**.

---

# Раздел A — Типы упражнений (9 шт)

Критичный блок: для каждого типа есть рендер, но визуальные
edge-cases не нарисованы — на пустых данных смотрится бедно.

## A1. Quiz container — пустое состояние

- **Что:** учитель создал Quiz, но ещё не добавил вопросы.
- **Где:** `/courses/<id>/lessons/<quiz>`
- **Сейчас:** заголовок → ничего → кнопка Submit. Пусто.
- **Хочется:** empty-state блок с иллюстрацией, текст «Учитель ещё
  не добавил вопросы», CTA «Назад к курсу». Когда вопросы появятся —
  стек вопросов с radio-buttons.
- **Токены:** ink-100 background, ink-500 текст, sun-300 illustration.

## A2. Translation — hero / language badges

- **Что:** перевод текста с языка на язык.
- **Где:** `/courses/<id>/lessons/<translation>`
- **Сейчас:** `?  →  ?` / "No text provided" / textarea «Type your ?
  translation…», disabled submit.
- **Хочется:**
  - Hero card: source flag → target flag (или 2-буквенные коды).
  - Source text — большой sans-serif italic.
  - Подсказки (hints) как chips.
  - Textarea placeholder «Type your translation in {target}…».
  - Submit `var(--green-600)`.
- **Токены:** green-50 hero, ink-900 source, sun-100 hint chips.

## A3. Sentence Builder — drop-area + word bank

- **Что:** студент собирает предложение из слов.
- **Где:** `/courses/<id>/lessons/<sentence>`
- **Сейчас:** «YOUR SENTENCE» пустое поле, «AVAILABLE WORDS» / «All
  words used» — пустота.
- **Хочется:**
  - Drop-zone: dashed `border-green-300`, placeholder из 4-5
    точек-плейсхолдеров.
  - Word bank — горизонтальный ряд chips (`bg-green-50
    border-green-300`).
  - При перетаскивании — «след» слева от drop-zone.
  - Reset как outline / ghost.
- **Токены:** dashed `border-green-300`, chip `bg-green-50 text-green-700`.

## A4. Dialogue — speaker bubbles + контекст

- **Что:** студент дополняет фразу в диалоге.
- **Где:** `/courses/<id>/lessons/<dialogue>`
- **Сейчас:** input + большая «Complete Dialogue». Реплики не видны.
- **Хочется:**
  - Сверху серый «Context» панель (`bg-ink-50` italic).
  - Реплики как chat bubble: A слева (`bg-green-100`), B справа
    (`bg-sun-100`). Аватар-инициал в кружке.
  - Пропущенная реплика — input в стиле bubble (тот же фон, dashed
    border).
  - Submit под последней bubble.
- **Токены:** green-100 / sun-100 для speakers.

## A5. Reading — multi-choice question card

- **Что:** студент читает текст и отвечает на вопросы.
- **Где:** `/courses/<id>/lessons/<reading>`
- **Сейчас:** «📖 READING PASSAGE» card OK, но сами вопросы пропадают,
  только textarea «Type your answer…».
- **Хочется:**
  - Каждый вопрос — отдельная карточка (white, rounded-xl,
    `border-ink-100`). Внутри: номер в pill (`bg-green-100
    text-green-700`), текст вопроса, варианты как radio-rows или
    textarea.
  - Стек вопросов с разделителями.
  - Common submit внизу.
- **Токены:** green-100 номера, ink-200 разделители.

## A6. Conjugation — таблица форм глагола

- **Что:** студент спрягает глагол.
- **Где:** `/courses/<id>/lessons/<conjugation>`
- **Сейчас:** красивый зелёный hero, но input row не видно.
- **Хочется:**
  - Под hero — таблица 2 колонок: pronoun слева, input справа,
    зебра-фон.
  - Ошибки `border-coral-500` + label, правильные `border-green-500`
    + check.
  - Check Answers (default green) + Reset (ghost).
- **Токены:** ink-50 zebra, coral-500 / green-500 рамки.

## A7. Code Challenge — empty starter state

- **Что:** code-challenge без starter-кода.
- **Где:** `/courses/<id>/lessons/<code>`
- **Сейчас:** пустой Monaco editor + Run / Submit / Output / Tests.
- **Хочется:**
  - Если starter пустой — закомментированный placeholder в editor
    («// Write your solution here…») в muted цвете.
  - Над editor — chip с языком + бейдж «memory: 256MB · timeout: 10s».
  - Tests-таб — empty state «No public tests yet».
- **Токены:** ink-300 placeholder-комментарии, ink-100 бейджи.

## A8. File upload — preview thumbnails

- **Что:** студент загружает PDF/изображение.
- **Где:** `/courses/<id>/lessons/<file_upload>`
- **Сейчас:** dropzone + Upload File. После загрузки — только имя.
- **Хочется:**
  - Preview карточка: PDF/image/Word иконка, имя, размер, кнопка
    «Replace».
  - Прогресс-бар во время загрузки (`bg-green-500`).
  - Limit-инфо («Max 10MB · PDF, PNG, JPG, DOC») под dropzone.
- **Токены:** green-500 progress, ink-100 preview.

## A9. Math Interactive — empty hero для new templates

- **Что:** работает coordinate plane; для других templates fallback
  бледный.
- **Где:** `/courses/<id>/lessons/<math>` (не coordinate)
- **Сейчас:** заголовок + sub, без явного hero.
- **Хочется:** общий «math hero» с template-name бейджем
  (`bg-sun-100`), instructions, fullscreen-toggle справа.
- **Токены:** sun-100 chip, ink-700 instructions.

---

# Раздел B — Page-level chrome (10 шт)

## B1. Course catalog — hero + поиск + категории

- **Где:** `/courses`
- **Mock-up:** `mockups/course-catalog.html`
- **Сейчас:** только h1 «Courses» + sub + список карточек.
- **Хочется:** hero с search (`bg-paper-2 border-ink-200 rounded-xl`),
  ниже chips-фильтры (Programming, Math, Languages, SAT…), Featured
  course большой карточкой.
- **Токены:** green-100 active chip, sun-300 highlight.

## B2. Course detail — обложка, prerequisites, instructor

- **Где:** `/courses/<id>`
- **Mock-up:** `mockups/lesson-player.html` верх
- **Сейчас:** зелёный gradient card с DEMO + title + краткое описание
  + counts. Маленькое.
- **Хочется:**
  - Cover image area 16:9 сверху в card.
  - Под title — instructor row: аватар + имя + role bage.
  - Prerequisites chips.
  - Кнопка Enroll вместо disabled «Enrolled».
  - Module/Lesson counts в «What you'll learn» с иконками.
- **Токены:** green-50 prereq chip, ink-700 instructor name.

## B3. Lesson sidebar — анимации, progress, next-up

- **Где:** левая колонка lesson-player.
- **Сейчас:** plain tree, активный — green bg.
- **Хочется:**
  - Каждый module — collapsible (chevron справа), текущий раскрыт.
  - Каждый lesson — circle-icon: ○ (не пройден), ● (пройден),
    ◐ (в процессе).
  - «NEXT UP» badge на следующем lesson.
  - Course progress bar внизу sidebar.
- **Токены:** green-500 ●, green-300 ◐.

## B4. Newcomer checklist celebration

- **Где:** `/dashboard` для нового юзера.
- **Сейчас:** карточка «Getting Started» с 4 пунктами + progress.
- **Хочется:**
  - Анимированный checkmark с конфетти при completion.
  - При все-готово — «You're all set!» + celebration illustration.
  - Progress bar toy-style: round + sun-300 fill.
- **Токены:** green-500 check, sun-400 progress.

## B5. Streak widget (sticky-note style)

- **Где:** правая колонка dashboard.
- **Mock-up:** `mockups/student-dashboard.html` `.streak-card`.
- **Сейчас:** одна KPI-карточка «Streak: 0 days».
- **Хочется:**
  - Sticky-note: `bg-paper-2 rounded-2xl shadow-pop`.
  - Огромная цифра (`text-coral-500 text-6xl font-extrabold`) +
    подпись «day streak».
  - Огонёк-иконка справа в круге `bg-coral-500 shadow-pop-coral`.
  - Week-strip из 7 квадратиков (M-S): пройденные `bg-coral-500`,
    текущий dashed, будущие `bg-ink-50`.
  - Микро-копи «You're on fire! 🔥» / «Don't break it».
- **Токены:** coral-500, paper-2, shadow-pop-coral.

## B6. Continue Learning — course thumbnails

- **Где:** dashboard после hero.
- **Mock-up:** `.continue-grid` / `.ccard` в student-dashboard.html.
- **Сейчас:** простые CourseCard.
- **Хочется:**
  - 16:9 cover с radial-gradient по типу: algebra=green, JS=dark,
    spanish=coral, SAT=sun.
  - Subtitle (Module · Lesson) + тонкий progress bar `bg-green-500`.
  - Title bold + next-lesson hint italic.
  - Hover: lift -2px + `shadow-md` + `border-green-300`.
- **Токены:** category gradients per курс.

## B7. Calendar — Custom event цвет

- **Где:** `/calendar` легенда.
- **Сейчас:** Custom = фиолетовый, выбивается.
- **Хочется:** заменить на:
  - A: `var(--ink-700)` + узор (полосочки) — нейтрально.
  - B: `var(--sun-700)` — горчичный, в палитре.
- **Токены:** ink-700 или sun-700.

## B8. Settings → Branding live preview

- **Где:** `/admin/settings`
- **Сейчас:** color picker + hex + bar превью. Не показывает «как в
  UI».
- **Хочется:** под пикерами — мини-preview: фейковый sidebar item в
  primary, фейковая secondary кнопка, бейдж в secondary.
- **Токены:** свободно.

## B9. Pricing tier — featured ribbon

- **Где:** `/pricing`
- **Сейчас:** Professional имеет ring + pill «MOST POPULAR». Бледно.
- **Хочется:**
  - Sun-300 ribbon-tag в углу 45° rotate, «MOST POPULAR» белым на
    жёлтом.
  - `shadow-pop` под карточкой.
  - Featured карточка scale-105.
- **Токены:** sun-300, shadow-pop.

## B10. SAT Practice domain — точки палитры

- **Где:** `/sat-practice` Practice by Domain.
- **Сейчас:** inline purple/orange.
- **Хочется:** на DS:
  - Algebra → green-500
  - Advanced Math → green-700
  - Problem Solving & Data → sun-400
  - Geometry & Trig → coral-300
- **Токены:** все из DS.

---

# Раздел C — Глобальная полировка (4 шт)

## C1. Hero font mobile breakpoints

- **Где:** все h1/h2 в `gl-hero-card`.
- **Сейчас:** 36px фикс. Клиппит на узких экранах.
- **Хочется:** breakpoints
  - `< 360px` → 24px
  - `360-640px` → 28px
  - `> 640px` → 36px
- **Где править:** `globals.css` `.gl-hero-card h2`.

## C2. gl-highlight — rotate constraint

- **Что:** жёлтая плашка с rotate(-1deg). На длинных фразах
  (`interactive learning`) криво.
- **Хочется:** 2 модификатора:
  - `.gl-highlight` (rotate -1deg) — для 1-2 слов.
  - `.gl-highlight-flat` (без rotate) — для фраз > 2 слов.
- **Где править:** `globals.css`.

## C3. gl-btn-pop — active transition

- **Сейчас:** `:active` translateY(3px) + box-shadow:none — кнопка
  «мигает».
- **Хочется:** промежуточный shadow `0 1px 0 0 var(--green-700)` —
  плавное «прижатие» вместо прыжка.
- **Где править:** `globals.css` `.gl-btn-pop:active`.

## C4. Dark mode contrast audit

- **Что:** ночной режим работает, но некоторые green-700 на ink-900
  читаются с трудом.
- **Конкретные кандидаты:**
  - `.dark .lms-callout--concept` — green-200 на rgba(green-600, 0.12).
  - Sidebar inactive items — rgba(255,255,255,0.65) на ink-900.
  - `gl-hero-card .eb` — green-200 на gradient.
- **Хочется:** список не-проходящих сочетаний WebAIM AA + рекомендации
  (обычно поднять на 1 ступень в палитре).

---

# Что НЕ ТРОГАЕМ (всё хорошо)

Чтобы не тратил время:

- ✅ Landing hero (gl-highlight + pop button)
- ✅ Pricing main layout (только tier ribbon — B9)
- ✅ Dashboard hero card (gradient + sun CTA)
- ✅ Sidebar нейтрали + green-600 active
- ✅ Lesson player callouts (concept/example/pitfall — все в DS)
- ✅ Matching, Ordering, Categorize, File Upload, Math Interactive
  упражнения — рендер чистый
- ✅ Conjugation hero gradient
- ✅ Code Challenge layout (только empty-state — A7)

---

# Сводка приоритетов

**Критично (визуальная регрессия / пустые состояния):**
- A1, A2, A3, A4, A5, A6 — типы упражнений с кривым empty-state.
- B1 — course catalog hero (лицо платформы).

**Важно (UX-полировка):**
- A7, A8, B2, B3, B4, B5, B6.

**Nice-to-have (мелочи):**
- A9, B7, B8, B9, B10, C1, C2, C3, C4.

---

# Передача результата

- Дизайн в Figma, ссылку сюда + комментарий в каждом frame на пункт
  (A1, B5 и т.д.).
- Нужен новый shade в DS — пиши в комментарии («нужен ink-600 =
  #2a3528»), разработчик добавит в `globals.css`.
- Тестировать готовое: можно деплоить на staging
  https://staging.grasslms.online до промоута на прод. Учётки сверху.

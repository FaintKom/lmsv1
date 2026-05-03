# Сайты-источники механик для GrassLMS

Сводка по 20 сайтам, которые можно адаптировать как новые exercise
types или фичи. Для каждого: что это, как работает, что взять.

**Дата:** 2026-05-03.

**Условные обозначения:**
- ✅ — содержание получено напрямую с сайта.
- ⚠️ — сайт SPA / SSR пустой; описание дополнено публично известным
  материалом + флаг «нужна более глубокая разведка».

---

## 1. GeoChamp (geochamp.app) ⚠️

**Что это:** браузерная гео-викторина (Sporcle/GeoGuessr-стиль).
Игрок ставит точку на карте мира — определяет страну/город/флаг.

**Как работает:** raw-карта Mapbox/Leaflet, поверх — pin-drop ответ,
сравнение с эталонной точкой, скоринг по дистанции (haversine) + время.
Турнирные таблицы.

**Как взять:**
- Новый ExerciseType `map_pin_drop`. Config: `target: {lat, lng}`,
  `tolerance_km: 50`, `time_limit_seconds: 30`.
- Рендер: Leaflet + OpenStreetMap, клик по карте → ответ. Score =
  100 × max(0, 1 - distance / tolerance).
- Хорошо для географии, истории (где это случилось), биологии (ареал
  обитания).

**Глубже:** нужно открыть live-страницу + посмотреть question types
(только flag-to-country? country-shapes? capital-on-map?).

---

## 2. Stanford STORM (storm.genie.stanford.edu) ⚠️

**Что это:** open-source Stanford-проект — генератор Wikipedia-style
статей через multi-agent LLM «беседу» (Conversation, Outline, Article).

**Как работает:** пользователь даёт topic → LLM-агенты спорят между
собой, создают outline, потом разворачивают каждый раздел со
ссылками. Финальный результат — long-form article с цитатами.

**Как взять:**
- Research-style ExerciseType `guided_research`. Студент даёт topic,
  система генерирует outline, студент дописывает каждый раздел руками
  (не AI), система проверяет покрытие источников.
- Важно: для образования отключить full-AI write — иначе студент не
  учится. AI помогает только с outline + поиском источников.

**Глубже:** прочитать paper «STORM: Synthesizing Topic Outlines through
Retrieval and Multi-perspective Question Asking» (Stanford 2024).

---

## 3. Anxiety Aid Tools (anxietyaidtools.com) ✅

**Что это:** бесплатный набор техник от тревожности на русском —
дыхание, заземление, медитации, прогрессивная релаксация, тесты.

**Как работает:** библиотека упражнений (1-60 мин каждое). Активирует
парасимпатическую нервную систему. Мультимодальные форматы:
аудиоинструкции, визуализация, write-it-out worksheets.

**Как взять (для GrassLMS):**
- ExerciseType `wellbeing_break`. Студент проходит таймер-сессию
  (2-минутное дыхание, 5-4-3-2-1 заземление). Не оценивается, но
  вписывается в gamification (XP за completion).
- Полезно как pause-action между интенсивными уроками SAT/code.
- Вариант: `mood_check_in` — короткий self-test перед/после урока,
  с трекингом тревоги в профиле.

---

## 4. MyLens.ai (mylens.ai) ✅

**Что это:** AI-инструмент для превращения raw-контента (PDF, текст,
URL, видео) в интерактивные визуализации — mind maps, timelines,
quadrants, flowcharts.

**Как работает:**
1. Юзер кидает source (документ, ссылку).
2. AI парсит, строит graph структуры.
3. Пользователь кликает узлы — drill-down + ссылка на оригинал.

**Как взять:**
- ExerciseType `comprehension_visualization` — студент кидает свою
  заметку/конспект, система строит mind map. Студент валидирует/
  правит (доказывает, что понял структуру).
- Альтернативно — `timeline_builder` где студент сам собирает события
  в timeline (drag chronology).

**Глубже:** какой engine у MyLens (D3? Cytoscape?) — для inspiration.

---

## 5. Falstad Circuit Simulator (falstad.com/circuit) ⚠️

**Что это:** легендарный браузерный симулятор электрических цепей
(Java-applet → перенесли на JS). Видишь ток как анимацию частиц.

**Как работает:** drag-drop резисторов, конденсаторов, источников;
real-time вычисление токов и напряжений. Импорт/экспорт схемы как
текст-формат.

**Как взять:**
- ExerciseType `circuit_lab` для физики/EE. Config: `target_state`
  (e.g., «лампочка горит при S1 закрыт»). Студент собирает схему,
  система вычисляет — соответствует ли target.
- Уже всё open-source (https://github.com/sharpie7/circuitjs1) —
  можно встроить как iframe или fork.

**Глубже:** проверить лицензию (GPL?), API для проверки решений.

---

## 6. Aurora-OS / Mental-OS (mental-os.github.io) ⚠️

**Что это:** экспериментальная браузерная «ОС-метафора» для
психологических состояний. Названия процессов = эмоции, окна = режимы.

**Как работает:** desktop-environment в браузере где пользователь
«запускает приложения» = выполняет упражнения для эмоциональной
саморегуляции.

**Как взять:**
- Возможно — `metaphor_environment` — игровая обёртка для
  сухих self-regulation упражнений (см. п.3 Anxiety Aid).
- Очень нишевое; вероятно best-fit для psychology / SEL курсов.

**Глубже:** открыть live + понять конкретные mechanics (это похоже
на art-проект, не production tool).

---

## 7. Qwen Slides (chat.qwen.ai/?inputFeature=slides) ⚠️

**Что это:** AI-генератор слайд-деков от Alibaba (Qwen). Promt →
готовая презентация с layout + графикой.

**Как работает:** юзер пишет topic + outline (или просто topic) →
LLM строит N слайдов с автоматическим layout. Экспорт в PPTX/PDF.

**Как взять:**
- Учительская фича: AI-черновик урока. Учитель вводит тему + lesson
  goals → AI-выдаёт draft из 5-8 слайдов (text + structure). Учитель
  правит, публикует студентам.
- Внутри LMS — TeacherUtilities панель: «Generate lesson skeleton».
- Connect к существующему AI tutor flow.

**Глубже:** API доступ к Qwen-3 (или использовать наш Voyage/OpenAI
для подобной фичи).

---

## 8. Random Topic Generator (vercel.app) ✅

**Что это:** простой импровизационный speech-prompt генератор.
«Pull lever» → topic + 1-минутный таймер. Категории: General, Tech,
Finance.

**Как работает:**
- Random Topics: тяни рычаг, говори.
- Interview Prep: даёт vocab, надо встроить в речь за 30 сек.
- Frameworks (STAR, PREP, PPF, MECE) для структуры ответа.

**Как взять:**
- ExerciseType `impromptu_speech` для языковых курсов. Студент
  записывает аудио, AI оценивает беглость / corectness структуры.
- ExerciseType `random_writing_prompt` для эссе.
- Готовый каталог frameworks (STAR/PREP) — можно использовать в
  rubrics для writing assignments.

---

## 9. Native English (native-english.ru) ✅

**Что это:** русский портал для изучения английского — теория,
практика, игры. 20+ лет на рынке.

**Как работает:**
- Audiobooks с parallel text (clickable перевод слов).
- Грамматические уроки + irregular verb tables.
- Vocab по темам (фонетика, transcription) + flashcards.
- Multiple-choice tests + community forum.

**Как взять:**
- `parallel_text_reader` — двухколоночный текст с per-word translation
  on hover. Для language learners.
- `audiobook_with_subtitles` — синхронизированные subtitles + audio +
  pop-up translation.
- Vocab card structure (transcription / audio / topic-tag) — взять
  схему из их БД, у них классическая система.
- Forum-based peer learning — у нас уже discussions module есть.

---

## 10. Memozora (memozora.com) ✅

**Что это:** SRS-flashcard платформа с adaptive scheduling.

**Как работает:**
- Spaced repetition (SM-2 / Anki-стиль).
- Standard / reverse flashcards / typing quiz.
- Built-in dictionary + TTS.
- Progress chart по 3 категориям retention.

**Как взять:**
- ExerciseType `srs_flashcard` — то же что Anki, но интегрировано в
  курс. Особенно для languages, vocab.
- Algorithm: SM-2 (открытая, легко реализовать).
- Variants: `flashcard_typing` (студент печатает ответ, не просто
  flips), `flashcard_reverse` (front/back swap для retrieval).

**Полезно:** уже есть код-ссылки на open-source SM-2 имплементации.

---

## 11. WordMint (wordmint.com) ✅

**Что это:** генератор печатных учительских материалов — кроссворды,
word search, bingo, bubble tests, matching, scrambles, multiple
choice.

**Как работает:**
- Учитель вводит свой word list / questions, либо берёт из 300k+
  pre-made puzzles + 100k images.
- Выходит PDF / Word doc.
- **Уникально:** scan-grade multiple-choice bubble tests смартфоном.

**Как взять:**
- ExerciseType `crossword` — на фронте rendering grid + clue list.
  Учитель пишет clue+answer, генератор укладывает crossword.
- `word_search` — сетка букв со словами для поиска.
- `bingo_card` — печатная сетка для класс-игры (offline).
- Большая часть — это offline-tools для печати; в digital LMS можно
  адаптировать как interactive (drag letter, type letter).

---

## 12. Code Basics (code-basics.com/ru) ✅

**Что это:** русский бесплатный портал по программированию (от
команды Hexlet). 14+ языков.

**Как работает:**
- Theory text + interactive code editor + auto-grading в браузере.
- AI-assistant Tota для подсказок.
- Open-source, contributions from community.

**Как взять:**
- У нас уже есть code_challenge ExerciseType с Monaco + sandbox. Можно
  улучшить:
  - Добавить detailed test output (объяснение почему упало).
  - Внедрить AI-tutor inline (дать explain-button у упавшего теста).
- Изучить их курсовую структуру (как они дробят темы).
- Их open-source — посмотреть как реализована тестирующая прослойка.

---

## 13. Yandex Boards (boards.yandex.ru) ⚠️

**Что это:** Yandex-аналог Miro — collaborative whiteboard. Личное
пространство + рабочее (для организаций).

**Как работает (известно):** sticky notes, drawing, shapes,
real-time multi-cursor, WebSockets sync, frame templates.

**Как взять:**
- ExerciseType `whiteboard_collab` — ученики/группа решают задачу
  на общей доске. Учитель видит финал + replay действий.
- Use-case: brainstorm, mind-map по теме, draw-and-explain (математика
  / биология).
- Технически: TLDraw open-source (https://tldraw.dev) — embed как
  готовый whiteboard-engine.

**Глубже:** API Yandex Boards (если есть) для embed.

---

## 14. Twisty Noodle (twistynoodle.com) ✅

**Что это:** генератор печатных раскрасок и worksheets для детей.

**Как работает:** пик template → выбор шрифта → ввод текста → print
PDF. Темы: животные, праздники, цифры, буквы, сезоны.

**Как взять:**
- ExerciseType `handwriting_practice` — генерация листа с dotted
  буквами/словами для прописей.
- Customization per ученика (имя, дата) — дифференцированная нагрузка.
- Целевая ниша: K-2, начальная школа. У нас сейчас этого нет.
- Простая фича — очень мало кода (font + dotted-rendering + PDF).

---

## 15. Marquiz (marquiz.ru) ✅

**Что это:** конструктор маркетинговых quiz-форм (lead-gen).
4-step dialog: greeting → branching questions → recommendation →
contact form.

**Как работает:** 13 типов вопросов, branching logic, conditional
paths, scoring, A/B testing, integrations через Zapier.

**Как взять:**
- ExerciseType `branching_quiz` — non-linear questions с conditional
  paths. Идеально для simulation/scenario-training (медицинский case,
  ethics dilemma, sales role-play).
- Reuse: их 13 типов вопросов как ref для UI.
- Scoring + feedback paths — для adaptive learning (пройти неверно →
  redirect на корректирующий контент).

**Глубже:** их UI builder для конструирования branching tree —
inspiration для teacher tool.

---

## 16. BioRender (biorender.com) ✅

**Что это:** drag-drop конструктор научных иллюстраций (4M+ scientists).
Большая библиотека editable scientific icons.

**Как работает:** canvas-style editor + library левая панель + AI-
styling. Real-time collaboration. Export в PPTX/PDF/PNG.

**Как взять:**
- ExerciseType `diagram_assembly` — студент собирает schema из
  библиотеки (cell parts, organs, molecular shapes). Учитель задаёт
  «target» — система проверяет наличие требуемых элементов и
  правильность связей.
- Альтернатива: `concept_map_builder` — общая нодовая модель для
  любого предмета (history connections, literary themes).
- Технически: рисовая канва + JSON model графа + matching.

**Полезно:** their icon library доступна (платно). Можно генерить
своё или использовать noun-project / lucide для базовых.

---

## 17. Repetico (repetico.com) ✅

**Что это:** SRS-платформа с upgrades относительно Memozora —
коллаборативные cardsets, обсуждение каждой карты, AI-create.

**Как работает:**
- Standard flashcards + multiple choice.
- AI-генерация карт от текста (paste material → выходят карты).
- Cross-device sync (iOS/Android/Web).
- Detailed stats + study targets.
- Friend invites + shared cardsets + per-card discussion.

**Как взять:**
- Дополнить наш `srs_flashcard` (см. п.10) features:
  - **AI-generate from text** — kill killer feature. Учитель вставляет
    конспект → AI создаёт N карт. Учитель валидирует.
  - **Per-card discussions** (мы уже имеем threads, можно подвязать).
  - **Shared cardsets** — публичная библиотека вопросов (Anki Shared
    Decks модель).

---

## 18. Validated Learning / Quick Key (validatedlearning.co) ✅

**Что это:** платформа быстрых формативных оценок. Фокус — на
fast feedback loop teacher↔class.

**Как работает:**
- Цифровые quizzes на student devices (без логина).
- Bumblebee bubble-sheets — учитель печатает листы, ученики ставят
  крестики, телефон сканирует и оценивает мгновенно (offline-friendly).
- Question Xchange — 200k+ shared questions tagged по subject/standard.
- Google Classroom integration.

**Как взять:**
- ExerciseType `bubble_sheet_scan` — главная инновация. Преподавателю
  печатается уникальный лист на класс. Студенты заполняют, учитель
  фотографирует — AI распознаёт + проставляет оценки.
- Полезно для классов без 1:1 устройств.
- Технически: OMR (Optical Mark Recognition) — open-source
  библиотеки есть (omr-tools, opencv).

---

## 19. Text Adventures / Quest (textadventures.co.uk) ⚠️

**Что это:** платформа для interactive fiction — Quest (full IDE),
Squiffy (markdown-стиль), Squashed (web).

**Как работает (известно):** автор пишет branching story в DSL/
visual editor; player выбирает варианты, story меняется. Conditions,
inventory, characters.

**Как взять:**
- ExerciseType `interactive_fiction` для:
  - **Languages** — диалоги с NPC, лексика в контексте.
  - **Ethics / case studies** — branching choices с разной развязкой.
  - **History** — «исторический симулятор» (что бы вы сделали будучи
    Наполеоном на Бородинском поле?).
- Технически: открытый формат Squiffy (markdown-extension), уже есть
  player.js — embed готов.

**Глубже:** проверить open-source player + editor.

---

## 20. Anytype (anytype.io) ⚠️

**Что это:** local-first p2p база знаний (Notion-альтернатива).
Объекты + relations + sets (queries).

**Как работает (известно):**
- Object types (page, book, person, task) с свойствами.
- Relations (связь между объектами).
- Sets (filter view: all books, all tasks).
- Encrypted, p2p sync без сервера.

**Как взять:**
- ExerciseType `knowledge_graph_build` — студент строит свою базу
  knowledge: ловит карточки concepts, тегирует, связывает. Учитель
  оценивает organization.
- Альтернатива: research-style assignment где student создаёт
  «персональную энциклопедию» по теме курса.
- У нас уже есть Knowledge module (RAG). Можно дать студенту
  WRITE-доступ создавать свои entries.

**Полезно:** изучить их object/relation schema — модель для нашего
будущего student-knowledge-graph.

---

## Сводный приоритет (мой)

**🔥 Сделать в первую очередь** (быстро + большой impact):

1. **SRS Flashcards** (Memozora + Repetico) — must-have для languages
   + vocab. Open-source SM-2 готов.
2. **AI-generate flashcards from text** (Repetico-style) — killer
   feature. Reuses existing AI infra.
3. **Crossword + Word Search** (WordMint) — дешёвые, востребованы
   для K-12.
4. **Bubble-sheet scan** (Validated Learning) — для классов без
   1:1 устройств. OMR open-source.

**🟡 Среднее (требует UX-работы):**

5. **Branching Quiz / Scenario** (Marquiz / Quest) — для simulations.
6. **Whiteboard collab** (Yandex Boards / TLDraw) — для group work.
7. **Map pin-drop** (GeoChamp) — для географии/истории.
8. **Diagram-assembly** (BioRender-стиль) — для биологии/химии.

**🟢 На потом (нишевые / R&D):**

9. **Circuit lab** (Falstad) — фокус-группа узкая (физика).
10. **Interactive fiction** (Quest) — нужен content authoring effort.
11. **AI-slide-generator** (Qwen) — teacher utility, отдельный flow.
12. **Wellbeing breaks** (Anxiety Aid) — wellbeing track, отдельная
    история.
13. **Knowledge graph** (Anytype) — большая R&D затея.
14. **Visualization on-demand** (MyLens) — UI-heavy.
15. **Handwriting worksheets** (Twisty Noodle) — узкая ниша K-2.
16. **Mental-OS gamified env** — slot для psychology курсов.
17. **STORM-style guided research** — для университетов / olympiad.
18. **Random speech prompts** — нишевое для language tutoring.
19. **Native-English mechanics** — мы уже многое делаем; reference.
20. **Code Basics structure** — мы уже делаем; refresh inspiration.

---

## Что нужно от тебя для следующего шага

- Подтвердить топ-приоритет (1-4).
- Открыть live-страницы помеченных ⚠️ (особенно GeoChamp, Yandex
  Boards, Anytype, textadventures, Qwen slides) под видеозвонок —
  посмотреть UX вместе. Многие SPA-сайты не давали SSR-контента, и
  нужна прямая разведка.
- Решить: каждое из этих делать как новый ExerciseType (config-схема
  + React-компонент + MCP tool) или как отдельный "Lab" модуль.

# Сайты-источники механик для GrassLMS — v2 (deep review)

Подробная сводка по 20 сайтам после прямого осмотра в Playwright
браузере. v1 (WebFetch only) перезаписан.

**Дата:** 2026-05-03.
**Скриншоты:** `workspace/.playwright-mcp/site-NN-*.png` (NN = номер).

---

## 1. GeoChamp — geochamp.app

**Скриншоты:** `site-01-geochamp.png`, `site-01-geochamp-courses.png`,
`site-01-geochamp-topics.png`.

**Что увидел:**
- 3 mode-карточки на старте: **Training-Mode**, **Quiz-Mode**,
  **Multiplayer**.
- Каталог курсов: «The Whole World» (World Countries / Cities / Nature
  / Sights) + «Continent Courses» (Asia, …).
- Topic-selection внутри World Sights: «Most Famous Sights», «Most
  Famous Sights Pictures», «Skyscrapers», и далее.
- UI dark-themed, зелёный glob-маскот, эмодзи иконки, mobile-first.
- 100+ console errors при загрузке (видимо tracking/analytics).

**Mechanic core:** игра-викторина с заданиями типа «найди столицу на
карте / сопоставь страну → флаг / опознай знаменитую достопримечательность
по картинке».

**Технически:** SPA (Vue/React), Mapbox/Leaflet под капотом — ассеты
не успели догрузиться даже за 5 сек, видимо много lazy-loaded карт.

**Что взять:**
- ExerciseType `map_pin_drop` — клик на карте → расстояние от target
  определяет score.
- ExerciseType `picture_identification` — фото памятника, варианты
  ответа.
- ExerciseType `country_flag_match` — drag-drop флагов к странам.
- Mascot pattern (цветной globe-character с речевым облаком) даёт
  тёплый onboarding-tone — можно перенять для GrassLMS dashboard.
- Mode separation Training vs Quiz — у нас есть «practice/test» мысль,
  но не оформлена в UI; стоит явно разделить.

---

## 2. Stanford Co-STORM — storm.genie.stanford.edu

**Скриншот:** `site-02-storm.png`.

**Что увидел:**
- Hero: «Co-STORM. Get a Wikipedia-like report on your topic with AI».
- Main button «Get Started» (требует Sign In).
- Архитектура multi-agent (схема на странице): «Wikipedia writer with
  Perspective A» + «Expert» обмениваются вопросами/ответами →
  «Observe the Conversation» → «Request Report Generation» → «Cited
  Report».
- В Co-STORM пользователь *участвует* в multi-perspective дискуссии
  между LLM-агентами.

**Mechanic core:**
- LLM-агенты разных «perspectives» спорят, генерируя outline.
- Пользователь наблюдает / участвует.
- Финал — long-form Wikipedia-style article с цитатами.

**Что взять:**
- ExerciseType `guided_research` для сильных student-cohorts (университет,
  олимпиады). Студент задаёт topic → видит outline → дописывает разделы
  *вручную*.
- Не использовать «full AI write» — это убивает обучение. AI помогает
  с decomposition + поиском sources.
- Open-source paper Stanford 2024 — можно реализовать урезанный
  retrieve-and-outline pipeline без полной generation.

---

## 3. Anxiety Aid Tools — anxietyaidtools.com/ru

**Скриншот:** `site-03-anxiety.png`.

**Что увидел:**
- 5 категорий-кнопок: Дыхание / Сенсорика / Осознанность / Аудио /
  Ресурсы. + «Все».
- Карточки упражнений с цветными иконками, длительностью (2-3 мин,
  5-10 мин и т.д.) и Tag «Новый».
- Каждая карточка — отдельное упражнение (Дыхание за 2 минуты,
  Направляемое дыхание, Якорение 5-4-3-2-1, Прогрессивная мышечная
  релаксация).
- Top-nav: Тесты / Рабочие листы / Блог / Мобильное приложение.

**Mechanic core:** библиотека timer-guided упражнений + downloadable
worksheets + assessment quizzes.

**Что взять:**
- ExerciseType `wellbeing_break` — таймер + audio guide, не оценивается,
  но даёт XP (gamification).
- Категория-структура (Breathing / Grounding / Mindfulness / Audio /
  Resources) — модель тегирования упражнений в LMS-методике.
- Worksheet PDF download — фича для печати + оффлайн-домашка.
- Mood self-test → результат сохраняется в профиль студента (тренд по
  тревожности).

---

## 4. MyLens.ai — mylens.ai

**Скриншот:** `site-04-mylens.png`.

**Что увидел:**
- Hero: «Complex Content? Let AI Visualize it».
- Главный input: **«+ Source» button + «Ask anything…» prompt** + dropdown
  «Auto Visual» (тип визуализации) + «Fast/Deep» (mode) + send button.
- Просто как ChatGPT, но output — interactive диаграмма.
- «Add to Chrome — It's free» (extension).

**Mechanic core:**
- Принимает PDF/text/URL/video/image.
- LLM строит mind map / timeline / quadrant / flowchart.
- Click on nodes → drill-down + ссылка на исходник.

**Что взять:**
- ExerciseType `visualization_check` — student paste конспект →
  получает draft mindmap → правит в редакторе → submit. Учитель
  оценивает organization.
- Интересный UI-паттерн: «Auto Visual» dropdown — сам определяет
  лучший тип визуализации. Можно повторить с rule-based logic
  (длинный список → list, события с датами → timeline, иерархия →
  tree).
- Browser extension → пастит контент с любой страницы. Полезный
  паттерн для нашего AI-tutor (selection → ask).

---

## 5. Falstad Circuit Simulator — falstad.com/circuit/

**Скриншот:** `site-05-falstad.png`.

**Что увидел:**
- Прямой запуск симулятора без логина.
- LRC circuit на canvas: резистор 10Ω + инд 1H + капа 15μF.
- Зелёные точки = ток, жёлтые анимированные точки тоже = ток (направление).
- Sliders: Simulation Speed, Current Speed, Power Brightness,
  Capacitance, Inductance, Resistance — real-time изменяют значения.
- Bottom: 3 oscilloscope-окна показывают V/I на компонентах,
  Max=9.872V, time step = 5μs, res.f = 41.094 Hz.
- Top menu: File/Edit/Draw/Scopes/Options/Tools/Circuits — десятки
  готовых схем (LRC, AC, Diode, Transistor, …).

**Mechanic core:** spice-симулятор в браузере. Нумерический solver
бежит continuous, рисует ток как анимацию частиц.

**Что взять:**
- Open-source: https://github.com/sharpie7/circuitjs1 (GPL).
- ExerciseType `circuit_lab`. Config: `target_state` (lamp on /
  current > X / voltage = Y) + `allowed_components` (только эти можно
  использовать). Студент собирает → симулятор runs → проверка
  условия.
- Mechanic «scopes снизу» отлично подходит для физики/EE — реально
  обучает читать осциллограмму.

---

## 6. Aurora-OS / Mental-OS — mental-os.github.io/Aurora-OS.js/

**Скриншоты:** `site-06-aurora.png`, `site-06-aurora-3.png`,
`site-06-aurora-4.png`.

**Что увидел:**
- **Resolution-gate**: при viewport <1366px — «SYSTEM HALT,
  DISPLAY_OUTPUT_INVALID, RESOLUTION_WIDTH_LOW». Заставляет ресайзить
  окно.
- INITIALIZE SYSTEM → CLICK TO START.
- Главный экран: AURORA OS huge logo, NOVA REPUBLIKA tagline, левая
  панель «BUILD_STATUS: EXPERIMENTAL · DEVELOPER BUILD · v0.8.5 ·
  Join Discord / Contribute».
- Меню: Continue / NEW LOOP / BIOS / SHUTDOWN. ORIGINAL DISTRIBUTION.
  CRVN 905MS (latency-tag).
- AGPL-3.0 open-source.

**Mechanic core:** game-style **OS-метафора как narrative wrapper для
self-help/emotional-regulation experience**. «New Loop» = начать
сессию, BIOS = настройки, SHUTDOWN = выход. Как Hypnospace Outlaw,
только для mental health.

**Что взять:**
- Очень нишевое — для psychology/SEL курсов.
- Идея сильная: **рабочий процесс как «компьютерная сессия»**. Можно
  сделать «Focus Mode» в LMS со стилизованным UI (CRT-effect,
  monospace font, status-bar) — студент чувствует себя в трюме
  космического корабля во время self-study.
- AGPL-3.0 — нельзя copy-paste код, но можно перенять design language.

---

## 7. Qwen Studio (Slides) — chat.qwen.ai/?inputFeature=slides

**Скриншот:** `site-07-qwen.png`.

**Что увидел:**
- **Slides feature НЕ авто-открылась** через query-параметр
  `inputFeature=slides`. Показал стандартный chat-UI «Ready when you
  are. How can I help you today?».
- Нижний banner предлагает «Choose a style to create your first
  image» (image generation, не slides).
- Без Sign In — лимитированный chat.

**Mechanic core (по описанию Qwen3.6-Plus):**
- Введи topic → Qwen генерит slide deck (text + layout + figure).
- Экспорт в PPTX/PDF.

**Что взять:**
- AI-generate slides — будет **expensive on API** (User flagged
  бюджет на AI-API ограничен). Без бюджета — не приоритет.
- Когда деньги будут: TeacherUtility «AI-draft lesson skeleton».
- На прямую slides-feature мы не имеем доступа без Sign In; нужен
  fresh look после регистрации.

---

## 8. Random Topic Generator — vercel.app

**Скриншот:** `site-08-random.png`.

**Что увидел:**
- **Beautiful hand-drawn brand** "Off the Cuff" + «Baby steps to the
  Mic».
- 3 tabs: **Random Topics / Interview Prep / Learn Vocab**.
- Main UI:
  - Language selector 🇺🇸 EN
  - Category dropdown (🎯 Random / 🎲 Random)
  - Center: текущий topic — `The lucky charm` + 2 фоновых suggestions.
  - Кнопки: **Spin!** + **Start Timer →**.

**Mechanic core:**
1. Pull lever / spin → topic.
2. Start timer (1 min).
3. Record & speak.

**Что взять:**
- ExerciseType `impromptu_speech` — для языковых курсов / public
  speaking.
- UX-pattern «hand-drawn lever / spin» — отличный engagement-driver.
  Можно использовать в наших dashboard-blok'ах (например, рандомный
  daily challenge через визуальный «pull lever»).
- Frameworks STAR/PREP/PPF/MECE как rubric для speaking writing.

---

## 9. Native English — native-english.ru

**Скриншот:** `site-09-native-english.png`.

**Что увидел:**
- Hero: «Изучайте английский легко».
- 4 quick-link chips: Аудиокниги / Тренировки / Словарь / Грамматика.
- 2 main CTA: Выбрать тренировку / Слушать аудиокнигу.
- Top nav: Словарь / Тренировки / Аудиокниги / Игры / Грамматика /
  Фонетика / Ещё.
- Cards «Выберите, с чего начать»:
  - **Аудиокниги** — Красная шапочка (parallel text + диктор)
  - **Тренировки** — Present Simple
  - **Словарь** — Чувства и эмоции (transcription/audio/cards)

**Mechanic core (наблюдаемое + известное):**
- Audiobook player с per-word translation popup.
- Vocabulary cards на тематические наборы.
- Grammar drills (multiple choice).
- Games (mini-games для словарного запаса).
- Phonetics-page с IPA.

**Что взять:**
- ExerciseType `parallel_audiobook` — дешёво, мощно: audio + sync
  субтитры + click-translate-on-word. Open-source players есть
  (видеоплейеры с .vtt subs).
- ExerciseType `vocab_card_set` — наш предметный flashcard
  (transcription + audio + image) с category tagging.
- Минимализм design — скопировать структуру: hero + 4 chips + 2 CTA.
  Чисто, не перегружено.

---

## 10. Memozora — memozora.com

**Скриншот:** `site-10-memozora.png`.

**Что увидел:**
- Dark hero: «Memorize Anything, Never Forget».
- 1 CTA «Start Learning (for free)».
- Big mockup: laptop dashboard + phone app.
- Phone shows flashcard: «aprender» (Spanish) + кнопка «Guess the
  answer».
- Laptop dashboard — Weekly Report graph + декорированы decks (天才,
  Thai, Spanish, Japanese) + «Learn All» button.

**Mechanic core:**
- SRS (Spaced Repetition System) с adaptive scheduling.
- Decks по языкам / темам.
- Mobile + web sync.
- Built-in dictionary + TTS.

**Что взять:**
- ExerciseType `srs_flashcard` — must-have. SM-2 алгоритм open-source,
  легко портируется.
- Weekly retention chart — отличный stat для нашей gamification
  (визуализация streaks).
- Mobile-first вид (карта по центру + кнопка снизу) — паттерн для
  PWA.

---

## 11. WordMint — wordmint.com

**Скриншот:** `site-11-wordmint.png`.

**Что увидел:**
- Hero: «Tomorrow's lesson in minutes».
- Список форматов: word searches, crosswords, worksheets, bingo
  cards, bubble tests.
- Top nav: Home / Support / Browse.
- 3 sample puzzles (cards под hero) — bubble test, crossword, word
  search.
- Section «Used by the world's smartest teachers» + grid sample.

**Mechanic core:**
- Учитель: ввести вопросы / word list → получить готовый puzzle.
- 7 puzzle types: word search, crossword, bingo, bubble test, matching,
  scrambles, multiple choice.
- Output: PDF.
- **Bubble test scan** через смартфон → авто-grading.

**Что взять:**
- ExerciseType `crossword` — interactive (не только print): сетка с
  навигацией стрелками, типизация букв в клетки, мгновенная
  валидация.
- ExerciseType `word_search` — grid + drag-to-select слова.
- `bingo_card` — printable, для классных игр.
- Bubble-sheet OMR scan (см. п.18 Validated Learning).

---

## 12. Code Basics — code-basics.com/ru

**Скриншот:** `site-12-codebasics.png`.

**Что увидел:**
- Hero: «Бесплатные курсы по программированию с нуля».
- «С практикой в тренажере и ассистентом на базе ChatGPT».
- 2 CTA: К курсам → / Регистрация.
- Top nav: Курсы (dropdown) / Решения (dropdown) / Книга для
  начинающих.
- 3 цветных info-карточек: Текстовые курсы / Сообщество / ИИ-
  ассистент.
- Banner о скидке -30% на курсы с наставником.

**Mechanic core:**
- Theory-text → in-browser editor → auto-graded tests → AI tutor
  Tota.
- 14+ языков (Python, JS, Java, …).
- Open-source: github.com/hexlet-basics.

**Что взять:**
- У нас уже есть `code_challenge` — улучшить:
  - Detailed test output с объяснениями (что не так / в чём ошибка).
  - Inline AI-tutor «Why did this fail?» (когда бюджет позволит).
  - Курсовая структура: 14+ языков организованы по уровням
    (новичок/середина/продвинутый).
- Их open-source — взять structure тестирующей прослойки.

---

## 13. Yandex Boards — boards.yandex.ru

**Скриншот:** `site-13-yandex-boards.png`.

**Что увидел:**
- Account-выбор: **Личное пространство** (любой пользователь Яндекса)
  + **Рабочее пространство** (сотрудники организации).
- Минималистичный UI на сером фоне.
- Yandex SSO required → не дошёл до самой доски.

**Mechanic core (известное):**
- Realtime collaborative whiteboard (Miro-аналог).
- Sticky notes, drawing, shapes, frames, multi-cursor.
- WebSocket sync.

**Что взять:**
- ExerciseType `whiteboard_collab` — общая доска для группы. Учитель
  смотрит финал + replay действий.
- Use-cases: brainstorm, mind-map, draw-and-explain.
- **TLDraw** (open-source, https://tldraw.dev) — embed готовый engine,
  не нужно строить с нуля. MIT license.

---

## 14. Twisty Noodle — twistynoodle.com

**Скриншот:** `site-14-twisty.png`.

**Что увидел:**
- Top nav: Coloring Pages / Worksheets / Math / Printable Books / Blog
  / Your Favorites.
- Под Coloring Pages: subcategories (Animals, Buildings, Colors, Food,
  Holiday, Letters, Months, Music, Nature, Numbers, People, Religious,
  School, Sports, Toys, Transportation).
- Sections: Spring Activities, Letter Coloring Pages, Number
  Activities + Teacher Appreciation Week.
- GDPR cookie modal сверху.
- Каждая card = preview + кастомизация (можно ввести name, выбрать
  font, печатать).

**Mechanic core:** генератор печатных PDF для K-2:
- Coloring pages
- Worksheets (handwriting practice, tracing letters/numbers)
- Math worksheets
- Spring/Holiday seasonal активности

**Что взять:**
- ExerciseType `printable_worksheet` для младшей школы.
- Шаблон: dotted letters + image + name field. Generate PDF on demand.
- Очень узкая ниша (K-2), но низкая стоимость разработки. Жирная
  ниша — учителя начальной школы.

---

## 15. Marquiz — marquiz.ru

**Скриншот:** `site-15-marquiz.png`.

**Что увидел:**
- Розовый бренд, hero: «Конструктор квизов».
- Tagline: «помогаем предпринимателям и маркетологам решить проблемы
  низких конверсий и дорогих лидов».
- 1 CTA «Попробуйте — это бесплатно».
- Top nav: Продукт / Медиа / Функционал / Шаблоны / Тарифы.
- Mockup внизу: phone-style preview квиза («Джаз, блюз, классику /
  Электронную музыку, металл, рок / Разную»).

**Mechanic core:**
- 13 типов вопросов (single, multi, image-pick, range, text input,
  contact-form, …).
- Branching logic между вопросами.
- Scoring + А/В testing.
- Zapier integrations.
- Embed в любой сайт.

**Что взять:**
- ExerciseType `branching_scenario` — non-linear quiz для simulation:
  medical case, ethics dilemma, sales role-play, soft-skill training.
- 13 question types — referenced для UI builder в нашем admin.
- A/B testing на разных вариантах урока — продвинутая фича для
  методистов.

---

## 16. BioRender — biorender.com

**Скриншот:** `site-16-biorender.png`.

**Что увидел:**
- Hero: «Create professional science figures in seconds».
- «No design skills needed». «No download required».
- Top nav: Products / Events / Icon Library / Learning Hub / Pricing.
- Right side mockup: scientific figure-builder.
  - Левая панель — поиск «antigen» с outline иконок (icons / templates).
  - Главное полотно — illustration immune attack: T-cell, MHC,
    Activated T-cell, Tumor cell, PD-1, PD-L1/2 — реалистичные
    biomedical иллюстрации.
- Trust-pillars: Princeton, University of …, Harvard, Stanford.
- Cookie modal внизу.

**Mechanic core:**
- Drag-drop canvas + scientifically-accurate icon library (10000+).
- Search-bar для поиска компонентов.
- Templates (готовые scaffolds — например, immune attack scenario).
- Real-time collaboration.
- Export в PPTX/PDF/PNG.

**Что взять:**
- ExerciseType `diagram_assembly` — учитель задаёт target иллюстрации,
  студент собирает из icon-library, система проверяет наличие
  required elements (по name) + правильность connections.
- Library structure: search + categorized + templates — UX-pattern
  для нашего content library (для exercises).
- Ниша: биология, химия, медицина, анатомия. У нас сейчас слабая.

---

## 17. Repetico — repetico.com

**Скриншот:** `site-17-repetico.png`.

**Что увидел:**
- Hero на зелёном фоне: «Study flashcards online & mobile!».
- «With Repetico, you can easily prepare yourself for your tests —
  using an automated study schedule, study target dates and AI».
- 1 CTA «Sign up for free» (оранжевый).
- Mockup: laptop dashboard «Study schedule / 1647 / Active sets /
  Schedule entries» + 2 phones.
- Google Play + App Store badges.
- Section ниже: «Create and study your flashcards» —
  «Create flashcards or multiple choice questions - even using AI!».

**Mechanic core:**
- Flashcards + multiple-choice cards.
- Automated SRS schedule.
- AI-create from text (paste material → AI генерит карты).
- Cross-device sync (web + iOS + Android).
- Stats + study targets.

**Что взять:**
- Сравнить с Memozora (п.10) — Repetico **умеет AI-creation**,
  Memozora — только manual. Это ключевая фича.
- При AI-budget: добавить feature `srs_ai_generate` (будущее).
- Без AI: ручной импорт CSV / TSV — minimum viable.
- Multi-platform — для нас уже работает PWA, Repetico показывает что
  native apps добавляют conversion.

---

## 18. Validated Learning / QuickKey — validatedlearning.co

**Скриншот:** `site-18-validated.png`.

**Что увидел:**
- Hero на photo с улыбающимся учителем: «REAL TIME DATA from fast
  quizzes and tests» (большой text-on-photo).
- Logo: QuickKey (rabbit + name).
- 1 CTA «Sign up for a free account».
- Top nav: Xchange Community / Teachers / Schools / The Teach Big
  Blog / Pricing / About / Support.
- Tagline: «Easy online quizzes and tests for remote learning».
- Sub-tagline: «Plus: scan paper bubble sheets with your mobile
  device. 1-minute setup with Google Classroom».

**Mechanic core:**
- Online quizzes на student devices (без login).
- **Bubble-sheet scan** — учитель печатает листы → ученики ставят
  крестики → телефон сканирует.
- Question Xchange (200k+ questions, tagged по subject/standard).
- Google Classroom integration.

**Что взять:**
- ExerciseType `bubble_sheet_scan` — главная фича. OMR open-source
  библиотеки: opencv-python, omr-tools.
- Question Xchange Community — модель **публичной библиотеки
  заданий** (как Anki Shared Decks). Учителя делятся, рейтят.
- Google Classroom integration — у нас уже есть google_classroom
  endpoint, но без credentials (см. credentials task в todo).

---

## 19. Text Adventures — textadventures.co.uk

**Скриншот:** `site-19-textadv.png`.

**Что увидел:**
- **Cloudflare anti-bot** — «Performing security verification».
  Playwright не прошёл challenge.
- Доступ заблокирован для headless-сессий.

**Mechanic core (известное):**
- Quest — WYSIWYG editor для interactive fiction (точки, conditions,
  inventory, NPC dialogues). Open-source.
- Squiffy — markdown-style branching DSL (.squiffy → .html).
- Squashed — web-based player.

**Что взять:**
- ExerciseType `interactive_fiction` для:
  - Languages — диалоги с NPC, лексика в контексте.
  - Ethics — branching choices с разной развязкой.
  - History — what-if симулятор.
- Squiffy DSL открытый, легко парсится. Player.js (~50kb) можно
  embed.
- **Большой content authoring effort** — учитель должен научиться DSL.
  Visual editor (как Quest) — heavy дев.

---

## 20. Anytype — anytype.io

**Скриншот:** `site-20-anytype.png`.

**Что увидел:**
- Hero: «A safe haven for digital collaboration» (pink-coloured «for
  digital collaboration» fancy serif).
- Красивая монохромная пиксел-арт illustration: компьютеры, кадрики,
  smiley лицо на экране, календарь 31.
- Bottom nav: WHAT / WHY / WHO.
- 4 pillar блока:
  - Private & Secure (data privacy)
  - Offline & Online (no Wi-Fi needed)
  - Work & Play (less organising, more creating)
  - Watch Chat Introduction (video link)

**Mechanic core (известное):**
- Local-first p2p база знаний (Notion-альтернатива).
- Object types (page, book, person, task) с relations.
- Sets (filter views: «all books I read», «tasks for May»).
- E2E encrypted sync без сервера.

**Что взять:**
- ExerciseType `knowledge_object_build` — студент создаёт «карточку
  концепта» (e.g., биологический процесс) с типизированными
  relations (causes, parts, examples). Учитель оценивает graph.
- Pixel-art aesthetic — потенциально для нашей gamification (badges,
  illustrations).
- Их object/relation schema — модель для будущего student-knowledge-
  graph. Сейчас наш Knowledge module — read-only RAG. Это даст
  студентам *write*-доступ создавать свои entries.

---

# Сводный приоритет (после deep review)

## 🔥 Сделать в первую очередь

1. **SRS Flashcards** (Memozora + Repetico). MVP без AI: manual cards
   + SM-2 schedule + progress chart.
2. **Crossword + Word Search** (WordMint). Interactive в браузере, не
   только print.
3. **Bubble-sheet scan** (Validated Learning). Дифференциатор для
   школ без 1:1 устройств. opencv OMR.
4. **Map pin-drop** (GeoChamp). Простой ExerciseType с Leaflet.

## 🟡 Среднее (требует дев-капасити)

5. **Branching Scenario** (Marquiz / Quest). Конструктор non-linear
   квестов.
6. **Whiteboard collab** (Yandex Boards / TLDraw embed).
7. **Diagram-assembly** (BioRender-стиль). Для биологии/химии.
8. **Parallel audiobook + vocab cards** (Native English) для
   languages.
9. **Circuit lab** (Falstad). Ниша физика/EE.

## 🟢 На потом

10. **Interactive fiction** (Quest) — heavy authoring tooling.
11. **Knowledge graph** (Anytype) — research-level, нужна schema.
12. **Visualization on-demand** (MyLens) — нужен AI-budget.
13. **Wellbeing breaks** (Anxiety Aid) — отдельный wellness-track.
14. **Aurora-OS Focus Mode** — design language для self-study.
15. **Handwriting worksheets** (Twisty Noodle) — узкая ниша K-2.
16. **Random speech prompts** (Off the Cuff) — language tutoring.
17. **STORM-style guided research** — академический сегмент.
18. **AI-slide-generator** (Qwen) — отложено по AI-budget.
19. **Native English mechanics** — мы делаем, refresh inspiration.
20. **Code Basics structure** — refresh inspiration.

---

# Что отметить дополнительно (cross-cutting наблюдения)

- **AI-mention везде:** 13 из 20 сайтов уже имеют AI-features
  (Memozora, Repetico, MyLens, Qwen, Anytype, STORM, Code Basics —
  Tota, …). Для GrassLMS без AI-budget — мы отстаём. Когда появится
  budget, AI features станут must-have (AI-flashcards, AI-tutor
  inline, AI-outline для writing).
- **Public sharing/community library** — у Repetico, WordMint,
  Validated Learning, Native English. Идея: **Question Xchange-style
  community** в нашей Knowledge module + отдельный Exercise Library
  где учителя публикуют свои задания. Может быть отдельный sellability
  driver.
- **Bubble-sheet OMR (Validated Learning)** — недо-explored ниша.
  Школы со слабым cell-coverage / ноутбук-парком найдут это
  «магией».
- **Mobile-first patterns:** Memozora и Repetico — flashcards
  показывают one-card-per-screen на phone. Наш PWA сейчас mostly
  desktop-first; стоит сделать mobile-mode для exercises.
- **Hand-drawn brand (Off the Cuff)** vs **scientific brand
  (BioRender)** vs **kitch fun (GeoChamp)** vs **minimalist (Native
  English, Memozora, Anytype)** — для нашей DS warm green/sun близок
  к Off the Cuff и Memozora; стоит выдержать tone-of-voice
  consistent.

---

# Что нужно от тебя для следующего шага

1. Подтвердить топ-4 приоритет (SRS, crossword, bubble-scan,
   pin-drop).
2. Решить: каждое — ExerciseType (config-схема + React-компонент +
   MCP tool) ИЛИ отдельный Lab-модуль с своим UX?
3. Открыть live-страницы (особенно GeoChamp Quiz-Mode, Yandex Boards
   реальная доска, textadventures Quest editor) под звонок —
   playwright не дошёл до содержимого за их auth/Cloudflare gates.

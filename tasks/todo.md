# Активные задачи

Только то, что реально в работе или ждёт действий пользователя.
История завершённых спринтов — `tasks/archive/`.

---

## Хвосты ручного прогона 2026-08-23

Двадцать три находки разобраны в
[`tasks/walkthrough-2026-08-23-full-path.md`](walkthrough-2026-08-23-full-path.md),
двадцать закрыты правками (спеки 047–059). Осталось три — две ждут решения
владельца, одна руками.

- [x] **Английские числительные не согласованы** (Н-04) — закрыто в specs/062.
  Названные в прогоне места («1 members», «Import 3 student», «1 modules»)
  ушли ещё в specs/061; поиском нашлись пять оставшихся — подзаголовок списка
  курсов, плашка пути, крошки над работами и счётчик у имени в журнале, там же
  русское «1 уроков». Везде форма «Подпись: N»: согласование не требуется ни в
  одном из шести языков, `Intl.PluralRules` не понадобился.
- [x] **Панель учителя показывает пустую школу** (Н-10) — закрыто в specs/061.
  Владелец решил: учитель видит только своих. Ключом стала группа, а не
  владение курсом.
- [x] **Учитель не может собрать состав группы** (Н-16) — закрыто там же:
  новый `/journal/students` отдаёт учителю его учеников, а пустой подбор
  говорит, что учеников распределяет администратор.

### Хвосты самой specs/061

- [x] «Кто отстаёт» и «Журнал не заполнен» — PR #463. Один эндпоинт
  `/journal/attention` на оба списка: два пропуска за месяц и проведённые дни
  без единой отметки.
- [x] Числительные (Н-04) — там же. Не `Intl.PluralRules` на шесть локалей, а
  форма «Подпись: N», где согласование не нужно вовсе.
- [x] Накладки по кабинетам в «Требует решения» — там же. Доска кабинетов
  считала их давно и никому не показывала.
- [x] Узкое `Course.teacher_id == user.id` — PR #464. Расширен общий
  `_course_scope_clause`, а не восемь мест по отдельности: он питает
  пятнадцать модулей, и одна правка согласовала их разом.

### Отдельная работа, не хвост

- [ ] **Экран загрузки: учителя и кабинеты.** `/journal/room-board` есть,
  интерфейса к нему нет вовсе — ни страницы, ни ссылки. Это не остаток
  панелей, а своя фича со своей спекой: недельная сетка занятости, часы на
  учителя, свободные окна. В «Требует решения» вынесена только та её часть,
  которая является ошибкой, — накладки.

## «Методист» → Learning experience designer, LXD (2026-08-23)

Решение владельца по ходу сквозного прогона: роль названа в интерфейсе неверно.
«Методист» — слово из постсоветской школьной номенклатуры, а продукт продаётся в
EU и US, где эта работа называется learning experience designer.

Объём — только видимые строки, четыре ключа в каждом словаре:
`admin.users.methodist`, `admin.users.methodistGranted`,
`admin.users.methodistRevoked`, `admin.users.failedUpdateMethodist`
(`frontend/src/lib/i18n/locales/{de,en,es,ru,tr}.ts`). Этим же ключом подписана
колонка в таблице пользователей.

Поле `is_methodist` переименовывать не нужно: оно живёт в схеме БД, в ответах
API и в двух десятках файлов, а пользователь его не видит. Переименование кода
даст миграцию и широкий дифф ради нулевой пользы.

Открыто: как назвать по-русски и по-испански. Дословный перевод даёт кальку
(«дизайнер образовательного опыта»). Вариант — оставить английский термин с
аббревиатурой LXD во всех словарях, как поступают с UX.

---

## Редактор урока терял текст блока — починено (2026-08-20, specs/029)

Текстовый блок со строковым телом (`format: "html"`) открывался пустым:
редактор отдавал в TipTap только объект. Первое нажатие клавиши заменяло
строку документом TipTap, и содержимое исчезало. В проде так лежат 63 блока
из 64.

Теперь тело-строка правится как строка, а в патч не кладётся `format` — блок
сохраняется в том формате, в каком пришёл, и блок без формата не получает
выдуманного. Развилка живёт в `textBlockEditor()`, тест написан до правки и
проверен красным.

**Ждёт решения владельца.** Старые блоки остаются без богатого редактора.
Разовая конверсия `html` → `tiptap` не делалась и вслепую делаться не должна:
схема редактора не знает ни `aside`, ни `table`, а рамки и таблицы в сидах
написаны именно ими — конверсия потеряет их молча. Если богатый редактор для
старого содержимого нужен, это отдельная работа: конверсия по кнопке, с
предпросмотром «что потеряется» и отказом там, где потери есть.

---

## Конструктор курсов — 34 замечания владельца (2026-08-19)

План и распределение по шести этапам —
[`tasks/feedback-2026-08-19-authoring.md`](feedback-2026-08-19-authoring.md).
Порядок: быстрые баги → архитектура урока и каталога → превью + анонимный
тест-режим → система ответов → math interactive → языки/слова/код. Каждый
этап получает свою спеку через `/speckit-specify` перед кодом. Три вопроса
ждут решения владельца (слайдеры в графиках, судьба Bubble Sheet — см.
«Открытые вопросы» в файле).

---

## Позиционирование → первый платящий клиент (2026-08-14)

**Решения владельца, зафиксированы 2026-08-14:**
- Ниша: варианты 1 + 3 — **небольшие частные школы и учебные центры
  (10–300 учеников), которые учат программированию, математике, языкам**,
  EU/US, английский. Аудитория из варианта 1, механика денег из варианта 3
  (обучение + операционка + оплата в одном окне).
- Цель на 2–3 месяца: **первый платящий клиент** (не пилот за отзыв).

**Почему такая рамка (из разбора конкурентов 2026-08-14):** Codio и CodeHS
делают автопроверку кода, но не делают школьную операционку. TutorCruncher
(£25–200/мес) и Teachworks делают операционку, но не обучение вообще.
Teachable/Thinkific продают курсы, но не ведут школу. Moodle и Google
Classroom бесплатны и обнуляют цену «просто LMS» для школ. Импульс собирает
всё вместе — но только в РФ. Пересечение «обучение + операционка + деньги»
в EU/US не занято никем.

⚠️ **`marketing/target-segment.md` (2026-04-10) устарел.** Он ставил на
SAT-центры с SAT Math как клином — SAT убран с поверхности продукта
2026-08-02 (`/sat-practice` редиректит на `/dashboard`). Клина больше нет,
документ переписывается в Ф0-1, не используется как есть.

### Фаза 0 — позиционирование (блокирует всё остальное)

- [x] **Ф0-1.** `marketing/target-segment.md` переписан под нишу 2026-08-14.
      Старая версия — в `marketing/archive/target-segment-2026-04.md` с шапкой
      «ARCHIVED, do not use»: клин умер (SAT снят 2026-08-02), и там же осталась
      непочиненной её цифра «37 languages» при пяти реальных — чтобы ошибка была
      видна, а не исчезла тихо.
- [x] **Ф0-2.** ICP в том же файле, таблицей: владелец/директор как
      единственный решающий, 10–300 учеников и 2–20 учителей, предметы,
      платит школа из операционки, родители платят школе, цикл дни–три недели,
      и что у них стоит сегодня.
- [ ] **Ф0-3.** Обещание в одну строку + три подзаголовка + пять булитов
      + **чего мы НЕ обещаем** (не университет, не корпоративное обучение,
      не замена Moodle). Пишется через writing-skills, не с ходу.
- [x] **Ф0-4.** Пять возражений с ответами — в `target-segment.md`. Два ответа
      сознательно неудобные: на «вы вообще живые» сказано «один разработчик, без
      инвестиций, клиентов назвать некого», а на «сколько времени на переезд» —
      «не знаем и цифру не выдумываем, пока не сделан Ф3-1». Ответ про экспорт
      помечен как обязанный оставаться правдой: сломается `app/export` — строка
      станет ложью.
- [x] **Ф0-5.** Три отличия проверены по коду 2026-08-17, каждое со ссылкой на
      файл. **Типов не 24, а 26** — `ExerciseType` и `EXERCISE_TYPES_META`
      сходятся на 26; сервер судит все, кроме `file_upload`, который по замыслу
      уходит учителю. Тьютор жив: модуль переехал из удалённого `ai/` в `tutor/`,
      смонтирован на `/api/v1/tutor` (`main.py:525`) — в списке модулей
      `backend/CLAUDE.md` его не было, дописан. Родительский портал —
      `/api/v1/parent` (`main.py:499`).
- [ ] **Ф0-6.** Список 50 реальных целей (школы кода/математики/языков
      EU/US, 10–300 учеников) с сайтом, именем владельца, стеком.
      Файл `marketing/prospects.md`. Без него аутрич в Ф4 не с чего начать.
- [ ] **Ф0-7.** 3 разговора с владельцами из списка **до** написания кода:
      подтвердить боль и цену. Если боль не та — вернуться в Ф0-1.

### Фаза 1 — деньги (без этого «платящий клиент» невозможен)

**Пересмотрено 2026-08-14.** Юрлицо перестало быть блокером для подачи:
Paddle прямо пишет, что верификация бизнеса не требуется для физлиц и
sole trader'ов, Creem принимает физлиц с обычным KYC. Страна работы —
Турция — есть в списке выплат Creem (86 стран) и отсутствует в запретном
списке Paddle (28 стран). Регистрация грузинского ИП остаётся отдельным
вопросом, но **легальным, а не платёжным**: на туристическом икамете
работать в Турции нельзя, разрешено удалённо управлять компанией,
зарегистрированной за границей (`user_turkey_residence_status`).

**LemonSqueezy закрыт структурно.** После покупки Stripe он ездит на его
рельсах, а Stripe не поддерживает ни Турцию, ни Грузию. Повторная заявка
и регистрация ИП этого не чинят. Код `billing/ls_service.py` +
`lemonsqueezy.py` (562 строки) не удалять до подтверждения провайдера —
`BillingProvider` в `billing/models.py` рассчитан на третьего.

- [ ] **Ф1-1.** Подать заявки в **Creem** (3.9% + $0.40, Турция в списке
      выплат) и **Paddle** (5% + $0.50, юрлицо не требуется) параллельно.
      Обе бесплатны. Данные формы: Individual / sole trader, имя
      `Mario Rafael Becerra Duenias` посимвольно как в Terms, сайт
      `https://grasslms.online`, страна Türkiye. Ожидать ручную проверку
      и запрос документов (икамет, налоговый номер): российское
      гражданство почти наверняка даст дополнительный круг.
- [ ] **Ф1-2.** Под одобрившего провайдера дописать адаптер по образцу
      `ls_service.py`. Dodo Payments — запасной вариант, но **Турции у него
      в поддерживаемых нет**, откроется только после грузинского ИП.
      FastSpring требует свидетельство о регистрации — сейчас мимо.
- [ ] **Ф1-9. Отдельный вопрос владельца: грузинское ИП.** Не ради платежей,
      а ради легальности схемы из Турции и как запасной путь, если оба
      MoR откажут. ⚠️ Трата денег, Claude не выбирает и не платит.
- [ ] **Ф1-3.** Тарифная сетка под ICP. Ориентиры рынка: Codio $90/учащийся
      в год, TutorCruncher £25/£60/£200 в месяц, TalentLMS free forever на
      5 юзеров, LearnWorlds $29/$99/$299. Модель — по **активным** ученикам
      (модуль `metered_billing` уже есть), а не по местам.
- [ ] **Ф1-4.** Free forever на 5–10 учеников в `billing/limits.py` —
      заход через одного учителя, минуя закупку школы.
- [ ] **Ф1-5.** Полный функционал на всех тарифах, разница только в объёме
      (модель Импульса). Заодно вычищает половину логики фиче-гейтов.
- [x] **Ф1-6.** `/pricing` вернулась (PR #284, прод 2026-08-14). Редирект снят,
      сетка = четыре плана из сида `billing/service.py` (Free 10 / Starter $29
      50 / Professional $79 200 / Enterprise $199 без лимита), различие только
      по числу учеников. Кнопки оплаты нет намеренно: провайдер не подключён,
      а нерабочий чекаут — повод для отказа на ревью MoR.
- [ ] **Ф1-7.** Чекаут вживую end-to-end. Тестовый платёж реальной картой —
      **только после явного «да» владельца** (это трата).
- [ ] **Ф1-8.** Счёт/квитанция после оплаты + страница «Оплата» в кабинете
      админа школы (`(admin)/admin/billing` уже есть — проверить, что живая).

### Фаза 2 — лендинг под ICP

- [~] **Ф2-1.** Тексты главной переписаны (PR #261, #263, #264, #270).
      Выдуманные цифры сняты отдельным коммитом — #263 «drop the invented
      stats», — так что обещание держится на проверяемом в продукте.
      **Остаток:** переписать под Ф0-3, когда позиционирование готово. Сейчас
      тексты честные, но написаны без ICP, поэтому пункт не закрыт.
- [ ] **Ф2-2.** Квиз 3 шага (кто вы / сколько учеников / что важнее) →
      правильное демо + email. Бэкенд не трогаем: `POST /api/v1/waitlist`
      уже принимает `role` и `source`, миграция не нужна.
- [x] **Ф2-3.** Публичное демо автопроверки без логина (PR #261, #270).
      `POST /api/v1/sandbox/demo/check` держит эталоны на сервере и в браузер
      их не отдаёт; тот же движок, что у учеников, но 5с/128МБ, два языка и
      рейт-лимит по IP. Предыдущее демо **подделывало** запуск: слало запрос
      на несуществующий `/api/sandbox/execute` и рисовало заготовленный вывод.
      Поэтому журней `e2e/journeys/landing-demo.spec.ts` ходит на `/` без
      логина и требует настоящего ответа сервера — `all_passed: true` у верного
      решения и смесь упавших с прошедшими у неверного. Подделка такой тест
      не прошла бы.
- [x] **Ф2-4.** `/contact` в проде (PR #284). Не форма, а `mailto` на
      `support@grasslms.online` — форме нужны эндпоинт, антиспам и очередь
      ответов, чтобы попасть в тот же ящик. Ссылки: футер и шапка лендинга.
- [x] **Ф2-9. Почта домена поднята 2026-08-14.** У `grasslms.online` не было
      ни одной MX-записи — адрес `support@`, опубликованный в Terms трижды,
      просто отбивался. Заведён Zoho Mail (бесплатный тариф, европейский ДЦ),
      добавлены MX ×3, SPF одной записью на двух отправителей
      (`v=spf1 include:zoho.eu include:spf.brevo.com ~all`) и DKIM 2048 бит
      селектором `zoho`. DMARC и Brevo-DKIM были раньше. Доставка проверена
      живым письмом — дошло во Входящие, не в спам.
- [x] **Ф2-10. Юридические страницы приведены к продукту** (PR #284). Врали:
      «9 lesson types» (10), «11 interactive exercise formats» (26),
      «37 programming languages» (5), SAT-материалы (сняты в августе). Хуже
      всего — Terms и Privacy утверждали, что AI-тьютор работает на
      self-hosted модели и наружу не уходит ничего, при том что он ходит на
      внешний провайдер (`config.llm_base_url`). Переписано по факту. В Terms
      добавлено имя оператора — Paddle сверяет его с именем в аккаунте
      посимвольно.
- [ ] **Ф2-5.** Лента обновлений на лендинге с датами — снимает вопрос
      «а продукт живой?». Материал берётся из истории коммитов.
- [ ] **Ф2-6.** Страницы сравнения: vs Google Classroom, vs Moodle,
      vs Teachable. Органика + снятие возражений.
- [ ] **Ф2-7.** FAQ из Ф0-4 на лендинг.
- [ ] **Ф2-8. Действие владельца:** демо-видео 3–5 минут под новую нишу
      (не SAT). Заменяет висящий P1-15.

### Фаза 3 — продуктовые дыры, которые блокируют «да»

- [ ] **Ф3-1.** Онбординг школы за 15 минут: регистрация → импорт учеников
      → готовый курс на месте → первое задание проверено. Пройти самому
      с секундомером, чинить всё, что мешает.
- [ ] **Ф3-2.** Готовый курс в комплекте (Python и математика). Заготовки
      есть — `scripts/content/python/*`, `scripts/create_python_course.py`.
      Платформа без контента = работа для учителя (CodeHS даёт 100+ курсов,
      TalentLMS — 1000+).
- [ ] **Ф3-3.** Еженедельный отчёт родителю письмом. Модуль `parent` и
      `email` уже есть. Главный аргумент Импульса частным школам —
      «родители перестают дёргать администрацию».
- [ ] **Ф3-4.** Отчёт владельцу школы: кто отстал, посещаемость, нагрузка
      преподавателей. Данные уже в `analytics`, `attendance`, `journal`.
- [ ] **Ф3-5.** Integrity-lite: история версий кода + подсветка вставки.
      В нашей нише это **входной билет**, а не преимущество — у CodeHS
      (Code Replay, Code History, Focus Mode) и Codio (Behavior Insights
      по нажатиям, Dolos) это есть, у нас нет.
- [ ] **Ф3-6.** «Объясни свой код» — устная доп-проверка через AI-тьютора.
      Вот это уже только у нас: тьютор есть, у них нет. Зависит от фичи A
      из секции AI ниже.

### Фаза 4 — выход к людям

- [ ] **Ф4-1.** Письмо для первого контакта + оффер. Цель — платящий, значит
      оффер вида «месяц бесплатно, дальше $X», а не «три месяца за отзыв».
- [ ] **Ф4-2.** Пройти 50 целей из Ф0-6. Считать: ответы, демо, отказы и
      **причины отказов** — это вход для следующей итерации Ф0.
- [ ] **Ф4-3.** Первые 3 школы завести руками, до последнего ученика.
- [ ] **Ф4-4.** P1-20 (Tali Green, Teachers for Ukrainian Kids) — держать,
      но переписать письмо под новую нишу.

### Что сознательно НЕ делаем в этом заходе

Маркетплейс курсов, мобильные приложения, интерактивное видео, AI-агенты
для админа, LTI-синк с Canvas/Moodle, SCORM на вывод, партнёрскую программу,
брендированные поддомены. Всё это дорого и ни одно не приближает первого
платящего клиента. LTI — первый кандидат на возврат, если пойдут вузы.

---

## Воронка школьных заявок (CRM) — сделана (2026-08-17)

Спека `specs/001-crm-enquiry-pipeline/`, восемь фаз. **Строилась по просьбе и в
этом плане не значилась вовсе** — то есть план преуменьшал то, что в продукте
уже есть. Записано, чтобы следующий читатель не проектировал её заново.

Не путать с `app/waitlist` — тот наш собственный список ожидания, видимый
только супер-админу. Это воронка *школы*: люди, которые спрашивают про место,
до того как стали учениками.

| Фаза | Что даёт | PR |
|---|---|---|
| v1 | Доска, стадии, история, напоминания, конверсия в ученика, изоляция школ | #295 |
| 3 | Приглашения обоим создаваемым аккаунтам + браузерный журней над доской | #298 |
| 4 | Публичная форма заявки на сайте школы | #299 |
| 5 | Возврат потерянной заявки вместо второй записи | #300 |
| 6 | Напоминания письмом; неназначенное уходит администраторам | #301 |
| 7 | Отчёт по воронке: конверсия, разрез по источникам, время ответа | #310 |

**Что нашлось по дороге, чего в задании не было:**

- Конверсия создавала аккаунты ученику и родителю со случайным паролем и **не
  отправляла ничего** — семья доходила до конца воронки и не могла войти. 18
  бэкенд-тестов это пропустили: все спрашивали, созданы ли аккаунты, ни один —
  может ли кто-то в них попасть.
- Оценка засчитывала **остановленную** программу как решение: сравнивался
  `stdout`, а лимит мог сработать после того, как верный ответ уже напечатан.
- Тест на изоляцию арендаторов **дважды** оказывался тем, что не может упасть:
  на несуществующем маршруте «чужая школа получает 404» достаётся бесплатно.
  Лечение — положительный контроль в том же тесте.
- Форма и возврат заявки были бы недостижимы через интерфейс: доска не
  показывала ни адрес публичной страницы, ни закрытые заявки.

**Осталось:** ничего по этой спеке. 48 из 48.

---

## AI-фичи из early.tools: Q&A по уроку + генератор черновика курса (2026-08-13)

**Статус: фича A отгружена (`feat(tutor)` 9bf25c7, на проде). Осталось два
шага за владельцем: golden-вызов и живая проверка заземления — оба требуют
бесплатного ключа OpenRouter; прод отвечает 503 до появления ключа с
COST-строкой.** Провайдер —
OpenAI-совместимый HTTP, переключается тремя env-переменными. Дев и CI:
OpenRouter free-модели ($0, баланс не трогается). Прод: решается позже,
там и появится COST-запрос.

### Общее (делается один раз, до обеих фич)

- [x] Новых зависимостей нет. `httpx` уже в проекте — тот же паттерн, что
      `knowledge/service.py` для Voyage (сделано в `feat(tutor)` 9bf25c7)
- [x] `config.py`: `LLM_BASE_URL`, `LLM_MODEL`, `LLM_API_KEY` (все с ""
      по умолчанию). Пустой ключ → эндпоинты отдают 503, старт не падает
- [x] `backend/app/common/llm.py` — одна `async def complete(system, user)
      -> str`, POST на `{base_url}/chat/completions`. JSON-схемы не нужны:
      единственный потребитель (фича A) хочет обычный текст
- [x] Тесты: `complete` подменяется фикстурой. **CI никогда не ходит
      в сеть** — иначе прогоны начнут стоить денег (10 кейсов в `test_tutor.py`, все на моке)
- [x] Golden file: сделан 2026-08-19, ключ дал владелец. Один живой вызов
      `nvidia/nemotron-3-super-120b-a12b:free` с боевым SYSTEM_PROMPT;
      заземлённый ответ и честный отказ («this lesson does not cover it»)
      записаны константами в `test_tutor.py` и играют роль модели. Живая
      проверка заземления (шаг 5 плана) пройдена тем же вызовом: по теме —
      только из текста урока, мимо темы — отказ без выдумки

### Фича A — «Спроси по этому уроку»

**Подробный план: `docs/superpowers/plans/2026-08-14-lesson-qa-widget.md`.**

Без RAG: текст урока целиком в промпт. `knowledge`-модуль не трогаем —
там методика, не уроки.

- [x] `backend/app/tutor/router.py` — `POST /api/v1/tutor/lessons/{id}/ask`
      (один файл, ~80 строк, без models.py — новой таблицы нет)
  - берёт `courses.service.get_lesson` (в нём уже проверка доступа)
  - HTML урока → текст, обрезка до ~8k токенов
  - system: «отвечай только по этому тексту; если ответа нет — так и скажи»
  - `@limiter.limit("20/day")` per-user — **это и есть потолок трат**
    (`# ponytail: rate limit = spend cap; таблица квот, если пойдут деньги`)
- [x] Смонтировать роутер в `main.py`
- [x] `frontend/src/components/lesson/ask-widget.tsx` + `lib/api/tutor.ts`,
      вставить в `(dashboard)/courses/[courseId]/lessons/[lessonId]/page.tsx`
- [x] i18n: 6 локалей (иначе i18n-гейт в CI не пустит) — 11 ключей `tutor.*`
- [x] Тест: 1 pytest (мок клиента, проверка 403 для чужого курса + 429) —
      вышло 10: изоляция двух видов, 422 без текста, 503 без ключа, 502 на
      падении провайдера, юниты `_lesson_text`

### Фича B — генератор черновика курса — ОТЛОЖЕНА (2026-08-14)

Владелец: скелет курса — задача для пайплайна (`F:\sources\`), не для LMS.
В LMS не делаем. Требование `json_schema` в `common/llm.py` из-за этого
отпадает — функция `complete()` сводится к «system + user → строка».

### Что сознательно НЕ делаем в v1

- эмбеддинги/чанки/векторный поиск по курсу целиком → только если A зайдёт
- таблица usage/квот по организациям → пока rate limit достаточно
- генерация текста уроков и упражнений → только скелет курса
- превью-модал для черновика → правка в существующем редакторе

---

## Live Lesson Mode (2026-07-23)

Спека: `docs/superpowers/specs/2026-07-23-live-lesson-mode-design.md`.
Планы: `docs/superpowers/plans/2026-07-23-live-lesson-{backend,frontend}.md`,
`docs/superpowers/plans/2026-07-24-live-player-full-types.md`.

- [x] Plan 1: backend (SSE + Redis pub/sub, доски, сигналы, опросы, черновики,
      журнал) — **задеплоен в прод 2026-07-24** (PR #179).
- [x] Plan 2: frontend (экран препода layout A, экран ученика, проектор,
      ревью) — в том же PR #179. Смоук-фиксы: SSE no-transform (gzip-прокси
      буферизовал стрим); dev BACKEND_URL смотрел в прод.
- [x] Plan 3: все 24 типа в live-плеере через ExerciseRenderer + upload-хук +
      черновики code/web — ветка `feat/live-player-full-types` (2026-07-24).
- [x] Фикс SSE-стабильности + backlog×2 (PR #183, прод 2026-08-01):
      стрим умирал через 15с (wait_for/anext — см. lessons.md);
      проектор — reconnect с refresh cookies через /auth/me;
      /active — живой DB-запрос членства (опоздавшие ученики видят баннер),
      redis invite-ключи удалены.
- [x] Рестайл live-экранов под Lively design system (PR #184, 2026-08-01).
- [x] Excalidraw CSS (доска-гиганты) + выбор курса-источника (PR #185);
      редизайн пикера материалов + превью у препода (PR #186); fallback
      пустого урока (PR #187); v2-блоки в material-сцене (PR #189).
- [x] Grace-период teacher_stale — деплой больше не убивает активные
      уроки (PR #188); ended-экран препода; toast ошибок сцены.
- [x] Полный E2E teacher+student в проде 2026-08-01: материал/доска/задача/
      прогресс/drawer/подсказка/сигналы/опрос/разбор/завершение/attendance —
      всё работает. Контент: курс «QA Cross-Role Test» → «Intro to Testing»
      (3 блока теории + 4 упражнения).
- [x] 5 UX-фиксов по итогам E2E (PR #190): память материала/задачи у рейлов,
      читаемый рендер ответов в разборе, ревью у ученика после завершения,
      label/htmlFor в опросе, модалка End lesson вместо confirm().
- [x] UX-аудит A–E + P0/P1/P2 (PR #191–#210, прод 2026-08-02):
      P0 — возврат к той же доске, Results-грид класса в ревью
      (summary.results), warning «no attendance»; P1 — страницы+видео в
      material-сцене, автосброс сигналов при смене сцены, результаты
      опросов в таймлайне ревью; P2 — «Сообщение классу», «Спросить
      учителя» (вопросы в панели препода + в summary), свободный режим
      ученика (чип Material при доске), автопривязка к журналу
      (ClassSession get-or-create на старте), дирижёр v1 (шаги
      материал→задания, ←/→, «2/5»). Hotfix #210 — hooks order (React #310).
- [x] Ревью на месте после End lesson вместо редиректа (PR #211, 2026-08-02).
- [x] Финальный E2E оба лица в проде 2026-08-02: 13 проверок зелёные
      (дирижёр, вопросы, сообщение, автосброс, free mode, журнал,
      завершение, ревью препода/ученика, summary в БД).

**Осталось по live-урокам:**
- [ ] Integrity model B — план из 3 PR (2026-08-02), детали ниже в секции
      «Integrity model B»; PR-1 отгружен.
- [x] Ученик: «мои результаты» в ревью после урока (S7 из UX-аудита) —
      `myResults` в `components/live/lesson-review.tsx`: сервер уже срезает
      `summary.results` до строк самого ученика, компонент выбирает свою.
- [x] Дирижёр v2: редактор программы урока (перестановка/скрытие шагов,
      свои шаги-доски). Редактор был написан ещё в PR #205/#210, но программа
      жила в `useState` и умирала при перезагрузке. **Персист добавлен
      2026-08-11:** колонка `live_lessons.programme` (JSONB, миграция
      `c7d8e9f0a1b2`), `PATCH /live-lessons/{id}/programme`, `NULL` = авто-
      список; программа срезается для студентов (скрытые шаги — план препода,
      не дело класса). Тест `test_programme_survives_reload_and_is_teacher_only`.
      Гидрация после F5 закрыта 2026-08-14: `frontend/e2e/live-programme.spec.ts`
      правит программу, перезагружает вкладку и ждёт свой же порядок шагов.
      Спека проверена сломанной фичей — без гидрации она падает.
- [x] Дизайн-долг вне live закрыт: `--pop: var(--primary-dark, …)` —
      тень идёт за брендингом; чип «published» на `success-soft/success-fg`;
      на странице Courses не осталось ни одного до-Lively цвета
      (`grep gray-|slate-|bg-white` — ноль).

---

## Integrity model B — все задания на server-graded V2 (2026-08-02)

Ответы не должны уезжать студенту в config; сервер — единственный судья.
Механика: `_strip_answers` (per-type срез с display-fallback'ами),
`grade_interactive_detail()` (per-item booleans), `POST /exercises/{id}/check`
(непersistящий, 30/min, только booleans), dual-mode V2-компоненты
(onGrade → сервер; локальный грейд остаётся для тичер-превью).

- [x] **PR-1 (#212):** инфраструктура + 5 одно-сабмитных типов —
      translation, sentence_builder (включая фикс утечки `words` =
      correct_order, подтверждена в проде), conjugation (+
      accent-forgiving в серверном грейдере), bubble_sheet; map_pin_drop
      срезан на бэке, UI отложен (V2-компонент одноцелевой vs multi-pin
      config, контента в проде 0). `?v2=1` флаг удалён — V2 теперь дефолт
      для срезанных типов (обычный урок + live). Тесты:
      tests/test_exercises_integrity.py (13).
- [x] **PR-2:** matching (`pairs` → `left_items` + перемешанные
      `right_items`), categorize (`categories` → `category_names` + общий
      пул), multi-pin map_pin_drop UI (`v2-exercise-live.tsx`, координаты и
      tolerance срезаны). Все ходят в `/check`.
- [x] **PR-3:** quiz (отдельная ветка `/check` — ответы в relation
      `questions`, не в config), reading, dialogue (срезан `is_correct` в
      опциях), crossword (слово заменено его длиной, геометрия цела).
      Тестов в `test_exercises_integrity.py` — 24.
- Не конвертируем (обоснованно): code_challenge (уже server-graded),
  file_upload/whiteboard (ручная проверка), scorm (CMI), word_search (список
  слов печатается на экране, из него же строится сетка), srs_flashcard
  (самооценка), math_system/stereometry (сервер решает из уравнений и тела —
  ответ вообще не хранится).
- [x] **PR-4 (спека `004-exercise-answer-leak`):** `GET /api/v1/exercises` —
      тот же фильтр `lesson_id`, что и у `by-lesson`, но без среза вообще.
      Студент читал `config.solution_code` и все скрытые test_cases; в проде
      подтверждено. Каждый эндпоинт решал сам, срезать ли, — теперь все ходят
      через `_for_reader()`, а прямой `ExerciseResponse.model_validate` остался
      ровно один, внутри неё. Тесты бьют по всем трём путям чтения, с
      положительным контролем на учителе.

### Осталось после PR-4 — клиент судит сам себя

Четыре типа грейдятся в браузере, и он же присылает вердикт. Срезать их ключи
нельзя — задание перестанет работать; оставить — ключ у студента. Закрывается
только переносом грейда на сервер, обе половины сразу.

**Контента этих типов в проде больше нет (2026-08-18).** Все 9 заданий удалены
после замера: 5 math_stepwise, 2 math_interactive, 1 robot_2d, 1 world_3d —
целиком демо/QA/Kitchen Sink, ни одной сдачи через `/submit` (19 строк в
`exercise_submissions` были `{"demo_seed": true}`, их положил сидер аналитики
напрямую в таблицу). Курсы не снимали с публикации: флага публикации у
заданий нет, и снятие спрятало бы 49 заданий ради 9. Дамп удалённых строк —
`/opt/lms/backups/client_graded_exercises_20260818.json` на проде.

Значит утечка и нулевой грейд сейчас никого не задевают. Но типы живы в коде и
в редакторе: **первое же реальное задание любого из четырёх вернёт обе дыры**.
Список ниже — входной барьер, а не бэклог.

- [x] `math_stepwise` — **строка выше врала**: server-graded он не был никогда.
      Клиент сверяет ответ с `cfg.final_answer`
      ([math-stepwise-exercise.tsx:331](../frontend/src/components/exercises/math-stepwise-exercise.tsx))
      и шлёт `correct` в payload. На сервере тип падает в `else` →
      `_submit_interactive` → `grade_interactive()`, где ветки `math_stepwise`
      нет, → `0.0, False`. **Побочный эффект: любая сдача math_stepwise
      получает 0 и «не пройдено», независимо от ответа.** Ветку писать не с
      нуля: `/math-validation/check-answer` уже делает саму сверку, её и звать.
      **Сделано 2026-08-18 (PR #350):** разбор ответа переехал из роутера в
      `math_validation/service.py`, `_submit_math_stepwise` зовёт его же, и
      клиентский `correct` больше не читается. Срез ключа `final_answer` —
      вторая половина, остаётся за 004.
- [ ] `math_interactive` — ключи лежат в `template_config` и разные на каждый
      из 8 шаблонов (`final_answer`, `correct_answers`, `answers`,
      `rule_answer`, `target_slope`/`target_intercept`, `target_points`,
      `choices[].correct`, `cards[].category`), грейдят
      `components/game/math/templates/*.tsx`.
- [x] `robot_2d`, `world_3d` — `custom_win_js` исполнялся в браузере.
      **Закрыто:** поле удалено из обеих схем вместе с переписыванием
      конфига (specs/005 и specs/012), а условие победы теперь — выражение
      над закрытым словарём, которое проверяет сервер. Кода уровень
      больше не несёт.
- [x] Общее для всех четырёх: `_submit_game_level` клал `completed` и `score`
      прямо из тела запроса — студент слал `{completed: true, score: 1.0}`, не
      открывая задание. **Закрыто 2026-08-18 (PR #352):** вердикт клиента больше
      не читается как оценка. `robot_2d` судит сервер (#343), `world_3d` — тоже
      с 2026-08-19 (specs/012). Остался `math_interactive`: записывается без оценки
      (`status: "submitted"`, без XP) до проверки на каждый из восьми шаблонов.

---

## Feedback-grammar integration: design handoff → v2 exercises (2026-06-10)

Source: `GrassLMS Design System.zip` → `%TEMP%\grasslms-design-system\design_handoff_grasslms\feedback\`.
Handoff = reference JSX + feedback.css for the feedback grammar:
invite → grab → guide → result → reward. Fixed: --mamp:1 --mdur:1,
link = green-500 w3, errors = coral, deferred check for pairs/categories, confetti on.

- [x] 1. globals.css: motion tokens, upgraded .gp-tile states, fb-* classes
      + keyframes, sheet slide-up, th-* annotation/term CSS.
- [x] 2. lesson-shell.tsx: sheet animation, instant/instantLabel props;
      fb-motion.ts (flyClone/flyXP).
- [x] 3. translations.ts: 33 new keys × 6 locales (en/es/ru/tr/de/uk) +
      fixed EN exercise.dialogue.goodReply ("Buena respuesta." leak).
- [x] 4. 13 v2 components upgraded: matching (drag-thread + deferred),
      fill-blanks (flyClone), ordering (FLIP pointer-drag), categorize
      (buckets + deferred), quiz, numeric-input, number-line, coordinate-plane,
      equation-balance, math-stepwise, sentence-builder, dialogue (typing dots),
      srs-flashcard (3D flip). Contracts preserved.
- [x] 5. NEW: theory annotations — student highlights/underlines persist
      (lesson_highlights table, /progress/lessons/{id}/highlights API,
      HighlightableContent wrapper with offset+snippet anchoring, block_key
      per text block) + hover term hints (TipTap Term mark → span[data-term],
      pure-CSS tooltip via ::after so offsets stay stable).
- [x] 6. Verified: next build green, vitest 78/78, backend pytest
      test_progress 8/8 (incl. 2 new highlight tests), live preview E2E
      (matching deferred flow, categorize drag, flashcard flip, highlight
      create→persist-after-reload→delete, term tooltip content).
- [x] 7. Committed (a82e635 + migration-guard fix 0521717) and deployed
      2026-06-11. First deploy failed: lifespan create_all made the table
      before alembic ran (lesson in tasks/lessons.md); has_table() guard
      fixed it. Prod verified: frontend 200, API up, highlights endpoint
      live (401 unauth, not 404).

Out of scope (follow-up): full theory.jsx reading UX (progress bar, section
rail, spoiler — repo theory-viewer is iframe-based; text lessons got the
annotation layer only), flyXP wiring (no #xp-anchor in lesson chrome yet —
util shipped dormant).

---

## Avatar chibi restyle + bed default nudge (2026-05-31)

Branch: `feat/avatar-chibi-restyle`

Owner decisions: art = **chibi cute** (big head ~44% height, stubby rounded body,
big eyes; ref Crossy Road / Animal Crossing). Run = **fully autonomous**, all ~45
items, ≤3 iterations each, no check-ins.

- [x] Bed default coords +0+1 (placement.ts: bed z 0→1)
- [x] Chibi anchor spec `A` in avatar/voxels.ts (source of truth)
- [x] Boy + girl base bodies (chibi: head ~43% of 6.5-tall figure, stubby body)
- [x] Face variants (big cute eyes; all 6 verified front view)
- [x] Fitting-room harness `/avatar-fitting` (public dev route, 1 GL context, contact sheet, dev-guarded)
- [x] Refit hair (6) / hats (6) / glasses (5) / outfits (6) / back (5) / hand (6) / accessory (5) — all screenshot-verified
- [x] detect-overlaps clean + tsc + lint + vitest (voxels, i18n) all green
- [x] Commit + PR — оказалось давно сделано: чиби ушёл на main коммитом
      `1583435` (вместе с комнатой) и живёт в проде; проверено 2026-08-19 за
      демо-ученика на `/achievements?tab=avatar` (рендерится WebGL-канвас,
      `/my-avatar` — легальный редирект на таб). Бокс висел протухшим

### Review
- Chibi rewrite of `frontend/src/lib/avatar/voxels.ts` against a shared `A` anchor
  spec. All 12 builder exports + signatures preserved (room scene, avatar canvas,
  detect-overlaps, export-vox, vitest unchanged).
- Iterations: hand-held items hidden behind the arm (z+) → moved in front of the
  hand / outboard (book, sword, flower, controller); balloon raised to float above
  the head. acc-book likewise. 2–3 passes per problem item.
- Bodies kept gender-neutral (girl slightly narrower); gender read via hair/outfit
  — standard voxel-avatar approach. Can add a distinct girl default if owner wants.
- Room furniture untouched (per owner: avatars + clothing/accessories only). Bed
  change is the +0+1 default-coordinate nudge only.
- Dev harness at /avatar-fitting kept for future passes; 404s/no-ops in production,
  allowlisted for the i18n ratchet. Remove before public-repo flip if undesired.

---

## Research / Design — Universal Education Platform (2026-05-23)

Перевод lms из mono-app в multi-service universal education platform (любой K12/university предмет со стандартным skill-set). Текущий статус: **только дизайн-доки, кода ещё нет**.

См. [`tasks/research/2026-05-23-universal-platform-architecture/00-INDEX.md`](research/2026-05-23-universal-platform-architecture/00-INDEX.md) — 6 файлов: audit текущей архитектуры, спецификации серверa, разбор external lesson generator + external curriculum service, предложенная 4-сервисная архитектура (SAS/KGS/LGS/LMS), шаблонная подсистема для plans/tasks/decks.

Решения, зафиксированные на этом этапе:
- Cloud LLM only (текущий Hetzner CX22 не тянет полезный local LLM)
- Template-first generation (~8× экономия cloud LLM vs zero-shot)
- 4 сервиса: SAS (sortation block) + KGS (knowledge graph + BKT) + LGS (lesson generator) + LMS (UI/ops)
- External curriculum service production-grade — берём BKT, EM-калибровку, LessonFixture как есть, math-specific бьём в plugin
- Pluggable mastery model (BKT/FSRS/Rubric/DKT/IRT) — strategy registry, не if/else
- Subject = YAML manifest + plugin = 2-4 недели на новый предмет

**Связь с пайплайнами генерации (2026-08-11):** LGS (lesson generator
service) из этой архитектуры — это ровно пайплайны A/B/C из секции «Три
пайплайна генерации контента». Решение на сейчас: **пайплайны делаем
модулями внутри текущего монолита**, разбиение на 4 сервиса не блокирует их
и откладывается до момента, когда упрёмся по-настоящему. Разносить на
сервисы ради трёх генераторов — переезд ради переезда. Что при этом стоит
подсмотреть в доках уже сейчас, не переезжая: template-first подход
(06-templates-extension.md) и pluggable mastery model (strategy registry
вместо if/else) — они полезны и в монолите.

Открытые вопросы (next session):
- Fork external curriculum service в lms-monorepo или отдельный package?
- Methodist UI: extend lms `(admin)` или Vite+React SAS standalone?
- Миграция lms `app/skills/` / `app/learning_paths/` / `app/exercises/` в KGS-owned модели без поломки текущих юзеров
- Subject manifest schema — нужен отдельный design pass
- Plugin packaging mechanism — installable Python package или directory + manifest

---

## В работе — Massive Feature Push (2026-05-13, ветка `claude/recursing-booth-ac4fdb`)

Задачи в порядке приоритета. Коммиты в текущую ветку, в конце — PR в `main` → авто-deploy через GitHub Actions.

**Решения (зафиксированы пользователем 2026-05-13):**
- SCORM/xAPI: новый exercise type `scorm_package`, `scorm-again` (MIT), внутренний LRS (таблица `xapi_statements`).
- Wolfram → SymPy backend (бесплатно).
- Математический редактор: **mathlive** (~200kb, полный equation editor).
- Step-by-step: гибрид, флаг `validate_steps` в config упражнения.
- TinkerCAD: **скип** (нет публичного embed API).
- Course export: PDF через Playwright (визуально точный) + JSON re-import (schema v1).
- PDF варианты: `?variant=student|teacher` query-param.
- Advanced math: исследовать после остального, решения принимать автономно.

**Итеративные цели:**

- [x] **F1.** Унификация exercise menu — commit `2831e8d`. Новые типы `scorm_package` + `math_stepwise` в backend enum + frontend ExerciseType + content-library + course editor. Migration `n2p3q4r5s6t7`. Все 19 типов теперь читаются из единого `EXERCISE_TYPES_META` в `frontend/src/lib/api/exercises.ts`.
- [x] **F2.** SCORM/xAPI — commits `a48e945` (backend), `226cb2b` (frontend). Module `app/scorm_import/` (upload .zip / extract / serve / per-package + generic xAPI inbox), internal LRS table `xapi_statements`. Migration `o3p4q5r6s7t8`. Frontend: `SCORMConfigEditor` + `SCORMPackageRenderer` (iframe + scorm-again CMI bridge). `scorm-again@^3.0.4` added to package.json — **run `npm install --legacy-peer-deps` after pull to activate CMI tracking**.
- [x] **F3.** SymPy `app/math_validation/` — commit `96aee11`. Endpoints `/validate-step`, `/check-answer`, `/solve`, `/factor`, `/simplify`, `/steps`. SymPy added to backend `pyproject.toml`. Handles `^` / implicit multiplication / multi-root answer sets.
- [x] **F4.** `math_stepwise` — commit `a5558b7`. Teacher editor (problem / variable / max-steps / final-answer / `validate_steps` toggle / auto-generate via SymPy). Student renderer (mathlive `<math-field>` per step, per-step equivalence-checked, final-answer SymPy-checked). `mathlive@^0.105.2` in package.json — **run `npm install --legacy-peer-deps` to enable the equation editor; falls back to plain text input otherwise**.
- [x] **F5.** Course export `app/export/` — commit `c207835`. GET `/api/v1/courses/{id}/export?format=json|pdf&variant=student|teacher`, POST `/api/v1/courses/import`. JSON schema `grasslms-course-v1`. PDF via Playwright + Chromium; if playwright not installed the endpoint returns 503 with install instructions. **Frontend export/import buttons are not wired yet** — admins can hit the URL directly. Backlog item below.
- [x] **F6.** Advanced math research — see [`docs/RESEARCH_advanced_math.md`](../docs/RESEARCH_advanced_math.md). Decision: F1-F5 already covers 5 of the 7 listed topics through `math_stepwise` + SymPy. Function plotting (TipTap `<MathPlot>` node) and stereometry editor (`world_3d` extension) and `math_system` (linear systems) are deferred to follow-up sprints with separate todo entries below.
- [ ] **F7.** UI walkthrough (7 features) — **deferred this session**. Plan: see "Backlog from this push" below.
- [ ] **F8.** Open PR to `main` (manual step after review).

### Backlog from this push

- [ ] **Wire frontend export/import buttons** for course-edit page (button bar: Export PDF · Export JSON · Import JSON). Backend ready, just needs UI in `(admin)/admin/courses/[courseId]/edit/page.tsx`.
- [ ] **Add `npm install --legacy-peer-deps`** as a Dockerfile-frontend step (already there, just confirming) and verify Sentry/React-19 peer-dep still resolves with the two new deps.
- [x] ~~Wire frontend export/import buttons~~ — **commit `622a885`**. Three buttons in course-edit toolbar (Export JSON, Export PDF, Import JSON) using apiClient + Blob download + hidden `<input type="file">`. PDF button surfaces a clear toast when backend returns 503 (Playwright not yet installed).
- [x] ~~Wire `math_stepwise` xAPI emit~~ — **commit `ca8351d`**. Fire-and-forget POST to `/scorm-import/xapi/statements` after every submission with verb `answered`, success/score/response/steps. Failures swallowed.
- [x] ~~Frontend `/courses/{id}/print` page~~ — **commit `dbeef09`**. New route group `app/(print)/` with minimal no-sidebar layout. Page fetches `/courses/{id}/export?format=json&variant=...` via apiClient and renders modules→lessons→exercises top-to-bottom. Teacher variant shows quiz ✓ marks, correct_answer, hidden test-case outputs, math_stepwise expected_steps, code_challenge solution_code. CSS `@media print` rules + A4 page size + `.no-print` button class. Today: teacher can open URL + Cmd+P. After the backend gets chromium, Playwright will navigate to this same URL.
- [ ] **Install Playwright + chromium in backend Docker image** to enable Playwright-driven PDF export. Steps: add `playwright>=1.49` to `backend/pyproject.toml`; in `backend/Dockerfile` after `pip install -e .` add `RUN playwright install --with-deps chromium`. Image size grows ~600 MB.
- [ ] **Auth for Playwright-driven PDF export.** The print page currently relies on the apiClient's JWT-from-localStorage. Playwright (running in the backend container) has no localStorage. Plan: backend mints a single-use HMAC-signed `?token=...` query param scoped to one course+variant+expiry; print page recognises it and short-circuits localStorage; backend Playwright invocation passes the token through to `page.goto(...)`.
- [ ] **F7 UI walkthrough** — certificates / ДЗ / прогресс / enrollment / knowledge / i18n / calendar. Use Playwright or Claude Preview against staging.grasslms.online with the test accounts. Capture screenshots + file bugs as discovered. Requires owner-supplied test-account credentials in the harness.
- [x] ~~Math follow-ups~~ — вынесены в отдельную секцию «Продвинутая
      математика: три независимые фичи» ниже (2026-08-11).

---

## Ждёт действий пользователя

P1-15 и P1-19 сняты 2026-08-14: оба описывали SAT-центры, которых больше
нет ни в продукте, ни в нише. Живут дальше как Ф2-8 (демо-видео под новую
нишу) и Ф4-1/Ф4-2 (оффер и 50 контактов, цель — платящий, а не отзыв).

- [ ] **P1-20.** Отправить Tali Green (@green_mammy, Teachers for Ukrainian Kids,
      ~30 учителей) ссылку на demo: https://grasslms.online/demo + краткое
      сопроводительное письмо. Demo-стек готов (2026-05-25):
      `scripts/seed_demo_org.py` создаёт "GrassLMS Demo" org с 3 курсами
      (Math 5 / English B1 / CS Web Basics), реальным прогрессом, ДЗ, XP,
      сертификатом. Запуск в проде по runbook
      [`docs/DEPLOY_DEMO.md`](../docs/DEPLOY_DEMO.md): pull → flip
      `DEMO_MODE_ENABLED=true` в `/opt/lms/.env` → rebuild backend →
      `docker compose exec backend python scripts/seed_demo_org.py`.
      Контекст контакта: сооснователь — Mikhail Khotyakov (external math tutor, Lyzeum 2).
      Текущий стек: EduRouter (£50/мес), Google Classroom, external math tutor (math
      homework), Google Meet, Luma, Telegram. Боли: фрагментация инструментов,
      нет единой системы упражнений/ДЗ/прогресса по non-math предметам,
      сертификаты вручную. Оффер: бесплатный доступ, помощь с миграцией.

## Уборка после инцидента 2026-05-04 (некритично, не блокирует работу)

- [x] Остатки worktree-директории — `F:/lms/.claude/worktrees/` больше не
      существует (проверено 2026-08-13). Кто-то уже убрал, действий нет.
- [x] Ветки на origin вычищены 2026-08-14 — удалено 18 смердженных, включая
      все шесть из этого пункта. На origin осталось шесть живых веток.
- [x] Kill-switch SW удалён (PR #277, спустя три месяца вместо двух
      недель): `frontend/public/sw.js` вместе с `src/app/offline/` — это была
      его fallback-страница, недостижимая без воркера. Регистрации в коде уже
      не было (`grep serviceWorker src/` пуст).
- [x] Ветка `wip/recovered-stash-2026-05-04` удалена 2026-08-14 (была
      `13224be`, воскрешается из reflog). Салважить оказалось нечего: всё,
      что она несла, давно в `main` — `billing/ls_service.py`,
      `billing/lemonsqueezy.py`, `app/knowledge/*` и обе миграции лежат
      там своим путём. Остальные её 900 файлов — версии от мая: монолитный
      `translations.ts` до code-split локалей, `sat-test-runner` снятого
      SAT. Против `main` это не 53k добавлений, а 222k удалений.
- [x] Судьба пяти exercise-типов решена сама: srs_flashcard, crossword,
      word_search, map_pin_drop и bubble_sheet давно в продукте — все пять
      в `exercise-renderer.tsx` на `main`, и все прошли через Integrity
      model B. Ветка-донор `claude/focused-tereshkova-b85ccf` удалена.

## Опциональные конфиги (когда понадобится монетизация)

- [ ] Включить Sentry: `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` на проде,
      ребилд контейнеров.
- [ ] Включить Stripe: `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`.
- [ ] Включить email: `EMAIL_ENABLED=true` + `SMTP_*` переменные.
- [ ] Перенести бэкапы Postgres off-server (S3/R2). Сейчас локально
      в `/opt/lms/backups/` с 7-дневной ретеншн.

---

## Протестировать фичи (UI walkthrough)

**Закрыто автоматикой 2026-08-11** — четыре функциональных журнея в
`frontend/e2e/journeys/`, 18 тестов, все зелёные. Проверяют результат, а не
URL, и гоняют цепочки через UI, как живой пользователь. Прежние
`e2e/roles/*.spec.ts` сверяли только адрес страницы и покрывали ноль
функционала (методистский вообще ходил на удалённую страницу и «проходил»).

- [x] **Домашки/задания** — `teacher-homework.spec.ts`: учитель создал →
      ученик нашёл в своём списке и сдал → учитель раскрыл сдачу и оценил
      с отзывом → ученик видит балл и отзыв → ученик попал в журнал оценок.
- [x] **Сертификаты** — `student-certificate.spec.ts`: запись → прохождение
      всех уроков → 100% на /progress → сертификат выпущен → номер проверяется
      **без сессии** (половина для работодателя) и скачивается с сессией.
- [x] **Запись на курсы (массовая)** — `admin-enrolment.spec.ts`: импорт CSV
      с гейтом родительского согласия → аккаунты созданы → запись подтверждена
      со стороны курса (журнал оценок), а не по строчке-сводке.
- [x] **Прогресс/аналитика** — там же: KPI-плитки посчитаны, CSV-выгрузка
      отдаёт больше одной строки (пустой файл — тоже 200, он ничего не значит).
- [x] **Календарь/расписание + посещаемость** — `schedule-attendance.spec.ts`:
      событие учителя видно ученику на его календаре; отметка посещаемости
      читается обратно и ростером учителя, и записью ученика.
- [x] **Самозапись + learning paths** — `learning-path.spec.ts`: ученик сам
      записался на опубликованный курс; путь виден и запись на него **реально
      записывает на курсы** (иначе «записан в путь» при пустом списке курсов
      выглядит как рабочая фича). Путь при создании — черновик, студентам
      видны только опубликованные.
- [x] **XP / достижения / лидерборд** — `gamification.spec.ts`: верный ответ
      на quiz двигает `total_xp`, страница достижений отрисована, ученик есть
      в лидерборде. До этого `lifecycle.spec.ts` слал сабмиты по всем 24 типам,
      но проверял только «не 5xx» — награду не проверял никто.
- [x] **Уведомления** — `notifications.spec.ts`: оценка задания растит счётчик
      непрочитанных, попадает в список и в колокольчик, read-all обнуляет.
      Уведомление пишется побочным эффектом оценки: оценка ложится в любом
      случае, поэтому со стороны учителя сломанный нотификатор неотличим от
      рабочего.
- [x] **Встречи, командные проекты, peer review, профиль** —
      `collaboration.spec.ts`: встреча учителя видна ученику, проект в списке,
      раунд peer review создаётся и страница ученика открывается, смена имени
      переживает перезагрузку (имя возвращается в teardown, иначе ломает
      остальные спеки).
- [x] **Раздача в peer review** — `peer-review.spec.ts` (2026-08-12): раздача
      разбивает класс на пары → рецензенту достался **чужой** сабмит, а не
      свой → он видит его на своей странице → сдаёт рецензию → у препода
      сходится счётчик (`total = completed + pending`).
      ⚠️ Прошлая запись здесь врала: «нужны реальные сдачи для распределения».
      Не нужны — `peer_review/service.py` разбивает по кругу **записанных на
      курс студентов** и на их работы не смотрит вообще. Настоящее условие —
      минимум двое записанных, а в QA-сиде студент один. Журней создаёт двоих
      через `/admin/bulk-enroll` (там обязателен `parental_consent` — защита
      детских аккаунтов) и убирает их за собой; список и удаление
      пользователей доступны только админу, учителю там 403.
- ~~**Библиотека материалов** — Knowledge base + RAG + pgvector поиск~~ —
  **снято 2026-08-11: модуль удалён.** UI и роутер вырезаны 2026-05-31,
  `/api/v1/knowledge/*` отдаёт 404. Тестировать нечего.
- [ ] **Мультиязычность** — 6 локалей (en/es/ru/tr/de/uk). Парность ключей
      уже гоняет Vitest в CI; глазами проверять **вёрстку в длинных языках**
      (de/uk) — переполнение кнопок/табов машина не ловит
- [ ] **Календарь/расписание** — Events, повторения, iCal, auto-дедлайны

## Идеи на потом

- [ ] **Экспорт курсов и заданий** — экспорт в PDF, JSON или HTML/CSS/JS,
      чтобы учитель мог сохранить свою работу локально (backup / портативность)
- [ ] **Математика: пошаговое решение с feedback** — задачи с поэтапным вводом
      решения, проверка каждого шага, подсказки при ошибках (как в Dogl)
- [ ] **Интеграция с TinkerCAD** — встраивание 3D-моделирования / электроники
      в уроки через iframe/API TinkerCAD
- [ ] **Аналог Wolfram Alpha для проверки решений** — интеграция с Wolfram Alpha
      API или собственный math solver для автоматической проверки математических
      выражений, уравнений, графиков
- [ ] **SCORM / xAPI поддержка** — импорт SCORM 1.2 / 2004 пакетов и xAPI
      (Tin Can) активностей. Импорт из Articulate Storyline/Rise, iSpring,
      Adobe Captivate и аналогичных authoring tools. Плеер SCORM-пакетов
      внутри платформы, трекинг прогресса/оценок через xAPI statements,
      LRS (Learning Record Store) — встроенный или интеграция с внешним.
- [ ] **Поддержка продвинутой математики** — убедиться, что платформа корректно
      поддерживает создание и решение: квадратные уравнения с заменой переменных,
      дробно-рациональные уравнения, стереометрия (призмы, пирамиды, двугранные
      углы), графики функций и системы линейных уравнений, разложение на множители,
      задачи с физическим смыслом (сопротивление проводников → квадратные уравнения),
      олимпиадные задачи
- [ ] **Система обратной связи по урокам и контенту** — две связанные сущности:
      (1) lesson-level feedback в конце урока (быстрый rating 1–5 + опциональный
      комментарий: «было понятно / темп ОК / нужно ещё примеров»);
      (2) content-unit feedback на каждый блок (задание / текст / видео):
      кнопка «🚩 проблема с этим блоком», категория (опечатка / непонятно /
      ошибка в проверке / битая ссылка), свободный текст. Анонимно для студента,
      но привязано к user_id для админов.
      - Backend: новая таблица `content_feedback` (lesson_id или content_block_id,
        kind enum, rating int|null, comment text, user_id, created_at, status).
        Эндпоинт POST `/feedback`, list для админов `/admin/feedback?status=open`.
      - Frontend: feedback widget внизу lesson page (rating + комментарий) +
        небольшой 🚩 на каждом content block / exercise card. Modal с формой.
      - Админка: /admin/feedback страница, фильтры по курсу/типу/статусу,
        кнопки resolved/wontfix, ссылка прямо в lesson editor на проблемный блок.
      - Гамификация: +5 XP студенту за полезный отзыв (после ручной модерации).

---

## Live-урок: дашборд преподавателя + AI-сигналы (2026-06-11)

Источник: дизайн-макет «AI Math / Урок (live)» — фазы урока
(Разминка/Объяснение/Практика/Рефлексия), сетка ученик × задание в реальном
времени, KPI (в темпе / опередили / застряли / misconception), панель
«AI-сигналы» с подсказками преподавателю.

⚠️ **Разведка 2026-06-11 УСТАРЕЛА** — она писалась до Live Lesson Mode.
Актуальная ниже.

**Разведка 2026-08-11 (что есть сейчас):**
- **Realtime-слой ЕСТЬ.** `app/live_lessons/` — `realtime.py` (SSE + Redis
  pub/sub), роутер на `/api/v1/live-lessons`. Отгружен в прод 2026-07-24,
  стабилизирован PR #183.
- **Половина сетки уже есть.** `roster()`
  ([live_lessons/service.py:422](backend/app/live_lessons/service.py:422))
  отдаёт по ученику: online, `current_view`, **`exercise_id` — кто на каком
  задании прямо сейчас**, signal. `heartbeat()`
  ([service.py:398](backend/app/live_lessons/service.py:398)) публикует
  преподу событие `presence` при смене вида/задания. Транспорт для живой
  сетки уже течёт.
- **Чего НЕТ — исход в ячейке.** Сетка знает «Петя открыл задание 3», но не
  «решил с 1-й / решил с попыток / ошибается / не дошёл». Это считается
  только пост-фактум в `_lesson_results()`
  ([service.py:211](backend/app/live_lessons/service.py:211)) и только при
  `finalize_lesson`; в коде так и написано — «live progress dies with the
  lesson». Нет KPI-строки, нет фаз урока как модели (есть шаги дирижёра).
- **AI-сигналы — по-прежнему НЕ существуют.** Модуль `ai/` удалён;
  `recommendations/` ([recommendations/service.py](backend/app/recommendations/service.py))
  — rule-based и **только для студентов**. Нет detection «застрял /
  опередил / misconception», нет подсказок преподавателю.

**План пересмотрен 2026-08-11.** Изначальный порядок (сначала матрица,
потом KPI) отвергнут по двум причинам: (1) у препода ноутбук или небольшой
монитор, 30×8 = 240 ячеек туда не влезают и конкурируют с материалом/доской;
(2) посреди урока никто не читает матрицу — нужен ответ на один вопрос
«кому сейчас помочь». Фазы урока отдельной моделью НЕ делаем: шаги дирижёра —
уже та же ось, вторая сущность будет дублем.

- [x] **Баги живого прогресса — починены 2026-08-11.** `/live-lessons/{id}/progress`
      считал сабмиты по exercise_id за всё время и без фильтра по членам группы:
      вчерашнее ДЗ горело зелёным на сегодняшнем уроке, `attempts` включал всю
      историю. Добавлено окно урока (`>= lesson.created_at`, как в
      `_lesson_results`) для сабмитов и черновиков + фильтр по группе; `passed`
      стал липким (поздний неудачный ретрай не красит решённую ячейку).
      Тест `test_progress_ignores_work_from_before_the_lesson` — проверено,
      что падает без фикса.
- [ ] **PR-A. KPI + список «кому помочь»** (первым). Три числа и имена, а не
      сетка: застрял (≥3 попыток без успеха), стоит (черновик обновлялся,
      сабмита нет N минут), опередил (прошёл текущее и ушёл вперёд). Данные
      уже приходят — `/progress` + `roster()` (в роутере есть `current_view`
      и `exercise_id`). Чистая функция + пороги от медианы класса, бэкенд не
      нужен. Компактно, влезает на маленький экран.
- [ ] **PR-B. Матрица ученик×задание** как **сворачиваемая** панель: ученики
      в строках (имена читаемы), задания в колонках (тайлы ~20px), текущая
      колонка подсвечена и залипает. `/progress` принимает повторяемый
      `exercise_id`. ⚠️ **Обязательно:** на событие `submission` патчить
      конкретную ячейку в кэше, а НЕ инвалидировать запрос — иначе каждый
      сабмит класса тянет полный перезапрос 30×8 (сейчас инвалидация на
      page.tsx:145 дёшева только потому, что колонка одна). Событие уже несёт
      `student_id`/`exercise_id`/`passed`/`score`. Рефетч — только на
      реконнект и смену шага.
- [ ] **PR-C. Матрица в пост-урочном ревью** — там есть время и целый экран,
      а данные уже лежат в `summary.results`. Почти бесплатно.
- [x] **Режим «дирижёр» v1 — отгружен в Live Lesson Mode** (PR #205/#210,
      2026-08-02): шаги материал→задания, ←/→ хоткеи, «2/5», пуш сцены
      ученикам/проектору. Осталось (см. «Осталось по live-урокам» выше):
      редактор программы (перестановка/скрытие шагов). Исходная идея ниже —
      для контекста:
      урок = упорядоченная последовательность блоков/фаз (разминка → объяснение →
      практика → рефлексия, и блоки контента/задания внутри). Учитель ведёт урок
      шаг за шагом: «дальше / назад / перейти к блоку N» одним движением, без
      перезагрузок и потери состояния. Текущий активный блок подсвечен (как
      трекер фаз в макете), переходы плавные (предзагрузка следующего блока,
      без мигания). Активный блок пушится на планшеты учеников и проектор
      (синк) — что ведёт учитель, то у всех на экране. Backend: «активный блок»
      в модели сессии урока (+ отдаётся через realtime-слой live-дашборда).
      Frontend: панель-конструктор урока (лента блоков), хоткеи (→/←/пробел как
      в reveal.js), стыкуется с reveal-плеером презентаций (Фаза 1 ниже) и
      live-сеткой. Решить: блоки = фазы журнала + контент-блоки урока, или
      отдельная «runtime-программа урока» поверх существующих lesson content.
- [ ] **PR-D. LLM-слой поверх сигналов** — формулировка действия («N застряли
      на обратной операции → собрать на 5-мин разбор», «X закончил трек за
      6 мин → выдать челлендж») и детект misconception по паттерну ошибок.
      Кнопки «Собрать группу» / «Выдать». ⚠️ платный API — бюджет и ключ
      согласовать до первого вызова. Пороговая часть — это PR-A, и она НЕ
      «AI»: три `if`, называть их AI-сигналами было ошибкой именования.
- [ ] **Управление классом во время урока** (из макета, ниже приоритет):
      синхронизация с проектором, блокировка планшетов, мультиязычные ярлыки
      ученика (RU/AZ/HM в макете). Вынести в отдельный спринт.

---

## Продвинутая математика: три независимые фичи (2026-08-11)

Вынесено из «Backlog from this push». Источник:
[`docs/RESEARCH_advanced_math.md`](../docs/RESEARCH_advanced_math.md).
Кода нет ни по одной (проверено grep'ом 2026-08-11 — имена встречаются
только в этом файле и в research-доке). Три фичи не зависят друг от друга,
делаются в любом порядке и разными PR.

**Общее решение по графике (2026-08-11):** новую plotting-библиотеку НЕ
тащим. Plotly в проекте нет, JSXGraph — только в `scripts/legacy/`. Живые
математические виджеты (`components/game/math/templates/coordinate-plane.tsx`,
`number-line.tsx`) рисуются своим SVG на дизайн-токенах — и переживают
тёмную тему. Это и есть прецедент для M1 и M2.

### M1. `math_system` — системы линейных уравнений ✅ (#269 бэкенд, #271 фронт)

- [x] Backend: значение `math_system` в enum типов упражнений + миграция
      (схему трогаем только Alembic'ом — D2).
- [x] Config-схема: `{equations, variables, problem}`. Ответ ученика —
      `{kind, values}`, где `kind` = unique / none / infinite. Метод решения
      (подстановка / сложение / графический) НЕ проверяем: по одному
      численному ответу его не отличить, а требовать — значит врать.
- [x] Проверка — `app/math_validation/service.py` (SymPy `linsolve`),
      без ключа в конфиге: сервер каждый раз решает уравнения учителя.
      Кейсы «нет решений» и «бесконечно много» покрыты тестами.
- [x] Frontend: редактор (учитель, с превью «что засчитается») + рендерер
      `MathSystemV2`. Server-graded V2, Integrity model B.
- [x] Визуал: две прямые своим SVG поверх `GridAxes`. Вторая пунктиром —
      иначе «бесконечно много» неотличимо от одной прямой. Три переменные
      не рисуем вовсе.

### M2. `<MathPlot>` — inline-графики функций в TipTap ✅ (#268)

- [x] TipTap-нода `mathPlot` (атрибуты: выражение(я), диапазон x/y, сетка,
      подписи). Ставится в теорию и в условие задачи, как уже стоит Term-mark.
- [x] Рендер: сэмплирование точек + polyline в SVG на токенах. Разрывы
      (tan, 1/x) не соединяются — `isPole` рвёт сегмент.
- [x] Парсинг выражения — свой рекурсивный спуск (`lib/math/expression.ts`),
      не SymPy-эндпоинт и намеренно не `eval`: выражения пишет учитель.
- [x] Кнопка в тулбаре редактора + превью.

### M3. Стереометрия ✅ (#275)

- [x] Открытый вопрос закрыт владельцем 2026-08-13: **проверяем численный
      ответ**, не построение. Построение — отдельная фича сверху, если
      численная окупится.
- [x] Тип `stereometry`: пять тел (параллелепипед, правильная пирамида,
      цилиндр, конус, шар) × объём / площадь поверхности / боковая площадь.
      Ответ ученика — одно число.
- [x] Проверка на сервере, ключа в конфиге нет (как в M1):
      `app/math_validation/solids.py`. Допуск — половина единицы последнего
      запрошенного знака, иначе объём конуса нечем засчитать.
- [x] Три.js/R3F, новой 3D-либы не понадобилось. Тело крутится — в этом и
      смысл: видно, где высота, а где апофема. Грузится через `next/dynamic`.
- [x] Редактор учителя строит поля размеров из той же таблицы, что и
      формулы, и показывает, что именно засчитается.
- НЕ сделано намеренно: сечения и двугранные углы. Это уже построение,
  см. первый пункт.

---

## Три пайплайна генерации контента (2026-08-11) — записано на будущее

Три отдельные огромные задачи, каждая = свой спринт(ы). Общий знаменатель:
**template-first, LLM только там, где шаблон не тянет** (решение из
`tasks/research/2026-05-23-universal-platform-architecture/` — ~8× экономия
на cloud LLM). ⚠️ Все три упираются в платный API — бюджет и ключ
согласовать отдельно, до первого вызова.

- [ ] **Пайплайн A — генерация заданий по математике.** Вход: тема/скилл +
      уровень + количество. Выход: валидные exercise-конфиги существующих
      типов (`math_stepwise`, `numeric_input`, `equation_balance`,
      `number_line`, `coordinate_plane`, `quiz`). Опора на то, что уже есть:
      SymPy-модуль `app/math_validation/` (генерация вариантов + проверка
      эквивалентности — правильный ответ считает солвер, не LLM),
      `scripts/seed_math_templates_demo.py` как прото-шаблоны. Вопросы:
      параметризованные шаблоны (условие с дырками + диапазоны), гарантия
      «решение существует и красивое», дедупликация, привязка к скилл-графу.
      Обязательный gate: сгенерённое прогоняется через серверный грейдер
      до публикации.
- [ ] **Пайплайн B — генерация задач по программированию.** Выход:
      `code_challenge` (starter code + тест-кейсы + эталонное решение) и
      `robot_2d`/Blockly. Опора: sandbox-контейнер есть, тест-кейсы уже часть
      модели. Отличие от математики — **валидация исполнением**: эталонное
      решение обязано пройти все сгенерённые тесты в sandbox, а заведомо
      сломанные мутации — упасть (иначе тесты дырявые). Вопросы: покрытие
      edge-кейсов, согласованность формулировки и тестов, языки (Python
      первым), утечка решения в конфиг — см. Integrity model B.
- [ ] **Пайплайн C — генерация презентаций.** Расписан фазами ниже
      (reveal.js: модель+плеер → редактор → AI-генерация → экспорт).
      Генерация = Фаза 3, заблокирована Фазой 1. Здесь не дублирую.

A и B независимы друг от друга и от C.

---

## Огромная задача: генерация презентаций (reveal.js + AI) (2026-06-11)

Референс: `F:\repos-review\reveal.js\tour-lxd.html` — ручной reveal.js-деck
(169 строк) с образовательным контекстом: фазы урока как вложенные слайды,
fragments (пошаговый показ), auto-animate (морфинг между фазами), speaker
notes (окно докладчика + таймер), gradient-фоны. «Обновить под мою штуку» =
адаптировать этот сетап под модель урока GrassLMS.

**Разведка 2026-06-11:** презентаций/слайдов в платформе **НЕТ**. `ContentType`
([courses/models.py:17](backend/app/courses/models.py:17)) — 8 типов
(text/video/quiz/code_challenge/file_upload/interactive/robot_2d/
math_interactive/world_3d/theory), нет `slide`/`presentation`. content-renderer
рендерит markdown/HTML/TipTap, reveal.js в `package.json` отсутствует.
Фича может «навеситься» на существующую модель урока через новый ContentType +
ветку в content-renderer.

- [ ] **Фаза 1 — модель + плеер.** Новый `ContentType.presentation`; структура
      `Lesson.content` для деки (список слайдов: заголовок/текст/медиа/fragments/
      speaker notes/фон). Ветка в content-renderer: reveal.js-плеер (vendored
      `dist/` из клона, не CDN — наши PWA/offline и no-store правила). Режимы:
      студент (просмотр), преподаватель (speaker view + проектор-синк → стыкуется
      с live-дашбордом выше).
- [ ] **Фаза 2 — редактор деки.** Авторинг слайдов в админке (как lesson editor):
      добавить/упорядочить слайды (dnd-kit уже есть), на слайд — текст (TipTap),
      изображение (S3-аплоад уже есть), fragments, заметки, выбор перехода/фона.
      Маппинг в reveal.js-разметку при рендере.
- [ ] **Фаза 3 — генерация через ИИ.** По теме урока / существующему theory-
      контенту LLM (Claude) генерит черновик деки (слайды + speaker notes +
      предложения fragments) → преподаватель правит в редакторе. Переиспользовать
      knowledge-модуль (RAG) как источник фактов. ⚠️ платный API — бюджет/ключ
      согласовать.
- [ ] **Фаза 4 — экспорт/доп.фичи.** PDF/standalone-HTML экспорт деки, тема
      под бренд GrassLMS (sun-tinted, ink-900-on-yellow правило), вставка
      интерактивных виджетов/упражнений прямо в слайд (iframe-sandbox как у
      content-renderer).

Заметка: reveal.js — MIT, можно vendored. Большая многоспринтовая задача —
разбить на отдельные PR по фазам; Фаза 1 (модель+плеер) разблокирует остальное.

---

## Песочница: хардening сделан (2026-08-17)

Спека `specs/002-sandbox-hardening/`, восемь фаз, PR #302–#306 плюс полировка.
Всё в проде, проверено на коробке, а не по логам CI.

**Итог по семи пунктам аудита.** Шесть потребовали больше, чем в нём написано,
а один пункт в аудите отсутствовал вовсе:

| Пункт аудита | Что оказалось |
|---|---|
| 1. `ulimit -v` — «недоделанное усиление» | Сломанная фича, и втрое крупнее: при дефолтных 256 МБ не стартовали **JVM, V8 и рантайм Go**. Работал только Python. Заменено на `RLIMIT_DATA` — ограничивает выделенное, а не зарезервированное |
| 2. Нет предела параллельности | Сделано, но число берётся из `cpu.max`, не из `nproc`: в QA `nproc` показывает 4 при квоте 1.0 |
| 3. Нет `pids_limit` | Одного предела **недостаточно**: без `init: true` сироты остаются зомби и держат слоты cgroup — контейнер переставал умирать и начинал отказывать вечно. Ключ пришлось положить в `deploy.resources.limits.pids`, иначе compose не разбирает проект |
| 4. seccomp-профиль не подключён | Профиль как написан **убивал сервис**: seccomp применяется ко всем процессам, а раннер это веб-сервер. Уехал запрет одного вызова — `connect`. Запрет `sendto` ломал ответы, потому что `send()` в glibc это `sendto` |
| 5. `proc.kill()` не убивает внуков | Сделано группой процессов, и шире: убирать надо на **каждом** пути, а не только по таймауту — завершившаяся программа детей с собой не забирает |
| 6. Нет `USER runner` | Одна строка — но только потому, что фаза 3 перенесла записываемые каталоги. `/sandbox-exec` был root:root `mode=755` и сломал бы C++ и Go |
| 7. `create_subprocess_shell` вместо exec | Сделано, и стало бесплатным: шелл существовал только ради `ulimit`-префикса из пункта 1 |
| **8. `/tmp` смонтирован `noexec`** | **В аудите отсутствовало.** Go и C++ не могли запустить свой бинарь вообще — причина, никак не связанная с памятью |

**Что песочница делает теперь:** пять языков работают; память ограничена по
факту выделения; класс из 25 встаёт в очередь из 4 слотов с потолком ожидания;
остановленная программа уносит потомков; форк-бомба стоит автору одной
отправки; код ученика не дотягивается до нашего API; исполнение от uid 1000;
вывод ограничен 64 КБ с пометкой об обрезке; каждый сработавший лимит назван
ученику словами и виден в логах сервиса.

**Осталось незакрытым, намеренно.** FR-011 сужено: запретить `listen` нельзя,
не отняв `bind` у uvicorn. Ученик может слушать сокет, но до него никто не
дозвонится — исходящее соединение запрещено всем процессам контейнера. Причина
и замер записаны в спеке, тест переписан на то, что действительно
обеспечивается, а не удалён.

## Архив

- [`tasks/archive/sellability-2026-04.md`](archive/sellability-2026-04.md) —
  P0/P1/P2 sellability sprint, выполнено 2026-04-09 / 2026-04-10. Включает
  security hardening, инфраструктуру (CI, Redis, S3-абстракция), UX
  (video progress, bulk-enroll, XLSX export, onboarding tour), GTM
  (pricing, demo, sales one-pager).

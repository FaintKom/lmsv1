# scripts/legacy/

Архив одноразовых скриптов, перенесённых из корня проекта. Сохранены как
референс — большинство уже не запускается и не тестируется. Перед использованием
любого из них прочти содержимое: пути, переменные окружения и зависимости
могли устареть.

## Категории

### `test_*.py`, `test_*.ps1`, `test_*.json`
Отладочные one-off скрипты эпохи разработки роутинга и nginx. **Не путать
с `backend/tests/`** — там настоящие pytest-тесты. Здесь — просто `httpx`-вызовы,
которые автор гонял руками, чтобы проверить регистрацию через прокси и т.п.

Удалять можно смело — заменены полноценным CI и тест-сьютом
(`backend/tests/test_*.py`, `frontend/e2e/*.spec.ts`).

### `fix_*.py`, `fix_*.ps1`
Одноразовые data-migration скрипты:
- `fix_bom.ps1` / `fix_encoding.py` — починка BOM/кодировок в исходниках
- `fix_configs.py`, `fix_desmos.py`, `fix_interactive.py`, `fix_theory_final.py`
  — правка конкретных JSON-курсов после ручного импорта
- `fix_docker_config.ps1` — однократная миграция docker-compose

Эти задачи уже выполнены; запускать повторно не нужно. Удалять можно после
review автором.

### `seed_*.py`, `build_*.py`, `create_demo_course.py`, `module1_heart_of_algebra.py`, `sat_math_widgets.py`, `generate_html_course.py`
Старые версии seed-скриптов для разных эпох контента. **Актуальные скрипты
лежат в `scripts/`**:
- `scripts/create_python_course.py`, `scripts/create_test_course.py`,
  `scripts/create_demo_courses.py` — текущие seed'ы.
- `scripts/generate_4cid_course.py`, `scripts/generate_html_course.py` — current generators.

Здесь же — именно legacy-копии: например `seed_sat_math_v3.py`, `seed_sat_math_v4.py`,
`seed_pro_courses.py`. Финальная версия SAT-курса уже в БД (на проде помечена
`is_template=true`), пересоздавать не нужно.

### `sat_math_pro_course*.json`
Промежуточные дампы курса (4cid, html, html_fixed варианты). На проде живёт
финальная версия из БД. JSON-ы оставлены как референс структуры контента.

## Bootstrap-скрипт остался в корне

`create_super_admin.py` — **не трогать**, упомянут в `CLAUDE.md` как способ
создания super-admin при первом запуске. Используется в env-bootstrap
через `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD`.

## Когда удалять

Любой файл из этой папки можно удалить, если ты не помнишь, зачем он. Если
понадобится восстановить — `git log --diff-filter=D --name-only -- scripts/legacy/`
найдёт его в истории.

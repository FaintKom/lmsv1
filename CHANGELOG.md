# Changelog

Формат — [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/),
версии — [SemVer](https://semver.org/lang/ru/). Полный список фич — в [ROADMAP.md](ROADMAP.md).

## [Unreleased]

## [3.0.0] — 2026-07-19

Инфраструктурно-security мажор: полный аудит закрыт (PR #149–#172).
Major из-за двух ломающих контракт изменений: auth переехал на httpOnly-cookie
(токены в localStorage больше не выдаются как способ сессии) и схема БД теперь
управляется исключительно Alembic (fallback-слой удалён).

### Security
- Auth на httpOnly-cookie: сервер ставит `access_token`/`refresh_token`
  (SameSite=Lax, Secure в проде), фронт не хранит токены в localStorage —
  XSS не может украсть сессию (#170, #171)
- SCORM: короткий (30 мин) launch-token со скоупом на пакет вместо полного
  JWT в `?token=` / истории браузера (#167)
- npm high-уязвимостей 8 → 0: sentry 9→10, next 16.2.10, axios, lodash-es
  override (#159)

### Infrastructure
- Деплой: образы собираются в CI и пушатся в GHCR
  (`ghcr.io/faintkom/lmsv1-*`); прод-бокс только `docker compose pull` —
  закрыт root-cause аварии 2026-07-17 (#168)
- Схема БД: lifespan гоняет `alembic upgrade head` (пустая БД —
  `create_all` + `stamp head`); слой из ~60 fallback-ALTERов удалён;
  autogenerate снова видит все 36 модулей моделей (#172)
- `--legacy-peer-deps` снят везде, lock перегенерирован (#165)
- Защита `main`, PR-шаблон, Dependabot, pre-commit (ruff) (#149)

### Performance
- i18n code-split: en статически, остальные 5 локалей — ленивые чанки
  (~180KB/локаль из initial bundle) (#161)
- Leaderboard: 4 фиксированных запроса вместо 1+3N (#162)

### Added
- 51 backend-тест для 8 ранее непокрытых модулей: webhooks, scorm_import,
  submissions, parent, meetings, certificates, export, sandbox (#163, #166)
- Cookie-auth тесты (#170)

### Fixed
- Cookie-баннер рендерил сырые i18n-ключи (был вне I18nProvider) (#161)
- Deprecated `datetime.utcnow()` в meetings (#166)
- Доки: CLAUDE.md ×3 приведены к реальности (knowledge dormant, список
  модулей, deploy-процесс) (#164)

## [2.9.0] — 2026-07-17

Срез состояния на момент переезда в новую рабочую папку и наведения порядка в репозитории.

### Added
- Waitlist: админ-страница + email-уведомление о заявке (#146)
- Exercises: механики §6–§7 (FIX_MAP), клавиатура/a11y, container queries
- Journal: недельный планировщик, rooms board, sites + room kind (Phase E1–E2)
- Скиллы Claude: grasslms-backend/frontend + vendored fastapi-templates, nextjs-app-router-patterns (#148)

### Fixed
- Deploy: ограничение heap при сборке frontend
- Exercises: CSS-классы компонентов §6–§7 (#145)

[Unreleased]: https://github.com/FaintKom/lmsv1/compare/v3.0.0...HEAD
[3.0.0]: https://github.com/FaintKom/lmsv1/compare/v2.9.0...v3.0.0
[2.9.0]: https://github.com/FaintKom/lmsv1/releases/tag/v2.9.0

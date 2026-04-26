# Database migrations — Alembic

Миграции живут в `backend/alembic/versions/`. Конфиг — `backend/alembic.ini`,
env — `backend/alembic/env.py`.

## Workflow

1. **Изменить модель** в `backend/app/<module>/models.py`.
2. **Импортировать модель** в `backend/app/main.py` lifespan и
   `backend/tests/conftest.py` (если ещё не) — без этого autogenerate
   её не увидит.
3. **Сгенерировать миграцию:**
   ```bash
   cd backend
   alembic revision --autogenerate -m "add foo column to bar"
   ```
4. **Прочитать сгенерированный файл** в `alembic/versions/`. Autogenerate
   часто пропускает:
   - Изменения server defaults
   - Переименования колонок (видит как drop + add — теряет данные!)
   - Изменения enum значений (PostgreSQL не умеет drop value)
   - Custom indexes (HNSW, GIN trgm)
   Если нашёл — допиши руками.
5. **Применить локально:**
   ```bash
   alembic upgrade head
   ```
6. **Тест rollback** (опционально, но желательно для нетривиальных):
   ```bash
   alembic downgrade -1
   alembic upgrade head
   ```
7. **Проверить тесты:**
   ```bash
   pytest tests/
   ```
8. **Деплой:** см. корневой `../CLAUDE.md`. На прод миграция накатывается
   вручную ДО рестарта backend-контейнера:
   ```bash
   ssh root@204.168.165.41 "cd /opt/lms && docker compose -f docker-compose.prod.yml exec backend alembic upgrade head"
   ```

## Naming

`<6-char-id>_<глагол>_<сущность>.py`. Примеры из проекта:
- `e1f2a3b4c5d6_unified_exercises.py`
- `a2b3c4d5e6f7_add_gdpr_consent_fields.py`
- `m1n2o3p4q5r6_add_knowledge_module.py`

6-char ID — Alembic генерирует, не трогать. Описание — kebab или
underscore, главное читаемо.

## Запреты

❌ **Не редактировать уже отгруженную на прод миграцию.** Stamped revision
в БД зафиксирована — изменение файла приведёт к расхождению. Если нужно
что-то поправить — делай новую миграцию-патч.

❌ **Не делать `op.execute(...)` без проверки rerun-safety.** Скрипт
`_run_setup` в `backend/app/main.py` дублирует часть ALTER'ов как fallback
и выполняется на каждом старте контейнера. Если `op.execute` упадёт на
второй прогон (например, `CREATE TABLE` без `IF NOT EXISTS`) — приложение
не стартанёт.

❌ **Не использовать `--autogenerate` без чтения результата.** Особенно
для:
- enum-типов (нужно `ALTER TYPE ... ADD VALUE IF NOT EXISTS`)
- pgvector колонок (autogenerate их не видит как vector — проверь)
- индексов с особым типом (HNSW)

## PostgreSQL gotchas

### Enum новые значения
Каждое `ADD VALUE` — отдельная транзакция. Используй
`AUTOCOMMIT` isolation:

```python
def upgrade():
    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'parent'")
```

При autogenerate этого нет — допиши руками.

### Удаление enum значений
**Нельзя.** PostgreSQL не поддерживает `DROP VALUE`. Стратегия:
создать новый enum, скопировать данные, дропнуть старый, переименовать.

### pgvector
```python
import pgvector.sqlalchemy

embedding: Mapped[list[float]] = mapped_column(
    pgvector.sqlalchemy.Vector(1024), nullable=True
)
```

Индекс HNSW — руками в миграции:
```python
op.execute("CREATE INDEX idx_knowledge_embedding ON knowledge_entries "
           "USING hnsw (embedding vector_cosine_ops)")
```

## Восстановление из бэкапа

Бэкапы — `/opt/lms/backups/lms-YYYY-MM-DD.sql.gz` на проде, 7-дневная
ретеншн. Скрипт — `scripts/backup.sh`, запускается cron'ом
04:00 UTC.

Восстановление:
```bash
# на проде
ssh root@204.168.165.41
gunzip -c /opt/lms/backups/lms-2026-04-25.sql.gz | \
    docker exec -i lms-db-1 psql -U lms -d lms
```

⚠️ Полное восстановление **снесёт** текущую БД. Для частичного — выгрузи
дамп локально и работай с ним.

## Текущее состояние

Список миграций:
```bash
cd backend && alembic history --verbose
```

Текущая stamped:
```bash
cd backend && alembic current
```

На проде (через docker):
```bash
ssh root@204.168.165.41 "docker exec lms-backend-1 alembic current"
```

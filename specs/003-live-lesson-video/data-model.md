# Data Model: Video and audio inside the live lesson

**Feature**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md) · **Research**: [research.md](research.md)

Durable state goes to PostgreSQL through one additive Alembic migration. Live
state goes to Redis beside the keys `live_lessons` already owns, and dies with
the lesson. Nothing here duplicates the roster: membership is the lesson's
group, as it is today.

---

## PostgreSQL

### New table: `live_breakout_groups`

A subdivision of a lesson's room. Rows live only as long as the lesson and are
deleted when it ends, so this table stays small.

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | UUID | no | `IDMixin` |
| `live_lesson_id` | UUID | no | FK `live_lessons.id`, `ON DELETE CASCADE` |
| `org_id` | UUID | no | FK `organizations.id`. Denormalised so a scoping query never joins through the lesson |
| `index` | INT | no | 1-based, the order the teacher created them in; shown as the group's name |
| `member_ids` | JSONB | no | Array of user ids. A join table would need two queries to render one panel and buys nothing here, because a group is read and written whole |
| `created_at` | TIMESTAMPTZ | no | `TimestampMixin`, `server_default=now()`, UTC |
| `updated_at` | TIMESTAMPTZ | no | `TimestampMixin` |

Indexes: `(live_lesson_id)`; unique `(live_lesson_id, index)`.

Room naming is derived, never stored: the main room is `lesson-{live_lesson_id}`
and a group room is `lesson-{live_lesson_id}-b{index}`. Deriving the name means
a client cannot ask for a room by name, and another school's room name is
useless without a grant nobody will sign for it.

### Changed table: `recordings`

The table exists and already models a client-side capture. It gains a link to
the lesson and a source, and loses nothing.

| Column | Type | Null | Notes |
|---|---|---|---|
| `live_lesson_id` | UUID | yes | New. FK `live_lessons.id`, `ON DELETE SET NULL`. Null for recordings made outside a lesson, which is what every existing row is |
| `source` | ENUM `recording_source` | no | New. `client` today, `server` reserved for the upgrade path. Default `client`, so the backfill is free |
| `shared_with_group` | BOOL | no | New, default `false`. False means staff of the school only; the teacher sets it true to give the lesson's group access (FR-021) |
| `expires_at` | TIMESTAMPTZ | yes | New. Written at completion from the organisation's retention setting; the cleanup job deletes rows and blobs past it (FR-023) |

Existing columns are unchanged: `user_id`, `org_id`, `type`, `storage_url`,
`duration_seconds`, `size_bytes`, `status` (`uploading` / `ready` / `failed`).

Indexes: `(live_lesson_id)`, and `(org_id, expires_at)` so the cleanup job scans
one organisation's expiring rows without a sequential scan.

**A correction that belongs here.** `POST /recordings/{id}/complete` currently
writes `storage_url` from the request body. After this feature the server writes
it from wherever it actually stored the bytes, and the field leaves the request
schema. See Finding J.

### Changed table: `organizations`

| Column | Type | Null | Notes |
|---|---|---|---|
| `recording_enabled` | BOOL | no | New, default `false`. FR-019: recording stays off until an administrator of that school turns it on |
| `recording_retention_days` | INT | no | New, default 30. Feeds `recordings.expires_at` |

Default `false` means the migration turns nothing on for anybody, which is the
only safe default when the subject is recording children.

### State transitions

A recording moves `uploading → ready` when the upload completes and the row is
finalised, and `uploading → failed` when the teacher's browser stops sending or
a completion never arrives. A background sweep marks anything still `uploading`
past a grace window as `failed`, so a dead tab produces a visible failure
instead of a row that waits forever (FR-022).

A breakout group has no status. It exists or it does not, and ending the lesson
deletes every one of them (FR-018).

---

## Redis

Keys follow the naming already established in `live_lessons/realtime.py`, where
every key name has one definition in one module.

| Key | Type | TTL | Holds |
|---|---|---|---|
| `lesson:{id}:media:capacity` | string | 2 s | Cached participant count read from the media server, so a class arriving together makes one query and not fifteen (Finding F) |
| `lesson:{id}:media:removed` | set | lesson lifetime | User ids a teacher has removed. Checked before signing a grant, which is what makes removal stick (FR-003) |
| `lesson:{id}:media:floor` | string | lesson lifetime | The user id currently holding the floor, or absent |
| `lesson:{id}:media:breakouts` | string | lesson lifetime | JSON mirror of the group rows, so the panel and the SSE payload are built without touching PostgreSQL on every change |
| `lesson:{id}:media:share_grants` | set | lesson lifetime | User ids permitted to share a screen (FR-014) |
| `lesson:{id}:media:recording` | string | lesson lifetime | The recording id in progress, so a participant joining mid-recording still sees the indicator (FR-020) |

Every one of these is derivable again: the removed set and the breakouts from
PostgreSQL, the floor and the share grants from a teacher repeating the action.
Redis losing them costs a lesson its niceties, not its integrity.

---

## Settings

Added to `backend/app/config.py`, the single source of environment
configuration.

| Setting | Default | Notes |
|---|---|---|
| `livekit_url` | `ws://127.0.0.1:7880` | The container runs with host networking, so there is no Compose alias (Finding C) |
| `livekit_public_url` | `""` | What the browser connects to, proxied by nginx on 443. Empty in development means same origin |
| `livekit_api_key` | `""` | Signs grants |
| `livekit_api_secret` | `""` | Signs grants. `validate_production()` refuses to start production with either of these empty once the feature is live |
| `max_concurrent_media_participants` | `0` | Zero means media is off. Slice 0 writes the measured number here, and until it does the feature refuses politely instead of guessing (FR-024) |
| `media_grant_ttl_seconds` | `120` | A grant is a ticket to join, not a session. Short, because a long-lived token that outlives a removal defeats FR-003 |

---

## Entity relationships

```text
organizations
  ├─ recording_enabled, recording_retention_days   (new)
  │
  └─< live_lessons                                 (existing)
        ├─< live_breakout_groups                   (new)
        │     └─ member_ids ── users               (by id, no FK; a group is read whole)
        │
        └─< recordings                             (existing, gains live_lesson_id)

student_groups ──> live_lessons.group_id           (existing; this is the membership,
                                                    and no second roster is introduced)
```

## Migration notes

One additive revision, following `backend/CLAUDE.md`: schema changes reach
production only by Alembic, and the new module must be imported in `main.py`,
`tests/conftest.py` and `alembic/env.py` or autogenerate will not see it.

The `recording_source` enum is created explicitly before the column that uses
it, because PostgreSQL enums do not autogenerate cleanly; the recipe is in
`docs/MIGRATIONS.md`. Every added column carries a server-side default so the
migration does not rewrite existing rows, and no existing column changes type.

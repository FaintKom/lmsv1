# Release notes — 2026-05-03

Three bundled deliverables: full GrassLMS design-system migration,
typed exercise API + MCP server, full staging environment.

---

## 1. GrassLMS Design System ("Lively") — applied across the app

### Source-of-truth files (new)

- `docs/design/design-system.html` — v0.1 spec.
- `docs/design/mockups/` — eight reference page mockups.
- `docs/design/README.md` — primer.
- `docs/design/AUDIT.md` — gap report.

### Token migration (frontend)

- `frontend/src/app/globals.css` — full DS palette in `:root`:
  green/sun/coral/ink/paper. New utilities: `.gl-highlight`, `.gl-btn-pop`,
  `.gl-btn-pop.coral`, `.gl-hero-card`, `.gl-btn-sun`, `.gl-btn-ghost`.
  Tailwind 4 `@theme inline` bridge re-points default `bg-green-X` etc.
- `frontend/src/app/layout.tsx` — Inter → Manrope, +Geist Mono.
  themeColor `#22c55e` → `#3fb04b`.
- `frontend/src/components/ui/button.tsx` — `pop` / `pop-coral` variants.

### Bulk class migration

- `scripts/migrate_ds_palette.mjs` — idempotent. Walks frontend/src,
  rewrites Tailwind classes (slate→ink, emerald→green, amber→sun,
  red→coral, indigo→green) + hex literals (SVG/inline). 158 files,
  ~5,300 class swaps + 373 hex literals. blue/cyan/sky preserved
  (info channel).

### Page-level updates

- Landing, pricing, courses list, dashboard, admin pages — h1
  highlights, pop CTAs, `.gl-hero-card` on dashboard greeting,
  branding default color `#3fb04b`.

### Verified live on staging

25+ pages plus a 14-lesson demo course (one per ExerciseType). Lesson
player callouts and exercise renderer in correct DS palette
(computed-CSS confirmed).

---

## 2. Backend — Pydantic config-schemas enforced

### Why

`Exercise.config` is JSONB. Without a contract, clients ship invalid
configs, and the frontend silently fails to render.

### What

- `backend/app/exercises/schemas.py`:
  - 15 existing config classes wired into `CONFIG_SCHEMAS:
    dict[ExerciseType, type[BaseModel]]`.
  - `validate_exercise_config(exercise_type, config) -> dict`.
- `backend/app/exercises/service.py`:
  - `create_exercise` / `update_exercise` validate `config` and raise
    `BadRequestError` on bad input.
- `backend/app/exercises/router.py`:
  - `GET /api/v1/exercises/config-schemas` — JSON Schemas per type.

---

## 3. MCP server (`mcp-grasslms/`)

### Layout

```
mcp-grasslms/
├── pyproject.toml
├── README.md
└── src/mcp_grasslms/
    ├── __init__.py
    ├── client.py     # HTTPX wrapper around the LMS REST API
    └── server.py     # FastMCP server, one typed tool per type
```

### Tools

- Discovery: `whoami`, `get_exercise_config_schemas`.
- Scaffolding: `list_courses`, `get_course`, `create_course`,
  `add_module`, `add_lesson`.
- 15 typed creators (one per ExerciseType): `create_true_false`,
  `create_matching`, …, `create_web_editor`.
- Inspection: `list_exercises_for_lesson`.

### Security model

`LMS_BASE_URL` + `LMS_TOKEN` (JWT) from env. Server forwards the JWT
to LMS API; backend role checks (`require_role`,
`_check_permission`) enforce per-call permissions. Pattern: one
Claude Desktop config per user (teacher / admin / super_admin).

---

## 4. Staging environment

### Public URL

**https://staging.grasslms.online** — live, Let's Encrypt SSL, 5
containers on the same Hetzner VPS as prod.

### Files

- `docker-compose.staging.yml` — separate compose project
  `lms-staging`, distinct volumes, db `lms_staging`.
- `nginx/staging.conf` — server block on `staging.grasslms.online`.
  HTTP→HTTPS, `X-Environment: staging`, `noindex`.
- `docs/STAGING.md` — runbook (first-time setup, deploy workflow,
  DB refresh, teardown, cost note).
- `.claude/launch.json` — local dev port 3000 → 3001.

### Test accounts (staging)

| Role | Email | Password |
|---|---|---|
| Student | student@grasslms.online | Student2026! |
| Teacher | teacher@grasslms.online | Teacher2026! |
| Methodist | methodist@grasslms.online | Methodist2026! |
| Demo | alex@grasslms.online | Alex2026! |
| Super admin | faintkom@gmail.com | Admin2026! |

### Demo content

Course "DS Showcase Course" with 14 lessons covering each exercise
type for visual verification.

---

## 5. tasks/todo.md updates

Added under "Идеи на потом":

- **DS-finish.** Designer pass — 9 of 15 exercise types need polish.
- **FrameBox lesson type.** Find sources (not on F:\), port as new
  `ContentType`/`ExerciseType`. Six-step plan.
- **MCP security model.** Doc current pattern (1 user = 1 JWT).
  Multi-user bot pattern flagged.

---

## 6. File index

```
docker-compose.staging.yml                     new
docs/STAGING.md                                new
docs/CHANGELOG-2026-05-03.md                   new (this file)
docs/design/{README.md,AUDIT.md,*}             new
mcp-grasslms/                                  new package
nginx/staging.conf                             new
scripts/migrate_ds_palette.mjs                 new
backend/app/exercises/{schemas,service,router}.py  modified
frontend/src/app/{globals.css,layout.tsx,…}    modified (158 files)
.claude/launch.json                            port 3001
tasks/todo.md                                  +3 items
```

---

## 7. Promotion workflow

```bash
# 1. Push to GitHub
git push origin claude/focused-tereshkova-b85ccf

# 2. Server-side — copy modified files into /opt/lms (NOT /opt/lms-staging)
tar czf - -C frontend src | ssh root@204.168.165.41 \
  'tar xzf - -C /opt/lms/frontend/'
cat backend/app/exercises/schemas.py | ssh root@204.168.165.41 \
  'cat > /opt/lms/backend/app/exercises/schemas.py'
cat backend/app/exercises/service.py | ssh root@204.168.165.41 \
  'cat > /opt/lms/backend/app/exercises/service.py'
cat backend/app/exercises/router.py | ssh root@204.168.165.41 \
  'cat > /opt/lms/backend/app/exercises/router.py'

# 3. Rebuild + restart prod
ssh root@204.168.165.41 \
  'cd /opt/lms && docker compose -f docker-compose.prod.yml build backend frontend'
ssh root@204.168.165.41 \
  'cd /opt/lms && docker compose -f docker-compose.prod.yml up -d backend frontend'

# 4. Verify
curl -I https://grasslms.online/
curl https://grasslms.online/api/v1/exercises/config-schemas \
  -H "Authorization: Bearer <admin-jwt>"
```

Expected downtime: ~30 s during container restart.

---

## 8. Designer hand-off — quick list

Detail in `docs/design/AUDIT.md` "Pending design work". Headlines:

1. Quiz container empty state.
2. Translation hero / lang badges.
3. Sentence Builder bar polish.
4. Dialogue speaker bubbles.
5. Reading multi-choice question card.
6. Conjugation table grid.
7. Code Challenge starter empty state.
8. File upload preview thumbnails.
9. Course catalog hero (search + chips).
10. Course detail hero (cover, prereqs).
11. Lesson sidebar polish (animations, progress).
12. Newcomer checklist celebration.
13. Streak widget (sticky-note style).
14. Continue Learning thumbnails.
15. Calendar Custom event color.
16. Settings branding live preview.
17. Pricing tier featured ribbon.
18. SAT Practice domain dot palette.
19. Empty states unification.
20. Hero font mobile breakpoints.
21. gl-highlight rotate constraint.
22. gl-btn-pop active transition.
23. Dark mode contrast audit.

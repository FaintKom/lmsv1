# Universal Education Platform — proposed architecture

Generalises current `lms` + `external lesson generator` + `external curriculum service` for any K12-through-university subject that has standards-based skill sets (Cambridge K12, CCSS, IB, CEFR, NGSS, national curricula, Bloom-aligned higher-ed outcomes).

## Four bounded contexts (services)

```
┌──────────────────────┐    ┌──────────────────────┐    ┌──────────────────────┐    ┌──────────────────────┐
│  SAS                 │    │  KGS                 │    │  LGS                 │    │  LMS                 │
│  Skill Authoring     │───▶│  Knowledge Graph     │───▶│  Lesson Generator    │◀──▶│  Learning Platform   │
│  (sortation block)   │    │  (graph + state)     │    │  (LLM + render)      │    │  (UI + auth + ops)   │
└──────────────────────┘    └──────────────────────┘    └──────────────────────┘    └──────────────────────┘
        ▲                            ▲                            ▲                            ▲
        │ methodist                  │ runtime queries            │ render requests            │ users / teachers
        │                            │ from LMS                   │ from LMS                   │ / students
        └──────── source PDFs/docs   └──────── BKT updates        └──────── cache decks        └──────── classes / assignments
```

### Why 4, not 3

Authoring (slow, batch, LLM-extract, methodist review) and runtime graph (fast, BKT updates, lesson queries) have **different SLOs and rhythm**. Combining them complicates both. `external curriculum service` already de facto splits models into `AUTHORING / STRUCTURE / RUNTIME` — the boundary is already there.

**Budget compromise:** merge SAS+KGS into one service with two Postgres schemas (`authoring`, `published`) and split later. The model boundary already exists.

---

## 1. SAS — Skill Authoring Service ("sortation block")

**Owns:** turning raw curriculum sources into normalised `SkillCandidate`s ready for graph publication.

### 7-step pipeline (each step is an Arq job, all idempotent)

```
[1] Ingest         → upload PDF/DOCX/CSV/XML/HTML source → S3 + parse extract text
[2] Extract        → LLM splits text into skill candidates (id, text, grade, topic guess)
[3] Normalise      → canonical schema (4 text fields, Bloom/SOLO/CRA tags by LLM)
[4] Deduplicate    → embedding similarity within (subject, grade) — flag near-duplicates
[5] Map            → cross-standard mapping (Cambridge ↔ CCSS ↔ FGOS ↔ Merdeka) via embeddings + LLM
[6] Review         → methodist queue: approve / edit / merge / split / reject
[7] Promote        → POST batch to KGS /skills/import → DAG validation → version stamped
```

LLM responses cached by `hash(prompt + source_excerpt)` — re-runs are free.

### SAS entities

| Entity | Description |
|---|---|
| `Source` | uploaded file + metadata (subject, standard, language, version, country) |
| `SourceExcerpt` | text chunk with location (page, paragraph) |
| `SkillCandidate` | draft skill with status: `extracted / normalized / deduped / mapped / reviewed / published / rejected` |
| `CrossMapping` | edges between candidates from different standards |
| `MethodistEdit` | audit log |

### Admin UI (separate frontend, not lms)

- "To review" queue with filters (subject, grade, source)
- Diff view for near-duplicates
- Drag-and-drop prereq edges with LLM auto-suggest
- Bulk publish → KGS

### Stack

FastAPI + Postgres + pgvector + Arq + MinIO/S3. SQLAdmin or React admin.

---

## 2. KGS — Knowledge Graph Service (the brain)

**Owns:** published graph + student state + mastery models + LessonFixture composer.

### Extensions on top of external curriculum service (multi-subject)

#### Subject as first-class entity

```python
class Subject(BaseModel):
    code: str                       # "math_k6", "physics_g7_g11", "english_b1_c2"
    name_i18n: dict[Lang, str]
    domain: Domain                  # MATH / PHYSICS / CHEM / CS / LANG / HISTORY / ...
    grade_range: tuple[int, int] | None
    mastery_model: MasteryModelId   # "bkt" | "spaced_repetition" | "rubric" | "dkt"
    task_format_set: list[TaskFormat]
    layout_set_id: str              # which LGS layout pack to use
    cra_applicable: bool            # math yes, history no
    language: Lang
```

`Skill` gains `subject_code` + `cross_subject_prereqs` (physics → math).

#### Pluggable mastery model

```python
class MasteryModel(Protocol):
    def update(state, attempt) -> state
    def predict(state) -> float
    def label(state) -> MasteryLabel
    def calibrate(attempts_batch) -> params
```

Registry:

| Model | Fits | Parameters |
|---|---|---|
| `BKT` | math, physics, programming | p_init, p_transit, p_slip, p_guess |
| `SpacedRepetition` (SM-2 / FSRS) | languages, vocab, facts | ease, interval, stability |
| `Rubric` | history essay, lab demo, language speaking | criteria weights, score 0-4 |
| `DKT` (v2 optional) | any subject with large dataset | neural weights |
| `IRT` 2PL/3PL | standardised tests | difficulty, discrimination |

Skill stores `mastery_model_id`. KGS routes updates through the registry.

#### Subject-specific extensions

- **Languages:** replace CRA with CEFR (A1-C2), add 4-skill axes (R/W/L/S)
- **History/Humanities:** replace CRA with evidence levels (recall / interpret / evaluate / synthesise)
- **Programming:** add `code_test_pass_rate` to Attempt, support autograding
- **Sciences:** add `lab_skill` flag + rubric

Done via **subject-specific enums** + **strategy pattern**, not if/else in core.

### KGS API

| Endpoint | Purpose |
|---|---|
| `GET /subjects` | list |
| `POST /subjects` | new subject onboarding (from YAML manifest) |
| `GET /skills?subject=&grade=` | graph slice |
| `POST /skills/import-batch` | receive from SAS (atomic, DAG-validated) |
| `POST /students/{id}/next-skill?subject=` | walk graph |
| `POST /students/{id}/lesson-fixture` | compose contract → return to LMS/LGS |
| `POST /students/{id}/attempts` | record + update (Q-matrix aware) |
| `POST /students/{id}/diagnostic/start` | start diagnostic |
| `GET /students/{id}/mastery-map` | dashboard data |
| `POST /admin/recalibrate?subject=` | trigger EM |

### Stack

FastAPI async + Postgres + pgvector + Arq for calibration/snapshots + Redis cache.

---

## 3. LGS — Lesson Generator Service

**Owns:** LessonFixture → ready deck. Stateless w.r.t. student (only generation cache).

### Pipeline

```
[1] Receive fixture          → from LMS or KGS direct
[2] Pick subject prompt pack → "math_g1.ru.md", "physics_g9.en.md", "english_b1.es.md"
[3] Compose final prompt     → fixture JSON injected into template
[4] Call cloud LLM           → OpenRouter (swap by env)
[5] Validate                 → Pydantic schemas + subject-specific rules + canvas-fit
[6] Retry on invalid         → re-prompt with error feedback (max 3)
[7] Cache + persist deck     → object storage + DB row
[8] Emit event               → "deck.ready" → LMS notified via SSE / webhook
```

### Pluggable parts per subject

| Plugin | What varies |
|---|---|
| `prompt_pack/` | system prompt + few-shot per (subject, language) |
| `layouts/` | math: 24 layouts with number-line / bar-model; languages: dialogue / passage layouts; CS: code editor + tests |
| `widgets/` | math: ten_frame, fraction_bar; language: audio_player, dialogue_chat; CS: monaco, repl |
| `validators/` | math: numeric answer types, equation parsing; language: morphology check; CS: solution runs |

Plugin = **folder with `manifest.yaml` + `.md` prompts + `.py` validator + `.ts` widgets**. Subject onboarding = add a plugin.

### Streaming

Long generation (15-30 s): SSE stream → LMS shows progress slide-by-slide / task-by-task.

### Cost tracking

Every job logs `tokens_in/out`, `cost_usd`, `model_id`. Returned to LMS billing.

---

## 4. LMS — interface layer

**Owns:** users, orgs/schools, classes, assignments, gradebook, lesson player, dashboards, billing, notifications.

The existing `lms` becomes a **thin client** to KGS/LGS:
- Own data: User, Org, Class, Enrollment, Assignment, Grade, Submission, Notification
- Proxy to KGS: cache mastery-map, proxy attempts
- Proxy to LGS: trigger generate jobs, embed viewer

### Lesson player

Already exists in external lesson generator's `viewer.html` — moves into lms as iframe or React component. Receives deck JSON from LGS.

### Analytics

- LMS reads mastery-map from KGS → teacher dashboard
- LMS reads attempts → solvability aggregates per class / assignment

---

## Contracts between services

### LessonFixture (KGS → LGS) — extended

Take `external curriculum service.LessonFixture` **as-is**, add:
- `subject_code`
- `language` (replaces single `Lang`)
- `layout_set_id` + `widget_set_id`
- `cultural_context` (Indonesia / Russia / UK / …)
- `accessibility_flags` (dyslexia_font, screen_reader, low_contrast)

### Attempt (LMS → KGS) — extended

- `subject_code`
- `auto_graded: bool` (true for math, false for essay)
- `rubric_scores: dict[criterion, score]` (for rubric model)
- `cefr_dimension` (R/W/L/S, for languages)

### Event bus (Redis Streams)

- `skill.published` (SAS → KGS, LMS)
- `student.mastery.updated` (KGS → LMS notifications)
- `lesson.requested` (LMS → LGS)
- `lesson.ready` (LGS → LMS)
- `lesson.completed` (LMS → KGS — triggers recompute)

---

## Data ownership (no cross-DB queries)

| Service | Owns | DB schema |
|---|---|---|
| LMS | users, orgs, classes, enrollments, assignments, grades, billing | `lms.*` |
| SAS | sources, candidates, mappings, edits | `sas.*` |
| KGS | subjects, skills, prereqs, students, states, attempts, lessons | `kgs.*` |
| LGS | decks, prompts, generation_jobs, llm_cache | `lgs.*` |

Each service = separate Postgres DB (or separate schemas in one DB to start, split later). pgvector only in SAS and KGS.

`student_id` is a **shared ID**: minted in LMS, passed to all services. UUID v7.

---

## Multi-subject roll-out flow

**Adding a new subject (e.g. "Physics G7-G11", "English language"):**

```
1. Methodist creates  subjects/physics_g7_g11.yaml
   ├─ mastery_model: bkt
   ├─ task_formats: [mc_single, fill_numeric, equation_steps, lab_rubric, ...]
   ├─ layout_set_id: physics_v1
   └─ language: en
                                ↓
2. POST /subjects to KGS         → subject registered
                                ↓
3. Upload Cambridge IGCSE Physics PDF to SAS
                                ↓
4. SAS pipeline runs (LLM extract ~120 candidates over ~30 min)
                                ↓
5. Methodist reviews queue (~5-10 hours)
                                ↓
6. Methodist draws prereq DAG (LLM suggests, human approves)
                                ↓
7. SAS publishes batch to KGS    → DAG validated → skills live
                                ↓
8. LGS plugin: copy math template → adapt prompts for physics
                                ↓
9. LMS: subject auto-appears in UI catalogue
                                ↓
10. Smoke test: methodist student → diagnostic → first lesson generated → reviewed
                                ↓
11. Activate for orgs            → teachers see physics in class setup
```

**Target onboarding cost per subject: 2-4 weeks methodist + 1 week engineer for plugin.**

---

## Tech stack

| Layer | Choice | Reason |
|---|---|---|
| Backend lang | Python 3.12 + FastAPI everywhere | shared Pydantic models package, single dev workflow |
| ORM | SQLAlchemy 2 async | already standard in lms |
| DB | Postgres 16 + pgvector | single engine |
| Queue | Arq on Redis | async-native, lighter than Celery |
| Object storage | MinIO local / S3 prod | source PDFs + decks |
| LLM gateway | OpenRouter | model is an env var |
| Embeddings | Voyage AI (already in lms) or `text-embedding-3-small` |  |
| Event bus | Redis Streams | enough up to 100 k events/day |
| Auth | LMS = JWT issuer; SAS/KGS/LGS validate | single identity provider |
| Shared types | `packages/curriculum-models` (Python) + autogen TS | one source of truth |
| Frontend | Next.js (LMS), Vite+React (SAS admin) |  |
| Observability | OpenTelemetry → Grafana + Sentry |  |
| Deploy | Docker compose now → k8s/Coolify when traffic grows |  |

---

## Monorepo layout

```
universal-edu-platform/
├── packages/
│   └── curriculum-models/        ← Pydantic (Python) + autogen TS, shared schemas
├── services/
│   ├── lms/                      ← existing F:\lms (thin client)
│   ├── sas/                      ← new, sortation block
│   ├── kgs/                      ← from external curriculum service, generalised
│   └── lgs/                      ← from external lesson generator, generalised
├── plugins/
│   ├── math_k12_v1/              ← prompts + layouts + widgets + validators
│   ├── physics_g7_g11_v1/
│   ├── english_b1_c2_v1/
│   └── history_g5_g9_v1/
├── docker-compose.yml
├── docker-compose.prod.yml
└── README.md
```

---

## Evolutionary roadmap (8 stages)

| # | Stage | Duration | Result |
|---|---|---|---|
| 0 | Generalise external curriculum service → KGS skeleton (Subject + MasteryModel registry) | 1-2 wks | KGS as a service with math plugin |
| 1 | Split lms ↔ KGS (REST API contract, JWT shared) | 1-2 wks | lms reads next-skill from KGS |
| 2 | Generalise external lesson generator → LGS (plugin layout) | 1-2 wks | LGS accepts fixture, renders deck |
| 3 | Migration: AI lesson generation on one subject (math K-3) end-to-end | 2-3 wks | working pipeline in production |
| 4 | Build SAS (sortation block) — ingest + extract + dedupe | 3-4 wks | methodist imports Cambridge G4 |
| 5 | Cross-mapping (Cambridge ↔ CCSS ↔ Merdeka) | 2 wks | mapping ready in SAS |
| 6 | Languages plugin (CEFR + spaced repetition mastery model) | 3-4 wks | English B1 onboarding |
| 7 | Sciences plugin (rubric model + lab tasks) | 4-5 wks | Physics G7 onboarding |

**Total: ~4-5 months to universal platform with 3 subjects in production.**

---

## Anti-patterns to avoid (seen in EdTech failures)

1. **Don't hard-code mastery model into core.** Build strategy registry from day one, otherwise in a year you grow a 500-line if-chain.
2. **Don't allow cross-service DB queries.** Only API. Otherwise services stop being services.
3. **Don't combine authoring and runtime in one DB.** Authoring change-rate ≠ runtime, different indexes, different backup strategy.
4. **Don't build UI on top of raw graph.** Student sees only labels (`introduced / proficient / mastered`), not probabilities. Teacher sees `p_mastery` optionally.
5. **Don't put subject-specific code in KGS core.** All subject-dependent things via plugins with manifest.
6. **Don't use local LLM for generation.** Cloud (OpenRouter) → swap-by-env. Local only for inline classification (if/when GPU server appears).
7. **Don't build one monolithic LLM prompt.** Chunk it: theory chunk → exercises chunk → summary chunk, parallel `asyncio.gather`. Better validation, cheaper retries.
8. **Don't lose skill versions in generated lessons.** Snapshot versions at generation, otherwise old lessons break when skills are edited.

---

## Summary in one paragraph

**3-4 services with clearly separated zones:** SAS turns raw curricula into published skills through a 7-step review pipeline; KGS holds graph + BKT + LessonFixture composer with pluggable mastery models; LGS accepts fixture and renders deck via cloud LLM with plugin-based prompts/layouts/widgets; LMS stays UI + ops layer. Subject-specific logic — **through plugins, not if/else in core**. All three backends — FastAPI + Postgres + Arq on Redis, shared Pydantic models via monorepo package. Cloud LLM (OpenRouter) for generation; local doesn't fit current hardware. New-subject onboarding = YAML manifest + LLM-extracted skills in SAS + methodist review + LGS plugin = **2-4 weeks per subject**.

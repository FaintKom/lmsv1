# external curriculum service — skill graph + BKT + LessonFixture

Location: `[external curriculum repo]`. Standalone service. **Status:** v1.0 — 45 modules, 212 topics, **200 skills across G1-G3**, generated reproducibly by `scripts/build_curriculum_from_docx.py`. G4 placeholder. Production-grade ITS (Intelligent Tutoring System) architecture.

## What it owns

- **Skill graph** — Cambridge-style atomic learning objectives (`1Na.10.S1`), hard/soft prerequisites, Bloom/SOLO/CRA classification, BKT calibration.
- **Student state machine** — per-skill mastery (`StudentSkillState`) updated via BKT after each `Attempt`, with derived labels (`introduced → developing → proficient → mastered`).
- **Lesson assembly** — composes a `LessonFixture` for the generator: target skills, prereq snapshots, student snapshot, task distribution, position in module.
- **Authoring layer** — YAML/JSON canonical data + lifecycle ops (`rename`, `merge`, `split`, `deprecate`).

It does **not** generate decks (that's external lesson generator dashboard) and does **not** measure runtime solvability (lesson player). It is the **curriculum source of truth**.

---

## Architecture — 3 layers

| Layer | Purpose | Key files |
|---|---|---|
| **Authoring** | methodist writes — Skill / Topic / Module / TaskSeed | `models.py`, YAML in `sample_data/` |
| **Structure** | graph operations | `graph.py` |
| **Runtime** | per-student data — Student / SkillState / Attempt / Lesson | `models.py`, `services/attempts.py` |

This split is the single most important architectural decision — different update rhythms, different indexes, different backup strategy.

---

## Knowledge graph

- **ID scheme (Cambridge):** `{grade}{strand}.{module}.S{skill}` → `1Na.10.S1` (content), `P.PS.G1` (process)
- **2 prereq types:** `HARD` (blocks) + `SOFT` (recommended)
- **Inverse index** `_hard_dependents` precomputed for O(1) "who depends on X"
- **Q-Matrix** many-to-many: task → primary skill (weight 1.0) + secondary skills (weight 0.3) → BKT updates weighted

### Skill — full model

Four text fields for different audiences:
- `methodology_text` — methodist
- `llm_instruction_text` — generator (iterated without DB migration)
- `student_facing_label` — student progress bar
- `teacher_short_description` — teacher dashboard

Three classifications simultaneously:
- **Bloom** (6 levels): remember → create
- **SOLO** (5): pre_structural → extended_abstract
- **CRA** (3): concrete → representational → abstract

Plus calibration: `mastery_threshold`, `BKTParameters{p_init, p_transit, p_slip, p_guess}`, `estimated_minutes_to_master`.

External alignment: `external_ids: dict[str, list[str]]` — e.g. `{"cambridge": ["1Nm.04"], "ccss": ["1.OA.C.6", "1.OA.B.3"]}`.

Lifecycle fields: `deprecated_at`, `replaced_by` (merge), `derived_from` (split), `last_edited_at`, `last_edited_by`.

---

## BKT (`bkt.py`)

Standard 4-parameter Corbett & Anderson 1995:

```
P(L_0)   = p_init       prior knowledge before any practice
P(T)     = p_transit    chance of learning after an attempt
P(S)     = p_slip       chance of error when skill is known
P(G)     = p_guess      chance of correct without knowledge
```

Update is a two-step:
1. **Posterior** P(L | evidence) via Bayes rule
2. **Forward step** P(L_{t+1}) = P(L_t|ev) + (1 − P(L_t|ev)) × P(T)

**Hint-using attempt = wrong** (project decision). Label via `derive_label`:
- `< 0.05` → not_started
- `< 0.30` → introduced
- `< threshold` → developing
- `< 0.95` → proficient
- `≥ 0.95` → mastered

`replay_bkt` recomputes state from scratch by replaying all attempts. Used when BKT params change or after a skill merge/split. **Source of truth = `attempts`**, the cached mastery is event-driven (no TTL).

### EM calibration

`calibration/fit.py` (~250 lines pure Python) — forward-backward + EM for 4-param BKT. Fits `p_init`, `p_transit`, `p_slip`, `p_guess` from accumulated attempts.

`calibration/extract.py` pulls (student, skill) attempt sequences from DB. `calibration/apply.py` writes fitted params back to `skill.bkt_params`.

Tests: synthetic recovery test in `tests/test_calibration.py` validates EM recovers known params.

---

## Student movement

5 lesson types with default task distributions (from methodology table, `services/lesson.py:26-32`):

| Lesson type | easy | medium | hard | total_max |
|---|---|---|---|---|
| NEW_KNOWLEDGE | 2 | 3 | 1 | 12 |
| SKILL_CONSOLIDATION_A | 3 | 3 | 1 | 14 |
| SYSTEMATIZATION_B | 1 | 1 | 0 | 12 |
| DIAGNOSTIC_C | 1 | 2 | 1 | 16 |
| PREREQ_REVIEW_D | 2 | 2 | 1 | 12 |

7 lesson roles: `entry / cycle_iter_1 / cycle_iter_2 / microcycle / systematization / express_cycle / start_module`.

3 entry paths: `start_module / main_route / express_cycle`.

Counters in `StudentSkillState`: `consecutive_failures_in_lesson`, `microcycle_count_in_module` — for methodology caps.

---

## Graph operations

```python
graph.next_skill_for_student(states, targets)
# DFS from targets toward roots; first unlocked non-mastered skill

graph.find_gap_after_failure(failed_id, states)
# which prereqs may have caused the failure → remediation

graph.find_weak_skills(states)
# all < threshold, asc by p_mastery

graph.is_unlocked(skill_id, states)
# all hard prereqs mastered

graph.find_mastered_skills(states)
# all ≥ threshold, desc by p_mastery
```

`next_skill_for_student` does memoised DFS with `visited` set to prevent cycles.

---

## LessonFixture — the contract

`compose_lesson_fixture()` returns the **complete input for a lesson generator**:

- target skill + depth (`introduce` / `practice` / `master` / `review`)
- prereq snapshot with `last_known_solvability` per prereq
- student snapshot: mastered + weak + theme (hobby/cultural_context for narrative)
- task_distribution from methodology
- position in module + previous_recap + next_preview

Lesson is **frozen after `finished_at`** with `skill_snapshots[]` + `task_snapshots[]` storing `version_at_generation`. Retrospective viewing works even after a skill is edited.

---

## TaskSeed — the LLM kernel

**28 task formats** in `enums.py:123-158`:
- Selection: `mc_single`, `mc_multiple`, `true_false`, `highlight_text`, `hotspot`
- Construction: `fill_numeric`, `fill_expression`, `fill_word`, `short_answer`, `long_answer`
- Arrangement: `dd_match`, `dd_order`, `dd_bin`, `dd_fill`
- Interactive math: `number_line_plot`, `coord_plot`, `graph_draw`, `geometry_draw`, `geometry_label`, `transformer`
- Multi-step: `equation_steps`, `proof_builder`, `table_fill`, `word_problem_parts`
- K-2 specific: `count_objects`, `pattern_continue`, `sort_classify`
- Custom: `widget`

### VariantConstraints — what LLM may change

```python
class VariantConstraints:
    vary_numbers: Optional[NumberRangeSpec] = None  # operand ranges
    vary_narrative: bool = True
    keep_strategy: bool = True
    keep_difficulty: bool = True
    keep_cra_stage: bool = True
    keep_representation: bool = True
```

Distractors carry `why_chosen` (which misconception they represent) — for qualitative error analytics. Hints are 3-stage: `nudge → partial → solution`.

---

## B2B vs B2C

- **B2B Course:** fixed sequence of modules sold to a school. `Course = list[ModuleId]`.
- **B2C StudentGoal:** `target_skills` + `deadline` + `GoalSource(parent/student/system/teacher)`.
- **LearningPath** generic: `origin: PathOrigin{b2b_course | b2c_goals | b2c_diagnostic}`, `current_focus[1-3]`, `next_planned[]`.

---

## Versioning

Every entity has `version: int`. `CurriculumSnapshot` is a point-in-time view storing only version numbers. `SkillEdit` is an audit log row (skill_id, before/after, changes-dict, edited_by, reason) — replay for migrations.

---

## Stack

- FastAPI async + SQLAlchemy 2 + SQLite (dev) / Postgres (prod)
- Alembic 1 migration (`0001_initial.py`)
- SQLAdmin for methodist (9 ModelView)
- Auth via `ADMIN_USER` / `ADMIN_PASS` env
- 6 test suites: in-process, DB round-trip, API, admin, **calibration (BKT EM synthetic recovery)**, full curriculum FK integrity

## HTTP surface (11 endpoints)

```
GET  /health
GET  /skills
GET  /skills/{id}
GET  /skills/{id}/prereqs
GET  /modules
GET  /modules/{id}
GET  /modules/{id}/topics
GET  /students/{id}
GET  /students/{id}/states
POST /students/{id}/next-skill              ← walk graph
POST /students/{id}/lesson-fixture           ← contract for generator
POST /students/{id}/attempts                 ← record + Q-matrix BKT update
```

---

## Industry comparison

This is **stronger than 95 % of EdTech**. Squirrel AI / ALEKS / Century.tech do approximately this (BKT + skill graph + adaptive routing) but closed-source. Open-source equivalents (PSLC DataShop, MOOClet) are fragmentary. Here we have **production-grade ITS architecture** with correct separation of authoring / structure / runtime, versioning, snapshots, and calibration.

## Relation to current lms

| lms | external curriculum service |
|---|---|
| `app/skills/` (flat) | graph with hard/soft prereqs + Q-matrix |
| `app/exercises/` (8 types) | TaskSeed with 28 formats + variant constraints |
| `app/learning_paths/` (stub) | LearningPath with B2B/B2C origins |
| (none) | **BKT + EM calibration + microcycles** |
| (none) | LessonFixture contract |

Key insight: **the brain for AI lesson generation already exists on this machine**, just not in lms. External lesson generator = renderer (24 layouts × 12 widgets). Need to connect: `external curriculum service.LessonFixture` → prompt → cloud LLM → external lesson generator validator → external lesson generator viewer.

## What to take into universal KGS as-is

- `BKTParameters` + `update_bkt` + `replay_bkt` + EM calibration
- `SkillGraph` + `next_skill_for_student` + `find_gap_after_failure`
- `LessonFixture` (extend with subject_code + plugin refs)
- `VariantConstraints` + `TaskSeed`
- Versioning: `version: int` + `CurriculumSnapshot` + `SkillEdit`
- ID scheme (generalise to `{subject}.{grade}{strand}.{module}.S{n}`)

## What to NOT take as-is — generalise into subject plugins

- `Lang` enum (5 values hard-coded) → ISO 639 full
- `CRAStage` (math-specific) → move into math plugin
- `ModuleSection` enum (numbers/geometry/...) → subject manifest
- `Representation` enum (ten_frame/...) → widget set per plugin

---

## Gaps from external deck (added 2026-05-25)

Findings from external curriculum-graph architecture deck. Three concrete
additions worth absorbing into our work.

### 1. Validation pipeline (most useful gap)

We have no CI/quality gate that proves the graph is well-formed and aligned
with real curriculum/exams. Deck proposes four automatable checks:

| Check | What it asserts | How |
|---|---|---|
| **DAG** | No cycles in prerequisites | networkx `is_directed_acyclic_graph` — must pass before any modeling work runs |
| **Curriculum coverage 100 %** | Every official curriculum skill maps to exactly one graph skill, no graph skill is used for two curriculum skills | LLM auto-maps `(country, grade) → curriculum_skill_list` against `skill_name + description` |
| **Graph coverage ≥ 80 %** per grade | At least 80 % of the graph is used somewhere in the per-grade curriculum — otherwise mastery model is trained on sparse signal | Set-cover query over the curriculum→graph mapping |
| **Exam coverage ≥ 1** | Every exam question maps to at least one graph skill; surfaces missing strands (e.g. "no geometry coverage") | LLM scores each exam item against the graph; flag items with zero matches |

We already enforce DAG implicitly via `visited` in `next_skill_for_student`,
but the other three are new. Pipeline lives next to `scripts/build_curriculum_from_docx.py`
and runs in CI on every graph change.

### 2. Skill-sizing heuristic

> A skill is **right-sized** if 3–10 exercises take a student from
> not-knowing to knowing.

Operational test for methodist authoring:
- **More than 10 exercises needed** → split the skill (too coarse, mastery
  signal will be noisy because students reach proficiency in different
  sub-skills at different times).
- **Fewer than 3 exercises needed** → merge with neighbour (too fine, BKT
  needs at least 3–5 attempts to converge).

Sanity-check our 200 skills with this lens during next curriculum review.

### 3. Skill-density benchmark

Established graphs land in 60–200 skills per grade. Industry anchors:

| Source | Scope | Skills/grade |
|---|---|---|
| Common Core (US) | K–5, ~200 standards | 60–80 |
| Math Academy | K–12+, ~2 500 topics | ~190 |
| XES3G5M (China K-12) | 865 KCs | ~65 |
| **Our G1–G3** | 200 skills total | **~67/grade** |

We sit in the lower end of the established range — appropriate for v1.0.
Don't grow past ~120/grade without explicit reason (more skills ≠ better
mastery model; signal-to-noise drops).

### 4. Country-view layer (for multi-country expansion)

Industry pattern (Khan Academy, IXL, DreamBox, Matific in 50+ countries):
**one master graph + one country-view override layer**.

```
country_view:
  skill_id        required
  country_code    required  (ISO 3166-1 alpha-2)
  grade           required  (per-country sequencing)
  description           optional  (override)
  long_description      optional  (override)
  example_exercises     optional  (override)
```

Most skills inherit from base — override only where it matters (currency,
units, decimal separator, naming conventions, grade placement). Examples:

- **AZ**: "read money amounts" → manat / qəpik, `12,50 manat`, `,` decimal.
- **ID**: "read money amounts" → Rupiah, `Rp 12.000,-` format, `.` thousands / `,` decimal.
- "add fractions with unlike denominators" → base description works
  globally, no override.

We currently have `external_ids: dict[str, list[str]]` (cambridge / ccss /
…) which handles **standards alignment** but not **per-country adaptation**.
If/when we expand beyond a single country, add the country-view layer
without touching the base graph.

### 5. LLM-context field separation

Deck separates two long-form fields per skill:

- **`description`** — 1–2 sentences. Used in student-facing UI, methodist
  search, teacher dashboard.
- **`long_description`** — chapter-length (a textbook chapter, not a
  sentence). Used by LLM as **context** during lesson/problem generation.

We have `methodology_text` + `llm_instruction_text` + `student_facing_label`
+ `teacher_short_description`. The `llm_instruction_text` mixes
"instructions for the generator" with "subject-matter context the generator
should know" — and is typically short. Worth splitting:

- `llm_instruction_text` → keep, but trim to actual prompt instructions
  ("vary numbers, keep strategy, prefer concrete representation").
- New `llm_context_text` → chapter-length explanation of the concept,
  worked examples, common misconceptions. Reused across many tasks; iterated
  without DB migration. This is what the deck calls `long_description`.

Cheap win — single new column, populate lazily as the LLM-pipeline matures.

# Templates extension — Plans + Tasks + Decks template-first generation

Builds on `05-universal-platform-design.md`. Core principle: **LLM fills templates, never writes from scratch**. Cheaper, validatable, predictable.

## Three generation artefacts

| Artefact | Trigger | When | Storage |
|---|---|---|---|
| **LessonPlan** | methodist | offline, batch | KGS (curriculum data) |
| **TaskSeed** | methodist | offline, batch | KGS (task bank) |
| **TaskVariant** | LMS per student | online, per attempt | LGS cache |
| **Deck** | LMS per student | online, per lesson | LGS object storage |

**Offline = grow the bank. Online = adapt to student.** Separation is critical — otherwise cloud LLM cost balloons.

---

## Template libraries (3 levels)

```
┌─────────────────────────────────────────────────────────┐
│  PEDAGOGY LIBRARY (subject-agnostic)                    │
│  Industry-standard pedagogy patterns                    │
│  - Gagné Nine Events                                    │
│  - Madeline Hunter 7-step                               │
│  - 5E (BSCS Inquiry)                                    │
│  - Three-Part Lesson (Before/During/After)              │
│  - Direct Instruction (I do / We do / You do)           │
│  - Backwards Design (UbD)                               │
│  - Worked Example → Faded → Independent                 │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼ inherits + specialises
┌─────────────────────────────────────────────────────────┐
│  PLAN TEMPLATES (subject-specific)                      │
│  - math_cambridge_new_knowledge_plan                    │
│  - language_cefr_communicative_plan                     │
│  - physics_inquiry_5e_plan                              │
│  - programming_pbl_plan                                 │
│  - history_evidence_based_plan                          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  TASK TEMPLATES (format × pedagogy × subject)           │
│  - additive_composition_fill_numeric_concrete           │
│  - fraction_compare_dd_match_representational           │
│  - cefr_b1_dialogue_fill_blanks                         │
│  - physics_calculation_equation_steps                   │
│  - programming_debug_completion_code_test               │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  LAYOUT TEMPLATES (deck visuals — aimath has 24)        │
│  - math_introduction_with_widget                        │
│  - language_dialogue_audio_visual                       │
│  - physics_simulation_canvas                            │
└─────────────────────────────────────────────────────────┘
```

---

## Where libraries live

| Layer | Service | Why |
|---|---|---|
| **Pedagogy patterns** (canonical) | SAS | methodist-owned, slow-change, reference |
| **Plan templates** | SAS → publishes to KGS | derived from pedagogy + subject |
| **Task templates** | SAS → publishes to KGS | derived from task_format + skill_kind |
| **Layout templates** | LGS plugin | dev-owned, render-specific |

All templates = **first-class versioned entities**, lifecycle matches skills (draft / reviewed / published / deprecated).

---

## PlanTemplate — structure

```python
class PlanTemplate(BaseModel):
    id: str                                # "math_cambridge_new_knowledge_v1"
    name: str
    pedagogy_pattern: PedagogyPattern      # gagne_9 / hunter / 5e / three_part / ...
    subject_codes: list[str]               # ["math_*"] or ["physics_g7_*"]
    grade_range: tuple[int, int] | None
    language: Lang | None                  # None = polyglot template

    # Structure: sequence of lesson slots
    lesson_slots: list[LessonSlot]

    # Insertion rules (microcycles, prereq-review, diagnostic)
    insertion_rules: list[InsertionRule]

    # Spacing/interleaving rules
    spacing_rules: SpacingRules            # cap retry, interleaving cadence

    # Slots for LLM to fill
    slots_to_fill: dict[str, SlotSpec]     # narrative arc, theme, transitions

    version: int = 1


class LessonSlot(BaseModel):
    position: int
    lesson_type: LessonType                # NEW_KNOWLEDGE / SKILL_CONSOLIDATION_A / ...
    lesson_role: LessonRole
    duration_minutes: int
    skill_role: SkillRole                  # introduce_target / practice_target / review_prereq / diagnose
    skill_selector: SkillSelector          # how to pick concrete skill from graph at this position
    task_distribution: TaskDistribution


class SkillSelector(BaseModel):
    """Doesn't pin a concrete skill — defines the selection rule against the graph."""
    relative_to: Literal["target", "prereq_of_target", "weakest_in_module", "next_in_dag"]
    depth: SkillDepth | None
    bloom_level_constraint: BloomLevel | None
```

### Industry patterns as bundled PlanTemplates

| Pattern | Slot sequence | When to use |
|---|---|---|
| **Gagné 9 Events** | attention → objective → recall_prereq → present → guide → elicit → feedback → assess → retain | one-shot lesson, new topic |
| **Madeline Hunter** | anticipatory_set → objective → input → modeling → check → guided → independent → closure | direct instruction, K-8 |
| **5E Inquiry** | engage → explore → explain → elaborate → evaluate | science, discovery learning |
| **Three-Part** | minds_on → action → consolidation | Ontario style, math |
| **Direct Instruction** | I_do_modeling → We_do_guided → You_do_practice (per skill) | basic skills, weak students |
| **Backwards Design (UbD)** | desired_results → evidence → learning_plan | unit-level, project |
| **Worked Example Fading** | worked → faded_partial → faded_more → independent | cognitive load reduction |
| **Cambridge Method** | check_prior → introduce → demonstrate → practice → reflect | aimath-curriculum default |

Each = YAML manifest + LLM instruction stub. **Methodist picks + customises, never writes from scratch.**

---

## TaskTemplate — structure

```python
class TaskTemplate(BaseModel):
    id: str                                # "additive_composition_fill_numeric_v1"
    name: str

    # Applicability
    subject_codes: list[str]
    bloom_level: BloomLevel
    solo_level: SOLOLevel
    cra_stage: CRAStage | None
    skill_kind: SkillKind                  # content / process / metacognitive
    task_format: TaskFormat                # one of 28 formats

    # Prompt template
    prompt_pattern: str                    # "Compute {operand_a} {op} {operand_b} = ?"
    answer_spec_pattern: dict              # JSON schema with slots
    distractor_patterns: list[DistractorPattern]
    hint_pattern_stages: list[HintPattern] # nudge → partial → solution
    full_explanation_pattern: str

    # What LLM must generate
    slots_to_fill: dict[str, SlotSpec]
    # What LLM may NOT change (drift protection)
    constraints: list[Constraint]

    # Misconceptions this template probes
    targets_misconceptions: list[str]

    # Variant generation rules (inherited from aimath-curriculum)
    variant_constraints: VariantConstraints

    version: int = 1


class SlotSpec(BaseModel):
    name: str                              # "operand_a"
    type: Literal["int", "decimal", "fraction", "string", "image_ref", "narrative"]
    constraints: dict                      # range, regex, enum
    sourced_from: Literal["llm", "skill_data", "student_theme", "random"]
```

### Task template families (industry-standard)

| Family | Source | Examples |
|---|---|---|
| **Math base** | NCTM 8 practices + Cambridge variants | additive/multiplicative composition, fraction equivalence, ratio reasoning |
| **Math word problems** | Bar-model / Singapore method | join/separate/compare/part-whole structures |
| **Language receptive** | CEFR Can-Do tasks | gist reading, detail reading, inference |
| **Language productive** | CEFR + functional language | controlled writing, dialogue completion, picture description |
| **Programming** | TDD-style + debug patterns | implement-from-spec, debug-the-code, complete-the-function, refactor |
| **Sciences inquiry** | NGSS 8 practices | predict-observe-explain, design-experiment, interpret-graph |
| **History/Humanities** | DBQ + source evaluation | analyse-source, compare-sources, build-argument |
| **Math interactive** | Geogebra/Desmos patterns | drag-to-place, plot-coordinate, transform-shape |

**Shipped baseline: ~80 task templates** (8-12 per family) → methodist adds more.

---

## Four generation flows

### Flow 1: methodist creates LessonPlan (offline)

```
[1] Methodist picks  PlanTemplate (e.g. "math_cambridge_new_knowledge_v1")
                     + Module + target Skills
                                       │
                                       ▼
[2] SAS resolves SkillSelectors        → concrete skill_ids from KGS graph
                                       │
                                       ▼
[3] LGS fills narrative slots          → LLM call with template + skill context
                                       │
                                       ▼
[4] SAS validates                       → Pydantic + DAG check (prereqs respected)
                                       │
                                       ▼
[5] Methodist reviews diff             → SAS admin UI: edit narrative / swap skills
                                       │
                                       ▼
[6] SAS POST batch to KGS              → LessonPlan published, immutable + versioned
```

**Cost:** ~$0.01-0.05 per plan (1 LLM call for narrative slots).

### Flow 2: methodist grows TaskBank (offline)

```
[1] Methodist picks  TaskTemplate × Skill × Difficulty
                                       │
                                       ▼
[2] LGS generates N variants of seed   → N × LLM call (5-20 seeds per request)
                                       │
                                       ▼
[3] LGS validates each                 → Pydantic format + Q-matrix + misconception coverage
                                       │
                                       ▼
[4] LGS auto-runs answer for math      → solver verifies correctness where possible
                                       │
                                       ▼
[5] Methodist reviews queue            → approve / edit / reject in SAS admin
                                       │
                                       ▼
[6] SAS publishes approved as TaskSeed → KGS task bank growth
```

**Cost:** ~$0.05-0.20 per batch of 10 seeds. **Batch offline**, not runtime.

### Flow 3: online TaskVariant generation (per student)

```
[1] LMS lesson player needs task        → calls LGS /variant
[2] LGS picks TaskSeed from KGS         → bank query by (skill, difficulty)
[3] If seed available:
    [a] Apply VariantConstraints         → vary numbers + narrative theme (student.theme)
    [b] LGS LLM call (small + fast)      → variant body
    [c] Validate + cache + return
[4] If bank empty (rare):
    [a] Fallback: TaskTemplate + skill   → on-demand seed generation
    [b] Flag "low bank coverage" for methodist
```

**Cost:** ~$0.005-0.02 per variant. Cache hit ratio ~60 % after warm-up.

### Flow 4: online Deck generation (per lesson)

```
[1] LMS calls LGS /deck
[2] KGS composes LessonFixture           → already covered
[3] LGS resolves PlanLessonSlot → LayoutTemplate set
[4] Parallel asyncio.gather:
    ├─ slide_intro      (LLM call)
    ├─ slide_theory_N   (LLM × N parallel)
    ├─ pick variants from TaskBank (no LLM!)
    └─ slide_summary    (LLM call)
[5] Validate canvas-fit (aimath validator)
[6] Cache deck + return
```

**Cost:** ~$0.05-0.15 per deck (theory chunks via cloud, tasks from bank — no LLM).

---

## Cost comparison

Zero-shot generation each time: **$0.30-0.60 / lesson**, 1000 lessons/day = $300-600/day.

Template-first + task bank cache:
- Plan: $0.02 × ~10 plans/day = $0.20/day
- Tasks: $0.10 × ~20 batches/day (bank fill) = $2/day
- Variants: $0.01 × 1000 attempts × 0.4 cache miss = $4/day
- Decks: $0.10 × 1000 lessons × 0.3 cache miss = $30/day

**Total ~$36/day for 1000 lessons** vs $300+ without templates. **~8× saving.**

---

## Model extensions

### Skill now linked to 3 template types

```python
class Skill(BaseModel):
    # ... existing fields ...
    recommended_task_templates: list[str]      # template IDs suitable for this skill
    recommended_plan_slots: list[str]          # which LessonSlot roles this skill appears in
    typical_misconceptions: list[Misconception]
```

### Module / Course holds plan_template_default

```python
class Module(BaseModel):
    # ... existing ...
    default_plan_template_id: str | None       # default for plan generation
```

### TaskSeed now backrefs to template

```python
class TaskSeed(BaseModel):
    # ... existing ...
    generated_from_template: str | None        # backtrack to TaskTemplate
    template_version_at_generation: int | None # for retroactive analysis
```

---

## LGS API (extended)

| Endpoint | Action | Async? |
|---|---|---|
| `POST /plans/generate` | fill PlanTemplate by methodist trigger | sync (~5 s) |
| `POST /tasks/generate-batch` | fill TaskTemplate × N | async job (~30 s) |
| `POST /tasks/variant` | TaskSeed → Variant per student | sync (~2 s) |
| `POST /decks/generate` | LessonFixture → Deck | async (~20-40 s with SSE) |
| `POST /tasks/validate` | validate TaskSeed JSON | sync |
| `POST /plans/validate` | validate LessonPlan against pedagogy rules | sync |
| `GET /templates/plans` | list with filters | sync |
| `GET /templates/tasks` | list with filters | sync |
| `GET /templates/layouts` | list with filters | sync |

---

## SAS API (extended)

| Endpoint | Action |
|---|---|
| `POST /templates/plans` | CRUD plan templates |
| `POST /templates/tasks` | CRUD task templates |
| `POST /pedagogy-patterns` | base pattern library (rare edits) |
| `POST /plans/{id}/promote` | publish to KGS |
| `POST /tasks/{id}/promote` | publish to KGS |
| `GET /review-queue?type=plan|task` | methodist review queue |

---

## Subject onboarding with templates

Extended YAML manifest:

```yaml
# subjects/english_b1_b2.yaml
code: english_b1_b2
domain: LANG
mastery_model: spaced_repetition
language: en
grade_range: null            # CEFR-based, no grades

task_format_set:
  - mc_single
  - fill_blanks
  - dd_order
  - short_answer
  - dialogue_complete         # custom format from language plugin

layout_set_id: language_v1

# inherited template packs
inherits_plan_templates:
  - language_cefr_communicative_v1
  - language_cefr_task_based_v1

inherits_task_templates:
  - cefr_reading_gist_v1
  - cefr_reading_detail_v1
  - cefr_listening_inference_v1
  - cefr_grammar_controlled_v1
  - cefr_writing_paragraph_v1
  # ... 12 base CEFR templates

mastery_config:
  algorithm: fsrs              # spaced repetition variant
  initial_stability: 2.0
  retention_target: 0.9
```

Onboarding: **0 code, only YAML + methodist review.** All templates inherited from the shared library.

---

## Roadmap update (additional to base 8 stages from doc 05)

| # | Stage | Duration |
|---|---|---|
| 0-7 | Base platform (from previous doc) | 4-5 months |
| 8 | LGS: TaskVariant generator + cache | 2 wks |
| 9 | SAS: PlanTemplate CRUD + library bundled (8 industry patterns) | 2 wks |
| 10 | SAS: TaskTemplate CRUD + base library bundled (~80 templates) | 3 wks |
| 11 | LGS: Plan generation pipeline | 2 wks |
| 12 | LGS: Task batch generation (bank fill) | 2 wks |
| 13 | Methodist UI for template selection + diff review | 2-3 wks |
| 14 | Auto-solver for math (verify LLM tasks) | 2 wks |
| 15 | Language / Sciences / CS template packs | 4-6 wks |

**Extension total: ~3 months on top of base. Sum: ~7-8 months to full multi-subject universal platform.**

---

## Quality guarantees from template-first approach

1. **Deterministic structure** — LLM doesn't invent slide order or lesson phases
2. **Validation at every point** — Pydantic catches response shape; subject-specific validators catch semantics
3. **Auto-verify math answers** — solver runs the answer before approval
4. **Misconception coverage** — TaskTemplate **must** target ≥1 misconception → forces quality
5. **Pedagogy compliance** — PlanTemplate validates explicit rules (diagnostic after microcycle, prereq-review on <75 %)
6. **Versioned** — template updated → old lessons don't break (snapshot)
7. **Cheap to iterate** — methodist tweaks template → next batch better, **no retraining cost**

---

## Anti-patterns to avoid

1. **Don't let LLM write without a template.** "Generate a lesson about fractions" = disaster. Always template-driven.
2. **Don't conflate Task with TaskSeed with TaskVariant** — three different entities:
   - TaskTemplate = template class
   - TaskSeed = instance in the bank (methodist-approved)
   - TaskVariant = render for a specific student
3. **Don't generate TaskVariant with a heavy LLM.** Use Haiku / GPT-4o-mini / Gemini Flash — variant is a small mutation.
4. **Don't let LLM change structure templates.** Slots only.
5. **Don't put pedagogy patterns in code.** YAML/JSON manifests → methodist edits without deploy.
6. **Don't cache by skill_id only.** Cache key = `(skill_id, difficulty, language, student.theme.hobby, template_version)` — otherwise every student sees the same task.
7. **Don't forget auto-grader for math.** LLM errors on ~5-15 % of task answers — solver must re-verify before approval.

---

## Summary in one paragraph

**LGS now generates 4 artefacts: LessonPlan, TaskSeed-batch (offline) + TaskVariant, Deck (online).** All four are template-first: LLM fills slots in pre-authored patterns, never writes from scratch. **3-level library**: pedagogy patterns (Gagné / Hunter / 5E / Three-Part / Direct Instruction / UbD / Worked Example Fading + Cambridge) → plan templates (subject-specific) → task templates (~80 base: math NCTM, CEFR, NGSS, programming TDD, history DBQ) → layout templates (render). Templates stored in SAS, metadata in KGS, render plugins in LGS. Methodist does batch generation offline via SAS UI → reviews → promotes to KGS bank. Runtime online pulls TaskVariant from bank (cache hit ~60 %) + Deck per LessonFixture. **8× cloud-LLM saving** vs zero-shot, **deterministic validation** at every step, **pluggable mastery model** + **pluggable template packs** per subject. Subject onboarding = YAML manifest + library inheritance + methodist review = **2-4 weeks per subject**.

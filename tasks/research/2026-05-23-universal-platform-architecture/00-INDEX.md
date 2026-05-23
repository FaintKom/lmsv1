# Universal Education Platform — Research & Architecture

**Date:** 2026-05-23
**Status:** Design phase — research synthesised, no code yet
**Goal:** Generalise current `lms` + `aimath` + `aimath-curriculum` into a multi-subject, K12-through-university platform with template-first AI generation of plans, tasks, and lesson decks.

---

## Contents

1. [`01-current-architecture-audit.md`](01-current-architecture-audit.md) — backend, frontend, AI pipeline readiness audit of `F:\lms` (state on 2026-05-23, before any refactor).
2. [`02-server-and-local-llm.md`](02-server-and-local-llm.md) — Hetzner production server real specs, local-LLM feasibility analysis (verdict: cloud), recommended deployment options.
3. [`03-aimath-pipeline.md`](03-aimath-pipeline.md) — summary of `F:\Algonova\aimath`: deck generator with 24 layouts × 12 widgets, OpenRouter-based, client-side validator.
4. [`04-aimath-curriculum-graph.md`](04-aimath-curriculum-graph.md) — deep read of `F:\Algonova\aimath-curriculum`: skill graph, BKT (4-param + EM calibration), Q-matrix, LessonFixture composer, 200 skills G1-G3.
5. [`05-universal-platform-design.md`](05-universal-platform-design.md) — proposed architecture: 4 bounded contexts (SAS / KGS / LGS / LMS), data ownership, contracts, subject onboarding flow, tech stack, 8-step roadmap.
6. [`06-templates-extension.md`](06-templates-extension.md) — template-first generation: PlanTemplate, TaskTemplate, LayoutTemplate; pedagogy library (Gagné, Hunter, 5E, Three-Part, Direct Instruction, UbD, Cambridge); 4 generation flows; cost analysis (~8× saving vs zero-shot).

---

## Key decisions captured

- **Cloud LLM only** for generation — current Hetzner CX22 (2 vCPU, 3.7 GB RAM, no GPU) cannot host any useful local LLM for lesson generation. Aimath team already chose this path.
- **Template-first generation.** LLM fills slots in pre-authored patterns — never writes from scratch. 8× cost saving, deterministic validation, predictable quality.
- **4 services, not 3.** Authoring (slow, batch, LLM-extract, methodist review) and runtime graph (fast, BKT updates, lesson queries) have different SLOs and lifecycle. Split them. If budget tight: collapse SAS + KGS into one service with two schemas.
- **Pluggable mastery model.** BKT for math/physics/programming; FSRS (spaced repetition) for languages; Rubric for essays/labs; DKT optional for v2. Strategy registry, not if/else.
- **Subject as first-class entity.** New subject = YAML manifest + plugin (prompts/layouts/widgets/validators) + methodist review of LLM-extracted skills. 2-4 weeks per subject.
- **Aimath-curriculum is production-grade.** Take BKT, EM calibration, SkillGraph, LessonFixture, versioning as-is. Generalise the math-specific bits (CRA, ModuleSection enum, Representation enum) into subject plugins.

## Open questions for next session

- Do we fork `aimath-curriculum` into the lms monorepo, or treat it as a separate package consumed by lms? (Leaning toward monorepo with `packages/curriculum-models` shared.)
- Where does the methodist UI live — extend lms admin route group, or a separate Vite+React SAS admin? (Leaning separate — different audience, different cadence.)
- How to migrate existing lms `app/skills/`, `app/learning_paths/`, `app/exercises/` to the new KGS-owned model without breaking current users? (Needs migration plan in next session.)
- Subject manifest schema needs design pass (separate doc).
- Plugin packaging mechanism — installable Python package, or directory + manifest convention?

## Files referenced in research

External (read-only):
- `F:\Algonova\aimath\PROJECT_OVERVIEW.md` — MathProjectAI overview, team, stack, hronology
- `F:\Algonova\aimath\README.md` — deck generator quickstart
- `F:\Algonova\aimath-curriculum\README.md` — curriculum service quickstart
- `F:\Algonova\aimath-curriculum\curriculum\enums.py` — all enums (mastery labels, lesson types, task formats, ...)
- `F:\Algonova\aimath-curriculum\curriculum\graph.py` — SkillGraph + walk algorithms
- `F:\Algonova\aimath-curriculum\curriculum\bkt.py` — BKT update + label derivation
- `F:\Algonova\aimath-curriculum\curriculum\models.py` — Pydantic models (Skill, TaskSeed, LessonFixture, Student, …)
- `F:\Algonova\aimath-curriculum\curriculum\services\lesson.py` — compose_lesson_fixture
- `F:\Algonova\aimath-curriculum\curriculum\services\attempts.py` — record_attempt + Q-matrix BKT update

Current (lms):
- `F:\lms\CLAUDE.md` — project quick reference
- `F:\lms\backend\app\*` — 35+ feature modules
- `F:\lms\frontend\src\app\*` — Next.js 16 route groups
- `F:\lms\docs\ARCHITECTURE.md`
- `F:\lms\docs\exercises-api-guide.md`

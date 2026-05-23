# aimath project — pipeline summary

Location: `F:\Algonova\aimath`. Deployed at `aimath.grasslms.online` (shared Hetzner box, separate container `aimath-backend`).

## What it is

AI generator of educational presentations (decks) for primary school math (G1-G3). Given a lesson description and a student profile, assembles a 16:9 interactive deck with theory, visual widgets, and tasks. The platform writes the prompt, validates the model's response, and renders the final slides in-browser.

## Stack

- **Backend:** FastAPI + async SQLAlchemy + SQLite (`backend/`)
- **Frontend:** static site, no bundler (`site/`), **24 layouts × 12 widgets**
- **LLM:** OpenRouter (prompts for presentation generation, themes, image extraction)
- **Canvas validator:** client-side (`site/slides/js/validator.js` — `validateCanvasFit()`), measures overflow in browser at 1600×900
- **Deploy:** single Docker container, alongside shared nginx

## Structure

```
backend/                FastAPI app, routes in backend/routes/
  routes/
    decks.py            CRUD decks, status (draft/ready/reviewed/approved)
    feedback.py         teacher comments on slides
    generate.py         trigger deck generation via OpenRouter
    themes.py, plans.py, admin.py
  data/aimath.db        SQLite (created on boot, gitignored)

site/                   static frontend, mounted in same container
  slides/
    index.html          pipeline map: Fixture → Prompt → Validate → Render
    fixture.html        pick/edit lesson + student JSON
    prompt.html         assemble prompt for paste into Gemini
    validate.html       paste model response → 15 checks
    viewer.html         slide player with feedback panel (hotkey F)
    feedback.html       dashboard: deck list + statuses + teacher comments
    lessons.html        catalogue of real lessons
    js/                 renderer, widgets, validator, feedback-panel
  dashboard/index.html  methodology tools (separate from feedback view)

deploy/                 README + nginx snippet + deploy.sh for prod
prototypes/             prompts, fixtures, research scripts
tasks/                  roadmap + design docs
```

## Generation pipeline (4 steps)

1. **Fixture** — JSON with lesson + student + stage structure (ready presets in `site/slides/data/fixtures/`).
2. **Prompt** — `presentation_generation_prompt.{en,ru,id,es,az}.md` assembled into final prompt.
3. **Validate** — client-side checks `slides[]` against fixture (15 rules: layout names, widgets, required fields, canvas-fit). Canvas-fit measured directly in browser via off-screen render at 1600×900.
4. **Render** — `viewer.html` draws slides on a 1600×900 canvas with scale-to-fit.

## Teacher feedback flow

Teacher opens `viewer.html?deck=<slug>`, presses `F` or icon on right — drawer for comment on current slide or whole deck (severity low/med/high, tags). Aggregated dashboard — `slides/feedback.html`: deck list with unresolved counter, filters by status/grade, status change with reviewer signature. DB tables: `decks` + `feedback`. See `backend/models.py`.

---

## Why this architecture is relevant to our universal platform design

1. **It already chose cloud LLM (OpenRouter)** — validating Option A from server analysis.
2. **Client-side validator** is an interesting pattern: separation of "LLM said" vs "what fits the canvas". Saves server CPU.
3. **24 layouts × 12 widgets as a contract** is the template-first approach in action — LLM picks layouts from a fixed set, doesn't invent.
4. **Multilingual prompt packs** (en/ru/id/es/az) prove the plugin pattern works.
5. **Manual paste-back via `prompt.html` → `validate.html`** is the dev/methodist debug mode — useful pattern to keep in the universal LGS.

## What to take, what to leave

### Take into universal LGS
- 24 layouts × 12 widgets as starter math plugin
- Canvas-fit validator pattern
- SSE streaming + progress UI
- Multilingual prompt pack structure
- Teacher feedback panel UX (F-key drawer)

### Leave / change
- SQLite → switch to Postgres in production LGS
- Manual paste-back as debug only, automate the happy path
- Hard-coded layout count "24" → plugin-defined
- Single-language fixture JSON → multilingual student profile

## Project context

MathProjectAI / Algoritmika team. Active Dec 2025 – Mar 2026. ~2000 tasks tagged with Cambridge skills, ~1300 tagged by LLM with hard rules. Tutor rating ~7/10. Documented in detail in `F:\Algonova\aimath\PROJECT_OVERVIEW.md`.

Main authors of pieces we care about:
- **Dmitrii Zausaev** — product/data lead, graph architecture
- **Dmitriy Myshalov** — tech lead, full-stack, LMS integrations, AI pipelines
- **Mario Becerra** (FaintKom — user) — methodology, graph work (joined March 2026)
- **Louise Satlikova** — lead methodologist, skill detail, Bloom taxonomy
- **Alexandra Lukasik** — methodology lead, graph structure, skill relations

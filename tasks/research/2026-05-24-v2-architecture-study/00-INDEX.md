# V2 Architecture Study — 2026-05-24

Notes from studying three OSS education projects for inspiration on next
V2 phases. Per user direction (2026-05-24): "Изучить для архитектуры".

## Targets

1. **[Mathigon textbooks](https://github.com/mathigon/textbooks)** — for the
   lesson framework (custom-Markdown content + per-step TS code + reactive
   model). See `01-mathigon.md`.

2. **[Learnhouse](https://github.com/learnhouse/learnhouse)** — for the
   Notion-like block lesson editor. See `02-learnhouse.md`.

3. **[DhavalDudheliya/DuoLingo_Clone](https://github.com/DhavalDudheliya/DuoLingo_Clone)** —
   for the quest + shop + leaderboard gamification schema. See `03-duolingo.md`.

## Why now

V2 rollout (Phases 1–7) shipped 42 components + runner. Next horizons:
- **Methodist-side UX**: better lesson authoring (block editor, custom-MD)
- **Student-side engagement**: quests, shop, leaderboard wrapped around streak
- **Long-form content**: interactive textbook chapters (not just exercise drills)

Each of the three targets covers one of those horizons. This study folder
is reference-only — concrete adoption plans land in `tasks/todo.md` if
prioritized.

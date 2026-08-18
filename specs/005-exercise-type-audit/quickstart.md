# Quickstart: bring the stand up, run the probe

**Feature**: 005-exercise-type-audit · 2026-08-18

The stand is the QA stack plus the Corner Cases course: 26 types, seeded twice,
52 exercises across five lessons. Ports 8000, 3000 and 8101 are shared with every
other worktree, so only one stack runs at a time.

## Prerequisites

- Docker Desktop running.
- This worktree checked out. Build from here, or the containers describe
  somebody else's branch, which is what cost wave 2 its server results.

## Bring it up

```bash
docker compose -f docker-compose.qa.yml up -d --build --wait
```

About eight minutes cold. `--build` is not optional: the frontend's `/api/*`
rewrite target is baked in at build time, and a stale image sends every UI
request to production.

## Seed it

```bash
docker compose -f docker-compose.qa.yml exec -T backend python -m alembic upgrade head
```

```bash
docker compose -f docker-compose.qa.yml exec -T backend python scripts/seed_qa.py
```

```bash
docker compose -f docker-compose.qa.yml exec -T backend python scripts/seed_corner_cases.py
```

The second prints the QA ids; the third prints `CC_COURSE_ID`, one
`CC_LESSON[...]` per wave, and `CC_EXERCISE_COUNT=52`. Both are idempotent, so a
re-run leaves existing rows alone — submissions from an earlier pass included,
which is why a fresh measurement starts from a data reset rather than a re-seed.

## Reset the data between passes

```bash
docker compose -f docker-compose.qa.yml down -v && docker compose -f docker-compose.qa.yml up -d --wait
```

Thirty-five seconds, plus the migration and both seeds after it. Never rebuild to
get clean data.

## Run the probe (axis A)

```bash
docker compose -f docker-compose.qa.yml exec -T backend python scripts/qa_axis_probe.py
```

It signs in as `qa-student@qa.example.com`, walks every Corner Cases exercise and
prints one row per request: type, variant, what was sent, the status code, the
score. The correct answer goes first, so a row of 200s cannot mean an endpoint
that accepts everything.

## Verify the stack is the code under test

```bash
git rev-parse --short HEAD
```

```bash
docker exec lms-qa-backend-1 grep -c max_attempts_exhausted //app/app/exercises/service.py
```

The commit goes into the audit. The grep is the cheapest proof that the image
carries the wave-1 fixes rather than an older build. The doubled slash is for Git
Bash on Windows, which rewrites a leading `/app` into a Windows path.

## Where results go

`tasks/qa-audit-exercise-types-2026-08-17.md`, extending the structure already
there. Every line carries a status code, a traceback or a measured number, and a
skipped axis carries its reason instead.

# Research: driving the four axes

**Feature**: 005-exercise-type-audit · 2026-08-18

Nothing in the spec was left as NEEDS CLARIFICATION. What follows is the set of
choices the plan rests on, and what each one replaced.

## Where the probe runs

**Decision**: a script in `scripts/`, executed inside the QA backend container.

**Rationale**: `docker-compose.qa.yml` mounts `./scripts` and `./qa` into the
backend read-only, so the script reaches the API over localhost, uses the `httpx`
the image already carries, and picks up edits without a rebuild. The seed scripts
live there for the same reason.

**Alternatives considered**: a host run needs the per-project Python environment
this machine keeps, and adds one more moving part whenever a result disagrees
with the container. Writing it as pytest under `backend/tests/` would drop an
exploratory probe into the suite that gates every PR, where red means the gate is
broken rather than the product.

## Where the correct answer comes from

**Decision**: derive it from `qa/exercise-fixtures.json`, per type, inside the
probe.

**Rationale**: the fixture is what the exercise was seeded from, so the answer it
implies is the answer the grader should accept. Deriving it catches the crossword
defect class from the other side as well: a fixture the probe cannot build an
answer from is a fixture whose keys the grader does not read.

**Alternatives considered**: hand-written answers in the probe drift from the
fixture as soon as either changes, and would have hidden the very defect that
made the crossword unsolvable. The non-persisting `/check` endpoint returns
per-item booleans but never exercises the submission path, which is where
attempts, scores and stored rows live.

**Consequence**: some types have no derivable answer. `file_upload` goes to a
teacher, `scorm_package` reports through CMI, `whiteboard` is marked by hand.
Those are recorded as skips with the reason, per FR-005.

## Why axes B, C and D are not scripted

**Decision**: drive them by hand in the browser against `localhost:3000`.

**Rationale**: axis B is about what a student can tell by looking. A script
asserting `aria-disabled` would have passed wave 1, where the defect was that
`opacity` stayed at 1 and nothing else moved. The measurement has to include what
the page looks like, not only what it declares.

**Alternatives considered**: a Playwright spec is the right shape once the
questions are settled, and worth writing when the run has found what is worth
guarding. Written first, it freezes the wrong assertions, which is how
`e2e/roles/*.spec.ts` came to assert URLs and prove almost nothing.

## Which stack the results describe

**Decision**: build the images from the worktree, and record the commit.

**Rationale**: on 2026-08-17 the containers were built from a neighbouring
session's branch, so wave 2's server answers were discarded. The stack now runs
from `.claude/worktrees/qa-exercise-axes` at `68dedf7`, verified by grepping the
running container for the attempt-limit fix that shipped in `#319`.

**Alternatives considered**: trusting the stack that was already up. That is what
produced the discarded wave, and the failure is silent: the containers answer
normally while describing code nobody is looking at.

## What happens to a defect found here

**Decision**: fix it in this run when the fix is small and provable, with the
test shown failing first. Otherwise record it with the reason it was left.

**Rationale**: wave 1 fixed four defects that way and left the systemic one, and
the split held. The pattern behind finding 6 touches twelve graders; changing all
of them mid-audit would mean the rest of the run measures code nobody reviewed.

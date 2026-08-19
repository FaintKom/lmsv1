# Spec 014 — Two chats, two QA stacks

**Status:** implemented
**Branch:** `chore/parallel-session-isolation`
**Date:** 2026-08-19

## Problem

A worktree separates HEAD, the index and the branch. It separates nothing about the
running stack. `docker-compose.qa.yml` hard-coded the project name and the published
ports, so both chats addressed the same containers: whoever ran `up --build` second
recreated the first one's stack, and the first chat lost its seeded data and its
session mid-run. The bind mounts made it worse — `./scripts` and `./qa` come from
whichever checkout started the stack, so a script "run here" was the other session's
file, and editing mine changed nothing.

## Users

Two Claude sessions working this repo at once, and CI, which must keep working with
no setup at all.

## Requirements

- **FR-1** A second session can hold its own QA stack — its own container names, its
  own published ports — without editing a tracked file.
- **FR-2** With no configuration present, everything behaves exactly as before: the
  same project name and the same ports. CI and a single chat need no change.
- **FR-3** The second stack's frontend talks to the second stack's backend. The API
  URL is baked in at build time, so it must follow the port, not be assumed.
- **FR-4** The local configuration file is untracked.
- **FR-5** The written rules say how to run a second stack and how to tell whose
  files a container has mounted.

## Out of scope

`docker-compose.yml` (the dev stack) and the postgres behind pytest. Both are still
one-at-a-time; the rules say so rather than pretending otherwise.

## Success criteria

- `docker compose -f docker-compose.qa.yml config` with no env file resolves to the
  historical project name and ports 8000 / 3000 / 8101.
- The same command with an env file resolves to the overridden name and ports, and
  the frontend build argument carries the overridden backend port.
- `git status` is clean after a session writes its own `.env.qa.local`.

## Assumptions

Both sessions run on one machine, so ports collide but the docker daemon is shared —
a distinct compose project name is enough to keep the container sets apart.

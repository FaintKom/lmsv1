# Implementation Plan: Video and audio inside the live lesson

**Branch**: `feat/live-video-conferencing` | **Date**: 2026-08-17 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/003-live-lesson-video/spec.md`

## Summary

Put the media into the live lesson page and let the server decide who runs the
room. A self-hosted LiveKit server carries the audio and video; FastAPI mints
each participant a short-lived grant from the session cookie the browser already
holds, so a teacher arrives with room-admin rights and a pupil does not. The
existing live lesson supplies membership, presence, the raised hand and the
attendance record, and none of them are duplicated.

The production host has two cores and must keep serving the rest of the platform
while a lesson runs, so the plan spends its first slice measuring rather than
building. Slice 0 opens a UDP range, stands LiveKit up under a processor and
memory cap, and drives bot traffic at the real host until the numbers stop being
comfortable. Whatever that measurement says becomes the ceiling FastAPI enforces
when it issues a grant. Nothing downstream invents a capacity number.

## Technical Context

**Language/Version**: Python 3.12 on the backend, TypeScript 5 strict on Next.js 16 with React 19 on the frontend.

**Primary Dependencies**: FastAPI, SQLAlchemy 2 async, Alembic, Pydantic v2, `redis.asyncio`. New: `livekit-api` for signing grants and administering rooms from the backend, `livekit-client` with `@livekit/components-react` in the browser, and the `livekit/livekit-server` image pinned by version tag.

**Storage**: PostgreSQL 16 for durable records, Redis for live room state beside the keys `live_lessons` already owns, and the existing `FileStorage` abstraction for finished recordings.

**Testing**: pytest against real PostgreSQL with fakeredis, Vitest for the browser hooks and reducers, Playwright against the ephemeral QA stack, and `livekit-cli load-test` for the capacity measurement.

**Target Platform**: Linux under Docker Compose on the single Hetzner CX22 host. Browsers: current Chrome, Edge, Firefox and Safari on desktop and tablet.

**Project Type**: Web application with separate backend and frontend, plus one new infrastructure container.

**Performance Goals**: A teacher and twelve pupils in one room for 45 minutes (SC-001). Ninety-five per cent of participants connected within ten seconds (SC-004). Pages elsewhere in the platform no more than 20% slower while that room runs (SC-002).

**Constraints**: 2 vCPU and roughly 2.4 GB free on the production host, measured 2026-08-17. UFW passes only 22, 80 and 443 TCP today. Port 443 is held by nginx. Merging to `main` deploys within minutes with nobody in between. Disk is 67% used with 12 GB free.

**Scale/Scope**: One or two concurrent rooms on the current host, with the exact figure set by slice 0. Breakout groups count against the same ceiling. The webinar case of one source and a hundred viewers is a separate specification.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

**I. Tenant isolation is a rule, not a habit.** A grant is signed only after the
caller passes the organisation and group check `live_lessons` already performs,
and the room name is derived from the lesson id instead of accepted from the
client. Another school's lesson returns 404 from the existing lookup, so no
grant is ever signed for it. Moderation endpoints resolve the target through the
lesson's own membership before calling the media server, so an identifier
arriving in a request is never used on trust. See [contracts/api.md](contracts/api.md).

**II. A test that cannot fail is worse than no test.** Every guard is
demonstrated failing first: joining another school's room, a pupil issuing a
moderation call, a removed pupil asking for a fresh grant, and a participant
arriving at a full host. Isolation tests open with a positive control, because
"another school gets 404" passes before the endpoint exists.

**III. The server is the only judge.** Nothing here is graded, but the shape
carries over to authority. The client never states what it may do; the grant
carries the permissions, the media server enforces them, and a client asking for
more is refused by the media server instead of by hidden buttons.

**IV. The product and its documentation tell the same story.**
`docs/API_REFERENCE.md` gains the new endpoints and `docs/ARCHITECTURE.md` gains
the media container, with the Jitsi paragraphs in both removed instead of left
to rot. The recording module's own docstring currently promises a pre-signed
upload that does not exist; this feature builds it.

**V. The smallest change that works.** No second roster, no second hand-raise
and no second push channel: the existing SSE bus carries the new events. The
capacity ceiling reads live counts from the media server's API instead of
keeping a counter that can drift. Recording reuses the `recordings` table and
its init-and-complete flow.

**Result: pass.** One item is recorded under Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/003-live-lesson-video/
├── plan.md              # This file
├── research.md          # Phase 0: decisions, and what was rejected
├── data-model.md        # Phase 1: schema and Redis keys
├── quickstart.md        # Phase 1: how to run and validate it
├── contracts/
│   └── api.md           # Phase 1: endpoints and events
├── checklists/
│   └── requirements.md  # From /speckit-specify
└── tasks.md             # Phase 2, written by /speckit-tasks
```

### Source Code (repository root)

```text
backend/app/live_media/           # new module, same layout as its siblings
├── __init__.py
├── models.py                     # breakout group; recording gains a lesson link
├── schemas.py                    # grant request and response, moderation calls
├── router.py                     # /api/v1/live-lessons/{id}/media/*
├── service.py                    # grant signing, capacity check, moderation
└── grants.py                     # the permission set per role, in one place

backend/app/live_lessons/         # touched, not rewritten
├── router.py                     # ending a lesson closes its media rooms
└── realtime.py                   # new event names on the existing bus

backend/app/recording/            # finished: the upload endpoint that is missing
├── router.py
└── service.py                    # new: storage-backed upload and retention

backend/alembic/versions/         # one additive migration
backend/tests/                    # test_live_media.py, plus the isolation cases

frontend/src/lib/live/
├── media-client.ts               # connect, publish, subscribe, reconnect
└── recorder.ts                   # MediaRecorder capture and upload

frontend/src/components/live/
├── media-stage.tsx               # tiles, speaker focus, screen share
├── media-controls.tsx            # microphone, camera, share, leave
├── moderation-menu.tsx           # a teacher's actions on one participant
├── breakout-panel.tsx            # split, visit, message, gather
└── recording-indicator.tsx       # visible to everyone while recording

frontend/src/lib/i18n/locales/    # all six files, every new string
frontend/e2e/                     # live-media.spec.ts

docker-compose.prod.yml           # livekit service, pinned tag, capped
docker-compose.yml                # the same service for local work
docker-compose.qa.yml             # the same service for the E2E stack
nginx/nginx.conf                  # signalling proxy; later, the TURN stream block
```

**Structure Decision**: The backend gets a new feature module because media
concerns separate cleanly from lesson choreography, and `live_lessons/router.py`
is long enough already that adding grant signing, moderation and breakouts would
make it the largest file in the backend. The two modules meet at the lesson id
and at the Redis bus. On the frontend the new components sit under the `live/`
directory that already holds the roster and the board, so the media appears
beside them on the same page instead of behind a new route.

## Slices

Each slice is deployable on its own and leaves the platform working.

| Slice | What it delivers | Gate before the next |
|---|---|---|
| 0 | UDP range open, LiveKit running under caps, bot load test against the real host, ceiling measured and recorded | The number exists and is written into settings |
| 1 | Grants, the room inside the lesson page, camera and microphone, capacity refusal | SC-001, SC-004, SC-006 and SC-009 hold |
| 2 | Moderation and the raised hand giving the floor (tasks.md Phase 4), then screen sharing (Phase 5) | User stories 2 and 3 pass |
| 3 | Breakout groups | User story 4 passes |
| 4 | Recording of the teacher and the shared screen, captured in the browser; the missing upload endpoint; retention | User story 5 passes |

Slice 0 writes no feature code and its output is a number, not a release. If the
number is too low to hold a class, the second host enters the conversation with
the measurement behind it, and buying one is the owner's decision.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| A new infrastructure container on a two-core host | Real-time media cannot be carried by the existing stack, and every participant past the third needs selective forwarding that browsers cannot do between themselves. | A peer-to-peer mesh needs no server and fails on arithmetic: at fifteen participants each browser uploads fourteen copies of its own video, roughly 13 Mbit/s, which a pupil's home connection does not supply. Writing our own forwarder was rejected because simulcast, congestion control and layer selection are exactly the parts that make two cores viable, and they are months of work against problems already solved in an Apache-licensed component. |

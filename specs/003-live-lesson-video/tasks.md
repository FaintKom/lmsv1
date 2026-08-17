# Tasks: Video and audio inside the live lesson

**Input**: Design documents from `/specs/003-live-lesson-video/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/api.md](contracts/api.md)

**Tests**: Included, and not optional here. Constitution principle II requires every
guard to be demonstrated failing before it is trusted, and this feature is almost
entirely guards.

**Organization**: Phase 1 is slice 0 and produces a number rather than a release.
Phases 3 onward map one-to-one to the user stories in spec.md.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel — different files, no dependency on an incomplete task
- **[Story]**: Which user story the task serves (US1–US5)
- Every task names the file it touches

## Path Conventions

Backend at `backend/app/`, frontend at `frontend/src/`, per plan.md. Infrastructure
lives in the three Compose files and `nginx/nginx.conf` at the repository root.

---

## Phase 1: Slice 0 — Measure before building

**Purpose**: Stand the media server up under a cap and find out what this host
actually holds. No feature code is written in this phase.

**Output**: a number. Nothing in Phase 3 starts until it exists.

- [x] T001 [P] Add a `livekit` service to `docker-compose.yml` for local work: an ordinary bridge, the development key pair, and UDP mux on 7882–7883 per research.md Finding C as revised
- [ ] T002 [P] ~~Add the same `livekit` service to `docker-compose.qa.yml`~~ — **deferred to slice 1.** Nothing in the QA stack exercises media until the e2e journey at T084 exists, and an unused container makes every PR's e2e gate slower for no return. Move it here when T084 is written
- [x] T003 Add the `livekit` service to `docker-compose.prod.yml` with the image **pinned to a version tag, never `:latest`** (research.md Finding I: `cloudflared` in the same file uses `:latest`, and copying that habit means a silent restart mid-lesson), plus `restart: unless-stopped` and `deploy.resources.limits` of `cpus: "1.2"` and `memory: 700M`, commented with the arithmetic the way the `sandbox` service comments its own
- [x] T004 Add `livekit.yaml` at the repository root: UDP mux, TURN on 3478/udp with its relay range published (Finding M), and the audio selection from Finding G that decides whether a fifteen-person room fits
- [x] T005 [P] Add the six media settings to `backend/app/config.py` per data-model.md, with `max_concurrent_media_participants` defaulting to **0**, meaning media is off until a measurement says otherwise
- [ ] T006 [P] ~~Add `livekit-api` and the browser SDK~~ — **deferred to slice 1.** Neither is imported by anything until the grants module and the room UI exist, and an unused dependency is weight in the lock file and the bundle. Add each beside its first caller
- [x] T007 Proxy the signalling WebSocket in `nginx/nginx.conf`: `/rtc` to `lms-livekit-1:7880` with the upgrade headers and hour-long timeouts, so 7880 stays on loopback and a lesson-length socket is not cut every minute
- [x] T008 ~~**Owner-gated.** Open the production firewall~~ — **no firewall change is needed, and this is measured rather than assumed.** A published container port is DNAT'd in `nat/PREROUTING` and travels `FORWARD`, which Docker has already opened, while ufw filters `INPUT`; the prod compose file records an unrelated container reachable from the internet on 2026-08-17 with ufw active. Publishing the ports in compose is what makes them reachable. **The `ports:` list is therefore the security boundary**, which is why 7880 binds to `127.0.0.1`. Verify with `ss -lntup`, never `ufw status` (research.md Finding D as revised)
- [ ] T091 Raise `net.core.rmem_max` on the production host before the load test. LiveKit's own startup log asks for it — `"UDP receive buffer is too small for a production set-up","current":425984,"suggested":5000000` — and measuring capacity against a starved socket buffer measures the wrong thing (Finding N)
- [ ] T009 Record the idle baseline before any load: page load times for `/login` and one dashboard page, three samples each, written into research.md as a new finding
- [ ] T010 Run `livekit-cli load-test` against the production host in a quiet window, stepping the participant count up run by run, stopping at whichever fails first — the container pinning its `cpus` cap, or platform page loads exceeding the baseline by more than 20% (SC-002). Record the join latency the tool reports at each step as well, because SC-004 asks for 95% of participants connected within ten seconds and this is the only run that measures it
- [ ] T011 Write the last passing participant count into `MAX_CONCURRENT_MEDIA_PARTICIPANTS` in the production environment and into research.md as a measured finding. **If the number is below a class size, stop here and bring the second host back to the owner with the measurement attached** instead of starting Phase 3

**Checkpoint**: The ceiling is a measured number, not a guess. Phase 2 may begin.

---

## Phase 2: Foundational (blocks every user story)

**Purpose**: Schema, module skeleton, and the one place permissions are decided.

**⚠️ No user story work begins until this phase is complete.**

- [ ] T012 Create the `backend/app/live_media/` module with `__init__.py`, `models.py`, `schemas.py`, `router.py`, `service.py` and `grants.py`, following the layout its sibling modules already use
- [ ] T013 Write one additive Alembic migration in `backend/alembic/versions/`: the `live_breakout_groups` table, the four new `recordings` columns, the two new `organizations` columns, and the `recording_source` enum created explicitly before the column that uses it, per data-model.md and the enum recipe in `docs/MIGRATIONS.md`
- [ ] T014 Import `app.live_media.models` in all three places autogenerate needs — `backend/app/main.py` lifespan, `backend/tests/conftest.py`, and `backend/alembic/env.py` — or the module stays invisible the way `knowledge` and `integrations` did
- [ ] T015 [P] Write `backend/app/live_media/grants.py`: the permission set per role in one function, teacher carrying `roomAdmin` and pupil not, per the table in contracts/api.md. Nothing else in the module may build a grant
- [ ] T016 Write the LiveKit server wrapper in `backend/app/live_media/service.py`: room listing, participant mute and removal, and a live participant count cached in Redis for two seconds. Read the count from the media server instead of keeping a counter, per research.md Finding F
- [ ] T017 [P] Add the six media Redis key helpers to `backend/app/live_media/service.py`, named in one place the way `live_lessons/realtime.py` names its own
- [ ] T018 Mount the router at `/api/v1/live-lessons/{lesson_id}/media` in `backend/app/main.py`

**Checkpoint**: Schema and permissions exist. User stories may begin.

---

## Phase 3: User Story 1 — Hold the lesson without leaving the lesson (P1) 🎯 MVP

**Goal**: Camera and microphone for everyone, inside the lesson page, with the
server deciding who runs the room.

**Independent Test**: A teacher and two pupils in separate browsers see and hear
each other inside the lesson page, with no second window and no external domain.

### Tests for User Story 1

> Write these first and watch them fail. The isolation cases need their positive
> control first, because "another school gets 404" passes before the endpoint
> exists.

- [ ] T019 [P] [US1] Positive control in `backend/tests/test_live_media.py`: the lesson's own teacher receives a grant, and its payload carries `roomAdmin`
- [ ] T020 [P] [US1] Isolation test in `backend/tests/test_live_media.py`: a teacher of another organisation requesting a grant for this lesson gets **404, not 403** (Constitution I, SC-009)
- [ ] T021 [P] [US1] Isolation test in `backend/tests/test_live_media.py`: a pupil who is not in the lesson's group gets 404
- [ ] T022 [P] [US1] Test in `backend/tests/test_live_media.py`: a pupil's grant carries no `roomAdmin` and no screen-share source
- [ ] T023 [P] [US1] Test in `backend/tests/test_live_media.py`: with the ceiling set to one, the second participant gets **503 with a reason**, and the first participant's room is untouched (FR-008)
- [ ] T024 [P] [US1] Test in `backend/tests/test_live_media.py`: a grant expires within `media_grant_ttl_seconds`, so a token cannot outlive a removal

### Implementation for User Story 1

- [ ] T025 [US1] Write the grant request and response schemas in `backend/app/live_media/schemas.py` per contracts/api.md
- [ ] T026 [US1] Implement `POST /media/token` in `backend/app/live_media/router.py`: resolve the lesson through the existing `live_lessons` lookup, check the removed set, check the ceiling, then sign through `grants.py`
- [ ] T027 [P] [US1] Write `frontend/src/lib/live/media-client.ts`: connect, publish camera and microphone, subscribe with `adaptiveStream` and `dynacast` on, and reconnect on its own
- [ ] T028 [P] [US1] Add the typed API functions to `frontend/src/lib/api/live.ts`
- [ ] T029 [US1] Write `frontend/src/components/live/media-stage.tsx`: the teacher and whoever holds the floor at a high layer, everyone else as low-layer thumbnails (research.md Finding G)
- [ ] T030 [US1] Write `frontend/src/components/live/media-controls.tsx`: device pickers, mute, camera off, leave, and joining with audio alone when there is no camera (FR-007)
- [ ] T031 [US1] Mount the stage and controls in `frontend/src/app/(dashboard)/lesson/[lessonId]/page.tsx`, beside the existing scene and roster
- [ ] T032 [US1] Mount the same in `frontend/src/app/(admin)/admin/live/[lessonId]/page.tsx`
- [ ] T033 [US1] Show the capacity refusal as a plain message when the grant returns 503, leaving board, tasks and roster working
- [ ] T034 [P] [US1] Add every new string to all six files in `frontend/src/lib/i18n/locales/`, or the parity test fails (FR-026)
- [ ] T035 [P] [US1] Vitest for the reconnect path in `frontend/src/lib/live/media-client.test.ts`
- [ ] T036 [US1] Close the media room when the lesson ends, in `backend/app/live_lessons/router.py`, and delete every breakout group belonging to it so no room outlives its lesson (FR-018; the test for the breakout half is T057)

**Checkpoint**: SC-001, SC-004, SC-006 and SC-009 hold. This is the MVP and is deployable.

---

## Phase 4: User Story 2 — Run the room, not just attend it (P2)

**Goal**: A teacher can quiet, remove and focus participants, and the raised hand
that already exists gives someone the floor.

**Independent Test**: Mute a pupil, spotlight another, remove one and confirm they
cannot return.

### Tests for User Story 2

- [ ] T037 [P] [US2] Positive control in `backend/tests/test_live_media.py`: a teacher mutes a pupil and the call succeeds
- [ ] T038 [P] [US2] Test: a pupil calling any moderation endpoint against another pupil gets 403
- [ ] T039 [P] [US2] Test: a teacher passing a `user_id` from another school's lesson gets 404, because the target is resolved through membership and never trusted from the request
- [ ] T040 [P] [US2] Test: a removed pupil requesting a fresh grant gets 403 every time, which is what makes removal a removal instead of a hidden button (SC-006)

### Implementation for User Story 2

- [ ] T041 [US2] Implement mute, remove and floor in `backend/app/live_media/router.py` and `service.py` per contracts/api.md, resolving every target through the lesson's membership first
- [ ] T042 [US2] Publish `media_floor_changed` and `media_participant_removed` on the existing bus in `backend/app/live_lessons/realtime.py`. No new channel, and muting publishes nothing — the media server tells its own clients
- [ ] T043 [US2] Write `frontend/src/components/live/moderation-menu.tsx`, reachable from the roster entry that already exists
- [ ] T044 [US2] Give the floor from the existing raised-hand signal in `frontend/src/components/live/roster-panel.tsx`, with no second hand-raise introduced (FR-013)
- [ ] T045 [US2] Tell a muted pupil they were muted, and let them unmute themselves (FR-012)
- [ ] T046 [P] [US2] Strings into all six locale files

**Checkpoint**: User story 2 passes independently.

---

## Phase 5: User Story 3 — Show what is on my screen (P2)

**Goal**: The teacher shares a screen, and may let a pupil share.

**Independent Test**: The teacher shares and pupils see it; the teacher permits a
pupil, who shares; the teacher stops it.

### Tests for User Story 3

- [ ] T047 [P] [US3] Positive control: a teacher's grant carries the screen-share source
- [ ] T048 [P] [US3] Test: a pupil's grant omits it until permitted, and carries it after
- [ ] T049 [P] [US3] Test: withdrawing permission both removes the source and stops a share in progress (FR-014)

### Implementation for User Story 3

- [ ] T050 [US3] Implement the screen-share permission endpoint in `backend/app/live_media/router.py`, holding the grant set in Redis
- [ ] T051 [US3] Publish `media_share_grant_changed` from `backend/app/live_lessons/realtime.py`
- [ ] T052 [US3] Add screen capture, and the second video track it produces, to `frontend/src/lib/live/media-client.ts`
- [ ] T053 [US3] Lay the shared screen out beside the camera tiles in `frontend/src/components/live/media-stage.tsx`
- [ ] T054 [P] [US3] Strings into all six locale files

**Checkpoint**: User story 3 passes independently.

---

## Phase 6: User Story 4 — Split the class and bring it back (P3)

**Goal**: Groups that hear only themselves, a teacher who can visit and message
them, and one action that gathers everyone back.

**Independent Test**: Split four pupils into two pairs, confirm each pair hears
only itself, visit one, then gather.

### Tests for User Story 4

- [ ] T055 [P] [US4] Positive control: a teacher splits a lesson and the group rows exist with the right members
- [ ] T056 [P] [US4] Test: a pupil requesting a grant for a group they do not belong to gets 404
- [ ] T057 [P] [US4] Test: ending the lesson deletes every group and closes every group room (FR-018)
- [ ] T058 [P] [US4] Test: a pupil's authority in a group room equals their authority in the main room (FR-017)

### Implementation for User Story 4

- [ ] T059 [US4] Add the `LiveBreakoutGroup` model to `backend/app/live_media/models.py` per data-model.md
- [ ] T060 [US4] Implement create, list, broadcast and gather in `backend/app/live_media/router.py`, counting group participants against the same ceiling
- [ ] T061 [US4] Implement the breakout grant endpoint, deriving the room name from the lesson id and the group index
- [ ] T062 [US4] Publish `media_breakouts_changed` and `media_breakout_message` from `backend/app/live_lessons/realtime.py`
- [ ] T063 [US4] Write `frontend/src/components/live/breakout-panel.tsx` for the teacher
- [ ] T064 [US4] Move a pupil's client between rooms on the event, fetching a fresh grant instead of reusing the old one
- [ ] T065 [P] [US4] Strings into all six locale files

**Checkpoint**: User story 4 passes independently.

---

## Phase 7: User Story 5 — Keep a recording of the lesson (P3)

**Goal**: A recording of the teacher and the shared screen, visible to everyone
while it runs, stored against the lesson.

**Independent Test**: Record a short lesson with pupils on camera, and confirm the
file holds the teacher and the screen and nobody else.

> The `recording` module is a stub today: `/init` returns an upload URL for an
> endpoint that does not exist, and `/complete` writes a client-supplied
> `storage_url` onto the row (research.md Finding J). This phase finishes it.

### Tests for User Story 5

- [ ] T066 [P] [US5] Positive control: with `recording_enabled` true, a teacher starts a recording and the row appears
- [ ] T067 [P] [US5] Test: with `recording_enabled` false, starting one gets 403 and no control is offered (FR-019)
- [ ] T068 [P] [US5] Test: a pupil starting or stopping a recording gets 403
- [ ] T069 [P] [US5] Test: uploading to somebody else's recording gets 404, and uploading to one already `ready` is refused
- [ ] T070 [P] [US5] Test: `storage_url` is written by the server, and a value sent by the client is ignored because the field has left the request schema
- [ ] T071 [P] [US5] Test: a recording left `uploading` past the grace window is swept to `failed` (FR-022)
- [ ] T072 [P] [US5] Test: another school reading the recording gets 404 and learns nothing about whether it exists
- [ ] T090 [P] [US5] Test: a participant who joins after a recording started still receives the indicator state, because it is read from Redis on join rather than only broadcast at start (SC-007)

### Implementation for User Story 5

- [ ] T073 [US5] Expose `recording_enabled` and `recording_retention_days` on the organisation, in `backend/app/orgs/router.py` and the settings page under `frontend/src/app/(admin)/admin/`, so a school administrator can turn recording on (FR-019)
- [ ] T074 [US5] Build `PUT /api/v1/recordings/{id}/upload` in `backend/app/recording/router.py` on the existing `get_storage()` abstraction — the endpoint `/init` has been promising since it was written
- [ ] T075 [US5] Remove `storage_url` from the complete request schema, derive it on the server, and write `expires_at` from the organisation's retention
- [ ] T076 [US5] Add `PATCH /api/v1/recordings/{id}` for `shared_with_group`, the teacher's deliberate act (FR-021)
- [ ] T077 [US5] Implement start and stop in `backend/app/live_media/router.py`, holding the in-progress id in Redis so a late joiner still sees the indicator
- [ ] T078 [US5] Add the sweep for stale `uploading` rows and the retention cleanup to `backend/app/scheduler.py`
- [ ] T079 [US5] Write `frontend/src/lib/live/recorder.ts` with MediaRecorder over **the teacher's own local tracks only** — microphone, camera and screen share. It must never subscribe to a remote track (FR-027). Show the control only where the browser can actually capture
- [ ] T080 [US5] Write `frontend/src/components/live/recording-indicator.tsx`, visible to every participant for the whole time recording runs (FR-020)
- [ ] T081 [P] [US5] Strings into all six locale files

**Checkpoint**: User story 5 passes independently. Every story is done.

---

## Phase 8: Polish and cross-cutting

- [ ] T082 [P] Add the new endpoints and events to `docs/API_REFERENCE.md` and the media container to `docs/ARCHITECTURE.md`, and **remove the Jitsi paragraphs from both** instead of leaving them to rot (Constitution IV)
- [ ] T083 [P] **Leave `frontend/src/lib/meetings.ts` alone.** An earlier draft of this task said to delete it once lessons no longer needed it; lessons never needed it. `buildJoinUrl` is imported by four working pages — `(dashboard)/schedule/page.tsx`, `(dashboard)/meetings/page.tsx`, `(admin)/admin/meetings/page.tsx` and `(admin)/admin/journal/page.tsx` — and deleting it breaks the schedule, both meetings pages and the journal. This feature replaces Jitsi **inside the live lesson only**; scheduled slots, standalone meetings and the journal keep their Jitsi links until somebody specifies replacing those too
- [ ] T088 Verify SC-008 rather than assuming it: with a lesson running on the QA stack, run the deploy sequence `docker compose pull` and `up -d` against it and confirm the media container is not recreated, then deliberately change its service definition, restart, and confirm participants return by themselves within 30 seconds (FR-025, research.md Finding I)
- [ ] T089 [P] Add a Vitest to `frontend/src/lib/live/recorder.test.ts` asserting the recorder builds its stream only from local tracks and never touches a remote participant's track. FR-027 is otherwise checked only by a human watching a file play back, and this is the check that catches somebody "improving" it into a room composite
- [ ] T084 Write `frontend/e2e/live-media.spec.ts`: one teacher and two pupils — start, join, share, mute one, remove the other, end
- [ ] T085 **Owner-gated. Do not apply without an explicit yes.** Add the nginx `stream` block with `ssl_preread` on 443 in `nginx/nginx.conf`, routing `turn.grasslms.online` to the embedded TURN and everything else to the HTTPS server moved to `127.0.0.1:8443`. Issue a **separate standalone certificate** for that hostname and **never add it to the `grasslms.online` bundle** — bundling a subdomain is what expired the production certificate on 2026-07-29. Rehearse on the QA stack, run `nginx -t`, and have the rollback ready before applying (research.md Finding E, SC-005)
- [ ] T086 Run `quickstart.md` end to end against a real lesson, including the check that a recording holds no pupil
- [ ] T087 Verify in production after the deploy: poll both the CI run and the deploy run to completion, hold a real lesson with two accounts, and watch `docker stats` and `free -h` on the host while it runs. State in the pull request body which guard tests were demonstrated failing before their fix, which Constitution principle II requires and a green suite does not show

---

## Dependencies and execution order

### Phase dependencies

- **Phase 1 (slice 0)** blocks everything. Its output is the number Phase 3 enforces, and T008 waits on the owner
- **Phase 2** depends on Phase 1 and blocks every user story
- **Phase 3 (US1)** is the MVP. Phases 4 and 5 depend on it, because they moderate a room that has to exist first
- **Phase 6 (US4)** depends on Phase 4: a group room re-issues grants and inherits the moderation model
- **Phase 7 (US5)** depends on Phase 5, because a recording captures the screen share
- **Phase 8** depends on the stories it documents. T085 is independent of the rest and can be done any time after Phase 1

### Within a story

Tests are written and seen failing before the code. Isolation tests need their
positive control first, or they pass against an endpoint that does not exist.

### Parallel opportunities

- T001, T002, T005 and T006 in Phase 1
- T015 and T017 in Phase 2
- Every test task inside a story phase carries [P] and can be written together
- Locale tasks T034, T046, T054, T065 and T081 touch only the six locale files
- T082 and T083 in Phase 8

---

## Implementation strategy

**Slice 0 first, and it may say stop.** If the measured ceiling is below a class
size, the honest outcome is a conversation about a second host with a number
behind it, not a feature that degrades three lessons at once.

**Then the MVP.** Phase 2 plus Phase 3 is a deployable increment: teacher and
pupils see and hear each other inside the lesson page, and the teacher is
moderator because the server said so. That alone replaces what `meet.jit.si` does
today, without the joining-order lottery.

**Then one story per deploy.** Moderation, screen sharing, breakouts, recording.
Each leaves the platform working, and each can be verified in production on its
own.

## Notes

- **One task waits on the owner, not two.** T085 (the nginx stream block and the
  TURN certificate) still does. T008 no longer does: publishing a container port
  bypasses ufw entirely, so there is no firewall to ask about — see its own text
- Three tasks were rewritten after the container was actually run rather than
  reasoned about. T001, T003 and T004 assumed host networking and a two-hundred
  port range; UDP mux made both unnecessary. T008's premise was wrong outright.
  T091 and Finding M came out of reading the startup log
- `docker-compose.staging.yml` is deliberately untouched. Staging is evicted from
  the host and routed-broken, so adding a media service there would configure
  something nobody runs
- T088, T089 and T090 came out of the `/speckit-analyze` pass, which found SC-008
  and SC-004 with no task behind them and FR-027 checked only by a human
- Schema reaches production only by Alembic migration, and only forward — an
  applied migration is never edited
- Commit per task or per logical group. Merging to `main` deploys within minutes,
  so verify in production instead of trusting a green build

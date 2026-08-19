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
- [x] T002 [P] Add the same `livekit` service to `docker-compose.qa.yml` — done 2026-08-18 with its own config (`livekit/livekit.qa.yaml`): CI has no route to a public STUN server, and external-IP discovery killed the server before a single test ran — **deferred to slice 1.** Nothing in the QA stack exercises media until the e2e journey at T084 exists, and an unused container makes every PR's e2e gate slower for no return. Move it here when T084 is written
- [x] T003 Add the `livekit` service to `docker-compose.prod.yml` with the image **pinned to a version tag, never `:latest`** (research.md Finding I: `cloudflared` in the same file uses `:latest`, and copying that habit means a silent restart mid-lesson), plus `restart: unless-stopped` and `deploy.resources.limits` of `cpus: "1.2"` and `memory: 700M`, commented with the arithmetic the way the `sandbox` service comments its own
- [x] T004 Add `livekit.yaml` at the repository root: UDP mux, TURN on 3478/udp with its relay range published (Finding M), and the audio selection from Finding G that decides whether a fifteen-person room fits
- [x] T005 [P] Add the six media settings to `backend/app/config.py` per data-model.md, with `max_concurrent_media_participants` defaulting to **0**, meaning media is off until a measurement says otherwise
- [x] T006 [P] Add `livekit-api` to `backend/pyproject.toml` and `livekit-client` with `@livekit/components-react` to `frontend/package.json` — done in slice 1, each beside its first caller rather than ahead of it. The browser half needed node 22, which is now installed through `fnm`
- [x] T007 Proxy the signalling WebSocket in `nginx/nginx.conf`: `/rtc` to `lms-livekit-1:7880` with the upgrade headers and hour-long timeouts, so 7880 stays on loopback and a lesson-length socket is not cut every minute
- [x] T008 ~~**Owner-gated.** Open the production firewall~~ — **no firewall change is needed, and this is measured rather than assumed.** A published container port is DNAT'd in `nat/PREROUTING` and travels `FORWARD`, which Docker has already opened, while ufw filters `INPUT`; the prod compose file records an unrelated container reachable from the internet on 2026-08-17 with ufw active. Publishing the ports in compose is what makes them reachable. **The `ports:` list is therefore the security boundary**, which is why 7880 binds to `127.0.0.1`. Verify with `ss -lntup`, never `ufw status` (research.md Finding D as revised)
- [x] T091 Raise `net.core.rmem_max` on the production host before the load test. LiveKit's own startup log asks for it — `"UDP receive buffer is too small for a production set-up","current":425984,"suggested":5000000` — and measuring capacity against a starved socket buffer measures the wrong thing (Finding N)
- [x] T009 Idle baseline recorded from the box through nginx, so it measures contention for the processor rather than a home connection: `/login` 13 ms median, API 10 ms (Finding O)
- [x] T010 Ran `livekit-cli load-test` against the production host in a quiet window, stepping the participant count up run by run, stopping at whichever fails first — the container pinning its `cpus` cap, or platform page loads exceeding the baseline by more than 20% (SC-002). Record the join latency the tool reports at each step as well, because SC-004 asks for 95% of participants connected within ten seconds and this is the only run that measures it
- [x] T011 **Ceiling is 30**, written to `MAX_CONCURRENT_MEDIA_PARTICIPANTS` on the box and into research.md as Finding O. Well above a class size, so the second host stays out of the conversation. The processor cap was never the constraint — page latency was, and even that figure is pessimistic because the bots ran on the box they were testing

- [x] T092 Generate the LiveKit key pair into the production `.env` and restart the container. **Slice 0 shipped a service that could not start:** compose interpolates `${LIVEKIT_API_KEY}: ${LIVEKIT_API_SECRET}`, neither existed on the box, and `lms-livekit-1` sat in a restart loop logging *"Could not parse keys"* from the deploy until 2026-08-17. Nothing depended on it so the platform was unaffected, but a container restarting forever on a two-core host is not free. A compose file that reads an environment variable needs that variable created in the same change

**Checkpoint**: The ceiling is a measured number, not a guess. Phase 2 may begin.

---

## Phase 2: Foundational (blocks every user story)

**Purpose**: Schema, module skeleton, and the one place permissions are decided.

**⚠️ No user story work begins until this phase is complete.**

- [x] T012 Create the `backend/app/live_media/` module with `__init__.py`, `schemas.py`, `router.py`, `service.py` and `grants.py`, following the layout its sibling modules already use
- [x] T013 One additive migration, hand-written after `--autogenerate` produced a migration that did not create the table and proposed dropping `uq_live_lessons_active_group` — the index keeping one active lesson per group. Original note: — **moved to slice 3, because slice 1 needs no schema change at all.** Grants are not stored, removal lives in Redis, and capacity is read from the media server, so there is nothing here to persist. The `recordings` and `organizations` columns belong to slice 4 for the same reason; writing them now would be dead schema for weeks
- [x] T014 Imported `app.live_media.models` in `main.py`, `tests/conftest.py` and `alembic/env.py`. Original note: — **moved to slice 3 with T013.** The breakout model was written and then removed on purpose: a model in `Base.metadata` with no migration is created by `create_all` in development and never reaches production, which is the divergence `backend/CLAUDE.md` warns about
- [x] T015 [P] Write `backend/app/live_media/grants.py`: the permission set per role in one function, teacher carrying `roomAdmin` and pupil not, per the table in contracts/api.md. Nothing else in the module may build a grant
- [x] T016 Write the LiveKit server wrapper in `backend/app/live_media/service.py`: room listing and deletion, and a live participant count cached in Redis for two seconds. Read the count from the media server instead of keeping a counter, per research.md Finding F
- [x] T017 [P] Add the media Redis key helpers to `backend/app/live_media/service.py`, named in one place the way `live_lessons/realtime.py` names its own
- [x] T018 Mount the router at `/api/v1/live-lessons` in `backend/app/main.py`, beside the lesson it belongs to

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

- [x] T019 [P] [US1] Positive control in `backend/tests/test_live_media.py`: the lesson's own teacher receives a grant, and its payload carries `roomAdmin`
- [x] T020 [P] [US1] Isolation test in `backend/tests/test_live_media.py`: a teacher of another organisation requesting a grant for this lesson gets **404, not 403** (Constitution I, SC-009)
- [x] T021 [P] [US1] Isolation test in `backend/tests/test_live_media.py`: a pupil who is not in the lesson's group gets **403, not 404** — corrected from the contract during implementation. The lesson's existence is no secret from somebody at the same school; they simply are not in it. Cross-organisation is the case that must read as absent, and T020 covers it
- [x] T022 [P] [US1] Test in `backend/tests/test_live_media.py`: a pupil's grant carries no `roomAdmin` and no screen-share source
- [x] T023 [P] [US1] Test in `backend/tests/test_live_media.py`: with the ceiling set to one, the second participant gets **503 with a reason**, and the first participant's room is untouched (FR-008). A second test asserts the shipped default of 0 refuses everybody
- [x] T024 [P] [US1] Test in `backend/tests/test_live_media.py`: a grant expires within `media_grant_ttl_seconds`, so a token cannot outlive a removal

### Implementation for User Story 1

- [x] T025 [US1] Write the grant request and response schemas in `backend/app/live_media/schemas.py` per contracts/api.md
- [x] T026 [US1] Implement `POST /media/token` in `backend/app/live_media/router.py`: resolve the lesson through the existing `live_lessons` lookup, check the removed set, check the ceiling, then sign through `grants.py`

> **Unblocked 2026-08-17.** node v22.23.2 installed through `fnm` (winget:
> `Schniz.fnm`), which leaves the machine's global node 24 alone rather than
> taking over `C:\Program Files\nodejs`. The SDK then installed under npm
> 10.9.8, and `package-lock.json` kept `lockfileVersion: 3`, so nothing about
> the guard from PR #259 and #313 had to be argued with.
>
> One Windows wrinkle worth writing down: `fnm exec --using=22 -- npm` fails
> with "program not found", because npm is a `.cmd` shim that fnm's spawn does
> not resolve. Call `npm.cmd` from the version's own directory instead.

- [x] T027 ~~Write `frontend/src/lib/live/media-client.ts`~~ — **folded into T029.** `@livekit/components-react` supplies the connection component, so a hand-written client would have been a wrapper with a single caller, which principle V forbids. `adaptiveStream` and `dynacast` are passed as options where the room is mounted
- [x] T028 [P] [US1] Add the typed API function to `frontend/src/lib/api/live.ts`
- [x] T029 [US1] Write `frontend/src/components/live/media-stage.tsx`: the grid, the deliberate join step, and the capacity message in one component
- [x] T030 ~~Write `media-controls.tsx`~~ — **folded into T029** for the same reason: the SDK's control bar already covers microphone, camera, screen share and leave, and wrapping it would add a file without adding behaviour
- [x] T031 [US1] Mount the stage in `frontend/src/app/(dashboard)/lesson/[lessonId]/page.tsx`, under the scene
- [x] T032 [US1] Mount the same in `frontend/src/app/(admin)/admin/live/[lessonId]/page.tsx`, directly above the roster so a tile and a name line up by eye
- [x] T033 [US1] Show the capacity refusal as a plain message when the grant returns 503, leaving board, tasks and roster working
- [x] T034 [P] [US1] Add every new string to all six files in `frontend/src/lib/i18n/locales/`, or the parity test fails (FR-026)
- [x] T035 [P] [US1] Vitest for the call's own decisions — revived 2026-08-19, the day the stated condition ("revisit if media-stage grows logic of its own") came true: `sameCall` and `keepUi` extracted from CallProvider and tested, the T104 empty-panel regression demonstrated failing (2 of 7 go red when the old behaviour is restored), plus two component tests through a mocked room — **deferred to slice 2.** Reconnection belongs to the SDK, and the only branch worth asserting here is the 503 refusal, which the browser journey at T084 covers end to end. Revisit if `media-stage.tsx` grows logic of its own
- [x] T036 [US1] Close the media room when the lesson ends, in `backend/app/live_lessons/router.py`, and delete every breakout group belonging to it so no room outlives its lesson (FR-018; the test for the breakout half is T057)

**Checkpoint**: SC-001, SC-004, SC-006 and SC-009 hold. This is the MVP and is deployable.

---

## Phase 4: User Story 2 — Run the room, not just attend it (P2)

**Goal**: A teacher can quiet, remove and focus participants, and the raised hand
that already exists gives someone the floor.

**Independent Test**: Mute a pupil, spotlight another, remove one and confirm they
cannot return.

### Tests for User Story 2

- [x] T037 [P] [US2] Positive control in `backend/tests/test_live_media.py`: a teacher mutes a pupil and the call succeeds
- [x] T038 [P] [US2] Test: a pupil calling any moderation endpoint against another pupil gets 403
- [x] T039 [P] [US2] Test: a teacher passing a `user_id` from another school's lesson gets 404, because the target is resolved through membership and never trusted from the request
- [x] T040 [P] [US2] Test: a removed pupil requesting a fresh grant gets 403 every time, which is what makes removal a removal instead of a hidden button (SC-006)

### Implementation for User Story 2

- [x] T041 [US2] Implement mute, remove and floor in `backend/app/live_media/router.py` and `service.py` per contracts/api.md, resolving every target through the lesson's membership first
- [x] T042 [US2] Publish `media_floor_changed` and `media_participant_removed` on the existing bus in `backend/app/live_lessons/realtime.py`. No new channel, and muting publishes nothing — the media server tells its own clients
- [x] T043 [US2] Write `frontend/src/components/live/moderation-menu.tsx`, reachable from the drawer the roster already opens
- [x] T044 [US2] Give the floor from the existing raised-hand signal — the menu reads `member.signal` straight off the roster, and no second hand-raise was introduced (FR-013)
- [x] T045 [US2] Tell a muted pupil they were muted, and let them unmute themselves (FR-012)
- [x] T046 [P] [US2] Strings into all six locale files

**Checkpoint**: User story 2 passes independently.

---

## Phase 5: User Story 3 — Show what is on my screen (P2)

**Goal**: The teacher shares a screen, and may let a pupil share.

**Independent Test**: The teacher shares and pupils see it; the teacher permits a
pupil, who shares; the teacher stops it.

### Tests for User Story 3

- [x] T047 [P] [US3] Positive control: a teacher's grant carries the screen-share source
- [x] T048 [P] [US3] Test: a pupil's grant omits it until permitted, and carries it after
- [x] T049 [P] [US3] Test: withdrawing permission both removes the source and stops a share in progress (FR-014)

### Implementation for User Story 3

- [x] T050 [US3] Implement the screen-share permission endpoint in `backend/app/live_media/router.py`, holding the grant set in Redis
- [x] T051 [US3] Publish `media_share_grant_changed` from `backend/app/live_lessons/realtime.py`
- [x] T052 [US3] Screen capture comes from the SDK's control bar, gated on `can_publish_screen` from the grant — no hand-written capture code was needed
- [x] T053 [US3] The shared screen already lays out beside the camera tiles: `media-stage.tsx` subscribes to both sources in one grid
- [x] T054 [P] [US3] Strings into all six locale files

**Checkpoint**: User story 3 passes independently.

---

## Phase 6: User Story 4 — Split the class and bring it back (P3)

**Goal**: Groups that hear only themselves, a teacher who can visit and message
them, and one action that gathers everyone back.

**Independent Test**: Split four pupils into two pairs, confirm each pair hears
only itself, visit one, then gather.

### Tests for User Story 4

- [x] T055 [P] [US4] Positive control: a teacher splits a lesson and the group rows exist with the right members
- [x] T056 [P] [US4] Test: a pupil requesting a grant for a group they do not belong to gets 404
- [x] T057 [P] [US4] Test: ending the lesson deletes every group and closes every group room (FR-018)
- [x] T058 [P] [US4] Test: a pupil's authority in a group room equals their authority in the main room (FR-017)

### Implementation for User Story 4

- [x] T059 [US4] Add the `LiveBreakoutGroup` model to `backend/app/live_media/models.py` per data-model.md
- [x] T060 [US4] Implement create, list, broadcast and gather in `backend/app/live_media/router.py`, counting group participants against the same ceiling
- [x] T061 [US4] Implement the breakout grant endpoint, deriving the room name from the lesson id and the group index
- [x] T062 [US4] Publish `media_breakouts_changed` and `media_breakout_message` from `backend/app/live_lessons/realtime.py`
- [x] T063 [US4] Write `frontend/src/components/live/breakout-panel.tsx` for the teacher
- [x] T064 [US4] Move a pupil's client between rooms on the event, fetching a fresh grant instead of reusing the old one
- [x] T065 [P] [US4] Strings into all six locale files

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

- [x] T066 [P] [US5] Positive control: with `recording_enabled` true, a teacher starts a recording and the row appears
- [x] T067 [P] [US5] Test: with `recording_enabled` false, starting one gets 403 and no control is offered (FR-019)
- [x] T068 [P] [US5] Test: a pupil starting or stopping a recording gets 403
- [x] T069 [P] [US5] Test: uploading to somebody else's recording gets 404, and uploading to one already `ready` is refused
- [x] T070 [P] [US5] Test: `storage_url` is written by the server, and a value sent by the client is ignored because the field has left the request schema
- [x] T071 [P] [US5] Test: a recording left `uploading` past the grace window is swept to `failed` (FR-022)
- [x] T072 [P] [US5] Test: another school reading the recording gets 404 and learns nothing about whether it exists
- [x] T090 [P] [US5] Test: a participant who joins after a recording started still receives the indicator state, because it is read from Redis on join rather than only broadcast at start (SC-007)

### Implementation for User Story 5

- [x] T073 [US5] Expose `recording_enabled` and `recording_retention_days` on the organisation, in `backend/app/orgs/router.py` and the settings page under `frontend/src/app/(admin)/admin/`, so a school administrator can turn recording on (FR-019)
- [x] T074 [US5] Build `PUT /api/v1/recordings/{id}/upload` in `backend/app/recording/router.py` on the existing `get_storage()` abstraction — the endpoint `/init` has been promising since it was written
- [x] T075 [US5] Remove `storage_url` from the complete request schema, derive it on the server, and write `expires_at` from the organisation's retention
- [x] T076 [US5] Add `PATCH /api/v1/recordings/{id}` for `shared_with_group`, the teacher's deliberate act (FR-021)
- [x] T077 [US5] Implement start and stop in `backend/app/live_media/router.py`, holding the in-progress id in Redis so a late joiner still sees the indicator
- [x] T078 [US5] Add the sweep for stale `uploading` rows and the retention cleanup to `backend/app/scheduler.py`
- [x] T079 [US5] Write `frontend/src/lib/live/recorder.ts` with MediaRecorder over **the teacher's own local tracks only** — microphone, camera and screen share. It must never subscribe to a remote track (FR-027). Show the control only where the browser can actually capture
- [x] T080 [US5] Write `frontend/src/components/live/recording-indicator.tsx`, visible to every participant for the whole time recording runs (FR-020)
- [x] T081 [P] [US5] Strings into all six locale files

**Checkpoint**: User story 5 passes independently. Every story is done.

---

## Phase 8: Polish and cross-cutting

- [x] T082 [P] Add the new endpoints and events to `docs/API_REFERENCE.md` and the media container to `docs/ARCHITECTURE.md`, and **remove the Jitsi paragraphs from both** instead of leaving them to rot (Constitution IV)
- [x] T083 [P] **Leave `frontend/src/lib/meetings.ts` alone.** An earlier draft of this task said to delete it once lessons no longer needed it; lessons never needed it. `buildJoinUrl` is imported by four working pages — `(dashboard)/schedule/page.tsx`, `(dashboard)/meetings/page.tsx`, `(admin)/admin/meetings/page.tsx` and `(admin)/admin/journal/page.tsx` — and deleting it breaks the schedule, both meetings pages and the journal. This feature replaces Jitsi **inside the live lesson only**; scheduled slots, standalone meetings and the journal keep their Jitsi links until somebody specifies replacing those too
- [x] T088 Verify SC-008 rather than assuming it: with a lesson running on the QA stack, run the deploy sequence `docker compose pull` and `up -d` against it and confirm the media container is not recreated, then deliberately change its service definition, restart, and confirm participants return by themselves within 30 seconds (FR-025, research.md Finding I) — **done 2026-08-18**: `up -d` twice left the container untouched (same id, same `StartedAt`), and the positive control (changed service definition → new container id) shows the check can fail. The rejoin half is folded into T087, which needs a real browser anyway
- [x] T089 [P] Add a Vitest to `frontend/src/lib/live/recorder.test.ts` asserting the recorder builds its stream only from local tracks and never touches a remote participant's track. FR-027 is otherwise checked only by a human watching a file play back, and this is the check that catches somebody "improving" it into a room composite
- [x] T084 Write the live-media browser journey (landed as `frontend/e2e/journeys/live-media.spec.ts`): one teacher and two pupils — start, join, share, mute one, remove the other, end
- [x] T085 **Done 2026-08-18.** DNS record added, certificate issued for `turn.grasslms.online` alone (SAN holds that name and nothing else). Procedure and controls in [`turn-tls-runbook.md`](turn-tls-runbook.md). Add the nginx `stream` block with `ssl_preread` on 443 in `nginx/nginx.conf`, routing `turn.grasslms.online` to the embedded TURN and everything else to the HTTPS server moved to `127.0.0.1:8443`. Issue a **separate standalone certificate** for that hostname and **never add it to the `grasslms.online` bundle** — bundling a subdomain is what expired the production certificate on 2026-07-29. Rehearse on the QA stack, run `nginx -t`, and have the rollback ready before applying (research.md Finding E, SC-005)
- [ ] T086 Run `quickstart.md` end to end against a real lesson, including the check that a recording holds no pupil — **blocked on people, not on code.** Needs two accounts with real cameras in the same lesson; the passwords live in the owner's password manager and the browser pane cannot capture devices. What can be asserted without them has been: the recorder reads only local publications (`recorder.test.ts`, demonstrated failing against a version that reaches for the room)
- [x] T087 Verify in production after the deploy: poll both the CI run and the deploy run to completion, hold a real lesson with two accounts, and watch `docker stats` and `free -h` on the host while it runs. State in the pull request body which guard tests were demonstrated failing before their fix, which Constitution principle II requires and a green suite does not show — **done 2026-08-18** against `ffa8921`, each check paired with a control:

  | Check | Before | After | Control |
  |---|---|---|---|
  | `Permissions-Policy` | `camera=()` | `camera=(self)` | `geolocation` still `false` |
  | `featurePolicy.allowsFeature('camera')` | `false` | `true` | same for microphone |
  | Migration | `lk1br3ak0ut5`, 0 of 3 columns | `r3c0rd1ng5x`, all 3 | — |
  | 51 MB to `/api/v1/recordings/.../upload` | — | `401` (reached the app) | same payload to `/api/v1/submissions` → `413` |
  | New routes | — | five answer `401` | `/media/nope-control` → `404` |
  | Media container across the deploy | — | `lms-livekit-1` up 13 h, untouched | backend/frontend recreated, up 2 min |

  Host after the deploy: 8 containers, ~425 MiB, 2.3 GiB available, disk 11 GiB free. The media container idles at 48.7 MiB of its 700 MB cap.

  Not verified, and needing a second person rather than more effort: a lesson held with two real cameras. The capture path is proven only as far as the browser being *allowed* to capture

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

---

## Phase 8: Defects found holding a real lesson (T086)

Written down after the fact on 2026-08-18, because they were shipped as direct
pull requests without passing through the specification first — the mistake is
recorded in [`tasks/lessons.md`](../../tasks/lessons.md). Every one of them is
small, and every one of them broke the feature completely.

- [x] T092 The room dialled `/rtc/rtc`. `resolveServerUrl` named a path the SDK
  appends itself, so every browser asked for a route the media server does not
  serve and got `404`. The room had **never** connected in production. Fixed in
  #333 with a unit test on the exact string, demonstrated failing first
- [x] T093 The relay advertised port 5349, which is closed from outside.
  `turn.tls_port` is not only where the server listens — it is the number handed
  to the browser (FR-010). Fixed in #331
- [x] T094 The media server was pinned five minor versions behind its client:
  v1.8.4 against `livekit-client` protocol 17. Signalling connected, the peer
  connection never negotiated, and the server logged `unsupported datachannel
  added` then `removing participant without connection`. Fixed in #334, and
  written into the spec as FR-028 so the pairing is a stated constraint rather
  than a coincidence
- [x] T095 The controls showed neither state nor affordance, and on the pupil's
  dark page the stock bar was near-invisible — a participant pressed mute and
  there was nothing there to press. Replaced with labelled, state-coloured
  controls keeping the device menus (FR-029, FR-006). Fixed in #334
- [x] T097 A teacher who navigates away cannot get back into their own lesson
  (FR-030). Two faults compound: the rejoin banner is mounted only in the
  dashboard layout, so staff — who live under `(admin)` — never see it; and its
  button targets `/lesson/{id}`, the pupil route, which bounces staff to
  `/admin`. Mount it for staff too and send each role to the page it can open
- [x] T098 The screen-share control paints "not sharing" as an alarm. My own
  regression from T095: I applied "off means clay" to every control, but a
  screen nobody is sharing is the resting state, not a fault. Only the
  microphone and the camera warn when off (FR-029)
- [x] T099 The teacher's controls overlap the video tile and wrap unevenly — the
  labels are wider than the stock icons the panel was sized for (FR-029)
- [x] T100 A pupil watching a shared screen sees it in a 224px strip while the
  idle "waiting for the teacher" placeholder holds the whole page. A shared
  screen has to become the main stage (FR-031)
- [x] T101 The pupil's pre-join state does not say it is a preview, or that
  choosing a camera and a microphone and then joining is what connects them
  (FR-032)
- [x] T102 Clicking any link inside the lesson drops the teacher out of the
  call: the room is mounted inside the page component, so a route change
  unmounts it and disconnects (FR-033). Hoist it above the router so it
  survives navigation, and show it as a small floating tile once the person is
  no longer on the lesson page — which also gives them the way back T097 asks
  for
- [x] T103 (approved by the owner 2026-08-18: "сцены экран и лица как доска";
  design — two new scene types `screen` and `faces` beside board/material/task;
  pressing Share screen sets the scene to `screen` so one click both publishes
  and shows, stopping falls back to blank; a FACES rail button shows the grid;
  the pupil page gives the stage to the media area whenever the scene is one of
  the two, which retires the T100 idle-takeover special case) Make the shared
  screen and the faces scenes the teacher can choose,
  alongside board, material, task and solution (FR-034). Today they live in a
  strip under whatever the scene is, which is why a shared screen is unreadable
  when the scene is idle. T100 buys space back from the idle placeholder only —
  the real answer is that "what the class is looking at" is one decision with
  one owner, and video is one of its options
- [x] T104 The floating call panel was an empty rectangle. A defect in T102's
  own implementation: releasing the slot cleared both *where* to draw the call
  and *what* to draw, so a teacher switching to the Task tab kept the
  connection and lost the picture. Giving back a place is not the same as
  saying stop
- [x] T105 The teacher's controls are tidy individually and a mess together:
  Record sits alone on one line, the two device chevrons break the rhythm
  between the microphone and camera buttons, and `Leave` is pushed to the far
  right leaving a hole in the middle. Owner's words, 2026-08-18: "адский
  разброс". Deferred deliberately — the controls work and read correctly
  (T095, T098), this is the pass that makes them look like one thing
- [x] T106 A finished recording has no duration. `uploadRecording` sends only
  `size_bytes` to `/complete`, so `duration_seconds` stays null on a row that
  is otherwise `ready` — the column exists, the interface will want it, and
  nothing fills it. The browser knows the length; it simply never says
- [x] T107 The teacher's media panel is about 150 pixels tall, and the tile
  grid paginates: with a teacher and two pupils in the room, only one pupil is
  in the page at all. Found by T084, which asserted the teacher could see both
  and could not. A teacher who cannot see the class is the opposite of what
  this feature is for, and it gets worse with every pupil (FR-031, FR-034)
- [x] T109 No media_* event was ever delivered to any browser. The SSE hook
  attaches listeners from a hand-kept EVENT_NAMES list, and every media event
  was added to the dispatch map but never to the list — so the floor, breakout
  moves, removal notices and the mute all published into a wire nobody had
  plugged in. Found by T084 asserting a pupil is told they are muted; fixed by
  deriving the listener list from the dispatch map so the list cannot forget
  what the map knows
- [x] T110 A pupil already in the room never learned a recording had started.
  The indicator asked the server once on mount, which covers a late joiner and
  nobody else; the media_recording_started/stopped events published since
  slice 4 had no handler in the channel map — same class as T109, found the
  same way: the journey put a pupil in the room, started recording, and
  asserted the pupil was told (FR-020)
- [x] T108 A muted pupil was never told. FR-012 says in as many words that a
  participant muted by a teacher must be told so, and nothing said it: the
  endpoint silenced the track and published no event, the channel had no
  handler, and the pupil heard their own silence and guessed. Found by T084 on
  its first real run — no unit test could, because every piece worked
- [x] T111 Rebuild the pupil page as stage + rail (FR-035): the stage carries
  the scene or the media scenes, the right rail carries cameras (roll),
  controls and chat; on phones the rail folds under the stage and chat becomes
  a sheet; no page scroll at any viewport (owner, 2026-08-19: "все элементы и
  кнопки должны помещаться в экран без скролла")
- [x] T112 A visible chat thread for the pupil (FR-036), built from what
  already flows: teacher broadcasts arrive on the channel today and die as
  toasts; pupil questions POST to an endpoint that already exists. One panel,
  no backend change
- [x] T113 Scope the live lesson's material picker to the group (FR-037):
  a lesson-scoped course list on the backend — every-member enrollment, plus
  the group's own course — with the one-pupil-missing case as the control;
  the picker asks it instead of the whole catalogue (owner, 2026-08-19)
- [x] T115 Record what is shown, not who is showing it (FR-039): the recorder
  prefers the shared screen, then a capture of the teacher's own lesson tab,
  and only then the camera — found by the owner playing back a real lesson and
  seeing nothing but their face while the board did the teaching
- [x] T116 Admin-only deletion of recordings (FR-040): endpoint that removes
  bytes and row together, refused to teachers — with the teacher refusal as
  the control — and a delete control on the recordings surfaces for admins
- [x] T118 The density pass broke the design guide's touch rule: controls
  shrank to ~26px while §8 requires 44×44 on touch, and two new inputs lost
  the system focus ring (§14). Found by auditing against
  docs/LMS_UX_DESIGN_GUIDE.md after the owner asked whether it had been used —
  it had not; the lesson is in tasks/lessons.md. Fix: pointer-coarse sizing so
  fingers get 44px while mice keep the density; focus rings restored
- [x] T117 Compact the teacher's console (FR-041): measure what overflows at a
  laptop viewport, tighten the group tab — media panel, split row, roster,
  class message — so everything is on screen and only the roster scrolls
  (owner, 2026-08-19: "удобно и компактно")
- [x] T114 A recordings page for staff (FR-038): list from the endpoint that
  already exists, watch in place, toggle sharing with the group. Found by the
  owner asking "как посмотреть запись?" — the honest answer was "only from a
  toast that died fifteen seconds after you stopped"
- [~] T096 (browser-provable part done 2026-08-18 — the journey records, tells everybody, uploads and hands back a real WebM with a duration; the source-attribution half stays with T086, because Chrome's fake cameras paint one identical pattern for every participant and no pixel can say whose it was) Finish T086 itself: a lesson held by two people, camera on for the
  pupil, and the recording played back to confirm it holds the teacher and the
  shared screen and nobody else (FR-027)

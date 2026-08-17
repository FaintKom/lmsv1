# Quickstart: Video and audio inside the live lesson

**Feature**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md) · **Contract**: [contracts/api.md](contracts/api.md)

How to run the media server locally, and how to prove each slice actually
works. Everything below runs against a local LiveKit, so no part of building
this feature needs the production host or costs anything.

---

## Local setup

The media server joins the Compose stack alongside PostgreSQL, Redis and the
sandbox. Development keys are the ones LiveKit ships for development; they are
worthless and belong in the repository, unlike production keys, which come from
the environment.

```bash
docker compose up -d db redis sandbox livekit
```

Backend environment (`backend/.env`):

```
LIVEKIT_URL=ws://127.0.0.1:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=devsecret
MAX_CONCURRENT_MEDIA_PARTICIPANTS=20
```

`MAX_CONCURRENT_MEDIA_PARTICIPANTS` defaults to 0, which switches media off. In
development set it by hand; in production only slice 0's measurement writes it.

```bash
cd backend && alembic upgrade head && uvicorn app.main:app --reload
```

```bash
cd frontend && npm run dev
```

Confirm the media server is answering before blaming anything else:

```bash
curl -s http://127.0.0.1:7880 | head -1
```

---

## Slice 0 — the measurement

This slice produces a number, not a release. Run it against the production host
in a quiet window, after the firewall change has been approved and applied.

Baseline first, so there is something to compare against:

```bash
for i in 1 2 3; do curl -s -o /dev/null -w '%{time_total}\n' https://grasslms.online/login; done
```

Then drive bots at it, stepping the subscriber count up run by run:

```bash
livekit-cli load-test --url wss://grasslms.online/rtc --api-key "$LIVEKIT_API_KEY" --api-secret "$LIVEKIT_API_SECRET" --room loadtest --video-publishers 1 --subscribers 12 --duration 5m
```

Watch both sides while it runs:

```bash
ssh root@204.168.165.41 "docker stats --no-stream lms-livekit-1; uptime"
```

**Passing means both of these hold**, and the run stops at whichever fails
first:

- the media container stays under its `cpus` cap instead of pinned at it
- page loads elsewhere stay within 20% of the idle baseline (SC-002)

Record the last passing participant count. That number goes into
`MAX_CONCURRENT_MEDIA_PARTICIPANTS` in production, and into research.md as a
measured finding. If it lands below a class size, stop and bring the second host
back to the owner with the measurement attached.

---

## Slice 1 — the room

Two browsers, one lesson.

1. Sign in as a teacher and start a live lesson for a group.
2. In a second browser, sign in as a pupil of that group and open the lesson.
3. Both see and hear each other inside the lesson page, beside the roster
   (SC-001).

Prove the guards, not the happy path:

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST -b "$OTHER_SCHOOL_COOKIE" \
  http://localhost:8000/api/v1/live-lessons/$LESSON_ID/media/token
```

Expect `404`: another school's lesson is invisible, not forbidden (SC-009).

For the ceiling, set `MAX_CONCURRENT_MEDIA_PARTICIPANTS=1` and join twice.
Expect `503` with a reason on the second, and the lesson page still showing its
board and roster (FR-008).

```bash
cd backend && pytest tests/test_live_media.py -v
```

Each isolation test opens with a positive control, because "another school gets
404" passes before the endpoint exists (Constitution II).

---

## Slice 2 — screen sharing and moderation

With a teacher and two pupils in a room:

1. The teacher shares a screen and both pupils see it.
2. A pupil tries to share and is refused.
3. The teacher permits that pupil, who shares; the teacher then stops it.
4. The teacher mutes a pupil, who stops being heard and is told why. The pupil
   unmutes, and the teacher mutes them again.
5. A pupil raises a hand through the existing signal, the teacher gives them the
   floor, and everyone's view focuses on them.
6. The teacher removes a pupil, who leaves and cannot get back in (SC-006).

The last one is the interesting test, because a removal that only hides buttons
is not a removal. As the removed pupil:

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST -b "$PUPIL_COOKIE" \
  http://localhost:8000/api/v1/live-lessons/$LESSON_ID/media/token
```

Expect `403`, every time.

---

## Slice 3 — breakout groups

With four pupils in a room: split into pairs, confirm each pair hears only
itself, visit one group as the teacher, send a message to all groups, then
gather everyone back. Then end the lesson while groups are running, and confirm
every group room closes with it (FR-018).

---

## Slice 4 — recording

Recording is off until a school turns it on, so start there.

1. With `recording_enabled = false`, confirm no recording control appears.
2. Turn it on for the organisation, start a recording, and confirm every
   participant sees the indicator, including somebody who joins after it
   started (SC-007).
3. Stop it. The file uploads and the recording shows as ready against that
   lesson.
4. Play it back after a lesson where pupils had cameras on, and confirm the file
   holds the teacher and the shared screen and nobody else (FR-027). This is the
   check that fails loudly if somebody later "improves" the recorder into a room
   composite.
5. Close the teacher's tab mid-recording, and confirm the row ends up `failed`
   instead of stuck at `uploading` (FR-022).

The upload endpoint does not exist today, so the first thing to check is that it
does now:

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X PUT -b "$TEACHER_COOKIE" --data-binary @sample.webm http://localhost:8000/api/v1/recordings/$RECORDING_ID/upload
```

Expect `200`, with `storage_url` written by the server and not by the caller.

---

## End-to-end

```bash
cd frontend && npm run test:e2e -- live-media.spec.ts
```

The journey is one teacher and two pupils: start the lesson, everyone joins, the
teacher shares a screen, mutes one pupil and removes the other, then ends the
lesson and everyone leaves.

## Full gate before merge

```bash
cd backend && ruff check . && ruff format --check . && pytest
```

```bash
cd frontend && npm run lint && npx tsc --noEmit && npm test && npm run build
```

The six-locale parity test fails if a new string is missing from any of `en`,
`es`, `ru`, `tr`, `de` or `uk`, so add keys to all six as they are written
(FR-026).

## Verifying in production after the deploy

A green build is not a green deploy, and a green deploy is not a working
feature. After the merge, poll both the CI run and the deploy run to completion,
then hold a real lesson with two accounts and confirm the media connects. Watch
the host while it runs:

```bash
ssh root@204.168.165.41 "docker stats --no-stream; free -h; uptime"
```

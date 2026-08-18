# API Contract: Video and audio inside the live lesson

**Feature**: [spec.md](../spec.md) · **Plan**: [plan.md](../plan.md) · **Data model**: [data-model.md](../data-model.md)

Endpoints mount under `/api/v1/live-lessons/{lesson_id}/media` from the new
`live_media` module, and the recording endpoints extend the router that already
exists. Authentication is the httpOnly session cookie every other endpoint uses.

## Rules that apply to every endpoint here

**Scoping.** `lesson_id` is resolved through the same lookup `live_lessons`
already performs. A lesson belonging to another organisation returns `404`, not
`403`, so its existence stays hidden (Constitution I). No route accepts a room
name; room names are derived from the lesson id.

**Roles.** *Teacher* means the lesson's `teacher_id`, or a `teacher`, `admin` or
`super_admin` of the same organisation. *Pupil* means a member of the lesson's
group. Anyone else gets `404`.

**Rate limits.** The grant endpoint is limited, because it signs a token and
queries the media server. Moderation calls are limited. Nothing here sits on a
polling path, so nothing needs an exemption.

---

## Grants

### `POST /api/v1/live-lessons/{lesson_id}/media/token`

Signs a short-lived grant and returns where to use it. This is the only place
permissions are decided.

Request: no body.

Response `200`:

```json
{
  "url": "wss://grasslms.online/rtc",
  "token": "<jwt>",
  "identity": "<user uuid>",
  "room": "lesson-<uuid>",
  "can_publish_screen": false,
  "can_record": false,
  "expires_in": 120
}
```

Permissions carried inside the token, by role:

| Grant | Teacher | Pupil |
|---|---|---|
| `roomJoin` | yes | yes |
| `roomAdmin` | yes | no |
| `canPublish` (camera, microphone) | yes | yes |
| `canPublishSources: screen_share` | yes | only while permitted |
| `canSubscribe` | yes | yes |
| `canPublishData` | yes | yes |

Failures:

| Status | When |
|---|---|
| `404` | Lesson is not this caller's, or does not exist |
| `409` | Lesson is not active |
| `403` | Caller was removed from this lesson by a teacher |
| `503` | The host is at its participant ceiling. The body carries a reason the page can show, and the lesson continues without video (FR-008) |

`503` is deliberate and not a state to retry blindly: the client says video is
unavailable for this lesson and leaves the board, tasks and roster working.

### `POST /api/v1/live-lessons/{lesson_id}/media/token/breakout/{index}`

The same contract for a group room. The caller must be a member of that group,
or a teacher. Returns `404` when the group does not belong to this lesson.

---

## Moderation

Teacher only. Each takes a `user_id` in the body, resolves it through the
lesson's membership before touching the media server, and returns `404` when
that resolution fails, so an identifier from a request is never used on trust.

| Method | Path | Effect |
|---|---|---|
| `POST` | `/media/participants/{user_id}/mute` | Mutes that participant's microphone. They may unmute themselves; the teacher may repeat it (FR-012) |
| `POST` | `/media/participants/{user_id}/remove` | Removes them from the room and adds them to the removed set, so a fresh grant is refused (FR-003) |
| `POST` | `/media/floor` | Body `{ "user_id": "<uuid>" }`, or `null` to clear. Sets who is focused for everyone (FR-013) |
| `POST` | `/media/participants/{user_id}/screen-share` | Body `{ "allowed": true }`. Permits or withdraws screen sharing; withdrawing also stops a share in progress (FR-014) |

All return `200` with the new state. A pupil calling any of them gets `403`.

---

## Breakout groups

Teacher only, except where noted.

| Method | Path | Body | Effect |
|---|---|---|---|
| `POST` | `/media/breakouts` | `{ "group_size": 3 }` or `{ "groups": [[uuid, …], …] }` | Creates the groups and broadcasts the move |
| `GET` | `/media/breakouts` | — | Current groups. Readable by any participant, who sees which group is theirs |
| `POST` | `/media/breakouts/broadcast` | `{ "text": "…" }` | One message to every group (FR-016) |
| `DELETE` | `/media/breakouts` | — | Gathers everyone back and deletes the groups |

Ending the lesson deletes them too, through the existing end-of-lesson path
(FR-018).

---

## Recording

Recording reuses `/api/v1/recordings`, which needs finishing before it can carry
this (Finding J).

### `POST /api/v1/live-lessons/{lesson_id}/media/recording`

Starts a recording for this lesson. Teacher only, and refused with `403` when
the organisation has `recording_enabled = false` (FR-019). Creates the
`recordings` row, notes it in Redis so anyone joining later still sees the
indicator, and broadcasts `media_recording_started`.

What the capture contains is fixed by FR-027 and is not a parameter: the
teacher's microphone, the teacher's camera and the teacher's screen share. The
client builds that stream from its own local tracks and never subscribes to a
pupil's track for recording, so no request can widen it.

Response `201`:

```json
{ "recording_id": "<uuid>", "upload_url": "/api/v1/recordings/<uuid>/upload" }
```

### `PUT /api/v1/recordings/{recording_id}/upload`

**New, and the endpoint the API already promised but never had.** Accepts the
captured file, writes it through `get_storage()`, and sets `storage_url` from
where the bytes actually landed. Only the recording's own creator may upload to
it, and only while its status is `uploading`.

### `POST /api/v1/recordings/{recording_id}/complete`

Exists. Two changes: `storage_url` leaves the request schema because the server
knows it, and `expires_at` is written from the organisation's retention setting.

### `PATCH /api/v1/recordings/{recording_id}`

Body `{ "shared_with_group": true }`. Teacher only, and the deliberate act that
lets the lesson's pupils see a recording (FR-021).

---

## Events on the existing SSE stream

No new channel. These ride `GET /api/v1/live-lessons/{id}/events`, in the
envelope `realtime.py` already uses, with the same audience filtering.

| Event | Audience | Data |
|---|---|---|
| `media_floor_changed` | all | `{ user_id \| null }` |
| `media_participant_removed` | all | `{ user_id }` |
| `media_share_grant_changed` | all | `{ user_id, allowed }` |
| `media_breakouts_changed` | all | `{ groups: [{ index, member_ids }] }` |
| `media_breakout_message` | all | `{ text }` |
| `media_recording_started` | all | `{ recording_id }` |
| `media_recording_stopped` | all | `{ recording_id, status }` |
| `media_unavailable` | teacher | `{ reason }`, when the ceiling refuses a room |

Muting emits nothing here: the media server tells its own clients, and a second
announcement over SSE would be a race with no winner.

---

## What is removed

Less than a first reading suggests. `/api/v1/meetings` keeps working, and so
does `frontend/src/lib/meetings.ts`: its `buildJoinUrl` is imported by the
schedule page, both meetings pages and the journal, none of which is a live
lesson. Deleting it would break four working pages to tidy up a fifth.

What actually goes is the Jitsi paragraph in `docs/API_REFERENCE.md` and
`docs/ARCHITECTURE.md` where it describes how a **lesson** gets its video
(Constitution IV), and the lesson page's own reliance on an external room.
Replacing the external service in the schedule, the journal and standalone
meetings is a separate feature nobody has specified yet.

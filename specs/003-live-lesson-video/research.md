# Research: Video and audio inside the live lesson

**Date**: 2026-08-17
**Feature**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md)

Findings are lettered so tasks and code comments can cite them.

---

## Finding A — The host, measured rather than remembered

Read from the production host on 2026-08-17:

```
Mem:  3.7Gi total, 1.3Gi used, 2.4Gi available
Swap: 2.0Gi total, 225Mi used
nproc: 2
load average: 0.11, 0.05, 0.05
/dev/sda1: 38G size, 24G used, 12G avail, 67%
docker ps: 7 containers
```

The box idles. Two cores is the wall, not memory, and the 12 GB of free disk is
the wall for recordings.

## Finding B — Choice of media server

**Decision: self-hosted LiveKit, Apache 2.0, pinned by version tag.**

Rationale. Two cores survive a classroom only if the server can forward a low
layer to the thumbnails and a high layer to the focused speaker, pause layers
nobody is looking at, and drop all but the loudest few microphones. Those three
behaviours — simulcast, dynacast and audio selection — are the whole reason a
fifteen-person room fits, and they arrive finished. LiveKit also signs its
grants with an API key we hold, which is precisely the moderator control free
`meet.jit.si` cannot give.

Alternatives considered.

- *mediasoup* (ISC) is a library, not a server: signalling, room lifecycle and
  permissions are ours to write. It would have cost a slice for nothing this
  feature needs.
- *Pion* (MIT) is a toolkit for building a forwarder. Rejected for the same
  reason, more so.
- *Self-hosted Jitsi* (Apache 2.0) would give JWT moderation and is the closest
  competitor, but the videobridge is a JVM process that wants a gigabyte or two
  before it forwards anything, on a host with 2.4 GB free.
- *Janus* (GPLv3) and *Galène* (AGPL) are copyleft. The product is proprietary,
  so both are out on licence, not on merit.
- *BigBlueButton* (LGPL) is built for exactly this use, and duplicates the
  roster, board, polls and attendance this project already has. Its own
  documentation asks for far more machine than exists here.
- *LiveKit Cloud, Daily, 100ms, Agora, Jitsi JaaS* are services. The owner's
  stated requirement is independence from external technology, and each also
  costs money that would need separate approval.

## Finding C — Container networking: host mode, narrow port range

**Decision: `network_mode: host` for the LiveKit container, with the WebRTC
range narrowed to 50000–50200/udp.**

The documented default range is 50000–60000, ten thousand ports, and each
participant uses two. Publishing that range through Docker's port mapping means
thousands of NAT rules and a userland hop for every packet, on a host that will
be moving something like eight to sixteen thousand packets a second during a
lesson. Host networking removes the hop, which is the cheapest performance
decision in this plan.

Two hundred ports covers a hundred participants, well past anything slice 0 will
measure, and shrinks the firewall change from ten thousand ports to two hundred.

Consequence: the container has no Compose network alias, so the backend reaches
it at `127.0.0.1:7880`. That also sidesteps the shared-network alias trap
recorded in project memory, where a service name becomes an alias on every
network it joins.

## Finding D — Ports and the firewall

LiveKit's own port list:

| Port | Protocol | Required | Purpose |
|---|---|---|---|
| 7880 | TCP | yes | Signalling over WebSocket, expected to sit behind TLS termination |
| 50000–60000 | UDP | yes | WebRTC media, two ports per participant |
| 7881 | TCP | yes | WebRTC fallback when UDP cannot connect |
| 3478 | UDP | optional | Embedded TURN over UDP |
| 5349 | TCP | optional | Embedded TURN over TLS |

The embedded TURN removes any need for a separate `coturn` container, which is
one fewer service on a crowded host.

Production firewall today, read on 2026-08-17: `22/tcp`, `80/tcp`, `443/tcp`,
and `11434` from the Docker bridge only. Nothing else, and no UDP at all.

**Decision.** Signalling stays behind nginx on 443, so 7880 is never exposed.
The firewall change opens `50000:50200/udp`, `3478/udp` and `7881/tcp`. It is a
change to a live server's firewall and waits for the owner's explicit approval.

## Finding E — TURN over TLS on 443, and the cert that must not be touched

The strongest firewall-piercing path is TURN over TLS on port 443, because a
network that blocks everything else still permits it. SC-005 asks for it. Port
443 on this host belongs to nginx.

**Decision: an nginx `stream` block with `ssl_preread` on 443, routing by server
name.** Traffic announcing `turn.grasslms.online` goes to LiveKit's TURN;
everything else goes to the existing HTTPS server, moved to `127.0.0.1:8443`.
The official `nginx:alpine` image ships the stream and `ssl_preread` modules, so
no rebuild is needed.

**The certificate is the dangerous part.** Project memory records an outage on
2026-07-29: `grasslms.online` is one multi-domain certificate covering the apex,
`www`, `aimath` and `topdown`, renewed with `certbot --standalone`, and a single
bundled subdomain whose DNS pointed elsewhere failed its challenge and killed
the renewal of the whole certificate, apex included. The site went down.

So `turn.grasslms.online` gets **its own certificate**, issued standalone, and
is never added to the `grasslms.online` bundle. A failure on the TURN hostname
then costs TURN, not the platform.

Ordering, and why this is not slice 1. The client offers ICE candidates in
order: direct UDP first, then TURN over UDP on 3478, then TURN over TLS on 443.
The first two cover most networks and need no nginx surgery. The stream block is
the single most dangerous edit in this feature, so it is its own task with its
own rehearsal on the QA compose stack, its own `nginx -t`, and a rollback ready
before it is applied.

Alternatives considered: leaving TURN on 5349 and accepting the failures, which
does not satisfy SC-005; and a second IP address, which costs money to solve a
configuration problem.

## Finding F — Capacity, and where the number comes from

**Decision: cap the container, measure under the cap, then enforce the measured
number at grant time.**

The container carries `deploy.resources.limits`, following the precedent the
`sandbox` service already sets with `pids: 256`, `cpus: "2.0"` and
`memory: 512M`. Starting values are `cpus: "1.2"` and `memory: 700M`, chosen so
that a saturated media server still leaves most of a core for PostgreSQL,
FastAPI and Next.js. These are the values slice 0 measures *under*, because they
are the values production will run.

The measurement is `livekit-cli load-test` driving bot publishers and
subscribers at the real host in a quiet window, stepping participant count up
until either the media container saturates its cap or SC-002 fails, whichever
comes first. Both numbers are recorded.

Enforcement asks the media server how many participants are live rather than
keeping a counter. A counter has to be incremented at grant time and decremented
on a webhook, and every missed webhook leaks a slot until somebody restarts
something. The server's own room listing is ground truth, costs one local call,
and is cached in Redis for two seconds so a class arriving together does not
become a burst of identical queries.

Refusal is explicit. Past the ceiling the grant endpoint returns 503 with a
reason, the lesson page says video is unavailable for this lesson, and the
board, tasks, roster and attendance carry on. No existing room is degraded to
admit a new one.

## Finding G — Media tuning for two cores

**Decision: simulcast on, dynacast on, adaptive stream on, audio selection
limited to the loudest three.**

The classroom is asymmetric and the layout should say so. The teacher and
whoever holds the floor publish a high layer; everyone else is a thumbnail
served from the lowest layer. Dynacast pauses layers with no subscriber, so
fourteen thumbnails never cost fourteen high-resolution streams. Adaptive stream
drops a tile's quality when it is small or off-screen.

Arithmetic for a fifteen-person room under this policy: about 7 Mbit/s inbound,
about 54 Mbit/s outbound, and roughly eight thousand packets a second once audio
selection stops forwarding twelve silent microphones. Without audio selection
the packet count triples, and audio, not video, becomes the load. That single
setting is the difference between a room that fits and one that does not.

## Finding H — Breakout groups are cheaper than the plenary

Subscriptions scale with the square of a room's population. Fifteen participants
all subscribed to each other is 15 × 14 = 210 video subscriptions. The same
fifteen split into five groups of three is 5 × (3 × 2) = 30.

Splitting a class therefore reduces load by roughly a factor of seven, which is
the opposite of the intuition. Breakouts still count against the ceiling because
the participant total is unchanged, but they are not the risk in this feature.

## Finding I — Surviving a deploy

`deploy.yml` runs `git reset --hard`, then `docker compose pull` for `backend`,
`frontend` and `sandbox` by name, then `docker compose up -d`, then migrations,
then a smoke check on `/login`.

`up -d` recreates only the services whose definition or image has changed. The
media container is not in the explicit pull list, so as long as its image is
pinned to a version tag instead of `latest`, an ordinary deploy walks past it
and a lesson in progress never notices. This is why the tag is pinned:
`cloudflared` in the same file uses `:latest`, and copying that habit here would
mean a silent restart on any day the upstream image moved.

A deliberate change to the media service will restart it. The client SDK
reconnects on its own, so participants return without the teacher doing
anything, and such changes are made outside teaching hours by choice rather than
by luck.

## Finding J — The recording module is a stub, not a foundation

Read from `backend/app/recording/router.py` on 2026-08-17. Three endpoints
exist: `POST /init`, `POST /{id}/complete` and `GET ""`. Two problems.

`/init` returns `upload_url = f"/api/v1/recordings/{recording.id}/upload"` with
a comment saying a real implementation would produce a pre-signed URL. **No
`/upload` endpoint exists.** Anything following the instruction the API itself
returns gets a 404.

`/complete` writes `body.storage_url` straight onto the row from client input.
Whatever the caller sends becomes the stored location, and later becomes a link
somebody follows. It is scoped to `Recording.user_id == user.id` and no further.

**Decision: this feature finishes the module rather than working around it.**
Slice 4 adds the upload endpoint backed by the existing `FileStorage`
abstraction, has the server derive `storage_url` from where it actually wrote
the bytes, and drops the field from the client request. The change is small, it
belongs to whoever next touches recording, and shipping a media feature on top
of a documented 404 is not an option.

## Finding K — What is being recorded, and a narrower reading worth considering

MediaRecorder captures a `MediaStream` the page constructs. Recording *the whole
room* means compositing every remote video into a canvas and mixing every remote
audio track through WebAudio, in the teacher's browser, while that same browser
is publishing and subscribing. Output quality is then tied to whatever machine
the teacher happens to own.

A narrower reading captures the teacher's microphone, the teacher's camera and
the teacher's screen share, and nothing else. It is a fraction of the work, it
costs the teacher's machine almost nothing, and for the case the specification
describes — a pupil who was ill wants to see the lesson — it loses very little.
It also records no child, which is the difference between a feature a European
school can switch on and one its data protection officer asks about.

**Recommendation: capture the teacher and the shared screen in v1.** The full
room composite becomes an option later, beside server-side recording, which is
where it belongs on this hardware. Flagged for the owner rather than decided
here, because it narrows what the specification asked for.

## Finding L — What is reused without change

- The SSE stream and Redis pub/sub bus in `live_lessons/realtime.py`, which
  already fans events to the right audience. New event names, no new channel.
- Signals, so the raised hand that gives the floor is the hand pupils already
  raise. FR-013 forbids a second one.
- Presence and the roster, so the media tiles line up with the names already on
  screen.
- Attendance, unchanged.
- `FileStorage` with its local and S3 backends, and `get_storage()`.
- The `recordings` table, extended instead of replaced.

## Open decisions carried into tasks

1. What is recorded: the teacher and the screen, or the whole room composite
   (Finding K). Owner's call, and slice 4 is last, so it can wait.
2. Retention for recordings. Twelve gigabytes of free disk against roughly a
   gigabyte per hour of 720p means the default has to be conservative; the
   number belongs with the storage decision in slice 4.
3. Whether the TURN hostname is added at Hostinger before or with the nginx
   stream task (Finding E). It must exist and point at the host before its
   certificate can be issued standalone.

## Sources

- [LiveKit ports and firewall](https://docs.livekit.io/home/self-hosting/ports-firewall/)
- [LiveKit Egress self-hosting](https://docs.livekit.io/home/self-hosting/egress/), for why server-side recording is out on this host
- [LiveKit benchmarking](https://docs.livekit.io/transport/self-hosting/benchmark/)

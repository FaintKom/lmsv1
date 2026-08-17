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

## Finding C — Port strategy, revised: UDP mux on an ordinary bridge

**Decision: `rtc.udp_port: 7882-7883`, published from an ordinary Docker
bridge. No host networking, no port range.**

The first draft of this finding said `network_mode: host` with the range
narrowed to 50000–50200. Both halves answered a problem LiveKit already solves.

LiveKit supports **UDP mux**: set `rtc.udp_port` and every participant's media
shares one socket instead of taking two ports each. Its own advice is a port
count at least equal to the machine's vCPUs, and production has two. The media
footprint is therefore **two ports, not two hundred, and not ten thousand**.

With four ports to publish in total, the case for host networking collapses. It
rested on thousands of NAT rules; four rules are nothing, the DNAT is
kernel-side, and an ordinary bridge behaves identically in development, QA and
production instead of needing a special case for each. `use_external_ip: true`
answers the one real objection, which is that a bridged container sees a private
address and would otherwise advertise unroutable ICE candidates.

The consequence is a simplification: the container keeps a normal Compose alias,
so nginx reaches it at `lms-livekit-1:7880` the way it reaches everything else.
`port_range_start` and `port_range_end` must stay unset, or `udp_port` is
silently ignored.

## Finding D — Ports and the firewall

LiveKit's own port list:

What this deployment actually opens, after Finding C and Finding M:

| Port | Protocol | Exposure | Purpose |
|---|---|---|---|
| 7880 | TCP | loopback only | Signalling, proxied by nginx at `/rtc` over TLS |
| 7882–7883 | UDP | public | Media, multiplexed across all participants |
| 7881 | TCP | public | WebRTC fallback when UDP cannot connect |
| 3478 | UDP | public | Embedded TURN, control connection only |
| 30000–30020 | UDP | public | TURN relay allocations (Finding M) |

The embedded TURN removes any need for a separate `coturn` container, which is
one fewer service on a crowded host. Signalling never faces the internet on its
own: 7880 binds to `127.0.0.1`, and nginx carries it with the certificate and
the timeouts a lesson-length WebSocket needs.

**The firewall does not need to change, and this is not an assumption.** The
prod compose file already records it, measured 2026-08-17 next to the nginx
service: a published container port is DNAT'd in `nat/PREROUTING` and then
travels the `FORWARD` chain, which Docker has already opened, while ufw filters
`INPUT`. An unrelated container published `0.0.0.0:2567` and was reachable from
the internet with ufw active. So publishing these ports in compose is what makes
them reachable, and `ufw status` will keep reporting `22/80/443` either way.

Two consequences, and they cut in opposite directions. Nothing is owner-gated
here after all, which removes one of the two blockers this plan carried. And the
`ports:` list is now the security boundary rather than the firewall, so binding
7880 to loopback is load-bearing rather than tidy. Verify with `ss -lntup`,
never with `ufw status`.

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

**Decision, taken by the owner on 2026-08-17: capture the teacher and the shared
screen.** A recording holds the teacher's microphone, the teacher's camera and
the teacher's screen share, and nothing else. No pupil's camera or microphone
enters it.

This narrows what the specification originally asked for, so the specification
was amended to match instead of being left to disagree with the plan: user story
5 and FR-027 now say what a recording contains. The full room composite stays
available as a later option beside server-side recording, which is where it
belongs on this hardware.

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

## Finding M — TURN answers on 3478 and relays somewhere else entirely

Found on 2026-08-17 by reading the container's own startup log rather than
trusting the configuration that produced it:

```
"msg":"Starting TURN server","turn.relay_range_start":30000,"turn.relay_range_end":40000,"turn.portUDP":3478
```

Port 3478 carries only the **control** connection. Each relayed stream leaves on
a separate port drawn from a range that defaults to 30000–40000, and none of
those were in the compose `ports:` list. The result would have been a TURN
server that answers, negotiates, and then relays nothing — failing precisely for
the pupils behind restrictive networks it exists to serve, and passing every
test written by anyone whose own network did not need it.

**Decision:** `turn.relay_range_start: 30000`, `relay_range_end: 30020`,
published. Twenty-one ports is one per participant needing a relay, which is
more than a class.

The general lesson is worth more than the fix: a media server's configuration
file does not list the ports it will actually bind. Its startup log does.

## Finding N — What it costs at rest, and one host tuning it asks for

Measured locally on 2026-08-17, `livekit/livekit-server:v1.8.4` idle with no
participants:

```
lms29-livekit-1  cpu=0.14%  mem=32.09MiB
```

Thirty-two megabytes against a 700 MB cap, so the cap constrains load rather
than startup, and an idle media server costs the platform nothing. The number
that matters is still the one slice 0 measures under load.

The same startup log asks for one host-level change:

```
"msg":"UDP receive buffer is too small for a production set-up","current":425984,"suggested":5000000
```

That is `net.core.rmem_max`, a sysctl on the host rather than anything a
container can set for itself. Undersized, the kernel drops inbound media under
burst, which reads to a user as choppy audio and to a maintainer as an
inexplicable capacity ceiling. Raising it belongs with the load test in slice 0,
because measuring capacity against a starved socket buffer would measure the
wrong thing.

## Open decisions carried into tasks

1. Retention for recordings. Twelve gigabytes of free disk against roughly a
   gigabyte per hour of 720p means the default has to be conservative; the
   number belongs with the storage decision in slice 4.
2. Whether the TURN hostname is added at Hostinger before or with the nginx
   stream task (Finding E). It must exist and point at the host before its
   certificate can be issued standalone.

Finding K was open and is now closed; the decision is recorded above.

## Sources

- [LiveKit ports and firewall](https://docs.livekit.io/home/self-hosting/ports-firewall/)
- [LiveKit Egress self-hosting](https://docs.livekit.io/home/self-hosting/egress/), for why server-side recording is out on this host
- [LiveKit benchmarking](https://docs.livekit.io/transport/self-hosting/benchmark/)

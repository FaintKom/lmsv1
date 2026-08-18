# Feature Specification: Video and audio inside the live lesson

**Feature Branch**: `feat/live-video-conferencing`

**Created**: 2026-08-17

**Status**: Draft

**Input**: User description: "Live video and audio inside the LMS lesson, replacing the meet.jit.si link."

## Context

A live lesson in GrassLMS already holds almost everything a lesson needs. The
roster shows who is present and where each pupil is; the board, the polls, the
raised hands, the progress grid and the attendance record all live on one page.
The faces do not. They live on `meet.jit.si`, in a second window, on somebody
else's domain, and the teacher opens it through a link the backend generated.

On the free public instance of that service, whoever enters the room first
becomes its moderator. A pupil who clicks before the teacher holds the controls
for the rest of the lesson, and no configuration can take them back. A teacher
therefore cannot reliably mute a noisy microphone, remove someone who should not
be there, or hand the floor to the child with their hand up. The product sells a
school one window and then sends the lesson out of it.

This feature moves the media into the lesson page. It also makes the teacher a
moderator by decision of the server, so the order in which people arrive no
longer settles who is in charge.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Hold the lesson without leaving the lesson (Priority: P1)

A teacher starts the Tuesday group. The pupils open the lesson page they already
use, and their cameras and microphones come up beside the scene the teacher is
showing. Nobody follows a link, nobody signs in anywhere else, and nobody sees a
second brand. The teacher speaks, shares the board, and the class answers. When
the lesson ends the room closes with it.

**Why this priority**: Everything else in this specification assumes the media
is there. Without it the feature does not exist, and the split between "the
lesson" and "the call" that this work is meant to remove stays exactly where it
is.

**Independent Test**: Start a live lesson, join as a teacher and two pupils from
separate browsers, and confirm that each sees and hears the others inside the
lesson page with no second window and no external domain in the address bar.

**Acceptance Scenarios**:

1. **Given** a live lesson is running and a pupil belongs to its group, **When**
   the pupil opens the lesson page, **Then** the pupil is placed in the lesson's
   room and can see and hear whoever else has joined.
2. **Given** a person who is not in the lesson's group and not staff of the same
   school, **When** they attempt to join the room, **Then** they are refused and
   the lesson is not revealed to them.
3. **Given** a pupil enters the room before the teacher does, **When** the
   teacher joins, **Then** the teacher holds the room's controls and the pupil
   holds none.
4. **Given** a participant has no camera or denies permission to it, **When**
   they join, **Then** they join with audio alone and the rest of the class is
   unaffected.
5. **Given** the lesson ends, **When** the teacher closes it, **Then** every
   participant leaves the room and no one can re-enter it.

---

### User Story 2 - Run the room, not just attend it (Priority: P2)

Halfway through the lesson a microphone is picking up a television. The teacher
mutes it from the roster without stopping the class. A child who has been asked
to leave keeps rejoining, so the teacher removes them and they stay removed.
Another child raises their hand, and the teacher gives them the floor, which
puts them on everyone's screen until the teacher takes it back.

**Why this priority**: This is the reason the current arrangement fails. A
teacher who cannot quiet a room cannot teach in it, and every school evaluating
the product will test exactly this within the first lesson.

**Independent Test**: With a teacher and two pupils in a room, mute a pupil,
spotlight the other, then remove one and confirm they cannot return.

**Acceptance Scenarios**:

1. **Given** a pupil's microphone is live, **When** the teacher mutes them,
   **Then** the class stops hearing that pupil and the pupil is told they were
   muted.
2. **Given** a pupil has been muted by the teacher, **When** the pupil tries to
   unmute themselves, **Then** they may do so, and the teacher can mute them
   again.
3. **Given** a pupil is in the room, **When** the teacher removes them, **Then**
   they leave immediately and cannot rejoin that lesson.
4. **Given** a pupil has raised their hand through the existing signal, **When**
   the teacher grants them the floor, **Then** that pupil becomes the focused
   participant for everyone until the teacher ends it.
5. **Given** a pupil attempts any of the above actions on another pupil,
   **When** the request reaches the server, **Then** it is refused.

---

### User Story 3 - Show what is on my screen (Priority: P2)

A programming teacher wants the class to watch them work in their editor, which
is not LMS content and cannot be put on the board. They share their screen, the
class sees it beside the roster, and when a pupil is stuck the teacher lets that
pupil share instead so the class can look at the error together.

**Why this priority**: The platform teaches programming, and a programming
lesson that cannot show an editor is missing its main visual aid. It sits below
moderation only because a lesson can be taught without it and cannot be taught
without control of the room.

**Independent Test**: A teacher shares a screen and the pupils see it; the
teacher then permits a pupil to share, and the class sees the pupil's screen.

**Acceptance Scenarios**:

1. **Given** a teacher is in the room, **When** they start sharing a screen,
   **Then** every participant sees it and the teacher's camera remains available
   alongside it.
2. **Given** a pupil has not been permitted to share, **When** they attempt it,
   **Then** the attempt is refused.
3. **Given** a teacher has permitted a pupil to share, **When** the pupil
   shares, **Then** the class sees the pupil's screen and the teacher can stop
   the sharing at any time.

---

### User Story 4 - Split the class and bring it back (Priority: P3)

A language teacher wants pairs to practise a dialogue. They split the class into
groups of three, and each group gets its own room where only that group can be
heard. The teacher drops into each in turn to listen, sends a message to
everyone at once when time is nearly up, and then gathers the class back into
the main room.

**Why this priority**: This is what a language school buys a classroom tool for,
and it separates the product from a plain video call. It comes after screen
sharing because it is worth nothing until the ordinary room works well.

**Independent Test**: Split a class of four into two pairs, confirm each pair
hears only itself, visit one group as the teacher, then gather everyone back.

**Acceptance Scenarios**:

1. **Given** a lesson with several pupils, **When** the teacher splits the class
   into groups, **Then** each pupil is moved into their group's room and hears
   only that group.
2. **Given** groups are running, **When** the teacher joins one, **Then** that
   group can see and hear the teacher and the other groups cannot.
3. **Given** groups are running, **When** the teacher sends a message to all of
   them, **Then** every pupil sees it wherever they are.
4. **Given** groups are running, **When** the teacher gathers the class, **Then**
   every pupil returns to the main room without doing anything themselves.
5. **Given** groups are running, **When** the teacher ends the lesson outright,
   **Then** every group room closes with it.

---

### User Story 5 - Keep a recording of the lesson (Priority: P3)

A pupil was ill on Thursday. The teacher recorded that lesson, and afterwards it
appears in the school's recordings with the lesson it came from, so the office
can give it to the family who missed it. While it was being recorded everyone in
the room could see that it was.

**Why this priority**: Useful, frequently asked for, and the only part of this
specification whose absence costs a school nothing on the day. It also carries
the most risk, both to the production host and to the school's obligations
around recording children, so it goes last where it can be removed without
disturbing anything else.

**Independent Test**: With recording enabled for a school, record a short
lesson, confirm every participant sees the indicator throughout, and confirm the
finished file arrives against that lesson and can be played back.

**Acceptance Scenarios**:

1. **Given** a school has not enabled recording, **When** a teacher opens the
   lesson, **Then** no recording control is offered.
2. **Given** a school has enabled recording, **When** the teacher starts one,
   **Then** every participant, including anyone who joins later, sees that the
   lesson is being recorded until it stops.
3. **Given** a recording is running, **When** the teacher stops it or the lesson
   ends, **Then** the file is stored against that lesson and shown as ready once
   it has arrived.
4. **Given** a recording was interrupted before it could be stored, **When** the
   teacher looks at the lesson, **Then** the recording is shown as failed, so
   the teacher knows no file is coming.
5. **Given** a recording exists, **When** someone from another school requests
   it, **Then** the request is refused and the recording's existence is not
   revealed.
6. **Given** a lesson with pupils on camera was recorded, **When** the file is
   played back, **Then** it holds the teacher and the shared screen, and no
   pupil's camera or microphone appears in it.

---

### Edge Cases

- A teacher starts a lesson while the platform is already carrying as many
  participants as it can serve. The teacher is told plainly that video is
  unavailable for this lesson, and the lesson still runs with its board, tasks
  and roster. No existing lesson is degraded to make room.
- A pupil joins from a school or office network that permits only ordinary web
  traffic. Their media is relayed and they join like anyone else. Where that
  fails, the reason reaches them within a few seconds.
- A release lands mid-lesson. Merging to `main` deploys to production within
  minutes, and a lesson in progress has to survive a routine release. Where a
  media restart cannot be avoided, participants return by themselves and the
  teacher is not asked to do anything.
- The teacher's browser dies while a recording is running. The recording is
  marked failed and the lesson continues for everybody else.
- The teacher leaves the room and comes back. Their authority returns with them,
  and it never passes to whoever was left behind.
- The lesson ends while breakout groups are running. Every group room closes
  with it, and nobody is left in a room that belongs to no lesson.
- A second teacher or an administrator joins a lesson. They hold the same
  authority as the lesson's teacher, and neither can strip the other of it.
- A pupil opens the lesson in two windows. The second replaces the first, so the
  roster never shows one person twice.
- Recordings approach the storage the platform allows them. Reaching that bound
  stops new recordings and nothing else.

## Requirements *(mandatory)*

### Functional Requirements

#### Authority and access

- **FR-001**: The server MUST decide who holds a room's controls. Joining order
  MUST NOT confer any authority.
- **FR-002**: A room MUST admit only the lesson's teacher, staff of the same
  school, and pupils who belong to the lesson's group. Every identifier arriving
  in a join request MUST be checked against the caller's organisation before it
  is used, and a room belonging to another school MUST read as absent, never as
  forbidden.
- **FR-003**: A participant removed by a teacher MUST NOT be able to rejoin the
  same lesson.
- **FR-004**: Permission to act on another participant MUST be enforced on the
  server. A client claiming authority it was not granted MUST be refused.

#### The room

- **FR-005**: Video and audio MUST be presented within the existing lesson pages
  for pupils and staff. No participant may be required to open a second window
  or a domain outside the platform.
- **FR-006**: A participant MUST be able to choose which microphone and camera
  to use, to mute and unmute themselves, and to turn their camera off and on.
- **FR-007**: A participant who has no camera, or who refuses access to it, MUST
  still be able to take part with audio.
- **FR-008**: The platform MUST enforce a ceiling on how much live media it
  carries at once. Reaching the ceiling MUST produce an explicit refusal, with
  the lesson's other features left working. Existing rooms MUST NOT be degraded
  to admit a new one.
- **FR-009**: All media MUST be carried by infrastructure the business
  controls. No participant's audio or video may pass through a third-party
  service.
- **FR-010**: Participants whose network blocks direct peer connections MUST
  still be able to join, through a relay the platform provides.

#### Running the room

- **FR-011**: A teacher MUST be able to mute a participant, remove a
  participant, and focus one participant for everyone.
- **FR-012**: A participant muted by a teacher MUST be told so, and MUST remain
  able to unmute themselves; the teacher MUST be able to mute them again.
- **FR-013**: The existing raised-hand signal MUST be usable as the basis for
  giving a participant the floor, without introducing a second, separate
  hand-raise.
- **FR-014**: A teacher MUST be able to share a screen. A pupil MUST be able to
  share only while the teacher permits it, and the teacher MUST be able to
  withdraw that permission and stop the sharing.

#### Breakout groups

- **FR-015**: A teacher MUST be able to divide a lesson's participants into
  groups, each hearing and seeing only itself.
- **FR-016**: A teacher MUST be able to enter any group, send a message to every
  group at once, and return all participants to the main room.
- **FR-017**: A participant's authority MUST be the same in a group room as in
  the main room.
- **FR-018**: Ending the lesson MUST close every group room belonging to it.

#### Recording

- **FR-019**: Recording MUST be off for a school until an administrator of that
  school turns it on.
- **FR-020**: While a lesson is being recorded, every participant MUST be able
  to see that it is, including anyone who joins after it started.
- **FR-021**: A finished recording MUST be stored against the lesson it came
  from and against the school that made it, and MUST be readable only by staff
  of that school unless the teacher shares it with the lesson's group.
- **FR-022**: A recording that does not complete MUST be shown as failed and
  MUST NOT disappear.
- **FR-023**: Recordings MUST be subject to a stated retention period, after
  which they are removed.
- **FR-027**: A recording MUST contain the teacher's microphone, the teacher's
  camera and the teacher's screen share, and MUST NOT contain any other
  participant's camera or microphone.

#### Operating within the platform

- **FR-024**: Live media MUST NOT degrade the rest of the platform. The limit at
  FR-008 MUST be derived from measurement on the production host, taken before
  any class uses the feature.
- **FR-025**: A routine release MUST NOT end a lesson in progress. Where media
  services do restart, participants MUST return without teacher intervention.
- **FR-033**: A participant MUST stay in the call while moving around the
  platform. Opening a material, a task or any other page is part of taking a
  lesson, and today each one drops the person out of the room they are in.
- **FR-035**: The pupil's lesson page is a stage and a rail. The stage holds
  the one thing being taught — the teacher's screen, the board, the material,
  the task, or the faces; the rail holds the cameras, the call controls and
  the chat. On a phone the rail folds under the stage and the chat opens as a
  sheet. Nothing on the page requires scrolling the page: every control is on
  screen at every viewport, and only reading surfaces (chat log, material)
  scroll within themselves.
- **FR-036**: A pupil can follow and take part in the lesson conversation from
  the page: the teacher's messages to the class and the pupil's own questions
  are one visible thread, not a toast that vanishes and a prompt that forgets.
- **FR-034**: Camera and screen sharing belong to the scene system, not beside
  it. The teacher decides what the class is looking at — a board, a material, a
  task, a shared screen, faces — and the pupil's page shows that one thing.
  Whatever a pupil is working in keeps the page: a task must never be squeezed
  into a strip because somebody started sharing.
- **FR-031**: When somebody is sharing a screen, that screen MUST become the
  main thing on the page for everybody watching. A shared screen confined to a
  strip beside a placeholder is a lesson nobody can read.
- **FR-032**: Before joining, a participant MUST be able to tell that what they
  are looking at is their own preview, and what will happen when they join.
- **FR-030**: A lesson in progress MUST be reachable from anywhere in the
  platform by everyone taking part in it, and by the route their own role can
  actually open. Knowing the address is not a way back.
- **FR-028**: The media server and the browser client MUST be versions that
  speak the same signalling protocol, and the pairing MUST be stated where the
  version is pinned. Signalling connects across a mismatch, so a room reports a
  participant as active and then drops it with no working connection; nothing
  upstream of the peer connection reveals it.
- **FR-029**: A control that switches something on or off MUST show which state
  it is in, legibly against the page it sits on. A struck-through icon MUST mean
  "off" and nothing else.
- **FR-026**: Every string this feature adds to the interface MUST be present in
  all six supported locales.

### Key Entities

- **Lesson room**: The media room belonging to one live lesson. It exists while
  the lesson is active, carries the participants, and is destroyed with the
  lesson. It has no roster of its own; the lesson's group is its membership.
- **Participation grant**: What the server issues to one person for one room,
  stating who they are and what they may do in it. It is short-lived and cannot
  be widened by the client that holds it.
- **Breakout group**: A subdivision of a lesson room holding some of its
  participants, with a lifetime bounded by the lesson.
- **Recording**: A stored capture of a lesson, belonging to a school and a
  lesson, carrying its state, size, duration and location. The existing
  `recordings` entity already describes this and gains its link to the lesson.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A teacher and twelve pupils hold a 45-minute lesson with cameras
  and microphones, with nobody leaving the lesson page and nobody visiting
  another domain.
- **SC-002**: While that lesson runs, pages elsewhere in the platform load no
  more than 20% slower than the same pages measured with no lesson running.
- **SC-003**: The number of participants the production host can carry is
  established by measurement, and recorded, before the first class uses the
  feature.
- **SC-004**: 95% of participants are seeing and hearing the room within 10
  seconds of opening the lesson page.
- **SC-005**: A participant on a network that permits only ordinary web traffic
  joins successfully.
- **SC-006**: A participant a teacher removes cannot return to that lesson, in
  100% of attempts.
- **SC-007**: Every participant in a recorded lesson can see the recording
  indicator for the whole time recording is in progress.
- **SC-008**: A release deployed during a live lesson leaves the lesson running,
  or returns every participant to it within 30 seconds with no action from the
  teacher.
- **SC-009**: Attempts to join, moderate or read the recordings of another
  school's lesson fail in 100% of cases, and reveal nothing about whether the
  lesson exists.

## Assumptions

These were chosen where the description left room, and each can be revisited
before planning.

- The media server is self-hosted on the existing production host. A second host
  is an escalation available if the measurement at SC-003 comes back too low,
  not a starting assumption, and buying one is a decision for the owner.
- Recording in this version is captured in the teacher's browser and uploaded
  when it finishes, because server-side recording needs more processor and
  memory than the production host has spare. Server-side recording is the
  upgrade path and belongs to a later specification, together with the host it
  requires.
- The production firewall currently passes no UDP traffic, and media cannot
  connect until that changes. Opening it is a change to a live server and needs
  the owner's approval before it is made.
- Port 443 is held by the web server, which constrains how the relay at FR-010
  can be reached from restrictive networks. Resolving that conflict is a
  planning decision, not a change in scope.
- Membership, presence, raised hands and attendance come from the existing live
  lesson. This feature adds no second roster and no second signal.
- A recording captures the teacher and the shared screen, and no pupil. Owner's
  decision, 2026-08-17. It costs a fraction of the work of compositing every
  participant in the teacher's browser, it costs the teacher's machine almost
  nothing while that machine is already publishing and subscribing, and for the
  case this story describes it loses very little. Capturing the whole room stays
  available later, beside server-side recording.
- Recordings are visible to staff of the school by default; sharing one with a
  group is the teacher's deliberate act. The school is responsible for obtaining
  whatever consent its jurisdiction requires, and the platform's part is to make
  recording visible and to keep it off unless the school turns it on.
- Participants use a current version of Chrome, Edge, Firefox or Safari on a
  desktop or a tablet. The recording control is shown only where the browser can
  actually capture one.
- This replaces the external video service **inside the live lesson only**. The
  same service still opens from scheduled slots, from standalone meetings and
  from the journal, and those pages keep working unchanged. Replacing it there
  as well is worth doing and is not this feature; saying so here stops a reader
  concluding the platform has no external video left in it.
- The webinar case, where one source is watched by a hundred or more viewers,
  is out of scope. It scales by a different transport and gets its own
  specification.

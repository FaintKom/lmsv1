# Feature Specification: The sandbox holds under a real class

**Feature Branch**: `fix/sandbox-hardening`

**Created**: 2026-08-16

**Status**: Draft

**Input**: A seven-finding audit of the code-execution sandbox, each finding verified against this repository rather than assumed.

## Context

Pupils write code in the product and press Run. That code is somebody else's
code as far as we are concerned, so it executes in a separate container reached
by the backend over an internal network.

The container is genuinely contained, and this spec does not relitigate that.
What already holds, and must keep holding:

- Execution happens outside the application container, in a service with no
  database credentials.
- Its filesystem is read-only, with a size-capped temporary area.
- It cannot gain privileges (`no-new-privileges`).
- Its network has no route to the internet.
- The container has a processor cap and a memory cap.

What is missing is the layer between *the container is contained* and *one
pupil cannot spoil the lesson for the other twenty-four*. Everything below is
about that layer, plus one thing that is not hardening at all but a feature
that does not work.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A pupil's Java or Go exercise runs at all (Priority: P1)

A pupil opens a Java exercise, writes a correct answer, and presses Run. Today
they get an error about a virtual machine failing to reserve a code cache. They
have done nothing wrong, the answer is right, and nothing in the message tells
them or their teacher what happened.

**Why this priority**: this is not hardening, it is a broken feature. Java and
Go are offered, and at the default memory allowance neither starts. Every other
story here protects a lesson; this one is the lesson failing already.

**Independent Test**: run the same correct Java program and the same correct Go
program at the default memory allowance and get their output.

**Acceptance Scenarios**:

1. **Given** a Java exercise at the platform's default memory allowance,
   **When** a pupil submits a correct program, **Then** they see its output and
   a passing result.
2. **Given** a Go exercise at the same allowance, **When** a pupil submits a
   correct program, **Then** they see its output and a passing result.
3. **Given** a program that genuinely tries to use more memory than it is
   allowed, **When** it is run, **Then** the pupil is told it ran out of its
   memory allowance — in those terms, not as a crash from the language runtime.

---

### User Story 2 - A whole class presses Run at the same moment (Priority: P2)

Twenty-five pupils in one lesson reach the same exercise and press Run within a
few seconds of each other. This is the ordinary case, not an attack, and it is
the exact moment a teacher decides whether the platform is usable.

**Why this priority**: it is the difference between a lesson and an incident,
and it is what a demonstration would show. It is second only because a class
cannot hit it in a language that does not start.

**Independent Test**: fire twenty-five simultaneous runs of a short program and
confirm every one of them returns a correct result, none is lost, and the
slowest is within a stated bound.

**Acceptance Scenarios**:

1. **Given** twenty-five simultaneous submissions of a short correct program,
   **When** they are all run, **Then** all twenty-five receive their own correct
   output.
2. **Given** more simultaneous submissions than the service will run at once,
   **When** the surplus arrives, **Then** each waits its turn and runs when a
   slot frees, rather than competing for the same processor.
3. **Given** a submission has waited longer than the platform is willing to make
   a pupil wait, **When** that ceiling is reached, **Then** it is refused with a
   message saying the class is busy — never by leaving the pupil watching a
   button that never answers.
4. **Given** a submission that exceeds its time allowance, **When** it is
   stopped, **Then** nothing it started keeps running afterwards, and the
   processor time it was using is returned to the other pupils.

---

### User Story 3 - Hostile code cannot take the sandbox down (Priority: P2)

A pupil — curious, bored, or reading the internet — submits a program whose
only purpose is to break the service: it creates processes without limit until
nothing else can start.

**Why this priority**: it is the cheapest attack that exists, it needs no skill,
and it is currently unopposed. It sits alongside Story 2 rather than above it
because its blast radius is the same one: the lesson stops.

**Independent Test**: submit a program that spawns processes without limit;
confirm it is stopped and that an unrelated pupil's program submitted
immediately afterwards still runs correctly.

**Acceptance Scenarios**:

1. **Given** a program that creates processes without limit, **When** it runs,
   **Then** it is stopped and the pupil is told what it did wrong.
2. **Given** that program has just been stopped, **When** another pupil submits
   an ordinary program, **Then** it runs and returns correct output.

---

### User Story 4 - Pupil code cannot reach our own systems (Priority: P3)

A pupil's program tries to open a network connection — to the internet, or to
another service inside our own network.

**Why this priority**: no such attempt is known to have happened, and the
internet route is already closed. But the internal route is open today, and it
leads to our own application. It is P3 only because it needs a pupil who knows
what to look for.

**Independent Test**: submit a program that attempts to open a connection to
the platform's own internal service address; confirm it cannot.

**Acceptance Scenarios**:

1. **Given** a program that attempts to connect to any address, **When** it
   runs, **Then** the attempt fails, and the failure is the program's, not the
   service's.
2. **Given** a program that attempts to listen for connections, **When** it
   runs, **Then** it cannot.
3. **Given** the same restriction is in place, **When** ordinary programs in
   every supported language are run, **Then** they behave exactly as before.

---

### User Story 5 - Pupil code runs with the fewest privileges that work (Priority: P3)

A pupil's program runs as an unprivileged user inside the execution container,
so that a defect in a language runtime does not hand it administrative rights
within that container.

**Why this priority**: defence in depth behind controls that already hold. It
changes nothing a pupil can see and everything about how bad an unknown
runtime bug could be.

**Independent Test**: run a program that reports which user it is running as,
and confirm it is not the administrative one; confirm all supported languages
still run.

**Acceptance Scenarios**:

1. **Given** any supported language, **When** a program reports its own user,
   **Then** it is not the container's administrative user.
2. **Given** the change is in place, **When** the existing exercises are run,
   **Then** every one of them still produces the same result as before.

---

### Edge Cases

- A program that produces enormous output: the pupil must get a bounded,
  readable answer rather than the service straining to carry it.
- A program that reads from input when the exercise supplies none: it must end
  rather than wait forever holding a slot.
- A program that is stopped for time while the class is at its busiest: the slot
  it held must become available to the next pupil immediately.
- A program that allocates memory steadily rather than all at once: it must be
  refused on its own, without disturbing programs running beside it.
- Compilation, not just execution, must be covered by the same limits — a
  compiler can be made to consume as much as a program can.

## Requirements *(mandatory)*

### Functional Requirements

**Running a pupil's program**

- **FR-001**: Every currently supported language MUST run correctly at the
  platform's default memory allowance. A language that is offered and cannot
  start is a defect.
- **FR-002**: A program refused for resources MUST be reported to the pupil as
  a resource refusal, naming which allowance it exceeded. A message produced by
  a language runtime failing to initialise does not satisfy this.
- **FR-003**: Each execution MUST have its own memory allowance, enforced
  against the memory a program actually uses rather than the address space it
  reserves. One pupil's runaway allocation MUST end that pupil's program and
  no other. The service-wide cap alone is not sufficient: reaching it would
  stop the whole class for one pupil's mistake.
- **FR-003a**: The per-exercise memory allowance authors already set MUST
  remain the value that is enforced, so existing exercises keep the meaning
  they were written with.
- **FR-004**: A per-execution time allowance MUST be enforced, and MUST apply to
  compilation as well as to execution.
- **FR-005**: When a program exceeds its time allowance, everything it started
  MUST stop with it. No descendant may outlive the program that created it.
- **FR-006**: Output returned to a pupil MUST be bounded, and the pupil MUST be
  told when it was truncated.

**Holding up under a class**

- **FR-007**: The service MUST bound how many programs it runs at once, chosen
  against the processors actually available to it rather than a fixed guess.
- **FR-008**: Submissions beyond that bound MUST wait for a free slot, not
  contend for the same processors. Waiting MUST itself be bounded: past a
  stated ceiling the submission is refused with a message a pupil can act on,
  because a button that never answers is worse than a plain no.
- **FR-009**: A class of twenty-five pupils submitting a short program at the
  same moment MUST all receive correct results.
- **FR-010**: A stopped or finished program MUST release its slot immediately.

**Containing what pupils write**

- **FR-011**: A pupil's program MUST NOT be able to open a network connection to
  anything, including services on our own internal network.

  *Amended during implementation, 2026-08-16, with the measurement that forced
  it.* This first read "open, accept, or listen for". Accepting and listening
  cannot be denied: the enforcement available here applies to every process in
  the container, and the runner is itself a web server. Denying `bind` and
  `listen` stopped the service starting —
  `could not bind on any address out of [('0.0.0.0', 8001)]` — and a sandbox
  that cannot serve is not a safer sandbox.

  A pupil may therefore still listen on a socket. It reaches nobody: the network
  has no route to the internet, the only other party on it dials *in* rather
  than out, and outbound connection is denied, so nothing — including another
  pupil's program in the same container — can dial them. The requirement's
  purpose is that pupil code cannot reach our systems, and that is enforced.
- **FR-012**: A pupil's program MUST NOT be able to create processes without
  limit; exceeding the limit MUST stop that program and no other.
- **FR-013**: A pupil's program MUST run as an unprivileged user within the
  execution container.
- **FR-014**: Every isolation property that holds today — separate container,
  read-only filesystem, size-capped temporary area, no privilege escalation, no
  route to the internet, container-level processor and memory caps — MUST still
  hold afterwards. This feature may only add.

**Not making things worse**

- **FR-015**: The change MUST NOT require more production capacity than the
  current host provides.
- **FR-016**: Each limit MUST be observable in the service's own logs when it
  fires, so that "the sandbox was slow" can be answered with which limit was
  reached rather than a guess.

### Key Entities

- **Execution request**: one pupil pressing Run — the program, its language, its
  time allowance, its memory allowance, and any input the exercise supplies.
- **Execution result**: what the pupil sees — output, error text, exit status,
  elapsed time, and, when a limit was reached, which one.
- **Allowance**: a bound on one execution, set per exercise by whoever wrote it,
  with a platform default when they did not.
- **Capacity**: how much the service will do at once, a property of the service
  rather than of any one request.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A correct program in every supported language returns its output.
  No supported language fails to start at the platform's default allowance.
- **SC-002**: Twenty-five programs submitted within one second all return
  correct results, and none is lost.
- **SC-003**: In that burst, the slowest result arrives within ten seconds of
  its submission, for a program that runs in under one second on its own.
- **SC-004**: A program written to exhaust processes, memory, or time is stopped
  within its allowance, and a program submitted immediately afterwards returns a
  correct result.
- **SC-005**: A pupil who exceeds an allowance is told which allowance they
  exceeded, in every case, without a language runtime's own error reaching them
  unexplained.
- **SC-006**: No program can reach any network address, verified from inside the
  sandbox against the platform's own internal service.
- **SC-007**: The service runs within the memory and processor budget it has
  today, measured on the production host rather than estimated.

## Assumptions

- The audit's seven findings are taken as accurate; each was verified against
  the repository, and the two behavioural claims (Java and Go failing to start)
  were reproduced inside the running container rather than reasoned about.
- The per-exercise memory allowance stays, and stays enforced (FR-003a). The
  owner chose a per-execution limit over relying on the container cap, so the
  field keeps its meaning and nothing content authors have written changes.
- The production host stays as it is: two processors and a memory budget shared
  with roughly fourteen containers. Nothing here may assume a larger machine.
- No new paid service is introduced. Any capacity this needs comes from the
  budget already in use.
- Existing exercises and their stored allowances stay valid. This feature does
  not ask content authors to change anything they have already written.
- The demonstration audience is a class of about twenty-five, which is the upper
  end of the schools this product is sold to.

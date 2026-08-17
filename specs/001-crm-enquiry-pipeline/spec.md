# Feature Specification: School enquiry pipeline

**Feature Branch**: `feat/crm-spec`

**Created**: 2026-08-16

**Status**: Draft — v1 shipped 2026-08-16 (PR #295); this specifies the feature whole, so the code can be checked against it

**Input**: User description: "School enquiry pipeline (CRM). A private school or learning centre needs to manage the people who ask about a place before they become pupils."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Work an enquiry from first contact to enrolled pupil (Priority: P1)

A parent writes to a school asking whether their child can learn Python. The office
records who wrote in, which child it is about, and what they asked about. Over the
next fortnight somebody rings them, books a trial lesson, and afterwards either
enrols the child or closes the enquiry with a reason. Everything said along the way
stays on the enquiry, so whoever picks it up next is not starting from nothing.

**Why this priority**: This is the whole feature. Without it the school keeps using
WhatsApp and a spreadsheet, and every argument for the product's "school in one
window" positioning collapses. It is also the only story that ends inside the LMS
with a pupil who can be taught.

**Independent Test**: Record an enquiry, move it through the stages, add a note and
a call, then enrol. Verify the pupil exists, the guardian is linked to them, and the
enquiry shows as enrolled with a history of what happened.

**Acceptance Scenarios**:

1. **Given** an office worker with a school administrator account, **When** they
   record an enquiry with a contact name, **Then** the enquiry appears on the board
   in the first stage and its history records that it was created.
2. **Given** an open enquiry, **When** the enquiry is moved to another stage,
   **Then** the move is recorded in the history with both the old and the new stage.
3. **Given** an enquiry that will not proceed, **When** it is closed as lost without
   a reason, **Then** the system refuses; when a reason is given it is accepted and
   the enquiry leaves the board.
4. **Given** an enquiry about a child, **When** it is converted, **Then** a pupil
   account exists, a guardian account exists and is linked to that pupil when the
   enquiry carried a contact address, the pupil is enrolled in the course of
   interest, and the enquiry is marked enrolled.
5. **Given** an enquiry that has already been converted, **When** conversion is
   attempted again, **Then** the system refuses and no second account is created.
6. **Given** an enquiry, **When** somebody tries to mark it enrolled by hand rather
   than by converting it, **Then** the system refuses, because an enrolled enquiry
   with no pupil behind it misreports the school's own numbers.

---

### User Story 2 - The follow-up nobody forgets (Priority: P2)

Enquiries are lost to silence more often than to competitors. A member of staff sets
a reminder against an enquiry — "ring back Tuesday" — and on the day, the person who
owes that call is told, whether or not they happen to be looking at the product.

**Why this priority**: The pipeline's value is in the chasing, not the recording. A
board nobody is prompted by decays into the same forgotten spreadsheet it replaced.

**Independent Test**: Set a reminder due yesterday, run the daily sweep, confirm the
assignee is notified exactly once and that a second sweep produces nothing further.

**Acceptance Scenarios**:

1. **Given** an enquiry, **When** a reminder is set with a title and a due date,
   **Then** it appears in the school's open reminders until it is completed.
2. **Given** a reminder that is due or overdue, **When** the daily sweep runs,
   **Then** the person it is assigned to is notified, and running the sweep again
   does not notify them a second time.
3. **Given** a reminder nobody has been assigned, **When** it comes due, **Then**
   the school's administrators are notified rather than nobody.
4. **Given** a reminder that has come due, **When** the assignee is not using the
   product that day, **Then** they still learn about it by email.

---

### User Story 3 - The school's own website feeds the pipeline (Priority: P2)

Somebody browsing the school's site fills in a short form — their name, how to reach
them, what they are interested in — and it lands in the pipeline as a new enquiry
without anyone retyping it.

**Why this priority**: Every enquiry entered by hand was already handled somewhere
else first. Capture at the source is where a pipeline starts paying for itself, and
it is the difference between a database and a funnel.

**Independent Test**: Open the school's public enquiry page as an anonymous visitor,
submit it, confirm the enquiry appears on that school's board attributed to the
right source, and that no other school can see it.

**Acceptance Scenarios**:

1. **Given** an anonymous visitor, **When** they submit the enquiry form for a
   school, **Then** a new enquiry appears on that school's board with its source
   recorded as the website.
2. **Given** repeated submissions from one origin, **When** they exceed a sane rate,
   **Then** further submissions are refused, so the board cannot be flooded.
3. **Given** a submission, **When** it is accepted, **Then** the visitor sees the
   same confirmation whether or not that address has enquired before, so the form
   cannot be used to test who has been in touch.

---

### User Story 4 - The owner sees which channel is worth the money (Priority: P3)

The person paying for advertising wants to know how many enquiries arrived last
month, how many became pupils, how long the first reply took, and which source
produced them.

**Why this priority**: Without it the school can record its funnel but cannot learn
from it. Valuable, but the pipeline is useful before the reporting exists.

**Independent Test**: With a known set of enquiries across sources and outcomes,
confirm the reported counts, conversion rate and typical time to first contact match
what was entered.

**Acceptance Scenarios**:

1. **Given** enquiries in several stages, **When** the school opens its funnel
   summary, **Then** it shows how many are in each stage.
2. **Given** a period and a set of closed enquiries, **When** the summary is read,
   **Then** it reports the conversion rate and a breakdown by source for that period.
3. **Given** enquiries with recorded first contact, **When** the summary is read,
   **Then** it reports how long first contact typically took.

---

### User Story 5 - A closed enquiry that comes back (Priority: P3)

A family that chose another school in September writes again in January. The office
reopens the original enquiry rather than starting a second one, so the history of
what was discussed the first time is not lost.

**Why this priority**: It happens often enough in a small school to matter, and the
alternative — a duplicate enquiry — quietly corrupts every number in Story 4.

**Independent Test**: Close an enquiry as lost, reopen it, confirm it returns to the
board with its earlier history intact and the reopening recorded.

**Acceptance Scenarios**:

1. **Given** an enquiry closed as lost, **When** it is reopened, **Then** it returns
   to the board in an open stage and the reopening appears in its history.
2. **Given** an enquiry that was converted, **When** reopening is attempted, **Then**
   the system refuses, because the pupil already exists.

---

### Edge Cases

- An enquiry arrives from an adult enrolling themselves, with no child named. The
  pupil account is created in the enquirer's own name and no guardian is linked.
- The address offered for the new pupil already belongs to an account. Conversion is
  refused rather than silently attaching the enquiry to a stranger.
- The contact address and the pupil address are the same. One account is created,
  not a guardian linked to themselves.
- The course of interest is deleted between the enquiry and the conversion. The
  pupil is still created; the enrolment is skipped rather than the conversion failing.
- A member of staff who owned enquiries leaves the school. Their enquiries remain and
  can be reassigned; they do not disappear with the account.
- Reminders are still open on an enquiry that is then closed. Closing must not leave
  reminders that will later notify somebody about work that no longer exists.

## Requirements *(mandatory)*

### Functional Requirements

**Recording and working an enquiry**

- **FR-001**: The system MUST let school staff record an enquiry with, at minimum,
  the name of the person who made contact; an address, a telephone number, the
  prospective pupil's name, a course of interest, a source and an owner are optional.
- **FR-002**: The system MUST track each enquiry through an ordered set of stages
  covering: newly arrived, contacted, trial arranged, trial completed, enrolled and
  lost.
- **FR-003**: The system MUST refuse to close an enquiry as lost without a stated
  reason.
- **FR-004**: The system MUST refuse to mark an enquiry as enrolled other than by
  converting it, so the enrolled count always corresponds to real pupils.
- **FR-005**: The system MUST keep an append-only history for each enquiry recording
  its creation, every stage change, notes and calls logged by staff, and its
  conversion. Staff MUST NOT be able to author the entries the system writes for
  itself.
- **FR-006**: The system MUST show open enquiries grouped by stage, and MUST exclude
  enrolled and lost enquiries from that view unless they are explicitly requested.
- **FR-007**: Users MUST be able to find an enquiry by the contact's name, the
  pupil's name, the address or the telephone number.

**Turning an enquiry into a pupil**

- **FR-008**: The system MUST convert an enquiry into a pupil account in one action.
- **FR-009**: When the enquiry carries a contact address that differs from the
  pupil's, the system MUST create a guardian account and link it to the pupil. The
  link MUST be made by the school, never asserted by the guardian.
- **FR-010**: The system MUST enrol the new pupil in the course of interest when one
  is recorded.
- **FR-011**: The system MUST refuse to convert an enquiry twice, and MUST refuse to
  convert onto an address that already has an account.
- **FR-012**: On conversion the system MUST email each new account holder — the
  pupil, and the guardian when one was created — a single-use invitation link they
  use to set their own password. The school MUST NOT have to hand over or store a
  password for a family.
  *Decision, 2026-08-16: the shipped behaviour creates both accounts with a random
  password and sends nothing. A family can technically reach the account through
  "forgot password", but nobody ever invites them there, and mail may be off. An
  invitation was chosen over the office setting a password so a child's credentials
  never sit in a school's chat history.*

**Following up**

- **FR-013**: Users MUST be able to set a reminder against an enquiry with a title, a
  due date and an assignee, and mark it done.
- **FR-014**: The system MUST notify the assignee once when a reminder falls due, and
  MUST NOT repeat that notification on subsequent days while the reminder stays open.
- **FR-015**: When a due reminder has no assignee, the system MUST notify the
  school's administrators rather than nobody.
- **FR-016**: The system MUST reach the assignee by email as well as inside the
  product, so a reminder does not depend on somebody being signed in that day.

**Capture from the school's website**

- **FR-017**: The system MUST give each school its own public enquiry page at an
  address the school can link to from its site, social profile or advertising.
  Enquiries submitted there MUST appear on that school's board with the website
  recorded as their source.
  *Decision, 2026-08-16: a page we host, not a script the school embeds. A hosted
  page keeps the markup, the spam handling and the six locales ours, and needs no
  developer at the school; an embeddable widget drags in cross-origin rules, the
  content policies of sites we do not control, and script versioning we would have
  to support forever.*
- **FR-018**: The system MUST rate-limit public submissions so the board cannot be
  flooded.
- **FR-019**: Public submission MUST answer identically whether or not that address
  has enquired before, so it cannot be used to discover who has been in touch.

**Reopening**

- **FR-020**: Users MUST be able to reopen an enquiry closed as lost, returning it to
  an open stage with its history intact and the reopening recorded.
- **FR-021**: The system MUST refuse to reopen an enquiry that has been converted.

**Reporting**

- **FR-022**: The system MUST report, for a chosen period: how many enquiries
  arrived, how many were enrolled, how many were lost, the conversion rate, a
  breakdown by source, and how long first contact typically took.

**Access and isolation**

- **FR-023**: Only school administrators MUST be able to see or change the pipeline.
  Teachers, pupils and guardians MUST NOT.
- **FR-024**: Every identifier arriving with a request — the enquiry, the course of
  interest, the owner, the assignee — MUST be validated against the caller's school
  before it is used.
- **FR-025**: An enquiry belonging to another school MUST be indistinguishable from
  one that does not exist.

**Behaviour under test**

- **FR-026**: The board MUST be covered by an end-to-end journey that records an
  enquiry, moves it and converts it through the interface a person actually uses.
- **FR-027**: Every guard in FR-023 to FR-025 MUST be demonstrated failing against
  the unguarded behaviour before it is considered proven.

### Key Entities

- **Enquiry**: One request about a place. Holds who made contact and how to reach
  them, who would attend, what they asked about, where it came from, who is carrying
  it, its stage, and — once closed — either the pupil it produced or the reason it
  did not.
- **Enquiry history entry**: One thing that happened to an enquiry, in order: it
  arrived, it moved, somebody rang, somebody wrote, it converted. Append-only.
- **Reminder**: A piece of follow-up owed on an enquiry by a named person by a named
  date, open until completed.
- **School**: The tenant. Every enquiry, history entry and reminder belongs to
  exactly one and is invisible outside it.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An office worker can record a new enquiry in under 30 seconds from
  opening the product, without training.
- **SC-002**: No enquiry passes its follow-up date without the person responsible
  being told, whether or not they opened the product that day.
- **SC-003**: Converting an enquiry produces a pupil who can be taught the same day:
  the account exists and can be signed into, the guardian can see it, and the pupil
  is in the right course without further data entry.
- **SC-004**: A school can state its conversion rate and its best-performing source
  for any month without leaving the product or exporting anything.
- **SC-005**: Zero enquiries from one school are reachable by another, including by
  guessing identifiers rather than following links.
- **SC-006**: A returning family is worked as one enquiry with one history, not two
  records, so the funnel's numbers stay true.

## Assumptions

- One enquiry means one prospective pupil. A parent asking about two children makes
  two enquiries; separating contacts from deals is deliberately out of scope at this
  size, and adding it would be a different feature.
- The office, not the teaching staff, works the pipeline. Teachers get pupils, not
  enquiries.
- Reminder emails go through the school's existing mail setup; no new provider is
  assumed.
- The funnel exists to end inside the LMS with an enrolled pupil. Anything serving a
  general-purpose sales process — deal values, forecasting, custom fields, email
  sequences — is out of scope by intent, not by omission.
- Reporting covers the school's own pipeline. Cross-school comparison is not a
  tenant-facing feature.

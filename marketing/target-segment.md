# Target Segment — Small Private Schools and Learning Centres

*Written 2026-08-17. Replaces the 2026-04-10 recommendation, archived at
[`archive/target-segment-2026-04.md`](archive/target-segment-2026-04.md) with a
note on why it died.*

Every claim here names the file that backs it. The version this one replaces is
the reason: it recommended a segment whose central asset had been deleted, and it
credited the sandbox with 37 languages when it runs five. A positioning document
nobody can check decays into a wish list.

## The decision

Fixed by the owner on 2026-08-14:

- **Who.** Small private schools and learning centres, 10–300 students, teaching
  programming, mathematics or languages. EU and US, selling in English.
- **What they get in one place.** Teaching, school operations, and payment.
- **Goal for the next two to three months.** One paying customer — not a pilot in
  exchange for a testimonial.

## Why this frame holds

From the competitor review of 2026-08-14. Prices are as recorded there, not
re-checked here.

| They | What they do | What they leave undone |
|---|---|---|
| Codio, CodeHS | Auto-grade code | No school operations: no roster, no attendance, no invoicing |
| TutorCruncher (£25–200/mo), Teachworks | Run the operations | No teaching at all — no lessons, no exercises, no marking |
| Teachable, Thinkific | Sell courses | Do not run a school; a course buyer is not a pupil with attendance and a parent |
| Moodle, Google Classroom | Free | And in being free they set the price of "just an LMS" to zero |
| Импульс | All three together | Russia only |

The overlap — teaching plus operations plus money — is unoccupied in the EU and
US. That is the basis of the frame and also its risk: an unoccupied overlap can
mean nobody wants it. Ф0-7 exists to test that before more code is written.

## Who buys (ICP)

| | |
|---|---|
| **Decision maker** | The owner or centre director. One person, not a committee |
| **Size** | 10–300 pupils; 2–20 teachers |
| **Subjects** | Programming, mathematics, languages — anything a server can mark |
| **Who pays us** | The school, from operating budget, monthly |
| **Who pays the school** | Parents, monthly or per term — which is why parent-visible progress sells |
| **Decision cycle** | Days to three weeks. The owner can approve a subscription the same day |
| **What they run today** | Google Classroom or Moodle for teaching, a spreadsheet and WhatsApp for operations, bank transfers for money |

Two consequences worth stating. The pitch goes to a person who feels the
operational pain personally, not to a procurement process. And because parents
pay the school, anything that cuts "how is my child doing?" phone calls is worth
money to the buyer directly.

## Three differences a stranger can check in 60 seconds

Each verified against the code on 2026-08-17, with the count measured rather than
quoted.

**1. The server marks the work, and a stranger can watch it happen.**
`ExerciseType` in [`backend/app/exercises/models.py`](../backend/app/exercises/models.py)
holds **26** types; `EXERCISE_TYPES_META` in
[`frontend/src/lib/api/exercises.ts`](../frontend/src/lib/api/exercises.ts) holds
the same 26. The server marks all of them except `file_upload`, which goes to a
teacher by design ([`service.py:596`](../backend/app/exercises/service.py),
[`service.py:1120`](../backend/app/exercises/service.py)). No account needed to
see it: the landing page runs a real submission through
`POST /api/v1/sandbox/demo/check`, where the expected answers stay on the server
and never reach the browser. The journey
[`landing-demo.spec.ts`](../frontend/e2e/journeys/landing-demo.spec.ts) signs in
nowhere and fails unless the server actually answers — which matters, because the
previous landing demo faked the run.

**2. A tutor that answers inside the lesson.** `POST /api/v1/tutor`, mounted at
[`main.py:525`](../backend/app/main.py), reached from
[`ask-widget.tsx`](../frontend/src/components/lesson/ask-widget.tsx). It calls an
external model provider (`config.llm_base_url`); the Terms were corrected in PR
#284 to say so, after claiming the opposite. Say "an AI tutor on the lesson",
never "self-hosted".

**3. Parents see progress without ringing the office.** `/api/v1/parent`
([`main.py:499`](../backend/app/main.py)) with pages under
`frontend/src/app/(dashboard)/parent/`, including a per-child view.

## What we do not promise

- Not a university LMS. No SSO, no SIS integration, no six-month procurement.
- Not corporate training. No compliance certificates, no SCIM.
- Not a Moodle replacement for an institution already running Moodle well.
- Not a course marketplace. We do not bring the school its pupils.

## Objections, and what is true

| "…" | Answer |
|---|---|
| **"We already have Google Classroom."** | Keep it for handouts. Classroom does not mark a coding exercise, does not turn attendance into an invoice, and does not show a parent their child's progress. The question is not which LMS — it is who does the marking and the admin |
| **"Are you even a real company?"** | Fair, and the honest answer today is: one developer, a product in production since March 2026, no outside funding. There are no logos on the site because there are no customers to name. What can be checked instead is the product — the demo marks real code without an account |
| **"What if you shut down?"** | Full export of courses, pupils and grades (`app/export`). Nothing is held hostage. This answer has to stay true; if export breaks, the line becomes a lie |
| **"Children's data."** | Hosted in the EU (Hetzner, Helsinki). Per-school isolation is a rule with tests behind it, not a convention — `.specify/memory/constitution.md`, principle I. The GDPR pages are current as of PR #284 |
| **"How long does moving cost us?"** | Unknown, and we will not invent a figure. Ф3-1 exists to make a 15-minute onboarding real and measured; until it ships, the honest answer is "we do the first school by hand, with you" |

## Still open

- **Ф0-3 — the promise line and its subheads.** Deliberately not drafted here.
  The copywriting process wants a brief agreed with the owner first, and this is
  the text every other page inherits.
- **Ф0-6 — the list of 50 targets.** Compiling named owners across sources is the
  one task here not to start unasked; how that list is built needs the owner's
  decision.
- **Ф0-7 — three conversations.** The owner's to have. If the pain turns out to
  be a different one, this document is what gets rewritten.

## Numbers used here, and where they were measured

| Claim | Source | Checked |
|---|---|---|
| 26 exercise types | `ExerciseType` enum; `EXERCISE_TYPES_META` | 2026-08-17, both agree |
| All but `file_upload` marked by the server | `exercises/service.py` dispatch | 2026-08-17 |
| 5 sandbox languages | `sandbox/languages.py` | Corrected from "37" in PR #284 |
| Tutor calls an external provider | `config.llm_base_url` | 2026-08-17 |
| EU hosting | Hetzner, Helsinki | Root `CLAUDE.md` |

The 2026-04 version died because nobody re-checked it against the product. When a
number here stops matching the code, the defect is in this file.

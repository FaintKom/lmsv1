# Phase 1 — Interface contracts: school enquiry pipeline

Only what changes. The thirteen operations shipped in v1 keep their shapes; this lists
what is added or altered, and what each one must refuse.

Times are ISO-8601 UTC throughout (`2026-03-02T10:00:00+00:00`).

## Public — no authentication

### `GET /api/v1/crm/public/{org_slug}`

Enough to render the school's enquiry page: display name and, when the school has
published courses, their titles for an optional "what are you interested in" field.

- Unknown slug → 404.
- An inactive school → 404. A school that has stopped paying does not keep collecting
  enquiries.
- Returns nothing about pupils, staff or existing enquiries.

### `POST /api/v1/crm/public/{org_slug}/enquiries`

| Field | Required | Notes |
|---|---|---|
| `contact_name` | yes | ≤ 255 chars |
| `contact_email` | no | one of email or phone must be present, or the school cannot reply |
| `contact_phone` | no | ≤ 50 chars |
| `student_name` | no | ≤ 255 chars |
| `interest_course_id` | no | must belong to this school; otherwise ignored rather than rejected |
| `interest_note` | no | ≤ 500 chars |

- Creates a lead in stage `new` with `source = "website"` and no owner.
- **Rate-limited by IP.** Over the limit → 429.
- **Always answers identically** — same status, same body — whether the address is new,
  has enquired before, or the school has a hundred open enquiries. The response carries
  no id and no count. Nothing here may be used to discover who has been in touch
  (FR-019).

## Authenticated — school administrators only

Everything below refuses teachers, pupils and guardians with 403, and treats another
school's rows as 404.

### `POST /api/v1/crm/leads/{lead_id}/reopen`

Returns a lost enquiry to `contacted`, records a `reopened` history entry, and keeps
`lost_reason` as the record of why it was lost the first time.

- Lead in stage `won` → 400. The pupil already exists.
- Lead in any open stage → 400. There is nothing to reopen.

### `GET /api/v1/crm/report`

Query: `from`, `to` (dates, inclusive; default the last 30 days).

Returns for that window: enquiries received, enrolled, lost, still open, the conversion
rate among those closed, a breakdown by source, and the median time to first contact in
hours.

- A range where `to` precedes `from` → 422.
- A range longer than 366 days → 422, matching the journal export's cap.
- An empty window returns zeroes and a null median, never an error — an empty report is
  a legitimate answer.

### `POST /api/v1/crm/leads/{lead_id}/convert` — changed

Unchanged in shape. Two additions to behaviour:

- Each created account is issued a single-use invitation whose link resolves to the
  existing password-reset page.
- The response reports whether invitations were actually sent, so the office learns
  immediately that mail is off rather than assuming a family was contacted.

## Background behaviour — changed

### Daily reminder sweep

- A due reminder with **no assignee** notifies the school's administrators instead of
  nobody (FR-015).
- Every notified reminder is also emailed to its recipient (FR-016).
- Still exactly once per reminder: `notified` is set in the same transaction, so a
  reminder left open for a week does not notify every morning.
- A reminder whose lead has since been closed is not notified about at all; it belongs
  to work that no longer exists.

## Email — new templates

| Template | To | Contains |
|---|---|---|
| Account invitation | the new pupil, and the guardian when one was created | who invited them, the school's name, a single-use link to set a password, and when it expires |
| Reminder due | the assignee, or the school's admins when unassigned | the reminder's title, the enquiry's contact name, and a link to the board |

Both go through the existing queued sender, which swallows delivery failures so a dead
relay cannot fail a conversion or wedge the nightly job.

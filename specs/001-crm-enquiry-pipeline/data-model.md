# Phase 1 — Data model: school enquiry pipeline

**No migration is required by this plan.** Everything below either already exists or
is a string added to a Python tuple. That is the headline: the remaining work changes
behaviour, not storage.

## Existing, unchanged

### `crm_leads` — one enquiry

| Field | Notes |
|---|---|
| `org_id` | The tenant. Every read and write filters on it. |
| `contact_name` | Required. The adult who made contact. |
| `contact_email`, `contact_phone` | Optional. |
| `student_name` | Optional; falls back to the contact's name at conversion. |
| `interest_course_id` | Optional, validated against the org. |
| `interest_note` | Optional free text. |
| `stage` | One of `LEAD_STAGES`. Plain varchar, not a PG enum. |
| `source` | One of `LEAD_SOURCES`, or null. |
| `owner_id` | Staff of this school, validated. |
| `lost_reason` | Required to close as lost. **Kept on reopen.** |
| `converted_student_id`, `converted_at` | Set once, by conversion only. |

### `crm_lead_events` — append-only history

`lead_id`, `author_id`, `kind`, `body`, `created_at`. Indexed on
`(lead_id, created_at)`, which is what the time-to-first-contact query reads.

### `crm_tasks` — reminders

`lead_id`, `org_id`, `assignee_id`, `title`, `due_at`, `done_at`, `notified`.
Indexed on `(due_at, done_at)`, which the daily sweep reads.

### Reused from elsewhere

- `password_reset_tokens` — `user_id`, `token`, `expires_at`, `used`. Carries the
  conversion invitation; see research §1.
- `organizations.slug` — addresses a school's public enquiry page; see research §2.

## Changed: vocabulary only

Both are Python tuples in `app/crm/models.py`, so neither costs a migration.

- `EVENT_KINDS` gains `reopened`.
- `LEAD_SOURCES` already contains `website`; the public page writes that value rather
  than introducing another.

## State transitions

```
                 ┌──────────── reopened ────────────┐
                 ▼                                  │
new ──▶ contacted ──▶ trial_scheduled ──▶ trial_done │
 │           │               │                │     │
 └───────────┴───────────────┴────────────────┴──▶ lost (reason required)
                                              │
                                              └──▶ won  (conversion only)
```

Rules the transitions must enforce, all already specified:

- `won` is reachable **only** through conversion (FR-004). Setting it by hand is
  refused, or the enrolled count stops meaning anything.
- `lost` requires a reason (FR-003).
- `lost → open` is allowed and recorded (FR-020); `won → anything` is not (FR-021),
  because the pupil already exists.
- Any stage may move to any other open stage. A school that arranges a trial before it
  ever records reaching the family is not doing anything wrong, and a pipeline that
  argues about it is a pipeline people work around.

## Derived values — computed, never stored

| Value | Derivation |
|---|---|
| Enquiries received in a period | `crm_leads` where `created_at` falls in range |
| Enrolled / lost in a period | as above, filtered by terminal stage |
| Conversion rate | enrolled ÷ (enrolled + lost) among enquiries closed in range |
| By source | the same set grouped by `source`, nulls counted as unknown |
| Time to first contact | per lead, the earliest `crm_lead_events.created_at` whose kind marks contact (`call`, `email`, or a stage change into `contacted`) minus the lead's `created_at`; reported as a median, so one forgotten enquiry does not distort it |

## Validation rules carried over

- Every incoming id — lead, course, owner, assignee — is checked against the caller's
  school before use (FR-024).
- Another school's lead is a 404, never a 403 (FR-025).
- A contact address equal to the pupil address creates one account, not a guardian
  linked to themselves.
- Conversion refuses an address that already has an account, and refuses to run twice.

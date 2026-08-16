# Phase 0 — Research: school enquiry pipeline

Every question below was answered by reading the code rather than by assuming,
because the point of this pass is to avoid building what already exists.

## 1. How does a converted family get into their account? (FR-012)

**Decision**: reuse `PasswordResetToken` and the existing `POST /auth/reset-password`.
Conversion issues a token per new account with a longer expiry than an ordinary
reset, and sends an invitation email whose link points at the existing reset page.

**Rationale**: an invitation *is* "set your password from a single-use link", which is
the flow already built, tested and deployed. `PasswordResetToken` carries exactly the
fields needed — `user_id`, `token`, `expires_at`, `used`. Nothing new is stored and no
new endpoint is exposed; only an email template and the call that issues the token are
new.

**Alternatives considered**:

- A separate invitation table: a second table with identical columns and the same
  lifecycle, to express a difference that only shows up in the wording of one email.
  Rejected against Principle V.
- Reusing `ParentConsentToken`: that one carries consent semantics — it activates a
  minor's account and records who attested it. Overloading it would confuse a legal
  record with a convenience.
- The office setting a password at conversion: rejected in the spec, because a child's
  credentials would then live in the school's chat history.

**Open risk**: invitations depend on outbound mail. `EMAIL_ENABLED` is off by default
and `queue_email` swallows SMTP failures by design, so a school with no mail configured
would convert an enquiry and silently invite nobody. The plan therefore surfaces mail
state to the person converting rather than assuming it works.

## 2. Where does the public enquiry page live? (FR-017)

**Decision**: a page hosted by us at `/s/{org-slug}/enquire`, backed by one public
endpoint. Schools are addressed by the `slug` already on `organizations`.

**Rationale**: the spec chose hosted over embedded. `organizations.slug` already
exists, is unique, and is generated on creation, so the addressing key needs no new
data. The waitlist endpoint is the working precedent for a public, rate-limited,
enumeration-safe write.

**Alternatives considered**:

- Reusing `app/sites`: investigated and rejected — despite the name, `sites` models a
  school's *physical branches*, not web pages. No public page mechanism exists in the
  product today.
- Reusing the waitlist table: that is the platform's own funnel, has no `org_id`, and
  is super-admin-only. Mixing a tenant's prospects into it would break isolation.

## 3. How is spam handled on a public write?

**Decision**: rate-limit by IP through the existing `slowapi` limiter, cap field
lengths, and answer identically for every submission. No CAPTCHA.

**Rationale**: matches the waitlist, which has run publicly without one. A CAPTCHA is a
third-party dependency and a consent question in the EU; adding one before there is
evidence of abuse would be building for an imagined problem.

**Alternatives considered**: a CAPTCHA, and an email-confirmation round trip before the
enquiry appears. Both make the school wait for a lead a human is about to ring anyway.

## 4. Where do funnel numbers come from? (FR-022)

**Decision**: compute from existing rows. Counts and conversion rate come from
`crm_leads` filtered by `created_at`; time to first contact comes from the earliest
`crm_lead_events` row for a lead whose kind marks contact.

**Rationale**: the history is already append-only and already indexed by
`(lead_id, created_at)`. A denormalised `first_contact_at` column would be faster and
would need a migration, a backfill, and a second place to keep correct. At 10–300 pupils
per school the aggregate is small. If it ever hurts, denormalise then.

**Alternatives considered**: a `first_contact_at` column on the lead; a nightly rollup
table. Both premature.

## 5. What does reopening need? (FR-020)

**Decision**: a stage change back to an open stage, plus a new `reopened` history kind.
The original reason for losing it is kept rather than cleared.

**Rationale**: `EVENT_KINDS` and `LEAD_STAGES` are Python tuples of strings, not
PostgreSQL enums — deliberately, so adding a value costs nothing. Keeping the old
reason preserves why it was lost the first time, which is the entire argument for
reopening rather than duplicating.

## 6. Does any of this need a migration?

**Decision**: no. Not one of the six requirements changes the schema.

**Rationale**: invitations reuse an existing table; the public page reuses
`organizations.slug` and writes an ordinary lead; reminders by email add a template, not
a column; reporting is computed; reopening adds string values to Python tuples.

Worth stating explicitly, because it is the strongest signal that the v1 model was
shaped correctly — and because a plan that needs no migration cannot break production
data.

## 7. What must the tests do that they do not today?

**Decision**: the board gets an end-to-end journey, and every new guard is demonstrated
failing before it is trusted.

**Rationale**: Principle II, plus recent evidence — the class journal and the mobile
chrome both shipped broken behind green backend suites because no browser ever exercised
them. The CRM board is 400 lines of untested UI in exactly that shape.

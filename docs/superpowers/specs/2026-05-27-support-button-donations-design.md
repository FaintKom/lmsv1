# Support button + Open Collective donations

**Status:** Draft
**Date:** 2026-05-27
**Author:** faintkom
**Related memory:**
- `~/.claude/projects/F--lms/memory/project_monetization_status.md`
- `~/.claude/projects/F--lms/memory/user_turkey_residence_status.md`
- `~/.claude/projects/F--lms/memory/user_identity_banking.md`

## Goal

Add a "Support GrassLMS" button for teachers and administrators that opens a
donation flow backed by Open Collective. This is a clean donation bridge for
the period before Georgia IE registration enables Stripe / Paddle integration.
No quid pro quo: donations do not unlock features or tiers.

## Constraints

1. **Turkey tourist ikamet** — owner cannot legally accept service income in
   Turkey as an individual. Donations through an EU/UK fiscal host are the
   only safe interim channel.
2. **Wise unavailable in Turkey** — Wise only supports outbound sends from
   Turkish residents. Hold / receive / card / assets are not available.
   Payouts must use SWIFT directly to the owner's VakıfBank USD/EUR foreign
   currency account (döviz hesabı), which already exists.
3. **Payoneer not used** — owner reports it does not work practically in
   Turkey for receiving funds.
4. **PayPal unavailable** — Turkey receiving has been banned since 2016.
5. **Audience is EU + US English speakers** — primary copy is English.
6. **Proprietary license** — Open Source Collective (OSC) cannot host this.
   Fiscal host must accept non-OSS projects (candidates: All for One, Open
   Collective Europe).

## Architecture

```
Teacher / Admin
    │ clicks "☕ Support" in sidebar
    ▼
/support  (Next.js route, dashboard layout)
    │ chooses amount + recurrence + optional fields
    │ POST /api/v1/donations/initiate
    ▼
backend/app/donations
    │ OC GraphQL: createOrder mutation
    ▼
Open Collective payment (host's Stripe)
    │ donor enters card in OC-hosted popup or redirect
    ▼
OC webhook → POST /api/v1/donations/webhook
    │ HMAC verify, update donation row, mark confirmed
    ▼
frontend polls or listens → /support/thanks

[once per month / when threshold reached]
    │ owner submits expense claim on Open Collective
    ▼
fiscal host → SWIFT → VakıfBank USD döviz hesabı
    │ TVBATR2AXXX, owner's IBAN
    ▼
optional conversion to TRY at VakıfBank rate
```

## Decisions

### Platform
- **Donation platform:** Open Collective (OC)
- **Fiscal host:** All for One (UK) or Open Collective Europe (Brussels) —
  confirm during setup which accepts proprietary EdTech.
- **Payout channel:** SWIFT from fiscal host bank account to owner's
  VakıfBank USD or EUR foreign currency account.
- **Payout threshold:** USD 200 minimum per expense claim. SWIFT fees
  (~USD 20–40 per transfer) stay below 20% of payout.
- **Payout cadence:** monthly or on-demand when threshold reached.

### Future channel (out of scope for v1, design-compatible)
- **GitHub Sponsors** can be linked to the same OC Collective so that
  sponsors on GitHub flow into the same backend and same SWIFT payout. This
  requires a public maintainer profile / repository and adds no in-LMS code.
  Plan to enable after the OC Collective is live and the repository is
  confirmed public.

### Button placement
- New item in `adminNav` only (`isAdminOrTeacher === true`), including
  super-admin. Not shown to students or parents.
- Position: bottom of `adminNav`, just before settings.
- Icon: `Heart` from lucide-react.
- Label key: `nav.support` (English: "Support").
- Links to `/support`.

### Page UX (/support)
1. **Hero**
   - Title: "GrassLMS is free. Support its development."
   - Subtitle: "Built and maintained by one person. No paid plans yet."
2. **Donation form card**
   - Recurrence toggle: One-time | Monthly (One-time default)
   - Amount grid: $5, $10, $15, $50, custom input
   - Optional fields: donor name, email, message
   - Anonymous checkbox: when checked, donor name and email are omitted from the `createOrder` payload and from the `/support/thanks` screen
   - Primary CTA: "Continue to payment →"
   - Below CTA: small text "Payment is securely handled by Open Collective."
3. **Where the money goes**
   - Plain text section, no figures:
     - Server infrastructure (Hetzner VPS, AI services, domain)
     - Maintainer time (the person who builds and supports this)
   - Avoid explicit personal-expense framing to keep the tax framing as
     project support rather than personal income.
4. **Footer note**
   - "Full transparency: see all donations on Open Collective →" linking
     out to `https://opencollective.com/grasslms`.

### Donor wall
- **Not displayed in LMS.** OC's public ledger is the canonical record.
  Link out for full transparency.

### Thank-you page (/support/thanks)
- Hero: "Thank you for supporting GrassLMS."
- Subtext referencing donor name if not anonymous.
- Buttons: "Back to dashboard", "View collective on Open Collective".
- No analytics-driven upsell or social-share prompts in v1.

### `/pricing` page
- Delete `frontend/src/app/pricing/page.tsx` and any helper imports it
  uniquely owns.
- Remove `pricing.*` keys from all six locales in `translations.ts`.
- Add redirect `/pricing → /` (302) in `next.config.ts` to handle stale
  external links.
- Backend endpoint `/api/v1/billing/plans` remains for now (used by
  internal admin flows if any). If unused, mark for removal in follow-up.

### i18n
- Six locales must stay in parity: `en, es, ru, tr, de, uk`.
- English is canonical. Other locales get a real translation, not stubs.
- Translation keys added under `support.*` namespace in all six locale
  sections of `src/lib/i18n/translations.ts`.
- Vitest parity test must continue to pass.

## Backend module: `app/donations`

### Files
```
backend/app/donations/
    __init__.py
    models.py
    schemas.py
    service.py        # OC GraphQL client + webhook handler
    router.py
    config.py         # OC env variables
backend/alembic/versions/<rev>_add_donations_module.py
backend/tests/test_donations.py
```

### Donation model
| Column           | Type                      | Notes                              |
|------------------|---------------------------|------------------------------------|
| id               | UUID PK                   |                                    |
| oc_order_id      | str, unique, nullable     | Filled after OC createOrder        |
| amount_cents     | int                       | Stored in cents to avoid float     |
| currency         | str(3)                    | "USD" for v1                       |
| recurrence       | enum                      | `one_time`, `monthly`              |
| donor_name       | str(120), nullable        | Null if anonymous                  |
| donor_email      | str(255), nullable        | Stored for receipt lookup          |
| message          | text, nullable            |                                    |
| anonymous        | bool                      |                                    |
| status           | enum                      | `pending`, `confirmed`, `failed`   |
| created_at       | timestamptz default now() |                                    |
| confirmed_at     | timestamptz, nullable     |                                    |
| raw_webhook      | jsonb, nullable           | Last webhook payload for debugging |

### Endpoints
- `POST /api/v1/donations/initiate` — public, no auth.
  Body: `{ amount_cents, recurrence, donor_name?, donor_email?, message?,
  anonymous }`. Returns `{ donation_id, oc_checkout_url }`.
- `POST /api/v1/donations/webhook` — OC calls this on order updates.
  Verify HMAC signature against `OC_WEBHOOK_SECRET` env var.
- `GET /api/v1/donations/stats` — optional aggregate counter for future
  use; returns `{ total_confirmed_usd, donor_count }`. Not used by v1 UI
  but cheap to build now.

### OC integration
- GraphQL endpoint: `https://api.opencollective.com/graphql/v2`
- Required env vars:
  - `OC_API_TOKEN` — personal API token (server-side only)
  - `OC_WEBHOOK_SECRET` — HMAC secret configured in OC webhook settings
  - `OC_COLLECTIVE_SLUG` — e.g. `grasslms`
- Client: `httpx.AsyncClient`, follow project async pattern.
- Mutation: `createOrder` with `amount`, `frequency` (`ONETIME` or
  `MONTHLY`), `fromAccount` (guest), `tier` (none for v1), `paymentMethod`
  (STRIPE), redirect URLs (success → `/support/thanks?d={id}`).

### Security
- Webhook endpoint MUST verify HMAC. Reject on mismatch.
- `/initiate` is unauthenticated by design — rate-limit per IP at nginx
  (10 requests / minute) and at the FastAPI layer (use existing
  rate-limit middleware).
- Donor email is PII — exclude from logs, exclude from `GET /stats`.
- No card data ever touches our infrastructure (PCI scope = none).

## Frontend changes

### New files
```
frontend/src/app/(dashboard)/support/page.tsx
frontend/src/app/(dashboard)/support/thanks/page.tsx
frontend/src/lib/api/donations.ts
frontend/src/components/support/donation-form.tsx
frontend/src/components/support/where-money-goes.tsx
frontend/src/components/support/donation-form.test.tsx
```

### Modified files
- `src/components/layout/sidebar.tsx` — add `Support` item in `adminNav`.
- `src/lib/i18n/translations.ts` — add `nav.support` + `support.*` keys in
  six locales; remove `pricing.*` keys.
- `next.config.ts` — add `/pricing` → `/` redirect.

### Deleted files
- `frontend/src/app/pricing/page.tsx`

### Form behaviour
- `react-hook-form` with `zod` schema.
- Amount min: 100 cents (USD 1.00). Max: 1000000 cents (USD 10000).
- Suggested amounts grid: $5, $10, $15, $50 (mirrors OC Supporter tier).
- On submit: call `donations.initiate()` → open `oc_checkout_url` in a
  popup with `window.open(url, "oc_checkout", "width=480,height=720")`.
- Poll `/api/v1/donations/{id}` every 2 s for up to 10 minutes; on
  `confirmed` redirect to `/support/thanks?d={id}`. On popup close
  without confirmation, show "Did your payment go through?" message with
  a manual link to the OC page.

## Error handling

| Scenario                              | Handling                                              |
|---------------------------------------|-------------------------------------------------------|
| OC API unreachable in `initiate`      | 503, show toast "Donation service unavailable"        |
| OC returns validation error           | 400 with mapped message                                |
| Webhook HMAC mismatch                 | 401, log warning with source IP, don't update         |
| Webhook for unknown `oc_order_id`     | 200 ack (idempotent), log info                         |
| Popup blocked by browser              | Show fallback inline link "Open donation page"        |
| Polling timeout                       | "Did your payment go through?" UI with manual recheck |
| Donor closed popup before paying      | Donation row stays `pending`; cleanup job after 24h   |

## Testing

- **Backend**: pytest in `backend/tests/test_donations.py`
  - `initiate` happy path (mocked OC client)
  - `initiate` rate-limit triggers 429
  - `webhook` HMAC valid → marks confirmed
  - `webhook` HMAC invalid → 401, no DB write
  - `webhook` duplicate event → idempotent
  - `stats` aggregates only confirmed donations
- **Frontend**: vitest in `donation-form.test.tsx`
  - Renders all amount options
  - Custom amount min/max validation
  - Toggle between one-time and monthly
  - Anonymous checkbox hides name/email submission
  - Submit triggers initiate API and opens popup
- **E2E** (optional, deferred to follow-up): Playwright flow without
  actually completing OC payment.

## Out of scope (follow-ups)

- GitHub Sponsors linking to the same OC Collective.
- Embedded card entry on grasslms.online (PCI SAQ-A would be required).
- Donor wall UI in LMS.
- Monthly receipt emails.
- Localised currency display (currency stays USD in v1).
- Remove `/api/v1/billing/plans` backend endpoint once confirmed unused.
- Crypto donation channel.

## Setup checklist (outside code)

1. Register Open Collective account with owner's email.
2. Create Collective named "GrassLMS".
3. Submit to fiscal host (All for One first, then Open Collective Europe
   if rejected). Provide proprietary-license framing as "EdTech tooling
   for educators".
4. After host approval, add SWIFT details for VakıfBank USD account as
   payout method on the Collective.
5. Generate OC personal API token; configure webhook secret in OC settings;
   set webhook URL to `https://grasslms.online/api/v1/donations/webhook`.
6. Set env vars on backend container:
   `OC_API_TOKEN`, `OC_WEBHOOK_SECRET`, `OC_COLLECTIVE_SLUG=grasslms`.
7. Verify a $1 test donation end-to-end before announcing.
8. Optional: enable GitHub Sponsors with OC Collective as recipient once
   repository is confirmed public.

## Open questions

- All for One vs Open Collective Europe — which accepts proprietary EdTech
  fastest? Resolve during host application step (#3).
- Should `/api/v1/billing/plans` be deleted now? Investigate any callers
  during implementation. Default: keep, mark with TODO.
- VakıfBank SWIFT routing details (IBAN, BIC) — owner to provide during
  host onboarding.

# Data Processing Agreement (DPA)
### Art. 28 GDPR — Processor Agreement between GrassLMS and the School/Course Provider

> **STATUS: TEMPLATE.** This is a practical, GDPR Art. 28–structured starting
> point, **not legal advice**. Before signing with a German institution, have it
> reviewed by a data-protection lawyer (a German *Auftragsverarbeitungsvertrag /
> AVV* is provided in section B below). Fill every `[PLACEHOLDER]`.

---

## A. English version (operative)

**This Data Processing Agreement ("DPA")** forms part of the Terms of Service
between:

- **Controller:** `[SCHOOL / COURSE PROVIDER LEGAL NAME]`, `[ADDRESS]`
  ("the Customer"), and
- **Processor:** GrassLMS, operated by `[YOUR LEGAL NAME — see owner records]`,
  `[ADDRESS]` ("GrassLMS").

The Customer is the **controller** of the personal data of its students and
staff. GrassLMS acts as **processor** on the Customer's documented instructions.

### 1. Subject matter, nature and purpose
GrassLMS provides a hosted learning-management platform. Processing is limited to
what is necessary to deliver that service: account management, course delivery,
assignment submission and grading, progress analytics, and communications.

### 2. Duration
This DPA runs for the duration of the service relationship. On termination,
section 9 (deletion/return) applies.

### 3. Type of personal data
- Identity & account: name, email, role, hashed password, locale.
- Educational records: enrolments, submissions, grades, progress, certificates,
  discussion posts, attendance.
- Technical: IP address, request logs, session/refresh tokens.
- **Children's data:** where students are minors, the above is processed only
  after the Customer has obtained verifiable parental consent (see section 7).

### 4. Categories of data subjects
Students (including minors), teachers, methodists, administrators, and — where
applicable — parents/guardians.

### 5. Controller (Customer) obligations
- Establish a lawful basis (Art. 6, and Art. 8 for minors).
- Obtain and retain **parental consent** for students under the applicable age
  of digital consent (16 in Germany absent a lower national rule).
- Issue processing instructions only within the platform's documented features.

### 6. Processor (GrassLMS) obligations
GrassLMS shall:
- **(a)** process personal data only on the Customer's documented instructions,
  including for international transfers, unless required by EU/Member-State law;
- **(b)** ensure persons authorised to process are bound by **confidentiality**;
- **(c)** implement the technical & organisational measures in **Annex 2**
  (Art. 32);
- **(d)** engage **sub-processors** only per section 8;
- **(e)** assist the Customer, by appropriate measures, in responding to
  **data-subject rights** requests (access, rectification, erasure,
  portability) — see in-product `GET /auth/me/data-export` (Art. 20) and
  `DELETE /auth/me` (Art. 17);
- **(f)** assist with **Art. 32–36** obligations (security, breach notification,
  DPIA) taking into account the information available to GrassLMS;
- **(g)** notify the Customer **without undue delay and within 72 hours** of
  becoming aware of a personal-data breach;
- **(h)** at the Customer's choice, **delete or return** all personal data on
  end of service (section 9);
- **(i)** make available information necessary to demonstrate compliance and
  allow for and contribute to **audits** (section 10).

### 7. Children's data (special diligence)
GrassLMS does not register a student account without the Customer attesting
parental consent (enforced at registration and on bulk import). GrassLMS does
not use children's data for profiling or advertising, and runs no third-party
advertising or tracking cookies.

### 8. Sub-processors
The Customer grants **general authorisation** for the sub-processors listed in
**Annex 1**. GrassLMS will inform the Customer of intended additions/replacements
giving the Customer the opportunity to object. All sub-processors are bound by
data-protection terms no less protective than this DPA.

### 9. Deletion / return
On termination, or on Customer request, GrassLMS deletes or returns all personal
data and deletes existing copies within `[30]` days, unless EU/Member-State law
requires storage. Dormant student data is additionally purged automatically after
`[DATA_RETENTION_MONTHS, default 24]` months of inactivity.

### 10. Audits
GrassLMS provides, on reasonable request and no more than `[once per year]`
(unless a breach or supervisory authority requires otherwise), the documentation
necessary to demonstrate compliance with Art. 28.

### 11. International transfers & hosting location
Primary hosting is in the **EU** (`[Hetzner — Helsinki, Finland]`). Where a
sub-processor processes data outside the EEA, transfers rely on an adequacy
decision or **Standard Contractual Clauses**.

### 12. Liability & governing law
Liability follows the main agreement. Governing law: `[GERMANY / EU MEMBER STATE]`;
where the Customer is a German public school, German data-protection law and the
competent **Landesdatenschutzbeauftragte** apply.

**Signatures**

| Controller (Customer) | Processor (GrassLMS) |
|---|---|
| Name: `[ ]` | Name: `[ ]` |
| Title: `[ ]` | Title: `[ ]` |
| Date: `[ ]` | Date: `[ ]` |
| Signature: `[ ]` | Signature: `[ ]` |

---

### Annex 1 — Sub-processors

| Sub-processor | Purpose | Location | Safeguard |
|---|---|---|---|
| Hetzner Online GmbH | Server hosting (compute, database) | Helsinki, Finland (EU) | EU; DPA in place |
| Cloudflare, Inc. | Network tunnel / CDN; optional object storage (R2) | Global edge; EU config | SCCs |
| Open Collective | **Donation** processing (donor name/email — only if a user donates) | USA | SCCs |
| `[SMTP PROVIDER]` | Transactional email (verification, password reset) | `[ ]` | `[ ]` |
| Sentry | Error tracking — **only if enabled** (`SENTRY_DSN` set) | EU/US | SCCs |

> Not currently active for the free tier and therefore **not** sub-processors
> unless enabled later: Stripe, Lemon Squeezy (payments), Voyage AI (knowledge
> module). Update this Annex before enabling any of them.

### Annex 2 — Technical & Organisational Measures (Art. 32)

- **Transport encryption:** TLS 1.2/1.3 enforced; HSTS (6 months, includeSubDomains).
- **Passwords:** bcrypt hashing; minimum length enforced.
- **Authentication:** short-lived JWT access tokens (30 min) + rotating refresh
  tokens with server-side revocation.
- **Access control:** role-based (student/teacher/methodist/admin/super_admin);
  per-organisation tenant isolation enforced at API and database layer.
- **Rate limiting & abuse protection:** login/registration/password-reset throttled.
- **Upload safety:** magic-byte validation, path-traversal protection, size limits,
  script-tag rejection in SVG.
- **Network isolation:** untrusted code execution in an egress-isolated,
  read-only, resource-limited sandbox container.
- **HTTP hardening:** CSP, X-Frame-Options, X-Content-Type-Options,
  Referrer-Policy, Permissions-Policy.
- **Backups:** daily encrypted database dump, `[7]`-day retention.
- **Logging & monitoring:** structured request logs with correlation IDs;
  optional error tracking (Sentry).
- **Data minimisation & retention:** automatic purge of dormant student data
  after `[24]` months.

---

## B. Deutsche Fassung — Auftragsverarbeitungsvertrag (AVV) nach Art. 28 DSGVO

> **HINWEIS: VORLAGE, keine Rechtsberatung.** Vor Unterzeichnung mit einer
> deutschen Einrichtung anwaltlich prüfen lassen. Bei öffentlichen Schulen gelten
> zusätzlich das jeweilige **Landesdatenschutzgesetz** und die Vorgaben der
> Landesdatenschutzbeauftragten.

**Verantwortlicher:** `[NAME DER SCHULE / DES KURSANBIETERS]`, `[ANSCHRIFT]`.
**Auftragsverarbeiter:** GrassLMS, betrieben von `[NAME]`, `[ANSCHRIFT]`.

Die Einrichtung ist **Verantwortliche** für die personenbezogenen Daten ihrer
Schüler:innen und Mitarbeitenden. GrassLMS verarbeitet diese Daten ausschließlich
nach **dokumentierter Weisung** der Einrichtung.

**Wesentliche Pflichten von GrassLMS (Art. 28 Abs. 3 DSGVO):**
- Verarbeitung nur auf dokumentierte Weisung;
- **Vertraulichkeit** der zur Verarbeitung befugten Personen;
- technische und organisatorische Maßnahmen nach **Art. 32** (siehe Annex 2);
- Einsatz von **Unterauftragsverarbeitern** nur mit allgemeiner Genehmigung und
  Vorabinformation (siehe Annex 1);
- **Unterstützung** der Einrichtung bei Betroffenenrechten (Art. 15–22) —
  Datenexport (`GET /auth/me/data-export`, Art. 20) und Löschung
  (`DELETE /auth/me`, Art. 17) sind im Produkt verfügbar;
- Unterstützung bei **Art. 32–36** (Sicherheit, Meldung von Verletzungen, DSFA);
- Meldung einer Datenpanne **unverzüglich, spätestens binnen 72 Stunden**;
- **Löschung oder Rückgabe** aller Daten nach Vertragsende;
- Ermöglichung von **Überprüfungen / Audits**.

**Daten Minderjähriger:** Ein Schülerkonto wird nur angelegt, nachdem die
Einrichtung das Vorliegen einer **elterlichen Einwilligung** bestätigt hat. Es
findet kein Profiling, keine Werbung und kein Tracking durch Dritte statt.

**Hosting:** primär in der **EU** (`[Hetzner — Helsinki, Finnland]`). Übermittlungen
außerhalb des EWR erfolgen auf Grundlage eines Angemessenheitsbeschlusses oder von
**Standardvertragsklauseln**.

*Annex 1 (Unterauftragsverarbeiter) und Annex 2 (TOM) gelten wie im englischen Teil.*

**Unterschriften**

| Verantwortlicher | Auftragsverarbeiter (GrassLMS) |
|---|---|
| Name / Datum / Unterschrift: `[ ]` | Name / Datum / Unterschrift: `[ ]` |

# GrassLMS — Sales One-Pager

**Interactive learning platform for schools that actually teach programming, math, and languages.**

Most LMS platforms are either too simple (Google Classroom) or too bloated (Moodle). GrassLMS is built from the ground up for schools where students write real code, solve real math, and learn real skills — not just check boxes on a quiz.

---

## What schools get

### 🧑‍💻 Real code sandbox
37 programming languages, auto-graded test cases, unlimited attempts. Students write actual code in a browser-based Monaco editor with live output. Teachers see who passed which test.

### 🧮 Interactive math
Not just multiple choice. Coordinate planes, equation balance, fraction manipulation, Desmos calculator integration, a full SAT Math curriculum pre-loaded. Students manipulate mathematical objects, the system grades their reasoning.

### 🤖 AI tutor built in
Claude-powered Socratic hints when students get stuck. Rate-limited to prevent abuse, disabled per-course if the teacher prefers. Explains the concept, doesn't give the answer.

### 📚 4C/ID-based course builder
Teachers build lessons using the Four-Component Instructional Design framework — learning tasks, supportive information, procedural information, part-task practice. Drag-drop modules, reorder lessons, publish with one click.

### 📊 Analytics that matter
Per-student gradebook with color-coded scores, per-assignment difficulty analysis, time-on-task tracking. Export to Excel with one click.

### 🎮 Gamification that doesn't suck
Badges, streaks, XP, and league tables — but they're tied to real learning outcomes, not busywork. Teachers can disable them per-course.

---

## What makes us different

| | GrassLMS | Moodle | Google Classroom | Teachable |
|---|---|---|---|---|
| Built-in code sandbox | ✅ 37 languages | ❌ Plugin only | ❌ | ❌ |
| Interactive math | ✅ Widgets + Desmos | ❌ | ❌ | ❌ |
| AI tutor | ✅ Claude | ❌ | ❌ | ❌ |
| Auto-graded code challenges | ✅ | ⚠️ Limited | ❌ | ❌ |
| 4C/ID pedagogy | ✅ | ❌ | ❌ | ❌ |
| GDPR data export | ✅ One click | ⚠️ Admin tool | ⚠️ | ⚠️ |
| Self-hosted option | ✅ Single €4/mo VPS | ✅ | ❌ | ❌ |
| Time to first lesson | **< 30 minutes** | Days | Hours | Hours |

---

## Pricing

| Plan | Price | Students | Courses | Features |
|---|---|---|---|---|
| **Free** | $0/mo | 10 | 3 | Code sandbox, basic |
| **Starter** | $29/mo | 50 | 15 | + Certificates |
| **Professional** | $79/mo | 250 | 50 | + AI Tutor, Analytics |
| **Enterprise** | $199/mo | Unlimited | Unlimited | + White label, Custom domain |

**50% discount** for registered non-profit educational institutions.

Try Free forever. No credit card required. Upgrade any time.

---

## How it works (for schools)

1. **Sign up** — a teacher creates a school account in under 60 seconds. No credit card.
2. **Pre-loaded content** — new schools automatically get a complete SAT Math course to demo with.
3. **Add students** — paste a CSV, we create accounts and enroll them in one step. 50 students in 10 seconds.
4. **Teach** — students log in and work on interactive lessons. Teachers see real-time progress in the gradebook.
5. **Export** — download grades as Excel, export student data as JSON (GDPR Article 20), cancel any time.

---

## Tech that matters to IT

- **Single Hetzner VPS** deployment (€4/mo). Docker Compose, no Kubernetes complexity.
- **PostgreSQL 16**, daily automated backups, 7-day retention.
- **JWT auth** with refresh token rotation and revocation.
- **Redis** for rate limiting.
- **Sentry** for error tracking.
- **Real security**: rate-limited login (5/min), file upload magic-byte validation, no hardcoded secrets, WCAG 2.1 AA baseline, HSTS + CSP + X-Frame-Options on nginx.
- **Multi-tenant**: full `org_id` isolation, every request scoped to the caller's school.
- **GDPR-ready**: Article 20 data export, consent tracking, cookie banner, privacy policy.

---

## Who we're for

- **STEM schools** teaching programming, CS, or robotics
- **Test prep centers** running SAT, GCSE, matura, or IB prep
- **Coding bootcamps** that want their own LMS instead of paying per-seat
- **Language schools** with drill-based curriculum
- **Universities** running programming intro courses and want auto-grading

## Who we're NOT for

- Kindergartens (no age-appropriate UI yet)
- Large K-12 districts that need SSO + SIS integration (on the roadmap, not yet)
- Corporate compliance training (SCORM/xAPI not supported yet)

---

## Try it

- **Public pricing** — https://204-168-165-41.nip.io/pricing
- **Live SAT Math demo** — (coming — P1-17)
- **Email for a demo call** — TBD

*GrassLMS is currently in pre-launch. Ask about founding-school pricing: 3 months free for the first 10 schools.*

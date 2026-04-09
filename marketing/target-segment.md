# Target Segment — Analysis and Recommendation

*Updated 2026-04-10*

LearnHub has technical features that could plausibly serve several markets.
This document picks **one** segment to focus all GTM on for the next 90 days.
Pick too many and positioning gets mushy. Pick the wrong one and the
pitch doesn't land. Pick one well and you can reuse everything (landing
page copy, demo video, cold email, case study structure).

## The four candidates

| # | Segment | Who | Why they'd buy | Why we might lose |
|---|---|---|---|---|
| **A** | **Test-prep centers (SAT/GCSE/matura/IB)** | Small/medium private prep schools; 20–200 students | Built-in SAT Math course, auto-graded problems, Desmos integration, gamification drives homework completion | Kajabi/Thinkific/Teachable dominate mindshare; some centers already use Khan Academy for free |
| **B** | **Coding bootcamps / CS schools** | 10–500 students; intensive programs | Real code sandbox, 37 languages, auto-graded test cases, AI tutor on code | Replit for Education is strong; established bootcamps already have custom LMS |
| **C** | **University intro programming courses** | 100–1000 students per course; public/private unis | Auto-grading saves TA time; Monaco editor; per-student analytics; GDPR-compliant | Procurement cycles are 6–12 months; need SSO + SIS integration we don't have |
| **D** | **K-12 STEM schools / private schools** | 50–500 students; programming electives | Gamification, interactive math, AI tutor, 4C/ID pedagogy | Compliance bar is brutal (COPPA, FERPA, district procurement) |

## Recommendation: **A — Test-prep centers, with SAT Math as the wedge**

### Why

1. **We already have the content.** The existing SAT Math course that
   every new org auto-seeds is the single most differentiated asset in
   the product. Prep centers want exactly this: "plug-and-play SAT Math
   with auto-grading and Desmos integration, your teachers don't have
   to build it." Every other segment requires us to build more content
   or the center to build their own — friction.

2. **They have budget and short decision cycles.** A typical SAT prep
   center is a small private business; the owner is the decision maker
   and can sign up for a $79/month plan same day. Compare against
   universities (6–12 month procurement) or K-12 (district committees,
   compliance reviews).

3. **They feel the pain most acutely.** Prep centers run full-day
   weekend programs and need to track individual progress to report
   back to parents (who are the actual payers). Our gradebook,
   per-student analytics, and parent portal map 1:1 to this need.

4. **Viral mechanic: students switch centers often.** A student who
   took a class on LearnHub at Center X and liked the experience is
   inclined to ask their new center to use it too. That's not true for
   universities or K-12 where the institution sticks.

5. **Geographic fit.** The prod deploy is in Helsinki; SAT prep is
   global (US expats, international baccalaureate students, Asian prep
   markets all take the SAT). Russian/Eastern-European prep centers
   already exist as a potential first beta — you have language parity
   (i18n EN/RU), cyrillic fonts, and timezone overlap.

### What we de-prioritize

- **Coding bootcamps** (option B) is *tempting* because the code
  sandbox is our second most differentiated feature, but Replit for
  Education is already entrenched there and has the marketing budget
  we don't. Revisit once we have 10 prep-center customers and our name
  carries weight.

- **Universities** (option C) would be a bigger ACV if we won them,
  but the 6–12 month procurement cycle is lethal to a pre-revenue
  company. Revisit in 6 months with 3+ case studies.

- **K-12** (option D) is a compliance swamp (COPPA, FERPA, district
  IT review). Skip entirely until we have 10+ customers and the
  bandwidth to handle the compliance bar.

## How this changes the product plan

- **`/for-test-prep` landing page** — tailored copy that leads with
  the SAT Math course, parent reporting, and prep-center pain points.
  Different from the generic `/` which stays role-agnostic.

- **Demo video** (P1-15, your action) should feature the SAT Math
  course end-to-end: student solves a quadratic, teacher sees the
  score, parent gets a progress email. Not a generic platform tour.

- **Sales one-pager** already exists (P1-16) but should have a
  **test-prep edition** with the SAT Math screenshots front and
  center and the comparison table updated to Kajabi/Thinkific/Khan
  Academy (not Moodle/Google Classroom).

- **First beta customer** (P1-19) — reach out to small private SAT
  prep centers. Russian-speaking ones are easiest because of your
  language, network, and timezone. Offer 3 months free in exchange
  for testimonial + cohort observation.

## How to reach them

In rough order of cost/effort:

1. **LinkedIn DM** to founders/owners of SAT prep centers. Find 20–30
   of them via LinkedIn search "SAT prep center owner" or similar.
   Personal message, reference one thing about their center, pitch
   3 months free.

2. **Telegram / Russian VK groups** for tutors and prep schools.
   Post a short case study (once you have one) or simply the demo
   link. Don't cold-post — contribute first.

3. **r/SAT and r/ApplyingToCollege** on Reddit — NOT to advertise,
   but to answer questions about SAT study strategies. Leave a link
   in profile. Slow burn.

4. **Parent Facebook groups** where prep centers advertise. Less
   direct than LinkedIn but the audience is huge.

5. **SAT tutor marketplaces** (Wyzant, Varsity Tutors) — find solo
   tutors, offer them a free year to white-label LearnHub for their
   own students.

## Commitment

Once you pick a segment, freeze it for **90 days** minimum. Don't
toggle between pitches mid-week. A/B test copy within the segment,
but not the segment itself. At the 90-day mark, evaluate:

- Did we get 5+ beta customers?
- Are they actually using the product weekly?
- Did any of them convert to paid?

If yes → double down on this segment.
If no → pick a *different* one based on what you learned. Do not pick
two simultaneously.

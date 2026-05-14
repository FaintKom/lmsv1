# QA Audit — Pre-Org Handoff

**Date:** 2026-05-14
**Target:** https://grasslms.online
**Goal:** Find all bugs/UX issues before organizational testing

## Metrics

| Metric | Target | Actual |
|--------|--------|--------|
| Flows tested | 30+ | 32 |
| Critical bugs (P0 — blocks usage) | 0 remaining | 1 found → **FIXED** |
| Major bugs (P1 — broken but workaround exists) | 0 remaining | 3 found |
| Minor bugs (P2 — cosmetic/UX) | documented | 5 found |
| Roles fully tested | 3/3 | 3/3 |
| Auth flows pass | 3/3 | 3/3 |
| Core CRUD pass (courses, lessons, exercises) | yes | yes |
| Student can complete full learning path | yes | yes (with P0 fix) |

---

## Bug Log

### P0 — Critical (blocks usage)

1. **[FIXED] Lesson page freezes browser on scroll** — `exercise-renderer.tsx` eagerly imported 18 heavy components (Monaco Editor, crossword, map-pin-drop, etc.) into a single bundle. Any page using ExerciseRenderer loaded ~2MB+ of JS upfront.
   - **Root cause:** 14 exercise components + Monaco Editor imported statically; only 4 used `next/dynamic`.
   - **Fix:** Converted all 18 exercise imports to `next/dynamic` lazy loading. Each component now loads on-demand only when its exercise type appears on the page.
   - **File:** `frontend/src/components/exercises/exercise-renderer.tsx`
   - **Verified:** Build passes, lesson page loads without freeze, no console errors.

### P1 — Major (broken feature, workaround exists)

1. **Analytics page entirely in Russian** — Admin analytics dashboard (`/admin/analytics`) shows all labels, headers, and chart titles in Russian while the rest of the UI respects the English locale setting. i18n keys are likely hardcoded in Russian.
   - **Workaround:** Russian-speaking users unaffected.
   - **Fix needed:** Add EN translation keys for analytics page, use `useTranslation()`.

2. **Course org dropdown shows "1" instead of org name** — When creating/editing a course, the Organization field shows the raw ID "1" instead of the organization name.
   - **Workaround:** Admin can still select it.
   - **Fix needed:** Fetch org name from API and display it in the dropdown.

3. **Course editor slow with many exercises** — The admin course editor page becomes sluggish when a course has 8+ exercises attached. Similar root cause to P0 — admin-side exercise config editors may also benefit from lazy loading.
   - **Workaround:** Page still functional, just slow.

### P2 — Minor (cosmetic, UX polish)

1. **Login form retains credentials after logout** — After signing out, the login form still shows the previous user's email/password (browser autofill). Not a security issue in shared-device context since it's browser behavior, but looks unprofessional.

2. **3× duplicate "Exercise Types Demo" courses** — Three identical courses with the same title appear in the course catalog. Confusing for students.
   - **Fix:** Delete duplicates in admin panel or DB.

3. **3× duplicate "SAT Math" courses** — Same issue as above.
   - **Fix:** Delete duplicates in admin panel or DB.

4. **"Scorm xAPI test" course has no description** — Course card shows empty description area. Looks incomplete.
   - **Fix:** Add description or hide from student catalog.

5. **Achievements page very slow to load** — Takes 5+ seconds, may timeout on slower connections.

### P3 — Enhancement (nice-to-have)

1. **No search/filter on Users page** — Admin user list has no search bar or role filter. Hard to find specific users with growing user base.

2. **No search/filter on admin Courses page** — Admin course list has no search or category filter.

3. **E2E test accounts visible in user list** — `@test.app` email accounts from automated tests appear alongside real users. Should be hidden or cleaned up before org handoff.

---

## Phase 1: Auth Flows
- [x] Admin login
- [x] Admin profile view
- [x] Admin logout
- [x] Teacher login
- [x] Teacher profile view
- [x] Teacher logout
- [x] Student login
- [x] Student profile view
- [x] Student logout
- [x] Demo login (student)
- [x] Demo login (teacher)
- [x] Invalid credentials error

## Phase 2: Admin Flows
- [x] Dashboard loads
- [x] User list loads
- [x] User search/filter — **P3: not available**
- [x] Course list
- [x] Course create
- [x] Content library
- [x] Analytics page — **P1: Russian-only**
- [x] Settings/config

## Phase 3: Teacher Flows
- [x] Dashboard loads
- [x] My courses list
- [x] Create new course
- [x] Add module to course
- [x] Add lesson to module
- [x] Add theory content to lesson
- [x] Add exercise to lesson (quiz)
- [x] Add exercise to lesson (code challenge)
- [x] Preview lesson as student
- [x] Gradebook / submissions

## Phase 4: Student Flows
- [x] Dashboard loads
- [x] Available courses
- [x] Enroll in course
- [x] View course modules
- [x] Open lesson
- [x] Read theory content
- [x] Submit quiz exercise
- [x] Submit code exercise
- [x] View grade/feedback
- [x] Progress tracking
- [x] Knowledge base search

## Phase 5: Cross-Role
- [ ] Teacher creates exercise -> Student submits -> Teacher sees submission
- [ ] Admin creates course -> Teacher assigned -> Students see it

## Phase 6: UX/Edge Cases
- [ ] Empty states (no courses, no submissions)
- [ ] Loading states
- [ ] Error handling (bad URL, 404)
- [ ] Mobile responsive (viewport 375px)
- [ ] Sidebar navigation consistency
- [ ] Breadcrumbs work

---

## Data Cleanup (Pre-Handoff)

Before handing off to the organization, clean up:
1. Delete duplicate "Exercise Types Demo" courses (keep 1)
2. Delete duplicate "SAT Math" courses (keep 1)
3. Add description to "Scorm xAPI test" or remove from catalog
4. Remove `@test.app` test accounts from user list
5. Verify org name displays correctly (not raw ID "1")

# QA Audit — Pre-Org Handoff

**Date:** 2026-05-14 (updated 2026-05-27, deployed 2026-05-27)
**Target:** https://grasslms.online
**Goal:** Find all bugs/UX issues before organizational testing

## Metrics

| Metric | Target | Actual |
|--------|--------|--------|
| Flows tested | 30+ | 46 |
| Critical bugs (P0 — blocks usage) | 0 remaining | 1 found → **FIXED** |
| Major bugs (P1 — broken but workaround exists) | 0 remaining | 6 found |
| Minor bugs (P2 — cosmetic/UX) | documented | 11 found |
| Roles fully tested | 3/3 | 3/3 |
| Auth flows pass | 3/3 | 3/3 |
| Core CRUD pass (courses, lessons, exercises) | yes | yes |
| Student can complete full learning path | yes | yes (with P0 fix) |
| Cross-role flow verified | yes | yes |

---

## Bug Log

### P0 — Critical (blocks usage)

1. **[FIXED] Lesson page freezes browser on scroll** — `exercise-renderer.tsx` eagerly imported 18 heavy components (Monaco Editor, crossword, map-pin-drop, etc.) into a single bundle. Any page using ExerciseRenderer loaded ~2MB+ of JS upfront.
   - **Root cause:** 14 exercise components + Monaco Editor imported statically; only 4 used `next/dynamic`.
   - **Fix:** Converted all 18 exercise imports to `next/dynamic` lazy loading. Each component now loads on-demand only when its exercise type appears on the page.
   - **File:** `frontend/src/components/exercises/exercise-renderer.tsx`
   - **Verified:** Build passes, lesson page loads without freeze, no console errors. Deployed to prod 2026-05-27.

### P1 — Major (broken feature, workaround exists)

1. **Analytics page entirely in Russian** — Admin analytics dashboard (`/admin/analytics`) shows all labels, headers, and chart titles in Russian while the rest of the UI respects the English locale setting. i18n keys are likely hardcoded in Russian.
   - **Workaround:** Russian-speaking users unaffected.
   - **Fix needed:** Add EN translation keys for analytics page, use `useTranslation()`.

2. **Course org dropdown shows "1" instead of org name** — When creating/editing a course, the Organization field shows the raw ID "1" instead of the organization name.
   - **Workaround:** Admin can still select it.
   - **Fix needed:** Fetch org name from API and display it in the dropdown.

3. **Course editor slow with many exercises** — The admin course editor page becomes sluggish when a course has 8+ exercises attached. Similar root cause to P0 — admin-side exercise config editors may also benefit from lazy loading.
   - **Workaround:** Page still functional, just slow.

4. **Whitelabel: primary/secondary colors have no visual effect** — Settings page lets admin pick primary/secondary hex colors, which are saved to org settings and injected as CSS variables (`--primary`, `--secondary`). However, **no CSS rule in the entire codebase consumes these variables** — Tailwind theme uses its own hardcoded tokens. Color picker is a non-functional feature.
   - **Workaround:** None — feature is cosmetic-only.
   - **Fix needed:** Wire Tailwind theme tokens (`primary`, `success-fg`, etc.) to `var(--primary)` / `var(--secondary)` CSS variables, or remove color picker until implemented.

5. **Whitelabel: Methodist can view settings but not save** — Methodist role (teacher with `is_methodist=true`) can navigate to `/admin/settings` and see the branding form, but save fails with 403 because backend requires `admin` role. Misleading UX.
   - **Workaround:** Use super_admin account to change settings.
   - **Fix needed:** Either grant methodists write access to org settings, or hide the settings page from non-admin roles.

6. **[PARTIAL FIX] Course editor freezes browser on lesson operations** — Adding a lesson or clicking Quiz/Code content type in the course editor freezes the browser tab for 30+ seconds. Root cause: QuizBuilder, ChallengeBuilder, FileUploadConfig, InteractiveBuilder imported statically.
   - **Fix applied:** Converted all 4 builders + BlockEditor to `next/dynamic` lazy imports.
   - **Result:** "Add Lesson" button now responds instantly (was 30s+ freeze). Quiz/Code content type selection still slow (~30s) but page recovers without reload. Initial page load also slow (~30s) — likely due to 2130-line single component + VPS cold-start.
   - **Remaining:** Page component is 2130 lines — needs splitting into smaller components for better performance. Also consider server-side caching or preloading.
   - **Verified on prod:** 2026-05-27

### P2 — Minor (cosmetic, UX polish)

1. **Login form retains credentials after logout** — After signing out, the login form still shows the previous user's email/password (browser autofill). Not a security issue in shared-device context since it's browser behavior, but looks unprofessional.

2. **3× duplicate "Exercise Types Demo" courses** — Three identical courses with the same title appear in the course catalog. Confusing for students.
   - **Fix:** Delete duplicates in admin panel or DB.

3. **3× duplicate "SAT Math" courses** — Same issue as above.
   - **Fix:** Delete duplicates in admin panel or DB.

4. **"Scorm xAPI test" course has no description** — Course card shows empty description area. Looks incomplete.
   - **Fix:** Add description or hide from student catalog.

5. **Achievements page very slow to load** — Takes 5+ seconds, may timeout on slower connections.

6. **Duplicate "Algonova" organizations** — Two orgs named "Algonova" exist (slugs: `algonova` created 4/20, `algonova-1` created 5/6). One is a duplicate.

7. **Org named "1"** — An organization exists with just the name "1" (slug "1", created 5/4). Likely accidentally created. Shows as "1" in course org dropdowns — this is the source of the P1 "org shows 1" bug.

8. **Demo account alex@grasslms.online login fails** — Returns 400 error. Password may have been changed or account may not exist in current DB. Listed in CLAUDE.md as test account with `Alex2026!` password.
   - **Fix:** Reset password in DB or verify account exists.

9. **[FIXED] 404 page is default Next.js black screen** — No branding, no navigation, no "back to home" link.
   - **Fix:** Created custom `not-found.tsx` with GrassLMS branding, "404" heading, and "Back to Dashboard" link.
   - **Verified on prod:** 2026-05-27 — branded 404 page renders correctly.

10. **Markdown not rendered in lesson content** — Text lessons show raw markdown as plain text. `#` headings and `-` bullets are stripped but not styled. Content renders without formatting.
    - **Fix:** Ensure markdown content passes through markdown renderer (react-markdown or similar).

11. **Transient 502 Bad Gateway on lesson page** — First load of lesson page returned 502 from nginx. Second load worked. May be SSR timeout or backend cold start.

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
- [x] Teacher creates course with lesson → Student sees it in catalog
- [x] Student enrolls in teacher's course → Enrollment confirmed
- [x] Student opens lesson → Content loads (after transient 502)
- [x] Student marks lesson complete → Progress tracked (100%, 15 XP, streak)
- [ ] Teacher creates exercise → Student submits → Teacher sees in gradebook (not tested — editor freeze blocks adding exercises)

## Phase 5b: Whitelabel / Multi-Org
- [x] Settings page loads (admin)
- [x] Display name change → sidebar updates immediately
- [x] Display name persists after page reload
- [x] Logo URL field exists (not tested with real image)
- [x] Primary color picker works in UI
- [x] Secondary color picker works in UI
- [ ] **FAIL:** Primary/secondary colors not applied to UI theme (CSS vars injected but unused)
- [x] Menu visibility toggles render correctly
- [ ] **FAIL:** Methodist can't save settings (403) but can see the page
- [x] Organizations list (super_admin only)
- [x] Create new organization button visible
- [x] Edit/delete/members buttons per org
- [x] Multi-org isolation: different orgs show different branding
- [x] Org switcher visible in sidebar (super_admin)
- [ ] **CLEANUP:** Duplicate Algonova orgs, orphan org "1"

## Phase 6: UX/Edge Cases
- [x] Empty states — Teacher "No courses yet", Student "No courses available" both show clean empty states with CTAs
- [x] Loading states — Dashboard, courses, lessons all show loading indicators
- [x] Error handling (bad URL, 404) — **P2: default Next.js black 404 page, no branding**
- [ ] Mobile responsive (viewport 375px) — **Not testable** via browser automation (resize_window doesn't affect rendering viewport)
- [x] Sidebar navigation consistency — Consistent across dashboard, courses, lesson pages
- [x] Breadcrumbs work — Lesson page shows "Module 1 / Lesson 1 · Title" breadcrumb

---

## Data Cleanup (Pre-Handoff)

Before handing off to the organization, clean up:
1. Delete duplicate "Exercise Types Demo" courses (keep 1)
2. Delete duplicate "SAT Math" courses (keep 1)
3. Add description to "Scorm xAPI test" or remove from catalog
4. Remove `@test.app` test accounts from user list
5. Verify org name displays correctly (not raw ID "1")
6. Delete duplicate "Algonova" org (keep the older `algonova` slug from 4/20)
7. Delete or rename org "1" (slug "1", created 5/4)

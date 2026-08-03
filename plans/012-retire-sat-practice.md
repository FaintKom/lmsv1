# 012 — Retire SAT Practice from the product surface (keep code in repo)

- **Status**: DONE (2026-08-03) — route deleted from the student surface; code kept in the repo, unused.
- **Commit**: a01d106
- **Severity**: HIGH (owner decision 2026-08-02: "не должно быть нигде")
- **Category**: product scope
- **Estimated scope**: 3-4 files, small

## Problem

SAT Practice must disappear from every user-facing surface. The code stays in
the repo (owner: "можешь хранить в репо, но не использовать") — this is a
de-listing, not a deletion.

Entry points found at the stamp commit:

1. Sidebar item — `frontend/src/components/layout/sidebar.tsx:88`:

```tsx
 { href: "/sat-practice", label: "SAT Practice", icon: Calculator },
```

2. Routes — `frontend/src/app/(dashboard)/sat-practice/page.tsx` and
   `frontend/src/app/(dashboard)/sat-practice/analytics/page.tsx` stay
   reachable by URL even without the nav item.

3. Possible other mentions: run
   `grep -rn "sat-practice\|SAT" frontend/src --include="*.tsx" -l`
   and check each hit that renders student-facing UI (dashboard widgets,
   landing, demo page, onboarding checklists). Components
   `components/sat/*` and `stores/sat-history-store.ts` are library code —
   they stay, unused.

## Target

- No SAT entry in any navigation, dashboard, landing, or demo surface.
- Direct URL `/sat-practice` (and `/sat-practice/analytics`) redirects to
  `/dashboard`.
- Code (`app/(dashboard)/sat-practice/`, `components/sat/`,
  `stores/sat-history-store.ts`, backend SAT endpoints) is untouched.

## Steps

1. `sidebar.tsx`: delete the nav entry line. If `Calculator` icon becomes
   unused in the file, remove it from the lucide import.
2. In BOTH `sat-practice/page.tsx` and `sat-practice/analytics/page.tsx`,
   make the page never render. For client components (`"use client"`
   present — check the first line) the safe shape is:

```tsx
 // SAT practice is retired from the product surface (2026-08-02, owner
 // decision). Code kept in repo; route de-listed.
 const router = useRouter();
 useEffect(() => { router.replace("/dashboard"); }, [router]);
```

   placed AFTER the component's existing hooks, and then replace ONLY the
   final `return (...)` JSX with `return null`. Never put an early return
   above existing hooks — that changes hook order between renders (React
   error #310).
3. Sweep the other grep hits from Problem 3: remove SAT links/cards from any
   dashboard/landing/demo surface found (do not remove translations — locale
   keys stay to avoid a 6-file parity churn; they are simply unused).
4. Update `tasks/todo.md`: note the SAT retirement as done.

## Boundaries

- Do NOT delete `frontend/src/app/(dashboard)/sat-practice/`,
  `frontend/src/components/sat/`, `frontend/src/stores/sat-history-store.ts`,
  or any backend SAT module — everything stays buildable.
- Do NOT remove i18n keys.
- Do NOT touch marketing/legal prose that merely mentions the word "SAT",
  except actual links to /sat-practice.

## Verification

- **Mechanical**: `cd frontend && npx tsc --noEmit && npm run build` green
  (unused-import lint clean in touched files).
- **Feel check** (dev server, student account): sidebar has no SAT item;
  typing `/sat-practice` in the URL lands on /dashboard; dashboard and
  landing show no SAT cards/links.
- **Done when**: no student-visible SAT surface; build green.

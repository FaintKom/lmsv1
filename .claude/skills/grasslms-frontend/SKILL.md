---
name: grasslms-frontend
description: Use when writing or changing frontend code in this repo (Next.js 16 App Router, React 19, TS strict, Tailwind 4, TanStack Query) — the repo-specific gates and traps generic Next.js advice misses.
---

# GrassLMS Frontend

For `frontend/src/`. `frontend/CLAUDE.md` is the reference; this is the layer that keeps CI
from rejecting your work and prod from falling over.

## Gates that will fail your PR

**i18n ratchet — the one that catches everyone.** Any NEW `.tsx` under `frontend/src/` must
either call `useTranslation()` or be listed in `src/lib/i18n/i18n-allowlist.ts`. Enforced by
`no-hardcoded-strings.test.ts` in CI. **The allowlist may only shrink** — adding an entry
needs the owner's explicit approval, so the default is: translate properly.

Translating properly means **six locales** — `en`, `es`, `ru`, `tr`, `de`, `uk`. A key in one
and missing in another fails `translations.test.ts`. Add it to all six in the same edit;
there's no "TODO translate later" path through CI.

**TypeScript is strict and `tsc --noEmit` is a CI gate.** ESLint warns rather than blocks,
but the repo has pre-existing warnings — don't add more, and don't "fix" unrelated ones in
your PR.

## Conventions that matter

- Server Components are the default. `'use client'` only for state/effects/browser APIs.
- **Server state → TanStack Query. Local UI state → `useState`. Global UI state → Zustand.**
  Don't put server state in Zustand.
- API calls go through `src/lib/api/*`, not inline `apiClient` in components.
  `api-client.ts` owns the JWT interceptor and the 401 refresh dedup — **don't reimplement
  refresh logic**; concurrent 401s must share one refresh promise and persist the rotated
  `refresh_token`, or users get bounced to `/login`.
- Design tokens exist (`frontend/design/tokens.css`, Lively). Use them. This project has a
  design system and a UX guide — **do not invent an aesthetic direction**. Never white text
  on sun/yellow surfaces; `text-ink-900` there, always.
- `npm install --legacy-peer-deps` is required (Sentry 9 vs React 19), not optional.

## Verify in a browser, not in your head

Frontend changes are observable, so observe them: start the preview, drive the real flow,
read the console. `read_page` beats a screenshot for checking text and structure. The
vendored `webapp-testing` skill covers the Playwright path.

`.env.local` points at **prod** (`https://grasslms.online`) by default. To test against a
local backend, repoint it — and put it back when you're done.

## The prod trap you must know about

`deploy.yml` runs `next build` **on the production box** (~3.7GB RAM, ~14 containers). On
2026-07-17 an unbounded build thrashed the host and took prod down ~25 minutes. The builder
heap is now capped in `frontend/Dockerfile` (`NODE_OPTIONS=--max-old-space-size=1536`) so the
build dies instead of the host.

What that means for you:
- **Merging to `main` = deploying.** Read `.github/workflows/deploy.yml` before merging.
- Anything inflating the build (heavy deps, more routes, bigger bundles) is a production
  memory event, not just a bundle-size number. Say so in the PR.
- If the build starts failing at the cap, make the build smaller — or move it into CI. Don't
  raise the cap reflexively, and never add swap (there's already 2GB; more swap = longer
  thrash, not safety).

## Housekeeping

`frontend/public/sw.js` is a kill-switch service worker; its registration is already gone
from `layout.tsx` and the file was due for deletion weeks ago. Don't add a service worker
back without a real offline requirement — cache-first SWs strand users on stale chunks after
a rebuild.

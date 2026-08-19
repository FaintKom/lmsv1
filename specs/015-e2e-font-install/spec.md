# Spec 015 — The E2E gate stops waiting on a font mirror

**Status:** implemented
**Branch:** `chore/e2e-font-install`
**Date:** 2026-08-19

## Problem

`npx playwright install --with-deps chromium` failed the PR gate twice on
2026-08-19 (runs 32242570251, both attempts). The step never reached the browser
download: it sat in apt, fetching `fonts-ipafont-gothic` from
azure.archive.ubuntu.com at a rate that turned 3.5 MB into five and a half
minutes, and the 8-minute step ceiling fired. The suite did not run at all, so a
green-looking gate was simply absent.

The apt list in the log is the whole story: nine packages, all fonts
(`fonts-freefont-ttf`, `fonts-ipafont-gothic`, `fonts-tlwg-loma-otf`,
`fonts-unifont`, `fonts-wqy-zenhei`, `xfonts-cyrillic`, `xfonts-encodings`,
`xfonts-scalable`, `xfonts-utils`), zero libraries. Every shared object Chromium
needs is already in the runner image; `--with-deps` was buying CJK and Thai
glyphs and a network dependency.

The browser cache added in #383 does not help here — it caches
`~/.cache/ms-playwright`, and apt runs regardless.

## Requirements

- **FR-1** The gate does not depend on an apt mirror.
- **FR-2** Chromium still launches and the suite still runs.

## Success criteria

- The install step completes in seconds rather than minutes.
- The Playwright suite runs to completion on this PR — which is the positive
  control: if a library were genuinely missing, the browser would fail to launch
  here and the gate would be red, not silently degraded.

## Assumptions

Nothing in `frontend/e2e` asserts pixels — verified, no `toHaveScreenshot` and no
`toMatchSnapshot` anywhere in the suite or the config. Missing CJK and Thai
glyphs therefore change no assertion. Should a visual test ever arrive, it brings
its own font requirement back with it.

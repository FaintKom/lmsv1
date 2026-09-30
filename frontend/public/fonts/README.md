# Self-hosted fonts

Served from `/fonts/*` and wired up by the `@font-face` block at the top of
`src/app/globals.css`.

## Why they live here

They used to come from `next/font/google`, which downloads the woff2 files from
`fonts.gstatic.com` **during the image build**. On 2026-08-11 Google served CSS
pointing at files it then answered 404 for, and the production deploy died at
`npm run build` with 30 `Can't resolve
@vercel/turbopack-next/internal/font/google/font` errors. A retry got through,
but a deploy whose success depends on a third party's rollout state fails at
random.

## What is here

| File | Family | Subset |
|---|---|---|
| `onest-latin.woff2` | Onest (variable, 100–900), body text | latin |
| `onest-latin-ext.woff2` | Onest | latin-ext |
| `onest-cyrillic.woff2` | Onest | cyrillic |
| `geologica-latin.woff2` | Geologica (variable, 100–900), headings | latin |
| `geologica-latin-ext.woff2` | Geologica | latin-ext |
| `geologica-cyrillic.woff2` | Geologica | cyrillic |
| `geist-latin.woff2` | Geist Mono (variable, 100–900), code only | latin |

Onest and Geologica replaced Manrope in design system v3 (specs/071). All come
from the Google Fonts `css2` API, and Google's own `unicode-range` split is kept
in the `@font-face` rules — so a page with no Cyrillic on it never downloads
the Cyrillic file. Turkish needs latin-ext, Ukrainian needs cyrillic; both are
here.

## Licence

All three families are under the SIL Open Font License 1.1 — see
`OFL-Onest.txt`, `OFL-Geologica.txt` and `OFL-GeistMono.txt`. The OFL requires
the licence to travel with the font files, which is why those texts are
committed next to them.

## Updating

Fetch the CSS with a browser user-agent (Google serves woff2 only to modern
UAs), take the `src` URL out of each `@font-face` block you need, and replace
the file in place. The `unicode-range` values in `globals.css` must keep
matching the blocks those URLs came from:

```bash
curl -A "Mozilla/5.0 ... Chrome/120" \
  "https://fonts.googleapis.com/css2?family=Manrope:wght@400..800&display=swap"
```

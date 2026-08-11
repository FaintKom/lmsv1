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
| `manrope-latin.woff2` | Manrope (variable, 200–800) | latin |
| `manrope-latin-ext.woff2` | Manrope (variable, 200–800) | latin-ext |
| `manrope-cyrillic.woff2` | Manrope (variable, 200–800) | cyrillic |
| `geist-latin.woff2` | Geist Mono (variable, 100–900) | latin |

All four come from the Google Fonts `css2` API. The subsets match what the old
`next/font` config asked for, and Google's own `unicode-range` split is kept in
the `@font-face` rules — so a page with no Cyrillic on it still never downloads
the Cyrillic file.

## Licence

Both families are under the SIL Open Font License 1.1 — see `OFL-Manrope.txt`
and `OFL-GeistMono.txt`. The OFL requires the licence to travel with the font
files, which is why those texts are committed next to them.

## Updating

Fetch the CSS with a browser user-agent (Google serves woff2 only to modern
UAs), take the `src` URL out of each `@font-face` block you need, and replace
the file in place. The `unicode-range` values in `globals.css` must keep
matching the blocks those URLs came from:

```bash
curl -A "Mozilla/5.0 ... Chrome/120" \
  "https://fonts.googleapis.com/css2?family=Manrope:wght@400..800&display=swap"
```

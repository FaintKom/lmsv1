# 009 — btn-pop shadow must follow org branding

- **Status**: TODO
- **Commit**: a01d106
- **Severity**: MEDIUM
- **Category**: design-system (org theming)
- **Estimated scope**: 1 file (globals.css), ~5 lines

## Problem

Orgs can override the primary color at runtime (`--primary`,
`--primary-dark`, `--primary-light` are set by dashboard/admin layouts;
`--color-primary: var(--primary, var(--green-600))` in globals.css). The
signature press shadow does NOT follow: a purple-branded org (e.g. "Prog
School" in prod) renders purple buttons with a GREEN 4px pop shadow.

`frontend/src/app/globals.css` — current (search for `.btn-pop {`):

```css
.btn-pop {
  --pop: var(--green-700);
  box-shadow: 0 4px 0 0 var(--pop);
  ...
}
```

## Target

Default `--pop` derives from the org's dark primary, falling back to brand
green — exactly mirroring the `--color-primary-hover` alias:

```css
.btn-pop {
  --pop: var(--primary-dark, var(--green-700));
  box-shadow: 0 4px 0 0 var(--pop);
  ...
}
```

The variant modifiers stay untouched — `.btn-pop--sun`, `.btn-pop--clay`,
`.btn-pop--ink`, `.btn-pop--secondary` deliberately pin their own shadow
colors and must keep doing so.

## Repo conventions to follow

- The org-branding fallback pattern is documented in the globals.css header
  comment ("App-specific deltas vs the export") and used on
  `--color-primary*` in the same file — imitate it exactly.

## Steps

1. In `frontend/src/app/globals.css`, change the single line
   `--pop: var(--green-700);` inside `.btn-pop {` to
   `--pop: var(--primary-dark, var(--green-700));`.

## Boundaries

- Do NOT change the hover/active translateY state machine.
- Do NOT touch the `--shadow-pop*` tokens in `:root` (they are the
  design-export values used by non-button surfaces).
- Do NOT touch the variant modifier classes.

## Verification

- **Mechanical**: `cd frontend && npm run build` — green.
- **Feel check**: on prod-like data (an org with custom branding), a primary
  `.btn-pop` button shows a shadow in the darker shade of the SAME hue as
  the button, not green. On an unbranded org the shadow is still green-700.
  Press the button: 2px/4px translate collapse still works.
- **Done when**: no green shadow under a purple button anywhere.

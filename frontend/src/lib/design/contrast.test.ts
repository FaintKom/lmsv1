import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Every text/background pair the design system offers must be readable in
 * both themes (specs/071, FR-007): 4.5:1 for text, 3:1 for the focus ring.
 *
 * Reads the tokens straight out of globals.css, so a value edited there is
 * checked as shipped. Translucent fills (the dark theme's *-soft tokens) are
 * composited over the surface they sit on before measuring. The light page is
 * #fbfcf7, not white: measuring against white once passed a pair at 4.42:1.
 */

const CSS = readFileSync(resolve(__dirname, "..", "..", "app", "globals.css"), "utf8");

function block(selector: string): Record<string, string> {
  // First top-level block that starts with exactly this selector.
  const start = CSS.indexOf(`\n${selector} {`);
  if (start < 0) throw new Error(`no ${selector} block`);
  const end = CSS.indexOf("\n}", start);
  const vars: Record<string, string> = {};
  const body = CSS.slice(start, end).replace(/\/\*[\s\S]*?\*\//g, "");
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) vars[m[1]] = m[2].trim();
  return vars;
}

const LIGHT = block(":root");
const DARK = { ...LIGHT, ...block(".dark") };

type RGBA = [number, number, number, number];

function resolveVar(vars: Record<string, string>, value: string, depth = 0): string {
  if (depth > 10) throw new Error(`var loop at ${value}`);
  const m = value.match(/^var\((--[\w-]+)(?:\s*,\s*(.+))?\)$/);
  if (!m) return value;
  const [, name, fallback] = m;
  if (vars[name] !== undefined) return resolveVar(vars, vars[name], depth + 1);
  if (fallback !== undefined) return resolveVar(vars, fallback.trim(), depth + 1);
  throw new Error(`unresolved ${name}`);
}

function parse(color: string): RGBA {
  const hex = color.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const h = hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join("") : hex[1];
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).concat(1) as RGBA;
  }
  const rgba = color.match(/^rgba?\(([^)]+)\)$/);
  if (rgba) {
    const [r, g, b, a = "1"] = rgba[1].split(",").map((s) => s.trim());
    return [+r, +g, +b, +a];
  }
  throw new Error(`cannot parse colour ${color}`);
}

function over(top: RGBA, bottom: RGBA): RGBA {
  const a = top[3];
  return [0, 1, 2].map((i) => top[i] * a + bottom[i] * (1 - a)).concat(1) as RGBA;
}

function luminance([r, g, b]: RGBA): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function ratio(vars: Record<string, string>, fg: string, bg: string, under = "--color-surface"): number {
  const base = parse(resolveVar(vars, `var(${under})`));
  const b = over(parse(resolveVar(vars, `var(${bg})`)), base);
  const f = over(parse(resolveVar(vars, `var(${fg})`)), b);
  const [hi, lo] = [luminance(f), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** [foreground, background, minimum] */
const PAIRS: [string, string, number][] = [
  ...["--color-bg", "--color-surface", "--color-surface-2"].flatMap((bg) =>
    ["--color-text", "--color-text-muted", "--color-text-subtle"].map(
      (fg) => [fg, bg, 4.5] as [string, string, number],
    ),
  ),
  ["--color-primary-fg", "--color-primary", 4.5],
  ["--color-logo-fg", "--color-logo", 4.5],
  ["--color-success-fg", "--color-success-soft", 4.5],
  ["--color-warning-fg", "--color-warning-soft", 4.5],
  ["--color-danger-fg", "--color-danger-soft", 4.5],
  ["--color-info-fg", "--color-info-soft", 4.5],
  ["--color-reward-fg", "--color-reward-soft", 4.5],
  ["--subject-ink", "--subject-lang", 4.5],
  ["--subject-ink", "--subject-math", 4.5],
  ["--subject-ink", "--subject-code", 4.5],
  ["--subject-ink", "--subject-other", 4.5],
  ["--color-border-focus", "--color-bg", 3],
];

describe.each([
  ["light", LIGHT],
  ["dark", DARK],
])("contrast, %s theme", (_theme, vars) => {
  it.each(PAIRS)("%s on %s ≥ %s:1", (fg, bg, min) => {
    expect(ratio(vars, fg, bg)).toBeGreaterThanOrEqual(min);
  });
});

describe("the GrassLMS mark (specs/072)", () => {
  it("is the same colour in both themes", () => {
    // A logo does not change with the theme. Pointing it at --color-primary
    // once turned the "g" light green with a black letter in dark mode.
    for (const token of ["--color-logo", "--color-logo-fg"]) {
      expect(resolveVar(DARK, `var(${token})`), token).toBe(resolveVar(LIGHT, `var(${token})`));
    }
    expect(resolveVar(LIGHT, "var(--color-logo)")).toBe("#0a8754");
  });
});

describe("the measurement itself", () => {
  it("fails a pair that is known to fail", () => {
    // White text on the sun marker: the reason for the no-white-on-yellow rule.
    const vars = { ...LIGHT, "--fg": "#ffffff", "--bg": "var(--sun-400)" };
    expect(ratio(vars, "--fg", "--bg")).toBeLessThan(4.5);
  });
});

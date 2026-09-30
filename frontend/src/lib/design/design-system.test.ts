import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Design-system ratchet (specs/071).
 *
 * Counts, per file, the places that bypass the design system: raw colours,
 * gradients, hand-typed motion values and the rest listed in RULES. The counts
 * live in `design/design-baseline.json` and may only go down:
 *
 *   - a file may not gain a violation, and a file missing from the baseline
 *     must have none, so new code is born clean;
 *   - a count that dropped must be written back to the baseline, otherwise the
 *     improvement could be undone without anyone noticing.
 *
 * Rewrite the baseline after an intentional clean-up:
 *
 *   UPDATE_DESIGN_BASELINE=1 npx vitest run src/lib/design
 *
 * Same pattern as src/lib/i18n/no-hardcoded-strings.test.ts. Rules and their
 * reasons: specs/071-design-system-v2/contracts/{tokens,motion}.md.
 */

const FRONTEND_ROOT = resolve(__dirname, "..", "..", "..");
const SRC_DIR = resolve(FRONTEND_ROOT, "src");
const BASELINE_PATH = resolve(FRONTEND_ROOT, "design", "design-baseline.json");

type RuleId =
  | "raw-hex"
  | "raw-palette"
  | "gradient"
  | "mono-eyebrow"
  | "tiny-text"
  | "btn-pop"
  | "glass"
  | "transition-all"
  | "ms-literal"
  | "bezier-literal"
  | "layout-anim"
  | "scale-zero"
  | "vt-nav";

const PALETTE =
  "gray|slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";

/** Each rule counts matches per line; a line may hit several rules. */
const RULES: Record<RuleId, RegExp> = {
  // 6/8-digit hex anywhere; 3-digit only where it is clearly a colour value,
  // so an anchor like href="#add" is not mistaken for one.
  "raw-hex":
    /(?<!(?:href|to)=["'`])(?:#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|(?<=[[\s:("'`])#[0-9a-fA-F]{3}(?=[\s;,)\]"'`]))/g,
  "raw-palette": new RegExp(
    `\\b(?:bg|text|border|ring|fill|stroke|from|via|to|outline|divide|shadow)-(?:${PALETTE})-\\d{2,3}\\b`,
    "g",
  ),
  gradient: /bg-gradient-to-|bg-linear-to-|bg-radial|(?:linear|radial|conic)-gradient\(/g,
  "mono-eyebrow": /\bfont-mono\b(?=[^"'`]*\buppercase\b)|\buppercase\b(?=[^"'`]*\bfont-mono\b)/g,
  "tiny-text": /\btext-\[1[01]px\]/g,
  "btn-pop": /\bbtn-pop\b/g,
  glass: /\bbackdrop-blur(?:-[a-z0-9]+)?\b|backdrop-filter\s*:\s*blur/g,
  "transition-all": /\btransition-all\b|transition\s*:\s*["'`]?all\b/g,
  // Hand-typed times in transition/animation declarations (CSS and inline
  // styles) and arbitrary Tailwind durations. The stock scale
  // duration-75…duration-1000 is allowed.
  "ms-literal":
    /\b(?:transition|animation)(?:-duration|-delay)?["'`]?\s*:\s*[^;{}]*?\b\d*\.?\d+m?s\b|\b(?:duration|delay)-\[\d/g,
  "bezier-literal": /cubic-bezier\(|\bease-\[/g,
  "layout-anim":
    /\btransition(?:-property)?["'`]?\s*:\s*[^;{}]*\b(?:width|height|top|left|right|bottom|margin[a-z-]*)\b|\btransition-\[(?:width|height|top|left|margin)/g,
  "scale-zero": /\bscale\(0\)|\bscale-0\b/g,
  "vt-nav": /\bstartViewTransition\b/g,
};

/**
 * Where colour is data or scene content rather than interface, the rules do
 * not apply. Each entry says why. Adding one needs the same justification in
 * the PR.
 */
const EXEMPT: { prefix: string; why: string }[] = [
  { prefix: "components/room/", why: "voxel room: colours are scene materials" },
  { prefix: "lib/room/", why: "voxel room palette data" },
  { prefix: "components/avatar/", why: "voxel avatar: skin, hair and cloth colours" },
  { prefix: "lib/avatar/", why: "voxel avatar palette data" },
  { prefix: "app/voxel-gallery/", why: "internal avatar gallery" },
  { prefix: "app/room-dev/", why: "internal room harness" },
  { prefix: "app/avatar-fitting/", why: "internal avatar harness" },
  { prefix: "components/game/", why: "2D/3D exercise scenes paint pixels, not interface" },
  { prefix: "components/analytics/", why: "chart series colours encode data" },
  { prefix: "app/(print)/", why: "print forms are styled for paper" },
  { prefix: "lib/print.ts", why: "print stylesheet builder" },
  { prefix: "lib/brand/", why: "logo colours are the brand asset itself" },
];

/** Files allowed to call startViewTransition (research R6). */
const VIEW_TRANSITION_ALLOWED: string[] = [];

type Counts = Record<string, Partial<Record<RuleId, number>>>;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry === "test-results") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(tsx?|css)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

const rel = (full: string) => relative(SRC_DIR, full).split(sep).join("/");

/** Comments explain rules; token definitions (`--x: …`) are the one place raw values belong. */
function isIgnorableLine(line: string): boolean {
  const t = line.trim();
  return t.startsWith("//") || t.startsWith("/*") || t.startsWith("*") || t.startsWith("--");
}

function countFile(path: string, text: string): Partial<Record<RuleId, number>> {
  const out: Partial<Record<RuleId, number>> = {};
  // Blank out block comments but keep their newlines, so prose inside a
  // multi-line comment is not read as code.
  const code = text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
  for (const line of code.split("\n")) {
    if (isIgnorableLine(line)) continue;
    for (const [rule, re] of Object.entries(RULES) as [RuleId, RegExp][]) {
      if (rule === "vt-nav" && VIEW_TRANSITION_ALLOWED.includes(path)) continue;
      const hits = line.match(re)?.length ?? 0;
      if (hits) out[rule] = (out[rule] ?? 0) + hits;
    }
  }
  return out;
}

function scan(): Counts {
  const counts: Counts = {};
  for (const full of walk(SRC_DIR)) {
    const path = rel(full);
    if (EXEMPT.some((e) => path.startsWith(e.prefix))) continue;
    const c = countFile(path, readFileSync(full, "utf8"));
    if (Object.keys(c).length) counts[path] = c;
  }
  return counts;
}

function sortCounts(c: Counts): Counts {
  const out: Counts = {};
  for (const file of Object.keys(c).sort()) {
    out[file] = Object.fromEntries(Object.entries(c[file]).sort(([a], [b]) => a.localeCompare(b)));
  }
  return out;
}

const current = scan();

if (process.env.UPDATE_DESIGN_BASELINE === "1") {
  writeFileSync(BASELINE_PATH, JSON.stringify(sortCounts(current), null, 2) + "\n");
}

const baseline: Counts = existsSync(BASELINE_PATH)
  ? JSON.parse(readFileSync(BASELINE_PATH, "utf8"))
  : {};

describe("design-system ratchet", () => {
  it("rules catch what they claim to catch", () => {
    // Positive control: the ratchet is only worth having if every rule fires.
    const sample = [
      '<div className="bg-[#ff0000] text-gray-500 bg-gradient-to-r from-green-400" />',
      '<span className="font-mono uppercase text-[10px]">x</span>',
      '<button className="btn-pop backdrop-blur-md transition-all duration-[250ms] ease-[cubic-bezier(0,0,1,1)]" />',
      ".x { transition: width 200ms cubic-bezier(0.2, 0.8, 0.2, 1); transform: scale(0); }",
      "document.startViewTransition(() => go());",
    ].join("\n");
    const hit = countFile("sample.tsx", sample);
    for (const rule of Object.keys(RULES)) expect(hit, rule).toHaveProperty(rule);
    // …and stays quiet on what the system allows.
    const clean = [
      '<a href="#add" className="bg-primary text-text-muted rounded-md duration-200" />',
      "  --motion-ease: cubic-bezier(0.2, 0.8, 0.2, 1);",
      ".x { transition: transform var(--motion-fast) var(--motion-ease); }",
      "// transition: all is banned",
      "/* contrast on",
      "   #111713 stays put */",
    ].join("\n");
    expect(countFile("clean.tsx", clean)).toEqual({});
  });

  it("no file gains a violation", () => {
    const worse: string[] = [];
    for (const [file, rules] of Object.entries(current)) {
      for (const [rule, n] of Object.entries(rules) as [RuleId, number][]) {
        const allowed = baseline[file]?.[rule] ?? 0;
        if (n > allowed) worse.push(`${file}: ${rule} ${n} (baseline ${allowed})`);
      }
    }
    expect(
      worse,
      "These files bypass the design system. Use a token or a component from " +
        "src/components/ui instead; rules are in specs/071-design-system-v2/contracts.",
    ).toEqual([]);
  });

  it("baseline records every improvement", () => {
    const better: string[] = [];
    for (const [file, rules] of Object.entries(baseline)) {
      for (const [rule, allowed] of Object.entries(rules) as [RuleId, number][]) {
        const n = current[file]?.[rule] ?? 0;
        if (n < allowed) better.push(`${file}: ${rule} ${n} (baseline ${allowed})`);
      }
    }
    expect(
      better,
      "Violations went down. Lock the gain in: " +
        "UPDATE_DESIGN_BASELINE=1 npx vitest run src/lib/design",
    ).toEqual([]);
  });
});

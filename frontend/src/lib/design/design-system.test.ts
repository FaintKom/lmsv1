import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Design-system guard (specs/071).
 *
 * Counts, per file, the places that bypass the design system: raw colours,
 * gradients, hand-typed motion values and the rest listed in RULES. It started
 * as a ratchet with a per-file baseline; PR 6 brought every count to zero, so
 * now any violation outside EXEMPT fails the build. A new exemption needs its
 * reason in EXEMPT and in the PR.
 *
 * Same idea as src/lib/i18n/no-hardcoded-strings.test.ts. Rules and their
 * reasons: specs/071-design-system-v2/contracts/{tokens,motion}.md.
 */

const FRONTEND_ROOT = resolve(__dirname, "..", "..", "..");
const SRC_DIR = resolve(FRONTEND_ROOT, "src");

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
  | "vt-nav"
  | "radius-over-cap"
  | "emoji"
  | "side-stripe"
  | "hard-shadow";

const PALETTE =
  "gray|slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";

/** Each rule counts matches per line; a line may hit several rules. */
const RULES: Record<RuleId, RegExp> = {
  // 6/8-digit hex anywhere; 3-digit only where it is clearly a colour value,
  // so an anchor like href="#add" is not mistaken for one.
  "raw-hex":
    /(?<!(?:href|to)=["'`])(?:#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|(?<=[[\s:("'`])#[0-9a-fA-F]{3}(?=[\s;,)\]"'`]))/g,
  "raw-palette": new RegExp(
    // border-l-emerald-400 slipped past the bare `border-` form until specs/075.
    `\\b(?:bg|text|border(?:-[trblxyse])?|ring|fill|stroke|from|via|to|outline|divide|shadow)-(?:${PALETTE})-\\d{2,3}\\b`,
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
  "bezier-literal": /cubic-bezier\(|\bease-\[(?!var\()/g,
  "layout-anim":
    /\btransition(?:-property)?["'`]?\s*:\s*[^;{}]*\b(?:width|height|top|left|right|bottom|margin[a-z-]*)\b|\btransition-\[(?:width|height|top|left|margin)/g,
  "scale-zero": /\bscale\(0\)|\bscale-0\b/g,
  "vt-nav": /\bstartViewTransition\b/g,
  // Radii stop at --radius-xl (14px); Tailwind's 2xl and up are 16px and more.
  "radius-over-cap": /\brounded(?:-[trblse]{1,2})?-(?:2xl|3xl|4xl|\[\d+px\])/g,
  // Emoji in place of an icon (spec, AI sign 2). Typographic marks such as
  // ✓, ✕, arrows and © are typography and pass.
  emoji: /(?![©®™↔-↙])\p{Extended_Pictographic}/gu,
  // A coloured stripe down the side of a card, callout or tile (specs/075).
  // Hairlines (border-l, 1px) are structure and pass; thicker is decoration.
  // Inline styles too: the journal's timetable had `borderLeft: \`4px solid …\``
  // in a style prop, which the class form never saw (specs/078).
  "side-stripe": /\bborder-[lrse]-(?:[2-8]|\[\d+px\])(?![\w-])|\bborder(?:Left|Right|InlineStart|InlineEnd)(?:Width)?:\s*["'`]\s*[2-9]px/g,
  // A shadow with no blur is a costume, not depth (specs/075): the "step"
  // under a pressed-looking button. Inline styles and arbitrary Tailwind.
  "hard-shadow": /boxShadow:\s*["'`]0 \d+px 0(?: 0)? |\bshadow-\[0_\d+px_0(?:_0)?_/g,
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
  { prefix: "components/gamification/league-mark.tsx", why: "league crest artwork: metal tones per league" },
  { prefix: "components/gamification/rank-medal.tsx", why: "medal artwork: gold, silver, bronze" },
  { prefix: "components/gamification/badge-icon.tsx", why: "badge artwork, one tint per badge kind" },
  // Lesson content is drawn by the course author; the system frames it and does
  // not repaint it (spec, edge cases).
  { prefix: "components/widgets/interactive-widgets.ts", why: "lesson content: math widgets drawn inside the author's lesson HTML" },
  { prefix: "components/common/content-renderer.tsx", why: "lesson content: base styles for the author's HTML in a sandboxed iframe" },
  { prefix: "components/editor/editor-styles.css", why: "lesson content: how the author's rich text looks while it is written" },
  { prefix: "components/editor/extensions/callout.ts", why: "lesson content: the callout icon is saved into the lesson's HTML" },
  { prefix: "components/exercises/v2/map-pin-v2.tsx", why: "exercise scene: the map's sky and water" },
  { prefix: "components/exercises/v2/solid-view.tsx", why: "Three.js needs a literal fallback before the CSS token is read" },
  { prefix: "app/student-cabinet/", why: "3D cabinet scene: colours are scene materials" },
  // A school's own brand colour is data the school types in.
  { prefix: "components/admin/brand-preview.tsx", why: "previews the school's own brand colour" },
  { prefix: "components/admin/org-settings-form.tsx", why: "the school's brand colour picker and its defaults" },
  { prefix: "components/layout/brand-vars.ts", why: "derives --primary from the school's brand colour" },
  { prefix: "components/layout/school-mark.tsx", why: "draws the school's mark in its own colour" },
  { prefix: "app/layout.tsx", why: "Next metadata themeColor is a literal for the browser chrome; it cannot read CSS" },
];

/** Files allowed to call startViewTransition (research R6). */
const VIEW_TRANSITION_ALLOWED: string[] = ["lib/view-transition.ts"];

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
      // Two timings are governed, not hand-typed: the exercise feedback grammar
      // scales every duration by its --mdur knob, and constant motion
      // (spinners, skeletons) loops on its own clock (MOTION.md §2).
      if (rule === "ms-literal" && (/\*\s*var\(--mdur\)/.test(line) || /\binfinite\b/.test(line))) continue;
      // Goal labels of the robot and 3D-world games live in the locale files
      // but are drawn only inside components/game, which is exempt.
      if (rule === "emoji" && /"(?:world|game)\.goal\./.test(line)) continue;
      // One line, one rule, a reason in the code: `// design-allow: side-stripe — why`.
      // For the brace of a system of equations, which is notation, not a stripe.
      if (line.includes(`design-allow: ${rule}`)) continue;
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

const current = scan();

describe("design-system guard", () => {
  it("rules catch what they claim to catch", () => {
    // Positive control: the ratchet is only worth having if every rule fires.
    const sample = [
      '<div className="bg-[#ff0000] text-gray-500 bg-gradient-to-r from-green-400" />',
      '<span className="font-mono uppercase text-[10px]">x</span>',
      '<button className="btn-pop backdrop-blur-md transition-all duration-[250ms] ease-[cubic-bezier(0,0,1,1)]" />',
      ".x { transition: width 200ms cubic-bezier(0.2, 0.8, 0.2, 1); transform: scale(0); }",
      "document.startViewTransition(() => go());",
      '<div className="rounded-2xl" />',
      '<span>⚠ {label}</span>',
      '<div className="border-l-4 border-primary" />',
      '<button style={{ borderLeft: `4px solid ${color}` }} />',
      '<button style={{ boxShadow: "0 4px 0 0 var(--green-700)" }} />',
    ].join("\n");
    const hit = countFile("sample.tsx", sample);
    for (const rule of Object.keys(RULES)) expect(hit, rule).toHaveProperty(rule);
    // …and stays quiet on what the system allows.
    const clean = [
      '<a href="#add" className="bg-primary text-text-muted rounded-md duration-200" />',
      '<div className="duration-[var(--motion-fast)] ease-[var(--motion-ease)]" />',
      ".fb-x { animation: fb-shake calc(0.4s * var(--mdur)) var(--motion-ease) both; }",
      ".spin { animation: gp-rotate 0.7s linear infinite; }",
      "  --motion-ease: cubic-bezier(0.2, 0.8, 0.2, 1);",
      ".x { transition: transform var(--motion-fast) var(--motion-ease); }",
      "// transition: all is banned",
      '<span>✓ {done} ✕ → ↔ © 2026</span>',
      '  "game.goal.at_goal": "🏁 Get the robot to the flag",',
      "/* contrast on",
      "   #111713 stays put */",
      '<ul className="border-l border-border pl-3" />',
      '<a className="-mb-px border-b-2 border-primary" />',
      '<div className="shadow-md" style={{ boxShadow: "0 8px 24px -8px rgba(0,0,0,.2)" }} />',
    ].join("\n");
    expect(countFile("clean.tsx", clean)).toEqual({});
  });

  it("nothing outside EXEMPT bypasses the system", () => {
    const found = Object.entries(current).flatMap(([file, rules]) =>
      Object.entries(rules).map(([rule, n]) => `${file}: ${rule} ${n}`),
    );
    expect(
      found,
      "These files bypass the design system. Use a token or a component from " +
        "src/components/ui instead; rules are in specs/071-design-system-v2/contracts.",
    ).toEqual([]);
  });
});

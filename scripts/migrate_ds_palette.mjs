#!/usr/bin/env node
// One-shot off-palette → GrassLMS DS migration.
// Walks frontend/src for *.ts, *.tsx, *.css and rewrites Tailwind color
// utilities according to the mapping table below. Idempotent: running
// twice is safe.
//
// Mapping families:
//   slate / gray / zinc / neutral / stone → ink (warm neutrals)
//   emerald / teal                        → green (1:1)
//   amber / orange / yellow               → sun
//   red / rose / pink                     → coral
//   indigo / purple / violet / fuchsia    → green (no purple in DS)
//   blue / cyan / sky                     → kept as-is (info channel)

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.cwd(), "frontend/src");

const NEUTRAL_TO_INK = {
  "50": "50", "100": "100", "200": "200", "300": "300", "400": "400",
  "500": "500", "600": "700", "700": "700", "800": "900", "900": "900",
};
const AMBER_TO_SUN = {
  "50": "50", "100": "100", "200": "100", "300": "300", "400": "400",
  "500": "500", "600": "500", "700": "700", "800": "700", "900": "700",
};
const RED_TO_CORAL = {
  "50": "50", "100": "50", "200": "300", "300": "300", "400": "300",
  "500": "500", "600": "500", "700": "700", "800": "700", "900": "700",
};
const PURPLE_TO_GREEN = {
  "50": "50", "100": "100", "200": "200", "300": "300", "400": "400",
  "500": "500", "600": "600", "700": "700", "800": "800", "900": "900",
};
const EMERALD_TO_GREEN = PURPLE_TO_GREEN;

const FAMILIES = [
  { sources: ["slate", "gray", "zinc", "neutral", "stone"], target: "ink", map: NEUTRAL_TO_INK },
  { sources: ["emerald", "teal"], target: "green", map: EMERALD_TO_GREEN },
  { sources: ["amber", "orange", "yellow"], target: "sun", map: AMBER_TO_SUN },
  { sources: ["red", "rose", "pink"], target: "coral", map: RED_TO_CORAL },
  { sources: ["indigo", "purple", "violet", "fuchsia"], target: "green", map: PURPLE_TO_GREEN },
];

// Match Tailwind utilities that take a color, including directional border
// variants (border-l, border-x, border-t, etc.) and divide-x/y. The leading
// boundary `(^|[^a-z])` keeps us from rewriting class fragments inside
// another identifier.
const PREFIX_RE = /(^|[^a-z])(bg|text|border(?:-[xytrlbse])?|ring(?:-offset)?|fill|stroke|from|to|via|divide(?:-[xy])?|outline|decoration|placeholder|accent|caret|shadow)-(slate|gray|zinc|neutral|stone|emerald|teal|amber|orange|yellow|red|rose|pink|indigo|purple|violet|fuchsia)-(\d{2,3})\b/g;

// Note: shade map only goes up to 900; tailwind also has 950 for some
// scales. Treat 950 as 900 (clamped) — Tailwind 950 is darker than 900,
// nearest in our scale is 900.

function getMappingForFamily(fam) {
  for (const f of FAMILIES) {
    if (f.sources.includes(fam)) return f;
  }
  return null;
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (/\.(ts|tsx|css)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

// Hex literal mapping — for inline SVG fill/stroke, style attrs, and other
// places the class-name regex misses. Idempotent: target hexes never collide
// with source hexes.
const HEX_MAP = {
  // Tailwind green-* → GrassLMS green-*
  "#22c55e": "#3fb04b",
  "#16a34a": "#0a8754",
  "#15803d": "#07683f",
  "#86efac": "#8fd770",
  "#bbf7d0": "#d4f1c4",
  "#dcfce7": "#ecf9e7",
  // Emerald-* → green-*
  "#10b981": "#3fb04b",
  "#059669": "#0a8754",
  // Amber-* → Sun-*
  "#f59e0b": "#f5b800",
  "#fbbf24": "#ffd84d",
  "#fcd34d": "#ffe066",
  "#fef3c7": "#fff2b3",
  "#fffbeb": "#fffbe5",
  // Red-* → Coral-*
  "#ef4444": "#ff7a5c",
  "#dc2626": "#c33d22",
  "#fee2e2": "#fff0eb",
  // Slate-* → Ink-*
  "#0f172a": "#0a1a10",
  "#1e293b": "#1a2a1f",
  "#334155": "#1a2a1f",
  "#475569": "#4d5a51",
  "#64748b": "#4d5a51",
  "#94a3b8": "#9aa39d",
  "#cbd5e1": "#c9cec9",
  "#e2e8f0": "#e6e8e4",
  "#f1f5f9": "#f4f5f1",
  "#f8fafc": "#fafbf6",
  // Indigo-* → green-* (no purple in DS)
  "#6366f1": "#0a8754",
  "#4f46e5": "#07683f",
  "#4338ca": "#054d2f",
};
const HEX_RE = new RegExp(
  "(" + Object.keys(HEX_MAP).join("|") + ")",
  "gi"
);

const files = walk(ROOT);
let changedFiles = 0;
let totalReplacements = 0;
for (const f of files) {
  const orig = fs.readFileSync(f, "utf8");
  let count = 0;
  let next = orig.replace(PREFIX_RE, (m, lead, prefix, fam, shade) => {
    const fmap = getMappingForFamily(fam);
    if (!fmap) return m;
    const clampedShade = shade === "950" ? "900" : shade;
    const newShade = fmap.map[clampedShade] ?? clampedShade;
    count++;
    return `${lead}${prefix}-${fmap.target}-${newShade}`;
  });
  next = next.replace(HEX_RE, (hex) => {
    const lower = hex.toLowerCase();
    const out = HEX_MAP[lower];
    if (!out) return hex;
    count++;
    return out;
  });
  if (count > 0) {
    fs.writeFileSync(f, next, "utf8");
    changedFiles++;
    totalReplacements += count;
    console.log(`${f.replace(ROOT, "")}: ${count}`);
  }
}
console.log(`---\nfiles changed: ${changedFiles}\nreplacements:  ${totalReplacements}`);

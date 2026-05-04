#!/usr/bin/env node
// Token migration per frontend/design/migration-map.md.
// Run: node frontend/design/scripts/migrate.mjs [--dry] [--only=dark|colors|radii|all]
//
// Idempotent. Safe to re-run. Skips frontend/design/ itself and node_modules.
// Reports per-pattern hit counts to stdout.
//
// Allowlist: frontend/src/app/(admin)/admin/style-preview/ — design-system
// showcase, raw palette permitted.

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../src/", import.meta.url));
const ALLOW_RAW_PALETTE = ["app", "(admin)", "admin", "style-preview"].join(sep);

const args = new Set(process.argv.slice(2));
const DRY = args.has("--dry");
const ONLY =
  [...args].find((a) => a.startsWith("--only="))?.split("=")[1] ?? "all";

const stats = new Map();
const bump = (k, n = 1) => stats.set(k, (stats.get(k) ?? 0) + n);

const EXTS = new Set([".ts", ".tsx", ".css", ".js", ".jsx", ".mjs"]);

function* walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".next") continue;
      yield* walk(p);
    } else if (e.isFile()) {
      const dot = e.name.lastIndexOf(".");
      if (dot >= 0 && EXTS.has(e.name.slice(dot))) yield p;
    }
  }
}

function stripDark(src) {
  let count = 0;
  const re = /\bdark:[^\s"'`]+/g;
  const out = src.replace(re, () => {
    count++;
    return "";
  });
  bump("dark:* stripped", count);
  return out.replace(/[ \t]{2,}/g, " ");
}

const REPLACES_COLORS = [
  // Backgrounds
  [/\bbg-white\b/g, "bg-paper-2"],
  [/\bbg-black\b/g, "bg-ink-900"],
  [/\bbg-(?:gray|zinc|slate)-200\b/g, "bg-ink-200"],
  [/\bbg-(?:gray|zinc|slate)-900\b/g, "bg-ink-900"],
  [/\bbg-(?:gray|zinc|slate)-800\b/g, "bg-ink-700"],
  [/\bbg-(?:gray|zinc|slate)-700\b/g, "bg-ink-700"],
  [/\bbg-(?:gray|zinc|slate)-600\b/g, "bg-ink-500"],
  [/\bbg-(?:gray|zinc|slate)-500\b/g, "bg-ink-500"],
  [/\bbg-(?:gray|zinc|slate)-400\b/g, "bg-ink-400"],
  [/\bbg-(?:gray|zinc|slate)-300\b/g, "bg-ink-300"],
  [/\bbg-(?:gray|zinc|slate)-100\b/g, "bg-ink-100"],
  [/\bbg-(?:gray|zinc|slate)-50\b/g, "bg-surface-2"],

  [/\bbg-(?:green|emerald)-50\b/g, "bg-success-soft"],
  [/\bbg-(?:green|emerald)-100\b/g, "bg-primary-soft"],
  [/\bbg-(?:green|emerald)-200\b/g, "bg-green-200"],
  [/\bbg-(?:green|emerald)-300\b/g, "bg-green-300"],
  [/\bbg-(?:green|emerald)-400\b/g, "bg-green-400"],
  [/\bbg-(?:green|emerald)-500\b/g, "bg-primary"],
  [/\bbg-(?:green|emerald)-600\b/g, "bg-primary"],
  [/\bbg-(?:green|emerald)-700\b/g, "bg-green-700"],
  [/\bbg-(?:green|emerald)-800\b/g, "bg-green-800"],
  [/\bbg-(?:green|emerald)-900\b/g, "bg-green-900"],

  [/\bbg-blue-50\b/g, "bg-info-soft"],
  [/\bbg-blue-(?:100|200|300|400)\b/g, "bg-info-soft"],
  [/\bbg-blue-(?:500|600|700)\b/g, "bg-info"],
  [/\bbg-blue-(?:800|900)\b/g, "bg-info-fg"],
  [/\bbg-sky-\d+\b/g, "bg-info-soft"],
  [/\bbg-cyan-\d+\b/g, "bg-info-soft"],
  [/\bbg-teal-\d+\b/g, "bg-primary-soft"],

  [/\bbg-(?:indigo|violet|purple|fuchsia|pink)-\d+\b/g, ""],

  [/\bbg-(?:red|rose)-50\b/g, "bg-danger-soft"],
  [/\bbg-(?:red|rose)-(?:100|200|300|400)\b/g, "bg-danger-soft"],
  [/\bbg-(?:red|rose)-(?:500|600|700|800|900)\b/g, "bg-danger"],

  [/\bbg-(?:amber|yellow)-50\b/g, "bg-sun-50"],
  [/\bbg-(?:amber|yellow)-100\b/g, "bg-sun-100"],
  [/\bbg-(?:amber|yellow)-(?:200|300)\b/g, "bg-sun-300"],
  [/\bbg-(?:amber|yellow)-400\b/g, "bg-sun-400"],
  [/\bbg-(?:amber|yellow)-(?:500|600)\b/g, "bg-warning"],
  [/\bbg-(?:amber|yellow)-(?:700|800|900)\b/g, "bg-warning-fg"],

  [/\bbg-orange-50\b/g, "bg-coral-50"],
  [/\bbg-orange-(?:100|200|300|400)\b/g, "bg-coral-300"],
  [/\bbg-orange-(?:500|600|700)\b/g, "bg-coral-500"],
  [/\bbg-orange-(?:800|900)\b/g, "bg-coral-700"],

  // Text
  [/\btext-black\b/g, "text-text"],
  [/\btext-(?:gray|zinc|slate)-900\b/g, "text-text"],
  [/\btext-(?:gray|zinc|slate)-800\b/g, "text-ink-700"],
  [/\btext-(?:gray|zinc|slate)-700\b/g, "text-ink-700"],
  [/\btext-(?:gray|zinc|slate)-600\b/g, "text-text-muted"],
  [/\btext-(?:gray|zinc|slate)-500\b/g, "text-text-muted"],
  [/\btext-(?:gray|zinc|slate)-400\b/g, "text-text-subtle"],
  [/\btext-(?:gray|zinc|slate)-300\b/g, "text-ink-300"],
  [/\btext-(?:gray|zinc|slate)-200\b/g, "text-ink-200"],
  [/\btext-(?:gray|zinc|slate)-100\b/g, "text-ink-100"],
  [/\btext-(?:gray|zinc|slate)-50\b/g, "text-text-inverse"],

  [/\btext-(?:green|emerald)-50\b/g, "text-text-inverse"],
  [/\btext-(?:green|emerald)-100\b/g, "text-success-soft"],
  [/\btext-(?:green|emerald)-(?:500|600)\b/g, "text-primary"],
  [/\btext-(?:green|emerald)-(?:700|800|900)\b/g, "text-success-fg"],

  [/\btext-(?:red|rose)-(?:50|100|200|300|400)\b/g, "text-danger"],
  [/\btext-(?:red|rose)-(?:500|600|700|800|900)\b/g, "text-danger-fg"],

  [/\btext-(?:amber|yellow)-(?:50|100|200|300|400)\b/g, "text-warning"],
  [/\btext-(?:amber|yellow)-(?:500|600|700|800|900)\b/g, "text-warning-fg"],

  [/\btext-blue-(?:50|100|200|300|400)\b/g, "text-info"],
  [/\btext-blue-(?:500|600|700|800|900)\b/g, "text-info-fg"],
  [/\btext-(?:sky|cyan|teal)-\d+\b/g, "text-info-fg"],

  [/\btext-(?:indigo|violet|purple|fuchsia|pink)-\d+\b/g, "text-text"],

  [/\btext-orange-(?:50|100|200|300|400)\b/g, "text-coral-300"],
  [/\btext-orange-(?:500|600|700|800|900)\b/g, "text-coral-700"],

  // Borders
  [/\bborder-(?:gray|zinc|slate)-100\b/g, "border-border"],
  [/\bborder-(?:gray|zinc|slate)-200\b/g, "border-border-strong"],
  [/\bborder-(?:gray|zinc|slate)-300\b/g, "border-ink-300"],
  [/\bborder-(?:gray|zinc|slate)-(?:400|500)\b/g, "border-ink-400"],
  [/\bborder-(?:gray|zinc|slate)-(?:600|700|800|900)\b/g, "border-ink-700"],
  [/\bborder-(?:green|emerald)-(?:500|600)\b/g, "border-primary"],
  [/\bborder-(?:green|emerald)-(?:300|400)\b/g, "border-green-300"],
  [/\bborder-(?:green|emerald)-(?:700|800|900)\b/g, "border-success-fg"],
  [/\bborder-(?:green|emerald)-(?:50|100|200)\b/g, "border-primary-soft"],
  [/\bborder-(?:red|rose)-\d+\b/g, "border-danger"],
  [/\bborder-(?:amber|yellow)-\d+\b/g, "border-warning"],
  [/\bborder-blue-\d+\b/g, "border-info"],
  [/\bborder-(?:indigo|violet|purple|fuchsia|pink)-\d+\b/g, "border-border"],
  [/\bborder-orange-\d+\b/g, "border-coral-500"],

  // Hover/focus/active variants
  [/\b(hover|focus|active|focus-visible|group-hover):bg-(?:green|emerald)-(?:500|600|700)\b/g, "$1:bg-primary-hover"],
  [/\b(hover|focus|active):bg-(?:green|emerald)-(?:50|100)\b/g, "$1:bg-primary-soft"],
  [/\b(hover|focus|active):bg-(?:gray|zinc|slate)-50\b/g, "$1:bg-surface-2"],
  [/\b(hover|focus|active):bg-(?:gray|zinc|slate)-100\b/g, "$1:bg-ink-100"],
  [/\b(hover|focus|active):bg-(?:red|rose)-(?:500|600|700)\b/g, "$1:bg-danger"],
  [/\b(hover|focus|active):text-(?:green|emerald)-(?:500|600|700)\b/g, "$1:text-primary"],
  [/\b(hover|focus|active):border-(?:green|emerald)-(?:300|400|500|600)\b/g, "$1:border-primary"],

  // Placeholder color (dash form, not colon)
  [/\bplaceholder-(?:gray|zinc|slate)-(?:300|400)\b/g, "placeholder-ink-300"],
  [/\bplaceholder:text-(?:gray|zinc|slate)-(?:300|400)\b/g, "placeholder:text-ink-300"],

  // Focus ring with opacity modifier
  [/\bfocus:ring-(?:green|emerald)-400\/\d+\b/g, "focus:ring-primary-soft"],
  [/\bring-(?:green|emerald)-(?:50|100)\b/g, "ring-primary-soft"],

  // Shadow color utilities
  [/\bshadow-(?:green|emerald)-(?:200|300)\b/g, "shadow-primary-soft"],
  [/\bshadow-(?:red|rose)-(?:200|300)\b/g, "shadow-danger-soft"],
];

const REPLACES_RADII = [
  [/\brounded-2xl\b/g, "rounded-xl"],
  [/\brounded-3xl\b/g, "rounded-xl"],
  [/\brounded-xl\b/g, "rounded-lg"],
  [/\brounded-full\b/g, "rounded-pill"],
];

function applyTable(src, table, label) {
  let out = src;
  for (const [re, to] of table) {
    let n = 0;
    out = out.replace(re, () => {
      n++;
      return to;
    });
    if (n) bump(`${label}: ${re.source} → ${to || "(removed)"}`, n);
  }
  return out;
}

let touched = 0;
const startedAt = Date.now();

for (const file of walk(ROOT)) {
  const isAllowlisted = file.includes(ALLOW_RAW_PALETTE);
  const before = readFileSync(file, "utf8");
  let after = before;

  if (ONLY === "all" || ONLY === "dark") {
    after = stripDark(after);
  }
  if (!isAllowlisted && (ONLY === "all" || ONLY === "colors")) {
    after = applyTable(after, REPLACES_COLORS, "color");
  }
  if (ONLY === "all" || ONLY === "radii") {
    after = applyTable(after, REPLACES_RADII, "radius");
  }

  if (after !== before) {
    touched++;
    if (!DRY) writeFileSync(file, after);
  }
}

const ms = Date.now() - startedAt;
console.log(`\n=== migrate.mjs report ===`);
console.log(`Mode: ${DRY ? "DRY-RUN (no writes)" : "WRITE"}, --only=${ONLY}`);
console.log(`Files touched: ${touched}, elapsed: ${ms}ms\n`);

const sorted = [...stats.entries()].sort((a, b) => b[1] - a[1]);
for (const [k, v] of sorted) {
  console.log(`${String(v).padStart(6)}  ${k}`);
}

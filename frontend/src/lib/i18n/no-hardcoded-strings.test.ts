import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, posix, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { I18N_ALLOWLIST } from "./i18n-allowlist";

/**
 * i18n ratchet test.
 *
 * Goal: prevent regression of the multi-phase i18n rollout. Phases 1-4
 * translated ~140 files. New code added after that MUST either
 * use the `useTranslation` hook or be added to `i18n-allowlist.ts`
 * (which requires explicit owner approval in PR review).
 *
 * The list can only SHRINK — owner removes entries by adding `t()` calls
 * to the file. There is no automated path to add new entries.
 *
 * Heuristic: a file is considered i18n-aware if it contains the literal
 * string `useTranslation` (the hook import or call). We do NOT parse the
 * file to verify EVERY string is wrapped — that would have too many
 * false positives. The ratchet catches the most common regression:
 * forgetting to wire up i18n at all in a new component.
 */

const FRONTEND_ROOT = resolve(__dirname, "..", "..", "..");
const SRC_DIR = resolve(FRONTEND_ROOT, "src");

function walk(dir: string, out: string[] = []): string[] {
 for (const entry of readdirSync(dir)) {
  // Skip build/test artifacts. Same pattern Vitest uses.
  if (entry === "node_modules" || entry === ".next" || entry === "test-results") continue;
  const full = join(dir, entry);
  if (statSync(full).isDirectory()) {
   walk(full, out);
  } else if (entry.endsWith(".tsx")) {
   out.push(full);
  }
 }
 return out;
}

function toRelPosix(absPath: string): string {
 // Normalize to posix slashes so the allowlist is OS-agnostic.
 return relative(FRONTEND_ROOT, absPath).split(/[\\/]/).join(posix.sep);
}

describe("i18n ratchet — no hardcoded strings in new files", () => {
 const allTsx = walk(SRC_DIR).map(toRelPosix).sort();

 it("every .tsx file either uses useTranslation or is in the allowlist", () => {
  const offenders: string[] = [];
  for (const rel of allTsx) {
   if (I18N_ALLOWLIST.has(rel)) continue;
   const abs = join(FRONTEND_ROOT, rel);
   const source = readFileSync(abs, "utf-8");
   // Heuristic: presence of `useTranslation` substring counts as
   // i18n-aware. False positives possible (comment mentioning the hook)
   // but the alternative — AST parsing — is overkill here.
   if (!source.includes("useTranslation")) {
    offenders.push(rel);
   }
  }
  if (offenders.length > 0) {
   const msg = [
    `Found ${offenders.length} .tsx file(s) that neither import useTranslation`,
    "nor appear in I18N_ALLOWLIST. Either:",
    "  1. Add `useTranslation` + `t()` calls for every user-visible string.",
    "  2. Add the file path to src/lib/i18n/i18n-allowlist.ts (owner approval).",
    "",
    "Offenders:",
    ...offenders.map((f) => `  - ${f}`),
   ].join("\n");
   throw new Error(msg);
  }
 });

 it("allowlist entries all still exist on disk (no stale paths)", () => {
  const existing = new Set(allTsx);
  const stale: string[] = [];
  for (const entry of I18N_ALLOWLIST) {
   if (!existing.has(entry)) stale.push(entry);
  }
  expect(stale, `Stale allowlist entries (file deleted/renamed): ${stale.join(", ")}`).toEqual([]);
 });

 it("allowlist entries all NOT using useTranslation (otherwise remove them)", () => {
  const promoted: string[] = [];
  for (const entry of I18N_ALLOWLIST) {
   const abs = join(FRONTEND_ROOT, entry);
   try {
    const source = readFileSync(abs, "utf-8");
    if (source.includes("useTranslation")) promoted.push(entry);
   } catch {
    // Stale entry — caught by the test above.
   }
  }
  expect(
   promoted,
   `Files in allowlist that now use useTranslation (remove them from i18n-allowlist.ts to ratchet down): ${promoted.join(", ")}`,
  ).toEqual([]);
 });
});

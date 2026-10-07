import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * English left behind in files that already translate (specs/077).
 *
 * no-hardcoded-strings.test.ts asks one question of a file: does it call
 * useTranslation at all? A file that translates its title and hard-codes its
 * toasts passes that test, and its toasts reach a Russian or Turkish user in
 * English. On 2026-10-06 that was ~400 strings in 22 files, among them the
 * exercise player every pupil uses and the profile page.
 *
 * This counts what the first test cannot see, per file, against BASELINE.
 * A count may only go down, and when it does BASELINE goes down with it, so
 * the number on file is always the number in the code.
 */

const SRC_DIR = resolve(__dirname, "..", "..");

/** Scenes, harnesses and tests: not interface copy. */
const SKIP = /^(components\/(room|avatar|game)\/|app\/(voxel-gallery|room-dev|avatar-fitting|student-cabinet)\/)/;

const RULES: [string, RegExp][] = [
  // >Some text< on one line. Not after "=" or "-": `=> Promise<void>` is a type.
  ["jsx-text", /(?<![=-])>\s*([A-Z][a-z]{2,}[^<>{}\n]*?)\s*</g],
  // a line of JSX that is nothing but two or more words
  ["jsx-line", /^\s+([A-Z][a-z]{2,}(?: [a-zA-Z,.'!?-]+)+)\s*$/gm],
  ["toast", /toast\.(?:success|error|info|warning)\(\s*"([^"]+)"/g],
  ["confirm", /(?:message|title|confirmLabel|cancelLabel):\s*"([A-Z][^"]+)"/g],
  ["attr", /\s(?:placeholder|title|aria-label)="([A-Z][a-z][^"]*)"/g],
];

/** English-looking strings that are not interface copy. Each has its reason. */
const NOT_COPY = new Set([
  "GrassLMS", // the brand
  "English", // translation editor: stored language values, shown as examples
  "Russian",
  "Welcome2026!", // bulk enrol: the actual default password, so it must read as typed
  "Python", // language names in the code editor
  "JavaScript",
  "Java",
]);

/** Counts as of specs/077. Lower a number when you translate; never raise one. */
const BASELINE: Record<string, number> = {};

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry === "test-results") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry.endsWith(".tsx") && !entry.endsWith(".test.tsx")) out.push(full);
  }
  return out;
}

export function literalsIn(source: string): string[] {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const found: string[] = [];
  for (const [, re] of RULES) for (const m of code.matchAll(re)) found.push(m[1].trim());
  return found.filter((s) => !NOT_COPY.has(s));
}

function scan(): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const full of walk(SRC_DIR)) {
    const rel = relative(SRC_DIR, full).split(sep).join("/");
    if (SKIP.test(rel)) continue;
    const source = readFileSync(full, "utf8");
    if (!source.includes("useTranslation")) continue; // the other test's job
    const hits = literalsIn(source);
    if (hits.length) out[rel] = hits;
  }
  return out;
}

describe("i18n — no English left in translated files", () => {
  it("catches what it claims to catch", () => {
    const sample = [
      '<p className="x">Sent to your teacher</p>',
      "            Answer Revealed",
      'toast.error("Failed to upload file.");',
      'confirm({ message: "Delete this lesson?" })',
      '<input placeholder="Tell us about yourself" />',
    ].join("\n");
    expect(literalsIn(sample)).toHaveLength(5);
    const clean = [
      '<p>{t("exr.sentToTeacher")}</p>',
      'toast.error(t("exr.uploadFailed"));',
      "// Answer Revealed was hard-coded here",
      '<input placeholder={t("profile.bio")} />',
      "<span>{count} XP</span>",
    ].join("\n");
    expect(literalsIn(clean)).toEqual([]);
  });

  it("no file holds more English than its baseline, and baselines are current", () => {
    const now = scan();
    const problems: string[] = [];
    for (const [file, hits] of Object.entries(now)) {
      const allowed = BASELINE[file] ?? 0;
      if (hits.length > allowed) {
        problems.push(`${file}: ${hits.length} > ${allowed}. Translate: ${hits.slice(0, 5).join(" | ")}`);
      }
    }
    for (const [file, allowed] of Object.entries(BASELINE)) {
      const n = now[file]?.length ?? 0;
      if (n < allowed) problems.push(`${file}: ${n} < ${allowed}. Lower BASELINE to ${n}.`);
    }
    expect(problems, problems.join("\n")).toEqual([]);
  });
});

import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Icons must be drawings we ship, not characters the operating system draws.
 *
 * An emoji in a label is rendered by whatever emoji font the machine happens
 * to have: a different picture on Windows than on a Mac, and an empty box on
 * a Linux build without one. These are the screens a pupil codes on, so the
 * rule is checked rather than remembered.
 */

const ROOT = resolve(__dirname, "..", "..", "..");

const GUARDED = [
  "src/components/game/robot-2d/robot-2d-exercise.tsx",
  "src/components/game/robot-2d/robot-2d-editor.tsx",
  "src/components/game/robot-2d/grid-renderer.tsx",
  "src/components/game/world-3d/world-3d-exercise.tsx",
  "src/components/game/blockly/block-translations.ts",
  "src/components/game/blockly/toolbox-configs.ts",
];

// Pictographs and their variation selector. Arrows and maths symbols are
// deliberately not here: "→" in a caption is punctuation, not an icon.
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u;

describe("student coding screens carry no emoji", () => {
  it.each(GUARDED)("%s", (rel) => {
    const source = readFileSync(join(ROOT, rel), "utf-8");
    const offenders = source
      .split("\n")
      .map((line, i) => ({ line, n: i + 1 }))
      .filter(({ line }) => EMOJI.test(line));
    expect(
      offenders.map(({ n, line }) => `${n}: ${line.trim()}`),
      "replace the emoji with an SVG icon (lucide) or plain text",
    ).toEqual([]);
  });
});

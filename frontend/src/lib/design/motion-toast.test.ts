import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * M8 (MOTION.md §8): toasts come in from below and leave faster. The motion
 * is Sonner's own, so what this project owns is two facts: every toast goes
 * through Sonner, and the Sonner we ship stops that motion under
 * prefers-reduced-motion. A Playwright probe cannot check the second one:
 * Sonner injects its stylesheet only once a toast is on screen.
 *
 * SONNER_BUNDLE points the check at another copy of the bundle, which is how
 * it was shown to fail without touching the shared node_modules.
 */

const ROOT = resolve(__dirname, "..", "..", "..");
const BUNDLE = process.env.SONNER_BUNDLE ?? resolve(ROOT, "node_modules/sonner/dist/index.mjs");

describe("M8 toasts", () => {
  it("the app's Toaster is Sonner", () => {
    const toaster = readFileSync(resolve(ROOT, "src/components/ui/toaster.tsx"), "utf8");
    expect(toaster).toMatch(/from "sonner"/);
  });

  it("the installed Sonner switches its motion off under reduced motion", () => {
    const bundle = readFileSync(BUNDLE, "utf8");
    const rule = bundle.match(/@media \(prefers-reduced-motion\)\{([^{}]*)\{([^}]*)\}\}/);
    expect(rule, "Sonner dropped its reduced-motion rule; add our own in globals.css").not.toBeNull();
    expect(rule![1]).toContain("[data-sonner-toast]");
    expect(rule![2]).toContain("transition:none");
    expect(rule![2]).toContain("animation:none");
  });
});

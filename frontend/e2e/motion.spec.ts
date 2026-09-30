import { expect, test, type Page } from "@playwright/test";

import { authenticate, BASE_URL, STUDENT } from "./poms/ContentTypeHarness";

/**
 * Motion contract, specs/071 contracts/motion.md.
 *
 * Every pattern runs twice: with motion, it has to actually move; under
 * `prefers-reduced-motion: reduce`, nothing may move or scale, while colour
 * and opacity may still change. jsdom computes no CSS animation, so this lives
 * in Playwright or nowhere.
 *
 * The shared patterns (M2, M3) are checked on an element the test mounts
 * itself with the production class, on a real page with the real stylesheet.
 * Waiting for data to happen to contain a half-finished course made the check
 * depend on the seed: the QA course sits at 0%, where there is nothing to grow.
 */

const MODES = [
  { name: "motion", reducedMotion: "no-preference" as const },
  { name: "reduced", reducedMotion: "reduce" as const },
];

const seconds = (value: string) =>
  Math.max(...value.split(",").map((v) => (v.trim().endsWith("ms") ? parseFloat(v) / 1000 : parseFloat(v))));

/** Mount `html` at the end of <body>, return a locator for `#motion-probe`. */
async function mount(page: Page, html: string) {
  await page.evaluate((markup) => {
    document.getElementById("motion-probe")?.remove();
    document.body.insertAdjacentHTML("beforeend", markup);
  }, html);
  return page.locator("#motion-probe");
}

for (const mode of MODES) {
  test.describe(`motion, ${mode.name}`, () => {
    test.beforeEach(async ({ context, page }) => {
      await authenticate(context, STUDENT);
      // Explicit per page: `test.use({ reducedMotion })` left matchMedia false
      // on this setup, and the check below is what caught it.
      await page.emulateMedia({ reducedMotion: mode.reducedMotion });
      await page.goto(`${BASE_URL}/courses`);
      // The emulation itself is part of what is under test.
      const reduced = await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
      expect(reduced).toBe(mode.reducedMotion === "reduce");
    });

    test("M2 progress fill grows by transform, not width", async ({ page }) => {
      await page.evaluate(() => {
        (window as unknown as { __runs: string[] }).__runs = [];
        document.addEventListener("transitionrun", (e) => {
          if ((e.target as Element).id === "motion-probe")
            (window as unknown as { __runs: string[] }).__runs.push(e.propertyName);
        });
      });
      const fill = await mount(
        page,
        '<div style="width:200px;height:8px"><div id="motion-probe" class="progress-fill h-full" style="--p:0.6"></div></div>',
      );

      const style = await fill.evaluate((el) => {
        const s = getComputedStyle(el);
        return { property: s.transitionProperty, duration: s.transitionDuration };
      });
      expect(style.property).toBe("transform");

      if (mode.reducedMotion === "reduce") {
        expect(seconds(style.duration)).toBeLessThan(0.001);
      } else {
        expect(seconds(style.duration)).toBeGreaterThanOrEqual(0.3);
        // @starting-style: first paint starts at scaleX(0) and transitions up.
        await expect
          .poll(() => page.evaluate(() => (window as unknown as { __runs: string[] }).__runs))
          .toContain("transform");
      }
      // Either way it ends at its value.
      await expect
        .poll(() => fill.evaluate((el) => getComputedStyle(el).transform))
        .toBe("matrix(0.6, 0, 0, 1, 0, 0)");
    });

    test("M3 press scales a control to 0.96, and not under reduced motion", async ({ page }) => {
      const button = await mount(
        page,
        '<button id="motion-probe" class="press-scale" style="position:fixed;left:40px;top:40px;width:120px;height:44px;z-index:99999">Press</button>',
      );
      const box = await button.boundingBox();
      if (!box) throw new Error("probe has no box");

      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.waitForTimeout(300); // longer than --motion-fast
      const pressed = await button.evaluate((el) => getComputedStyle(el).transform);
      await page.mouse.up();

      if (mode.reducedMotion === "reduce") {
        expect(pressed).toBe("none");
      } else {
        expect(pressed).toBe("matrix(0.96, 0, 0, 0.96, 0, 0)");
      }
    });
  });
}

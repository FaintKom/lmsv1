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
      await page.goto(`${BASE_URL}/courses`, { waitUntil: "domcontentloaded" });
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

    test("M4b a wrong answer shakes once, and stays put under reduced motion", async ({ page }) => {
      const input = await mount(
        page,
        '<input id="motion-probe" class="fb-input" style="position:fixed;left:40px;top:40px;width:160px;z-index:99999" />',
      );
      await input.evaluate((el) => el.classList.add("no"));
      const anim = await input.evaluate((el) =>
        el.getAnimations().map((a) => ({
          name: (a as CSSAnimation).animationName,
          iterations: a.effect?.getComputedTiming().iterations,
          duration: Number(a.effect?.getComputedTiming().duration ?? 0),
        })),
      );
      const shake = anim.find((a) => a.name === "fb-shake");
      expect(shake, "fb-shake runs on a wrong answer").toBeTruthy();
      expect(shake!.iterations).toBe(1);
      if (mode.reducedMotion === "reduce") {
        expect(shake!.duration).toBeLessThan(1);
        // Amplitude is zeroed too, so even the first frame does not move.
        expect(await input.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--mamp").trim())).toBe("0");
      } else {
        expect(shake!.duration).toBeGreaterThanOrEqual(300);
      }
    });

    test("M5 a course card lifts on hover, and not under reduced motion", async ({ page }) => {
      await mount(
        page,
        '<a id="motion-probe" class="group" href="#" style="position:fixed;left:40px;top:40px;display:block;width:200px;z-index:99999"><div class="rounded-lg bg-surface p-5 transition-transform motion-safe:group-hover:-translate-y-0.5">card</div></a>',
      );
      const card = page.locator("#motion-probe > div");
      await page.locator("#motion-probe").hover();
      await page.waitForTimeout(300);
      // Tailwind 4 lifts with the `translate` property, not `transform`;
      // reading transform here once made a broken reduced-motion reset pass.
      const lift = await card.evaluate((el) => getComputedStyle(el).translate);
      if (mode.reducedMotion === "reduce") {
        expect(lift).toBe("none");
      } else {
        expect(lift).toBe("0px -2px");
      }
    });

    test("M9 the student home enters in steps on the first visit only", async ({ page }) => {
      await page.evaluate(() => sessionStorage.clear());
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded" });
      const root = page.locator(".stagger-children").first();
      await expect(root).toBeAttached({ timeout: 20_000 }); // dev servers compile on first hit
      const delays = await root.evaluate((el) =>
        [...el.children].slice(0, 3).map((c) => getComputedStyle(c).animationDelay),
      );
      expect(delays[0]).not.toBe(delays[1]); // it is a stagger, not one fade
      const duration = await root.evaluate((el) => getComputedStyle(el.children[0]).animationDuration);
      if (mode.reducedMotion === "reduce") expect(seconds(duration)).toBeLessThan(0.001);
      else expect(seconds(duration)).toBeGreaterThanOrEqual(0.15);

      // The dashboard is revisited all day; the entrance is not replayed.
      await page.goto(`${BASE_URL}/courses`, { waitUntil: "domcontentloaded" });
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 20_000 });
      await expect(page.locator(".stagger-children")).toHaveCount(0);
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

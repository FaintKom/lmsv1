import { devices, expect, test, type Locator, type Page } from "@playwright/test";

import { LoginPage } from "./poms/LoginPage";

/**
 * Phone-sized checks for the chrome every page carries.
 *
 * There was no narrow-viewport coverage at all — `playwright.config.ts` runs a
 * single Desktop Chrome project — so responsive faults survived until someone
 * hit them by hand. Two did:
 *
 *  - the sidebar was `h-screen`, and on a phone 100vh is taller than the
 *    visible area, so the footer (account link, Sign Out) sat under the
 *    browser's address bar: the menu opened and you still could not log out;
 *  - the notification panel opened downwards from a bell that lives in that
 *    same footer, so it ran off the bottom of the window.
 *
 * The assertions are therefore geometric — "inside the viewport" — rather than
 * "the element exists". Both bugs had the element present and unreachable.
 *
 * Declared per-spec rather than as a second Playwright project, so the whole
 * suite does not run twice in CI.
 */

/**
 * Fails if any part of the element sits outside the visible viewport.
 *
 * Polls rather than measuring once: the sidebar slides in over 200ms, and a
 * single measurement taken mid-transition reports the element still off-screen
 * (x = -207) even though it arrives a moment later.
 */
async function expectWithinViewport(page: Page, locator: Locator, what: string) {
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  if (!viewport) return;

  await expect
    .poll(
      async () => {
        const box = await locator.boundingBox();
        if (!box) return null;
        return {
          left: Math.round(box.x),
          top: Math.round(box.y),
          right: Math.round(box.x + box.width),
          bottom: Math.round(box.y + box.height),
        };
      },
      {
        message: `${what} should come to rest fully inside the ${viewport.width}x${viewport.height} viewport`,
        timeout: 5_000,
      },
    )
    .toEqual({
      left: expect.any(Number),
      top: expect.any(Number),
      right: expect.any(Number),
      bottom: expect.any(Number),
    });

  const box = await locator.boundingBox();
  expect(box, `${what}: not rendered`).not.toBeNull();
  if (!box) return;
  expect(Math.round(box.x), `${what}: left edge outside the viewport`).toBeGreaterThanOrEqual(0);
  expect(Math.round(box.y), `${what}: top edge above the viewport`).toBeGreaterThanOrEqual(0);
  expect(
    Math.round(box.x + box.width),
    `${what}: right edge outside the viewport`,
  ).toBeLessThanOrEqual(viewport.width);
  expect(
    Math.round(box.y + box.height),
    `${what}: bottom edge below the viewport`,
  ).toBeLessThanOrEqual(viewport.height);
}

/** Waits until the element has slid fully into view, then returns. */
async function settleInsideViewport(page: Page, locator: Locator) {
  const viewport = page.viewportSize();
  if (!viewport) return;
  await expect
    .poll(async () => (await locator.boundingBox())?.x ?? -1, { timeout: 5_000 })
    .toBeGreaterThanOrEqual(0);
}

// Top-level: a device preset carries `defaultBrowserType`, which Playwright
// refuses inside a describe block because it would force a new worker.
test.use({ ...devices["Pixel 7"] });

test.describe("phone layout", () => {
  test.beforeEach(async ({ page }) => {
    // The cookie bar is fixed to the bottom and would sit over the controls
    // under test. A real user dismisses it once.
    await page.addInitScript(() => localStorage.setItem("cookie-consent", "accepted"));
    await new LoginPage(page).loginViaUi("student");
    await page.goto("/dashboard");
    await expect(page.getByRole("button", { name: /toggle menu/i })).toBeVisible({
      timeout: 20_000,
    });
  });

  test("a student can reach sign out", async ({ page }) => {
    await page.getByRole("button", { name: /toggle menu/i }).click();

    const signOut = page.getByRole("button", { name: /sign out|выйти/i }).first();
    await expect(signOut).toBeVisible();
    await settleInsideViewport(page, signOut);
    await expectWithinViewport(page, signOut, "Sign out");

    // On screen is not the same as reachable: prove the tap lands.
    await signOut.click();
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });

  test("the notifications panel opens inside the screen", async ({ page }) => {
    await page.getByRole("button", { name: /toggle menu/i }).click();

    const bell = page.getByRole("button", { name: /notifications/i }).first();
    await expect(bell).toBeVisible();
    await settleInsideViewport(page, bell);
    await expectWithinViewport(page, bell, "Notification bell");

    await bell.click();
    const panel = page.getByRole("region", { name: /notifications/i }).first();
    await expect(panel).toBeVisible();
    await expectWithinViewport(page, panel, "Notifications panel");
  });

  test("the dashboard does not scroll sideways", async ({ page }) => {
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, "horizontal overflow in px").toBeLessThanOrEqual(0);
  });
});

test.describe("desktop chrome", () => {
  test("the notifications panel opens inside the window", async ({ page }) => {
    // Widen the same context rather than declaring a second device: what this
    // asserts is geometry at a desktop width, where the `sm:` rules apply.
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.addInitScript(() => localStorage.setItem("cookie-consent", "accepted"));
    await new LoginPage(page).loginViaUi("student");
    await page.goto("/dashboard");

    // The bell is at the bottom of the sidebar, so a panel that opens
    // downwards leaves the window — 28px of it empty, the full 320px list
    // once there is anything to read.
    const bell = page.getByRole("button", { name: /notifications/i }).first();
    await expect(bell).toBeVisible({ timeout: 20_000 });
    await bell.click();

    const panel = page.getByRole("region", { name: /notifications/i }).first();
    await expect(panel).toBeVisible();
    await expectWithinViewport(page, panel, "Notifications panel");
  });
});

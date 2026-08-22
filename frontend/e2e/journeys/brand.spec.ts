import { expect, test } from "@playwright/test";

import { ADMIN, Api, apiLogin, authenticate, BASE_URL } from "../poms/ContentTypeHarness";

/**
 * A school's colours, from the settings form out to what a pupil sees.
 *
 * Everything here ran red before the change. `--primary-fg` was a constant that
 * never looked at the school's colour, the second colour was read by no line in
 * the project, and the sign-in page showed no school at all.
 *
 * Nothing here writes to the school. Its colours are shared state and another
 * worker's dark-theme audit reads the same organisation, so a brand colour left
 * behind is how a previous change turned 17 unrelated routes red. The pieces
 * are proved separately instead: the stylesheet chain here, the maths that
 * feeds it in contrast.test.ts, and the server side in test_crm_public.py.
 */

test.describe.configure({ mode: "serial" });

const YELLOW = "#facc15";

let slug = "";

function luminance(rgb: string): number {
  const [r, g, b] = (rgb.match(/\d+/g) || ["0", "0", "0"]).slice(0, 3).map((v) => {
    const n = Number(v) / 255;
    return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

test.beforeAll(async ({ playwright }) => {
  const request = await playwright.request.newContext();
  const admin = await apiLogin(request, ADMIN);
  const api = new Api(request, admin.access_token);
  // Not "the only one": on a long-lived local stack this list can also hold the
  // bootstrap "system" org. CI seeds fresh, but a test that only works on a
  // fresh stack is a test that fails for the wrong reason.
  const orgs: { id: string; slug: string }[] = await api.get("/admin/organizations");
  const school = orgs.find((o) => o.slug !== "system") ?? orgs[0];
  expect(school, "the seed should leave a school to look at").toBeTruthy();
  slug = school.slug;
  await request.dispose();
});

test.beforeEach(async ({ context }) => {
  await authenticate(context, ADMIN);
});

test("the text colour on a brand fill is no longer a constant", async ({ page }) => {
  // Shipped broken: --color-primary-fg was literally #ffffff in light mode, so
  // a school whose colour is yellow got white text on yellow, silently. The
  // token now defers to --primary-fg, which BrandVars computes.
  //
  // Nothing is saved here. The school's colours are shared state and another
  // worker's dark-theme audit reads the same organisation — persisting a test
  // colour is how a previous change turned 17 unrelated routes red.
  await page.goto(`${BASE_URL}/admin/courses`);

  const resolved = await page.evaluate((brand) => {
    const root = document.documentElement;
    const el = document.createElement("div");
    el.className = "bg-primary text-primary-fg";
    document.body.appendChild(el);

    const before = getComputedStyle(el).color;
    root.style.setProperty("--primary", brand);
    root.style.setProperty("--primary-fg", "#0b0b0b");
    const after = { fill: getComputedStyle(el).backgroundColor, text: getComputedStyle(el).color };

    root.style.removeProperty("--primary");
    root.style.removeProperty("--primary-fg");
    el.remove();
    return { before, after };
  }, YELLOW);

  expect(resolved.after.text).not.toBe(resolved.before);
  expect(ratio(resolved.after.fill, resolved.after.text)).toBeGreaterThanOrEqual(4.5);
});

test("the brand colour used as text reads its own variable too", async ({ page }) => {
  await page.goto(`${BASE_URL}/admin/courses`);

  const resolved = await page.evaluate(() => {
    const root = document.documentElement;
    const el = document.createElement("span");
    el.className = "text-primary";
    document.body.appendChild(el);

    const before = getComputedStyle(el).color;
    root.style.setProperty("--primary-text-light", "#166534");
    const after = getComputedStyle(el).color;

    root.style.removeProperty("--primary-text-light");
    el.remove();
    return { before, after };
  });

  expect(resolved.after).not.toBe(resolved.before);
  // The light page is #fbfcf7, not white — tokens.css is explicit about it.
  expect(ratio(resolved.after, "rgb(251, 252, 247)")).toBeGreaterThanOrEqual(4.5);
});

test("the preview redraws before anything is saved, and saves nothing", async ({ page }) => {
  await page.goto(`${BASE_URL}/admin/settings`);

  const cta = page.getByTestId("preview-cta");
  await expect(cta).toBeVisible();
  const before = await cta.evaluate((el) => getComputedStyle(el).backgroundColor);

  await page.locator("#primaryColor").fill(YELLOW);
  await expect
    .poll(() => cta.evaluate((el) => getComputedStyle(el).backgroundColor))
    .not.toBe(before);

  // Leave without saving. The school must still be on its old colour.
  await page.reload();
  await expect
    .poll(() =>
      page.getByTestId("preview-cta").evaluate((el) => getComputedStyle(el).backgroundColor),
    )
    .toBe(before);
});

test("the second colour follows the first until the school picks one", async ({ page }) => {
  await page.goto(`${BASE_URL}/admin/settings`);

  await expect(page.getByRole("button", { name: /#[0-9a-f]{6}/i })).toHaveCount(4);

  const secondary = page.locator("#secondaryColor");
  const wasFollowing = await secondary.inputValue();

  await page.locator("#primaryColor").fill("#7c3aed");
  await expect.poll(() => secondary.inputValue()).not.toBe(wasFollowing);

  await secondary.fill("#c2410c");
  await page.locator("#primaryColor").fill("#0891b2");
  // Chosen, so it stays put. This is the case a value comparison cannot see.
  await expect.poll(() => secondary.inputValue()).toBe("#c2410c");
});

test("the sign-in page wears the school's logo, and an unknown slug wears nothing", async ({
  browser,
}) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  // The seeded school has no logo, and giving it one would be writing to shared
  // state. The public answer is stubbed instead; that it really carries
  // branding is proved in backend/tests/test_crm_public.py.
  await page.route(`**/api/v1/crm/public/${slug}`, (route) =>
    route.fulfill({
      json: {
        name: "Prog School",
        slug,
        courses: [],
        branding: {
          display_name: "Prog School",
          logo_url: null,
          primary_color: "#22c55e",
          secondary_color: "#3b82f6",
        },
      },
    }),
  );

  await page.goto(`${BASE_URL}/login?s=${slug}`);
  await expect(page.getByTestId("school-mark")).toBeVisible();
  await expect(page.getByText("Prog School")).toBeVisible();

  // Not stubbed: a real 404 from the real endpoint.
  await page.goto(`${BASE_URL}/login?s=no-such-school-anywhere`);
  await expect(page.getByTestId("school-mark")).toHaveCount(0);
  // Still a working sign-in screen, and nothing said about whether that school
  // exists.
  await expect(page.getByRole("button", { name: /sign in|войти/i })).toBeVisible();

  await context.close();
});

test("the cookies page lists what the sign-in page now remembers", async ({ page }) => {
  // Principle IV: a store on someone's device that the privacy page does not
  // mention is a defect. The cheapest possible guard against the two drifting.
  await page.goto(`${BASE_URL}/cookies`);
  await expect(page.getByText("school-slug")).toBeVisible();
});

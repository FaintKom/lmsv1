import { expect, test, type Page } from "@playwright/test";

import { ADMIN, authenticate, BASE_URL } from "../poms/ContentTypeHarness";

/**
 * The sidebar as a school actually meets it: collapsed to a rail, and still
 * collapsed tomorrow.
 *
 * Unit tests cover the markup. What they cannot cover is the part that was
 * broken: the preference has to survive a real page load, and it has to
 * survive the crossing between the (admin) and (dashboard) route groups — two
 * different layouts, each mounting its own Sidebar. Local state looks fine in
 * a component test and loses the preference on both.
 */

test.describe.configure({ mode: "serial" });

const RAIL_WIDTH = 88;
const FULL_WIDTH = 240;

async function silenceTheTour(page: Page) {
  // The admin dashboard opens a driver.js tour whose backdrop swallows the
  // first click on anything. Nothing to do with navigation; mark it seen.
  await page.addInitScript(() => {
    window.localStorage.setItem("lms.tour.admin.v1", "done");
  });
}

test.beforeEach(async ({ context, page }) => {
  await authenticate(context, ADMIN);
  await silenceTheTour(page);
});

test("collapsing survives a reload and follows the user between route groups", async ({
  page,
}) => {
  await page.goto(`${BASE_URL}/admin`);

  await expect(page.locator("aside").first()).toHaveJSProperty(
    "offsetWidth",
    FULL_WIDTH,
  );

  await page.getByRole("button", { name: /collapse menu/i }).click();
  await expect(page.locator("aside").first()).toHaveJSProperty(
    "offsetWidth",
    RAIL_WIDTH,
  );

  // A full load, not a client-side transition: the preference lives in
  // localStorage and has to be read back on boot, which is the step that did
  // not exist before.
  await page.reload();
  await expect(page.locator("aside").first()).toHaveJSProperty(
    "offsetWidth",
    RAIL_WIDTH,
  );

  // /profile is served by the (dashboard) layout — a different layout mounting
  // a different Sidebar. This is the crossing that used to lose the choice.
  await page.goto(`${BASE_URL}/profile`);
  await expect(page.locator("aside").first()).toHaveJSProperty(
    "offsetWidth",
    RAIL_WIDTH,
  );

  await page.getByRole("button", { name: /expand menu/i }).click();
  await expect(page.locator("aside").first()).toHaveJSProperty(
    "offsetWidth",
    FULL_WIDTH,
  );
});

test("the rail keeps the school's name and names every icon", async ({ page }) => {
  await page.goto(`${BASE_URL}/admin`);
  await page.getByRole("button", { name: /collapse menu/i }).click();

  const rail = page.locator("aside").first();
  await expect(rail).toHaveJSProperty("offsetWidth", RAIL_WIDTH);

  // Whatever the school calls itself is still on screen. The seeded QA org has
  // no logo, so this is the fallback badge plus the name — exactly what a
  // school that never uploaded a logo sees.
  await expect(rail.getByText("QA Organization")).toBeVisible();

  // The entry is down to its icon, and its name moved into the accessible
  // name rather than disappearing with the label.
  const courses = rail.getByRole("link", { name: /^courses$/i });
  await expect(courses).toHaveAttribute("aria-label", /courses/i);
  await expect(courses).toHaveText("");
});

test("the rail scrolls up and down and not sideways", async ({ page }) => {
  await page.goto(`${BASE_URL}/admin`);
  await page.getByRole("button", { name: /collapse menu/i }).click();
  await expect(page.locator("aside").first()).toHaveJSProperty("offsetWidth", RAIL_WIDTH);

  // Shipped broken. The nav is overflow-y-auto, which under CSS rules raises
  // overflow-x from visible to auto as well; the hover labels were absolutely
  // positioned inside it and stuck 88px past an 88px rail, so the menu carried
  // a horizontal scrollbar all the time. Measuring the overflow is the check
  // that would have caught it — the labels themselves look fine in a
  // screenshot.
  const sideways = await page
    .locator("aside nav")
    .first()
    .evaluate((el) => el.scrollWidth - el.clientWidth);
  expect(sideways).toBeLessThanOrEqual(1);

  // And the label still appears, which is the reason the element exists.
  await page.getByRole("link", { name: /^courses$/i }).hover();
  await expect(page.getByRole("tooltip")).toHaveText(/courses/i);
});

test("a category you close stays closed, even on a page inside it", async ({ page }) => {
  // Shipped broken. The category holding the current page was forced open, so
  // its heading did nothing when clicked — while still writing "closed" to
  // storage for some later page to honour.
  await page.goto(`${BASE_URL}/admin/courses`);

  const learning = page.getByRole("button", { name: /^learning$/i });
  await expect(learning).toHaveAttribute("aria-expanded", "true");

  await learning.click();
  await expect(learning).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("link", { name: /^courses$/i })).toBeHidden();

  await page.reload();
  await expect(page.getByRole("button", { name: /^learning$/i })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
});

test("the search left the menu and turned up where the courses are", async ({ page }) => {
  await page.goto(`${BASE_URL}/admin`);

  const rail = page.locator("aside").first();
  await expect(rail.getByPlaceholder(/search/i)).toHaveCount(0);
  await expect(rail.getByRole("button", { name: /search/i })).toHaveCount(0);

  // Ctrl+K opened the old one from anywhere; it should now do nothing at all.
  await page.keyboard.press("Control+k");
  await expect(page.getByRole("listbox", { name: /search results/i })).toHaveCount(0);

  await page.goto(`${BASE_URL}/admin/courses`);
  const filter = page.getByRole("searchbox", { name: /filter courses/i });
  await expect(filter).toBeVisible();

  const before = await page.locator('a[href^="/admin/courses/"]').count();
  await filter.fill("zzz-no-such-course");
  await expect(page.getByText(/no course matches that/i)).toBeVisible();

  // And back again, so the filter is proved to narrow rather than to break.
  await filter.fill("");
  await expect(page.locator('a[href^="/admin/courses/"]')).toHaveCount(before);
});

test("a closed category stays closed, wherever you go", async ({ page }) => {
  await page.goto(`${BASE_URL}/admin`);

  const people = page.getByRole("button", { name: /^people$/i });
  await expect(people).toHaveAttribute("aria-expanded", "true");

  await people.click();
  await expect(people).toHaveAttribute("aria-expanded", "false");
  // Hidden, not merely unstyled: the entries leave the tab order with it.
  await expect(page.getByRole("link", { name: /^groups$/i })).toBeHidden();

  await page.reload();
  await expect(page.getByRole("button", { name: /^people$/i })).toHaveAttribute(
    "aria-expanded",
    "false",
  );

  // Including on a page that lives inside it. An earlier version forced the
  // category open here, on the reasoning that the menu should not hide where
  // you are — but that made its heading dead under the finger. Arriving still
  // shows the category to anyone who never closed it, because untouched means
  // open; someone who closed it meant it.
  await page.goto(`${BASE_URL}/admin/groups`);
  await expect(page.getByRole("button", { name: /^people$/i })).toHaveAttribute(
    "aria-expanded",
    "false",
  );

  // A category nobody touched is open, so the default is still "you can see
  // where you are".
  await expect(page.getByRole("button", { name: /^learning$/i })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
});

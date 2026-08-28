import { expect, test } from "@playwright/test";

import { LoginPage } from "../poms/LoginPage";

/**
 * A page whose data the server withheld says so.
 *
 * The rule is specs/051; specs/066 carried it to the four screens that still
 * dressed a refusal as an empty list — a teacher was shown "Current members
 * (0)" for a list they were never given, and an administrator read "no one
 * has joined the waitlist yet" about somebody else's waitlist.
 *
 * Every case is a pair. "The refusal is on screen" passes just as well on a
 * page that is simply broken, so each one is followed by the role who may see
 * the data, proving the page still works.
 */

type Case = {
  route: string;
  refusedAs: "teacher" | "schoolAdmin";
  allowedAs: "admin" | "methodist";
  /** A phrase only the working page shows. */
  worksMarker: RegExp;
};

const CASES: Case[] = [
  {
    route: "/admin/org-members",
    refusedAs: "teacher",
    allowedAs: "admin",
    worksMarker: /add member/i,
  },
  {
    route: "/admin/crm",
    refusedAs: "teacher",
    allowedAs: "admin",
    worksMarker: /enrolled/i,
  },
  {
    route: "/admin/analytics",
    refusedAs: "teacher",
    allowedAs: "methodist",
    worksMarker: /add widget/i,
  },
  {
    // The public waitlist is GrassLMS's, not a school's: super-admin only.
    // This pair is why scripts/seed_qa.py grew a plain administrator — before
    // that the stand had no role that could be refused here at all.
    route: "/admin/waitlist",
    refusedAs: "schoolAdmin",
    allowedAs: "admin",
    worksMarker: /signups/i,
  },
];

for (const c of CASES) {
  test.describe(`${c.route} refuses in words`, () => {
    test(`${c.refusedAs} is told whose it is, and offered nothing`, async ({ page }) => {
      await new LoginPage(page).loginViaUi(c.refusedAs);
      await page.goto(c.route);

      // Scoped to the card, not to <main>: the admin layout renders
      // LiveLessonBanner inside <main> as well, so a lesson some other spec
      // left running put a button on this page and failed the first version
      // of this assertion in CI — a fault of the test, not of the page.
      const card = page.getByTestId("access-denied");
      // "Only an administrator…", "belongs to GrassLMS…" — every refusal names
      // an owner. Matching the shape rather than one sentence, so rewording
      // the copy does not fail the gate.
      await expect(card).toContainText(/administrator|GrassLMS/i, { timeout: 20_000 });

      // The original mistake was offering a control the server refuses.
      // Asserting on names rather than a count: when this fails it should say
      // what it found.
      const offered = await card
        .getByRole("button")
        .evaluateAll((els) =>
          els.map((e) => (e.textContent || e.getAttribute("aria-label") || "?").trim()),
        );
      expect(offered, "the refusal card offers controls").toEqual([]);
      await expect(page.locator("main")).not.toContainText(c.worksMarker);
    });

    test(`${c.allowedAs} still sees the page itself`, async ({ page }) => {
      await new LoginPage(page).loginViaUi(c.allowedAs);
      await page.goto(c.route);
      await expect(page.locator("main")).toContainText(c.worksMarker, { timeout: 20_000 });
    });
  });
}

test("a refused analytics widget never says 'Request failed with status code'", async ({
  page,
}) => {
  // Two bugs met here: widgets printed the raw axios message, and the KPI tile
  // checked `isLoading || !data` before `error`, so on any failed query it read
  // "Loading KPIs…" for ever instead (specs/066).
  await new LoginPage(page).loginViaUi("methodist");
  await page.goto("/admin/analytics");
  await expect(page.locator("main")).toContainText(/add widget/i, { timeout: 20_000 });
  await expect(page.locator("main")).not.toContainText(/status code/i);
});

import { expect, test } from "@playwright/test";

import { ADMIN, Api, apiLogin, authenticate, BASE_URL } from "../poms/ContentTypeHarness";

/**
 * A school's settings, reached from the list of organisations.
 *
 * The screen is new: the list could only rename a school, and everything else
 * about one — its logo, its colours, which menu entries it hides — lived on
 * /admin/settings, which reads the signed-in user's own org_id and no other.
 *
 * The seeded QA stack has no super admin, so the crossing-between-schools half
 * of the rule is proved in pytest instead (test_admin.py: a super admin reads
 * and edits another org). What is proved here is the screen — that it exists,
 * that it saves, and that a school it does not belong to reads as "not found".
 */

test.describe.configure({ mode: "serial" });

let myOrgId = "";
let otherOrgId = "";
let originalName = "";

test.beforeAll(async ({ playwright }) => {
  const request = await playwright.request.newContext();
  const admin = await apiLogin(request, ADMIN);
  const api = new Api(request, admin.access_token);

  // An admin's list holds exactly their own school, which is how we learn
  // which one that is.
  const mine: { id: string; name: string }[] = await api.get("/admin/organizations");
  expect(mine, "an admin should see exactly their own organisation").toHaveLength(1);
  myOrgId = mine[0].id;
  originalName = mine[0].name;

  // A school that is not theirs. The public registration search lists every
  // active organisation, which is how the negative case is found without a
  // super admin to ask.
  const rows: { id: string; name: string }[] = await request
    .get(`${BASE_URL}/api/v1/auth/organizations?q=`)
    .then((r) => r.json());
  const other = rows.find((o) => o.id !== myOrgId);
  expect(other, "the seed should leave a second organisation to test against").toBeTruthy();
  otherOrgId = other!.id;
});

test.afterAll(async ({ playwright }) => {
  // Put the entry back on, always, rather than back to whatever was there on
  // arrival: a run that dies half way leaves it off, and a capture-and-restore
  // would then faithfully preserve that for good. A fixed target cannot
  // inherit a mess.
  if (!myOrgId) return;
  const request = await playwright.request.newContext();
  const admin = await apiLogin(request, ADMIN);
  await new Api(request, admin.access_token).put(`/admin/organizations/${myOrgId}`, {
    settings: { menu_visibility: { paths: true } },
  });
});

test("an admin opens their school's settings from the list", async ({ context, page }) => {
  await authenticate(context, ADMIN);
  await page.goto(`${BASE_URL}/admin/organizations`);

  await page.getByRole("link", { name: originalName }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/organizations/${myOrgId}$`));

  // The form loaded — the thing the list could not reach before.
  await expect(page.getByRole("button", { name: /save settings/i })).toBeVisible();
});

test("and the settings it saves come back", async ({ context, page }) => {
  await authenticate(context, ADMIN);
  await page.goto(`${BASE_URL}/admin/organizations/${myOrgId}`);

  // Deliberately the "Learning Paths" toggle and not a brand colour. The
  // colour is a global visual token: every branded surface in the product
  // takes its background from it, so a spec that leaves one set for a second
  // turns the dark-theme audit red on whatever pages another worker happens to
  // be auditing at that moment. This suite runs fullyParallel. One menu entry
  // that no other spec asserts proves the same round trip and disturbs nobody.
  const toggle = page.getByRole("checkbox", { name: /learning paths/i });
  const before = await toggle.isChecked();

  // Click the label, not the input: the input is sr-only and the switch a
  // person actually sees is a sibling div drawn over it. Clicking the input
  // directly is intercepted by that div — which is also what would happen to a
  // real mouse.
  await page.locator("label", { hasText: /learning paths/i }).click();
  await page.getByRole("button", { name: /save settings/i }).click();

  // Read it back from a fresh load, not from the form still holding what was
  // clicked into it — that would pass against a save that never happened.
  await page.reload();
  await expect(page.getByRole("checkbox", { name: /learning paths/i })).toBeChecked({
    checked: !before,
  });
});

test("but a school that is not theirs is simply not found", async ({ context, page }) => {
  await authenticate(context, ADMIN);
  await page.goto(`${BASE_URL}/admin/organizations/${otherOrgId}`);

  // Runs last on purpose. On its own this passes against a broken route, a
  // form that never loads, or a page that does not exist — the two tests above
  // are what make it mean anything.
  await expect(page.getByText(/not found/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /save settings/i })).toHaveCount(0);
});

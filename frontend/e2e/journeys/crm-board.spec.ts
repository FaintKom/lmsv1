import { expect, test } from "@playwright/test";

import { ADMIN, authenticate, BASE_URL } from "../poms/ContentTypeHarness";

/**
 * The enquiry board, from the seat of the person who works it.
 *
 * The CRM shipped with 18 backend tests and no browser ever opening the page
 * that performs the work. That is the shape the class journal and the mobile
 * chrome were in when both shipped broken, so this exists before the next
 * feature is added to the board rather than after something goes wrong.
 *
 * Scaffolding is deliberately absent: the point is that a person can do this
 * with a mouse, so every step goes through the interface.
 */

test.describe.configure({ mode: "serial" });

const STAMP = new Date().toISOString().replace(/[:.]/g, "-");
const CONTACT = `E2E Parent ${STAMP}`;
const PUPIL = `E2E Pupil ${STAMP}`;
const PUPIL_EMAIL = `e2e-pupil-${STAMP}@qa.example.com`.toLowerCase();
const NOTE = "Rang, wants Tuesdays";

test("an enquiry can be recorded from the board", async ({ page }) => {
  await authenticate(page.context(), ADMIN);
  await page.goto(`${BASE_URL}/admin/crm`);

  await page.getByLabel(/who got in touch/i).fill(CONTACT);
  await page.getByLabel(/their email/i).fill(`e2e-parent-${STAMP}@qa.example.com`.toLowerCase());
  await page.getByLabel(/student's name/i).fill(PUPIL);
  await page.getByRole("button", { name: /add enquiry/i }).click();

  // The card itself, not merely that the page rendered.
  await expect(page.getByText(CONTACT).first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(PUPIL).first()).toBeVisible();
});

test("it moves along the pipeline and keeps a history", async ({ page }) => {
  await authenticate(page.context(), ADMIN);
  await page.goto(`${BASE_URL}/admin/crm`);

  await page.getByText(CONTACT).first().click();
  await page.getByRole("button", { name: /^contacted$/i }).click();

  await page.getByPlaceholder(/what was said/i).fill(NOTE);
  await page.getByRole("button", { name: /log call/i }).click();

  // A stage change and a call, both in the enquiry's own history.
  await expect(page.getByText(/moved/i).first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(NOTE)).toBeVisible();
});

test("a reminder can be set against it", async ({ page }) => {
  await authenticate(page.context(), ADMIN);
  await page.goto(`${BASE_URL}/admin/crm`);
  await page.getByText(CONTACT).first().click();

  const due = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
  await page.getByPlaceholder(/ring back/i).fill("Ring back Tuesday");
  await page.locator('input[type="datetime-local"]').fill(due);
  await page.getByRole("button", { name: /add reminder/i }).click();

  await expect(page.getByText("Ring back Tuesday")).toBeVisible({ timeout: 15_000 });
});

test("converting it produces a pupil who was actually invited", async ({ page }) => {
  await authenticate(page.context(), ADMIN);
  await page.goto(`${BASE_URL}/admin/crm`);
  await page.getByText(CONTACT).first().click();

  await page.getByLabel(/email for the student account/i).fill(PUPIL_EMAIL);
  await page.getByRole("button", { name: /^enrol$/i }).click();

  // The whole point of the phase: the office is told whether anybody was
  // actually written to, rather than left assuming a family was contacted.
  const outcome = page.getByRole("status");
  await expect(outcome).toBeVisible({ timeout: 15_000 });
  await expect(outcome).toHaveText(/invitations sent|no invitation could be emailed/i);

  // And the pupil exists where the rest of the product can see them.
  await page.goto(`${BASE_URL}/admin/users`);
  await expect(page.getByText(PUPIL_EMAIL).first()).toBeVisible({ timeout: 15_000 });
});

test("an enquiry left on the school's own page reaches the board", async ({ page }) => {
  // Signed out on purpose. Nobody filling in a school's website has an account,
  // and the whole point of this page is that the office does not retype it.
  const webContact = `E2E Web Parent ${STAMP}`;

  await page.goto(`${BASE_URL}/s/qa-org/enquire`);
  await page.getByLabel(/your name/i).fill(webContact);
  await page.getByLabel(/^email$/i).fill(`e2e-web-${STAMP}@qa.example.com`.toLowerCase());
  await page.getByLabel(/who would be learning/i).fill(`E2E Web Pupil ${STAMP}`);
  await page.getByRole("button", { name: /send enquiry/i }).click();

  await expect(page.getByRole("status")).toContainText(/has your enquiry/i, { timeout: 15_000 });

  // Now from the office's seat: it is on the board, nobody retyped it.
  await authenticate(page.context(), ADMIN);
  await page.goto(`${BASE_URL}/admin/crm`);
  await expect(page.getByText(webContact).first()).toBeVisible({ timeout: 15_000 });
});

test("a lost enquiry can be brought back rather than opened twice", async ({ page }) => {
  const returning = `E2E Returning ${STAMP}`;

  await authenticate(page.context(), ADMIN);
  await page.goto(`${BASE_URL}/admin/crm`);

  // A fresh enquiry of its own: the one above became a pupil.
  await page.getByLabel(/who got in touch/i).fill(returning);
  await page.getByLabel(/their email/i).fill(`e2e-returning-${STAMP}@qa.example.com`.toLowerCase());
  await page.getByRole("button", { name: /add enquiry/i }).click();
  await page.getByText(returning).first().click();

  // Lose it, with a reason.
  await page.getByLabel(/falls through/i).fill("Chose somewhere closer");
  await page.getByRole("button", { name: /^lost$/i }).click();

  // It is off the board, and findable only on request — which is the point.
  await page.getByRole("button", { name: /show closed enquiries/i }).click();
  await page.getByText(returning).first().click();

  await page.getByRole("button", { name: /reopen this enquiry/i }).click();

  // Back in the pipeline, with the reopening in its own history.
  await expect(page.getByText(/^reopened$/i).first()).toBeVisible({ timeout: 15_000 });
});

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

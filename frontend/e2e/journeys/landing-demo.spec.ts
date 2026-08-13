import { expect, test, type Page } from "@playwright/test";

/**
 * The landing page promises that we run and grade code. This test is the
 * reason that promise can be trusted.
 *
 * The component this replaced posted to a route that did not exist and, when
 * the request failed, drew a canned "success" instead. A test that only looked
 * at the rendered text would have passed against that fake. So this one waits
 * for the actual POST /sandbox/demo/check response and reads the verdict out
 * of the response body as well as off the screen.
 *
 * No login anywhere — a visitor has to be able to do this.
 */

const CORRECT = `def count_vowels(text):
    return sum(1 for c in text.lower() if c in "aeiou")
`;

const WRONG = `def count_vowels(text):
    return 0
`;

/** Set the editor buffer through Monaco itself — typing into it fights
 *  auto-indent and auto-closing quotes for no benefit. */
async function writeSolution(page: Page, source: string) {
  await expect(page.locator(".monaco-editor").first()).toBeVisible({ timeout: 30_000 });
  await page.waitForFunction(() => {
    const w = window as unknown as { monaco?: { editor: { getModels: () => unknown[] } } };
    return (w.monaco?.editor.getModels().length ?? 0) > 0;
  });
  await page.evaluate((src) => {
    const w = window as unknown as {
      monaco: { editor: { getModels: () => { setValue: (v: string) => void }[] } };
    };
    w.monaco.editor.getModels()[0].setValue(src);
  }, source);
  // React state lags a tick behind Monaco's change event; clicking Check in
  // the same tick submits the previous buffer.
  await page.waitForTimeout(300);
}

async function check(page: Page) {
  const response = page.waitForResponse(
    (r) => r.url().includes("/sandbox/demo/check") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: /check solution/i }).click();
  return response;
}

/**
 * The code demo is the fourth slide of the exercise reel rather than a block of
 * its own, so it is not in the DOM until you page to it. Each dot carries its
 * slide's label as the accessible name.
 */
async function openCodeSlide(page: Page) {
  await page.getByRole("button", { name: "Code", exact: true }).click();
  // The task catalogue loads on mount; its test names are the proof it did.
  await expect(page.getByText("count_vowels('education')")).toBeVisible({ timeout: 30_000 });
}

test.describe("landing code demo", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: /next exercise/i }).first()).toBeVisible({
      timeout: 30_000,
    });
  });

  test("a visitor with no account solves the task and the server confirms it", async ({ page }) => {
    await openCodeSlide(page);
    await writeSolution(page, CORRECT);
    const res = await check(page);

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.all_passed).toBe(true);
    expect(body.tests.length).toBeGreaterThan(0);
    for (const testCase of body.tests) {
      expect(testCase.passed, `${testCase.name} should pass`).toBe(true);
    }

    await expect(page.getByText(/all tests passed/i)).toBeVisible();
  });

  test("a wrong solution is rejected with a verdict per test case", async ({ page }) => {
    await openCodeSlide(page);
    await writeSolution(page, WRONG);
    const res = await check(page);

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.all_passed).toBe(false);
    // "return 0" is right for the empty string and wrong for the rest, so the
    // response has to distinguish between cases rather than fail wholesale.
    expect(body.tests.some((c: { passed: boolean }) => !c.passed)).toBe(true);
    expect(body.tests.some((c: { passed: boolean }) => c.passed)).toBe(true);

    // The failing rows say what was expected and what came back.
    await expect(page.getByText(/expected/i).first()).toBeVisible();
  });

  test("the exercise gallery grades a right and a wrong answer", async ({ page }) => {
    // Matched on the tail of the heading: the count at the front changes with
    // the number of slides, and it already has once.
    const gallery = page.locator("section").filter({ hasText: "exercise types you can set" });

    // Options are radio tiles, not plain buttons.
    await gallery.getByRole("radio", { name: /63/ }).first().click();
    await gallery.getByRole("button", { name: /^check$/i }).click();
    await expect(gallery.getByText(/attempts left|miss/i).first()).toBeVisible();

    await gallery.getByRole("button", { name: /try again/i }).click();
    await gallery.getByRole("radio", { name: /61/ }).first().click();
    await gallery.getByRole("button", { name: /^check$/i }).click();
    // The praise line differs between a first-try win and a retry win, so
    // assert the tile's own verdict instead.
    await expect(gallery.getByRole("radio", { name: /61.*correct/is })).toBeVisible();
  });
});

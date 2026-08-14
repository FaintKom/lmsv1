import { expect, test } from "@playwright/test";

import { LoginPage } from "./poms/LoginPage";

/**
 * The conductor programme has to survive F5.
 *
 * It used to live in `useState` only, so a teacher who reordered or hid
 * steps lost the plan the moment the tab reloaded — mid-lesson, which is
 * exactly when a reload happens. The fix persisted it to
 * `live_lessons.programme` and hydrates it on mount; `test_live_lessons.py`
 * covers the column, but nothing covered the hydration, and a value that is
 * saved and never read back looks identical to one that is lost.
 *
 * Requires the QA stack + seed (qa-teacher owns a group and a course with a
 * lesson) — see docs/TESTING.md.
 */
test.describe("live lesson conductor", () => {
  test("a programme edit survives a reload", async ({ page }) => {
    // The cookie bar is fixed to the bottom of the viewport and swallows
    // clicks aimed at the conductor panel. A real teacher dismisses it once;
    // an init script is the equivalent that survives the reload below.
    await page.addInitScript(() => localStorage.setItem("cookie-consent", "accepted"));

    await new LoginPage(page).loginViaUi("teacher");

    await page.goto("/admin/groups");
    await page
      .getByRole("button", { name: /начать урок|start lesson/i })
      .first()
      .click();
    await page.waitForURL(/\/admin\/live\//);

    const programmeButton = page.getByRole("button", { name: /программа|programme/i });

    // The conductor bar only exists once a material is on screen: the steps
    // are [material, ...its exercises]. "Start lesson" resumes a lesson that
    // is already running, so the material may or may not be picked already —
    // pick it only when the bar is missing.
    const ensureMaterial = async () => {
      // Wait for the teacher screen itself first — asking whether the bar is
      // visible while the page is still loading always answers "no".
      await expect(
        page.getByRole("button", { name: /завершить|end lesson/i }).first(),
      ).toBeVisible({ timeout: 20_000 });
      if (await programmeButton.isVisible().catch(() => false)) return;

      await page.getByTitle(/^материал$|^material$/i).click();
      // Two shapes: the picker itself, or the chosen material behind a
      // "Pick a material" button. And the picker is course → lesson.
      const repick = page.getByRole("button", { name: /выбрать материал|pick a material/i });
      if (await repick.isVisible().catch(() => false)) await repick.click();
      const course = page.getByRole("button", { name: /QA Course/i });
      if (await course.isVisible().catch(() => false)) await course.click();
      await page.getByRole("button", { name: /QA Lesson/i }).click();
      await expect(programmeButton).toBeVisible({ timeout: 15_000 });
    };

    await ensureMaterial();
    const openProgramme = () => programmeButton.click();
    // One hide-toggle per step, so counting them counts the programme.
    const stepToggles = page.getByRole("button", { name: /^скрыто$|^hidden$/i });

    await openProgramme();
    const before = await stepToggles.count();
    expect(before).toBeGreaterThan(0);

    // "+ Board" pins a copy of the auto list and appends to it, so this one
    // click is both the edit and the thing that must come back.
    const saved = page.waitForResponse(
      (r) => r.url().includes("/programme") && r.request().method() === "PATCH" && r.ok(),
    );
    await page.getByRole("button", { name: /\+ (доска|board)/i }).click();
    await saved;
    await expect(stepToggles).toHaveCount(before + 1);

    await page.reload();

    // Same lesson, same teacher, fresh page: the extra step has to be there
    // before any editing happens.
    await ensureMaterial();
    await openProgramme();
    await expect(stepToggles).toHaveCount(before + 1);

    // Leave the lesson ended so a re-run starts from a clean group. The open
    // programme panel lays a click-away catcher over the page, so close it
    // first — Esc is what the screen binds for that.
    await page.keyboard.press("Escape");
    const endButton = page.getByRole("button", { name: /завершить|end lesson/i });
    await endButton.first().click();
    await endButton.last().click();
  });
});

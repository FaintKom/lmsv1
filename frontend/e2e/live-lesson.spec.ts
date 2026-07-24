import { expect, test } from "@playwright/test";

import { LoginPage } from "./poms/LoginPage";

/**
 * Live lesson happy path: teacher starts a lesson from the groups page,
 * a student joins, scene changes propagate over SSE, signals reach the
 * teacher panel, and ending the lesson lands on the student screen.
 *
 * Requires backend + frontend running and the QA seed (qa-teacher must own
 * a group containing qa-student) — see docs/TESTING.md / the QA compose.
 */
test.describe("live lesson", () => {
  test("teacher starts, student joins, scene syncs, lesson ends", async ({ browser }) => {
    const teacherCtx = await browser.newContext();
    const studentCtx = await browser.newContext();
    const teacherPage = await teacherCtx.newPage();
    const studentPage = await studentCtx.newPage();

    await new LoginPage(teacherPage).loginViaUi("teacher");
    await new LoginPage(studentPage).loginViaUi("student");

    // teacher: start from groups page
    await teacherPage.goto("/admin/groups");
    await teacherPage
      .getByRole("button", { name: /начать урок|start lesson/i })
      .first()
      .click();
    await teacherPage.waitForURL(/\/admin\/live\//);
    const lessonId = teacherPage.url().split("/admin/live/")[1];

    // student: join via direct URL (banner needs a page load; direct is deterministic)
    await studentPage.goto(`/lesson/${lessonId}`);
    await expect(studentPage.getByRole("button", { name: /✋/ })).toBeVisible({
      timeout: 15000,
    });

    // teacher switches scene to board -> student sees the excalidraw canvas
    await teacherPage.getByTitle(/доска|board/i).click();
    await expect(studentPage.locator(".excalidraw")).toBeVisible({ timeout: 15000 });

    // student raises hand -> teacher roster shows it
    await studentPage.getByRole("button", { name: /✋/ }).click();
    await expect(teacherPage.getByText("✋").first()).toBeVisible({ timeout: 15000 });

    // end lesson
    teacherPage.on("dialog", (d) => void d.accept());
    await teacherPage.getByRole("button", { name: /завершить|end lesson/i }).click();
    await expect(
      studentPage.getByText(/урок завершён|lesson ended|итоги урока|lesson review/i),
    ).toBeVisible({ timeout: 15000 });

    await teacherCtx.close();
    await studentCtx.close();
  });
});

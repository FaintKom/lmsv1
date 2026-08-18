import { expect, test, type Page } from "@playwright/test";

import { LoginPage } from "../poms/LoginPage";

/**
 * A lesson with faces in it: one teacher, two pupils, one room.
 *
 * This journey exists because of the day it was written. Video shipped in four
 * slices and was verified four times — tokens minted, grants differing by role,
 * the proxy forwarding, the certificate valid, the camera policy fixed — and
 * the room had never once connected in production. Every one of those checks
 * passes while nobody can see anybody.
 *
 * What went wrong was only ever visible from a browser that actually joined:
 *
 *   - the client asked for `/rtc/rtc`, a path the media server answers `404`
 *   - the server was five minor versions behind its own SDK, so the peer
 *     connection never negotiated and the participant was dropped
 *   - switching a tab unmounted the room and hung up the call
 *
 * So the assertions below are deliberately about *effect*, never about the
 * plumbing that produces it: a tile appears, a pupil is told they are muted, a
 * removed pupil cannot get back in. Anything asserting a token or a URL would
 * have passed on every one of those days.
 */

test.describe.configure({ mode: "serial" });

const TEACHER_TILE = /Admin|QA Teacher/i;

/** Somebody's tile, by the name the media server publishes it under. */
function tileFor(page: Page, name: RegExp) {
  return page.locator(".lk-participant-tile", { hasText: name });
}

async function joinCall(page: Page) {
  await page.getByRole("button", { name: /join video|войти в видео/i }).click();
  // Connected, not merely clicked: the leave control only exists inside a room.
  await expect(page.getByRole("button", { name: /leave|выйти/i })).toBeVisible({
    timeout: 30_000,
  });
}

test.describe("a lesson with video in it", () => {
  let lessonId = "";
  let teacher: Page;
  let pupilA: Page;
  let pupilB: Page;

  test.beforeAll(async ({ browser }) => {
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext(),
    ]);
    [teacher, pupilA, pupilB] = await Promise.all(contexts.map((c) => c.newPage()));

    await new LoginPage(teacher).loginViaUi("teacher");
    await new LoginPage(pupilA).loginViaUi("student");
    await new LoginPage(pupilB).loginViaUi("student2");

    // A previous run's lesson survives the runner: starting again answers 409
    // and the page walks into the OLD lesson, whose scene is whatever that run
    // died holding. One flaked run then poisons every run after it, which is
    // how a "screen" scene from a failed attempt broke test one of the next
    // three. End it, then start clean.
    await teacher.evaluate(async () => {
      const active = await fetch("/api/v1/live-lessons/active", { credentials: "include" }).then(
        (r) => r.json(),
      );
      if (active.lesson_id) {
        await fetch(`/api/v1/live-lessons/${active.lesson_id}/end`, {
          method: "POST",
          credentials: "include",
        });
      }
    });

    await teacher.goto("/admin/groups");
    await teacher
      .getByRole("button", { name: /начать урок|start lesson/i })
      .first()
      .click();
    await teacher.waitForURL(/\/admin\/live\//);
    lessonId = teacher.url().split("/admin/live/")[1];
  });

  test("everybody in the room can see everybody", async () => {
    await joinCall(teacher);

    for (const pupil of [pupilA, pupilB]) {
      await pupil.goto(`/lesson/${lessonId}`);
      await joinCall(pupil);
    }

    // Somebody else's tile is the whole point — a room of one renders your own.
    await expect(tileFor(pupilA, TEACHER_TILE)).toHaveCount(1, { timeout: 30_000 });
    await expect(tileFor(pupilA, /QA Student Two/i)).toHaveCount(1, { timeout: 30_000 });
    await expect(tileFor(pupilB, TEACHER_TILE)).toHaveCount(1, { timeout: 30_000 });

    // The teacher sees the whole class, not a page of it. This assertion was
    // once weakened to the roster because the panel's grid paginated — a class
    // of two showed one pupil (T107). The panel is a scrollable band now, and
    // this line is the regression test: if pagination ever comes back, a class
    // of two fails it again.
    await expect(tileFor(teacher, /QA Student(?! Two)/i)).toHaveCount(1, { timeout: 30_000 });
    await expect(tileFor(teacher, /QA Student Two/i)).toHaveCount(1, { timeout: 30_000 });
  });

  test("the class sees the teacher's screen, on the stage", async () => {
    await teacher.getByRole("button", { name: /share screen|показать экран/i }).click();

    // The SDK names a screen tile after its owner, so this cannot be satisfied
    // by the pupil's own camera.
    await expect(pupilA.locator(".lk-participant-tile", { hasText: /screen/i })).toHaveCount(1, {
      timeout: 30_000,
    });

    // Sharing IS deciding to show (FR-034): the scene follows the share, and
    // the pupil's media area takes the stage rather than a 224-pixel strip.
    await expect(pupilA.getByTestId("media-on-stage")).toBeVisible({ timeout: 15_000 });
  });

  test("the faces can be put on the stage like a board", async () => {
    await teacher.getByRole("button", { name: /^faces|^лица/i }).click();

    // Still the stage — a different scene, the same owner of the layout.
    await expect(pupilA.getByTestId("media-on-stage")).toBeVisible({ timeout: 15_000 });
    // And it is the grid, not the lone screen: the teacher's CAMERA is in it.
    // The screen tile also carries the teacher's name — with the share still
    // running there are two — so the camera is told apart by what it is not.
    await expect(
      pupilA
        .getByTestId("media-on-stage")
        .locator(".lk-participant-tile", { hasText: TEACHER_TILE, hasNotText: /screen/i }),
    ).toHaveCount(1, { timeout: 15_000 });
  });

  test("muting one pupil leaves the other alone", async () => {
    await teacher
      .getByRole("button", { name: /QA Student(?! Two)/i })
      .first()
      .click();
    await teacher.getByRole("button", { name: /^mute|заглушить/i }).click();

    await expect(pupilA.getByText(/microphone muted|микрофон выключен/i)).toBeVisible({
      timeout: 15_000,
    });
    // The control: a mute that quietly silences the room passes the assertion
    // above and fails this one.
    await expect(pupilB.getByText(/microphone muted|микрофон выключен/i)).toHaveCount(0);

    // Close the drawer the way a teacher would, so the next act starts from
    // the same place this one did.
    await teacher.getByRole("button", { name: /close|закрыть/i }).first().click();
  });

  test("a recording is made, told to everybody, and handed back", async () => {
    // The pupils' cameras are live fake devices here, which is the honest
    // limit of this test: Chrome paints the same test pattern for every
    // participant, so no pixel can say whose camera it came from. The
    // "holds nobody else" boundary is enforced by construction and by the
    // unit test that reads only the local participant (recorder.test.ts,
    // demonstrated failing against a room composite). What a browser CAN
    // prove end to end is everything around it, and that is what this does.
    await teacher.getByRole("button", { name: /^record|записать/i }).click();

    // Told to everybody, not only the one who pressed it (FR-020) — the
    // pupil's indicator is fed by the server, so a browser that missed the
    // start event still learns.
    await expect(teacher.getByText(/^recording$|идёт запись/i)).toBeVisible({ timeout: 15_000 });
    await expect(pupilA.getByText(/^recording$|идёт запись/i)).toBeVisible({ timeout: 15_000 });

    // Long enough for MediaRecorder to cut at least one chunk.
    await teacher.waitForTimeout(3_000);
    await teacher.getByRole("button", { name: /stop recording|остановить запись/i }).click();
    await expect(teacher.getByText(/recording saved|запись сохранена/i)).toBeVisible({
      timeout: 30_000,
    });

    // The server has the file: ready, linked, with a duration — and it is a
    // real WebM, which the first four bytes state (EBML magic). The pupil is
    // refused the same file until a teacher deliberately shares it, and that
    // pair of checks lives in pytest where both sides of it are cheap.
    const rec = await teacher.evaluate(async () => {
      const rows = await fetch("/api/v1/recordings", { credentials: "include" }).then((r) =>
        r.json(),
      );
      const row = rows[0];
      const file = await fetch(row.download_url, { credentials: "include" });
      const head = new Uint8Array(await file.arrayBuffer()).slice(0, 4);
      return {
        status: row.status,
        seconds: row.duration_seconds,
        fileStatus: file.status,
        magic: Array.from(head)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join(" "),
      };
    });
    expect(rec.status).toBe("ready");
    expect(rec.seconds).toBeGreaterThanOrEqual(1);
    expect(rec.fileStatus).toBe(200);
    expect(rec.magic).toBe("1a 45 df a3");
  });

  test("a removed pupil is out, and stays out", async () => {
    await teacher
      .getByRole("button", { name: /QA Student Two/i })
      .first()
      .click();
    await teacher.getByRole("button", { name: /remove|удалить/i }).click();

    await expect(pupilB.getByText(/removed from the room|удалены из комнаты/i)).toBeVisible({
      timeout: 15_000,
    });

    // Removal that only hides buttons is not removal. Asking the server again
    // is the only way to tell the difference.
    const refused = await pupilB.evaluate(
      (id) =>
        fetch(`/api/v1/live-lessons/${id}/media/token`, {
          method: "POST",
          credentials: "include",
        }).then((r) => r.status),
      lessonId,
    );
    expect(refused).toBe(403);

    // And the pupil who was not removed is untouched — without this, a server
    // that refuses everybody passes the line above.
    const allowed = await pupilA.evaluate(
      (id) =>
        fetch(`/api/v1/live-lessons/${id}/media/token`, {
          method: "POST",
          credentials: "include",
        }).then((r) => r.status),
      lessonId,
    );
    expect(allowed).toBe(200);
  });

  test("the call survives opening something else in the lesson", async () => {
    // The room used to live inside the page component, so every tab a teacher
    // opened hung up the call they were running (FR-033).
    await teacher
      .getByRole("button", { name: /^task$|^задани/i })
      .first()
      .click();

    // Still in the call: the leave control only exists inside a room, wherever
    // that room happens to be drawn.
    await expect(teacher.getByRole("button", { name: /leave|выйти/i })).toBeVisible({
      timeout: 15_000,
    });
  });

  test.afterAll(async () => {
    await teacher
      .getByRole("button", { name: /end lesson|завершить урок/i })
      .click()
      .catch(() => {});
  });
});

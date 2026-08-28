/**
 * Phone-width audit of every page, per role.
 *
 * Deliberately NOT a `*.spec.ts`: `playwright.config.ts` matches
 * `e2e/**\/*.spec.ts` and CI runs the whole directory, so a spec here would
 * become a PR gate. This is a report, not a gate — the gates come afterwards,
 * one per fault worth pinning.
 *
 *   cd frontend && node e2e/mobile-audit.mjs
 *
 * Needs the QA stack up and seeded (docker-compose.qa.yml + scripts/seed_qa.py).
 * Writes ../tasks/mobile-audit.json.
 */

import { writeFileSync } from "node:fs";
import { chromium, devices } from "playwright";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const API = process.env.PLAYWRIGHT_API_URL ?? "http://localhost:8000";

// Mirrors scripts/seed_qa.py. Fixture credentials for a throwaway stand.
const CREDS = {
  student: { email: "qa-student@qa.example.com", password: "qa-test-not-for-prod" },
  teacher: { email: "qa-teacher@qa.example.com", password: "qa-test-not-for-prod" },
  admin: { email: "qa-admin@qa.example.com", password: "qa-test-not-for-prod" },
};

// Deterministic uuid5 ids from seed_qa.py, injected by the caller.
const ID = {
  course: process.env.QA_COURSE_ID ?? "",
  lesson: process.env.QA_LESSON_ID ?? "",
  group: process.env.QA_GROUP_ID ?? "",
  org: process.env.QA_ORG_ID ?? "",
};

/** Every page in src/app, minus print layouts and dev harnesses. */
const PUBLIC = [
  "/",
  "/pricing",
  "/demo",
  "/contact",
  "/terms",
  "/privacy",
  "/cookies",
  "/refund",
  "/copyright",
  "/acceptable-use",
  "/login",
  "/register",
  "/forgot-password",
];

const STUDENT = [
  "/dashboard",
  "/courses",
  "/assignments",
  "/calendar",
  "/schedule",
  "/progress",
  "/achievements",
  "/leaderboard",
  "/certificates",
  "/skills",
  "/paths",
  "/peer-review",
  "/team-projects",
  "/attendance",
  "/my-room",
  "/my-avatar",
  "/live",
  "/profile",
  "/support",
  ID.course && `/courses/${ID.course}`,
  ID.course && ID.lesson && `/courses/${ID.course}/lessons/${ID.lesson}`,
  ID.lesson && `/lesson/${ID.lesson}`,
].filter(Boolean);

const STAFF = [
  "/admin",
  "/admin/courses",
  "/admin/content-library",
  "/admin/assignments",
  "/admin/review",
  "/admin/peer-review",
  "/admin/gradebook",
  "/admin/journal",
  "/admin/groups",
  "/admin/paths",
  "/admin/calendar",
  "/admin/live",
  "/admin/team-projects",
  "/admin/settings",
  "/admin/users",
  "/admin/org-members",
  "/admin/bulk-enroll",
  "/admin/analytics",
  "/admin/crm",
  "/admin/waitlist",
  "/admin/billing",
  "/admin/integrations",
  "/admin/organizations",
  ID.course && `/admin/courses/${ID.course}/edit`,
  ID.lesson && `/admin/lessons/${ID.lesson}/edit`,
].filter(Boolean);

const ROUTES = {
  student: [...PUBLIC, ...STUDENT],
  teacher: [...STAFF],
  admin: [...STAFF],
};

/**
 * What a phone user actually suffers, measured in the page.
 *
 * Overflow is reported with the *outermost* offenders only: when a container
 * runs off the screen every descendant does too, and a list of forty children
 * says nothing about where to look.
 */
const PROBE = () => {
  const de = document.documentElement;
  const vw = de.clientWidth;

  const scrollableAncestor = (el) => {
    for (let n = el.parentElement; n; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (s.overflowX === "auto" || s.overflowX === "scroll") return n;
    }
    return null;
  };

  const describe = (el) => ({
    tag: el.tagName.toLowerCase(),
    cls: typeof el.className === "string" ? el.className.slice(0, 90) : "",
    text: (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 50),
  });

  // ── elements sticking out of the viewport ────────────────────────────────
  const offenders = [];
  for (const el of document.querySelectorAll("body *")) {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    if (r.right <= vw + 1 && r.left >= -1) continue;
    if (scrollableAncestor(el)) continue; // a deliberate scroll strip is fine
    offenders.push({ el, r });
  }
  const outermost = offenders
    .filter(({ el }) => !offenders.some((o) => o.el !== el && o.el.contains(el)))
    .slice(0, 8)
    .map(({ el, r }) => ({
      ...describe(el),
      left: Math.round(r.left),
      right: Math.round(r.right),
      width: Math.round(r.width),
    }));

  // ── tap targets below the WCAG 2.2 minimum of 24×24 CSS px ───────────────
  //
  // Two exemptions, both in the spec itself, and both of which the first run
  // of this audit reported as faults until they were excluded:
  //
  //  - visually-hidden controls (skip links, the real <input> behind a styled
  //    switch). They measure 1×1 because nobody is meant to hit them;
  //  - a link inside a sentence. WCAG's "inline" exemption: the target is
  //    sized by the text around it, and padding it would break the paragraph.
  const SELECTOR =
    'a[href], button, [role="button"], input:not([type="hidden"]), select, textarea, summary';
  const isHidden = (el) => {
    if (el.closest('[aria-hidden="true"]')) return true;
    const cls = typeof el.className === "string" ? el.className : "";
    if (/\bsr-only\b/.test(cls)) return true;
    const s = getComputedStyle(el);
    return s.visibility === "hidden" || s.opacity === "0";
  };
  const isInlineInProse = (el) => {
    if (el.tagName !== "A") return false;
    if (getComputedStyle(el).display !== "inline") return false;
    // Prose if some near ancestor holds meaningfully more text than the link.
    // The immediate parent alone is not enough: a link wrapped in its own
    // <span> reads as standalone when the sentence is one level further up.
    const own = (el.textContent || "").trim().length;
    let n = el.parentElement;
    for (let i = 0; n && i < 3; i++, n = n.parentElement) {
      if ((n.textContent || "").trim().length > own + 20) return true;
    }
    return false;
  };
  // A control whose <label for> points at it is activated by the label too, so
  // the real target is the pair. Measure that, not the 13px checkbox.
  const effectiveBox = (el) => {
    const own = el.getBoundingClientRect();
    const label =
      (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`)) || el.closest("label");
    if (!label) return own;
    const l = label.getBoundingClientRect();
    return {
      width: Math.max(own.right, l.right) - Math.min(own.left, l.left),
      height: Math.max(own.bottom, l.bottom) - Math.min(own.top, l.top),
    };
  };

  // Two bars. 24px is WCAG 2.2 AA (2.5.8); 44px is this project's own rule —
  // docs/LMS_UX_DESIGN_GUIDE.md, "Touch-friendly: min 44x44px buttons".
  // A hit area can be larger than the box: `.tap-target` grows it with a
  // pseudo-element, which no rect reports. So ask the page what a finger would
  // actually reach — a point 12px out from the centre must still land on the
  // control. Measuring the box alone would have called those fixes failures.
  const reaches = (el, dx, dy) => {
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2 + dx;
    const y = r.top + r.height / 2 + dy;
    if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return false;
    const hit = document.elementFromPoint(x, y);
    return Boolean(hit && (hit === el || el.contains(hit) || hit.contains(el)));
  };
  const hitAreaAtLeast24 = (el) => {
    const r = el.getBoundingClientRect();
    const vertical = r.height >= 24 || (reaches(el, 0, -12) && reaches(el, 0, 12));
    const horizontal = r.width >= 24 || (reaches(el, -12, 0) && reaches(el, 12, 0));
    return vertical && horizontal;
  };

  const tiny = [];
  const belowProjectBar = [];
  for (const el of document.querySelectorAll(SELECTOR)) {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue; // not rendered
    if (isHidden(el)) continue;
    const box = effectiveBox(el);
    const min = Math.min(box.width, box.height);
    const inline = isInlineInProse(el);
    if (min < 24 && !inline && hitAreaAtLeast24(el)) continue; // reachable anyway
    const row = {
      ...describe(el),
      width: Math.round(box.width),
      height: Math.round(box.height),
      inline,
    };
    if (min < 24 && !inline) tiny.push(row);
    else if (min < 44 && !inline) belowProjectBar.push(row);
  }

  // ── text too small to read on a phone ────────────────────────────────────
  const smallText = new Map();
  for (const el of document.querySelectorAll("body *")) {
    if (el.children.length) continue; // leaf text only
    const t = (el.textContent || "").trim();
    if (t.length < 3) continue;
    const size = parseFloat(getComputedStyle(el).fontSize);
    if (!(size < 11)) continue;
    const key = `${size}px`;
    smallText.set(key, (smallText.get(key) || 0) + 1);
  }

  return {
    viewportWidth: vw,
    overflowPx: de.scrollWidth - vw,
    offenders: outermost,
    tinyTargets: { count: tiny.length, examples: tiny.slice(0, 6) },
    below44: { count: belowProjectBar.length, examples: belowProjectBar.slice(0, 8) },
    smallText: Object.fromEntries(smallText),
    bodyTextLength: (document.body.innerText || "").trim().length,
  };
};

async function login(context, role) {
  const res = await context.request.post(`${API}/api/v1/auth/login`, { data: CREDS[role] });
  if (!res.ok()) throw new Error(`login(${role}): ${res.status()} ${await res.text()}`);
}

/**
 * Prove the probe can see a fault before trusting it to report none.
 *
 * The first run of this audit returned zero overflow across 85 pages, which is
 * either a well-built app or a blind instrument. Injecting one 2000px-wide box
 * tells the two apart, and costs a second.
 */
async function selfTest(page) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  const clean = await page.evaluate(PROBE);
  await page.evaluate(() => {
    const d = document.createElement("div");
    d.id = "audit-canary";
    d.style.cssText = "width:2000px;height:20px;background:red";
    d.textContent = "canary";
    document.body.appendChild(d);
  });
  const dirty = await page.evaluate(PROBE);
  await page.evaluate(() => document.getElementById("audit-canary")?.remove());
  if (!(dirty.overflowPx > 1000)) {
    throw new Error(
      `self-test: a 2000px box produced overflowPx=${dirty.overflowPx}; the probe is blind`,
    );
  }
  if (!dirty.offenders.some((o) => o.text === "canary")) {
    throw new Error("self-test: the canary was not named among the offenders");
  }
  console.log(
    `self-test ok — clean page ${clean.overflowPx}px, with canary ${dirty.overflowPx}px, named\n`,
  );
}

async function run() {
  const browser = await chromium.launch();
  const results = [];

  for (const role of ["student", "teacher", "admin"]) {
    const context = await browser.newContext({
      ...devices["iPhone SE"], // 375×667 — the narrowest screen still in wide use
      locale: "en-US",
    });
    // The cookie bar is fixed to the bottom and would sit over the controls.
    await context.addInitScript(() => localStorage.setItem("cookie-consent", "accepted"));
    await login(context, role);

    const page = await context.newPage();
    const consoleErrors = [];
    const failedRequests = [];
    page.on("console", (m) => {
      if (m.type() === "error") consoleErrors.push(m.text().slice(0, 160));
    });
    page.on("response", (r) => {
      if (r.status() >= 400) {
        failedRequests.push(`${r.status()} ${new URL(r.url()).pathname}`);
      }
    });
    if (role === "student") await selfTest(page);

    for (const route of ROUTES[role]) {
      consoleErrors.length = 0;
      failedRequests.length = 0;
      const entry = { role, route };
      try {
        const resp = await page.goto(`${BASE}${route}`, {
          waitUntil: "domcontentloaded",
          timeout: 30_000,
        });
        entry.status = resp?.status() ?? 0;
        // These pages fetch on mount, and a table that arrives late is a table
        // this audit would otherwise never measure. Wait for the network to go
        // quiet, then let the render settle.
        await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
        await page.waitForTimeout(600);
        entry.finalUrl = new URL(page.url()).pathname;
        entry.redirected = entry.finalUrl !== route;
        Object.assign(entry, await page.evaluate(PROBE));
        entry.consoleErrors = consoleErrors.slice(0, 3);
        entry.failedRequests = [...new Set(failedRequests)].slice(0, 6);
      } catch (err) {
        entry.error = String(err).slice(0, 200);
      }
      results.push(entry);
      const flag = entry.error
        ? "ERR"
        : entry.overflowPx > 0
          ? `OVERFLOW +${entry.overflowPx}`
          : entry.tinyTargets?.count
            ? `tiny x${entry.tinyTargets.count}`
            : "ok";
      console.log(`${role.padEnd(8)} ${route.padEnd(46)} ${flag}`);
    }
    await context.close();
  }

  await browser.close();
  writeFileSync("../tasks/mobile-audit.json", JSON.stringify(results, null, 2));
  console.log(`\n${results.length} pages measured -> tasks/mobile-audit.json`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

import { expect, test } from "@playwright/test";

import { LoginPage, type QaRole } from "./poms/LoginPage";

/**
 * Dark-theme surface audit.
 *
 * Three separate classes of dark-mode breakage shipped in 2026-08, and each
 * was found by a human looking at a screenshot rather than by a check: raw
 * `bg-paper-2` page shells, hardcoded `text-white` on brand buttons, and raw
 * tinted surfaces (`from-green-50`) holding semantic text. They share one
 * shape — a background that does NOT flip with `.dark`, under text that does.
 *
 * This test walks the public pages with `.dark` applied and fails on:
 *   1. a light surface (a background that stayed light while the page went
 *      dark), and
 *   2. text below the WCAG contrast floor against its effective background.
 *
 * Two things the earlier manual audits got wrong, both handled here:
 *   - a gradient lives in `background-image`, NOT `background-color`. Reading
 *     only the latter reported `/demo` as clean while its entire page
 *     background was a light gradient.
 *   - the dark tokens are translucent (`rgba(53,208,127,0.14)`), so a colour
 *     must be composited over what is behind it before measuring anything.
 */

/** Public routes — no auth, safe to run anywhere including CI. */
const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/register",
  "/pricing",
  "/demo",
  "/terms",
  "/privacy",
  "/cookies",
  "/refund",
  "/acceptable-use",
  "/copyright",
  // A school's own enquiry page. Public, so it is audited here; the slug is
  // the one the QA seed creates.
  "/s/qa-org/enquire",
];

type Violation = { kind: "surface" | "contrast"; where: string; detail: string };

/**
 * Runs in the page. Returns every violation rather than the first, so one run
 * tells you the whole story instead of one line at a time.
 */
const AUDIT = `(() => {
  // Tailwind 4 emits oklab/oklch for opacity modifiers, so a naive
  // "grab the numbers" parser reads 'oklab(0.99 ... / 0.7)' as near-black and
  // invents violations. Paint the colour instead and read back real RGBA —
  // the canvas handles every space the browser can render.
  const px = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const parse = (c) => {
    const str = String(c).trim();
    if (!str || str === "none" || str === "transparent") return null;
    px.clearRect(0, 0, 1, 1);
    px.fillStyle = "#000";
    px.fillStyle = str;
    if (px.fillStyle === "#000" && !/^(#000000|#000|black|rgba?\\(0, ?0, ?0)/.test(str)) return null;
    px.fillRect(0, 0, 1, 1);
    const d = px.getImageData(0, 0, 1, 1).data;
    return { r: d[0], g: d[1], b: d[2], a: d[3] / 255 };
  };
  const isLight = (c) => c && c.r > 225 && c.g > 225 && c.b > 225;
  // Source-over, alpha included. Returning a hardcoded a:1 was wrong for two
  // translucent layers: compositing a 7% tint onto a 14% tint claimed the
  // result was opaque, so bgOf stopped there and reported the near-raw stop
  // colour (rgba(53,208,127,.14) read back as "solid rgb(50,206,128)"). That
  // invented two contrast failures on the teacher onboarding card and would
  // have had us paint near-black text onto a dark surface to "fix" them.
  // When bg is already opaque this reduces to the old formula.
  const over = (fg, bg) => {
    const a = fg.a + bg.a * (1 - fg.a);
    if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
    return {
      r: (fg.r * fg.a + bg.r * bg.a * (1 - fg.a)) / a,
      g: (fg.g * fg.a + bg.g * bg.a * (1 - fg.a)) / a,
      b: (fg.b * fg.a + bg.b * bg.a * (1 - fg.a)) / a,
      a,
    };
  };
  const lum = (c) => {
    const f = (v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const ratio = (a, b) => {
    const x = lum(a), y = lum(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  };
  const label = (el) => {
    const cls = typeof el.className === "string"
      ? el.className.trim().split(/\\s+/).slice(0, 6).join(".")
      : "";
    return el.tagName.toLowerCase() + (cls ? "." + cls : "");
  };

  /**
   * Effective background: walk up compositing translucent layers.
   * Returns the chain too — a composited result on its own cannot tell you
   * whether a surprising colour came from a real solid layer or from a
   * mis-composite in here, and guessing wrong means "fixing" healthy screens.
   */
  const bgOf = (el) => {
    let acc = null, n = el;
    const chain = [];
    while (n) {
      const raw = getComputedStyle(n).backgroundColor;
      const c = parse(raw);
      if (c && c.a > 0) {
        chain.push(label(n).slice(0, 28) + " " + raw);
        acc = acc ? over(acc, c) : c;
      }
      if (acc && acc.a >= 1) return { c: acc, chain };
      n = n.parentElement;
    }
    return { c: acc || { r: 255, g: 255, b: 255, a: 1 }, chain };
  };

  const out = [];
  for (const el of document.querySelectorAll("*")) {
    // Always-light by design: the print shell is meant for paper. Monaco
    // ships its own theme and is not ours to token-ise.
    if (el.closest(".print-root, .monaco-editor, [data-theme-exempt]")) continue;
    const s = getComputedStyle(el);
    if (s.display === "none" || s.visibility === "hidden") continue;
    const box = el.getBoundingClientRect();
    if (box.width < 8 || box.height < 8) continue;

    // 1 — light surface, from either property.
    const bc = parse(s.backgroundColor);
    if (bc && bc.a > 0.5 && isLight(bc)) {
      out.push({ kind: "surface", where: label(el), detail: "background-color " + s.backgroundColor });
    }
    if (s.backgroundImage && s.backgroundImage !== "none") {
      for (const stop of s.backgroundImage.match(/rgba?\\([^)]+\\)/g) || []) {
        const c = parse(stop);
        if (c && c.a > 0.5 && isLight(c)) {
          out.push({ kind: "surface", where: label(el), detail: "gradient stop " + stop });
          break;
        }
      }
    }

    // 2 — contrast, only for elements holding their own text.
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!own) continue;
    const fg = parse(s.color);
    if (!fg || fg.a === 0) continue;
    const bgInfo = bgOf(el);
    const bg = bgInfo.c;
    const r = ratio(fg.a < 1 ? over(fg, bg) : fg, bg);
    const size = parseFloat(s.fontSize);
    const bold = Number(s.fontWeight) >= 700;
    const floor = size >= 24 || (bold && size >= 18.66) ? 3 : 4.5;
    if (r < floor) {
      out.push({
        kind: "contrast",
        where: label(el),
        detail: r.toFixed(2) + ":1 (needs " + floor + ") — " + s.color + " on rgb(" +
          [bg.r, bg.g, bg.b].map(Math.round).join(",") + ") — \\"" +
          el.textContent.trim().slice(0, 40) + "\\"\\n      layers: " +
          (bgInfo.chain.join(" < ") || "none"),
      });
    }
  }
  // One row per distinct element+kind; a repeated card should not shout 30x.
  const seen = new Set();
  return out.filter((v) => {
    const k = v.kind + "|" + v.where + "|" + v.detail.slice(0, 30);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
})()`;

function report(route: string, violations: Violation[]) {
  return [
    `${route} — ${violations.length} dark-theme violation(s):`,
    ...violations.map((v) => `  [${v.kind}] ${v.where}\n      ${v.detail}`),
  ].join("\n");
}

for (const route of PUBLIC_ROUTES) {
  test(`dark theme: ${route} has no light surfaces or low-contrast text`, async ({ page }) => {
    // Set the choice before the app boots: the no-FOUC script in the root
    // layout reads localStorage during <head>, so setting it after a load
    // would audit the light theme on the first paint.
    await page.addInitScript(() => window.localStorage.setItem("lms.theme", "dark"));
    await page.goto(route, { waitUntil: "networkidle" });
    await expect(page.locator("html")).toHaveClass(/dark/);

    const violations = (await page.evaluate(AUDIT)) as Violation[];
    expect(violations, report(route, violations)).toEqual([]);
  });
}

/**
 * Authenticated surfaces — where all three shipped bugs actually lived. The
 * public sweep never saw them, which is why they kept being found by
 * screenshot instead of by a check.
 *
 * One login per role, then every route in the same context: /auth/login is
 * rate-limited 5/min/IP, so logging in per route would throttle itself.
 */
/**
 * Widened 2026-08-04 from 14 routes across 2 roles to 51 across 4. The static
 * design-system audit left ~92 raw light surfaces it could not adjudicate —
 * `bg-white` under `text-text` is a real break, `bg-green-100` under
 * `text-green-800` is a self-consistent chip that merely looks dated, and only
 * a composited runtime read tells them apart. Most of those sit on screens the
 * old 14 never opened.
 *
 * Dynamic routes ([courseId], [lessonId], …) stay out: they need fixture ids,
 * and the shells they render are covered by their list pages. Super-admin-only
 * screens (/admin/organizations, /admin/waitlist) stay out too — no seed role
 * reaches them.
 */
const ROLE_ROUTES: Record<QaRole, string[]> = {
  student: [
    "/dashboard", "/courses", "/assignments", "/achievements", "/calendar",
    "/live", "/peer-review", "/team-projects", "/attendance", "/schedule",
    "/profile", "/progress", "/skills", "/leaderboard", "/certificates",
    "/paths", "/support",
  ],
  teacher: [
    "/admin", "/admin/groups", "/admin/courses", "/admin/content-library",
    "/admin/assignments", "/admin/gradebook", "/admin/review",
    "/admin/peer-review", "/admin/team-projects", "/admin/journal",
    "/admin/calendar", "/admin/live", "/admin/analytics",
  ],
  // Same screens as teacher; is_methodist widens data reach, not the nav.
  // Kept short on purpose — it re-walks the four that change with the flag.
  methodist: ["/admin", "/admin/journal", "/admin/content-library", "/admin/courses"],
  admin: [
    "/admin", "/admin/users", "/admin/groups", "/admin/courses",
    "/admin/content-library", "/admin/assignments", "/admin/gradebook",
    "/admin/review", "/admin/journal", "/admin/paths", "/admin/calendar",
    "/admin/live", "/admin/analytics", "/admin/integrations",
    "/admin/settings", "/admin/billing", "/admin/bulk-enroll",
  ],
};

for (const role of ["student", "teacher", "methodist", "admin"] as const) {
  test(`dark theme: ${role} surfaces have no light surfaces or low-contrast text`, async ({
    page,
  }) => {
    test.slow(); // one login plus up to 17 navigations

    await page.addInitScript(() => window.localStorage.setItem("lms.theme", "dark"));
    await new LoginPage(page).loginViaUi(role);

    const failures: string[] = [];
    for (const route of ROLE_ROUTES[role]) {
      await page.goto(route, { waitUntil: "networkidle" });
      // A redirect means this role cannot reach the route. That is RBAC's
      // assertion to make, not this test's — auditing the redirect target
      // here would just re-audit /admin once per bounce.
      if (!new URL(page.url()).pathname.startsWith(route)) continue;
      await expect(page.locator("html")).toHaveClass(/dark/);
      const violations = (await page.evaluate(AUDIT)) as Violation[];
      if (violations.length) failures.push(report(route, violations));
    }
    // Report every bad route in one go — finding them one failure per run is
    // how a three-class bug takes three days to surface.
    expect(failures.join("\n\n"), `${role}: ${failures.length} route(s) with violations`).toBe("");
  });
}

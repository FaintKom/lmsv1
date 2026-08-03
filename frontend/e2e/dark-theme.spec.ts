import { expect, test } from "@playwright/test";

import { LoginPage } from "./poms/LoginPage";

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
  const over = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  });
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

  /** Effective background: walk up compositing translucent layers. */
  const bgOf = (el) => {
    let acc = null, n = el;
    while (n) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (c && c.a > 0) acc = acc ? over(acc, c) : c;
      if (acc && acc.a >= 1) return acc;
      n = n.parentElement;
    }
    return acc || { r: 255, g: 255, b: 255, a: 1 };
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
    const bg = bgOf(el);
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
          el.textContent.trim().slice(0, 40) + "\\"",
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
const ROLE_ROUTES: Record<"student" | "teacher", string[]> = {
  student: [
    "/dashboard",
    "/courses",
    "/assignments",
    "/progress",
    "/achievements",
    "/leaderboard",
    "/profile",
  ],
  teacher: [
    "/admin",
    "/admin/courses",
    "/admin/journal",
    "/admin/gradebook",
    "/admin/users",
    "/admin/analytics",
    "/admin/content-library",
  ],
};

for (const role of ["student", "teacher"] as const) {
  test(`dark theme: ${role} surfaces have no light surfaces or low-contrast text`, async ({
    page,
  }) => {
    await page.addInitScript(() => window.localStorage.setItem("lms.theme", "dark"));
    await new LoginPage(page).loginViaUi(role);

    const failures: string[] = [];
    for (const route of ROLE_ROUTES[role]) {
      await page.goto(route, { waitUntil: "networkidle" });
      await expect(page.locator("html")).toHaveClass(/dark/);
      const violations = (await page.evaluate(AUDIT)) as Violation[];
      if (violations.length) failures.push(report(route, violations));
    }
    // Report every bad route in one go — finding them one failure per run is
    // how a three-class bug takes three days to surface.
    expect(failures.join("\n\n"), `${role}: ${failures.length} route(s) with violations`).toBe("");
  });
}

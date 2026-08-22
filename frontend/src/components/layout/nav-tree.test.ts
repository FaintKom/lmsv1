import { describe, it, expect } from "vitest";

import { buildNavTree } from "./nav-tree";

const t = (key: string) => key;

function hrefsOf(role: string, menuVisibility: Record<string, boolean> = {}) {
  const tree = buildNavTree({ role, menuVisibility, reviewCount: 0, t });
  return [
    ...tree.top.map((i) => i.href),
    ...tree.groups.flatMap((g) => g.items.map((i) => i.href)),
  ];
}

/**
 * What every role could reach before categories existed, copied out of the
 * flat `adminNav` / `studentNav` / `parentNav` arrays in sidebar.tsx.
 *
 * This is the whole point of the exercise: grouping decides order, never
 * access. If a rewrite quietly drops or adds an entry for some role, this is
 * what says so — long before a school notices a page it used to have.
 */
const REMOVED_WITH_JITSI = ["/admin/meetings", "/meetings", "/admin/recordings"];

const BEFORE: Record<string, string[]> = {
  super_admin: [
    "/admin",
    "/admin/users",
    "/admin/crm",
    "/admin/groups",
    "/admin/courses",
    "/admin/content-library",
    "/admin/assignments",
    "/admin/gradebook",
    "/admin/review",
    "/admin/peer-review",
    "/admin/team-projects",
    "/admin/journal",
    "/admin/recordings",
    "/admin/paths",
    "/admin/calendar",
    "/admin/meetings",
    "/admin/analytics",
    "/admin/organizations",
    "/admin/waitlist",
    "/admin/integrations",
    "/support",
    "/admin/settings",
  ],
  admin: [
    "/admin",
    "/admin/users",
    "/admin/crm",
    "/admin/groups",
    "/admin/courses",
    "/admin/content-library",
    "/admin/assignments",
    "/admin/gradebook",
    "/admin/review",
    "/admin/peer-review",
    "/admin/team-projects",
    "/admin/journal",
    "/admin/recordings",
    "/admin/paths",
    "/admin/calendar",
    "/admin/meetings",
    "/admin/analytics",
    "/admin/integrations",
    "/support",
    "/admin/settings",
  ],
  teacher: [
    "/admin",
    "/admin/groups",
    "/admin/courses",
    "/admin/content-library",
    "/admin/assignments",
    "/admin/gradebook",
    "/admin/review",
    "/admin/peer-review",
    "/admin/team-projects",
    "/admin/journal",
    "/admin/recordings",
    "/admin/calendar",
    "/admin/meetings",
    "/admin/analytics",
    "/support",
  ],
  student: [
    "/dashboard",
    "/courses",
    "/assignments",
    "/achievements",
    "/calendar",
    "/meetings",
    "/peer-review",
    "/team-projects",
    "/attendance",
    "/schedule",
  ],
  parent: ["/parent", "/parent/children"],
};

/**
 * Entries this feature adds on purpose. Kept separate from BEFORE so the
 * guarantee stays sharp: everything in BEFORE must still be reachable, and any
 * addition has to be written down here to pass — it cannot slip in unnoticed.
 */
const ADDED: Record<string, string[]> = {
  super_admin: ["/admin/live"],
  admin: ["/admin/live"],
  teacher: ["/admin/live"],
  student: ["/live"],
  parent: [],
};

describe("buildNavTree — nobody loses a page", () => {
  for (const [role, expected] of Object.entries(BEFORE)) {
    it(`gives ${role} what the flat menu gave, plus only what we meant to add`, () => {
      const want = [...expected, ...ADDED[role]].filter(
        (href) => !REMOVED_WITH_JITSI.includes(href),
      );
      expect(hrefsOf(role).sort()).toEqual(want.sort());
    });
  }

  it("counts 21 entries for a super admin, 19 for an admin, 14 for a teacher", () => {
    // Two Jitsi entries and the standalone recordings page left; one live
    // lessons entry arrived. Net: one fewer than the 22 we started with.
    expect(hrefsOf("super_admin")).toHaveLength(21);
    expect(hrefsOf("admin")).toHaveLength(19);
    expect(hrefsOf("teacher")).toHaveLength(14);
  });

  it("never lists the same page twice", () => {
    for (const role of Object.keys(BEFORE)) {
      const hrefs = hrefsOf(role);
      expect(new Set(hrefs).size).toBe(hrefs.length);
    }
  });
});

describe("buildNavTree — shape", () => {
  it("puts the dashboard above the categories, not inside one", () => {
    const tree = buildNavTree({
      role: "admin",
      menuVisibility: {},
      reviewCount: 0,
      t,
    });
    expect(tree.top.map((i) => i.href)).toEqual(["/admin"]);
    expect(tree.groups.map((g) => g.key)).toEqual([
      "learning",
      "people",
      "sessions",
      "progress",
      "school",
    ]);
  });

  it("leaves the student menu flat", () => {
    const tree = buildNavTree({
      role: "student",
      menuVisibility: {},
      reviewCount: 0,
      t,
    });
    expect(tree.groups).toEqual([]);
    expect(tree.top).toHaveLength(10);
  });

  it("keeps the biggest category readable", () => {
    const tree = buildNavTree({
      role: "super_admin",
      menuVisibility: {},
      reviewCount: 0,
      t,
    });
    const biggest = Math.max(...tree.groups.map((g) => g.items.length));
    expect(biggest).toBeLessThanOrEqual(8);
  });

  it("drops a category once the school has hidden everything in it", () => {
    // "Progress" holds the gradebook and analytics and nothing else, so a
    // school that hides both should not be left staring at an empty heading.
    const tree = buildNavTree({
      role: "admin",
      menuVisibility: { gradebook: false, analytics: false },
      reviewCount: 0,
      t,
    });
    expect(tree.groups.map((g) => g.key)).not.toContain("progress");
  });

  it("still honours the school's hidden-item settings", () => {
    expect(hrefsOf("admin", { crm: false })).not.toContain("/admin/crm");
    expect(hrefsOf("admin", { courses: false })).not.toContain("/admin/courses");
  });

  it("carries the review badge into the category that holds review", () => {
    const tree = buildNavTree({
      role: "teacher",
      menuVisibility: {},
      reviewCount: 3,
      t,
    });
    const review = tree.groups
      .flatMap((g) => g.items)
      .find((i) => i.href === "/admin/review");
    expect(review?.badge).toBe(3);
  });
});

describe("the support entry", () => {
  const support = (supportHref?: string | null) =>
    buildNavTree({ role: "admin", menuVisibility: {}, reviewCount: 0, supportHref, t })
      .groups.flatMap((g) => g.items)
      .find((i) => i.label === "nav.support");

  it("goes to our own page when the school gave no address", () => {
    expect(support()?.href).toBe("/support");
    expect(support()?.external).toBe(false);
  });

  it("goes to the school when it did", () => {
    expect(support("mailto:help@example.school")?.href).toBe("mailto:help@example.school");
    expect(support("https://example.school/help")?.external).toBe(true);
  });

  it("ignores a scheme that is not a way to reach anybody", () => {
    // Checked here as well as on save: this value comes back out of the
    // database, and a row could predate the validation.
    for (const hostile of ["javascript:alert(1)", "example.school/help", "http://example.school"]) {
      expect(support(hostile)?.href).toBe("/support");
    }
  });
});

describe("a pupil's menu obeys the same map", () => {
  // It did not. Every one of the sixteen visible() calls sat in the staff
  // branch, so a school switching off "Team projects" saw it vanish from its
  // own menu and kept believing pupils had lost it too. Six of a pupil's ten
  // entries carry a key; these are the two ends of that range.
  it("drops the entry the school switched off", () => {
    expect(hrefsOf("student", { team_projects: false })).not.toContain("/team-projects");
    expect(hrefsOf("student", { courses: false })).not.toContain("/courses");
  });

  it("touches nothing else", () => {
    const before = hrefsOf("student");
    const after = hrefsOf("student", { live: false });
    expect(after).toEqual(before.filter((href) => href !== "/live"));
  });

  it("leaves the entries with no key alone", () => {
    // A school cannot hide these, and a stray key must not start hiding them.
    const stripped = hrefsOf("student", {
      courses: false,
      assignments: false,
      calendar: false,
      live: false,
      peer_review: false,
      team_projects: false,
    });
    expect(stripped).toEqual(["/dashboard", "/achievements", "/attendance", "/schedule"]);
  });
});

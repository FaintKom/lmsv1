import { describe, it, expect } from "vitest";

import { buildNavTree, MENU_ITEM_KEYS } from "./nav-tree";

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
    // No "/admin/analytics": school-wide analytics names other teachers'
    // pupils, so it belongs to methodists and administrators. A class teacher
    // has the scoped "needs attention" block on their dashboard (specs/061).
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

  it("counts 21 entries for a super admin, 19 for an admin, 13 for a teacher", () => {
    // Two Jitsi entries and the standalone recordings page left; one live
    // lessons entry arrived. Net: one fewer than the 22 we started with.
    // The teacher lost a fourteenth on 2026-08-24: school-wide analytics
    // names other teachers' pupils and went to methodists (specs/061).
    expect(hrefsOf("super_admin")).toHaveLength(21);
    expect(hrefsOf("admin")).toHaveLength(19);
    expect(hrefsOf("teacher")).toHaveLength(13);
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

  it("gives a methodist the analytics a class teacher does not get", () => {
    const plain = buildNavTree({
      role: "teacher",
      menuVisibility: {},
      reviewCount: 0,
      t,
    });
    const methodist = buildNavTree({
      role: "teacher",
      menuVisibility: {},
      isMethodist: true,
      reviewCount: 0,
      t,
    });

    const hrefs = (tree: ReturnType<typeof buildNavTree>) => [
      ...tree.top.map((i) => i.href),
      ...tree.groups.flatMap((g) => g.items.map((i) => i.href)),
    ];

    // Positive control: the same role and the same school settings, so the
    // only difference between these two menus is the flag.
    expect(hrefs(methodist)).toContain("/admin/analytics");
    expect(hrefs(plain)).not.toContain("/admin/analytics");
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


describe("the settings list and the menu", () => {
  /**
   * Which keys the menu actually consults, recorded rather than listed.
   *
   * A third hand-written list would drift exactly as the second one did. This
   * one cannot go stale: the proxy answers `undefined` to everything, so every
   * entry stays visible and every branch gets evaluated, and it notes down what
   * was asked on the way through.
   */
  function keysAskedFor(): Set<string> {
    const asked = new Set<string>();
    const spy = new Proxy(
      {},
      {
        get(_target, prop) {
          if (typeof prop === "string") asked.add(prop);
          return undefined;
        },
      },
    ) as Record<string, boolean>;

    // Every role, not just the staff. `visible("crm")` sits behind
    // `isAdminOnly &&`, so a teacher never reaches it, and a super admin alone
    // would miss nothing but is not obviously enough on its own to rely on.
    //
    // A pupil is here because leaving them out is what let their branch consult
    // nothing at all: with no tree built there was nothing to record, and the
    // comparison agreed with itself in both directions while every pupil kept
    // seeing what their school had switched off.
    for (const role of ["super_admin", "admin", "teacher", "student", "parent"]) {
      buildNavTree({ role, menuVisibility: spy, reviewCount: 0, t });
    }
    return asked;
  }

  it("offers a switch for every entry the menu can hide", () => {
    const offered = MENU_ITEM_KEYS.map((i) => i.key).sort();
    expect([...keysAskedFor()].sort()).toEqual(offered);
  });

  it("offers no switch for anything the menu never asks about", () => {
    // The same comparison read the other way round, and the one that matters:
    // `meetings` outlived its menu entry here and reached production, where it
    // took a migration to remove.
    const asked = keysAskedFor();
    expect(MENU_ITEM_KEYS.map((i) => i.key).filter((k) => !asked.has(k))).toEqual([]);
  });

  it("honours the map in every role, not only where the gating was written", () => {
    /**
     * A key in the list is a promise: the entry it names can be switched off
     * by the school. This asserts the promise holds for everyone who sees that
     * entry — the part the two comparisons above cannot reach.
     *
     * They compare the *union* of keys asked across all roles against the list.
     * Take the gating out of one branch and the union does not move: the staff
     * branch still asks about all sixteen, so both stay green while that role
     * ignores every setting. It is how a pupil's menu came to show what their
     * school had hidden, and putting more roles in the loop above does not fix
     * it — that widens what gets recorded, not what gets enforced.
     *
     * Nothing here is hand-listed, so nothing goes stale. An entry the list
     * says nothing about is skipped: a school cannot hide a pupil's dashboard,
     * and this is not the place to decide whether it should be able to.
     */
    const keyOf = new Map(MENU_ITEM_KEYS.map((i) => [i.labelKey, i.key]));

    for (const role of ["super_admin", "admin", "teacher", "student", "parent"]) {
      const tree = buildNavTree({ role, menuVisibility: {}, reviewCount: 0, t });
      const shown = [...tree.top, ...tree.groups.flatMap((g) => g.items)];

      for (const entry of shown) {
        const key = keyOf.get(entry.label);
        if (!key) continue;
        expect(hrefsOf(role, { [key]: false }), `${role}: ${entry.label}`).not.toContain(
          entry.href,
        );
      }
    }
  });

  it("names each switch the way the menu names the entry", () => {
    const labels = new Set(
      buildNavTree({ role: "super_admin", menuVisibility: {}, reviewCount: 0, t })
        .groups.flatMap((g) => g.items)
        .map((i) => i.label),
    );
    for (const item of MENU_ITEM_KEYS) {
      expect(labels).toContain(item.labelKey);
    }
  });
});

describe("a pupil's menu obeys the same map", () => {
  /**
   * It did not, and the recorded-key test above could not tell.
   *
   * That test asks which keys the menu consults, but it only ever builds the
   * three staff trees — a pupil's branch consulted nothing at all, so there
   * was nothing to record and nothing to compare. Both directions agreed, and
   * a school switching off "Team projects" watched it vanish from its own menu
   * while every pupil kept it.
   *
   * These assertions are the other question: not which keys are asked, but
   * whether the answer reaches the person the setting was aimed at.
   */
  it("drops the entry the school switched off", () => {
    expect(hrefsOf("student", { team_projects: false })).not.toContain("/team-projects");
    expect(hrefsOf("student", { courses: false })).not.toContain("/courses");
  });

  it("touches nothing else", () => {
    const before = hrefsOf("student");
    expect(hrefsOf("student", { live: false })).toEqual(before.filter((h) => h !== "/live"));
  });

  it("leaves the entries with no key alone", () => {
    // A school cannot hide these four, and a stray key must not start hiding
    // them. Everything the pupil's menu does guard is switched off here.
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

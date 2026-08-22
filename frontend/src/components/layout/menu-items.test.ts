import { describe, expect, it } from "vitest";

import { HIDEABLE_ITEMS, hideEverything } from "./menu-items";
import { buildNavTree } from "./nav-tree";

/**
 * The list and the menu must not drift apart.
 *
 * They already have, twice. The settings form offered ten switches while the
 * menu asked about sixteen; separately, a key for a deleted feature sat in
 * every school's settings for months. Both survived because every test asked
 * about particular items, and nothing asked whether the two halves agreed.
 *
 * A. catches a key in the list that the menu never asks about — a switch that
 * does nothing. B. catches an entry the menu guards but the list forgot.
 * Neither names today's items, so neither goes stale when items are added.
 */

const t = (key: string) => key;

/** Every role with a menu of its own. */
const ROLES = ["super_admin", "admin", "teacher", "student", "parent"];

function hrefsOf(role: string, menuVisibility: Record<string, boolean> = {}) {
  const tree = buildNavTree({ role, menuVisibility, reviewCount: 0, t });
  return [
    ...tree.top.map((i) => i.href),
    ...tree.groups.flatMap((g) => g.items.map((i) => i.href)),
  ];
}

/**
 * What survives with every hideable item switched off.
 *
 * These entries have no visibility key at all: a school cannot hide them, by
 * omission or by design. Whether it should be able to is a separate question
 * (specs/040 leaves waitlist, organizations and integrations alone). The point
 * of writing them out is that a seventeenth guarded item added without a list
 * entry makes this wrong and the test red.
 *
 * A parent sees two entries and neither is keyed, so there is nothing for a
 * school to hide from a parent — that row is green today and stays green.
 */
const UNHIDEABLE: Record<string, string[]> = {
  super_admin: [
    "/admin",
    "/admin/waitlist",
    "/admin/organizations",
    "/admin/integrations",
    "/admin/settings",
  ],
  admin: ["/admin", "/admin/integrations", "/admin/settings"],
  teacher: ["/admin"],
  student: ["/dashboard", "/achievements", "/attendance", "/schedule"],
  parent: ["/parent", "/parent/children"],
};

describe("the list itself", () => {
  it("names every key once", () => {
    const keys = HIDEABLE_ITEMS.map((i) => i.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("borrows the menu's strings rather than keeping its own", () => {
    // A second string for the same item drifts, and drifts quietly.
    for (const item of HIDEABLE_ITEMS) {
      expect(item.labelKey, item.key).toMatch(/^nav\./);
    }
  });
});

describe("A. every key in the list switches something off", () => {
  for (const item of HIDEABLE_ITEMS) {
    it(`${item.key} removes exactly one entry from some role's menu`, () => {
      const removedSomewhere = ROLES.some((role) => {
        const before = hrefsOf(role);
        const after = hrefsOf(role, { [item.key]: false });
        return after.length === before.length - 1;
      });
      expect(removedSomewhere).toBe(true);
    });
  }
});

describe("B. the menu shows nothing the list cannot switch off", () => {
  // The one that was missing. A pupil's menu never consulted the map at all,
  // so six of their entries carried a key nobody's switch could reach.
  for (const role of ROLES) {
    it(`${role}: hiding everything leaves only the entries with no key`, () => {
      expect(hrefsOf(role, hideEverything()).sort()).toEqual([...UNHIDEABLE[role]].sort());
    });
  }
});

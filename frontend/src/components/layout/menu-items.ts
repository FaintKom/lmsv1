/**
 * Everything a school is allowed to hide from its menu.
 *
 * One list. It used to be two — the sidebar asked about sixteen keys while the
 * settings form offered ten — and the six in between could not be switched off
 * from anywhere. Nothing caught it: both halves were internally consistent and
 * neither knew about the other.
 *
 * `labelKey` points at the menu's own string rather than a second copy. Two
 * strings for one item drift, and drift quietly: the menu would say one thing
 * and its switch another.
 *
 * Items with no key belong nowhere near this list — the dashboard, a pupil's
 * achievements, and the entries guarded only by role. A school cannot hide
 * those, and whether it should be able to is a separate question.
 */

/** The categories the sidebar already groups by, in the order it shows them. */
export const MENU_GROUPS = ["learning", "people", "sessions", "progress", "school"] as const;

export type MenuGroup = (typeof MENU_GROUPS)[number];

export interface HideableItem {
  /** The key in the school's visibility map. */
  key: string;
  /** The menu's own translation key. Never a second string for the same item. */
  labelKey: string;
  group: MenuGroup;
  /** Shown to admins only, whatever the school decides about visibility. */
  adminOnly: boolean;
}

/**
 * Declaration order is display order, and it matches the menu because it comes
 * from the same reading of it. Reordering this changes what an administrator
 * sees, so it is not a free edit.
 */
export const HIDEABLE_ITEMS: HideableItem[] = [
  { key: "courses", labelKey: "nav.courses", group: "learning", adminOnly: false },
  { key: "content_library", labelKey: "nav.contentLibrary", group: "learning", adminOnly: false },
  { key: "assignments", labelKey: "nav.assignments", group: "learning", adminOnly: false },
  { key: "review", labelKey: "nav.review", group: "learning", adminOnly: false },
  { key: "peer_review", labelKey: "nav.peerReview", group: "learning", adminOnly: false },
  { key: "team_projects", labelKey: "nav.teamProjects", group: "learning", adminOnly: false },
  { key: "paths", labelKey: "nav.paths", group: "learning", adminOnly: true },
  { key: "users", labelKey: "nav.users", group: "people", adminOnly: true },
  { key: "crm", labelKey: "nav.crm", group: "people", adminOnly: true },
  { key: "groups", labelKey: "nav.groups", group: "people", adminOnly: false },
  { key: "live", labelKey: "nav.liveLessons", group: "sessions", adminOnly: false },
  { key: "journal", labelKey: "nav.journal", group: "sessions", adminOnly: false },
  { key: "calendar", labelKey: "nav.calendar", group: "sessions", adminOnly: false },
  { key: "gradebook", labelKey: "nav.gradebook", group: "progress", adminOnly: false },
  { key: "analytics", labelKey: "nav.analytics", group: "progress", adminOnly: false },
  { key: "support", labelKey: "nav.support", group: "school", adminOnly: false },
];

/** A map that hides everything this list knows about. Used by the guard test. */
export function hideEverything(): Record<string, boolean> {
  return Object.fromEntries(HIDEABLE_ITEMS.map((item) => [item.key, false]));
}

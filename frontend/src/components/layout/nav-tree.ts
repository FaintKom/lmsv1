import {
  BarChart3,
  BookOpen,
  BookOpenCheck,
  Building2,
  Calendar,
  CalendarCheck,
  CalendarClock,
  ClipboardList,
  Contact,
  FolderKanban,
  Heart,
  Inbox,
  LayoutDashboard,
  Library,
  Mail,
  MessagesSquare,
  Plug,
  Radio,
  Route,
  Settings,
  Table2,
  Trophy,
  Users,
  UsersRound,
} from "lucide-react";

/**
 * Who sees which menu entry, and in which category.
 *
 * Lifted out of sidebar.tsx so it can be tested without rendering anything.
 * The permission conditions are the same expressions they always were — this
 * file adds one level of nesting and changes nothing about access. There is a
 * test that compares every role's entries against the old flat list for
 * exactly that reason.
 */

export type NavIcon = typeof LayoutDashboard;

export interface NavItem {
  href: string;
  label: string;
  icon: NavIcon;
  badge?: number;
  /** Leaves the app: render an <a>, not a <Link>, and do not mark it active. */
  external?: boolean;
}

/**
 * A school's own support address, if it gave one.
 *
 * Only https: and mailto: are honoured. The check lives here as well as at the
 * point of saving, deliberately: this value comes back out of the database, and
 * a row could have been written before the validation existed.
 */
export function supportLink(raw: string | null | undefined): string | null {
  const value = (raw || "").trim();
  if (!value) return null;
  const lower = value.toLowerCase();
  return lower.startsWith("https://") || lower.startsWith("mailto:") ? value : null;
}

export interface NavGroup {
  key: string;
  label: string;
  items: NavItem[];
}

export interface NavTree {
  /** Entries that sit above the categories. */
  top: NavItem[];
  /** Empty for pupils and parents, whose menus are short enough already. */
  groups: NavGroup[];
}

export interface NavTreeInput {
  role: string | undefined;
  /** The school's hidden-item settings. A missing key means "show it". */
  menuVisibility: Record<string, boolean>;
  /**
   * A methodist carries role "teacher" and sees the school anyway. Without
   * this the analytics gate cannot tell them from a class teacher, and one of
   * the two ends up with the wrong menu (specs/061).
   */
  isMethodist?: boolean;
  reviewCount: number;
  /** Where "Support" should go. Empty or unusable falls back to our own page. */
  supportHref?: string | null;
  t: (key: string) => string;
}

/**
 * Which menu entries a school may hide, in the order the menu shows them.
 *
 * Declared here rather than beside the settings form on purpose. A key exists
 * because `buildNavTree` below asks the visibility map about it; the form is
 * the consumer, writing answers to questions this file asks. Kept next to the
 * form, the list fell behind the tree — `meetings` outlived its menu entry all
 * the way into production and needed a migration to remove.
 *
 * Two lists is still two lists. What stops them drifting is the test that
 * records every key `buildNavTree` actually asks about and compares it with
 * this one, in both directions.
 *
 * Labels are the menu's own `nav.*` strings: a toggle that hides an entry
 * should read exactly as the entry reads. A second set of labels bought
 * nothing but the chance to disagree, and it had already taken it.
 *
 * Entries gated on role alone — Organizations, Waitlist, Integrations,
 * Settings — never consult the map, so there is nothing here to switch off.
 */
export const MENU_ITEM_KEYS: {
  key: string;
  labelKey: string;
  adminOnly: boolean;
  /** Раздел меню, в котором пункт стоит.
   *
   *  Был комментарием — то есть существовал для читателя файла и не
   *  существовал для экрана настроек, который рисовал шестнадцать строк
   *  подряд там, где меню рисует пять озаглавленных разделов (specs/045).
   *  Значения те же, что у групп в `buildNavTree` ниже, и тест сверяет их
   *  состав и порядок. */
  group: string;
}[] = [
  { key: "courses", labelKey: "nav.courses", adminOnly: false, group: "learning" },
  { key: "content_library", labelKey: "nav.contentLibrary", adminOnly: false, group: "learning" },
  { key: "assignments", labelKey: "nav.assignments", adminOnly: false, group: "learning" },
  { key: "review", labelKey: "nav.review", adminOnly: false, group: "learning" },
  { key: "peer_review", labelKey: "nav.peerReview", adminOnly: false, group: "learning" },
  { key: "team_projects", labelKey: "nav.teamProjects", adminOnly: false, group: "learning" },
  { key: "paths", labelKey: "nav.paths", adminOnly: true, group: "learning" },
  { key: "users", labelKey: "nav.users", adminOnly: true, group: "people" },
  { key: "crm", labelKey: "nav.crm", adminOnly: true, group: "people" },
  { key: "groups", labelKey: "nav.groups", adminOnly: false, group: "people" },
  { key: "live", labelKey: "nav.liveLessons", adminOnly: false, group: "sessions" },
  { key: "journal", labelKey: "nav.journal", adminOnly: false, group: "sessions" },
  { key: "calendar", labelKey: "nav.calendar", adminOnly: false, group: "sessions" },
  { key: "gradebook", labelKey: "nav.gradebook", adminOnly: false, group: "progress" },
  { key: "analytics", labelKey: "nav.analytics", adminOnly: false, group: "progress" },
  { key: "support", labelKey: "nav.support", adminOnly: false, group: "school" },
];

export function buildNavTree({
  role,
  menuVisibility,
  isMethodist,
  supportHref,
  reviewCount,
  t,
}: NavTreeInput): NavTree {
  const isAdminOrTeacher =
    role === "super_admin" || role === "admin" || role === "teacher";
  const isAdminOnly = role === "super_admin" || role === "admin";
  // Mirrors the backend's _is_org_wide: sees the school, not just their own.
  const isOrgWide = isAdminOnly || Boolean(isMethodist);
  const isSuperAdmin = role === "super_admin";
  const isParent = role === "parent";
  const visible = (key: string) => menuVisibility[key] !== false;

  if (isParent) {
    // Nothing here answers to the school's map, because neither entry has a
    // visibility key. A visible() call would be one that can never change
    // anything — the map reaches a parent the moment some entry earns a key.
    return {
      top: [
        { href: "/parent", label: t("nav.dashboard"), icon: LayoutDashboard },
        { href: "/parent/children", label: t("nav.children"), icon: Users },
      ],
      groups: [],
    };
  }

  if (!isAdminOrTeacher) {
    // Ten entries and no role gates. Categories solve length, and a pupil
    // does not have the problem — nor would "People" or "School" mean anything
    // to one. Flat it stays.
    //
    // Six of the ten answer to the school's map. They did not until now: every
    // visible() call sat in the staff branch below, so switching an entry off
    // removed it from the office's menu and left it on every pupil's. The
    // school had no way to learn that, and the switch said otherwise.
    //
    // The other four carry no key. A school cannot hide a pupil's dashboard,
    // and whether it should be able to is a separate question.
    return {
      top: [
        { href: "/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
        ...(visible("courses")
          ? [{ href: "/courses", label: t("nav.courses"), icon: BookOpen }]
          : []),
        ...(visible("assignments")
          ? [{ href: "/assignments", label: t("nav.assignments"), icon: ClipboardList }]
          : []),
        // My room + My avatar live as tabs inside /achievements now.
        { href: "/achievements", label: t("nav.achievements"), icon: Trophy },
        ...(visible("calendar")
          ? [{ href: "/calendar", label: t("nav.calendar"), icon: Calendar }]
          : []),
        ...(visible("live")
          ? [{ href: "/live", label: t("nav.liveLessons"), icon: Radio }]
          : []),
        ...(visible("peer_review")
          ? [{ href: "/peer-review", label: t("nav.peerReview"), icon: MessagesSquare }]
          : []),
        ...(visible("team_projects")
          ? [{ href: "/team-projects", label: t("nav.teamProjects"), icon: FolderKanban }]
          : []),
        { href: "/attendance", label: t("nav.attendance"), icon: CalendarCheck },
        { href: "/schedule", label: t("nav.schedule"), icon: CalendarClock },
      ],
      groups: [],
    };
  }

  const groups: NavGroup[] = [
    {
      key: "learning",
      label: t("nav.group.learning"),
      items: [
        ...(visible("courses")
          ? [{ href: "/admin/courses", label: t("nav.courses"), icon: BookOpen }]
          : []),
        ...(visible("content_library")
          ? [{ href: "/admin/content-library", label: t("nav.contentLibrary"), icon: Library }]
          : []),
        ...(visible("assignments")
          ? [{ href: "/admin/assignments", label: t("nav.assignments"), icon: ClipboardList }]
          : []),
        ...(visible("review")
          ? [{ href: "/admin/review", label: t("nav.review"), icon: Inbox, badge: reviewCount }]
          : []),
        ...(visible("peer_review")
          ? [{ href: "/admin/peer-review", label: t("nav.peerReview"), icon: MessagesSquare }]
          : []),
        ...(visible("team_projects")
          ? [{ href: "/admin/team-projects", label: t("nav.teamProjects"), icon: FolderKanban }]
          : []),
        ...(isAdminOnly && visible("paths")
          ? [{ href: "/admin/paths", label: t("nav.paths"), icon: Route }]
          : []),
      ],
    },
    {
      key: "people",
      label: t("nav.group.people"),
      items: [
        ...(isAdminOnly && visible("users")
          ? [{ href: "/admin/users", label: t("nav.users"), icon: Users }]
          : []),
        // Admin-only: the enquiry pipeline is the office's business, and the
        // endpoints refuse teachers anyway.
        ...(isAdminOnly && visible("crm")
          ? [{ href: "/admin/crm", label: t("nav.crm"), icon: Contact }]
          : []),
        ...(visible("groups")
          ? [{ href: "/admin/groups", label: t("nav.groups"), icon: UsersRound }]
          : []),
        ...(isSuperAdmin
          ? [{ href: "/admin/waitlist", label: t("nav.waitlist"), icon: Mail }]
          : []),
      ],
    },
    {
      key: "sessions",
      label: t("nav.group.sessions"),
      items: [
        // Schedule + Attendance are folded into the unified Journal module
        // (Today / Register / Rooms / Setup tabs); their standalone nav links
        // were removed.
        ...(visible("live")
          ? [{ href: "/admin/live", label: t("nav.liveLessons"), icon: Radio }]
          : []),
        ...(visible("journal")
          ? [{ href: "/admin/journal", label: t("nav.journal"), icon: BookOpenCheck }]
          : []),
        ...(visible("calendar")
          ? [{ href: "/admin/calendar", label: t("nav.calendar"), icon: Calendar }]
          : []),
      ],
    },
    {
      key: "progress",
      label: t("nav.group.progress"),
      items: [
        ...(visible("gradebook")
          ? [{ href: "/admin/gradebook", label: t("nav.gradebook"), icon: Table2 }]
          : []),
        // School-wide analytics is a methodist's and an administrator's
        // instrument: it names other teachers' pupils. A class teacher has
        // their own, scoped view of who is slipping, on their dashboard
        // (specs/061). The API refuses them either way — this keeps them from
        // clicking into the refusal.
        ...(visible("analytics") && isOrgWide
          ? [{ href: "/admin/analytics", label: t("nav.analytics"), icon: BarChart3 }]
          : []),
      ],
    },
    {
      key: "school",
      label: t("nav.group.school"),
      items: [
        ...(isSuperAdmin
          ? [{ href: "/admin/organizations", label: t("nav.organizations"), icon: Building2 }]
          : []),
        ...(isAdminOnly
          ? [{ href: "/admin/integrations", label: t("nav.integrations"), icon: Plug }]
          : []),
        ...(visible("support")
          ? [
              {
                href: supportLink(supportHref) ?? "/support",
                label: t("nav.support"),
                icon: Heart,
                external: supportLink(supportHref) !== null,
              },
            ]
          : []),
        ...(isAdminOnly
          ? [{ href: "/admin/settings", label: t("nav.settings"), icon: Settings }]
          : []),
      ],
    },
  ];

  return {
    top: [{ href: "/admin", label: t("nav.dashboard"), icon: LayoutDashboard }],
    // A heading with nothing under it is worse than no heading: FR-010 falls
    // straight out of the length check, with no branch of its own.
    groups: groups.filter((g) => g.items.length > 0),
  };
}

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
  reviewCount: number;
  /** Where "Support" should go. Empty or unusable falls back to our own page. */
  supportHref?: string | null;
  t: (key: string) => string;
}

export function buildNavTree({
  role,
  menuVisibility,
  supportHref,
  reviewCount,
  t,
}: NavTreeInput): NavTree {
  const isAdminOrTeacher =
    role === "super_admin" || role === "admin" || role === "teacher";
  const isAdminOnly = role === "super_admin" || role === "admin";
  const isSuperAdmin = role === "super_admin";
  const isParent = role === "parent";
  const visible = (key: string) => menuVisibility[key] !== false;

  if (isParent) {
    // Nothing here answers to the school's map, because neither entry has a
    // visibility key. A visible() call would be a call that can never change
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
    // Six of the ten answer to the school's map. They did not until specs/040:
    // every visible() call sat in the staff branch below, so switching an item
    // off removed it from the office's menu and left it on every pupil's.
    // The remaining four have no key at all — a school cannot hide a pupil's
    // dashboard, and whether it should be able to is a separate question.
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
        ...(visible("analytics")
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

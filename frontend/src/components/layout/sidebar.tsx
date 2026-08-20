"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useTranslation } from "@/lib/i18n/context";
import apiClient from "@/lib/api-client";
import {
 BookOpen,
 ClipboardList,
 BarChart3,
 Users,
 UsersRound,
 CreditCard,
 LogOut,
 LayoutDashboard,
 Trophy,
 Table2,
 Inbox,
 Route,
 Calendar,
 Video,
 Building2,
 Settings,
 Library,
 Plug,
 Heart,
 MessagesSquare,
 FolderKanban,
 CalendarCheck,
 CalendarClock,
 BookOpenCheck,
  Film,
 Mail,
 Contact,
} from "lucide-react";
import { NotificationBell } from "./notification-bell";
import { OrgSwitcher } from "./org-switcher";
import { SearchBar } from "./search-bar";
import LocaleSwitcher from "./locale-switcher";

interface SidebarProps {
 open?: boolean;
 onClose?: () => void;
 onCollapse?: () => void;
}

export function Sidebar({ open, onClose, onCollapse }: SidebarProps) {
 const pathname = usePathname();
 const router = useRouter();
 const user = useAuthStore((s) => s.user);
 const branding = useAuthStore((s) => s.branding);
 const logout = useAuthStore((s) => s.logout);
 const { t } = useTranslation();

 const isAdminOrTeacher = user?.role === "super_admin" || user?.role === "admin" || user?.role === "teacher";
 const isAdminOnly = user?.role === "super_admin" || user?.role === "admin";
 const isSuperAdmin = user?.role === "super_admin";
 const isParent = user?.role === "parent";
 const [reviewCount, setReviewCount] = useState(0);

 useEffect(() => {
 if (!isAdminOrTeacher) return;
 apiClient.get("/admin/review-queue/count").then(({ data }) => setReviewCount(data.count)).catch(() => {});
 const interval = setInterval(() => {
 apiClient.get("/admin/review-queue/count").then(({ data }) => setReviewCount(data.count)).catch(() => {});
 }, 60000);
 return () => clearInterval(interval);
 }, [isAdminOrTeacher]);

 // Comes with the session, next to the logo and the school name. The
 // settings endpoint it used to be fetched from is admin-only, so a teacher
 // got an empty map and saw every item the school had hidden (specs/034).
 const isMenuVisible = (key: string) => branding.menu_visibility?.[key] !== false;

 const studentNav: { href: string; label: string; icon: typeof LayoutDashboard; badge?: number }[] = [
 { href: "/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
 { href: "/courses", label: t("nav.courses"), icon: BookOpen },
 { href: "/assignments", label: t("nav.assignments"), icon: ClipboardList },
 // My room + My avatar live as tabs inside /achievements now.
 { href: "/achievements", label: t("nav.achievements"), icon: Trophy },
 { href: "/calendar", label: t("nav.calendar"), icon: Calendar },
 { href: "/meetings", label: t("nav.meetings"), icon: Video },
 { href: "/peer-review", label: t("nav.peerReview"), icon: MessagesSquare },
 { href: "/team-projects", label: t("nav.teamProjects"), icon: FolderKanban },
 { href: "/attendance", label: t("nav.attendance"), icon: CalendarCheck },
 { href: "/schedule", label: t("nav.schedule"), icon: CalendarClock },
 ];

 const adminNav: { href: string; label: string; icon: typeof LayoutDashboard; badge?: number }[] = [
 { href: "/admin", label: t("nav.dashboard"), icon: LayoutDashboard },
 ...(isAdminOnly && isMenuVisible("users") ? [{ href: "/admin/users", label: t("nav.users"), icon: Users }] : []),
 // Admin-only: the enquiry pipeline is the office's business, and the
 // endpoints refuse teachers anyway.
 ...(isAdminOnly && isMenuVisible("crm") ? [{ href: "/admin/crm", label: t("nav.crm"), icon: Contact }] : []),
 ...(isMenuVisible("groups") ? [{ href: "/admin/groups", label: t("nav.groups"), icon: UsersRound }] : []),
 ...(isMenuVisible("courses") ? [{ href: "/admin/courses", label: t("nav.courses"), icon: BookOpen }] : []),
 ...(isMenuVisible("content_library") ? [{ href: "/admin/content-library", label: t("nav.contentLibrary"), icon: Library }] : []),
 ...(isMenuVisible("assignments") ? [{ href: "/admin/assignments", label: t("nav.assignments"), icon: ClipboardList }] : []),
 ...(isMenuVisible("gradebook") ? [{ href: "/admin/gradebook", label: t("nav.gradebook"), icon: Table2 }] : []),
 ...(isMenuVisible("review") ? [{ href: "/admin/review", label: t("nav.review"), icon: Inbox, badge: reviewCount }] : []),
 ...(isMenuVisible("peer_review") ? [{ href: "/admin/peer-review", label: t("nav.peerReview"), icon: MessagesSquare }] : []),
 ...(isMenuVisible("team_projects") ? [{ href: "/admin/team-projects", label: t("nav.teamProjects"), icon: FolderKanban }] : []),
 // Schedule + Attendance are folded into the unified Journal module (Today /
 // Register / Rooms / Setup tabs); their standalone nav links were removed.
 ...(isMenuVisible("journal") ? [{ href: "/admin/journal", label: t("nav.journal"), icon: BookOpenCheck }] : []),
 ...(isMenuVisible("recordings") ? [{ href: "/admin/recordings", label: t("nav.recordings"), icon: Film }] : []),
 ...(isAdminOnly && isMenuVisible("paths") ? [{ href: "/admin/paths", label: t("nav.paths"), icon: Route }] : []),
 ...(isMenuVisible("calendar") ? [{ href: "/admin/calendar", label: t("nav.calendar") || "Calendar", icon: Calendar }] : []),
 ...(isMenuVisible("meetings") ? [{ href: "/admin/meetings", label: t("nav.meetings") || "Meetings", icon: Video }] : []),
 ...(isMenuVisible("analytics") ? [{ href: "/admin/analytics", label: t("nav.analytics"), icon: BarChart3 }] : []),
 ...(isSuperAdmin ? [{ href: "/admin/organizations", label: t("nav.organizations"), icon: Building2 }] : []),
 ...(isSuperAdmin ? [{ href: "/admin/waitlist", label: t("nav.waitlist"), icon: Mail }] : []),
 ...(isAdminOnly ? [{ href: "/admin/integrations", label: t("nav.integrations"), icon: Plug }] : []),
 ...(isMenuVisible("support") ? [{ href: "/support", label: t("nav.support"), icon: Heart }] : []),
 ...(isAdminOnly ? [{ href: "/admin/settings", label: t("nav.settings"), icon: Settings }] : []),
 ];

 const parentNav: { href: string; label: string; icon: typeof LayoutDashboard; badge?: number }[] = [
 { href: "/parent", label: t("nav.dashboard") || "Dashboard", icon: LayoutDashboard },
 { href: "/parent/children", label: t("nav.children") || "My Children", icon: Users },
 ];

 const nav = isParent ? parentNav : isAdminOrTeacher ? adminNav : studentNav;

 const handleLogout = () => {
 logout();
 router.push("/login");
 };

 return (
 <>
 {open && (
 <div
 // Above the mobile tab bar (z-50), which otherwise keeps taking taps
 // through the dimmed backdrop.
 className="fixed inset-0 z-[55] bg-ink-900/60 md:hidden"
 onClick={onClose}
 aria-hidden="true"
 />
 )}
 <aside
 className={cn(
 // h-dvh, not h-screen: on a phone 100vh is taller than what you can see,
 // because the browser's address bar overlays the bottom of it. The footer
 // holds the account link and Sign Out, so those were the parts that ended
 // up underneath it — the sidebar opened and you still could not log out.
 // z-[60] puts the drawer above the mobile tab bar (z-50). At equal
 // layers the tab bar won on DOM order and swallowed taps aimed at the
 // footer — which is where the account link and Sign Out live, so the
 // drawer opened and logging out still did nothing.
 "rail-dark fixed inset-y-0 left-0 z-[60] flex h-dvh w-[240px] flex-col bg-ink-900 transition-transform duration-200 ease-in-out md:static md:h-screen md:translate-x-0",
 open ? "translate-x-0" : "-translate-x-full"
 )}
 >
 {/* Logo */}
 <div className="flex items-center gap-2.5 border-b border-white/[0.08] px-4 pb-[18px] pt-[18px]">
 {branding.logo_url ? (
 <img
 src={branding.logo_url}
 alt={branding.display_name}
 className="h-8 w-8 rounded-sm object-cover"
 />
 ) : (
 <div className="relative flex h-8 w-8 items-center justify-center rounded-sm bg-green-500 text-lg font-extrabold text-white">
 g
 <span className="absolute bottom-[4px] right-[5px] h-[5px] w-[5px] rounded-full bg-sun-400" />
 </div>
 )}
 <div>
 <span className="text-base font-extrabold tracking-tight text-white">
 {branding.display_name}
 </span>
 <span className="block font-mono text-3xs font-medium uppercase tracking-widest text-white/50">
 Learning Platform
 </span>
 </div>
 </div>

 {/* Search — admin only */}
 {isAdminOnly && (
 <div className="border-b border-white/[0.08] px-3 py-3">
 <SearchBar />
 </div>
 )}

 {/* Navigation */}
 <nav aria-label="Main navigation" className="flex-1 overflow-y-auto px-4 py-3">
 <p className="mb-1.5 px-2.5 font-mono text-3xs font-medium uppercase tracking-widest text-white/50">
 {t("nav.menu")}
 </p>
 <ul className="space-y-[2px]" role="list">
 {nav.map((item) => {
 // Exact match for items that have nested specialised siblings
 // (e.g. /admin/analytics + /admin/analytics/v2). Otherwise a parent
 // entry highlights when the user is actually on a child route.
 const hasSpecialisedChild = nav.some(
 (other) => other.href !== item.href && other.href.startsWith(item.href + "/"),
 );
 const isActive =
 pathname === item.href ||
 (!hasSpecialisedChild &&
 item.href !== "/admin" &&
 item.href !== "/dashboard" &&
 pathname.startsWith(item.href));
 const tourAnchor = ({
 "/admin": "sidebar-dashboard",
 "/dashboard": "sidebar-dashboard",
 "/admin/courses": "sidebar-courses",
 "/admin/content-library": "sidebar-content-library",
 "/admin/gradebook": "sidebar-gradebook",
 "/admin/users": "sidebar-users",
 "/admin/groups": "sidebar-groups",
 "/admin/billing": "sidebar-billing",
 "/support": "sidebar-support",
 } as Record<string, string>)[item.href];
 return (
 <li key={item.href}>
 <Link
 href={item.href}
 onClick={onClose}
 aria-current={isActive ? "page" : undefined}
 data-tour={tourAnchor}
 className={cn(
 "flex items-center gap-[11px] rounded-sm px-[10px] py-[9px] text-sm font-semibold transition-colors duration-150",
 // v2 rail rule: active = reward on a sun tint — green disappears
 // on the dark rail
 isActive
 ? "bg-reward/16 text-reward"
 : "text-white/65 hover:bg-white/[0.05] hover:text-white"
 )}
 >
 <item.icon className="h-[18px] w-[18px]" aria-hidden="true" />
 {item.label}
 {/* clay-600, not clay-500: white on clay-500 is 3.77:1 and fails AA in
     both themes. clay-600 reads the same and clears it at 5.23:1. */}
 {item.badge ? (
 <span className="ml-auto rounded-pill bg-clay-600 px-1.5 py-0.5 font-mono text-3xs font-extrabold leading-none text-white">
 {item.badge > 99 ? "99+" : item.badge}
 </span>
 ) : null}
 </Link>
 </li>
 );
 })}
 </ul>
 </nav>

 {/* Footer */}
 <div className="border-t border-white/[0.08] p-3">
 <OrgSwitcher />
 <div className="mb-1 flex items-center justify-between px-1">
 <LocaleSwitcher />
 <NotificationBell />
 </div>
 <Link
 href="/profile"
 className="mb-1 flex items-center gap-[10px] rounded-sm px-2.5 py-2 transition-colors hover:bg-white/[0.05]"
 >
 <div className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-green-400 text-sm font-extrabold text-ink-900">
 {user?.full_name?.charAt(0)?.toUpperCase() || "?"}
 </div>
 <div className="min-w-0 flex-1">
 <p className="truncate text-sm font-bold text-white">
 {user?.full_name}
 </p>
 <p className="truncate font-mono text-3xs tracking-wide text-white/50">
 {user?.email}
 </p>
 </div>
 </Link>
 <button
 onClick={handleLogout}
 className="flex w-full cursor-pointer items-center gap-[11px] rounded-sm px-[10px] py-[9px] text-sm font-semibold text-white/50 transition-colors hover:bg-white/[0.05] hover:text-white/80"
 >
 <LogOut className="h-[18px] w-[18px]" />
 {t("nav.signOut")}
 </button>
 </div>
 </aside>
 </>
 );
}

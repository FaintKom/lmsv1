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
 Calculator,
 Plug,
 Heart,
 MessagesSquare,
 FolderKanban,
 CalendarCheck,
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
 const [menuVisibility, setMenuVisibility] = useState<Record<string, boolean>>({});

 useEffect(() => {
 if (!isAdminOrTeacher) return;
 apiClient.get("/admin/review-queue/count").then(({ data }) => setReviewCount(data.count)).catch(() => {});
 const interval = setInterval(() => {
 apiClient.get("/admin/review-queue/count").then(({ data }) => setReviewCount(data.count)).catch(() => {});
 }, 60000);
 return () => clearInterval(interval);
 }, [isAdminOrTeacher]);

 useEffect(() => {
 if (!isAdminOnly || !user?.org_id) return;
 apiClient
 .get(`/admin/organizations/${user.org_id}`)
 .then(({ data }) => {
 setMenuVisibility(data.settings?.menu_visibility || {});
 })
 .catch(() => {});
 }, [isAdminOnly, user?.org_id]);

 const isMenuVisible = (key: string) => menuVisibility[key] !== false;

 const studentNav: { href: string; label: string; icon: typeof LayoutDashboard; badge?: number }[] = [
 { href: "/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
 { href: "/courses", label: t("nav.courses"), icon: BookOpen },
 { href: "/sat-practice", label: "SAT Practice", icon: Calculator },
 { href: "/assignments", label: t("nav.assignments"), icon: ClipboardList },
 // My room + My avatar live as tabs inside /achievements now.
 { href: "/achievements", label: t("nav.achievements"), icon: Trophy },
 { href: "/calendar", label: t("nav.calendar"), icon: Calendar },
 { href: "/meetings", label: t("nav.meetings"), icon: Video },
 { href: "/peer-review", label: t("nav.peerReview"), icon: MessagesSquare },
 { href: "/team-projects", label: t("nav.teamProjects"), icon: FolderKanban },
 { href: "/attendance", label: t("nav.attendance"), icon: CalendarCheck },
 ];

 const adminNav: { href: string; label: string; icon: typeof LayoutDashboard; badge?: number }[] = [
 { href: "/admin", label: t("nav.dashboard"), icon: LayoutDashboard },
 ...(isAdminOnly && isMenuVisible("users") ? [{ href: "/admin/users", label: t("nav.users"), icon: Users }] : []),
 ...(isMenuVisible("groups") ? [{ href: "/admin/groups", label: t("nav.groups"), icon: UsersRound }] : []),
 ...(isMenuVisible("courses") ? [{ href: "/admin/courses", label: t("nav.courses"), icon: BookOpen }] : []),
 ...(isMenuVisible("content_library") ? [{ href: "/admin/content-library", label: t("nav.contentLibrary"), icon: Library }] : []),
 ...(isMenuVisible("assignments") ? [{ href: "/admin/assignments", label: t("nav.assignments"), icon: ClipboardList }] : []),
 ...(isMenuVisible("gradebook") ? [{ href: "/admin/gradebook", label: t("nav.gradebook"), icon: Table2 }] : []),
 ...(isMenuVisible("review") ? [{ href: "/admin/review", label: t("nav.review"), icon: Inbox, badge: reviewCount }] : []),
 ...(isMenuVisible("peer_review") ? [{ href: "/admin/peer-review", label: t("nav.peerReview"), icon: MessagesSquare }] : []),
 ...(isMenuVisible("team_projects") ? [{ href: "/admin/team-projects", label: t("nav.teamProjects"), icon: FolderKanban }] : []),
 ...(isMenuVisible("attendance") ? [{ href: "/admin/attendance", label: t("nav.attendance"), icon: CalendarCheck }] : []),
 ...(isAdminOnly && isMenuVisible("paths") ? [{ href: "/admin/paths", label: t("nav.paths"), icon: Route }] : []),
 ...(isMenuVisible("calendar") ? [{ href: "/admin/calendar", label: t("nav.calendar") || "Calendar", icon: Calendar }] : []),
 ...(isMenuVisible("meetings") ? [{ href: "/admin/meetings", label: t("nav.meetings") || "Meetings", icon: Video }] : []),
 ...(isMenuVisible("analytics") ? [{ href: "/admin/analytics", label: t("nav.analytics"), icon: BarChart3 }] : []),
 ...(isSuperAdmin ? [{ href: "/admin/organizations", label: t("nav.organizations"), icon: Building2 }] : []),
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
 className="fixed inset-0 z-40 bg-ink-900/60 md:hidden"
 onClick={onClose}
 aria-hidden="true"
 />
 )}
 <aside
 className={cn(
 "rail-dark fixed inset-y-0 left-0 z-50 flex h-screen w-[240px] flex-col bg-ink-900 transition-transform duration-200 ease-in-out md:static md:translate-x-0",
 open ? "translate-x-0" : "-translate-x-full"
 )}
 >
 {/* Logo */}
 <div className="flex items-center gap-2.5 border-b border-white/[0.08] px-4 pb-[18px] pt-[18px]">
 {branding.logo_url ? (
 <img
 src={branding.logo_url}
 alt={branding.display_name}
 className="h-8 w-8 rounded-[10px] object-cover"
 />
 ) : (
 <div className="relative flex h-8 w-8 items-center justify-center rounded-[10px] bg-green-500 text-lg font-extrabold text-white">
 g
 <span className="absolute bottom-[4px] right-[5px] h-[5px] w-[5px] rounded-full bg-sun-400" />
 </div>
 )}
 <div>
 <span className="text-[15px] font-extrabold tracking-tight text-white">
 {branding.display_name}
 </span>
 <span className="block font-mono text-[9px] font-medium uppercase tracking-widest text-white/50">
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
 <p className="mb-1.5 px-2.5 font-mono text-[10px] font-medium uppercase tracking-widest text-white/40">
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
 "flex items-center gap-[11px] rounded-[10px] px-[10px] py-[9px] text-[13px] font-semibold transition-colors duration-150",
 isActive
 ? "bg-primary text-white"
 : "text-white/65 hover:bg-white/[0.05] hover:text-white"
 )}
 >
 <item.icon className="h-[18px] w-[18px]" aria-hidden="true" />
 {item.label}
 {item.badge ? (
 <span className="ml-auto rounded-pill bg-coral-500 px-1.5 py-0.5 font-mono text-[10px] font-extrabold leading-none text-white">
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
 className="mb-1 flex items-center gap-[10px] rounded-[10px] px-2.5 py-2 transition-colors hover:bg-white/[0.05]"
 >
 <div className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-green-400 text-[13px] font-extrabold text-green-900">
 {user?.full_name?.charAt(0)?.toUpperCase() || "?"}
 </div>
 <div className="min-w-0 flex-1">
 <p className="truncate text-[13px] font-bold text-white">
 {user?.full_name}
 </p>
 <p className="truncate font-mono text-[10px] tracking-wide text-white/50">
 {user?.email}
 </p>
 </div>
 </Link>
 <button
 onClick={handleLogout}
 className="flex w-full cursor-pointer items-center gap-[11px] rounded-[10px] px-[10px] py-[9px] text-[13px] font-semibold text-white/40 transition-colors hover:bg-white/[0.05] hover:text-white/70"
 >
 <LogOut className="h-[18px] w-[18px]" />
 {t("nav.signOut")}
 </button>
 </div>
 </aside>
 </>
 );
}

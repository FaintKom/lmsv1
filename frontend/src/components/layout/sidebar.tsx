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
  GraduationCap,
  TrendingUp,
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
} from "lucide-react";
import { NotificationBell } from "./notification-bell";
import { OrgSwitcher } from "./org-switcher";
import { SearchBar } from "./search-bar";
import LocaleSwitcher from "./locale-switcher";
import { ThemeSwitcher } from "../ui/theme-switcher";

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

  // Load menu visibility settings from org (admin-only endpoint)
  useEffect(() => {
    if (!isAdminOnly || !user?.org_id) return;
    apiClient
      .get(`/admin/organizations/${user.org_id}`)
      .then(({ data }) => {
        setMenuVisibility(data.settings?.menu_visibility || {});
      })
      .catch(() => {});
  }, [isAdminOnly, user?.org_id]);

  const isMenuVisible = (key: string) => menuVisibility[key] !== false; // default visible

  const studentNav: { href: string; label: string; icon: typeof LayoutDashboard; badge?: number }[] = [
    { href: "/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
    { href: "/courses", label: t("nav.courses"), icon: BookOpen },
    { href: "/sat-practice", label: "SAT Practice", icon: Calculator },
    { href: "/assignments", label: t("nav.assignments"), icon: ClipboardList },
{ href: "/paths", label: t("nav.paths"), icon: Route },
    { href: "/progress", label: t("nav.progress"), icon: TrendingUp },
    { href: "/achievements", label: t("nav.achievements"), icon: Trophy },
    { href: "/calendar", label: t("nav.calendar"), icon: Calendar },
    { href: "/meetings", label: t("nav.meetings"), icon: Video },
  ];

  const adminNav: { href: string; label: string; icon: typeof LayoutDashboard; badge?: number }[] = [
    { href: "/admin", label: t("nav.dashboard"), icon: LayoutDashboard },
    ...(isAdminOnly && isMenuVisible("users") ? [{ href: "/admin/users", label: t("nav.users"), icon: Users }] : []),
    ...(isMenuVisible("groups") ? [{ href: "/admin/groups", label: t("nav.groups"), icon: UsersRound }] : []),
    ...(isMenuVisible("courses") ? [{ href: "/admin/courses", label: t("nav.courses"), icon: GraduationCap }] : []),
    ...(isMenuVisible("content_library") ? [{ href: "/admin/content-library", label: "Content Library", icon: Library }] : []),
    ...(isMenuVisible("assignments") ? [{ href: "/admin/assignments", label: t("nav.assignments"), icon: ClipboardList }] : []),
    ...(isMenuVisible("gradebook") ? [{ href: "/admin/gradebook", label: t("nav.gradebook"), icon: Table2 }] : []),
    ...(isMenuVisible("review") ? [{ href: "/admin/review", label: t("nav.review"), icon: Inbox, badge: reviewCount }] : []),
    ...(isAdminOnly && isMenuVisible("paths") ? [{ href: "/admin/paths", label: t("nav.paths"), icon: Route }] : []),
    ...(isMenuVisible("calendar") ? [{ href: "/admin/calendar", label: t("nav.calendar") || "Calendar", icon: Calendar }] : []),
    ...(isMenuVisible("meetings") ? [{ href: "/admin/meetings", label: t("nav.meetings") || "Meetings", icon: Video }] : []),
    ...(isAdminOnly && isMenuVisible("analytics") ? [{ href: "/admin/analytics", label: t("nav.analytics"), icon: BarChart3 }] : []),
    // Billing hidden until payment providers connected (Prodamus/iyzico)
    // ...(isAdminOnly && isMenuVisible("billing") ? [{ href: "/admin/billing", label: t("nav.billing"), icon: CreditCard }] : []),
    ...(isSuperAdmin ? [{ href: "/admin/organizations", label: "Organizations", icon: Building2 }] : []),
    ...(isAdminOnly ? [{ href: "/admin/settings", label: "Settings", icon: Settings }] : []),
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
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-screen w-[260px] flex-col border-r border-slate-200/60 bg-white transition-transform duration-200 ease-in-out md:static md:translate-x-0 dark:border-white/10 dark:bg-[#1E1E1E]",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
      {/* Logo — dynamic per-org branding (P2-2) */}
      <div className="flex h-16 items-center justify-between border-b border-slate-100 px-6 dark:border-white/10">
        <div className="flex items-center gap-2.5">
          {branding.logo_url ? (
            <img
              src={branding.logo_url}
              alt={branding.display_name}
              className="h-8 w-8 rounded-lg object-cover"
            />
          ) : (
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ background: branding.primary_color || "#6366f1" }}
            >
              <GraduationCap className="h-4.5 w-4.5 text-white" />
            </div>
          )}
          <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {branding.display_name}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <button
            onClick={() => { onCollapse?.(); onClose?.(); }}
            className="hidden md:flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-slate-300"
            title="Collapse sidebar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m11 17-5-5 5-5"/><path d="m18 17-5-5 5-5"/></svg>
          </button>
        </div>
      </div>

      {/* Search — admin only */}
      {isAdminOnly && (
        <div className="border-b border-slate-100 py-3 dark:border-white/10">
          <SearchBar />
        </div>
      )}

      {/* Navigation */}
      <nav aria-label="Main navigation" className="flex-1 px-3 py-4">
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          {t("nav.menu")}
        </p>
        <ul className="space-y-1" role="list">
          {nav.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin" &&
                item.href !== "/dashboard" &&
                pathname.startsWith(item.href));
            // Map href -> onboarding-tour anchor so driver.js can find each link
            const tourAnchor = ({
              "/admin": "sidebar-dashboard",
              "/dashboard": "sidebar-dashboard",
              "/admin/courses": "sidebar-courses",
              "/admin/content-library": "sidebar-content-library",
              "/admin/gradebook": "sidebar-gradebook",
              "/admin/users": "sidebar-users",
              "/admin/groups": "sidebar-groups",
              "/admin/billing": "sidebar-billing",
            } as Record<string, string>)[item.href];
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  aria-current={isActive ? "page" : undefined}
                  data-tour={tourAnchor}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-150",
                    isActive
                      ? "bg-green-50 text-green-700 shadow-sm dark:bg-green-500/20 dark:text-green-300"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-200"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-[18px] w-[18px]",
                      isActive ? "text-green-600" : "text-slate-400"
                    )}
                    aria-hidden="true"
                  />
                  {item.label}
                  {item.badge ? (
                    <span className="ml-auto rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User */}
      <div className="border-t border-slate-100 p-3 dark:border-white/10">
        <OrgSwitcher />
        <div className="mb-1 flex items-center justify-between px-1">
          <LocaleSwitcher />
          <ThemeSwitcher />
        </div>
        <Link
          href="/profile"
          className="mb-2 flex items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-slate-50 dark:hover:bg-white/5"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-500 text-sm font-semibold text-white shadow-sm">
            {user?.full_name?.charAt(0)?.toUpperCase() || "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">
              {user?.full_name}
            </p>
            <p className="truncate text-xs capitalize text-slate-400 dark:text-slate-500">
              {user?.role}
            </p>
          </div>
        </Link>
        <button
          onClick={handleLogout}
          className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
        >
          <LogOut className="h-[18px] w-[18px]" />
          {t("nav.signOut")}
        </button>
      </div>
    </aside>
    </>
  );
}

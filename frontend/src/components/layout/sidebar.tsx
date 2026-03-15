"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useTranslation } from "@/lib/i18n/context";
import {
  BookOpen,
  ClipboardList,
  Code,
  BarChart3,
  Users,
  UsersRound,
  CreditCard,
  LogOut,
  LayoutDashboard,
  GraduationCap,
  TrendingUp,
  Trophy,
  Award,
} from "lucide-react";
import { NotificationBell } from "./notification-bell";
import { SearchBar } from "./search-bar";
import LocaleSwitcher from "./locale-switcher";
import { ThemeSwitcher } from "../ui/theme-switcher";

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { t } = useTranslation();

  const isAdminOrTeacher = user?.role === "super_admin" || user?.role === "admin" || user?.role === "teacher";
  const isAdminOnly = user?.role === "super_admin" || user?.role === "admin";

  const studentNav = [
    { href: "/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
    { href: "/courses", label: t("nav.courses"), icon: BookOpen },
    { href: "/assignments", label: t("nav.assignments"), icon: ClipboardList },
    { href: "/challenges", label: t("nav.challenges"), icon: Code },
    { href: "/progress", label: t("nav.progress"), icon: TrendingUp },
    { href: "/achievements", label: t("nav.achievements"), icon: Trophy },
    { href: "/certificates", label: t("nav.certificates"), icon: Award },
  ];

  const adminNav = [
    { href: "/admin", label: t("nav.dashboard"), icon: LayoutDashboard },
    ...(isAdminOnly ? [{ href: "/admin/users", label: t("nav.users"), icon: Users }] : []),
    { href: "/admin/groups", label: t("nav.groups") || "Groups", icon: UsersRound },
    { href: "/admin/courses", label: t("nav.courses"), icon: GraduationCap },
    { href: "/admin/assignments", label: t("nav.assignments"), icon: ClipboardList },
    { href: "/admin/analytics", label: t("nav.analytics"), icon: BarChart3 },
    ...(isAdminOnly ? [{ href: "/admin/billing", label: t("nav.billing"), icon: CreditCard }] : []),
  ];

  const nav = isAdminOrTeacher ? adminNav : studentNav;

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
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-slate-100 px-6 dark:border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
            <GraduationCap className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="text-lg font-bold text-slate-900 dark:text-slate-100">LearnHub</span>
        </div>
        <NotificationBell />
      </div>

      {/* Search */}
      <div className="border-b border-slate-100 py-3 dark:border-white/10">
        <SearchBar />
      </div>

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
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-150",
                    isActive
                      ? "bg-indigo-50 text-indigo-700 shadow-sm dark:bg-indigo-500/20 dark:text-indigo-300"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-200"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-[18px] w-[18px]",
                      isActive ? "text-indigo-600" : "text-slate-400"
                    )}
                    aria-hidden="true"
                  />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User */}
      <div className="border-t border-slate-100 p-3 dark:border-white/10">
        <div className="mb-1 flex items-center justify-between px-1">
          <LocaleSwitcher />
          <ThemeSwitcher />
        </div>
        <Link
          href="/profile"
          className="mb-2 flex items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-slate-50 dark:hover:bg-white/5"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-semibold text-white shadow-sm">
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

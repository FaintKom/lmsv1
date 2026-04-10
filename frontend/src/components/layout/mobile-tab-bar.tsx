"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  TrendingUp,
  User,
} from "lucide-react";

export function MobileTabBar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const isAdminOrTeacher =
    user?.role === "super_admin" || user?.role === "admin" || user?.role === "teacher";

  const tabs = isAdminOrTeacher
    ? [
        { href: "/admin", label: "Home", icon: LayoutDashboard },
        { href: "/admin/courses", label: "Courses", icon: BookOpen },
        { href: "/admin/assignments", label: "Tasks", icon: ClipboardList },
        { href: "/admin/review", label: "Review", icon: TrendingUp },
        { href: "/profile", label: "Profile", icon: User },
      ]
    : [
        { href: "/dashboard", label: "Home", icon: LayoutDashboard },
        { href: "/courses", label: "Courses", icon: BookOpen },
        { href: "/assignments", label: "Tasks", icon: ClipboardList },
        { href: "/progress", label: "Progress", icon: TrendingUp },
        { href: "/profile", label: "Profile", icon: User },
      ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200/60 bg-white pb-[env(safe-area-inset-bottom)] md:hidden dark:border-white/10 dark:bg-[#1E1E1E]">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const isActive =
            pathname === tab.href ||
            (tab.href !== "/admin" &&
              tab.href !== "/dashboard" &&
              pathname.startsWith(tab.href));
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-h-[48px] min-w-[48px] flex-1 flex-col items-center justify-center gap-1 px-1 text-xs font-medium transition-colors active:scale-[0.95] active:opacity-80",
                isActive
                  ? "text-green-600 dark:text-green-400"
                  : "text-slate-400 dark:text-slate-500"
              )}
            >
              <tab.icon className="h-5 w-5" aria-hidden="true" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

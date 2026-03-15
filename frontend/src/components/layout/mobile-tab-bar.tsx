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
              className={cn(
                "flex min-w-[64px] flex-col items-center gap-0.5 px-2 py-2.5 text-[10px] font-medium transition-colors",
                isActive
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-slate-400 dark:text-slate-500"
              )}
            >
              <tab.icon className="h-5 w-5" />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { GraduationCap, Menu } from "lucide-react";

// Routes under the (dashboard) route group that should render for all roles,
// including admin/teacher/super_admin. Without this whitelist, admins hitting
// /profile get bounced to /admin before they can see their profile settings.
const ROUTES_AVAILABLE_TO_ALL_ROLES = new Set(["/profile"]);

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, fetchUser } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const user = useAuthStore((s) => s.user);
  const branding = useAuthStore((s) => s.branding);

  // P2-2: inject org primary color into CSS custom properties so every
  // element using var(--primary) or Tailwind's primary color adapts
  // automatically to the org's brand.
  useEffect(() => {
    const color = branding?.primary_color;
    if (!color) return;
    const root = document.documentElement;
    root.style.setProperty("--primary", color);
    // Compute a lighter variant (for hover/light backgrounds)
    // and a darker variant (for active/pressed states).
    // Simple approach: lighten by 30% and darken by 15% via opacity blending.
    root.style.setProperty("--primary-light", color + "22");
    root.style.setProperty("--primary-dark", color);
    return () => {
      root.style.removeProperty("--primary");
      root.style.removeProperty("--primary-light");
      root.style.removeProperty("--primary-dark");
    };
  }, [branding?.primary_color]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
    const params = new URLSearchParams(window.location.search);
    const isPreview = params.get("preview") === "true";
    const isStaffRole =
      user?.role === "super_admin" || user?.role === "admin" || user?.role === "teacher";
    const isSharedRoute = ROUTES_AVAILABLE_TO_ALL_ROLES.has(pathname);
    if (!isLoading && user && !isPreview && isStaffRole && !isSharedRoute) {
      router.push("/admin");
    }
  }, [isLoading, isAuthenticated, user, router, pathname]);

  if (isLoading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-slate-50 dark:bg-[#1E1E1E]">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600">
          <GraduationCap className="h-6 w-6 text-white" />
        </div>
        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-indigo-500" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;
  const isStaffRole =
    user?.role === "super_admin" || user?.role === "admin" || user?.role === "teacher";
  if (isStaffRole && !ROUTES_AVAILABLE_TO_ALL_ROLES.has(pathname)) return null;

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#1E1E1E]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-indigo-600 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:shadow-lg"
      >
        Skip to content
      </a>
      {!sidebarCollapsed && <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} onCollapse={() => setSidebarCollapsed(true)} />}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <div className={`flex h-14 items-center border-b border-slate-200/60 bg-white px-4 dark:border-white/10 dark:bg-[#2C2C2C] ${sidebarCollapsed ? '' : 'md:hidden'}`}>
          <button
            onClick={() => {
              if (sidebarCollapsed) { setSidebarCollapsed(false); }
              else { setSidebarOpen(true); }
            }}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10"
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="ml-3 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600">
              <GraduationCap className="h-4 w-4 text-white" aria-hidden="true" />
            </div>
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">LearnHub</span>
          </div>
        </div>
        <main id="main-content" className="flex-1 overflow-auto p-6 pb-20 md:p-10 md:pb-10 lg:p-12 lg:pb-12">{children}</main>
      </div>
      <MobileTabBar />
    </div>
  );
}

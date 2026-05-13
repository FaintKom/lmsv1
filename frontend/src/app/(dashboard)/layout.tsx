"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { Menu } from "lucide-react";

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
 const isLessonPage = /\/courses\/[^/]+\/lessons\//.test(pathname);
 const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

 // Auto-collapse main sidebar on lesson pages — lesson has its own sidebar
 useEffect(() => {
  if (isLessonPage) setSidebarCollapsed(true);
 }, [isLessonPage]);

 useEffect(() => {
 fetchUser();
 }, [fetchUser]);

 const user = useAuthStore((s) => s.user);
 const branding = useAuthStore((s) => s.branding);

 // P2-2: inject org brand colors into CSS custom properties.
 // primary = buttons, links, main accent
 // secondary = badges, highlights, complementary accent
 // Auto-computed: light/dark variants via color-mix()
 useEffect(() => {
 const root = document.documentElement;
 const vars: string[] = [];
 const primary = branding?.primary_color;
 if (primary) {
 root.style.setProperty("--primary", primary);
 root.style.setProperty("--primary-light", `color-mix(in srgb, ${primary} 15%, transparent)`);
 root.style.setProperty("--primary-dark", `color-mix(in srgb, ${primary} 85%, black)`);
 vars.push("--primary", "--primary-light", "--primary-dark");
 }
 const secondary = branding?.secondary_color;
 if (secondary) {
 root.style.setProperty("--secondary", secondary);
 root.style.setProperty("--secondary-light", `color-mix(in srgb, ${secondary} 15%, transparent)`);
 root.style.setProperty("--secondary-dark", `color-mix(in srgb, ${secondary} 85%, black)`);
 vars.push("--secondary", "--secondary-light", "--secondary-dark");
 }
 return () => { vars.forEach((v) => root.style.removeProperty(v)); };
 }, [branding?.primary_color, branding?.secondary_color]);

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
 <div className="flex h-screen flex-col items-center justify-center gap-3 bg-surface-2 ">
 <div className="relative flex h-12 w-12 items-center justify-center rounded-[12px] bg-green-500 text-[24px] font-extrabold text-white">
 g
 <span className="absolute bottom-[5px] right-[6px] h-[6px] w-[6px] rounded-full bg-sun-400" />
 </div>
 <div className="h-1.5 w-24 overflow-hidden rounded-pill bg-ink-200">
 <div className="h-full w-1/2 animate-pulse rounded-pill bg-primary" />
 </div>
 </div>
 );
 }

 if (!isAuthenticated) return null;
 const isStaffRole =
 user?.role === "super_admin" || user?.role === "admin" || user?.role === "teacher";
 if (isStaffRole && !ROUTES_AVAILABLE_TO_ALL_ROLES.has(pathname)) return null;

 return (
 <div className="flex h-screen bg-surface-2 ">
 <a
 href="#main-content"
 className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:shadow-lg"
 >
 Skip to content
 </a>
 {!sidebarCollapsed && <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} onCollapse={() => setSidebarCollapsed(true)} />}
 <div className="flex flex-1 flex-col overflow-hidden">
 {/* Top bar */}
 <div className={`flex h-14 items-center border-b border-border-strong/60 bg-paper-2 px-4 ${sidebarCollapsed ? '' : 'md:hidden'}`}>
 <button
 onClick={() => {
 if (sidebarCollapsed) { setSidebarCollapsed(false); }
 else { setSidebarOpen(true); }
 }}
 className="rounded-lg p-2 text-text-muted hover:bg-ink-100 "
 aria-label="Toggle menu"
 >
 <Menu className="h-5 w-5" />
 </button>
 <div className="ml-3 flex items-center gap-2">
 <div className="relative flex h-7 w-7 items-center justify-center rounded-[8px] bg-green-500 text-sm font-extrabold text-white">
 g
 <span className="absolute bottom-[3px] right-[3px] h-[4px] w-[4px] rounded-full bg-sun-400" />
 </div>
 <span className="text-sm font-bold text-text ">GrassLMS</span>
 </div>
 </div>
 <main id="main-content" className="flex-1 overflow-auto p-6 pb-20 md:p-10 md:pb-10 lg:p-12 lg:pb-12">{children}</main>
 </div>
 <MobileTabBar />
 </div>
 );
}

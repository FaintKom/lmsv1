"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { Menu } from "lucide-react";

export default function AdminLayout({
 children,
}: {
 children: React.ReactNode;
}) {
 const router = useRouter();
 const pathname = usePathname();
 const { user, branding, isAuthenticated, isLoading, fetchUser } = useAuthStore();
 const [sidebarOpen, setSidebarOpen] = useState(false);
 // live lesson: projector window is fully chrome-free; the teacher screen
 // keeps the sidebar but drops main padding (it manages its own layout)
 const isProjector = /^\/admin\/live\/[^/]+\/screen$/.test(pathname);
 const isLiveRoute = /^\/admin\/live\//.test(pathname);

 useEffect(() => {
 fetchUser();
 }, [fetchUser]);

 // P2-2: inject org brand colors (same logic as dashboard layout)
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
 if (!isLoading && user && user.role === "student") {
 router.push("/dashboard");
 }
 // super_admin is allowed in admin routes
 }, [isLoading, isAuthenticated, user, router]);

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

 if (!isAuthenticated || user?.role === "student") return null;

 if (isProjector) return <>{children}</>;

 return (
 <div className="flex h-screen bg-surface-2 ">
 <a
 href="#main-content"
 className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:shadow-lg"
 >
 Skip to content
 </a>
 <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
 <div className="flex flex-1 flex-col overflow-hidden">
 {/* Mobile top bar */}
 <div className="flex h-14 items-center border-b border-border-strong/60 bg-paper-2 px-4 md:hidden ">
 <button
 onClick={() => setSidebarOpen(true)}
 className="rounded-lg p-2 text-text-muted hover:bg-ink-100 "
 aria-label="Open menu"
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
 <main id="main-content" className={isLiveRoute ? "flex-1 overflow-hidden" : "flex-1 overflow-auto p-6 pb-20 md:p-10 md:pb-10 lg:p-12 lg:pb-12"}>{children}</main>
 </div>
 <MobileTabBar />
 </div>
 );
}

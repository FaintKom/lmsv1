"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { Sidebar } from "@/components/layout/sidebar";
import { BrandVars } from "@/components/layout/brand-vars";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { LiveLessonBanner } from "@/components/live/live-lesson-banner";
import { Menu } from "lucide-react";

// Routes under the (dashboard) route group that should render for all roles,
// including admin/teacher/super_admin. Without this whitelist, admins hitting
// /profile get bounced to /admin before they can see their profile settings.
const ROUTES_AVAILABLE_TO_ALL_ROLES = new Set(["/profile"]);
// Prefix-matched routes that staff should also be able to view.
// Use this for any nested routes (e.g. /support and /support/thanks).
const SHARED_ROUTE_PREFIXES = ["/support"];
function isSharedRoutePath(pathname: string): boolean {
 if (ROUTES_AVAILABLE_TO_ALL_ROLES.has(pathname)) return true;
 return SHARED_ROUTE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export default function DashboardLayout({
 children,
}: {
 children: React.ReactNode;
}) {
 const router = useRouter();
 const pathname = usePathname();
 const { isAuthenticated, isLoading, fetchUser } = useAuthStore();
 const [sidebarOpen, setSidebarOpen] = useState(false);
 const isLessonPage = /\/courses\/[^/]+\/lessons\//.test(pathname) || /^\/lesson\//.test(pathname);
 // Not the user's collapse preference — that lives in ui-store and follows
 // them between route groups. This is "the lesson page borrows the whole
 // window", and it must not overwrite what they chose for themselves.
 const [hiddenForLesson, setHiddenForLesson] = useState(false);

 // A lesson brings its own sidebar, so the main one steps aside.
 // setHiddenForLesson(isLessonPage), not `if (isLessonPage) set(true)`: the
 // old form never restored the sidebar on the way out, so one visit to a
 // lesson left the menu gone for the rest of the session.
 useEffect(() => {
  setHiddenForLesson(isLessonPage);
 }, [isLessonPage]);

 useEffect(() => {
 fetchUser();
 }, [fetchUser]);

 const user = useAuthStore((s) => s.user);
 const branding = useAuthStore((s) => s.branding);

 useEffect(() => {
 if (!isLoading && !isAuthenticated) {
 router.push("/login");
 }
 const params = new URLSearchParams(window.location.search);
 const isPreview = params.get("preview") === "true";
 const isStaffRole =
 user?.role === "super_admin" || user?.role === "admin" || user?.role === "teacher";
 const isSharedRoute = isSharedRoutePath(pathname);
 if (!isLoading && user && !isPreview && isStaffRole && !isSharedRoute) {
 router.push("/admin");
 }
 }, [isLoading, isAuthenticated, user, router, pathname]);

 if (isLoading) {
 return (
 <div className="flex h-screen flex-col items-center justify-center gap-3 bg-surface-2 ">
 <div className="relative flex h-12 w-12 items-center justify-center rounded-sm bg-green-500 text-xl font-extrabold text-white">
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
 // Staff are normally bounced to /admin (see effect above), but NOT in preview
 // mode, where a teacher/admin views their own course as a learner would. The
 // effect already exempts ?preview=true; this render guard must match it, else
 // the learner route returns null and the teacher's "Preview" opens blank.
 const isPreviewMode =
 typeof window !== "undefined" &&
 new URLSearchParams(window.location.search).get("preview") === "true";
 if (isStaffRole && !isSharedRoutePath(pathname) && !isPreviewMode) return null;

 return (
 <div className="flex h-screen bg-surface-2 ">
      <BrandVars />
 <a
 href="#main-content"
 className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-fg focus:shadow-lg"
 >
 Skip to content
 </a>
 {!hiddenForLesson && <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />}
 <div className="flex flex-1 flex-col overflow-hidden">
 {/* Top bar */}
 <div className={`flex h-14 items-center border-b border-border-strong/60 bg-surface px-4 ${hiddenForLesson ? '' : 'md:hidden'}`}>
 <button
 onClick={() => {
 if (hiddenForLesson) { setHiddenForLesson(false); }
 else { setSidebarOpen(true); }
 }}
 className="rounded-lg p-2 text-text-muted hover:bg-surface-2 "
 aria-label="Toggle menu"
 >
 <Menu className="h-5 w-5" />
 </button>
 {/* The school's badge, not ours. This bar is the only chrome left on a
     lesson page, so a hard-coded "g / GrassLMS" here showed every school
     somebody else's brand at exactly the moment they had nothing else. */}
 <div className="ml-3 flex items-center gap-2">
 {branding.logo_url ? (
 <img
 src={branding.logo_url}
 alt={branding.display_name}
 className="h-7 w-7 rounded-xs object-cover"
 />
 ) : (
 <div className="relative flex h-7 w-7 items-center justify-center rounded-xs bg-green-500 text-sm font-extrabold text-white">
 g
 <span className="absolute bottom-[3px] right-[3px] h-[4px] w-[4px] rounded-full bg-sun-400" />
 </div>
 )}
 <span className="text-sm font-bold text-text ">{branding.display_name}</span>
 </div>
 </div>
 {/* A live lesson owns its window: the dashboard's generous padding and the
     bottom tab-bar clearance would push the lesson's own controls below a fold
     the page refuses to scroll to (FR-035). Everything else keeps the frame. */}
 <main id="main-content" className={isLessonPage ? "flex-1 overflow-hidden" : "flex-1 overflow-auto p-6 pb-20 md:p-10 md:pb-10 lg:p-12 lg:pb-12"}><LiveLessonBanner />{children}</main>
 </div>
 <MobileTabBar />
 </div>
 );
}

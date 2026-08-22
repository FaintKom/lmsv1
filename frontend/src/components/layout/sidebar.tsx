"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useTranslation } from "@/lib/i18n/context";
import apiClient from "@/lib/api-client";
import {
 LogOut,
 PanelLeftClose,
 PanelLeftOpen,
 ChevronRight,
} from "lucide-react";
import { NotificationBell } from "./notification-bell";
import { OrgSwitcher } from "./org-switcher";
import LocaleSwitcher from "./locale-switcher";
import { Tooltip } from "@/components/ui/tooltip";
import { useUIStore, isGroupOpen } from "@/stores/ui-store";
import { buildNavTree, type NavItem } from "./nav-tree";

interface SidebarProps {
 open?: boolean;
 onClose?: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
 const pathname = usePathname();
 const router = useRouter();
 const user = useAuthStore((s) => s.user);
 const branding = useAuthStore((s) => s.branding);
 const logout = useAuthStore((s) => s.logout);
 const { t } = useTranslation();
 const collapsed = useUIStore((s) => s.collapsed);
 const toggleCollapsed = useUIStore((s) => s.toggleCollapsed);
 const openGroups = useUIStore((s) => s.openGroups);
 const setGroupOpen = useUIStore((s) => s.setGroupOpen);
 const [hydrated, setHydrated] = useState(false);

 // The store skips automatic hydration so the server's markup and the
 // client's first render agree; reading storage back is therefore our job.
 // Until that has happened the rail must not animate — otherwise everyone who
 // prefers it collapsed watches it slide shut on every single page load.
 useEffect(() => {
 Promise.resolve(useUIStore.persist.rehydrate()).then(() => setHydrated(true));
 }, []);

 // The rail is a desktop idea. On a phone the sidebar is already a drawer you
 // summon and dismiss, and icons-only there would give one screen two ways to
 // hide the same menu. `open` is only ever true on mobile — the hamburger that
 // sets it is md:hidden — so it doubles as "we are in drawer mode", with no
 // media query and no second source of truth to keep in step.
 const railMode = collapsed && !open;

 // Only the two the fetches below gate on. Which entries each role may see is
 // decided in nav-tree.ts now, not here.
 const isAdminOrTeacher = user?.role === "super_admin" || user?.role === "admin" || user?.role === "teacher";
 const [reviewCount, setReviewCount] = useState(0);

 useEffect(() => {
 if (!isAdminOrTeacher) return;
 apiClient.get("/admin/review-queue/count").then(({ data }) => setReviewCount(data.count)).catch(() => {});
 const interval = setInterval(() => {
 apiClient.get("/admin/review-queue/count").then(({ data }) => setReviewCount(data.count)).catch(() => {});
 }, 60000);
 return () => clearInterval(interval);
 }, [isAdminOrTeacher]);

 const tree = buildNavTree({
 role: user?.role,
 // Comes with the session, next to the logo and the school name. It used to
 // be fetched from the settings endpoint, which is admin-only — so a teacher
 // got an empty map and saw every item the school had hidden (specs/034).
 menuVisibility: branding?.menu_visibility ?? {},
 reviewCount,
 supportHref: branding?.support_url || branding?.support_email
 ? branding.support_url || `mailto:${branding.support_email}`
 : null,
 t,
 });

 // A rail has no room for headings, so it shows every icon and skips the
 // grouping entirely. Honouring a closed category there would hide entries
 // behind a control that is not on screen to reopen them.
 const railItems = [...tree.top, ...tree.groups.flatMap((g) => g.items)];

 // Exact match for entries that have nested specialised siblings (e.g.
 // /admin/analytics + /admin/analytics/v2). Otherwise a parent entry
 // highlights when the user is actually on a child route.
 const isItemActive = (item: NavItem) => {
 const hasSpecialisedChild = railItems.some(
 (other) => other.href !== item.href && other.href.startsWith(item.href + "/"),
 );
 return (
 pathname === item.href ||
 (!hasSpecialisedChild &&
 item.href !== "/admin" &&
 item.href !== "/dashboard" &&
 pathname.startsWith(item.href))
 );
 };

 const renderItem = (item: NavItem) => {
 const isActive = isItemActive(item);
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
 const Anchor = item.external ? "a" : Link;
 const link = (
 <Anchor
 href={item.href}
 {...(item.external ? { rel: "noopener noreferrer" } : {})}
 onClick={onClose}
 // On the rail the icon is all there is, so the label has to move into
 // the accessible name or the link says nothing to a screen reader.
 // Expanded, the visible text already names it and a duplicate
 // aria-label would only override what people read.
 aria-label={railMode ? item.label : undefined}
 aria-current={isActive ? "page" : undefined}
 data-tour={tourAnchor}
 className={cn(
 "relative flex items-center rounded-sm text-sm font-semibold transition-colors duration-150",
 railMode ? "h-10 w-10 justify-center" : "gap-[11px] px-[10px] py-[9px]",
 // v2 rail rule: active = reward on a sun tint — green disappears on
 // the dark rail
 isActive
 ? "bg-reward/16 text-reward"
 : "text-white/65 hover:bg-white/[0.05] hover:text-white"
 )}
 >
 <item.icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
 {!railMode && item.label}
 {/* clay-600, not clay-500: white on clay-500 is 3.77:1 and fails AA in
     both themes. clay-600 reads the same and clears it at 5.23:1. */}
 {item.badge ? (
 <span
 className={cn(
 "rounded-pill bg-clay-600 px-1.5 py-0.5 font-mono text-3xs font-extrabold leading-none text-white",
 // No row to sit at the end of once the label is gone, so the count
 // rides the icon's corner instead.
 railMode ? "absolute -right-1 -top-1" : "ml-auto"
 )}
 >
 {item.badge > 99 ? "99+" : item.badge}
 </span>
 ) : null}
 </Anchor>
 );
 return (
 <li key={item.href}>
 {railMode ? (
 <Tooltip content={item.label} position="right">
 {link}
 </Tooltip>
 ) : (
 link
 )}
 </li>
 );
 };

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
 // transition-[width] as well as transform: collapsing is a width change on
 // desktop and a slide on mobile, and both want the same 200ms. The global
 // prefers-reduced-motion rule in globals.css flattens either one to 0.01ms,
 // so there is nothing to repeat per-component here.
 "rail-dark fixed inset-y-0 left-0 z-[60] flex h-dvh flex-col bg-ink-900 md:static md:h-screen md:translate-x-0",
 // Not before the saved preference is back: the first correction after
 // hydration is not a gesture the user made, and animating it turns
 // "it remembered" into "it is closing on me again".
 hydrated && "transition-[width,transform] duration-200 ease-in-out",
 railMode ? "w-[240px] md:w-[88px]" : "w-[240px]",
 open ? "translate-x-0" : "-translate-x-full"
 )}
 >
 {/* Logo */}
 <div
 className={cn(
 "flex border-b border-white/[0.08] pb-[18px] pt-[18px]",
 railMode ? "flex-col items-center gap-2 px-2" : "items-center gap-2.5 px-4"
 )}
 >
 {branding.logo_url ? (
 <img
 src={branding.logo_url}
 alt={branding.display_name}
 className="h-8 w-8 shrink-0 rounded-sm object-cover"
 />
 ) : (
 <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-green-500 text-lg font-extrabold text-white">
 g
 <span className="absolute bottom-[4px] right-[5px] h-[5px] w-[5px] rounded-full bg-sun-400" />
 </div>
 )}
 {railMode ? (
 // The school keeps its name on the rail — that is the point of leaving
 // one. 88px fits about two short lines, so long names clamp; `title`
 // rather than <Tooltip> carries the rest, because a span takes no focus
 // and the styled tooltip would only ever fire on hover here while
 // duplicating the same string into the accessibility tree.
 <span
 title={branding.display_name}
 className="line-clamp-2 text-center text-3xs font-bold leading-tight text-white"
 >
 {branding.display_name}
 </span>
 ) : (
 <div className="min-w-0">
 <span className="block truncate text-base font-extrabold tracking-tight text-white">
 {branding.display_name}
 </span>
 <span className="block font-mono text-3xs font-medium uppercase tracking-widest text-white/50">
 Learning Platform
 </span>
 </div>
 )}
 <button
 type="button"
 onClick={toggleCollapsed}
 aria-label={collapsed ? t("nav.expandMenu") : t("nav.collapseMenu")}
 className={cn(
 // Desktop only: on mobile the hamburger already does this job.
 "hidden shrink-0 cursor-pointer rounded-sm p-1.5 text-white/50 transition-colors hover:bg-white/[0.05] hover:text-white md:inline-flex",
 !railMode && "ml-auto"
 )}
 >
 {collapsed ? (
 <PanelLeftOpen className="h-[18px] w-[18px]" aria-hidden="true" />
 ) : (
 <PanelLeftClose className="h-[18px] w-[18px]" aria-hidden="true" />
 )}
 </button>
 </div>

 {/* Navigation */}
 <nav
 aria-label="Main navigation"
 className={cn("flex-1 overflow-y-auto py-3", railMode ? "px-2" : "px-4")}
 >
 {railMode ? (
 <ul className="flex flex-col items-center space-y-[2px]" role="list">
 {railItems.map(renderItem)}
 </ul>
 ) : (
 <>
 <ul className="space-y-[2px]" role="list">
 {tree.top.map(renderItem)}
 </ul>
 {tree.groups.map((group) => {
 const listId = `nav-group-${group.key}`;
 // Nothing overrides this. An earlier version forced open whichever
 // category held the current page, reasoning that the menu should not
 // hide where you are — but that left the heading dead under your
 // finger while still recording "closed" for some later page to
 // honour. A category nobody has touched is open anyway, so arriving
 // at a page already shows it; closing one is a decision, and
 // decisions stick.
 const open = isGroupOpen(openGroups, group.key);
 return (
 <div key={group.key} className="mt-3 first:mt-1.5">
 <button
 type="button"
 aria-expanded={open}
 aria-controls={listId}
 onClick={() => setGroupOpen(group.key, !open)}
 className="flex w-full cursor-pointer items-center gap-1 rounded-sm px-2.5 py-1 font-mono text-3xs font-medium uppercase tracking-widest text-white/50 transition-colors hover:text-white/80"
 >
 <ChevronRight
 className={cn(
 "h-3 w-3 shrink-0 transition-transform duration-150",
 open && "rotate-90"
 )}
 aria-hidden="true"
 />
 {group.label}
 </button>
 {/* The `hidden` attribute, not a `hidden` class: it takes the list out
     of the page with no stylesheet involved, so tab order and screen
     readers agree with the heading even before CSS lands. */}
 <ul
 id={listId}
 role="list"
 hidden={!open}
 className="mt-0.5 space-y-[2px]"
 >
 {group.items.map(renderItem)}
 </ul>
 </div>
 );
 })}
 </>
 )}
 </nav>

 {/* Footer */}
 <div
 className={cn(
 "border-t border-white/[0.08]",
 railMode ? "flex flex-col items-center gap-1 p-2" : "p-3"
 )}
 >
 {/* The org switcher and the locale picker are both label-and-menu
     controls; there is no honest 88px version of either, so on the rail
     they wait until the menu is opened again. The notification bell is an
     icon to begin with, so it stays. */}
 {!railMode && <OrgSwitcher />}
 <div
 className={cn(
 "mb-1 flex items-center",
 railMode ? "justify-center" : "justify-between px-1"
 )}
 >
 {!railMode && <LocaleSwitcher />}
 <NotificationBell />
 </div>
 <Link
 href="/profile"
 aria-label={railMode ? user?.full_name || undefined : undefined}
 className={cn(
 "mb-1 flex items-center rounded-sm transition-colors hover:bg-white/[0.05]",
 railMode ? "justify-center p-1" : "gap-[10px] px-2.5 py-2"
 )}
 >
 <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-green-400 text-sm font-extrabold text-ink-900">
 {user?.full_name?.charAt(0)?.toUpperCase() || "?"}
 </div>
 {!railMode && (
 <div className="min-w-0 flex-1">
 <p className="truncate text-sm font-bold text-white">
 {user?.full_name}
 </p>
 <p className="truncate font-mono text-3xs tracking-wide text-white/50">
 {user?.email}
 </p>
 </div>
 )}
 </Link>
 <button
 onClick={handleLogout}
 aria-label={railMode ? t("nav.signOut") : undefined}
 className={cn(
 "flex cursor-pointer items-center rounded-sm text-sm font-semibold text-white/50 transition-colors hover:bg-white/[0.05] hover:text-white/80",
 railMode
 ? "h-10 w-10 justify-center"
 : "w-full gap-[11px] px-[10px] py-[9px]"
 )}
 >
 <LogOut className="h-[18px] w-[18px] shrink-0" />
 {!railMode && t("nav.signOut")}
 </button>
 </div>
 </aside>
 </>
 );
}

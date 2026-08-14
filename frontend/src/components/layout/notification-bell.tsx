"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api-client";
import { Bell, Check, CheckCheck } from "lucide-react";

interface NotificationData {
 id: string;
 title: string;
 body: string;
 link: string | null;
 is_read: boolean;
 created_at: string;
}

export function NotificationBell() {
 const router = useRouter();
 const [unread, setUnread] = useState(0);
 const [notifications, setNotifications] = useState<NotificationData[]>([]);
 const [open, setOpen] = useState(false);
 const [loaded, setLoaded] = useState(false);
 const ref = useRef<HTMLDivElement>(null);

 // Poll unread count every 30s
 useEffect(() => {
 const fetchCount = () => {
 apiClient
 .get("/notifications/unread-count")
 .then(({ data }) => setUnread(data.count))
 .catch(() => {});
 };
 fetchCount();
 const interval = setInterval(fetchCount, 30000);
 return () => clearInterval(interval);
 }, []);

 // Close on outside click
 useEffect(() => {
 const handler = (e: MouseEvent) => {
 if (ref.current && !ref.current.contains(e.target as Node)) {
 setOpen(false);
 }
 };
 document.addEventListener("mousedown", handler);
 return () => document.removeEventListener("mousedown", handler);
 }, []);

 const handleOpen = () => {
 if (!open && !loaded) {
 apiClient
 .get("/notifications/")
 .then(({ data }) => {
 setNotifications(data);
 setLoaded(true);
 })
 .catch(() => {});
 }
 setOpen(!open);
 };

 const handleClick = async (notif: NotificationData) => {
 if (!notif.is_read) {
 await apiClient.put(`/notifications/${notif.id}/read`).catch(() => {});
 setNotifications((prev) =>
 prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
 );
 setUnread((prev) => Math.max(0, prev - 1));
 }
 if (notif.link) {
 router.push(notif.link);
 setOpen(false);
 }
 };

 const handleMarkAllRead = async () => {
 await apiClient.put("/notifications/read-all").catch(() => {});
 setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
 setUnread(0);
 };

 const timeAgo = (dateStr: string) => {
 const diff = Date.now() - new Date(dateStr).getTime();
 const mins = Math.floor(diff / 60000);
 if (mins < 1) return "now";
 if (mins < 60) return `${mins}m`;
 const hours = Math.floor(mins / 60);
 if (hours < 24) return `${hours}h`;
 const days = Math.floor(hours / 24);
 return `${days}d`;
 };

 return (
 <div ref={ref} className="relative">
 <button
 onClick={handleOpen}
 className="relative rounded-lg p-2 text-text-subtle transition-colors hover:bg-surface-2 hover:text-text-muted"
 aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ""}`}
 aria-expanded={open}
 aria-haspopup="true"
 >
 <Bell className="h-5 w-5" aria-hidden="true" />
 {unread > 0 && (
 <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-pill bg-danger px-1 text-3xs font-bold text-ink-900" aria-hidden="true">
 {unread > 99 ? "99+" : unread}
 </span>
 )}
 </button>

 {/* Two things about where this panel sits, both learned the hard way.
     Desktop: the bell is in the sidebar footer, so the panel opens UPWARDS
     (`bottom-full`). Downwards left the window — 28px of it empty, the whole
     320px list once there was anything to read.
     Phone: `fixed` here is NOT relative to the viewport. The sidebar carries
     a transform for its slide-in, and a transform makes the element the
     containing block for fixed descendants — so the panel was measured
     against a 240px drawer, and `right-4` put its left edge at -96. Anchoring
     left instead keeps it on screen, because the drawer starts at x=0. */}
 {open && (
 <div role="region" aria-label="Notifications" className="fixed left-2 top-16 z-50 w-80 max-w-[calc(100vw-1rem)] rounded-lg border border-border-strong bg-surface shadow-lg sm:absolute sm:bottom-full sm:left-0 sm:top-auto sm:mb-2">
 <div className="flex items-center justify-between border-b border-border px-4 py-3">
 <h3 className="text-sm font-semibold text-text">Notifications</h3>
 {unread > 0 && (
 <button
 onClick={handleMarkAllRead}
 className="flex items-center gap-1 text-xs font-medium text-primary hover:text-success-fg"
 >
 <CheckCheck className="h-3 w-3" />
 Mark all read
 </button>
 )}
 </div>

 <div className="max-h-80 overflow-y-auto">
 {notifications.length === 0 ? (
 <div className="px-4 py-8 text-center text-sm text-text-muted">
 No notifications yet
 </div>
 ) : (
 notifications.map((notif) => (
 <button
 key={notif.id}
 onClick={() => handleClick(notif)}
 className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2 ${
 !notif.is_read ? "bg-success-soft/50" : ""
 }`}
 >
 <div className="mt-0.5 shrink-0">
 {notif.is_read ? (
 <Check className="h-4 w-4 text-text-subtle" />
 ) : (
 <div className="h-2 w-2 rounded-pill bg-primary" />
 )}
 </div>
 <div className="min-w-0 flex-1">
 <p className={`text-sm ${notif.is_read ? "text-text-muted" : "font-medium text-text"}`}>
 {notif.title}
 </p>
 {notif.body && (
 <p className="mt-0.5 truncate text-sm text-text-muted">
 {notif.body}
 </p>
 )}
 </div>
 <span className="shrink-0 text-xs text-text-muted">
 {timeAgo(notif.created_at)}
 </span>
 </button>
 ))
 )}
 </div>
 </div>
 )}
 </div>
 );
}

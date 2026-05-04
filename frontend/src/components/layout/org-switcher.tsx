"use client";

import { useEffect, useState } from "react";
import { Building2, Check, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface Membership {
 org_id: string;
 org_name: string;
 org_slug: string;
 role: string;
 is_active: boolean;
}

interface MembershipsResponse {
 active_org_id: string;
 memberships: Membership[];
}

/**
 * Compact organization switcher for users with memberships in more
 * than one org (P2-11). Hidden when the user only belongs to one org,
 * so single-school users see nothing new.
 */
export function OrgSwitcher() {
 const [loading, setLoading] = useState(true);
 const [data, setData] = useState<MembershipsResponse | null>(null);
 const [open, setOpen] = useState(false);
 const [switching, setSwitching] = useState(false);

 useEffect(() => {
 let cancelled = false;
 (async () => {
 try {
 const res = await apiClient.get<MembershipsResponse>("/me/memberships");
 if (!cancelled) setData(res.data);
 } catch {
 // silent — most users are single-org and this endpoint may not
 // even be reachable if they're unauthenticated yet
 } finally {
 if (!cancelled) setLoading(false);
 }
 })();
 return () => {
 cancelled = true;
 };
 }, []);

 if (loading || !data || data.memberships.length <= 1) return null;

 const active = data.memberships.find((m) => m.org_id === data.active_org_id);

 async function handleSwitch(orgId: string) {
 if (orgId === data?.active_org_id) {
 setOpen(false);
 return;
 }
 setSwitching(true);
 try {
 await apiClient.post(`/me/switch-org/${orgId}`);
 toast.success("Switched organization — reloading...");
 // Full reload so every cached query and store picks up the new
 // org_id / role from /auth/me on the next page.
 setTimeout(() => window.location.reload(), 400);
 } catch {
 toast.error("Could not switch organization");
 setSwitching(false);
 }
 }

 return (
 <div className="relative mb-2">
 <button
 type="button"
 onClick={() => setOpen((o) => !o)}
 disabled={switching}
 className="flex w-full items-center gap-2 rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-left text-sm transition-colors hover:bg-surface-2 disabled:opacity-60 "
 aria-haspopup="listbox"
 aria-expanded={open}
 >
 <Building2 className="h-4 w-4 flex-shrink-0 text-text-subtle" aria-hidden="true" />
 <span className="min-w-0 flex-1 truncate font-medium text-ink-700 ">
 {active?.org_name ?? "Organization"}
 </span>
 <ChevronDown
 className={cn(
 "h-4 w-4 flex-shrink-0 text-text-subtle transition-transform",
 open && "rotate-180"
 )}
 aria-hidden="true"
 />
 </button>
 {open && (
 <ul
 role="listbox"
 className="absolute bottom-full left-0 right-0 z-50 mb-1 max-h-64 overflow-y-auto rounded-lg border border-border-strong bg-paper-2 py-1 shadow-lg "
 >
 {data.memberships.map((m) => {
 const isActive = m.org_id === data.active_org_id;
 return (
 <li key={m.org_id} role="option" aria-selected={isActive}>
 <button
 type="button"
 onClick={() => handleSwitch(m.org_id)}
 className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-surface-2 "
 >
 <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center">
 {isActive && <Check className="h-4 w-4 text-primary" aria-hidden="true" />}
 </span>
 <span className="min-w-0 flex-1">
 <span className="block truncate font-medium text-ink-700 ">
 {m.org_name}
 </span>
 <span className="block truncate text-xs capitalize text-text-subtle">
 {m.role.replace("_", " ")}
 </span>
 </span>
 </button>
 </li>
 );
 })}
 </ul>
 )}
 </div>
 );
}

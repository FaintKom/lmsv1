"use client";

import { useEffect, useState } from "react";
import { Mail, Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import apiClient from "@/lib/api-client";
import { useTranslation } from "@/lib/i18n/context";

interface WaitlistEntry {
 id: string;
 email: string;
 role: string | null;
 source: string | null;
 contacted: boolean;
 contacted_at: string | null;
 created_at: string | null;
}

export default function WaitlistPage() {
 const { t } = useTranslation();
 const [entries, setEntries] = useState<WaitlistEntry[]>([]);
 const [loading, setLoading] = useState(true);

 const fetchEntries = async () => {
 try {
 const { data } = await apiClient.get("/waitlist");
 setEntries(data.entries);
 } catch {
 toast.error(t("admin.waitlist.failedLoad"));
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 fetchEntries();
 }, []);

 const markContacted = async (entry: WaitlistEntry) => {
 try {
 await apiClient.post(`/waitlist/${entry.id}/mark-contacted`);
 toast.success(t("admin.waitlist.marked"));
 fetchEntries();
 } catch {
 toast.error(t("admin.waitlist.failedMark"));
 }
 };

 const copyEmails = async () => {
 const pending = entries.filter((e) => !e.contacted).map((e) => e.email);
 if (pending.length === 0) return;
 await navigator.clipboard.writeText(pending.join(", "));
 toast.success(t("admin.waitlist.copied"));
 };

 if (loading) {
 return (
 <div className="flex items-center justify-center py-20">
 <div className="h-8 w-8 animate-spin rounded-pill border-4 border-primary border-t-transparent" />
 </div>
 );
 }

 const pendingCount = entries.filter((e) => !e.contacted).length;

 return (
 <div className="mx-auto max-w-4xl space-y-6">
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-2xl font-bold text-text">{t("admin.waitlist.title")}</h1>
 <p className="text-sm text-text-muted">
 {t("admin.waitlist.subtitle")
 .replace("{total}", String(entries.length))
 .replace("{pending}", String(pendingCount))}
 </p>
 </div>
 {pendingCount > 0 && (
 <Button variant="ghost" onClick={copyEmails}>
 <Copy className="h-4 w-4" />
 {t("admin.waitlist.copyEmails")}
 </Button>
 )}
 </div>

 {entries.length === 0 ? (
 <div className="flex flex-col items-center gap-3 rounded-lg border border-border-strong bg-paper-2 p-12 text-center">
 <Mail className="h-8 w-8 text-text-subtle" aria-hidden="true" />
 <p className="text-sm text-text-muted">{t("admin.waitlist.empty")}</p>
 </div>
 ) : (
 <div className="overflow-x-auto rounded-lg border border-border-strong bg-paper-2">
 <table className="w-full text-left text-sm">
 <thead className="border-b border-border-strong text-xs uppercase text-text-muted">
 <tr>
 <th scope="col" className="px-4 py-3 font-medium">{t("admin.waitlist.email")}</th>
 <th scope="col" className="px-4 py-3 font-medium">{t("admin.waitlist.role")}</th>
 <th scope="col" className="px-4 py-3 font-medium">{t("admin.waitlist.source")}</th>
 <th scope="col" className="px-4 py-3 font-medium">{t("admin.waitlist.signedUp")}</th>
 <th scope="col" className="px-4 py-3 font-medium">{t("admin.waitlist.status")}</th>
 </tr>
 </thead>
 <tbody>
 {entries.map((entry) => (
 <tr key={entry.id} className="border-b border-border-strong last:border-0">
 <td className="px-4 py-3">
 <a href={`mailto:${entry.email}`} className="font-medium text-text hover:text-primary">
 {entry.email}
 </a>
 </td>
 <td className="px-4 py-3 text-text-muted">{entry.role || "—"}</td>
 <td className="px-4 py-3 text-text-muted">{entry.source || "—"}</td>
 <td className="px-4 py-3 text-text-muted">
 {entry.created_at ? new Date(entry.created_at).toLocaleDateString() : "—"}
 </td>
 <td className="px-4 py-3">
 {entry.contacted ? (
 <span className="inline-flex items-center gap-1 text-xs font-medium text-success-fg">
 <Check className="h-3.5 w-3.5" aria-hidden="true" />
 {t("admin.waitlist.contacted")}
 </span>
 ) : (
 <Button size="sm" variant="ghost" onClick={() => markContacted(entry)}>
 {t("admin.waitlist.markContacted")}
 </Button>
 )}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </div>
 );
}

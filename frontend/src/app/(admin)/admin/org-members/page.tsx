"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Trash2, UserPlus, Users } from "lucide-react";
import apiClient from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n/context";

interface Member {
 user_id: string;
 email: string;
 full_name: string;
 role: string;
 is_active: boolean;
 is_primary_org: boolean;
}

interface MembersResponse {
 org_id: string;
 members: Member[];
}

const ROLES = ["admin", "teacher", "student", "parent"] as const;
type Role = (typeof ROLES)[number];

/**
 * Admin page for managing the org's members (P2-11).
 *
 * Supports adding an existing user (by email) to the current org and
 * removing a member. The backend ensures a user is never orphaned —
 * if the removed membership was their primary org, the server
 * transfers them to another one or rejects the operation.
 */
export default function OrgMembersPage() {
 const { t } = useTranslation();
 const [members, setMembers] = useState<Member[]>([]);
 const [loading, setLoading] = useState(true);
 const [email, setEmail] = useState("");
 const [role, setRole] = useState<Role>("teacher");
 const [submitting, setSubmitting] = useState(false);

 const load = useCallback(async () => {
 try {
 const res = await apiClient.get<MembersResponse>("/admin/org-members");
 setMembers(res.data.members);
 } catch {
 toast.error(t("admin.orgMembers.failedLoad"));
 } finally {
 setLoading(false);
 }
 }, []);

 useEffect(() => {
 load();
 }, [load]);

 async function handleAdd(e: FormEvent<HTMLFormElement>) {
 e.preventDefault();
 if (!email.trim()) return;
 setSubmitting(true);
 try {
 const res = await apiClient.post("/admin/org-members", {
 email: email.trim(),
 role,
 });
 toast.success(
 res.data.status === "updated"
 ? t("admin.orgMembers.memberUpdated")
 : t("admin.orgMembers.memberAdded")
 );
 setEmail("");
 await load();
 } catch (err) {
 const anyErr = err as {
 response?: { status?: number; data?: { detail?: string } };
 };
 if (anyErr.response?.status === 404) {
 toast.error(t("admin.orgMembers.userNotFound"));
 } else {
 toast.error(anyErr.response?.data?.detail ?? t("admin.orgMembers.failedAdd"));
 }
 } finally {
 setSubmitting(false);
 }
 }

 async function handleRemove(member: Member) {
 if (
 !confirm(
 t("admin.orgMembers.removeConfirm").replace("{name}", member.full_name).replace("{email}", member.email)
 )
 ) {
 return;
 }
 try {
 await apiClient.delete(`/admin/org-members/${member.user_id}`);
 toast.success(t("admin.orgMembers.memberRemoved"));
 await load();
 } catch (err) {
 const anyErr = err as {
 response?: { data?: { detail?: string } };
 };
 toast.error(anyErr.response?.data?.detail ?? t("admin.orgMembers.failedRemove"));
 }
 }

 return (
 <div className="space-y-6">
 <div className="flex items-center gap-3">
 <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-soft text-primary">
 <Users className="h-5 w-5" aria-hidden="true" />
 </div>
 <div>
 <h1 className="text-2xl font-bold text-text">
 {t("admin.orgMembers.title")}
 </h1>
 <p className="text-sm text-text-muted">
 {t("admin.orgMembers.subtitle")}
 </p>
 </div>
 </div>

 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2 text-lg">
 <UserPlus className="h-5 w-5 text-text-subtle" aria-hidden="true" />
 {t("admin.orgMembers.addMember")}
 </CardTitle>
 </CardHeader>
 <CardContent>
 <form
 onSubmit={handleAdd}
 className="flex flex-col gap-3 sm:flex-row sm:items-end"
 >
 <div className="flex-1">
 <label
 htmlFor="member-email"
 className="mb-1 block text-xs font-medium text-text-muted"
 >
 {t("common.email")}
 </label>
 <input
 id="member-email"
 type="email"
 required
 placeholder={t("admin.orgMembers.emailPlaceholder")}
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 className="w-full rounded-lg border border-ink-300 bg-paper-2 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-soft"
 disabled={submitting}
 />
 </div>
 <div className="sm:w-40">
 <label
 htmlFor="member-role"
 className="mb-1 block text-xs font-medium text-text-muted"
 >
 {t("common.role")}
 </label>
 <select
 id="member-role"
 value={role}
 onChange={(e) => setRole(e.target.value as Role)}
 className="w-full rounded-lg border border-ink-300 bg-paper-2 px-3 py-2 text-sm capitalize focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-soft"
 disabled={submitting}
 >
 {ROLES.map((r) => (
 <option key={r} value={r}>
 {r}
 </option>
 ))}
 </select>
 </div>
 <Button type="submit" disabled={submitting}>
 {submitting ? t("admin.orgMembers.adding") : t("admin.orgMembers.addMember")}
 </Button>
 </form>
 </CardContent>
 </Card>

 <Card>
 <CardHeader>
 <CardTitle className="text-lg">
 {t("admin.orgMembers.currentMembers")} ({members.length})
 </CardTitle>
 </CardHeader>
 <CardContent>
 {loading ? (
 <p className="text-sm text-text-muted">{t("common.loading")}</p>
 ) : members.length === 0 ? (
 <p className="text-sm text-text-muted">{t("admin.orgMembers.noMembers")}</p>
 ) : (
 <ul className="divide-y divide-slate-100">
 {members.map((m) => (
 <li
 key={m.user_id}
 className="flex items-center justify-between gap-4 py-3"
 >
 <div className="min-w-0 flex-1">
 <p className="truncate text-sm font-medium text-text">
 {m.full_name}
 </p>
 <p className="truncate text-xs text-text-muted">{m.email}</p>
 </div>
 <span className="rounded-pill bg-ink-100 px-2 py-0.5 text-xs font-medium capitalize text-text-muted">
 {m.role}
 </span>
 {!m.is_primary_org && (
 <span
 className="text-xs text-text-subtle"
 title={t("admin.orgMembers.notPrimary")}
 >
 {t("admin.orgMembers.secondary")}
 </span>
 )}
 <button
 type="button"
 onClick={() => handleRemove(m)}
 className="rounded-lg p-2 text-text-subtle transition-colors hover:bg-danger-soft hover:text-danger-fg"
 aria-label={t("admin.orgMembers.removeAria").replace("{name}", m.full_name)}
 title={t("admin.orgMembers.removeTitle")}
 >
 <Trash2 className="h-4 w-4" aria-hidden="true" />
 </button>
 </li>
 ))}
 </ul>
 )}
 </CardContent>
 </Card>
 </div>
 );
}

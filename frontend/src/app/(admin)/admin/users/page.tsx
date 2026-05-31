"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus, Trash2, KeyRound } from "lucide-react";
import type { User } from "@/types/api";
import { useAuthStore } from "@/stores/auth-store";
import { useTranslation } from "@/lib/i18n/context";

function describeError(err: unknown, fallback: string): string {
 if (axios.isAxiosError(err)) {
  const detail =
   (err.response?.data as { detail?: string } | undefined)?.detail ||
   err.response?.statusText ||
   err.message;
  return detail || fallback;
 }
 return fallback;
}

interface OrgOption {
 id: string;
 name: string;
 slug: string;
 user_count: number;
}

export default function AdminUsersPage() {
 const { t } = useTranslation();
 const confirm = useConfirm();
 const currentUser = useAuthStore((s) => s.user);
 const isSuperAdmin = currentUser?.role === "super_admin";
 const [users, setUsers] = useState<User[]>([]);
 const [orgs, setOrgs] = useState<OrgOption[]>([]);
 const [loading, setLoading] = useState(true);
 const [showForm, setShowForm] = useState(false);
 const [form, setForm] = useState({ full_name: "", email: "", password: "", role: "student" });
 const [submitting, setSubmitting] = useState(false);

 const fetchUsers = () => {
 apiClient
 .get("/admin/users")
 .then(({ data }) => setUsers(data))
 .catch(() => {})
 .finally(() => setLoading(false));
 };

 const fetchOrgs = () => {
 if (!isSuperAdmin) return;
 apiClient
 .get("/admin/organizations")
 .then(({ data }) => setOrgs(data))
 .catch(() => {});
 };

 useEffect(() => {
 fetchUsers();
 fetchOrgs();
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, []);

 const handleAdd = async (e: React.FormEvent) => {
 e.preventDefault();
 setSubmitting(true);
 try {
 await apiClient.post("/admin/users", form);
 setForm({ full_name: "", email: "", password: "", role: "student" });
 setShowForm(false);
 toast.success(t("admin.users.userCreated"));
 fetchUsers();
 } catch (err) {
 toast.error(describeError(err, t("admin.users.failedCreateUser")));
 } finally {
 setSubmitting(false);
 }
 };

 const handleDelete = async (userId: string) => {
 if (!(await confirm({ message: t("admin.users.confirmDelete"), variant: "danger", confirmLabel: t("common.delete") }))) return;
 try {
 await apiClient.delete(`/admin/users/${userId}`);
 toast.success(t("admin.users.userDeleted"));
 fetchUsers();
 } catch (err) {
 toast.error(describeError(err, t("admin.users.failedDeleteUser")));
 }
 };

 const handleResetPassword = async (userId: string, email: string) => {
 if (
 !(await confirm({
 message: t("admin.users.passwordResetConfirm").replace("{email}", email),
 confirmLabel: t("admin.users.sendResetLink"),
 }))
 )
 return;
 try {
 const { data } = await apiClient.post(`/admin/users/${userId}/password`);
 if (data?.email_sent === false) {
 toast.error(t("admin.users.passwordResetEmailDisabled"));
 } else {
 toast.success(t("admin.users.passwordResetLinkSent").replace("{email}", email));
 }
 } catch (err) {
 toast.error(describeError(err, t("admin.users.failedResetPassword")));
 }
 };

 const handleRoleChange = async (userId: string, newRole: string) => {
 try {
 await apiClient.put(`/admin/users/${userId}`, { role: newRole });
 toast.success(t("admin.users.roleUpdated"));
 fetchUsers();
 } catch {
 toast.error(t("common.failedToUpdate"));
 }
 };

 const handleOrgChange = async (userId: string, newOrgId: string) => {
 try {
 await apiClient.put(`/admin/users/${userId}`, { org_id: newOrgId });
 toast.success(t("admin.users.orgUpdated"));
 fetchUsers();
 } catch {
 toast.error(t("common.failedToUpdate"));
 }
 };

 const handleToggleActive = async (userId: string, isActive: boolean) => {
 try {
 await apiClient.put(`/admin/users/${userId}`, { is_active: !isActive });
 fetchUsers();
 } catch {
 toast.error(t("admin.users.failedUpdateStatus"));
 }
 };

 const handleToggleMethodist = async (userId: string, isMethodist: boolean) => {
 try {
 await apiClient.put(`/admin/users/${userId}`, { is_methodist: !isMethodist });
 toast.success(!isMethodist ? t("admin.users.methodistGranted") : t("admin.users.methodistRevoked"));
 fetchUsers();
 } catch {
 toast.error(t("admin.users.failedUpdateMethodist"));
 }
 };

 const getOrgName = (orgId: string) => {
 const org = orgs.find((o) => o.id === orgId);
 return org?.name || orgId.slice(0, 8) + "...";
 };

 if (loading) {
 return (
 <div className="flex h-64 items-center justify-center">
 <div className="h-8 w-8 animate-spin rounded-pill border-4 border-primary border-t-transparent" />
 </div>
 );
 }

 return (
 <div className="mx-auto max-w-6xl">
 <div className="mb-6 flex items-center justify-between">
 <div>
 <h1 className="text-2xl font-bold text-text ">{t("admin.users.title")}</h1>
 <p className="mt-1 text-sm text-text-muted ">
 {users.length} {isSuperAdmin ? t("admin.users.countAll") : t("admin.users.countOrg")}
 </p>
 </div>
 <Button onClick={() => setShowForm(!showForm)}>
 <UserPlus className="mr-2 h-4 w-4" />
 {t("admin.users.addUser")}
 </Button>
 </div>

 {showForm && (
 <Card className="mb-6">
 <CardHeader>
 <CardTitle className="text-base">{t("admin.users.newUser")}</CardTitle>
 </CardHeader>
 <CardContent>
 <form onSubmit={handleAdd} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
 <input
 type="text"
 placeholder={t("admin.users.fullName")}
 value={form.full_name}
 onChange={(e) => setForm({ ...form, full_name: e.target.value })}
 className="rounded-lg border border-ink-300 bg-transparent px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-green-500"
 required
 />
 <input
 type="email"
 placeholder={t("common.email")}
 value={form.email}
 onChange={(e) => setForm({ ...form, email: e.target.value })}
 className="rounded-lg border border-ink-300 bg-transparent px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-green-500"
 required
 />
 <input
 type="password"
 placeholder={t("admin.users.password")}
 value={form.password}
 onChange={(e) => setForm({ ...form, password: e.target.value })}
 className="rounded-lg border border-ink-300 bg-transparent px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-green-500"
 required
 />
 <select
 value={form.role}
 onChange={(e) => setForm({ ...form, role: e.target.value })}
 className="rounded-lg border border-ink-300 bg-transparent px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-green-500"
 >
 <option value="student">student</option>
 <option value="teacher">teacher</option>
 <option value="admin">admin</option>
 </select>
 <div className="flex gap-2 sm:col-span-2">
 <Button type="submit" disabled={submitting}>
 {submitting ? t("common.creating") : t("admin.users.createUser")}
 </Button>
 <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
 {t("common.cancel")}
 </Button>
 </div>
 </form>
 </CardContent>
 </Card>
 )}

 <Card>
 <CardContent className="p-0">
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead>
 <tr className="border-b border-border-strong text-left text-xs font-medium uppercase tracking-wider text-text-subtle">
 <th className="px-5 py-3">{t("common.name")}</th>
 <th className="px-5 py-3">{t("common.email")}</th>
 <th className="px-5 py-3">{t("common.role")}</th>
 <th className="px-5 py-3">{t("admin.users.methodist")}</th>
 {isSuperAdmin && <th className="px-5 py-3">{t("admin.users.organization")}</th>}
 <th className="px-5 py-3">{t("common.status")}</th>
 <th className="px-5 py-3">{t("common.joined")}</th>
 <th className="px-5 py-3"></th>
 </tr>
 </thead>
 <tbody>
 {users.map((u) => (
 <tr key={u.id} className="border-b border-slate-50 text-sm hover:bg-surface-2/50 ">
 <td className="px-5 py-4">
 <div className="flex items-center gap-3">
 <div className="flex h-8 w-8 items-center justify-center rounded-pill bg-gradient-to-br from-green-500 to-emerald-500 text-xs font-semibold text-white">
 {u.full_name.charAt(0).toUpperCase()}
 </div>
 <span className="font-medium text-text ">{u.full_name}</span>
 </div>
 </td>
 <td className="px-5 py-4 text-text-muted ">{u.email}</td>
 <td className="px-5 py-4">
 <select
 value={u.role}
 onChange={(e) => handleRoleChange(u.id, e.target.value)}
 className="rounded border border-transparent bg-transparent py-0.5 text-xs font-medium hover:border-primary focus:outline-none"
 >
 <option value="student">student</option>
 <option value="teacher">teacher</option>
 <option value="admin">admin</option>
 {isSuperAdmin && <option value="super_admin">super_admin</option>}
 </select>
 </td>
 <td className="px-5 py-4">
 {u.role === "teacher" ? (
 <button
 onClick={() => handleToggleMethodist(u.id, !!u.is_methodist)}
 className={`rounded-pill px-2 py-0.5 text-[10px] font-medium ${
 u.is_methodist
 ? "bg-success-soft text-primary"
 : "bg-surface-2 text-text-subtle"
 }`}
 >
 {u.is_methodist ? t("admin.users.methodist") : t("admin.users.regular")}
 </button>
 ) : (
 <span className="text-xs text-ink-300">—</span>
 )}
 </td>
 {isSuperAdmin && (
 <td className="px-5 py-4">
 <select
 value={u.org_id}
 onChange={(e) => handleOrgChange(u.id, e.target.value)}
 className="max-w-[160px] truncate rounded border border-transparent bg-transparent py-0.5 text-xs font-medium hover:border-primary focus:outline-none"
 >
 {orgs.map((o) => (
 <option key={o.id} value={o.id}>
 {o.name}
 </option>
 ))}
 </select>
 </td>
 )}
 <td className="px-5 py-4">
 <button
 onClick={() => handleToggleActive(u.id, u.is_active)}
 className={`rounded-pill px-2 py-0.5 text-[10px] font-medium ${
 u.is_active
 ? "bg-success-soft text-primary"
 : "bg-danger-soft text-danger-fg"
 }`}
 >
 {u.is_active ? t("common.active") : t("common.inactive")}
 </button>
 </td>
 <td className="px-5 py-4 text-xs text-text-subtle">
 {new Date(u.created_at).toLocaleDateString()}
 </td>
 <td className="px-5 py-4">
 <div className="flex items-center gap-1">
 <button
 onClick={() => handleResetPassword(u.id, u.email)}
 className="rounded p-1 text-ink-300 hover:bg-success-soft hover:text-primary"
 title={t("admin.users.resetPasswordTitle")}
 >
 <KeyRound className="h-4 w-4" />
 </button>
 <button
 onClick={() => handleDelete(u.id)}
 className="rounded p-1 text-ink-300 hover:bg-danger-soft hover:text-danger-fg"
 title={t("admin.users.deleteUserTitle")}
 >
 <Trash2 className="h-4 w-4" />
 </button>
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </CardContent>
 </Card>
 </div>
 );
}

"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";
import { Building2, Pencil, Trash2, X, Check, Users, Plus } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";

interface Org {
 id: string;
 name: string;
 slug: string;
 is_active: boolean;
 settings: Record<string, unknown>;
 created_at: string | null;
}

export default function OrganizationsPage() {
 const { t } = useTranslation();
 const user = useAuthStore((s) => s.user);
 const [orgs, setOrgs] = useState<Org[]>([]);
 const [loading, setLoading] = useState(true);
 const [editingId, setEditingId] = useState<string | null>(null);
 const [editName, setEditName] = useState("");
 const [showCreate, setShowCreate] = useState(false);
 const [newOrgName, setNewOrgName] = useState("");
 const [creating, setCreating] = useState(false);

 const isSuperAdmin = user?.role === "super_admin";

 const fetchOrgs = async () => {
 try {
 const { data } = await apiClient.get("/admin/organizations");
 setOrgs(data);
 } catch {
 toast.error(t("admin.organizations.failedLoad"));
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 fetchOrgs();
 }, []);

 const startEdit = (org: Org) => {
 setEditingId(org.id);
 setEditName(org.name);
 };

 const saveEdit = async () => {
 if (!editingId || !editName.trim()) return;
 try {
 await apiClient.put(`/admin/organizations/${editingId}`, { name: editName.trim() });
 toast.success(t("admin.organizations.orgUpdated"));
 setEditingId(null);
 fetchOrgs();
 } catch {
 toast.error(t("admin.organizations.failedUpdate"));
 }
 };

 const toggleActive = async (org: Org) => {
 try {
 await apiClient.put(`/admin/organizations/${org.id}`, { is_active: !org.is_active });
 toast.success(org.is_active ? t("admin.organizations.orgDeactivated") : t("admin.organizations.orgActivated"));
 fetchOrgs();
 } catch {
 toast.error(t("admin.organizations.failedUpdate"));
 }
 };

 const deleteOrg = async (org: Org) => {
 if (!confirm(t("admin.organizations.confirmDelete").replace("{name}", org.name))) return;
 try {
 await apiClient.delete(`/admin/organizations/${org.id}`);
 toast.success(t("admin.organizations.orgDeleted"));
 fetchOrgs();
 } catch (err: unknown) {
 const message = err instanceof Error ? err.message : t("admin.organizations.failedDelete");
 toast.error(message);
 }
 };

 const createOrg = async () => {
 if (!newOrgName.trim()) return;
 setCreating(true);
 try {
 await apiClient.post("/admin/organizations", { name: newOrgName.trim() });
 toast.success(t("admin.organizations.orgCreated"));
 setNewOrgName("");
 setShowCreate(false);
 fetchOrgs();
 } catch {
 toast.error(t("admin.organizations.failedCreate"));
 } finally {
 setCreating(false);
 }
 };

 if (loading) {
 return (
 <div className="flex items-center justify-center py-20">
 <div className="h-8 w-8 animate-spin rounded-pill border-4 border-primary border-t-transparent" />
 </div>
 );
 }

 return (
 <div className="mx-auto max-w-4xl space-y-6">
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-2xl font-bold text-text ">{t("admin.organizations.title")}</h1>
 <p className="text-sm text-text-muted ">
 {isSuperAdmin ? t("admin.organizations.manageAll") : t("admin.organizations.yourOrg")}
 </p>
 </div>
 {isSuperAdmin && (
 <Button onClick={() => setShowCreate(!showCreate)}>
 <Plus className="h-4 w-4" />
 {t("admin.organizations.newOrg")}
 </Button>
 )}
 </div>

 {showCreate && (
 <div className="rounded-lg border border-border-strong bg-paper-2 p-4 ">
 <h3 className="mb-3 font-semibold text-text ">{t("admin.organizations.createOrg")}</h3>
 <div className="flex items-end gap-3">
 <div className="flex-1">
 <label htmlFor="newOrgName" className="mb-1 block text-xs font-medium text-text-muted ">
 {t("admin.organizations.orgName")}
 </label>
 <input
 id="newOrgName"
 type="text"
 value={newOrgName}
 onChange={(e) => setNewOrgName(e.target.value)}
 placeholder={t("admin.organizations.orgNamePlaceholder")}
 className="w-full rounded-lg border border-ink-300 bg-paper-2 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-soft"
 onKeyDown={(e) => e.key === "Enter" && createOrg()}
 disabled={creating}
 />
 </div>
 <Button onClick={createOrg} disabled={creating || !newOrgName.trim()}>
 {creating ? t("common.creating") : t("common.create")}
 </Button>
 <Button variant="ghost" onClick={() => { setShowCreate(false); setNewOrgName(""); }}>
 {t("common.cancel")}
 </Button>
 </div>
 </div>
 )}

 <div className="space-y-3">
 {orgs.map((org) => (
 <div
 key={org.id}
 className="flex items-center gap-4 rounded-lg border border-border-strong bg-paper-2 p-4 "
 >
 <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-soft ">
 <Building2 className="h-6 w-6 text-primary " />
 </div>

 <div className="min-w-0 flex-1">
 {editingId === org.id ? (
 <div className="flex items-center gap-2">
 <Input
 value={editName}
 onChange={(e) => setEditName(e.target.value)}
 className="h-8 text-sm"
 onKeyDown={(e) => e.key === "Enter" && saveEdit()}
 autoFocus
 />
 <button onClick={saveEdit} className="rounded p-1 text-primary hover:bg-success-soft ">
 <Check className="h-4 w-4" />
 </button>
 <button onClick={() => setEditingId(null)} className="rounded p-1 text-text-subtle hover:bg-ink-100 ">
 <X className="h-4 w-4" />
 </button>
 </div>
 ) : (
 <>
 <p className="font-semibold text-text ">{org.name}</p>
 <p className="text-xs text-text-subtle ">
 {org.slug} • {org.is_active ? t("common.active") : t("common.inactive")}
 {org.created_at && ` • ${t("admin.organizations.createdLabel")} ${new Date(org.created_at).toLocaleDateString()}`}
 </p>
 </>
 )}
 </div>

 <div className="flex items-center gap-1">
 <button
 onClick={() => startEdit(org)}
 className="rounded-lg p-2 text-text-subtle hover:bg-ink-100 hover:text-text-muted "
 title={t("admin.organizations.editTitle")}
 >
 <Pencil className="h-4 w-4" />
 </button>
 {isSuperAdmin && (
 <>
 <button
 onClick={() => toggleActive(org)}
 className={`rounded-lg p-2 text-sm font-medium ${
 org.is_active
 ? "text-warning-fg hover:bg-sun-50 "
 : "text-primary hover:bg-success-soft "
 }`}
 title={org.is_active ? t("admin.organizations.deactivateTitle") : t("admin.organizations.activateTitle")}
 >
 <Users className="h-4 w-4" />
 </button>
 <button
 onClick={() => deleteOrg(org)}
 className="rounded-lg p-2 text-danger hover:bg-danger-soft hover:text-danger-fg "
 title={t("admin.organizations.deleteTitle")}
 >
 <Trash2 className="h-4 w-4" />
 </button>
 </>
 )}
 </div>
 </div>
 ))}

 {orgs.length === 0 && (
 <div className="py-12 text-center text-text-subtle">{t("admin.organizations.none")}</div>
 )}
 </div>
 </div>
 );
}

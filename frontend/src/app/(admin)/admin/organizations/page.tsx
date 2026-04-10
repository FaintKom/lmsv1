"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";
import { Building2, Pencil, Trash2, X, Check, Users, Plus } from "lucide-react";

interface Org {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  settings: Record<string, unknown>;
  created_at: string | null;
}

export default function OrganizationsPage() {
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
      toast.error("Failed to load organizations");
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
      toast.success("Organization updated");
      setEditingId(null);
      fetchOrgs();
    } catch {
      toast.error("Failed to update organization");
    }
  };

  const toggleActive = async (org: Org) => {
    try {
      await apiClient.put(`/admin/organizations/${org.id}`, { is_active: !org.is_active });
      toast.success(org.is_active ? "Organization deactivated" : "Organization activated");
      fetchOrgs();
    } catch {
      toast.error("Failed to update organization");
    }
  };

  const deleteOrg = async (org: Org) => {
    if (!confirm(`Delete "${org.name}"? This will remove all users, courses, and data in this organization. This action cannot be undone.`)) return;
    try {
      await apiClient.delete(`/admin/organizations/${org.id}`);
      toast.success("Organization deleted");
      fetchOrgs();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete organization";
      toast.error(message);
    }
  };

  const createOrg = async () => {
    if (!newOrgName.trim()) return;
    setCreating(true);
    try {
      await apiClient.post("/admin/organizations", { name: newOrgName.trim() });
      toast.success("Organization created");
      setNewOrgName("");
      setShowCreate(false);
      fetchOrgs();
    } catch {
      toast.error("Failed to create organization");
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Organizations</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {isSuperAdmin ? "Manage all organizations" : "Your organization settings"}
          </p>
        </div>
        {isSuperAdmin && (
          <Button onClick={() => setShowCreate(!showCreate)}>
            <Plus className="h-4 w-4" />
            New Organization
          </Button>
        )}
      </div>

      {showCreate && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#2C2C2C]">
          <h3 className="mb-3 font-semibold text-slate-900 dark:text-slate-100">Create organization</h3>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label htmlFor="newOrgName" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                Organization name
              </label>
              <input
                id="newOrgName"
                type="text"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                placeholder="Acme School"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-[#1E1E1E] dark:text-slate-200 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-100"
                onKeyDown={(e) => e.key === "Enter" && createOrg()}
                disabled={creating}
              />
            </div>
            <Button onClick={createOrg} disabled={creating || !newOrgName.trim()}>
              {creating ? "Creating..." : "Create"}
            </Button>
            <Button variant="ghost" onClick={() => { setShowCreate(false); setNewOrgName(""); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {orgs.map((org) => (
          <div
            key={org.id}
            className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#2C2C2C]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 dark:bg-green-500/20">
              <Building2 className="h-6 w-6 text-green-600 dark:text-green-400" />
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
                  <button onClick={saveEdit} className="rounded p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10">
                    <Check className="h-4 w-4" />
                  </button>
                  <button onClick={() => setEditingId(null)} className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{org.name}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {org.slug} • {org.is_active ? "Active" : "Inactive"}
                    {org.created_at && ` • Created ${new Date(org.created_at).toLocaleDateString()}`}
                  </p>
                </>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => startEdit(org)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-slate-300"
                title="Edit name"
              >
                <Pencil className="h-4 w-4" />
              </button>
              {isSuperAdmin && (
                <>
                  <button
                    onClick={() => toggleActive(org)}
                    className={`rounded-lg p-2 text-sm font-medium ${
                      org.is_active
                        ? "text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10"
                        : "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                    }`}
                    title={org.is_active ? "Deactivate" : "Activate"}
                  >
                    <Users className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteOrg(org)}
                    className="rounded-lg p-2 text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                    title="Delete organization"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}

        {orgs.length === 0 && (
          <div className="py-12 text-center text-slate-400">No organizations found</div>
        )}
      </div>
    </div>
  );
}

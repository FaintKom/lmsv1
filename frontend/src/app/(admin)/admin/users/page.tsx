"use client";

import { useEffect, useState } from "react";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus, Trash2 } from "lucide-react";
import type { User } from "@/types/api";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { useAuthStore } from "@/stores/auth-store";

interface OrgOption {
  id: string;
  name: string;
  slug: string;
  user_count: number;
}

export default function AdminUsersPage() {
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
      .get("/admin/users/")
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
      await apiClient.post("/admin/users/", form);
      setForm({ full_name: "", email: "", password: "", role: "student" });
      setShowForm(false);
      toast.success("User created successfully");
      fetchUsers();
    } catch {
      toast.error("Failed to create user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!(await confirm({ message: "Are you sure you want to delete this user?", variant: "danger", confirmLabel: "Delete" }))) return;
    try {
      await apiClient.delete(`/admin/users/${userId}/`);
      toast.success("User deleted");
      fetchUsers();
    } catch {
      toast.error("Failed to delete user");
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await apiClient.put(`/admin/users/${userId}/`, { role: newRole });
      toast.success("Role updated");
      fetchUsers();
    } catch {
      toast.error("Failed to update role");
    }
  };

  const handleOrgChange = async (userId: string, newOrgId: string) => {
    try {
      await apiClient.put(`/admin/users/${userId}/`, { org_id: newOrgId });
      toast.success("Organization updated");
      fetchUsers();
    } catch {
      toast.error("Failed to update organization");
    }
  };

  const handleToggleActive = async (userId: string, isActive: boolean) => {
    try {
      await apiClient.put(`/admin/users/${userId}/`, { is_active: !isActive });
      fetchUsers();
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleToggleMethodist = async (userId: string, isMethodist: boolean) => {
    try {
      await apiClient.put(`/admin/users/${userId}/`, { is_methodist: !isMethodist });
      toast.success(!isMethodist ? "Methodist role granted" : "Methodist role revoked");
      fetchUsers();
    } catch {
      toast.error("Failed to update methodist status");
    }
  };

  const getOrgName = (orgId: string) => {
    const org = orgs.find((o) => o.id === orgId);
    return org?.name || orgId.slice(0, 8) + "...";
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Admin", href: "/admin" }, { label: "Users" }]} />
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Users</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {users.length} users{isSuperAdmin ? " across all organizations" : " in your organization"}
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">New User</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <input
                type="text"
                placeholder="Full Name"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="rounded-lg border border-slate-300 dark:border-white/10 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="rounded-lg border border-slate-300 dark:border-white/10 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="rounded-lg border border-slate-300 dark:border-white/10 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="rounded-lg border border-slate-300 dark:border-white/10 bg-transparent px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="admin">Admin</option>
              </select>
              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Creating..." : "Create User"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                  Cancel
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
                <tr className="border-b border-slate-200 dark:border-white/10 text-left text-xs font-medium uppercase tracking-wider text-slate-400">
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Methodist</th>
                  {isSuperAdmin && <th className="px-5 py-3">Organization</th>}
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Joined</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-50 dark:border-white/5 text-sm hover:bg-slate-50/50 dark:hover:bg-white/5">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-xs font-semibold text-white">
                          {u.full_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-900 dark:text-slate-100">{u.full_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-500 dark:text-slate-400">{u.email}</td>
                    <td className="px-5 py-4">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="rounded border border-transparent bg-transparent py-0.5 text-xs font-medium focus:border-indigo-300 focus:outline-none"
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
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            u.is_methodist
                              ? "bg-violet-50 dark:bg-violet-500/20 text-violet-600"
                              : "bg-slate-50 dark:bg-white/5 text-slate-400"
                          }`}
                        >
                          {u.is_methodist ? "Methodist" : "Regular"}
                        </button>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    {isSuperAdmin && (
                      <td className="px-5 py-4">
                        <select
                          value={u.org_id}
                          onChange={(e) => handleOrgChange(u.id, e.target.value)}
                          className="max-w-[160px] truncate rounded border border-transparent bg-transparent py-0.5 text-xs font-medium focus:border-indigo-300 focus:outline-none"
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
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          u.is_active
                            ? "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600"
                            : "bg-red-50 dark:bg-red-500/20 text-red-600"
                        }`}
                      >
                        {u.is_active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-400">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => handleDelete(u.id)}
                        className="rounded p-1 text-slate-300 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500"
                        title="Delete user"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
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

"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Trash2, UserPlus, Users } from "lucide-react";
import apiClient from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
      toast.error("Failed to load org members");
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
          ? "Member role updated"
          : "Member added to organization"
      );
      setEmail("");
      await load();
    } catch (err) {
      const anyErr = err as {
        response?: { status?: number; data?: { detail?: string } };
      };
      if (anyErr.response?.status === 404) {
        toast.error(
          "No user with that email exists. Ask them to register first."
        );
      } else {
        toast.error(anyErr.response?.data?.detail ?? "Failed to add member");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(member: Member) {
    if (
      !confirm(
        `Remove ${member.full_name} (${member.email}) from this organization? ` +
          `They will keep their account but lose access to this org's content.`
      )
    ) {
      return;
    }
    try {
      await apiClient.delete(`/admin/org-members/${member.user_id}`);
      toast.success("Member removed");
      await load();
    } catch (err) {
      const anyErr = err as {
        response?: { data?: { detail?: string } };
      };
      toast.error(anyErr.response?.data?.detail ?? "Failed to remove member");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          <Users className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Organization members
          </h1>
          <p className="text-sm text-slate-500">
            Add existing users to this organization or remove their access.
            Users must have already registered a GrassLMS account.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserPlus className="h-5 w-5 text-slate-400" aria-hidden="true" />
            Add member
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
                className="mb-1 block text-xs font-medium text-slate-600"
              >
                Email
              </label>
              <input
                id="member-email"
                type="email"
                required
                placeholder="teacher@school.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                disabled={submitting}
              />
            </div>
            <div className="sm:w-40">
              <label
                htmlFor="member-role"
                className="mb-1 block text-xs font-medium text-slate-600"
              >
                Role
              </label>
              <select
                id="member-role"
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm capitalize focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
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
              {submitting ? "Adding..." : "Add member"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Current members ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-slate-500">Loading...</p>
          ) : members.length === 0 ? (
            <p className="text-sm text-slate-500">No members yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {members.map((m) => (
                <li
                  key={m.user_id}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {m.full_name}
                    </p>
                    <p className="truncate text-xs text-slate-500">{m.email}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-600">
                    {m.role}
                  </span>
                  {!m.is_primary_org && (
                    <span
                      className="text-xs text-slate-400"
                      title="This org is not the user's primary/active org"
                    >
                      (secondary)
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemove(m)}
                    className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                    aria-label={`Remove ${m.full_name}`}
                    title="Remove from org"
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

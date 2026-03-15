"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import apiClient from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth-store";

interface Child {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
}

export default function ParentDashboard() {
  const user = useAuthStore((s) => s.user);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkEmail, setLinkEmail] = useState("");
  const [linking, setLinking] = useState(false);

  const fetchChildren = async () => {
    try {
      const { data } = await apiClient.get("/parent/children");
      setChildren(data);
    } catch {
      // parent might not have children yet
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchChildren(); }, []);

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkEmail) return;
    setLinking(true);
    try {
      await apiClient.post("/parent/children/link", { child_email: linkEmail });
      toast.success("Child linked successfully");
      setLinkEmail("");
      fetchChildren();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to link child");
    } finally {
      setLinking(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Welcome, {user?.full_name}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Monitor your children&apos;s learning progress
        </p>
      </div>

      {/* Link child */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Link a Child</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLink} className="flex gap-2">
            <input
              type="email"
              placeholder="Child's email address"
              value={linkEmail}
              onChange={(e) => setLinkEmail(e.target.value)}
              required
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-[#181818] dark:text-slate-200"
            />
            <button
              type="submit"
              disabled={linking}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {linking ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Link
            </button>
          </form>
        </CardContent>
      </Card>

      {/* Children */}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>
      ) : children.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <div className="mb-3 rounded-full bg-slate-100 p-3 dark:bg-white/10">
              <Users className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-500">No children linked yet</p>
            <p className="mt-1 text-xs text-slate-400">Enter your child&apos;s email above to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {children.map((child) => (
            <Link key={child.id} href={`/parent/children/${child.id}`}>
              <Card className="border-l-4 border-l-indigo-400 transition-shadow hover:shadow-md">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-lg font-bold text-white">
                    {child.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{child.full_name}</p>
                    <p className="text-xs text-slate-400">{child.email}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

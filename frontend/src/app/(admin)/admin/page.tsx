"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import apiClient from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  BookOpen,
  GraduationCap,
  DollarSign,
  ArrowRight,
  UserPlus,
  Plus,
  LinkIcon,
  Copy,
  Check,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "sonner";

interface Stats {
  total_users: number;
  total_courses: number;
  total_enrollments: number;
  active_students: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [copied, setCopied] = useState(false);
  const user = useAuthStore((s) => s.user);

  const inviteLink = typeof window !== "undefined"
    ? `${window.location.origin}/register?org=${user?.org_id}`
    : "";

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success("Invite link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    apiClient
      .get("/admin/dashboard")
      .then(({ data }) => setStats(data))
      .catch(() => {});
  }, []);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Overview of your organization
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/users">
            <Button variant="outline" size="sm">
              <UserPlus className="h-4 w-4" />
              Add User
            </Button>
          </Link>
          <Link href="/admin/courses">
            <Button size="sm">
              <Plus className="h-4 w-4" />
              New Course
            </Button>
          </Link>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-xl bg-indigo-50 p-3">
              <Users className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">Total Users</p>
              <p className="text-2xl font-bold text-slate-900">
                {stats?.total_users || 0}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-xl bg-emerald-50 p-3">
              <BookOpen className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">Courses</p>
              <p className="text-2xl font-bold text-slate-900">
                {stats?.total_courses || 0}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-xl bg-violet-50 p-3">
              <GraduationCap className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">Enrollments</p>
              <p className="text-2xl font-bold text-slate-900">
                {stats?.total_enrollments || 0}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-xl bg-amber-50 p-3">
              <DollarSign className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">MRR</p>
              <p className="text-2xl font-bold text-slate-900">$0</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invite Students */}
      <Card className="mb-8 border-indigo-100 bg-indigo-50/30">
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-100 p-2.5">
              <LinkIcon className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Invite Students</p>
              <p className="text-xs text-slate-500">
                Share this link so students can join your school
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <code className="hidden rounded-lg bg-white px-3 py-1.5 text-xs text-slate-600 shadow-sm sm:block">
              {inviteLink.length > 50 ? inviteLink.slice(0, 50) + "..." : inviteLink}
            </code>
            <Button size="sm" onClick={copyInviteLink} variant="outline">
              {copied ? (
                <><Check className="h-3.5 w-3.5 text-emerald-600" /> Copied</>
              ) : (
                <><Copy className="h-3.5 w-3.5" /> Copy Link</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Link href="/admin/users">
          <Card className="cursor-pointer hover:border-indigo-200 hover:shadow-md">
            <CardContent className="flex items-center justify-between p-5">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-slate-400" />
                <span className="text-sm font-medium text-slate-700">
                  Manage Users
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-300" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/courses">
          <Card className="cursor-pointer hover:border-indigo-200 hover:shadow-md">
            <CardContent className="flex items-center justify-between p-5">
              <div className="flex items-center gap-3">
                <BookOpen className="h-5 w-5 text-slate-400" />
                <span className="text-sm font-medium text-slate-700">
                  Manage Courses
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-300" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/analytics">
          <Card className="cursor-pointer hover:border-indigo-200 hover:shadow-md">
            <CardContent className="flex items-center justify-between p-5">
              <div className="flex items-center gap-3">
                <GraduationCap className="h-5 w-5 text-slate-400" />
                <span className="text-sm font-medium text-slate-700">
                  View Analytics
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-300" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}

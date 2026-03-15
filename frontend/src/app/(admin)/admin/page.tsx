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
  Sparkles,
  PlusCircle,
  BarChart3,
  X,
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
  const [onboardingDismissed, setOnboardingDismissed] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("admin-onboarding-dismissed") === "true";
  });
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
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

      {!onboardingDismissed &&
        stats &&
        (stats.total_courses === 0 || stats.total_users === 0) && (
          <Card className="mb-8 border-l-4 border-l-indigo-500 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-slate-100">
                <Sparkles className="h-5 w-5 text-indigo-500" />
                Getting Started
              </CardTitle>
              <button
                onClick={() => {
                  setOnboardingDismissed(true);
                  localStorage.setItem("admin-onboarding-dismissed", "true");
                }}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="h-4 w-4" />
              </button>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 pb-5">
              <Link
                href="/admin/courses"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
              >
                <PlusCircle className="h-4 w-4 text-indigo-500" />
                Create your first course
              </Link>
              <Link
                href="/admin/users"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
              >
                <UserPlus className="h-4 w-4 text-indigo-500" />
                Invite students
              </Link>
              <Link
                href="/admin/analytics"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
              >
                <BarChart3 className="h-4 w-4 text-indigo-500" />
                View analytics
              </Link>
            </CardContent>
          </Card>
        )}

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-indigo-400 hover:shadow-md">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-xl bg-indigo-100 dark:bg-indigo-500/20 p-3">
              <Users className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Users</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {stats?.total_users || 0}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-400 hover:shadow-md">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-xl bg-emerald-100 dark:bg-emerald-500/20 p-3">
              <BookOpen className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Courses</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {stats?.total_courses || 0}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-violet-400 hover:shadow-md">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-xl bg-violet-100 dark:bg-violet-500/20 p-3">
              <GraduationCap className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Enrollments</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {stats?.total_enrollments || 0}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-400 hover:shadow-md">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-xl bg-amber-100 dark:bg-amber-500/20 p-3">
              <DollarSign className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">MRR</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">$0</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invite Students */}
      <Card className="mb-8 border-indigo-100 bg-indigo-50/30 dark:border-indigo-500/20 dark:bg-indigo-500/10">
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-100 dark:bg-indigo-500/20 p-2.5">
              <LinkIcon className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Invite Students</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Share this link so students can join your school
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <code className="hidden rounded-lg bg-white px-3 py-1.5 text-xs text-slate-600 shadow-sm sm:block dark:bg-white/10 dark:text-slate-300">
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
          <Card className="cursor-pointer border-l-4 border-l-indigo-400 hover:shadow-md">
            <CardContent className="flex items-center justify-between p-5">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-indigo-500" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Manage Users
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-300 dark:text-slate-600" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/courses">
          <Card className="cursor-pointer border-l-4 border-l-emerald-400 hover:shadow-md">
            <CardContent className="flex items-center justify-between p-5">
              <div className="flex items-center gap-3">
                <BookOpen className="h-5 w-5 text-emerald-500" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Manage Courses
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-300 dark:text-slate-600" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/analytics">
          <Card className="cursor-pointer border-l-4 border-l-violet-400 hover:shadow-md">
            <CardContent className="flex items-center justify-between p-5">
              <div className="flex items-center gap-3">
                <GraduationCap className="h-5 w-5 text-violet-500" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  View Analytics
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-300 dark:text-slate-600" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}

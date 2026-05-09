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
 ClipboardList,
 Inbox,
 TrendingUp,
 Clock,
 Library,
 HelpCircle,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { TeacherOnboarding } from "@/components/onboarding/teacher-onboarding";
import { toast } from "sonner";
import { OnboardingTour, startOnboardingTour } from "@/components/onboarding-tour";

interface Stats {
 total_users: number;
 total_courses: number;
 total_enrollments: number;
 active_students: number;
}

interface TeacherStats {
 my_courses: number;
 my_students: number;
 to_review: number;
 avg_score: number;
 recent_submissions: {
 id: string;
 assignment_title: string;
 student_name: string;
 submitted_at: string;
 status: string;
 score: number | null;
 }[];
}

export default function AdminDashboardPage() {
 const [stats, setStats] = useState<Stats | null>(null);
 const [teacherStats, setTeacherStats] = useState<TeacherStats | null>(null);
 const [copied, setCopied] = useState(false);
 const [onboardingDismissed, setOnboardingDismissed] = useState(() => {
 if (typeof window === "undefined") return true;
 return localStorage.getItem("admin-onboarding-dismissed") === "true";
 });
 const user = useAuthStore((s) => s.user);
 const isTeacher = user?.role === "teacher";

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
 if (isTeacher) {
 apiClient.get("/admin/teacher-stats").then(({ data }) => setTeacherStats(data)).catch(() => {});
 } else {
 apiClient.get("/admin/dashboard").then(({ data }) => setStats(data)).catch(() => {});
 }
 }, [isTeacher]);

 if (isTeacher) {
 return (
 <div className="mx-auto max-w-6xl">
 <div className="mb-8">
 <h1 className="text-2xl font-bold text-text ">Teacher Dashboard</h1>
 <p className="mt-1 text-sm text-text-muted ">
 Welcome back, {user?.full_name}
 </p>
 </div>

 <div className="mb-6">
 <TeacherOnboarding />
 </div>

 <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
 <Card className="border-l-4 border-l-blue-400 hover:shadow-md">
 <CardContent className="flex items-center gap-4 p-6">
 <div className="rounded-lg bg-info-soft p-3">
 <BookOpen className="h-5 w-5 text-info-fg" />
 </div>
 <div>
 <p className="text-xs font-medium text-text-muted ">My Courses</p>
 <p className="text-2xl font-bold text-text ">
 {teacherStats?.my_courses || 0}
 </p>
 </div>
 </CardContent>
 </Card>

 <Card className="border-l-4 border-l-emerald-400 hover:shadow-md">
 <CardContent className="flex items-center gap-4 p-6">
 <div className="rounded-lg bg-primary-soft p-3">
 <Users className="h-5 w-5 text-primary" />
 </div>
 <div>
 <p className="text-xs font-medium text-text-muted ">My Students</p>
 <p className="text-2xl font-bold text-text ">
 {teacherStats?.my_students || 0}
 </p>
 </div>
 </CardContent>
 </Card>

 <Card className="border-l-4 border-l-orange-400 hover:shadow-md">
 <CardContent className="flex items-center gap-4 p-6">
 <div className="rounded-lg bg-coral-300 p-3">
 <Inbox className="h-5 w-5 text-coral-700" />
 </div>
 <div>
 <p className="text-xs font-medium text-text-muted ">To Review</p>
 <p className="text-2xl font-bold text-text ">
 {teacherStats?.to_review || 0}
 </p>
 </div>
 </CardContent>
 </Card>

 <Card className="border-l-4 border-l-emerald-400 hover:shadow-md">
 <CardContent className="flex items-center gap-4 p-6">
 <div className="rounded-lg bg-primary-soft p-3">
 <TrendingUp className="h-5 w-5 text-primary" />
 </div>
 <div>
 <p className="text-xs font-medium text-text-muted ">Avg Score</p>
 <p className="text-2xl font-bold text-text ">
 {teacherStats?.avg_score || 0}
 </p>
 </div>
 </CardContent>
 </Card>
 </div>

 {/* Quick Insights */}
 {teacherStats && (
 <Card className="mb-8 border-l-4 border-l-violet-400">
 <CardHeader className="pb-3">
 <CardTitle className="flex items-center gap-2 text-base">
 <Sparkles className="h-4 w-4 text-text" />
 Quick Insights
 </CardTitle>
 </CardHeader>
 <CardContent className="space-y-3">
 {teacherStats.to_review > 0 && (
 <div className="flex items-start gap-3 rounded-lg bg-coral-50 p-3 ">
 <Inbox className="mt-0.5 h-4 w-4 shrink-0 text-coral-700" />
 <p className="text-sm text-ink-700 ">
 <span className="font-semibold">{teacherStats.to_review} submission{teacherStats.to_review !== 1 ? "s" : ""}</span>{" "}
 waiting for review.{" "}
 <Link href="/admin/review" className="font-medium text-coral-700 hover:underline ">
 Review now
 </Link>
 </p>
 </div>
 )}
 {teacherStats.my_students > 0 && teacherStats.avg_score > 0 && (
 <div className="flex items-start gap-3 rounded-lg bg-success-soft p-3 ">
 <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
 <p className="text-sm text-ink-700 ">
 Average score across your students is{" "}
 <span className="font-semibold">{teacherStats.avg_score}%</span>.
 {teacherStats.avg_score >= 80
 ? " Great job — your students are performing well!"
 : teacherStats.avg_score >= 60
 ? " Consider reviewing topics where students struggle."
 : " Some students may need extra support."}
 </p>
 </div>
 )}
 {teacherStats.my_courses === 0 && (
 <div className="flex items-start gap-3 rounded-lg bg-info-soft p-3 ">
 <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-info-fg" />
 <p className="text-sm text-ink-700 ">
 You haven&apos;t created any courses yet.{" "}
 <Link href="/admin/courses" className="font-medium text-info-fg hover:underline ">
 Create your first course
 </Link>
 </p>
 </div>
 )}
 {teacherStats.my_students === 0 && teacherStats.my_courses > 0 && (
 <div className="flex items-start gap-3 rounded-lg bg-info-soft p-3 ">
 <Users className="mt-0.5 h-4 w-4 shrink-0 text-info-fg" />
 <p className="text-sm text-ink-700 ">
 No students enrolled yet. Share your invite link to get started.
 </p>
 </div>
 )}
 {teacherStats.to_review === 0 && teacherStats.my_students > 0 && (
 <div className="flex items-start gap-3 rounded-lg bg-success-soft p-3 ">
 <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
 <p className="text-sm text-ink-700 ">
 All caught up — no submissions pending review.
 </p>
 </div>
 )}
 {teacherStats.recent_submissions && teacherStats.recent_submissions.length > 0 && (
 <div className="flex items-start gap-3 rounded-lg bg-surface-2 p-3 ">
 <Clock className="mt-0.5 h-4 w-4 shrink-0 text-text-subtle" />
 <p className="text-sm text-ink-700 ">
 Last submission from{" "}
 <span className="font-semibold">{teacherStats.recent_submissions[0].student_name}</span>{" "}
 on {new Date(teacherStats.recent_submissions[0].submitted_at).toLocaleDateString()}.
 </p>
 </div>
 )}
 </CardContent>
 </Card>
 )}

 {/* Recent Submissions */}
 {teacherStats?.recent_submissions && teacherStats.recent_submissions.length > 0 && (
 <Card className="mb-8 border-l-4 border-l-green-400">
 <CardHeader>
 <CardTitle className="text-base">Recent Submissions</CardTitle>
 </CardHeader>
 <CardContent className="space-y-3">
 {teacherStats.recent_submissions.map((sub) => (
 <div
 key={sub.id}
 className="flex items-center gap-3 rounded-lg border border-border p-3 "
 >
 <div className={`rounded-lg p-2 ${
 sub.status === "graded"
 ? "bg-primary-soft "
 : sub.status === "late"
 ? "bg-coral-300 "
 : "bg-info-soft "
 }`}>
 <ClipboardList className={`h-4 w-4 ${
 sub.status === "graded"
 ? "text-primary "
 : sub.status === "late"
 ? "text-coral-700 "
 : "text-info-fg "
 }`} />
 </div>
 <div className="min-w-0 flex-1">
 <p className="truncate text-sm font-medium text-text ">
 {sub.assignment_title}
 </p>
 <p className="text-xs text-text-muted ">
 {sub.student_name} &middot; {new Date(sub.submitted_at).toLocaleDateString()}
 </p>
 </div>
 {sub.score != null ? (
 <span className="rounded-pill bg-primary-soft px-2 py-0.5 text-xs font-medium text-success-fg ">
 {sub.score}
 </span>
 ) : (
 <span className="rounded-pill bg-ink-100 px-2 py-0.5 text-xs font-medium text-text-muted ">
 {sub.status}
 </span>
 )}
 </div>
 ))}
 </CardContent>
 </Card>
 )}

 {/* Quick Actions */}
 <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
 <Link href="/admin/content-library">
 <Card className="cursor-pointer border-l-4 border-l-emerald-400 hover:shadow-md">
 <CardContent className="flex items-center justify-between p-5">
 <div className="flex items-center gap-3">
 <Library className="h-5 w-5 text-primary" />
 <span className="text-sm font-medium text-ink-700 ">Browse Templates</span>
 </div>
 <ArrowRight className="h-4 w-4 text-ink-300 " />
 </CardContent>
 </Card>
 </Link>
 <Link href="/admin/courses">
 <Card className="cursor-pointer border-l-4 border-l-blue-400 hover:shadow-md">
 <CardContent className="flex items-center justify-between p-5">
 <div className="flex items-center gap-3">
 <BookOpen className="h-5 w-5 text-info-fg" />
 <span className="text-sm font-medium text-ink-700 ">My Courses</span>
 </div>
 <ArrowRight className="h-4 w-4 text-ink-300 " />
 </CardContent>
 </Card>
 </Link>
 <Link href="/admin/assignments">
 <Card className="cursor-pointer border-l-4 border-l-green-400 hover:shadow-md">
 <CardContent className="flex items-center justify-between p-5">
 <div className="flex items-center gap-3">
 <ClipboardList className="h-5 w-5 text-primary" />
 <span className="text-sm font-medium text-ink-700 ">Assignments</span>
 </div>
 <ArrowRight className="h-4 w-4 text-ink-300 " />
 </CardContent>
 </Card>
 </Link>
 <Link href="/admin/review">
 <Card className="cursor-pointer border-l-4 border-l-orange-400 hover:shadow-md">
 <CardContent className="flex items-center justify-between p-5">
 <div className="flex items-center gap-3">
 <Inbox className="h-5 w-5 text-coral-700" />
 <span className="text-sm font-medium text-ink-700 ">Review Queue</span>
 </div>
 <ArrowRight className="h-4 w-4 text-ink-300 " />
 </CardContent>
 </Card>
 </Link>
 </div>
 </div>
 );
 }

 return (
 <div className="mx-auto max-w-6xl">
 <OnboardingTour />
 <div className="mb-8 flex items-center justify-between">
 <div>
 <h1 className="text-2xl font-bold text-text ">Admin Dashboard</h1>
 <p className="mt-1 text-sm text-text-muted ">
 Overview of your organization
 </p>
 </div>
 <div className="flex gap-2">
 <Button
 variant="ghost"
 size="sm"
 onClick={startOnboardingTour}
 title="Replay the onboarding tour"
 >
 <HelpCircle className="h-4 w-4" />
 Tour
 </Button>
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
 <Card className="mb-8 border-l-4 border-l-green-500 hover:shadow-md">
 <CardHeader className="flex flex-row items-center justify-between pb-2">
 <CardTitle className="flex items-center gap-2 text-base font-semibold text-text ">
 <Sparkles className="h-5 w-5 text-primary" />
 Getting Started
 </CardTitle>
 <button
 onClick={() => {
 setOnboardingDismissed(true);
 localStorage.setItem("admin-onboarding-dismissed", "true");
 }}
 className="rounded-md p-1 text-text-subtle hover:bg-ink-100 hover:text-text-muted "
 >
 <X className="h-4 w-4" />
 </button>
 </CardHeader>
 <CardContent className="flex flex-col gap-2 pb-5">
 <Link
 href="/admin/courses"
 className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink-700 hover:bg-success-soft "
 >
 <PlusCircle className="h-4 w-4 text-primary" />
 Create your first course
 </Link>
 <Link
 href="/admin/users"
 className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink-700 hover:bg-success-soft "
 >
 <UserPlus className="h-4 w-4 text-primary" />
 Invite students
 </Link>
 <Link
 href="/admin/analytics"
 className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink-700 hover:bg-success-soft "
 >
 <BarChart3 className="h-4 w-4 text-primary" />
 View analytics
 </Link>
 </CardContent>
 </Card>
 )}

 <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
 <Card className="border-l-4 border-l-green-400 hover:shadow-md">
 <CardContent className="flex items-center gap-4 p-6">
 <div className="rounded-lg bg-primary-soft p-3">
 <Users className="h-5 w-5 text-primary" />
 </div>
 <div>
 <p className="text-xs font-medium text-text-muted ">Total Users</p>
 <p className="text-2xl font-bold text-text ">
 {stats?.total_users || 0}
 </p>
 </div>
 </CardContent>
 </Card>

 <Card className="border-l-4 border-l-emerald-400 hover:shadow-md">
 <CardContent className="flex items-center gap-4 p-6">
 <div className="rounded-lg bg-primary-soft p-3">
 <BookOpen className="h-5 w-5 text-primary" />
 </div>
 <div>
 <p className="text-xs font-medium text-text-muted ">Courses</p>
 <p className="text-2xl font-bold text-text ">
 {stats?.total_courses || 0}
 </p>
 </div>
 </CardContent>
 </Card>

 <Card className="border-l-4 border-l-emerald-400 hover:shadow-md">
 <CardContent className="flex items-center gap-4 p-6">
 <div className="rounded-lg bg-primary-soft p-3">
 <GraduationCap className="h-5 w-5 text-primary" />
 </div>
 <div>
 <p className="text-xs font-medium text-text-muted ">Enrollments</p>
 <p className="text-2xl font-bold text-text ">
 {stats?.total_enrollments || 0}
 </p>
 </div>
 </CardContent>
 </Card>
 </div>

 {/* Invite Students */}
 <Card className="mb-8 border-primary-soft bg-success-soft/30 ">
 <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
 <div className="flex items-center gap-3">
 <div className="rounded-lg bg-primary-soft p-2.5">
 <LinkIcon className="h-5 w-5 text-primary" />
 </div>
 <div>
 <p className="text-sm font-semibold text-text ">Invite Students</p>
 <p className="text-xs text-text-muted ">
 Share this link so students can join your school
 </p>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <code className="hidden rounded-lg bg-paper-2 px-3 py-1.5 text-xs text-text-muted shadow-sm sm:block ">
 {inviteLink.length > 50 ? inviteLink.slice(0, 50) + "..." : inviteLink}
 </code>
 <Button size="sm" onClick={copyInviteLink} variant="outline">
 {copied ? (
 <><Check className="h-3.5 w-3.5 text-primary" /> Copied</>
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
 <Card className="cursor-pointer border-l-4 border-l-green-400 hover:shadow-md">
 <CardContent className="flex items-center justify-between p-5">
 <div className="flex items-center gap-3">
 <Users className="h-5 w-5 text-primary" />
 <span className="text-sm font-medium text-ink-700 ">
 Manage Users
 </span>
 </div>
 <ArrowRight className="h-4 w-4 text-ink-300 " />
 </CardContent>
 </Card>
 </Link>
 <Link href="/admin/courses">
 <Card className="cursor-pointer border-l-4 border-l-emerald-400 hover:shadow-md">
 <CardContent className="flex items-center justify-between p-5">
 <div className="flex items-center gap-3">
 <BookOpen className="h-5 w-5 text-primary" />
 <span className="text-sm font-medium text-ink-700 ">
 Manage Courses
 </span>
 </div>
 <ArrowRight className="h-4 w-4 text-ink-300 " />
 </CardContent>
 </Card>
 </Link>
 <Link href="/admin/analytics">
 <Card className="cursor-pointer border-l-4 border-l-emerald-400 hover:shadow-md">
 <CardContent className="flex items-center justify-between p-5">
 <div className="flex items-center gap-3">
 <GraduationCap className="h-5 w-5 text-primary" />
 <span className="text-sm font-medium text-ink-700 ">
 View Analytics
 </span>
 </div>
 <ArrowRight className="h-4 w-4 text-ink-300 " />
 </CardContent>
 </Card>
 </Link>
 </div>
 </div>
 );
}

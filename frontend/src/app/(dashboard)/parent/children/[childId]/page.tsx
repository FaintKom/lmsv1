"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import apiClient from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, BookOpen, Trophy, Flame, Loader2, TrendingUp, CheckCircle } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";

interface ChildProgress {
 enrollments: {
 course_title: string;
 progress_percent: number;
 enrolled_at: string | null;
 completed_at: string | null;
 }[];
 total_courses: number;
 completed_courses: number;
 avg_progress: number;
 current_streak: number;
 total_xp: number;
}

interface Grade {
 assignment_title: string;
 max_score: number;
 score: number | null;
 status: string;
 submitted_at: string;
 feedback: string | null;
}

export default function ChildDetailPage() {
 const params = useParams();
 const childId = params.childId as string;
 const { t } = useTranslation();
 const [progress, setProgress] = useState<ChildProgress | null>(null);
 const [grades, setGrades] = useState<Grade[]>([]);
 const [loading, setLoading] = useState(true);
 const [tab, setTab] = useState<"progress" | "grades">("progress");

 useEffect(() => {
 Promise.all([
 apiClient.get(`/parent/children/${childId}/progress`).then(({ data }) => data),
 apiClient.get(`/parent/children/${childId}/grades`).then(({ data }) => data),
 ])
 .then(([p, g]) => { setProgress(p); setGrades(g); })
 .catch(() => {})
 .finally(() => setLoading(false));
 }, [childId]);

 if (loading) {
 return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
 }

 return (
 <div className="mx-auto max-w-4xl space-y-6 p-6">
 <Link href="/parent" className="flex items-center gap-1 text-sm text-primary hover:text-success-fg">
 <ArrowLeft className="h-4 w-4" /> {t("parent.backToChildren")}
 </Link>

 {/* Stats */}
 {progress && (
 <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
 <Card className="border-l-4 border-l-green-400">
 <CardContent className="flex items-center gap-3 p-4">
 <div className="rounded-lg bg-primary-soft p-2 ">
 <BookOpen className="h-4 w-4 text-primary " />
 </div>
 <div>
 <p className="text-xs text-text-muted">{t("parent.courses")}</p>
 <p className="text-xl font-bold text-text ">{progress.total_courses}</p>
 </div>
 </CardContent>
 </Card>
 <Card className="border-l-4 border-l-emerald-400">
 <CardContent className="flex items-center gap-3 p-4">
 <div className="rounded-lg bg-primary-soft p-2 ">
 <CheckCircle className="h-4 w-4 text-primary " />
 </div>
 <div>
 <p className="text-xs text-text-muted">{t("parent.completed")}</p>
 <p className="text-xl font-bold text-text ">{progress.completed_courses}</p>
 </div>
 </CardContent>
 </Card>
 <Card className="border-l-4 border-l-emerald-400">
 <CardContent className="flex items-center gap-3 p-4">
 <div className="rounded-lg bg-primary-soft p-2 ">
 <TrendingUp className="h-4 w-4 text-primary " />
 </div>
 <div>
 <p className="text-xs text-text-muted">{t("parent.avgProgress")}</p>
 <p className="text-xl font-bold text-text ">{progress.avg_progress}%</p>
 </div>
 </CardContent>
 </Card>
 <Card className="border-l-4 border-l-orange-400">
 <CardContent className="flex items-center gap-3 p-4">
 <div className="rounded-lg bg-coral-300 p-2 ">
 <Flame className="h-4 w-4 text-coral-700 " />
 </div>
 <div>
 <p className="text-xs text-text-muted">{t("parent.streak")}</p>
 <p className="text-xl font-bold text-text ">{progress.current_streak} days</p>
 </div>
 </CardContent>
 </Card>
 </div>
 )}

 {/* Tabs */}
 <div className="flex gap-1 rounded-lg bg-ink-100 p-1 ">
 {(["progress", "grades"] as const).map((tabKey) => (
 <button
 key={tabKey}
 onClick={() => setTab(tabKey)}
 className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
 tab === tabKey
 ? "bg-paper-2 text-ink-700 shadow-sm "
 : "text-text-muted hover:text-ink-700 "
 }`}
 >
 {t(`parent.${tabKey}`)}
 </button>
 ))}
 </div>

 {/* Progress tab */}
 {tab === "progress" && progress && (
 <div className="space-y-3">
 {progress.enrollments.length === 0 ? (
 <Card><CardContent className="py-8 text-center text-sm text-text-subtle">{t("parent.noCourses")}</CardContent></Card>
 ) : (
 progress.enrollments.map((e, i) => (
 <Card key={i}>
 <CardContent className="flex items-center justify-between p-4">
 <div>
 <p className="font-medium text-ink-700 ">{e.course_title}</p>
 <p className="text-xs text-text-subtle">
 {e.completed_at ? "Completed" : `${Math.round(e.progress_percent)}% complete`}
 </p>
 </div>
 <div className="h-2 w-24 overflow-hidden rounded-pill bg-ink-100 ">
 <div
 className={`h-full rounded-pill ${e.completed_at ? "bg-primary" : "bg-primary"}`}
 style={{ width: `${e.progress_percent}%` }}
 />
 </div>
 </CardContent>
 </Card>
 ))
 )}
 </div>
 )}

 {/* Grades tab */}
 {tab === "grades" && (
 <div className="space-y-3">
 {grades.length === 0 ? (
 <Card><CardContent className="py-8 text-center text-sm text-text-subtle">{t("parent.noGrades")}</CardContent></Card>
 ) : (
 grades.map((g, i) => (
 <Card key={i}>
 <CardContent className="p-4">
 <div className="flex items-center justify-between">
 <div>
 <p className="font-medium text-ink-700 ">{g.assignment_title}</p>
 <p className="text-xs text-text-subtle">
 {new Date(g.submitted_at).toLocaleDateString()} &middot; {g.status}
 </p>
 </div>
 <div className="text-right">
 {g.score !== null ? (
 <span className={`text-lg font-bold ${
 (g.score / g.max_score) >= 0.8 ? "text-primary" :
 (g.score / g.max_score) >= 0.6 ? "text-warning-fg" : "text-danger-fg"
 }`}>
 {g.score}/{g.max_score}
 </span>
 ) : (
 <span className="text-sm text-text-subtle">Pending</span>
 )}
 </div>
 </div>
 {g.feedback && (
 <p className="mt-2 rounded-lg bg-surface-2 p-2 text-xs text-text-muted ">
 {g.feedback}
 </p>
 )}
 </CardContent>
 </Card>
 ))
 )}
 </div>
 )}
 </div>
 );
}

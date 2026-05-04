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
    return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-green-500" /></div>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <Link href="/parent" className="flex items-center gap-1 text-sm text-green-600 hover:text-green-700">
        <ArrowLeft className="h-4 w-4" /> {t("parent.backToChildren")}
      </Link>

      {/* Stats */}
      {progress && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card className="border-l-4 border-l-green-400">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-xl bg-green-100 p-2 dark:bg-green-500/20">
                <BookOpen className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-ink-500">{t("parent.courses")}</p>
                <p className="text-xl font-bold text-ink-900 dark:text-ink-100">{progress.total_courses}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-400">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-xl bg-green-100 p-2 dark:bg-green-500/20">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-ink-500">{t("parent.completed")}</p>
                <p className="text-xl font-bold text-ink-900 dark:text-ink-100">{progress.completed_courses}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-400">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-xl bg-green-100 p-2 dark:bg-green-500/20">
                <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-ink-500">{t("parent.avgProgress")}</p>
                <p className="text-xl font-bold text-ink-900 dark:text-ink-100">{progress.avg_progress}%</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-sun-400">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-xl bg-sun-100 p-2 dark:bg-sun-500/20">
                <Flame className="h-4 w-4 text-sun-500 dark:text-sun-400" />
              </div>
              <div>
                <p className="text-xs text-ink-500">{t("parent.streak")}</p>
                <p className="text-xl font-bold text-ink-900 dark:text-ink-100">{progress.current_streak} days</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-ink-100 p-1 dark:bg-white/5">
        {(["progress", "grades"] as const).map((tabKey) => (
          <button
            key={tabKey}
            onClick={() => setTab(tabKey)}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === tabKey
                ? "bg-white text-ink-900 shadow-sm dark:bg-[#232323] dark:text-ink-200"
                : "text-ink-500 hover:text-ink-700 dark:text-ink-400"
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
            <Card><CardContent className="py-8 text-center text-sm text-ink-400">{t("parent.noCourses")}</CardContent></Card>
          ) : (
            progress.enrollments.map((e, i) => (
              <Card key={i}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium text-ink-700 dark:text-ink-300">{e.course_title}</p>
                    <p className="text-xs text-ink-400">
                      {e.completed_at ? "Completed" : `${Math.round(e.progress_percent)}% complete`}
                    </p>
                  </div>
                  <div className="h-2 w-24 overflow-hidden rounded-full bg-ink-100 dark:bg-white/10">
                    <div
                      className={`h-full rounded-full ${e.completed_at ? "bg-green-500" : "bg-green-500"}`}
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
            <Card><CardContent className="py-8 text-center text-sm text-ink-400">{t("parent.noGrades")}</CardContent></Card>
          ) : (
            grades.map((g, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-ink-700 dark:text-ink-300">{g.assignment_title}</p>
                      <p className="text-xs text-ink-400">
                        {new Date(g.submitted_at).toLocaleDateString()} &middot; {g.status}
                      </p>
                    </div>
                    <div className="text-right">
                      {g.score !== null ? (
                        <span className={`text-lg font-bold ${
                          (g.score / g.max_score) >= 0.8 ? "text-green-600" :
                          (g.score / g.max_score) >= 0.6 ? "text-sun-500" : "text-coral-500"
                        }`}>
                          {g.score}/{g.max_score}
                        </span>
                      ) : (
                        <span className="text-sm text-ink-400">Pending</span>
                      )}
                    </div>
                  </div>
                  {g.feedback && (
                    <p className="mt-2 rounded-lg bg-ink-50 p-2 text-xs text-ink-700 dark:bg-white/5 dark:text-ink-400">
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

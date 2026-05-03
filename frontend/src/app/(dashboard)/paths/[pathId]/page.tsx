"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import apiClient from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle, Lock, BookOpen, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface PathStep {
  id: string;
  course_id: string;
  course_title: string;
  sort_order: number;
  is_required: boolean;
  completed: boolean;
}

interface PathDetail {
  id: string;
  title: string;
  description: string;
  is_published: boolean;
  enrolled: boolean;
  current_step: number;
  steps: PathStep[];
}

export default function PathDetailPage() {
  const params = useParams();
  const pathId = params.pathId as string;
  const [path, setPath] = useState<PathDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get(`/learning-paths/${pathId}`)
      .then(({ data }) => setPath(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [pathId]);

  const handleEnroll = async () => {
    try {
      await apiClient.post(`/learning-paths/${pathId}/enroll`);
      toast.success("Enrolled!");
      const { data } = await apiClient.get(`/learning-paths/${pathId}`);
      setPath(data);
    } catch {
      toast.error("Failed to enroll");
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
      </div>
    );
  }

  if (!path) {
    return (
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-ink-500 dark:text-ink-400">Learning path not found.</p>
        <Link href="/paths" className="mt-2 inline-flex items-center gap-1 text-sm text-green-600 hover:text-green-700">
          <ArrowLeft className="h-3 w-3" /> Back to paths
        </Link>
      </div>
    );
  }

  const completedCount = path.steps.filter((s) => s.completed).length;
  const progress = path.steps.length > 0 ? Math.round((completedCount / path.steps.length) * 100) : 0;

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/paths"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-ink-500 hover:text-ink-700 dark:text-ink-400 dark:hover:text-ink-300"
      >
        <ArrowLeft className="h-4 w-4" /> Back to learning paths
      </Link>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle as="h1" className="text-xl">{path.title}</CardTitle>
          {path.description && (
            <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{path.description}</p>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="h-3 rounded-full bg-ink-200 dark:bg-white/10">
                <div
                  className="h-3 rounded-full bg-green-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <span className="text-sm font-medium text-ink-700 dark:text-ink-400">
              {completedCount}/{path.steps.length} completed
            </span>
          </div>
          {!path.enrolled && (
            <Button className="mt-4" onClick={handleEnroll}>
              Enroll in this path
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Steps timeline */}
      <div className="space-y-0">
        {path.steps.map((step, idx) => {
          const isUnlocked = idx === 0 || path.steps[idx - 1].completed || !step.is_required;
          const isCurrent = path.enrolled && !step.completed && isUnlocked;

          return (
            <div key={step.id} className="relative flex gap-4">
              {/* Timeline line */}
              <div className="flex flex-col items-center">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                  step.completed
                    ? "border-green-500 bg-green-100 dark:bg-green-500/20"
                    : isCurrent
                    ? "border-green-500 bg-green-100 dark:bg-green-500/20"
                    : "border-ink-300 bg-ink-100 dark:border-white/20 dark:bg-white/5"
                }`}>
                  {step.completed ? (
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  ) : isUnlocked ? (
                    <BookOpen className={`h-5 w-5 ${isCurrent ? "text-green-600 dark:text-green-400" : "text-ink-400"}`} />
                  ) : (
                    <Lock className="h-4 w-4 text-ink-400 dark:text-ink-500" />
                  )}
                </div>
                {idx < path.steps.length - 1 && (
                  <div className={`w-0.5 flex-1 min-h-[24px] ${
                    step.completed ? "bg-green-300 dark:bg-green-500/40" : "bg-ink-200 dark:bg-white/10"
                  }`} />
                )}
              </div>

              {/* Step card */}
              <div className="mb-4 flex-1 pb-2">
                <Card className={`${
                  isCurrent ? "border-green-300 shadow-sm dark:border-green-500/40" : ""
                } ${step.completed ? "opacity-75" : ""}`}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">
                          {step.course_title}
                        </h3>
                        {!step.is_required && (
                          <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] text-ink-500 dark:bg-white/10 dark:text-ink-400">
                            Optional
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-ink-500 dark:text-ink-400">
                        Step {idx + 1}
                        {step.completed && " — Completed"}
                      </p>
                    </div>
                    {isUnlocked && !step.completed && (
                      <Link href={`/courses/${step.course_id}`}>
                        <Button size="sm" variant={isCurrent ? "default" : "outline"}>
                          {isCurrent ? "Start" : "View"} <ArrowRight className="ml-1 h-3 w-3" />
                        </Button>
                      </Link>
                    )}
                    {step.completed && (
                      <Link href={`/courses/${step.course_id}`}>
                        <Button size="sm" variant="ghost">
                          Review <ArrowRight className="ml-1 h-3 w-3" />
                        </Button>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

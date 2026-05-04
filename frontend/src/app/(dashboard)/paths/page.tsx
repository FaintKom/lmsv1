"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import apiClient from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Route, ArrowRight, CheckCircle, Lock } from "lucide-react";
import { toast } from "sonner";

interface PathItem {
  id: string;
  title: string;
  description: string;
  is_published: boolean;
  step_count: number;
  enrolled: boolean;
  current_step: number;
  created_at: string;
}

export default function PathsPage() {
  const [paths, setPaths] = useState<PathItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get("/learning-paths/")
      .then(({ data }) => setPaths(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleEnroll = async (pathId: string) => {
    try {
      await apiClient.post(`/learning-paths/${pathId}/enroll`);
      toast.success("Enrolled in learning path!");
      // Refresh
      const { data } = await apiClient.get("/learning-paths/");
      setPaths(data);
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

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-ink-900 dark:text-ink-100">Learning Paths</h1>
        <p className="mt-1 text-base text-ink-500 dark:text-ink-400">
          Follow structured course sequences to master a topic
        </p>
      </div>

      {paths.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <div className="mb-4 rounded-full bg-ink-100 p-4 dark:bg-white/10">
              <Route className="h-8 w-8 text-ink-400 dark:text-ink-500" />
            </div>
            <h3 className="mb-1 text-lg font-semibold text-ink-700 dark:text-ink-300">
              No learning paths available
            </h3>
            <p className="text-base text-ink-500 dark:text-ink-400">
              Check back later for structured course sequences.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {paths.map((p) => {
            const progress = p.step_count > 0 ? Math.round((p.current_step / p.step_count) * 100) : 0;
            return (
              <Card key={p.id} className="border-l-4 border-l-green-400 transition-shadow hover:shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="rounded-xl bg-green-100 p-3 dark:bg-green-500/20">
                        <Route className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-ink-900 dark:text-ink-100">{p.title}</h3>
                        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
                          {p.description || "No description"}
                        </p>
                        <p className="mt-2 text-xs text-ink-400 dark:text-ink-500">
                          {p.step_count} course{p.step_count !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {p.enrolled ? (
                        <>
                          <Link href={`/paths/${p.id}`}>
                            <Button size="sm" variant="outline">
                              Continue <ArrowRight className="ml-1 h-3 w-3" />
                            </Button>
                          </Link>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 rounded-full bg-ink-200 dark:bg-white/10">
                              <div
                                className="h-2 rounded-full bg-green-500"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-xs text-ink-500 dark:text-ink-400">{progress}%</span>
                          </div>
                        </>
                      ) : (
                        <Button size="sm" onClick={() => handleEnroll(p.id)}>
                          Enroll
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

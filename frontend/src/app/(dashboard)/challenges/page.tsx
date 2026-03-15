"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import apiClient from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Code, Clock, ArrowRight } from "lucide-react";
import type { CodeChallenge } from "@/types/api";

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<CodeChallenge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get("/sandbox/challenges")
      .then(({ data }) => setChallenges(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Code Challenges
        </h1>
        <p className="mt-1 text-base text-slate-500 dark:text-slate-400">
          Practice your coding skills with interactive challenges
        </p>
      </div>
      {challenges.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <div className="mb-4 rounded-full bg-slate-100 p-4 dark:bg-white/10">
              <Code className="h-8 w-8 text-slate-400 dark:text-slate-500" />
            </div>
            <h3 className="mb-1 text-lg font-semibold text-slate-600 dark:text-slate-300">
              No challenges available
            </h3>
            <p className="text-base text-slate-500 dark:text-slate-400">
              Challenges will appear here once they are published.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {challenges.map((ch) => (
            <Link key={ch.id} href={`/challenges/${ch.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent>
                  <div className="mb-3 flex items-center gap-2">
                    <div className="rounded-lg bg-emerald-100 p-2 dark:bg-emerald-500/20">
                      <Code className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                      {ch.language}
                    </span>
                  </div>
                  <h3 className="mb-1 font-semibold text-slate-900 dark:text-slate-100">
                    {ch.title}
                  </h3>
                  <p className="mb-3 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">
                    {ch.description}
                  </p>
                  <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {ch.time_limit_seconds}s limit
                    </span>
                    <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                      Solve <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import apiClient from "@/lib/api-client";
import { EditorLayout } from "@/components/code-editor/editor-layout";
import type { CodeChallenge } from "@/types/api";

export default function ChallengePage() {
  const params = useParams();
  const [challenge, setChallenge] = useState<CodeChallenge | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get(`/sandbox/challenges/${params.challengeId}`)
      .then(({ data }) => setChallenge(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params.challengeId]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!challenge) {
    return <p className="text-slate-500 dark:text-slate-400">Challenge not found.</p>;
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="border-b border-slate-200 bg-white px-6 py-4 dark:border-white/10 dark:bg-[#2C2C2C]">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{challenge.title}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{challenge.description}</p>
      </div>
      <div className="flex-1">
        <EditorLayout
          challengeId={challenge.id}
          language={challenge.language}
          starterCode={challenge.starter_code || ""}
          testCases={challenge.test_cases}
        />
      </div>
    </div>
  );
}

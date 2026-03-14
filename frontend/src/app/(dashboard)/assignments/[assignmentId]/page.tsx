"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import apiClient from "@/lib/api-client";
import { EditorLayout } from "@/components/code-editor/editor-layout";
import type { CodeChallenge } from "@/types/api";

export default function AssignmentPage() {
  const params = useParams();
  const [challenge, setChallenge] = useState<CodeChallenge | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get(`/sandbox/challenges/${params.assignmentId}`)
      .then(({ data }) => setChallenge(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params.assignmentId]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!challenge) {
    return <p className="text-gray-500">Challenge not found.</p>;
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-xl font-bold">{challenge.title}</h1>
        <p className="mt-1 text-sm text-gray-500">{challenge.description}</p>
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

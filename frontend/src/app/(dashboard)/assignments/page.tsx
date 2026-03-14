"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import apiClient from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Code, Clock, ArrowRight } from "lucide-react";
import type { CodeChallenge } from "@/types/api";

export default function AssignmentsPage() {
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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">
        Code Challenges
      </h1>
      {challenges.length === 0 ? (
        <p className="text-gray-500">No challenges available yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {challenges.map((ch) => (
            <Link key={ch.id} href={`/assignments/${ch.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="p-6">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="rounded-lg bg-green-100 p-2">
                      <Code className="h-5 w-5 text-green-600" />
                    </div>
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-600">
                      {ch.language}
                    </span>
                  </div>
                  <h3 className="mb-1 font-semibold text-gray-900">
                    {ch.title}
                  </h3>
                  <p className="mb-3 line-clamp-2 text-sm text-gray-500">
                    {ch.description}
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {ch.time_limit_seconds}s limit
                    </span>
                    <span className="flex items-center gap-1 text-blue-600">
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

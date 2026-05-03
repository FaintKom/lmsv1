"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle, Clock, FileText, Download, ChevronDown, ChevronUp } from "lucide-react";
import type { Assignment, AssignmentSubmission } from "@/types/api";

export default function AssignmentReviewPage() {
  const params = useParams();
  const assignmentId = params.id as string;
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [grading, setGrading] = useState<Record<string, { score: string; feedback: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiClient.get(`/assignments/${assignmentId}`).then(({ data }) => data),
      apiClient.get(`/assignments/${assignmentId}/submissions`).then(({ data }) => data),
    ])
      .then(([aData, sData]) => {
        setAssignment(aData);
        setSubmissions(sData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [assignmentId]);

  const handleGrade = async (submissionId: string) => {
    const g = grading[submissionId];
    if (!g || g.score === "") {
      toast.error("Enter a score");
      return;
    }
    setSaving(submissionId);
    try {
      const { data } = await apiClient.put(`/assignments/${assignmentId}/submissions/${submissionId}/grade`, {
        score: parseFloat(g.score),
        feedback: g.feedback || "",
      });
      setSubmissions((prev) =>
        prev.map((s) => (s.id === submissionId ? { ...s, ...data } : s))
      );
      toast.success("Graded successfully");
    } catch {
      toast.error("Failed to grade");
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
      </div>
    );
  }

  if (!assignment) {
    return <p className="text-ink-500 dark:text-ink-400">Assignment not found.</p>;
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case "graded":
        return <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-500/20 dark:text-green-400">Graded</span>;
      case "submitted":
        return <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-500/20 dark:text-blue-400">Submitted</span>;
      case "late":
        return <span className="rounded-full bg-sun-100 px-2.5 py-0.5 text-xs font-medium text-sun-700 dark:bg-sun-500/20 dark:text-sun-400">Late</span>;
      default:
        return <span className="rounded-full bg-ink-100 px-2.5 py-0.5 text-xs font-medium text-ink-700 dark:bg-white/10 dark:text-ink-400">{status}</span>;
    }
  };

  const gradedCount = submissions.filter((s) => s.status === "graded").length;

  return (
    <div>

      <Link
        href="/admin/assignments"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-ink-500 hover:text-ink-700 dark:text-ink-400 dark:hover:text-ink-300"
      >
        <ArrowLeft className="h-4 w-4" /> Back to assignments
      </Link>

      {/* Assignment header */}
      <Card className="mb-6">
        <CardContent className="flex items-center gap-4">
          <div className="rounded-xl bg-green-100 p-3 dark:bg-green-500/20">
            <FileText className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-ink-900 dark:text-ink-100">{assignment.title}</h1>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-4 text-xs text-ink-500 dark:text-ink-400">
              {assignment.course_title && <span>{assignment.course_title}</span>}
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Due: {new Date(assignment.due_date).toLocaleString()}
              </span>
              <span>Max: {assignment.max_score} pts</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-ink-900 dark:text-ink-100">{submissions.length}</p>
            <p className="text-xs text-ink-500 dark:text-ink-400">submissions</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{gradedCount}</p>
            <p className="text-xs text-ink-500 dark:text-ink-400">graded</p>
          </div>
        </CardContent>
      </Card>

      {/* Submissions */}
      {submissions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-ink-500 dark:text-ink-400">No submissions yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {submissions.map((sub) => {
            const isExpanded = expanded === sub.id;
            const g = grading[sub.id] || { score: sub.score?.toString() || "", feedback: sub.feedback || "" };
            return (
              <Card key={sub.id} className={`border-l-4 ${sub.status === "graded" ? "border-l-green-400" : "border-l-blue-400"}`}>
                <CardContent className="p-0">
                  {/* Header row */}
                  <button
                    onClick={() => setExpanded(isExpanded ? null : sub.id)}
                    className="flex w-full items-center gap-4 px-6 py-4 text-left transition-colors hover:bg-ink-50 dark:hover:bg-white/5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-ink-900 dark:text-ink-100">
                          {sub.student_name || "Student"}
                        </span>
                        {statusBadge(sub.status)}
                      </div>
                      <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">
                        Submitted {new Date(sub.submitted_at).toLocaleString()}
                        {sub.original_filename && ` · ${sub.original_filename}`}
                      </p>
                    </div>
                    {sub.score !== null && sub.score !== undefined && (
                      <span className="text-sm font-bold text-green-600 dark:text-green-400">
                        {sub.score}/{assignment.max_score}
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-ink-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-ink-400" />
                    )}
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="border-t border-ink-100 px-6 py-4 dark:border-white/10">
                      {/* Student's answer */}
                      {sub.content && (
                        <div className="mb-4">
                          <p className="mb-1 text-xs font-medium text-ink-500 dark:text-ink-400">Answer</p>
                          <div className="whitespace-pre-wrap rounded-lg bg-ink-50 p-3 text-sm text-ink-700 dark:bg-white/5 dark:text-ink-300">
                            {sub.content}
                          </div>
                        </div>
                      )}
                      {sub.original_filename && (
                        <div className="mb-4">
                          <p className="mb-1 text-xs font-medium text-ink-500 dark:text-ink-400">Attached File</p>
                          <a
                            href={`${process.env.NEXT_PUBLIC_API_URL || ""}/api/v1/assignments/${assignmentId}/submissions/${sub.id}/file`}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-ink-50 px-3 py-2 text-sm text-green-600 hover:bg-ink-100 dark:bg-white/5 dark:text-green-400 dark:hover:bg-white/10"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Download className="h-3.5 w-3.5" />
                            {sub.original_filename}
                          </a>
                        </div>
                      )}

                      {/* Grade form */}
                      <div className="rounded-lg border border-ink-200 p-4 dark:border-white/10">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">
                          {sub.status === "graded" ? "Update Grade" : "Grade Submission"}
                        </p>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                          <div className="flex-shrink-0">
                            <label className="mb-1 block text-xs text-ink-500 dark:text-ink-400">
                              Score (0-{assignment.max_score})
                            </label>
                            <input
                              type="number"
                              min={0}
                              max={assignment.max_score}
                              value={g.score}
                              onChange={(e) =>
                                setGrading({ ...grading, [sub.id]: { ...g, score: e.target.value } })
                              }
                              className="w-24 rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 focus:border-green-500 focus:outline-none dark:border-white/10 dark:bg-[#2C2C2C] dark:text-ink-100"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="mb-1 block text-xs text-ink-500 dark:text-ink-400">Feedback</label>
                            <input
                              type="text"
                              value={g.feedback}
                              onChange={(e) =>
                                setGrading({ ...grading, [sub.id]: { ...g, feedback: e.target.value } })
                              }
                              placeholder="Optional feedback..."
                              className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 focus:border-green-500 focus:outline-none dark:border-white/10 dark:bg-[#2C2C2C] dark:text-ink-100"
                            />
                          </div>
                          <Button
                            onClick={() => handleGrade(sub.id)}
                            disabled={saving === sub.id}
                            className="shrink-0"
                          >
                            {saving === sub.id ? "Saving..." : (
                              <>
                                <CheckCircle className="mr-1 h-4 w-4" />
                                {sub.status === "graded" ? "Update" : "Grade"}
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

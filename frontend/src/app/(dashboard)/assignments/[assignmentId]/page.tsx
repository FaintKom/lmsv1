"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import apiClient from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Clock, CheckCircle, Upload, FileText, AlertCircle } from "lucide-react";
import type { Assignment, AssignmentSubmission } from "@/types/api";

function timeLeft(dueDate: string) {
  const now = Date.now();
  const due = new Date(dueDate).getTime();
  const diff = due - now;
  if (diff < 0) return "Past due";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h left`;
  const mins = Math.floor(diff / (1000 * 60));
  return `${mins}m left`;
}

export default function AssignmentDetailPage() {
  const params = useParams();
  const assignmentId = params.assignmentId as string;
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submission, setSubmission] = useState<AssignmentSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      apiClient.get(`/assignments/${assignmentId}`).then(({ data }) => data),
      apiClient.get(`/assignments/${assignmentId}/my-submission`).then(({ data }) => data).catch(() => null),
    ])
      .then(([aData, subData]) => {
        setAssignment(aData);
        setSubmission(subData);
        if (subData?.content) setContent(subData.content);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [assignmentId]);

  const handleSubmit = async () => {
    if (!content && !file) {
      setError("Please enter text or attach a file.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const formData = new FormData();
      if (content) formData.append("content", content);
      if (file) formData.append("file", file);
      const { data } = await apiClient.post(`/assignments/${assignmentId}/submit`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSubmission(data);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Submission failed";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-slate-500 dark:text-slate-400">Assignment not found.</p>
        <Link href="/assignments" className="mt-2 inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700">
          <ArrowLeft className="h-3 w-3" /> Back to assignments
        </Link>
      </div>
    );
  }

  const isPastDue = new Date(assignment.due_date).getTime() < Date.now();
  const canSubmit = !isPastDue || assignment.allow_late;
  const isGraded = submission?.status === "graded";

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/assignments"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
      >
        <ArrowLeft className="h-4 w-4" /> Back to assignments
      </Link>

      {/* Assignment info */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle as="h1" className="text-xl">{assignment.title}</CardTitle>
              {assignment.course_title && (
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{assignment.course_title}</p>
              )}
            </div>
            <div className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${
              isPastDue
                ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                : "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400"
            }`}>
              <Clock className="h-3.5 w-3.5" />
              {timeLeft(assignment.due_date)}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {assignment.description && (
            <div className="mb-4 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
              {assignment.description}
            </div>
          )}
          <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
            <span>Due: {new Date(assignment.due_date).toLocaleString()}</span>
            <span>Max score: {assignment.max_score}</span>
            {assignment.allow_late && <span className="text-orange-500">Late submissions allowed</span>}
          </div>
        </CardContent>
      </Card>

      {/* Graded result */}
      {isGraded && submission && (
        <Card className="mb-6 border-l-4 border-l-emerald-400">
          <CardContent className="flex items-center gap-4">
            <div className="rounded-xl bg-emerald-100 p-3 dark:bg-emerald-500/20">
              <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Score: {submission.score} / {assignment.max_score}
              </p>
              {submission.feedback && (
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{submission.feedback}</p>
              )}
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                Graded {submission.graded_at ? new Date(submission.graded_at).toLocaleString() : ""}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing submission info */}
      {submission && !isGraded && (
        <Card className="mb-6 border-l-4 border-l-blue-400">
          <CardContent className="flex items-center gap-4">
            <div className="rounded-xl bg-blue-100 p-3 dark:bg-blue-500/20">
              <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Submitted {submission.status === "late" ? "(Late)" : ""}
              </p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {new Date(submission.submitted_at).toLocaleString()}
                {submission.original_filename && ` · File: ${submission.original_filename}`}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submit form */}
      {canSubmit && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {submission ? "Resubmit" : "Submit Your Work"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Your answer
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-white/10 dark:bg-[#2C2C2C] dark:text-slate-100 dark:placeholder:text-slate-500"
                placeholder="Type your answer here..."
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Attach file (optional)
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500 transition-colors hover:border-indigo-400 hover:text-indigo-600 dark:border-white/20 dark:text-slate-400 dark:hover:border-indigo-500">
                <Upload className="h-4 w-4" />
                {file ? file.name : "Click to choose a file"}
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </label>
            </div>
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? "Submitting..." : submission ? "Resubmit" : "Submit"}
            </button>
          </CardContent>
        </Card>
      )}

      {!canSubmit && !submission && (
        <Card className="border-l-4 border-l-red-400">
          <CardContent className="flex items-center gap-4">
            <div className="rounded-xl bg-red-100 p-3 dark:bg-red-500/20">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Deadline passed</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Late submissions are not allowed for this assignment.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

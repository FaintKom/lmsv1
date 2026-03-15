"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  FileText,
  X,
  User,
} from "lucide-react";
import {
  exercisesApi,
  EXERCISE_TYPE_LABELS,
  EXERCISE_TYPE_COLORS,
  type Exercise,
  type ExerciseSubmission,
} from "@/lib/api/exercises";
import apiClient from "@/lib/api-client";

export default function SubmissionsViewerPage() {
  const { exerciseId } = useParams<{ exerciseId: string }>();
  const router = useRouter();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [submissions, setSubmissions] = useState<ExerciseSubmission[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [studentNames, setStudentNames] = useState<Record<string, string>>({});
  const perPage = 30;

  useEffect(() => {
    exercisesApi
      .get(exerciseId)
      .then(({ data }) => setExercise(data))
      .catch(() => {});
  }, [exerciseId]);

  const fetchSubmissions = () => {
    setLoading(true);
    exercisesApi
      .listSubmissions(exerciseId, { page, per_page: perPage })
      .then(({ data }) => {
        setSubmissions(data.items);
        setTotal(data.total);
        // Fetch student names
        const ids = [...new Set(data.items.map((s) => s.student_id))];
        ids.forEach((id) => {
          if (!studentNames[id]) {
            apiClient
              .get(`/admin/users/${id}`)
              .then(({ data: u }) =>
                setStudentNames((prev) => ({ ...prev, [id]: u.full_name || u.email }))
              )
              .catch(() =>
                setStudentNames((prev) => ({ ...prev, [id]: id.slice(0, 8) }))
              );
          }
        });
      })
      .catch(() => toast.error("Failed to load submissions"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSubmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exerciseId, page]);

  const totalPages = Math.ceil(total / perPage);

  if (!exercise && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <p>Exercise not found</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Content Library", href: "/admin/content-library" },
          { label: exercise?.display_id || "...", href: `/admin/content-library/${exerciseId}` },
          { label: "Submissions" },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/admin/content-library/${exerciseId}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Submissions
              </h1>
              {exercise && (
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${EXERCISE_TYPE_COLORS[exercise.exercise_type]}`}
                >
                  {EXERCISE_TYPE_LABELS[exercise.exercise_type]}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {exercise?.title} · {total} submission{total !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : submissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500">
              <FileText className="mb-3 h-10 w-10" />
              <p className="text-sm font-medium">No submissions yet</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50 dark:divide-white/5">
              {submissions.map((sub) => (
                <SubmissionRow
                  key={sub.id}
                  submission={sub}
                  exerciseType={exercise?.exercise_type || "quiz"}
                  studentName={studentNames[sub.student_id] || sub.student_id.slice(0, 8)}
                  isExpanded={expandedId === sub.id}
                  onToggle={() => setExpandedId(expandedId === sub.id ? null : sub.id)}
                />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3 dark:border-white/10">
              <p className="text-xs text-slate-500">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Single submission row ──────────────────────────────────────────

function SubmissionRow({
  submission,
  exerciseType,
  studentName,
  isExpanded,
  onToggle,
}: {
  submission: ExerciseSubmission;
  exerciseType: string;
  studentName: string;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const sub = submission;
  const passedIcon = sub.passed === true ? (
    <Check className="h-4 w-4 text-emerald-500" />
  ) : sub.passed === false ? (
    <X className="h-4 w-4 text-red-500" />
  ) : (
    <Clock className="h-4 w-4 text-amber-500" />
  );

  return (
    <div>
      <div
        className="flex cursor-pointer items-center gap-4 px-6 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-white/5"
        onClick={onToggle}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-slate-400" />
        )}

        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {studentName}
          </span>
        </div>

        <div className="flex items-center gap-1.5">{passedIcon}</div>

        {sub.score !== null && (
          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300">
            {typeof sub.score === "number" ? sub.score.toFixed(1) : sub.score}%
          </span>
        )}

        {sub.status && (
          <span className={`rounded px-2 py-0.5 text-xs font-medium ${
            sub.status === "passed" || sub.status === "graded"
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
              : sub.status === "failed"
              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
              : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-400"
          }`}>
            {sub.status}
          </span>
        )}

        {/* Code-specific: tests passed */}
        {sub.total_tests !== null && sub.total_tests > 0 && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {sub.total_passed}/{sub.total_tests} tests
          </span>
        )}

        {/* File-specific */}
        {sub.original_filename && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {sub.original_filename}
          </span>
        )}

        <span className="ml-auto text-xs text-slate-400">
          {new Date(sub.submitted_at).toLocaleString()}
        </span>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="border-t border-slate-50 bg-slate-25 px-14 py-4 dark:border-white/5 dark:bg-white/[0.02]">
          {/* Quiz answers */}
          {exerciseType === "quiz" && sub.answers && (
            <QuizAnswersDetail answers={sub.answers} />
          )}

          {/* Code submission */}
          {exerciseType === "code_challenge" && (
            <CodeSubmissionDetail submission={sub} />
          )}

          {/* File submission */}
          {exerciseType === "file_upload" && (
            <FileSubmissionDetail submission={sub} />
          )}

          {/* Interactive answers */}
          {!["quiz", "code_challenge", "file_upload"].includes(exerciseType) && sub.answers && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase text-slate-400">Student Answers</p>
              <pre className="rounded-lg bg-slate-100 p-3 font-mono text-xs text-slate-700 dark:bg-white/5 dark:text-slate-300">
                {JSON.stringify(sub.answers, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Quiz Answers Detail ────────────────────────────────────────────

function QuizAnswersDetail({ answers }: { answers: Record<string, unknown> }) {
  const quizAnswers = (answers.quiz_answers || answers) as Array<Record<string, unknown>>;

  if (!Array.isArray(quizAnswers)) {
    return (
      <pre className="rounded-lg bg-slate-100 p-3 font-mono text-xs text-slate-700 dark:bg-white/5 dark:text-slate-300">
        {JSON.stringify(answers, null, 2)}
      </pre>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase text-slate-400">Answers</p>
      {quizAnswers.map((a, i) => (
        <div key={i} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
          <span className="text-slate-400">Q{i + 1}:</span>
          <span>{String(a.selected_option ?? a.text ?? JSON.stringify(a))}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Code Submission Detail ─────────────────────────────────────────

function CodeSubmissionDetail({ submission }: { submission: ExerciseSubmission }) {
  return (
    <div className="space-y-4">
      {submission.source_code && (
        <div>
          <div className="mb-1 flex items-center justify-between">
            <p className="text-xs font-medium uppercase text-slate-400">
              Source Code ({submission.language})
            </p>
            {submission.execution_time_ms !== null && (
              <span className="text-xs text-slate-500">{submission.execution_time_ms}ms</span>
            )}
          </div>
          <pre className="max-h-64 overflow-auto rounded-lg bg-slate-900 p-3 font-mono text-xs text-slate-100">
            {submission.source_code}
          </pre>
        </div>
      )}

      {submission.results && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase text-slate-400">Test Results</p>
          <div className="space-y-1">
            {((submission.results as Record<string, unknown>).test_results as Array<Record<string, unknown>> || []).map(
              (r, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 rounded px-2 py-1 text-xs ${
                    r.passed
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
                      : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300"
                  }`}
                >
                  {r.passed ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  <span>Test #{i + 1}</span>
                  {!r.is_hidden && (
                    <>
                      <span className="text-slate-400">|</span>
                      <span>Expected: {String(r.expected)}</span>
                      <span>Got: {String(r.actual)}</span>
                    </>
                  )}
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── File Submission Detail ─────────────────────────────────────────

function FileSubmissionDetail({ submission }: { submission: ExerciseSubmission }) {
  return (
    <div className="flex items-center gap-4">
      <FileText className="h-8 w-8 text-slate-400" />
      <div>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {submission.original_filename}
        </p>
        <p className="text-xs text-slate-500">
          {submission.file_size ? `${(submission.file_size / 1024).toFixed(1)} KB` : ""}{" "}
          {submission.mime_type ? `· ${submission.mime_type}` : ""}
        </p>
      </div>
      <a
        href={`/api/v1/exercises/submissions/${submission.id}/download`}
        className="ml-auto flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-600 transition-colors hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:hover:bg-indigo-900/30"
        download
      >
        <Download className="h-3.5 w-3.5" />
        Download
      </a>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle, X } from "lucide-react";
import { MaybeMath } from "@/components/common/math-renderer";
import {
 getLatestSubmissionBreakdown,
 type SubmissionBreakdown,
} from "@/lib/api/assessments";
import { useTranslation } from "@/lib/i18n/context";

interface Props {
 quizId: string;
 studentId: string;
 studentName?: string;
 onClose: () => void;
}

/**
 * Modal showing a teacher the per-question breakdown of a student's quiz
 * submission: their answer, the correct answer, and right/wrong per question.
 * Opened from a gradebook quiz cell.
 */
export default function QuizSubmissionBreakdown({
 quizId,
 studentId,
 studentName,
 onClose,
}: Props) {
 const { t } = useTranslation();
 const [data, setData] = useState<SubmissionBreakdown | null>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState(false);

 // The modal mounts fresh each time it is opened (keyed by conditional
 // render in the gradebook), so a single fetch on mount is sufficient.
 // Initial state already reflects the loading state — no synchronous
 // setState in the effect body.
 useEffect(() => {
  let active = true;
  getLatestSubmissionBreakdown(quizId, studentId)
   .then((d) => {
    if (active) setData(d);
   })
   .catch(() => {
    if (active) setError(true);
   })
   .finally(() => {
    if (active) setLoading(false);
   });
  return () => {
   active = false;
  };
 }, [quizId, studentId]);

 useEffect(() => {
  const onKey = (e: KeyboardEvent) => {
   if (e.key === "Escape") onClose();
  };
  document.addEventListener("keydown", onKey);
  return () => document.removeEventListener("keydown", onKey);
 }, [onClose]);

 return (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
   <div
    className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm"
    onClick={onClose}
    aria-hidden="true"
   />
   <div
    role="dialog"
    aria-modal="true"
    aria-label={t("admin.quizReview.title")}
    className="relative flex max-h-[85vh] w-full max-w-2xl flex-col rounded-lg bg-paper-2 shadow-2xl"
   >
    {/* Header */}
    <div className="flex items-start justify-between border-b border-border-strong px-6 py-4">
     <div>
      <h3 className="text-base font-semibold text-text">
       {data?.quiz_title || t("admin.quizReview.title")}
      </h3>
      <p className="mt-0.5 text-sm text-text-muted">
       {data?.student_name || studentName || t("admin.quizReview.student")}
      </p>
     </div>
     <button
      onClick={onClose}
      className="rounded-lg p-1 text-text-subtle hover:bg-ink-100 hover:text-text-muted"
      aria-label={t("common.close")}
     >
      <X className="h-4 w-4" aria-hidden="true" />
     </button>
    </div>

    {/* Body */}
    <div className="flex-1 overflow-y-auto px-6 py-4">
     {loading && (
      <div className="flex h-32 items-center justify-center">
       <div className="h-6 w-6 animate-spin rounded-pill border-4 border-primary border-t-transparent" />
      </div>
     )}

     {!loading && error && (
      <p className="py-8 text-center text-sm text-text-muted">
       {t("admin.quizReview.noSubmission")}
      </p>
     )}

     {!loading && !error && data && (
      <>
       {/* Score summary */}
       <div
        className={`mb-4 flex items-center justify-between rounded-lg px-4 py-3 ${
         data.passed ? "bg-success-soft" : "bg-danger-soft"
        }`}
       >
        <span className="text-sm font-medium text-text">
         {t("admin.quizReview.scoreLabel")}
        </span>
        <span
         className={`text-sm font-bold ${
          data.passed ? "text-success-fg" : "text-danger-fg"
         }`}
        >
         {data.score != null ? Math.round(data.score) : 0}% ·{" "}
         {data.earned_points}/{data.total_points} {t("admin.quizReview.points")}
        </span>
       </div>

       {/* Per-question breakdown */}
       <div className="space-y-3">
        {data.questions.map((q, i) => (
         <div
          key={q.question_id}
          className="rounded-lg border border-border-strong p-4"
         >
          <div className="mb-2 flex items-start gap-2">
           <span
            className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-pill text-xs font-bold ${
             q.is_correct
              ? "bg-success-soft text-success-fg"
              : "bg-danger-soft text-danger-fg"
            }`}
           >
            {q.is_correct ? (
             <CheckCircle className="h-4 w-4" />
            ) : (
             <XCircle className="h-4 w-4" />
            )}
           </span>
           <div className="flex-1">
            <p className="text-sm font-medium text-ink-700">
             <span className="mr-1 text-text-subtle">{i + 1}.</span>
             <MaybeMath text={q.question_text} />
            </p>
            <span className="text-[10px] text-text-subtle">
             {q.points_earned}/{q.points} {t("admin.quizReview.points")}
            </span>
           </div>
          </div>

          {/* Student answer */}
          <div className="ml-8 space-y-1.5">
           <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-xs font-medium text-text-muted">
             {t("admin.quizReview.studentAnswer")}
            </span>
            <span
             className={`rounded-md px-2 py-0.5 text-xs font-medium ${
              q.is_correct
               ? "bg-success-soft text-success-fg"
               : "bg-danger-soft text-danger-fg"
             }`}
            >
             {q.student_answer ? (
              <MaybeMath text={q.student_answer} />
             ) : (
              t("admin.quizReview.noAnswer")
             )}
            </span>
           </div>

           {/* Correct answer — only shown when the student was wrong */}
           {!q.is_correct && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
             <span className="text-xs font-medium text-text-muted">
              {t("admin.quizReview.correctAnswer")}
             </span>
             <span className="rounded-md bg-success-soft px-2 py-0.5 text-xs font-medium text-success-fg">
              {q.correct_answer ? (
               <MaybeMath text={q.correct_answer} />
              ) : (
               "—"
              )}
             </span>
            </div>
           )}
          </div>
         </div>
        ))}
       </div>
      </>
     )}
    </div>
   </div>
  </div>
 );
}

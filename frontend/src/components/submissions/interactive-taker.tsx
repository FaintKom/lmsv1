"use client";

import { useState } from "react";
import apiClient from "@/lib/api-client";
import { CheckCircle, XCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import MatchingExercise from "./exercises/matching";
import OrderingExercise from "./exercises/ordering";
import FillBlanksExercise from "./exercises/fill-blanks";
import TrueFalseExercise from "./exercises/true-false";
import CategorizeExercise from "./exercises/categorize";

interface InteractiveTakerProps {
  lessonId: string;
  content: Record<string, unknown>;
  onComplete?: () => void;
}

interface SubmissionResult {
  score: number | null;
  passed: boolean | null;
}

export default function InteractiveTaker({
  lessonId,
  content,
  onComplete,
}: InteractiveTakerProps) {
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const exerciseType = content.exercise_type as string;
  const instruction = content.instruction as string;

  const handleSubmit = async (answers: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      const { data } = await apiClient.post(
        `/submissions/lessons/${lessonId}/interactive/`,
        {
          exercise_type: exerciseType,
          answers,
        }
      );
      setResult({ score: data.score, passed: data.passed });
      if (data.passed && onComplete) {
        onComplete();
      }
      toast.success("Exercise submitted");
    } catch {
      toast.error("Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    setResult(null);
  };

  // Show result
  if (result) {
    const score = result.score !== null ? Math.round(result.score * 100) : 0;
    return (
      <div className="space-y-4">
        <div
          className={`rounded-xl border-2 p-6 text-center ${
            result.passed
              ? "border-green-200 bg-green-50"
              : "border-coral-300 bg-coral-50"
          }`}
        >
          {result.passed ? (
            <CheckCircle className="mx-auto mb-3 h-12 w-12 text-green-500" />
          ) : (
            <XCircle className="mx-auto mb-3 h-12 w-12 text-coral-500" />
          )}
          <h3
            className={`text-xl font-bold ${
              result.passed ? "text-green-700" : "text-coral-700"
            }`}
          >
            {result.passed ? "Correct!" : "Not quite right"}
          </h3>
          <p className="mt-1 text-sm text-ink-700">
            Score: {score}%
          </p>
        </div>

        <button
          onClick={handleRetry}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-ink-200 px-4 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-50"
        >
          <RotateCcw className="h-4 w-4" />
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {instruction && (
        <div className="rounded-lg border border-ink-200 bg-white p-4">
          <p className="text-sm font-medium text-ink-700">{instruction}</p>
        </div>
      )}

      {submitting && (
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-green-600 border-t-transparent" />
        </div>
      )}

      {!submitting && exerciseType === "matching" && (
        <MatchingExercise
          pairs={(content.pairs as { left: string; right: string }[]) || []}
          onSubmit={handleSubmit}
        />
      )}

      {!submitting && exerciseType === "ordering" && (
        <OrderingExercise
          items={(content.items as string[]) || []}
          onSubmit={handleSubmit}
        />
      )}

      {!submitting && exerciseType === "fill_blanks" && (
        <FillBlanksExercise
          textTemplate={(content.text_template as string) || ""}
          blankCount={((content.blanks as string[]) || []).length}
          words={(content.blanks as string[]) || []}
          onSubmit={handleSubmit}
        />
      )}

      {!submitting && exerciseType === "true_false" && (
        <TrueFalseExercise
          statement={(content.statement as string) || ""}
          onSubmit={handleSubmit}
        />
      )}

      {!submitting && exerciseType === "categorize" && (
        <CategorizeExercise
          categories={(content.categories as { name: string; items: string[] }[]) || []}
          allItems={(content.all_items as string[]) || []}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}

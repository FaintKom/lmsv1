"use client";

import { useState, useEffect } from "react";
import apiClient from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, XCircle, Clock, Trophy } from "lucide-react";
import { toast } from "sonner";

interface QuizOption {
  id: string;
  text: string;
}

interface QuizQuestion {
  id: string;
  question_text: string;
  question_type: "multiple_choice" | "text_answer";
  options: QuizOption[] | null;
  points: number;
  sort_order: number;
}

interface QuizData {
  id: string;
  title: string;
  passing_score: number;
  time_limit_minutes: number | null;
  questions: QuizQuestion[];
}

interface SubmissionResult {
  score: number;
  passed: boolean;
}

interface QuizTakerProps {
  lessonId: string;
  onComplete?: () => void;
}

export default function QuizTaker({ lessonId, onComplete }: QuizTakerProps) {
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    apiClient
      .get(`/assessments/lessons/${lessonId}/quiz`)
      .then(({ data }) => {
        setQuiz(data);
        if (data.time_limit_minutes) {
          setTimeLeft(data.time_limit_minutes * 60);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [lessonId]);

  // Timer
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || result) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, result]);

  const handleSubmit = async () => {
    if (!quiz) return;
    setSubmitting(true);
    try {
      const answersList = Object.entries(answers).map(([questionId, value]) => {
        const question = quiz.questions.find((q) => q.id === questionId);
        if (question?.question_type === "multiple_choice") {
          return { question_id: questionId, selected_option: value };
        }
        return { question_id: questionId, text: value };
      });

      const { data } = await apiClient.post(`/assessments/quizzes/${quiz.id}/submit/`, {
        answers: answersList,
      });
      setResult({ score: data.score, passed: data.passed });
      onComplete?.();
      toast.success("Quiz submitted");
    } catch {
      toast.error("Failed to submit quiz");
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
        <p className="text-sm text-slate-500">No quiz available for this lesson.</p>
      </div>
    );
  }

  if (result) {
    return (
      <Card className={result.passed ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}>
        <CardContent className="p-8 text-center">
          {result.passed ? (
            <Trophy className="mx-auto mb-3 h-12 w-12 text-emerald-500" />
          ) : (
            <XCircle className="mx-auto mb-3 h-12 w-12 text-red-500" />
          )}
          <h3 className="mb-2 text-xl font-bold text-slate-900">
            {result.passed ? "Congratulations!" : "Not Passed"}
          </h3>
          <p className="mb-4 text-lg">
            Score:{" "}
            <span className={`font-bold ${result.passed ? "text-emerald-600" : "text-red-600"}`}>
              {Math.round(result.score)}%
            </span>
          </p>
          <p className="text-sm text-slate-500">
            {result.passed
              ? "You have successfully passed this quiz."
              : `You need ${quiz.passing_score}% to pass. Try again!`}
          </p>
          {!result.passed && (
            <Button
              className="mt-4"
              onClick={() => {
                setResult(null);
                setAnswers({});
                if (quiz.time_limit_minutes) {
                  setTimeLeft(quiz.time_limit_minutes * 60);
                }
              }}
            >
              Retry Quiz
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  const answeredCount = Object.keys(answers).length;
  const totalQuestions = quiz.questions.length;

  return (
    <div className="space-y-4">
      {/* Quiz header */}
      <div className="flex items-center justify-between rounded-xl bg-indigo-50 px-4 py-3">
        <div>
          <h3 className="font-semibold text-indigo-900">{quiz.title}</h3>
          <p className="text-xs text-indigo-600">
            {answeredCount}/{totalQuestions} answered · Pass: {quiz.passing_score}%
          </p>
        </div>
        {timeLeft !== null && (
          <div
            className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-mono font-bold ${
              timeLeft < 60 ? "bg-red-100 text-red-600" : "bg-white text-slate-700"
            }`}
          >
            <Clock className="h-4 w-4" />
            {formatTime(timeLeft)}
          </div>
        )}
      </div>

      {/* Questions */}
      {quiz.questions.map((q, i) => (
        <Card key={q.id} className="border-slate-200">
          <CardContent className="p-4">
            <div className="mb-3 flex items-start gap-2">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600">
                {i + 1}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-800">{q.question_text}</p>
                <span className="text-[10px] text-slate-400">{q.points} point{q.points > 1 ? "s" : ""}</span>
              </div>
            </div>

            {q.question_type === "multiple_choice" && q.options && (
              <div className="ml-8 space-y-2">
                {q.options.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setAnswers({ ...answers, [q.id]: opt.id })}
                    className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                      answers[q.id] === opt.id
                        ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold ${
                        answers[q.id] === opt.id
                          ? "border-indigo-500 bg-indigo-500 text-white"
                          : "border-slate-300 text-slate-400"
                      }`}
                    >
                      {opt.id.toUpperCase()}
                    </span>
                    {opt.text}
                  </button>
                ))}
              </div>
            )}

            {q.question_type === "text_answer" && (
              <div className="ml-8">
                <input
                  type="text"
                  value={answers[q.id] || ""}
                  onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                  placeholder="Type your answer..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Submit */}
      <Button
        onClick={handleSubmit}
        disabled={submitting || answeredCount === 0}
        className="w-full"
      >
        <CheckCircle className="mr-2 h-4 w-4" />
        {submitting ? "Submitting..." : `Submit Quiz (${answeredCount}/${totalQuestions} answered)`}
      </Button>
    </div>
  );
}

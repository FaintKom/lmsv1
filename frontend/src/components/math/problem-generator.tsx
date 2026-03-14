"use client";

import { useState } from "react";
import apiClient from "@/lib/api-client";
import { MathRenderer } from "@/components/common/math-renderer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle, Trophy } from "lucide-react";

interface MathProblem {
  question: string;
  answer: string;
  explanation: string;
  latex: string;
}

interface CheckResult {
  user_answer: string;
  correct_answer: string;
  is_correct: boolean;
}

const PROBLEM_TYPES = [
  { value: "arithmetic", label: "Arithmetic" },
  { value: "algebra", label: "Algebra" },
  { value: "geometry", label: "Geometry" },
];

const DIFFICULTIES = [
  { value: "easy", label: "Easy", color: "text-emerald-600 bg-emerald-50" },
  { value: "medium", label: "Medium", color: "text-amber-600 bg-amber-50" },
  { value: "hard", label: "Hard", color: "text-red-600 bg-red-50" },
];

export function ProblemGenerator() {
  const [type, setType] = useState("arithmetic");
  const [difficulty, setDifficulty] = useState("easy");
  const [count, setCount] = useState(5);
  const [problems, setProblems] = useState<MathProblem[]>([]);
  const [loading, setLoading] = useState(false);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [results, setResults] = useState<CheckResult[] | null>(null);
  const [checking, setChecking] = useState(false);
  const [score, setScore] = useState<{ correct: number; total: number; percent: number } | null>(null);
  const [showExplanations, setShowExplanations] = useState<Record<number, boolean>>({});

  const handleGenerate = async () => {
    setLoading(true);
    setResults(null);
    setScore(null);
    setUserAnswers({});
    setShowExplanations({});
    try {
      const { data } = await apiClient.get("/math-problems/generate/", {
        params: { type, difficulty, count },
      });
      setProblems(data);
    } catch {
      setProblems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCheck = async () => {
    if (Object.keys(userAnswers).length === 0) return;

    setChecking(true);
    try {
      const answers = problems.map((p, i) => ({
        user_answer: userAnswers[i] || "",
        correct_answer: p.answer,
      }));
      const { data } = await apiClient.post("/math-problems/check", { answers });
      setResults(data.results);
      setScore({ correct: data.correct, total: data.total, percent: data.score_percent });
    } catch {
      // Fallback to client-side checking
      const checkResults: CheckResult[] = problems.map((p, i) => {
        const userAns = (userAnswers[i] || "").trim();
        const correct = userAns === p.answer;
        return { user_answer: userAns, correct_answer: p.answer, is_correct: correct };
      });
      const correctCount = checkResults.filter(r => r.is_correct).length;
      setResults(checkResults);
      setScore({ correct: correctCount, total: checkResults.length, percent: Math.round(correctCount / checkResults.length * 100) });
    } finally {
      setChecking(false);
    }
  };

  const allAnswered = problems.length > 0 && problems.every((_, i) => (userAnswers[i] || "").trim() !== "");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Math Problem Generator</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            {/* Type selector */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="block w-40 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {PROBLEM_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Difficulty selector */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="block w-32 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Count input */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">Count</label>
              <input
                type="number"
                min={1}
                max={20}
                value={count}
                onChange={(e) => setCount(Math.max(1, Math.min(20, Number(e.target.value))))}
                className="block w-20 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Generate
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Score card */}
      {score && (
        <Card className={score.percent >= 70 ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}>
          <CardContent className="flex items-center gap-4 p-5">
            {score.percent >= 70 ? (
              <Trophy className="h-8 w-8 text-emerald-500" />
            ) : (
              <XCircle className="h-8 w-8 text-red-500" />
            )}
            <div>
              <p className={`text-xl font-bold ${score.percent >= 70 ? "text-emerald-700" : "text-red-700"}`}>
                {score.correct} / {score.total} correct ({score.percent}%)
              </p>
              <p className={`text-sm ${score.percent >= 70 ? "text-emerald-600" : "text-red-600"}`}>
                {score.percent === 100 ? "Perfect score!" : score.percent >= 70 ? "Great job!" : "Keep practicing!"}
              </p>
            </div>
            <button
              onClick={handleGenerate}
              className="ml-auto rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Try Again
            </button>
          </CardContent>
        </Card>
      )}

      {/* Generated problems */}
      {problems.length > 0 && (
        <div className="space-y-4">
          {problems.map((problem, index) => {
            const result = results?.[index];
            const isCorrect = result?.is_correct;
            const isChecked = result !== undefined;

            return (
              <Card
                key={index}
                className={
                  isChecked
                    ? isCorrect
                      ? "border-emerald-200"
                      : "border-red-200"
                    : ""
                }
              >
                <CardContent className="p-5">
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                        isChecked
                          ? isCorrect
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                          : "bg-indigo-100 text-indigo-700"
                      }`}>
                        {isChecked ? (
                          isCorrect ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />
                        ) : (
                          index + 1
                        )}
                      </span>
                      <span className="text-sm font-medium text-slate-700">
                        {problem.question}
                      </span>
                    </div>
                  </div>

                  <div className="mb-4 rounded-lg bg-slate-50 p-3">
                    <MathRenderer content={problem.latex} />
                  </div>

                  {/* Answer input */}
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-slate-600">Answer:</label>
                    <input
                      type="text"
                      value={userAnswers[index] || ""}
                      onChange={(e) =>
                        setUserAnswers((prev) => ({ ...prev, [index]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && allAnswered && !results) handleCheck();
                      }}
                      disabled={!!results}
                      placeholder="Enter your answer..."
                      className={`w-48 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                        isChecked
                          ? isCorrect
                            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                            : "border-red-300 bg-red-50 text-red-700"
                          : "border-slate-200 bg-white focus:border-indigo-500 focus:ring-indigo-500"
                      }`}
                    />
                    {isChecked && !isCorrect && (
                      <span className="text-sm text-red-600">
                        Correct: <strong>{problem.answer}</strong>
                      </span>
                    )}
                  </div>

                  {/* Explanation toggle */}
                  {isChecked && (
                    <div className="mt-3">
                      <button
                        onClick={() =>
                          setShowExplanations((prev) => ({ ...prev, [index]: !prev[index] }))
                        }
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                      >
                        {showExplanations[index] ? "Hide Explanation" : "Show Explanation"}
                      </button>
                      {showExplanations[index] && (
                        <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50 p-3">
                          <p className="text-sm text-blue-700">{problem.explanation}</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {/* Submit button */}
          {!results && (
            <div className="flex justify-center">
              <button
                onClick={handleCheck}
                disabled={!allAnswered || checking}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-8 py-3 text-sm font-medium text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {checking && <Loader2 className="h-4 w-4 animate-spin" />}
                Check Answers ({Object.keys(userAnswers).filter(k => (userAnswers[Number(k)] || "").trim()).length}/{problems.length})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

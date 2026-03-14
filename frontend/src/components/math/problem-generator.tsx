"use client";

import { useState } from "react";
import apiClient from "@/lib/api-client";
import { MathRenderer } from "@/components/common/math-renderer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface MathProblem {
  question: string;
  answer: string;
  explanation: string;
  latex: string;
}

const PROBLEM_TYPES = [
  { value: "arithmetic", label: "Arithmetic" },
  { value: "algebra", label: "Algebra" },
  { value: "geometry", label: "Geometry" },
];

const DIFFICULTIES = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

export function ProblemGenerator() {
  const [type, setType] = useState("arithmetic");
  const [difficulty, setDifficulty] = useState("easy");
  const [count, setCount] = useState(5);
  const [problems, setProblems] = useState<MathProblem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAnswers, setShowAnswers] = useState<Record<number, boolean>>({});

  const handleGenerate = async () => {
    setLoading(true);
    setShowAnswers({});
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

  const toggleAnswer = (index: number) => {
    setShowAnswers((prev) => ({ ...prev, [index]: !prev[index] }));
  };

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

      {/* Generated problems */}
      {problems.length > 0 && (
        <div className="space-y-4">
          {problems.map((problem, index) => (
            <Card key={index}>
              <CardContent className="p-5">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <span className="mr-3 inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium text-slate-700">
                      {problem.question}
                    </span>
                  </div>
                  <button
                    onClick={() => toggleAnswer(index)}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                  >
                    {showAnswers[index] ? "Hide Answer" : "Show Answer"}
                  </button>
                </div>

                <div className="mb-3 rounded-lg bg-slate-50 p-3">
                  <MathRenderer content={problem.latex} />
                </div>

                {showAnswers[index] && (
                  <div className="space-y-2 rounded-lg border border-emerald-100 bg-emerald-50 p-3">
                    <p className="text-sm font-semibold text-emerald-800">
                      Answer: {problem.answer}
                    </p>
                    <p className="text-sm text-emerald-700">
                      {problem.explanation}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

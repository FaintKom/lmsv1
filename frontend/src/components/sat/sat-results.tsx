"use client";

import { useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Clock, BarChart3, RotateCcw, ChevronDown, TrendingUp, ArrowRight } from "lucide-react";
import type { SATQuestion, SATDomain } from "./sat-question-bank";
import { DOMAIN_LABELS, DOMAIN_COLORS } from "./sat-question-bank";
import { convertRawToScaled } from "./sat-score-tables";
import { useSATHistoryStore } from "@/stores/sat-history-store";

interface QuestionResult {
  question: SATQuestion;
  userAnswer: string | null;
  correct: boolean;
  timeSeconds: number;
  module?: 1 | 2;
}

interface SATResultsProps {
  results: QuestionResult[];
  totalTimeSeconds: number;
  module2Difficulty?: "easy" | "hard" | "none";
  testMode?: "full_adaptive" | "mini" | "domain_practice";
  onRetake: () => void;
  onExit: () => void;
}

export default function SATResults({
  results,
  totalTimeSeconds,
  module2Difficulty = "none",
  testMode = "mini",
  onRetake,
  onExit,
}: SATResultsProps) {
  const totalCorrect = results.filter((r) => r.correct).length;
  const totalQuestions = results.length;
  const scaledScore = convertRawToScaled(totalCorrect, totalQuestions, module2Difficulty);
  const avgTimePerQ = totalTimeSeconds / totalQuestions;

  // Module breakdown (for adaptive tests)
  const m1Results = results.filter((r) => r.module === 1 || !r.module);
  const m2Results = results.filter((r) => r.module === 2);
  const m1Correct = m1Results.filter((r) => r.correct).length;
  const m2Correct = m2Results.filter((r) => r.correct).length;
  const isAdaptive = m2Results.length > 0;

  // Score by domain
  const domainStats = useMemo(() => {
    const stats: Record<SATDomain, { correct: number; total: number; totalTime: number }> = {
      algebra: { correct: 0, total: 0, totalTime: 0 },
      advanced_math: { correct: 0, total: 0, totalTime: 0 },
      problem_solving: { correct: 0, total: 0, totalTime: 0 },
      geometry_trig: { correct: 0, total: 0, totalTime: 0 },
    };
    for (const r of results) {
      stats[r.question.domain].total++;
      stats[r.question.domain].totalTime += r.timeSeconds;
      if (r.correct) stats[r.question.domain].correct++;
    }
    return stats;
  }, [results]);

  // Persist to history store
  const addRecord = useSATHistoryStore((s) => s.addRecord);

  useEffect(() => {
    useSATHistoryStore.persist.rehydrate();
    const domainScores: Record<SATDomain, { correct: number; total: number; avgTimeSeconds: number }> = {
      algebra: { correct: 0, total: 0, avgTimeSeconds: 0 },
      advanced_math: { correct: 0, total: 0, avgTimeSeconds: 0 },
      problem_solving: { correct: 0, total: 0, avgTimeSeconds: 0 },
      geometry_trig: { correct: 0, total: 0, avgTimeSeconds: 0 },
    };
    for (const d of Object.keys(domainStats) as SATDomain[]) {
      domainScores[d] = {
        correct: domainStats[d].correct,
        total: domainStats[d].total,
        avgTimeSeconds: domainStats[d].total > 0 ? domainStats[d].totalTime / domainStats[d].total : 0,
      };
    }

    addRecord({
      id: `test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      date: new Date().toISOString(),
      mode: testMode,
      scaledScore,
      rawCorrect: totalCorrect,
      totalQuestions,
      module2Difficulty,
      totalTimeSeconds,
      domainScores,
    });
    // Only persist once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      {/* Hero score */}
      <div className="rounded-2xl bg-gradient-to-br from-green-600 to-green-600 p-8 text-center text-white">
        <p className="text-sm font-medium opacity-80">Estimated SAT Math Score</p>
        <p className="mt-2 text-6xl font-black">{scaledScore}</p>
        <p className="mt-1 text-sm opacity-70">out of 800</p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm">
          <span className="flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4" />
            {totalCorrect}/{totalQuestions} correct
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            {Math.floor(totalTimeSeconds / 60)}m {Math.round(totalTimeSeconds % 60)}s
          </span>
          <span className="flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4" />
            ~{Math.round(avgTimePerQ)}s / question
          </span>
        </div>
        <p className="mt-3 text-[10px] opacity-50">
          Score estimated using practice test conversion tables. Actual SAT scores may vary.
        </p>
      </div>

      {/* Module breakdown (adaptive tests only) */}
      {isAdaptive && (
        <div className="rounded-xl border border-ink-200 bg-white p-5 dark:border-white/10 dark:bg-[#1E1E1E]">
          <h3 className="mb-4 text-sm font-semibold text-ink-900 dark:text-ink-200 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-600" />
            Adaptive Module Breakdown
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl bg-ink-50 p-4 text-center dark:bg-white/5">
              <p className="text-xs text-ink-400 dark:text-ink-500">Module 1</p>
              <p className="mt-1 text-2xl font-bold text-ink-900 dark:text-ink-200">
                {m1Correct}/{m1Results.length}
              </p>
              <p className="text-xs text-ink-400">
                {Math.round((m1Correct / m1Results.length) * 100)}% correct
              </p>
            </div>

            <div className="flex items-center justify-center">
              <div className="text-center">
                <ArrowRight className="mx-auto h-5 w-5 text-ink-300 dark:text-ink-700" />
                <p className={`mt-1 text-xs font-bold ${
                  module2Difficulty === "hard"
                    ? "text-coral-500"
                    : "text-blue-500"
                }`}>
                  Routed to {module2Difficulty === "hard" ? "Hard" : "Standard"}
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-ink-50 p-4 text-center dark:bg-white/5">
              <p className="text-xs text-ink-400 dark:text-ink-500">
                Module 2
                <span className={`ml-1 inline-block rounded px-1.5 py-0.5 text-[9px] font-bold ${
                  module2Difficulty === "hard"
                    ? "bg-coral-50 text-coral-500 dark:bg-coral-500/20 dark:text-coral-300"
                    : "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
                }`}>
                  {module2Difficulty === "hard" ? "HARD" : "STD"}
                </span>
              </p>
              <p className="mt-1 text-2xl font-bold text-ink-900 dark:text-ink-200">
                {m2Correct}/{m2Results.length}
              </p>
              <p className="text-xs text-ink-400">
                {Math.round((m2Correct / m2Results.length) * 100)}% correct
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Domain breakdown */}
      <div className="rounded-xl border border-ink-200 bg-white p-5 dark:border-white/10 dark:bg-[#1E1E1E]">
        <h3 className="mb-4 text-sm font-semibold text-ink-900 dark:text-ink-200">Score by Domain</h3>
        <div className="space-y-3">
          {(Object.keys(domainStats) as SATDomain[]).map((domain) => {
            const { correct, total } = domainStats[domain];
            if (total === 0) return null;
            const pct = Math.round((correct / total) * 100);
            return (
              <div key={domain}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium text-ink-700 dark:text-ink-400">{DOMAIN_LABELS[domain]}</span>
                  <span className="font-bold" style={{ color: DOMAIN_COLORS[domain] }}>
                    {correct}/{total} ({pct}%)
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-ink-100 dark:bg-white/10">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, backgroundColor: DOMAIN_COLORS[domain] }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Question review */}
      <div className="rounded-xl border border-ink-200 bg-white p-5 dark:border-white/10 dark:bg-[#1E1E1E]">
        <h3 className="mb-4 text-sm font-semibold text-ink-900 dark:text-ink-200">Question Review</h3>
        <div className="space-y-2">
          {results.map((r, i) => (
            <details key={r.question.id + "-" + i} className="group">
              <summary className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
                r.correct
                  ? "border-green-200 bg-green-50 dark:border-green-500/20 dark:bg-green-500/5"
                  : "border-coral-300 bg-coral-50 dark:border-coral-500/20 dark:bg-coral-500/5"
              }`}>
                <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white ${
                  r.correct ? "bg-green-500" : "bg-coral-500"
                }`}>
                  {i + 1}
                </span>
                {r.module && (
                  <span className="rounded bg-ink-200 px-1.5 py-0.5 text-[9px] font-bold text-ink-500 dark:bg-white/10 dark:text-ink-400">
                    M{r.module}
                  </span>
                )}
                <span className="flex-1 text-sm font-medium text-ink-700 dark:text-ink-300 truncate">
                  {(r.question.config.question as string)?.slice(0, 60)}...
                </span>
                <span className="text-xs text-ink-400 shrink-0">{Math.round(r.timeSeconds)}s</span>
                {r.correct ? <CheckCircle className="h-4 w-4 text-green-500 shrink-0" /> : <XCircle className="h-4 w-4 text-coral-500 shrink-0" />}
                <ChevronDown className="h-3 w-3 text-ink-400 transition-transform group-open:rotate-180 shrink-0" />
              </summary>
              <div className="mt-2 rounded-lg bg-ink-50 p-4 text-sm dark:bg-white/5">
                <p className="font-medium text-ink-700 dark:text-ink-300">{r.question.config.question as string}</p>
                {r.question.config.explanation ? (
                  <p className={`mt-2 text-xs ${r.correct ? "text-ink-500" : "text-green-600 dark:text-green-400"}`}>
                    <span className="font-semibold">Explanation:</span> {String(r.question.config.explanation)}
                  </p>
                ) : null}
                <div className="mt-2 flex gap-2">
                  <span className="rounded bg-ink-200 px-2 py-0.5 text-[10px] font-medium text-ink-700 dark:bg-white/10 dark:text-ink-400">
                    {DOMAIN_LABELS[r.question.domain]}
                  </span>
                  <span className="rounded bg-ink-200 px-2 py-0.5 text-[10px] font-medium text-ink-700 dark:bg-white/10 dark:text-ink-400">
                    Difficulty {r.question.difficulty}/3
                  </span>
                </div>
              </div>
            </details>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-center gap-3">
        <Button variant="outline" onClick={onExit}>Back to Dashboard</Button>
        <Button onClick={onRetake}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Retake Test
        </Button>
      </div>
    </div>
  );
}

"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Clock, BarChart3, RotateCcw, ChevronDown } from "lucide-react";
import type { SATQuestion, SATDomain } from "./sat-question-bank";
import { DOMAIN_LABELS, DOMAIN_COLORS } from "./sat-question-bank";

interface QuestionResult {
  question: SATQuestion;
  userAnswer: string | null;
  correct: boolean;
  timeSeconds: number;
}

interface SATResultsProps {
  results: QuestionResult[];
  totalTimeSeconds: number;
  onRetake: () => void;
  onExit: () => void;
}

/** Estimate SAT score from raw score (very rough approximation) */
function estimateScore(rawCorrect: number, totalQuestions: number): number {
  const percent = rawCorrect / totalQuestions;
  // SAT Math: 200-800. Roughly linear mapping with curve
  return Math.round(200 + percent * 600);
}

export default function SATResults({ results, totalTimeSeconds, onRetake, onExit }: SATResultsProps) {
  const totalCorrect = results.filter((r) => r.correct).length;
  const totalQuestions = results.length;
  const estimatedScore = estimateScore(totalCorrect, totalQuestions);
  const avgTimePerQ = totalTimeSeconds / totalQuestions;

  // Score by domain
  const domainStats = useMemo(() => {
    const stats: Record<SATDomain, { correct: number; total: number }> = {
      algebra: { correct: 0, total: 0 },
      advanced_math: { correct: 0, total: 0 },
      problem_solving: { correct: 0, total: 0 },
      geometry_trig: { correct: 0, total: 0 },
    };
    for (const r of results) {
      stats[r.question.domain].total++;
      if (r.correct) stats[r.question.domain].correct++;
    }
    return stats;
  }, [results]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      {/* Hero score */}
      <div className="rounded-2xl bg-gradient-to-br from-green-600 to-emerald-600 p-8 text-center text-white">
        <p className="text-sm font-medium opacity-80">Estimated SAT Math Score</p>
        <p className="mt-2 text-6xl font-black">{estimatedScore}</p>
        <p className="mt-1 text-sm opacity-70">out of 800</p>
        <div className="mt-4 flex items-center justify-center gap-6 text-sm">
          <span className="flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4" />
            {totalCorrect}/{totalQuestions} correct
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            {Math.floor(totalTimeSeconds / 60)}m {Math.round(totalTimeSeconds % 60)}s total
          </span>
          <span className="flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4" />
            ~{Math.round(avgTimePerQ)}s per question
          </span>
        </div>
      </div>

      {/* Domain breakdown */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#1E1E1E]">
        <h3 className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-200">Score by Domain</h3>
        <div className="space-y-3">
          {(Object.keys(domainStats) as SATDomain[]).map((domain) => {
            const { correct, total } = domainStats[domain];
            if (total === 0) return null;
            const pct = Math.round((correct / total) * 100);
            return (
              <div key={domain}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-600 dark:text-slate-400">{DOMAIN_LABELS[domain]}</span>
                  <span className="font-bold" style={{ color: DOMAIN_COLORS[domain] }}>
                    {correct}/{total} ({pct}%)
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
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
      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#1E1E1E]">
        <h3 className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-200">Question Review</h3>
        <div className="space-y-2">
          {results.map((r, i) => (
            <details key={r.question.id} className="group">
              <summary className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
                r.correct
                  ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/5"
                  : "border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-500/5"
              }`}>
                <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white ${
                  r.correct ? "bg-emerald-500" : "bg-red-500"
                }`}>
                  {i + 1}
                </span>
                <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                  {(r.question.config.question as string)?.slice(0, 60)}...
                </span>
                <span className="text-xs text-slate-400">{Math.round(r.timeSeconds)}s</span>
                {r.correct ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                <ChevronDown className="h-3 w-3 text-slate-400 transition-transform group-open:rotate-180" />
              </summary>
              <div className="mt-2 rounded-lg bg-slate-50 p-4 text-sm dark:bg-white/5">
                <p className="font-medium text-slate-700 dark:text-slate-300">{r.question.config.question as string}</p>
                {!r.correct && (
                  <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">
                    {r.question.config.explanation as string}
                  </p>
                )}
                <div className="mt-2 flex gap-2">
                  <span className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-white/10 dark:text-slate-400">
                    {DOMAIN_LABELS[r.question.domain]}
                  </span>
                  <span className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-white/10 dark:text-slate-400">
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

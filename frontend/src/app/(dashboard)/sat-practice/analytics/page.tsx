"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, TrendingUp, Target, Clock, AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSATHistoryStore } from "@/stores/sat-history-store";
import { DOMAIN_LABELS, DOMAIN_COLORS, type SATDomain } from "@/components/sat/sat-question-bank";

function ScoreTrendChart({ data }: { data: { date: string; score: number; mode: string }[] }) {
  if (data.length === 0) return null;
  const minScore = 200;
  const maxScore = 800;
  const w = 600;
  const h = 200;
  const padX = 40;
  const padY = 20;
  const chartW = w - padX * 2;
  const chartH = h - padY * 2;

  const points = data.map((d, i) => ({
    x: padX + (data.length === 1 ? chartW / 2 : (i / (data.length - 1)) * chartW),
    y: padY + chartH - ((d.score - minScore) / (maxScore - minScore)) * chartH,
    ...d,
  }));

  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ maxHeight: 220 }}>
      {/* Grid lines */}
      {[200, 400, 600, 800].map((s) => {
        const y = padY + chartH - ((s - minScore) / (maxScore - minScore)) * chartH;
        return (
          <g key={s}>
            <line x1={padX} y1={y} x2={w - padX} y2={y} stroke="currentColor" strokeOpacity={0.1} />
            <text x={padX - 8} y={y + 4} textAnchor="end" className="fill-ink-400 text-[10px]">{s}</text>
          </g>
        );
      })}
      {/* Line */}
      <polyline points={polyline} fill="none" stroke="#3fb04b" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {/* Dots */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={5} fill="#3fb04b" />
          <circle cx={p.x} cy={p.y} r={3} fill="white" />
          <text x={p.x} y={p.y - 10} textAnchor="middle" className="fill-ink-700 dark:fill-ink-300 text-[10px] font-bold">
            {p.score}
          </text>
        </g>
      ))}
    </svg>
  );
}

function DomainBars({ stats }: { stats: Record<SATDomain, { correct: number; total: number; percent: number }> }) {
  const domains = Object.keys(stats) as SATDomain[];
  return (
    <div className="space-y-3">
      {domains.map((d) => {
        const s = stats[d];
        if (s.total === 0) return null;
        return (
          <div key={d}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-medium text-ink-700 dark:text-ink-400">{DOMAIN_LABELS[d]}</span>
              <span className="font-bold" style={{ color: DOMAIN_COLORS[d] }}>{s.percent}%</span>
            </div>
            <div className="h-3 rounded-full bg-ink-100 dark:bg-white/10 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${s.percent}%`, backgroundColor: DOMAIN_COLORS[d] }} />
            </div>
            <p className="text-[10px] text-ink-400 mt-0.5">{s.correct}/{s.total} correct across all tests</p>
          </div>
        );
      })}
    </div>
  );
}

export default function SATAnalyticsPage() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    useSATHistoryStore.persist.rehydrate();
    setHydrated(true);
  }, []);

  const records = useSATHistoryStore((s) => s.records);
  const getScoreTrend = useSATHistoryStore((s) => s.getScoreTrend);
  const getDomainStats = useSATHistoryStore((s) => s.getDomainStats);
  const getWeakDomains = useSATHistoryStore((s) => s.getWeakDomains);
  const clearHistory = useSATHistoryStore((s) => s.clearHistory);

  // Only compute derived data after hydration to avoid SSR mismatch
  const scoreTrend = hydrated ? getScoreTrend() : [];
  const domainStats = hydrated ? getDomainStats() : { algebra: { correct: 0, total: 0, percent: 0 }, advanced_math: { correct: 0, total: 0, percent: 0 }, problem_solving: { correct: 0, total: 0, percent: 0 }, geometry_trig: { correct: 0, total: 0, percent: 0 } };
  const weakDomains = hydrated ? getWeakDomains() : [];

  const avgScore = records.length > 0
    ? Math.round(records.reduce((sum, r) => sum + r.scaledScore, 0) / records.length)
    : 0;
  const bestScore = records.length > 0
    ? Math.max(...records.map((r) => r.scaledScore))
    : 0;
  const totalTests = records.length;
  const avgTime = records.length > 0
    ? Math.round(records.reduce((sum, r) => sum + r.totalTimeSeconds, 0) / records.length / 60)
    : 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/sat-practice">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-ink-900 dark:text-ink-100">SAT Practice Analytics</h1>
            <p className="text-xs text-ink-500">{totalTests} test{totalTests !== 1 ? "s" : ""} taken</p>
          </div>
        </div>
        {records.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => { if (confirm("Clear all test history?")) clearHistory(); }}
            className="text-coral-300 hover:text-coral-500">
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear
          </Button>
        )}
      </div>

      {records.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <TrendingUp className="mx-auto h-10 w-10 text-ink-300 dark:text-ink-700 mb-3" />
            <p className="text-ink-500 dark:text-ink-400 text-sm">No test history yet</p>
            <p className="text-xs text-ink-400 mt-1">Take a practice test to see your analytics here</p>
            <Link href="/sat-practice">
              <Button className="mt-4" size="sm">Start Practice</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Avg Score", value: String(avgScore), icon: TrendingUp, color: "text-green-600" },
              { label: "Best Score", value: String(bestScore), icon: Target, color: "text-green-600" },
              { label: "Tests Taken", value: String(totalTests), icon: TrendingUp, color: "text-blue-600" },
              { label: "Avg Time", value: `${avgTime}min`, icon: Clock, color: "text-sun-500" },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="p-4 text-center">
                  <s.icon className={`mx-auto h-5 w-5 ${s.color} mb-1`} />
                  <p className="text-2xl font-bold text-ink-900 dark:text-ink-200">{s.value}</p>
                  <p className="text-[10px] text-ink-400">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Score trend */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-200 mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                Score Trend
              </h3>
              <ScoreTrendChart data={scoreTrend} />
            </CardContent>
          </Card>

          {/* Domain performance */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-200 mb-4 flex items-center gap-2">
                <Target className="h-4 w-4 text-green-600" />
                Domain Performance
              </h3>
              <DomainBars stats={domainStats} />
            </CardContent>
          </Card>

          {/* Weak areas */}
          {weakDomains.length > 0 && (
            <Card className="border-sun-100 dark:border-sun-500/30">
              <CardContent className="p-6">
                <h3 className="text-sm font-semibold text-sun-700 dark:text-sun-400 mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Areas to Improve
                </h3>
                <div className="space-y-2">
                  {weakDomains.map((d) => (
                    <div key={d} className="flex items-center gap-3 rounded-lg bg-sun-50 px-4 py-2 dark:bg-sun-500/10">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: DOMAIN_COLORS[d] }} />
                      <span className="text-sm text-ink-700 dark:text-ink-300">{DOMAIN_LABELS[d]}</span>
                      <span className="ml-auto text-xs font-bold text-sun-500 dark:text-sun-400">
                        {domainStats[d].percent}%
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-ink-500">
                  Focus on these domains with targeted practice to boost your score.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Test history table */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-200 mb-4">Test History</h3>
              <div className="space-y-2">
                {records.map((r) => (
                  <div key={r.id} className="flex items-center gap-4 rounded-xl border border-ink-200 bg-ink-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 dark:bg-green-500/20 shrink-0">
                      <span className="text-sm font-bold text-green-600 dark:text-green-400">{r.scaledScore}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink-700 dark:text-ink-300">
                        {r.mode === "full_adaptive" ? "Full SAT" : r.mode === "mini" ? "Quick Practice" : "Domain Practice"}
                        {r.module2Difficulty !== "none" && (
                          <span className={`ml-2 text-[10px] font-bold ${r.module2Difficulty === "hard" ? "text-coral-500" : "text-blue-500"}`}>
                            {r.module2Difficulty === "hard" ? "Hard" : "Std"} Route
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-ink-400">
                        {new Date(r.date).toLocaleDateString()} · {r.rawCorrect}/{r.totalQuestions} · {Math.floor(r.totalTimeSeconds / 60)}min
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

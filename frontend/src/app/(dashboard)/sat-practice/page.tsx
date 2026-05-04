"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { GraduationCap, Clock, BarChart3, Zap, BookOpen, Target, TrendingUp, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import SATTestRunner from "@/components/sat/sat-test-runner";
import { generateModuleQuestions, generateDomainQuestions } from "@/components/sat/question-generator";
import {
 SAT_MATH_CONFIG,
 SAT_MINI_CONFIG,
 DOMAIN_LABELS,
 DOMAIN_COLORS,
 type SATTestConfig,
 type SATDomain,
 type SATQuestion,
} from "@/components/sat/sat-question-bank";
import { useSATHistoryStore } from "@/stores/sat-history-store";

type PageState = "lobby" | "test";

export default function SATPracticePage() {
 const [state, setState] = useState<PageState>("lobby");
 const [selectedConfig, setSelectedConfig] = useState<SATTestConfig>(SAT_MINI_CONFIG);
 const [questions, setQuestions] = useState<SATQuestion[]>([]);

 // Hydration-safe: manually rehydrate persisted store on mount
 const [hydrated, setHydrated] = useState(false);
 useEffect(() => {
 useSATHistoryStore.persist.rehydrate();
 setHydrated(true);
 }, []);
 const getRecentTests = useSATHistoryStore((s) => s.getRecentTests);
 const getDomainStats = useSATHistoryStore((s) => s.getDomainStats);
 const getWeakDomains = useSATHistoryStore((s) => s.getWeakDomains);
 const recentTests = hydrated ? getRecentTests(5) : [];
 const domainStats = hydrated ? getDomainStats() : { algebra: { correct: 0, total: 0, percent: 0 }, advanced_math: { correct: 0, total: 0, percent: 0 }, problem_solving: { correct: 0, total: 0, percent: 0 }, geometry_trig: { correct: 0, total: 0, percent: 0 } };
 const weakDomains = hydrated ? getWeakDomains() : [];

 const startTest = (config: SATTestConfig) => {
 let qs: SATQuestion[];
 if (config.domain) {
 qs = generateDomainQuestions(config.domain, config.questions_per_module);
 } else if (config.adaptive) {
 // For adaptive, only generate Module 1 — Module 2 generated inside runner
 qs = generateModuleQuestions(config.questions_per_module, "standard");
 } else {
 qs = generateModuleQuestions(config.questions_per_module * config.modules, "standard");
 }
 setQuestions(qs);
 setSelectedConfig(config);
 setState("test");
 };

 const startDomainPractice = (domain: SATDomain) => {
 const config: SATTestConfig = {
 name: `${DOMAIN_LABELS[domain]} Practice`,
 questions_per_module: 10,
 time_per_module_minutes: 15,
 modules: 1,
 adaptive: false,
 breakMinutes: 0,
 domain,
 };
 startTest(config);
 };

 if (state === "test" && questions.length > 0) {
 return (
 <SATTestRunner
 questions={questions}
 config={selectedConfig}
 onFinish={() => setState("lobby")}
 />
 );
 }

 return (
 <div className="mx-auto max-w-4xl space-y-8">
 {/* Hero */}
 <div className="rounded-lg bg-gradient-to-br from-green-600 via-emerald-600 to-green-700 p-8 text-white">
 <div className="flex items-center gap-3 mb-3">
 <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-paper-2/20">
 <GraduationCap className="h-6 w-6" />
 </div>
 <div>
 <h1 className="text-2xl font-bold">SAT Math Practice</h1>
 <p className="text-sm opacity-80">Adaptive simulation with real test conditions</p>
 </div>
 </div>
 <p className="mt-3 max-w-xl text-sm leading-relaxed opacity-90">
 Experience the real Digital SAT Math format: 2 adaptive modules, timed sessions,
 Desmos calculator, and College Board-style score estimation.
 </p>
 </div>

 {/* Test modes */}
 <div className="grid gap-4 sm:grid-cols-2">
 {/* Mini test */}
 <Card className="group cursor-pointer transition-all hover:shadow-lg $1:border-primary "
 onClick={() => startTest(SAT_MINI_CONFIG)}>
 <CardContent className="p-6">
 <div className="flex items-center gap-3 mb-3">
 <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sun-100 text-warning-fg ">
 <Zap className="h-5 w-5" />
 </div>
 <div>
 <h3 className="font-bold text-ink-700 ">Quick Practice</h3>
 <p className="text-xs text-text-muted">10 questions · 10 minutes</p>
 </div>
 </div>
 <p className="text-sm text-text-muted ">
 Short practice session to warm up or review specific topics. Great for daily practice.
 </p>
 <Button className="mt-4 w-full" variant="outline">Start Quick Test</Button>
 </CardContent>
 </Card>

 {/* Full adaptive test */}
 <Card className="group cursor-pointer transition-all hover:shadow-lg $1:border-primary ring-2 ring-green-200 "
 onClick={() => startTest(SAT_MATH_CONFIG)}>
 <CardContent className="p-6">
 <div className="flex items-center gap-3 mb-3">
 <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary ">
 <BookOpen className="h-5 w-5" />
 </div>
 <div>
 <h3 className="font-bold text-ink-700 ">Full SAT Math</h3>
 <p className="text-xs text-text-muted">2 adaptive modules · 22q each · 35 min/module</p>
 </div>
 </div>
 <p className="text-sm text-text-muted ">
 Complete simulation: Module 1 → adaptive routing → Module 2 (Easy or Hard) → realistic score.
 </p>
 <Button className="mt-4 w-full">Start Full Test</Button>
 </CardContent>
 </Card>
 </div>

 {/* Domain practice */}
 <Card>
 <CardContent className="p-6">
 <div className="flex items-center justify-between mb-4">
 <h3 className="text-sm font-semibold text-ink-700 flex items-center gap-2">
 <Target className="h-4 w-4 text-primary" />
 Practice by Domain
 </h3>
 <span className="text-[10px] text-text-subtle">10 questions · 15 min each</span>
 </div>
 <div className="grid gap-3 sm:grid-cols-2">
 {(Object.keys(DOMAIN_LABELS) as SATDomain[]).map((domain) => {
 const stat = domainStats[domain];
 const isWeak = weakDomains.includes(domain);
 return (
 <button
 key={domain}
 onClick={() => startDomainPractice(domain)}
 className="flex items-center gap-3 rounded-lg border border-border-strong bg-surface-2 px-4 py-3 text-left transition-all $1:border-primary hover:shadow-sm "
 >
 <div className="h-3 w-3 rounded-pill shrink-0" style={{ backgroundColor: DOMAIN_COLORS[domain] }} />
 <div className="flex-1 min-w-0">
 <p className="text-sm font-medium text-ink-700 ">{DOMAIN_LABELS[domain]}</p>
 <p className="text-[10px] text-text-subtle">
 {domain === "algebra" || domain === "advanced_math" ? "~35% of test" : "~15% of test"}
 {stat && stat.total > 0 && (
 <span className={`ml-2 font-semibold ${stat.percent >= 70 ? "text-primary" : stat.percent >= 50 ? "text-warning-fg" : "text-danger-fg"}`}>
 · {stat.percent}% avg
 </span>
 )}
 </p>
 </div>
 {isWeak && (
 <span className="rounded-pill bg-danger-soft px-2 py-0.5 text-[9px] font-bold text-danger-fg shrink-0">
 Weak
 </span>
 )}
 <ChevronRight className="h-4 w-4 text-ink-300 shrink-0" />
 </button>
 );
 })}
 </div>
 </CardContent>
 </Card>

 {/* Recent test history */}
 {recentTests.length > 0 && (
 <Card>
 <CardContent className="p-6">
 <div className="flex items-center justify-between mb-4">
 <h3 className="text-sm font-semibold text-ink-700 flex items-center gap-2">
 <TrendingUp className="h-4 w-4 text-primary" />
 Recent Tests
 </h3>
 <Link href="/sat-practice/analytics" className="text-xs text-primary hover:text-success-fg font-medium">
 View Analytics →
 </Link>
 </div>
 <div className="space-y-2">
 {recentTests.map((test) => (
 <div key={test.id} className="flex items-center gap-4 rounded-lg border border-border-strong bg-surface-2 px-4 py-3 ">
 <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft ">
 <span className="text-sm font-bold text-primary ">{test.scaledScore}</span>
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-sm font-medium text-ink-700 ">
 {test.mode === "full_adaptive" ? "Full SAT" : test.mode === "mini" ? "Quick Practice" : "Domain Practice"}
 {test.module2Difficulty !== "none" && (
 <span className={`ml-2 text-[10px] font-bold ${
 test.module2Difficulty === "hard" ? "text-danger-fg" : "text-info-fg"
 }`}>
 {test.module2Difficulty === "hard" ? "Hard Route" : "Standard Route"}
 </span>
 )}
 </p>
 <p className="text-[10px] text-text-subtle">
 {new Date(test.date).toLocaleDateString()} · {test.rawCorrect}/{test.totalQuestions} correct · {Math.floor(test.totalTimeSeconds / 60)}min
 </p>
 </div>
 </div>
 ))}
 </div>
 </CardContent>
 </Card>
 )}

 {/* Tips */}
 <Card>
 <CardContent className="p-6">
 <h3 className="mb-3 text-sm font-semibold text-ink-700 ">Test-Taking Tips</h3>
 <ul className="space-y-2 text-sm text-text-muted ">
 <li className="flex items-start gap-2">
 <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
 <span><b>Pace yourself:</b> ~1.5 minutes per question. Skip hard ones and come back.</span>
 </li>
 <li className="flex items-start gap-2">
 <BarChart3 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
 <span><b>Use Desmos:</b> The graphing calculator can solve ~30% of questions. Click the calculator button.</span>
 </li>
 <li className="flex items-start gap-2">
 <Zap className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
 <span><b>Flag and move on:</b> If stuck for 45+ seconds, flag it and return later.</span>
 </li>
 <li className="flex items-start gap-2">
 <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
 <span><b>Never leave blanks:</b> No penalty for guessing. Always pick an answer.</span>
 </li>
 <li className="flex items-start gap-2">
 <Target className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
 <span><b>Keyboard shortcuts:</b> Press A/B/C/D to select answers, arrow keys to navigate, F to flag.</span>
 </li>
 </ul>
 </CardContent>
 </Card>
 </div>
 );
}

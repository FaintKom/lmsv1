"use client";

import { useState } from "react";
import { GraduationCap, Clock, BarChart3, Zap, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import SATTestRunner from "@/components/sat/sat-test-runner";
import {
  SAT_MATH_CONFIG,
  SAT_MINI_CONFIG,
  generateTest,
  DOMAIN_LABELS,
  DOMAIN_COLORS,
  type SATTestConfig,
  type SATDomain,
} from "@/components/sat/sat-question-bank";

type PageState = "lobby" | "test";

export default function SATPracticePage() {
  const [state, setState] = useState<PageState>("lobby");
  const [selectedConfig, setSelectedConfig] = useState<SATTestConfig>(SAT_MINI_CONFIG);
  const [questions, setQuestions] = useState<ReturnType<typeof generateTest>>([]);

  const startTest = (config: SATTestConfig) => {
    const qs = generateTest(config.questions_per_module * config.modules);
    setQuestions(qs);
    setSelectedConfig(config);
    setState("test");
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
      <div className="rounded-2xl bg-gradient-to-br from-green-600 via-violet-600 to-purple-700 p-8 text-white">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">SAT Math Practice</h1>
            <p className="text-sm opacity-80">Practice in real test conditions</p>
          </div>
        </div>
        <p className="mt-3 max-w-xl text-sm leading-relaxed opacity-90">
          Simulate the Digital SAT Math section with timed modules, question navigation,
          Desmos calculator, and score estimation. Choose a practice mode below.
        </p>
      </div>

      {/* Test modes */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Mini test */}
        <Card className="group cursor-pointer transition-all hover:shadow-lg hover:border-green-300 dark:hover:border-green-500/50"
          onClick={() => startTest(SAT_MINI_CONFIG)}>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-200">Quick Practice</h3>
                <p className="text-xs text-slate-500">10 questions · 10 minutes</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Short practice session to warm up or review specific topics. Great for daily practice.
            </p>
            <Button className="mt-4 w-full" variant="outline">Start Quick Test</Button>
          </CardContent>
        </Card>

        {/* Full test */}
        <Card className="group cursor-pointer transition-all hover:shadow-lg hover:border-green-300 dark:hover:border-green-500/50"
          onClick={() => startTest(SAT_MATH_CONFIG)}>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-200">Full SAT Math</h3>
                <p className="text-xs text-slate-500">44 questions · 70 minutes</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Complete SAT Math simulation with 2 modules, adaptive difficulty, and full score report.
            </p>
            <Button className="mt-4 w-full">Start Full Test</Button>
          </CardContent>
        </Card>
      </div>

      {/* Domain coverage info */}
      <Card>
        <CardContent className="p-6">
          <h3 className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-200">SAT Math Domains</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {(Object.keys(DOMAIN_LABELS) as SATDomain[]).map((domain) => (
              <div key={domain} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: DOMAIN_COLORS[domain] }} />
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{DOMAIN_LABELS[domain]}</p>
                  <p className="text-[10px] text-slate-400">
                    {domain === "algebra" ? "~35% of test" :
                     domain === "advanced_math" ? "~35% of test" :
                     domain === "problem_solving" ? "~15% of test" : "~15% of test"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card>
        <CardContent className="p-6">
          <h3 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-200">Test-Taking Tips</h3>
          <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <li className="flex items-start gap-2">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
              <span><b>Pace yourself:</b> ~1.5 minutes per question. Skip hard ones and come back.</span>
            </li>
            <li className="flex items-start gap-2">
              <BarChart3 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
              <span><b>Use Desmos:</b> The graphing calculator can solve ~30% of questions. Click the calculator button.</span>
            </li>
            <li className="flex items-start gap-2">
              <Zap className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
              <span><b>Flag and move on:</b> If stuck for 45+ seconds, flag it and return later.</span>
            </li>
            <li className="flex items-start gap-2">
              <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
              <span><b>Never leave blanks:</b> No penalty for guessing. Always pick an answer.</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

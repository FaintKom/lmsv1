"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Flag, ChevronLeft, ChevronRight, Clock, X, Eye, EyeOff, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import DesmosCalculator from "./desmos-calculator";
import SATResults from "./sat-results";
import type { SATQuestion, SATTestConfig } from "./sat-question-bank";

// Inline renderers for MC and numeric input (simplified from templates)
function MCQuestion({ config, answer, onAnswer, eliminatedChoices, onEliminate }: {
  config: Record<string, unknown>;
  answer: string | null;
  onAnswer: (a: string) => void;
  eliminatedChoices: Set<number>;
  onEliminate: (i: number) => void;
}) {
  const question = config.question as string;
  const choices = config.choices as { text: string; correct: boolean }[];
  const standard = config.standard as string | undefined;
  const labels = ["A", "B", "C", "D"];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-xl bg-slate-50 px-6 py-5 dark:bg-white/5">
        <p className="text-lg font-medium text-slate-800 dark:text-slate-200">{question}</p>
        {standard && (
          <span className="mt-2 inline-block rounded bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
            {standard}
          </span>
        )}
      </div>
      <div className="space-y-2.5">
        {choices.map((choice, i) => {
          if (eliminatedChoices.has(i)) {
            return (
              <button key={i} onClick={() => onEliminate(i)}
                className="flex w-full items-center gap-4 rounded-xl border-2 border-slate-200 px-5 py-4 text-left opacity-40 line-through dark:border-white/10">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-400 dark:bg-white/10">{labels[i]}</span>
                <span className="text-sm text-slate-400">{choice.text}</span>
              </button>
            );
          }
          const isSelected = answer === choice.text;
          return (
            <button key={i} onClick={() => onAnswer(choice.text)}
              onContextMenu={(e) => { e.preventDefault(); onEliminate(i); }}
              className={`flex w-full items-center gap-4 rounded-xl border-2 px-5 py-4 text-left transition-all duration-200 ${
                isSelected
                  ? "border-indigo-500 bg-indigo-50 shadow-md dark:border-indigo-400 dark:bg-indigo-500/10"
                  : "border-slate-200 bg-white hover:border-indigo-300 hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 dark:border-white/10 dark:bg-white/5 dark:hover:border-indigo-500/50"
              }`}>
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                isSelected ? "bg-indigo-500 text-white" : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-400"
              }`}>{labels[i]}</span>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{choice.text}</span>
            </button>
          );
        })}
      </div>
      <p className="text-center text-[10px] text-slate-400">Right-click a choice to cross it out</p>
    </div>
  );
}

function NumericQuestion({ config, answer, onAnswer }: {
  config: Record<string, unknown>;
  answer: string | null;
  onAnswer: (a: string) => void;
}) {
  const question = config.question as string;
  const standard = config.standard as string | undefined;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-xl bg-slate-50 px-6 py-5 dark:bg-white/5">
        <p className="text-lg font-medium text-slate-800 dark:text-slate-200">{question}</p>
        {standard && (
          <span className="mt-2 inline-block rounded bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
            {standard}
          </span>
        )}
      </div>
      <div className="flex items-center justify-center gap-3">
        <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Answer:</label>
        <input
          type="text"
          value={answer || ""}
          onChange={(e) => onAnswer(e.target.value)}
          placeholder="e.g. 7 or 3/4"
          className="w-44 rounded-xl border-2 border-indigo-300 bg-white px-4 py-3 text-center text-xl font-bold text-indigo-700 outline-none focus:border-indigo-500 dark:border-indigo-500 dark:bg-[#1E1E1E] dark:text-indigo-300"
          autoFocus
        />
      </div>
      <p className="text-center text-xs text-slate-400">Enter a number, decimal, or fraction (e.g., 3/4)</p>
    </div>
  );
}

// ─── Main Test Runner ───────────────────────────────────────────────

interface SATTestRunnerProps {
  questions: SATQuestion[];
  config: SATTestConfig;
  onFinish: () => void;
}

export default function SATTestRunner({ questions, config, onFinish }: SATTestRunnerProps) {
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | null>>({});
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [eliminated, setEliminated] = useState<Record<number, Set<number>>>({});
  const [timeLeft, setTimeLeft] = useState(config.time_per_module_minutes * 60);
  const [showTimer, setShowTimer] = useState(true);
  const [showDesmos, setShowDesmos] = useState(false);
  const [showFormulas, setShowFormulas] = useState(false);
  const [finished, setFinished] = useState(false);
  const [results, setResults] = useState<React.ComponentProps<typeof SATResults>["results"] | null>(null);

  // Time tracking per question
  const questionStartRef = useRef(Date.now());
  const timePerQuestion = useRef<Record<number, number>>({});
  const testStartRef = useRef(Date.now());

  // Timer countdown
  useEffect(() => {
    if (finished) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [finished]);

  // Track time per question
  useEffect(() => {
    questionStartRef.current = Date.now();
  }, [currentQ]);

  const recordQuestionTime = useCallback(() => {
    const elapsed = (Date.now() - questionStartRef.current) / 1000;
    timePerQuestion.current[currentQ] = (timePerQuestion.current[currentQ] || 0) + elapsed;
  }, [currentQ]);

  const handleAnswer = useCallback((answer: string) => {
    setAnswers((prev) => ({ ...prev, [questions[currentQ].id]: answer }));
  }, [currentQ, questions]);

  const handleFlag = useCallback(() => {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(currentQ)) next.delete(currentQ);
      else next.add(currentQ);
      return next;
    });
  }, [currentQ]);

  const handleEliminate = useCallback((choiceIdx: number) => {
    setEliminated((prev) => {
      const current = new Set(prev[currentQ] || []);
      if (current.has(choiceIdx)) current.delete(choiceIdx);
      else current.add(choiceIdx);
      return { ...prev, [currentQ]: current };
    });
  }, [currentQ]);

  const goTo = useCallback((idx: number) => {
    recordQuestionTime();
    setCurrentQ(Math.max(0, Math.min(questions.length - 1, idx)));
  }, [questions.length, recordQuestionTime]);

  const handleSubmit = useCallback(() => {
    recordQuestionTime();
    const totalTime = (Date.now() - testStartRef.current) / 1000;

    // Grade all questions
    const questionResults = questions.map((q, i) => {
      const userAnswer = answers[q.id] || null;
      let correct = false;

      if (q.template_type === "multiple_choice_math") {
        const choices = q.config.choices as { text: string; correct: boolean }[];
        correct = choices.some((c) => c.correct && c.text === userAnswer);
      } else if (q.template_type === "numeric_input") {
        const correctAnswers = q.config.correct_answers as number[];
        const tolerance = (q.config.tolerance as number) || 0.01;
        const parsed = userAnswer ? parseFloat(userAnswer.includes("/") ?
          (() => { const [n, d] = userAnswer.split("/").map(Number); return (n / d).toString(); })() : userAnswer) : NaN;
        correct = correctAnswers?.some((ca) => Math.abs(parsed - ca) <= tolerance) || false;
      }

      return {
        question: q,
        userAnswer,
        correct,
        timeSeconds: timePerQuestion.current[i] || 0,
      };
    });

    setResults(questionResults);
    setFinished(true);
  }, [answers, questions, recordQuestionTime]);

  // Format time
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeStr = `${minutes}:${seconds.toString().padStart(2, "0")}`;
  const isLowTime = timeLeft < 60;

  if (finished && results) {
    return (
      <SATResults
        results={results}
        totalTimeSeconds={(Date.now() - testStartRef.current) / 1000}
        onRetake={onFinish}
        onExit={onFinish}
      />
    );
  }

  const q = questions[currentQ];
  const answeredCount = Object.values(answers).filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-white dark:bg-[#1E1E1E]">
      {/* Top bar */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50 px-4 dark:border-white/10 dark:bg-[#161622]">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{config.name}</span>
          <span className="rounded bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
            Question {currentQ + 1} of {questions.length}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Timer */}
          <button onClick={() => setShowTimer(!showTimer)} className="flex items-center gap-1.5 text-sm">
            {showTimer ? <Eye className="h-3.5 w-3.5 text-slate-400" /> : <EyeOff className="h-3.5 w-3.5 text-slate-400" />}
          </button>
          {showTimer && (
            <span className={`font-mono text-lg font-bold ${isLowTime ? "text-red-500 animate-pulse" : "text-slate-700 dark:text-slate-300"}`}>
              <Clock className="mr-1 inline h-4 w-4" />
              {timeStr}
            </span>
          )}

          {/* Reference sheet */}
          <button onClick={() => setShowFormulas(!showFormulas)}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
              showFormulas ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400" : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
            }`}>
            <BookOpen className="h-3.5 w-3.5" /> Reference
          </button>

          {/* Submit */}
          <Button size="sm" variant="outline" onClick={handleSubmit}>
            Submit ({answeredCount}/{questions.length})
          </Button>

          {/* Exit */}
          <button onClick={onFinish} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Question area */}
      <div className="flex-1 overflow-auto py-8">
        {q.template_type === "multiple_choice_math" ? (
          <MCQuestion
            config={q.config}
            answer={answers[q.id] || null}
            onAnswer={handleAnswer}
            eliminatedChoices={eliminated[currentQ] || new Set()}
            onEliminate={handleEliminate}
          />
        ) : (
          <NumericQuestion
            config={q.config}
            answer={answers[q.id] || null}
            onAnswer={handleAnswer}
          />
        )}
      </div>

      {/* Bottom navigation bar */}
      <div className="shrink-0 border-t border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-white/10 dark:bg-[#161622]">
        <div className="flex items-center justify-between">
          {/* Prev / Flag / Next */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => goTo(currentQ - 1)} disabled={currentQ === 0}>
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <Button
              variant={flagged.has(currentQ) ? "default" : "outline"}
              size="sm"
              onClick={handleFlag}
              className={flagged.has(currentQ) ? "bg-amber-500 hover:bg-amber-600" : ""}
            >
              <Flag className="h-3.5 w-3.5 mr-1" />
              {flagged.has(currentQ) ? "Flagged" : "Flag"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => goTo(currentQ + 1)} disabled={currentQ === questions.length - 1}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Question map */}
          <div className="flex flex-wrap gap-1">
            {questions.map((_, i) => {
              const isAnswered = !!answers[questions[i].id];
              const isFlagged = flagged.has(i);
              const isCurrent = i === currentQ;
              return (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition-all ${
                    isCurrent
                      ? "bg-indigo-600 text-white ring-2 ring-indigo-300"
                      : isAnswered
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                        : "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400"
                  } ${isFlagged ? "ring-2 ring-amber-400" : ""}`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Formula reference sheet */}
      {showFormulas && (
        <div className="fixed top-12 right-4 z-50 w-80 max-h-[70vh] overflow-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-[#1E1E1E]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Reference Sheet</h3>
            <button onClick={() => setShowFormulas(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
          </div>
          <div className="space-y-3 text-xs text-slate-600 dark:text-slate-400">
            <div>
              <p className="font-bold text-slate-700 dark:text-slate-300 mb-1">Area</p>
              <p>Circle: A = πr²</p>
              <p>Rectangle: A = lw</p>
              <p>Triangle: A = ½bh</p>
            </div>
            <div>
              <p className="font-bold text-slate-700 dark:text-slate-300 mb-1">Volume</p>
              <p>Rectangular Prism: V = lwh</p>
              <p>Cylinder: V = πr²h</p>
              <p>Sphere: V = (4/3)πr³</p>
              <p>Cone: V = (1/3)πr²h</p>
              <p>Pyramid: V = (1/3)Bh</p>
            </div>
            <div>
              <p className="font-bold text-slate-700 dark:text-slate-300 mb-1">Pythagorean Theorem</p>
              <p>a² + b² = c²</p>
            </div>
            <div>
              <p className="font-bold text-slate-700 dark:text-slate-300 mb-1">Special Right Triangles</p>
              <p>30-60-90: x, x√3, 2x</p>
              <p>45-45-90: x, x, x√2</p>
            </div>
            <div>
              <p className="font-bold text-slate-700 dark:text-slate-300 mb-1">Circle</p>
              <p>Circumference: C = 2πr</p>
              <p>360° = 2π radians</p>
            </div>
          </div>
        </div>
      )}

      {/* Desmos calculator */}
      <DesmosCalculator open={showDesmos} onToggle={() => setShowDesmos(!showDesmos)} />
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Flag, ChevronLeft, ChevronRight, Clock, X, Eye, EyeOff, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MathRenderer, containsMath } from "@/components/common/math-renderer";
import DesmosCalculator from "./desmos-calculator";

/** Render text with optional LaTeX support */
function MathText({ text, className }: { text: string; className?: string }) {
  if (containsMath(text)) return <MathRenderer content={text} className={className} />;
  return <span className={className}>{text}</span>;
}
import SATResults from "./sat-results";
import SATReviewScreen from "./sat-review-screen";
import { generateModuleQuestions } from "./question-generator";
import type { SATQuestion, SATTestConfig } from "./sat-question-bank";
import { AiTutorPanel } from "@/components/ai/ai-tutor-panel";

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
    <div className="mx-auto max-w-2xl space-y-4 sm:space-y-6 px-4 sm:px-0">
      <div className="rounded-xl bg-slate-50 px-4 py-4 sm:px-6 sm:py-5 dark:bg-white/5">
        <MathText text={question} className="text-base sm:text-lg font-medium text-slate-800 dark:text-slate-200" />
        {false && standard && (
          <span className="mt-2 inline-block rounded bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-600 dark:bg-green-500/20 dark:text-green-400">
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
                <MathText text={choice.text} className="text-sm text-slate-400" />
              </button>
            );
          }
          const isSelected = answer === choice.text;
          return (
            <button key={i} onClick={() => onAnswer(choice.text)}
              onContextMenu={(e) => { e.preventDefault(); onEliminate(i); }}
              className={`flex w-full items-center gap-4 rounded-xl border-2 px-5 py-4 text-left transition-all duration-200 ${
                isSelected
                  ? "border-green-500 bg-green-50 shadow-md dark:border-green-400 dark:bg-green-500/10"
                  : "border-slate-200 bg-white hover:border-green-300 hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 dark:border-white/10 dark:bg-white/5 dark:hover:border-green-500/50"
              }`}>
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                isSelected ? "bg-green-500 text-white" : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-400"
              }`}>{labels[i]}</span>
              <MathText text={choice.text} className="text-sm font-medium text-slate-700 dark:text-slate-300" />
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
    <div className="mx-auto max-w-2xl space-y-4 sm:space-y-6 px-4 sm:px-0">
      <div className="rounded-xl bg-slate-50 px-4 py-4 sm:px-6 sm:py-5 dark:bg-white/5">
        <MathText text={question} className="text-base sm:text-lg font-medium text-slate-800 dark:text-slate-200" />
        {false && standard && (
          <span className="mt-2 inline-block rounded bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-600 dark:bg-green-500/20 dark:text-green-400">
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
          className="w-44 rounded-xl border-2 border-green-300 bg-white px-4 py-3 text-center text-xl font-bold text-green-700 outline-none focus:border-green-500 dark:border-green-500 dark:bg-[#1E1E1E] dark:text-green-300"
          autoFocus
        />
      </div>
      <p className="text-center text-xs text-slate-400">Enter a number, decimal, or fraction (e.g., 3/4)</p>
    </div>
  );
}

// ─── Phase Types ───────────────────────────────────────────────────

type TestPhase = "module1" | "review_m1" | "break" | "module2" | "review_m2" | "finished";

// ─── Main Test Runner ──────────────────────────────────────────────

interface SATTestRunnerProps {
  questions: SATQuestion[];
  config: SATTestConfig;
  onFinish: () => void;
}

export default function SATTestRunner({ questions, config, onFinish }: SATTestRunnerProps) {
  // Phase state machine
  const [phase, setPhase] = useState<TestPhase>("module1");

  // Per-module questions
  const [m1Questions] = useState<SATQuestion[]>(questions);
  const [m2Questions, setM2Questions] = useState<SATQuestion[]>([]);

  // Per-module answers
  const [m1Answers, setM1Answers] = useState<Record<string, string | null>>({});
  const [m2Answers, setM2Answers] = useState<Record<string, string | null>>({});

  // Per-module flagged
  const [m1Flagged, setM1Flagged] = useState<Set<number>>(new Set());
  const [m2Flagged, setM2Flagged] = useState<Set<number>>(new Set());

  // Per-module eliminated choices
  const [m1Eliminated, setM1Eliminated] = useState<Record<number, Set<number>>>({});
  const [m2Eliminated, setM2Eliminated] = useState<Record<number, Set<number>>>({});

  // Per-module timers
  const [m1TimeLeft, setM1TimeLeft] = useState(config.time_per_module_minutes * 60);
  const [m2TimeLeft, setM2TimeLeft] = useState(config.time_per_module_minutes * 60);
  const [breakTimeLeft, setBreakTimeLeft] = useState((config.breakMinutes || 0) * 60);

  // Module 2 routing
  const [module2Difficulty, setModule2Difficulty] = useState<"easy" | "hard" | "none">("none");

  // Current question index (resets per module)
  const [currentQ, setCurrentQ] = useState(0);

  // UI toggles
  const [showTimer, setShowTimer] = useState(true);
  const [showDesmos, setShowDesmos] = useState(false);
  const [showFormulas, setShowFormulas] = useState(false);

  // Results
  const [results, setResults] = useState<React.ComponentProps<typeof SATResults>["results"] | null>(null);

  // Time tracking per question
  const questionStartRef = useRef(Date.now());
  const timePerQuestion = useRef<Record<string, number>>({});
  const testStartRef = useRef(Date.now());
  const module2StartRef = useRef(0);

  // ─── Phase-aware aliases ─────────────────────────────────────────

  const isM2 = phase === "module2" || phase === "review_m2";
  const currentQuestions = isM2 ? m2Questions : m1Questions;
  const currentAnswers = isM2 ? m2Answers : m1Answers;
  const setCurrentAnswers = isM2 ? setM2Answers : setM1Answers;
  const currentFlagged = isM2 ? m2Flagged : m1Flagged;
  const setCurrentFlagged = isM2 ? setM2Flagged : setM1Flagged;
  const currentEliminated = isM2 ? m2Eliminated : m1Eliminated;
  const setCurrentEliminated = isM2 ? setM2Eliminated : setM1Eliminated;
  const currentTimeLeft = isM2 ? m2TimeLeft : m1TimeLeft;
  const setCurrentTimeLeft = isM2 ? setM2TimeLeft : setM1TimeLeft;
  const moduleNumber = isM2 ? 2 : 1;
  const totalModules = config.adaptive ? 2 : config.modules;

  // ─── Timer countdown ─────────────────────────────────────────────

  useEffect(() => {
    if (phase === "finished" || phase === "review_m1" || phase === "review_m2") return;

    const interval = setInterval(() => {
      if (phase === "module1") {
        setM1TimeLeft((prev) => {
          if (prev <= 1) {
            setPhase("review_m1");
            return 0;
          }
          return prev - 1;
        });
      } else if (phase === "module2") {
        setM2TimeLeft((prev) => {
          if (prev <= 1) {
            setPhase("review_m2");
            return 0;
          }
          return prev - 1;
        });
      } else if (phase === "break") {
        setBreakTimeLeft((prev) => {
          if (prev <= 1) {
            startModule2();
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Track time per question
  useEffect(() => {
    questionStartRef.current = Date.now();
  }, [currentQ, phase]);

  // ─── Helpers ─────────────────────────────────────────────────────

  const recordQuestionTime = useCallback(() => {
    const elapsed = (Date.now() - questionStartRef.current) / 1000;
    const key = `${moduleNumber}-${currentQ}`;
    timePerQuestion.current[key] = (timePerQuestion.current[key] || 0) + elapsed;
  }, [currentQ, moduleNumber]);

  const handleAnswer = useCallback((answer: string) => {
    setCurrentAnswers((prev) => ({ ...prev, [currentQuestions[currentQ].id]: answer }));
  }, [currentQ, currentQuestions, setCurrentAnswers]);

  const handleFlag = useCallback(() => {
    setCurrentFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(currentQ)) next.delete(currentQ);
      else next.add(currentQ);
      return next;
    });
  }, [currentQ, setCurrentFlagged]);

  const handleEliminate = useCallback((choiceIdx: number) => {
    setCurrentEliminated((prev) => {
      const current = new Set(prev[currentQ] || []);
      if (current.has(choiceIdx)) current.delete(choiceIdx);
      else current.add(choiceIdx);
      return { ...prev, [currentQ]: current };
    });
  }, [currentQ, setCurrentEliminated]);

  const goTo = useCallback((idx: number) => {
    recordQuestionTime();
    setCurrentQ(Math.max(0, Math.min(currentQuestions.length - 1, idx)));
  }, [currentQuestions.length, recordQuestionTime]);

  // ─── Grading ─────────────────────────────────────────────────────

  function gradeModule(qs: SATQuestion[], ans: Record<string, string | null>): number {
    return qs.filter((q) => {
      const userAnswer = ans[q.id];
      if (!userAnswer) return false;
      if (q.template_type === "multiple_choice_math") {
        const choices = q.config.choices as { text: string; correct: boolean }[];
        return choices.some((c) => c.correct && c.text === userAnswer);
      } else {
        const correctAnswers = q.config.correct_answers as number[];
        const tolerance = (q.config.tolerance as number) || 0.01;
        const parsed = parseFloat(
          userAnswer.includes("/")
            ? (() => { const [n, d] = userAnswer.split("/").map(Number); return (n / d).toString(); })()
            : userAnswer
        );
        return correctAnswers?.some((ca) => Math.abs(parsed - ca) <= tolerance) || false;
      }
    }).length;
  }

  function gradeAndFinish(
    allQuestions: SATQuestion[],
    allAnswers: Record<string, string | null>,
    m2Diff: "easy" | "hard" | "none"
  ) {
    const questionResults = allQuestions.map((q, i) => {
      const userAnswer = allAnswers[q.id] || null;
      let correct = false;

      if (q.template_type === "multiple_choice_math") {
        const choices = q.config.choices as { text: string; correct: boolean }[];
        correct = choices.some((c) => c.correct && c.text === userAnswer);
      } else if (q.template_type === "numeric_input") {
        const correctAnswers = q.config.correct_answers as number[];
        const tolerance = (q.config.tolerance as number) || 0.01;
        const parsed = userAnswer
          ? parseFloat(
              userAnswer.includes("/")
                ? (() => { const [n, d] = userAnswer.split("/").map(Number); return (n / d).toString(); })()
                : userAnswer
            )
          : NaN;
        correct = correctAnswers?.some((ca) => Math.abs(parsed - ca) <= tolerance) || false;
      }

      const mod = i < m1Questions.length ? 1 : 2;
      const qIdx = mod === 1 ? i : i - m1Questions.length;
      const key = `${mod}-${qIdx}`;

      return {
        question: q,
        userAnswer,
        correct,
        timeSeconds: timePerQuestion.current[key] || 0,
      };
    });

    setResults(questionResults);
    setModule2Difficulty(m2Diff);
    setPhase("finished");
  }

  // ─── Phase transitions ───────────────────────────────────────────

  function submitModule1() {
    recordQuestionTime();

    if (!config.adaptive) {
      // Non-adaptive: grade and finish immediately
      gradeAndFinish(m1Questions, m1Answers, "none");
      return;
    }

    // Adaptive: grade M1, determine routing, generate M2
    const m1Correct = gradeModule(m1Questions, m1Answers);
    const threshold = Math.ceil(m1Questions.length * 0.6);
    const difficulty: "easy" | "hard" = m1Correct >= threshold ? "hard" : "easy";
    setModule2Difficulty(difficulty);

    // Generate M2 questions with appropriate difficulty bias
    const m2Qs = generateModuleQuestions(config.questions_per_module, difficulty);
    setM2Questions(m2Qs);
    setCurrentQ(0);
    setPhase("break");
  }

  function startModule2() {
    setCurrentQ(0);
    questionStartRef.current = Date.now();
    module2StartRef.current = Date.now();
    setPhase("module2");
  }

  function submitModule2() {
    recordQuestionTime();
    gradeAndFinish(
      [...m1Questions, ...m2Questions],
      { ...m1Answers, ...m2Answers },
      module2Difficulty
    );
  }

  // ─── Keyboard shortcuts ──────────────────────────────────────────

  useEffect(() => {
    if (phase !== "module1" && phase !== "module2") return;

    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        if (e.key === "Escape") {
          setShowDesmos(false);
          setShowFormulas(false);
        }
        return;
      }

      const q = currentQuestions[currentQ];
      if (q?.template_type === "multiple_choice_math") {
        const choices = q.config.choices as { text: string }[];
        const keyMap: Record<string, number> = { a: 0, b: 1, c: 2, d: 3 };
        const idx = keyMap[e.key.toLowerCase()];
        if (idx !== undefined && idx < choices.length) {
          handleAnswer(choices[idx].text);
          return;
        }
      }

      if (e.key === "ArrowRight" || e.key === "ArrowDown") goTo(currentQ + 1);
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") goTo(currentQ - 1);
      else if (e.key.toLowerCase() === "f") handleFlag();
      else if (e.key === "Escape") {
        setShowDesmos(false);
        setShowFormulas(false);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, currentQ, currentQuestions, handleAnswer, goTo, handleFlag]);

  // ─── Format time helper ──────────────────────────────────────────

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  const timeStr = formatTime(currentTimeLeft);
  const isLowTime = currentTimeLeft < 60;

  // ─── Render: Finished ────────────────────────────────────────────

  if (phase === "finished" && results) {
    return (
      <SATResults
        results={results}
        totalTimeSeconds={(Date.now() - testStartRef.current) / 1000}
        onRetake={onFinish}
        onExit={onFinish}
      />
    );
  }

  // ─── Render: Review phases ───────────────────────────────────────

  if (phase === "review_m1" || phase === "review_m2") {
    return (
      <SATReviewScreen
        moduleNumber={phase === "review_m1" ? 1 : 2}
        totalModules={totalModules}
        questions={currentQuestions}
        answers={currentAnswers}
        flagged={currentFlagged}
        onGoToQuestion={(i) => {
          setCurrentQ(i);
          setPhase(phase === "review_m1" ? "module1" : "module2");
        }}
        onSubmitModule={phase === "review_m1" ? submitModule1 : submitModule2}
        onCancel={() => setPhase(phase === "review_m1" ? "module1" : "module2")}
      />
    );
  }

  // ─── Render: Break ───────────────────────────────────────────────

  if (phase === "break") {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-50 dark:bg-[#1E1E1E]">
        <div className="text-center space-y-6 max-w-md mx-auto px-4">
          <div className="text-6xl">&#9749;</div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Break Time</h2>
          <p className="text-slate-500 dark:text-slate-400">Take a moment to rest before Module 2</p>

          {/* Module 1 result indicator */}
          <div className="rounded-xl bg-white border border-slate-200 p-4 dark:bg-[#2C2C2C] dark:border-white/10">
            <p className="text-sm text-slate-500 dark:text-slate-400">Module 2 Difficulty</p>
            <p className={`text-lg font-bold ${module2Difficulty === "hard" ? "text-red-500" : "text-blue-500"}`}>
              {module2Difficulty === "hard" ? "Hard" : "Standard"}
            </p>
            <p className="text-xs text-slate-400 mt-1">Based on your Module 1 performance</p>
          </div>

          <div className="text-4xl font-mono font-bold text-slate-700 dark:text-slate-300">
            {formatTime(breakTimeLeft)}
          </div>

          <Button onClick={startModule2} className="bg-green-600 hover:bg-green-700 text-white">
            Skip Break &rarr; Start Module 2
          </Button>
        </div>
      </div>
    );
  }

  // ─── Render: Module 1 or Module 2 (question view) ────────────────

  const q = currentQuestions[currentQ];
  const answeredCount = Object.values(currentAnswers).filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-white dark:bg-[#1E1E1E]">
      {/* Top bar */}
      <div className="flex h-auto min-h-[48px] shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 sm:px-4 dark:border-white/10 dark:bg-[#161622]">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
            Module {moduleNumber} of {totalModules}
          </span>
          <span className="rounded bg-green-100 px-2 py-0.5 text-[10px] sm:text-xs font-medium text-green-600 dark:bg-green-500/20 dark:text-green-400">
            {currentQ + 1}/{currentQuestions.length}
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
              showFormulas ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400" : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
            }`}>
            <BookOpen className="h-3.5 w-3.5" /> Reference
          </button>

          {/* Review & Submit */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              recordQuestionTime();
              setPhase(phase === "module1" ? "review_m1" : "review_m2");
            }}
          >
            Review &amp; Submit ({answeredCount}/{currentQuestions.length})
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
            answer={currentAnswers[q.id] || null}
            onAnswer={handleAnswer}
            eliminatedChoices={currentEliminated[currentQ] || new Set()}
            onEliminate={handleEliminate}
          />
        ) : (
          <NumericQuestion
            config={q.config}
            answer={currentAnswers[q.id] || null}
            onAnswer={handleAnswer}
          />
        )}
      </div>

      {/* Bottom navigation bar */}
      <div className="shrink-0 border-t border-slate-200 bg-slate-50 px-3 py-2 sm:px-4 sm:py-2.5 dark:border-white/10 dark:bg-[#161622]">
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:justify-between">
          {/* Prev / Flag / Next */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => goTo(currentQ - 1)} disabled={currentQ === 0}>
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <Button
              variant={currentFlagged.has(currentQ) ? "default" : "outline"}
              size="sm"
              onClick={handleFlag}
              className={currentFlagged.has(currentQ) ? "bg-amber-500 hover:bg-amber-600" : ""}
            >
              <Flag className="h-3.5 w-3.5 mr-1" />
              {currentFlagged.has(currentQ) ? "Flagged" : "Flag"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => goTo(currentQ + 1)} disabled={currentQ === currentQuestions.length - 1}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Question map (scoped to current module) */}
          <div className="flex gap-1 overflow-x-auto max-w-full pb-1">
            {currentQuestions.map((_, i) => {
              const isAnswered = !!currentAnswers[currentQuestions[i].id];
              const isFlagged = currentFlagged.has(i);
              const isCurrent = i === currentQ;
              return (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={`flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg text-[10px] sm:text-xs font-bold transition-all ${
                    isCurrent
                      ? "bg-green-600 text-white ring-2 ring-green-300"
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
        <div className="fixed top-12 right-2 sm:right-4 z-50 w-[calc(100%-16px)] sm:w-80 max-h-[70vh] overflow-auto rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xl dark:border-white/10 dark:bg-[#1E1E1E]">
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

      {/* AI Tutor */}
      <AiTutorPanel
        context={{
          type: "sat",
          exerciseTitle: `SAT Math Q${currentQ + 1}: ${(currentQuestions[currentQ]?.config as Record<string, unknown>)?.question || ""}`.slice(0, 100),
        }}
      />
    </div>
  );
}

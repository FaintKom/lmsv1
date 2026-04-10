"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";
import { CheckCircle, XCircle, Upload, Loader2, Play, Send, ChevronDown, Maximize2, Minimize2, X, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";
import { Button } from "@/components/ui/button";
import Editor from "@monaco-editor/react";
import MatchingExercise from "@/components/submissions/exercises/matching";
import OrderingExercise from "@/components/submissions/exercises/ordering";
import FillBlanksExercise from "@/components/submissions/exercises/fill-blanks";
import TrueFalseExercise from "@/components/submissions/exercises/true-false";
import CategorizeExercise from "@/components/submissions/exercises/categorize";
import TranslationExercise from "@/components/exercises/translation-exercise";
import SentenceBuilderExercise from "@/components/exercises/sentence-builder-exercise";
import DialogueExercise from "@/components/exercises/dialogue-exercise";
import ConjugationExercise from "@/components/exercises/conjugation-exercise";
import ReadingExercise from "@/components/exercises/reading-exercise";
import { AiTutorPanel } from "@/components/ai/ai-tutor-panel";

const Robot2DExercise = dynamic(() => import("@/components/game/robot-2d/robot-2d-exercise"), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center py-12 text-sm text-slate-500"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading 2D Robot...</div>,
});

const MathExercise = dynamic(() => import("@/components/game/math/math-exercise"), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center py-12 text-sm text-slate-500"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading Math Exercise...</div>,
});

const World3DExercise = dynamic(() => import("@/components/game/world-3d/world-3d-exercise"), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center py-12 text-sm text-slate-500"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading 3D World...</div>,
});

const WebEditorExercise = dynamic(() => import("@/components/exercises/web-editor-exercise"), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center py-12 text-sm text-slate-500"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading Web Editor...</div>,
});

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  options: { text: string; is_correct?: boolean }[] | null;
  correct_answer: string | null;
  points: number;
  sort_order: number;
}

interface TestCase {
  id: string;
  input: string;
  expected_output: string;
  is_hidden: boolean;
  sort_order: number;
}

interface Exercise {
  id: string;
  exercise_type:
    | "quiz"
    | "code_challenge"
    | "matching"
    | "ordering"
    | "fill_blanks"
    | "true_false"
    | "categorize"
    | "file_upload"
    | "robot_2d"
    | "math_interactive"
    | "world_3d"
    | "translation"
    | "sentence_builder"
    | "dialogue"
    | "conjugation"
    | "reading"
    | "web_editor";
  title: string;
  config: Record<string, unknown>;
  questions?: Question[];
  test_cases?: TestCase[];
  max_attempts?: number | null;
}

interface SubmissionResult {
  score: number | null;
  passed: boolean | null;
  total_passed?: number | null;
  total_tests?: number | null;
  attempt_number?: number | null;
  attempts_remaining?: number | null;
  max_attempts_reached?: boolean;
  correct_answer?: Record<string, unknown> | null;
}

interface LessonNavItem {
  id: string;
  title: string;
}

interface ExerciseRendererProps {
  exercise: Exercise;
  courseId?: string;
  prevLesson?: LessonNavItem | null;
  nextLesson?: LessonNavItem | null;
}

const FULLSCREEN_TYPES = new Set(["robot_2d", "math_interactive", "world_3d"]);

export default function ExerciseRenderer({ exercise, courseId, prevLesson, nextLesson }: ExerciseRendererProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const isGameType = FULLSCREEN_TYPES.has(exercise.exercise_type);
  const [fullscreen, setFullscreen] = useState(false); // never auto-open — let student read theory first

  // Attempt tracking
  const [attemptCount, setAttemptCount] = useState(0);
  const [maxAttempts, setMaxAttempts] = useState(exercise.max_attempts ?? 100);
  const [maxReached, setMaxReached] = useState(false);
  const [revealedAnswer, setRevealedAnswer] = useState<Record<string, unknown> | null>(null);

  // Fetch attempt status on mount
  useEffect(() => {
    apiClient.get(`/exercises/${exercise.id}/attempts`).then(({ data }) => {
      setAttemptCount(data.attempt_count ?? 0);
      setMaxAttempts(data.max_attempts ?? 100);
      if (data.max_reached) {
        setMaxReached(true);
      }
    }).catch(() => {});
  }, [exercise.id]);

  const openFullscreen = useCallback(() => setFullscreen(true), []);
  const closeFullscreen = useCallback(() => setFullscreen(false), []);

  // Escape key to exit fullscreen
  useEffect(() => {
    if (!fullscreen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeFullscreen();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [fullscreen, closeFullscreen]);

  // Lock body scroll in fullscreen
  useEffect(() => {
    if (fullscreen) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [fullscreen]);

  const handleSubmit = async (body: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      const res = await apiClient.post(`/exercises/${exercise.id}/submit`, body);
      setResult(res.data);
      setAttemptCount(res.data.attempt_number ?? attemptCount + 1);
      if (res.data.attempts_remaining != null) {
        setMaxAttempts(maxAttempts);
      }
      if (res.data.max_attempts_reached) {
        setMaxReached(true);
        setRevealedAnswer(res.data.correct_answer ?? null);
      }
      if (res.data.passed) {
        toast.success("Correct! Well done.");
      } else if (res.data.max_attempts_reached) {
        toast.info("Max attempts reached. Answer revealed.");
      } else {
        toast.info(`Score: ${Math.round(res.data.score ?? 0)}%`);
      }
      // Close fullscreen on submission
      if (res.data.passed) closeFullscreen();
    } catch {
      toast.error("Failed to submit exercise.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiClient.post(`/exercises/${exercise.id}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(res.data);
      toast.success("File uploaded successfully!");
    } catch {
      toast.error("Failed to upload file.");
    } finally {
      setSubmitting(false);
    }
  };

  const exerciseContent = (
    <>
      {/* Attempt counter */}
      {maxAttempts < 1000 && attemptCount > 0 && !maxReached && (
        <div className="mb-3 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-white/5">
          <span>Attempt {attemptCount} / {maxAttempts}</span>
          <span>{Math.max(0, maxAttempts - attemptCount)} remaining</span>
        </div>
      )}

      {/* Max attempts reached — show answer */}
      {maxReached && revealedAnswer ? (
        <AnswerReveal answer={revealedAnswer} />
      ) : result ? (
        <ResultDisplay
          result={result}
          onRetry={() => setResult(null)}
          attemptsRemaining={maxAttempts - attemptCount}
          maxReached={maxReached}
          revealedAnswer={revealedAnswer}
        />
      ) : submitting ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Submitting...
        </div>
      ) : (
        <ExerciseBody
          exercise={exercise}
          onSubmit={handleSubmit}
          onFileUpload={handleFileUpload}
        />
      )}
    </>
  );

  // Fullscreen portal for game types
  if (fullscreen && typeof document !== "undefined") {
    return (
      <>
        {/* Placeholder in the page flow */}
        <div className="rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#1E1E1E]">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 dark:border-white/5">
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{exercise.title}</h3>
              <span className="text-xs capitalize text-slate-400">{exercise.exercise_type.replace(/_/g, " ")}</span>
            </div>
            <span className="text-xs text-green-500">{t("game.fullscreen")}</span>
          </div>
        </div>

        {/* Fullscreen overlay via portal */}
        {createPortal(
          <div className="fixed inset-0 z-[100] flex flex-col bg-white dark:bg-[#1E1E1E]">
            {/* Fullscreen header */}
            <div className="flex h-11 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-3 sm:px-4 dark:border-white/10 dark:bg-[#1E1E1E]">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                {/* Prev lesson */}
                {prevLesson && courseId && (
                  <button
                    onClick={() => { closeFullscreen(); router.push(`/courses/${courseId}/lessons/${prevLesson.id}`); }}
                    className="flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10"
                    title={prevLesson.title}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden sm:inline max-w-[100px] truncate">{prevLesson.title}</span>
                  </button>
                )}
                <h3 className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{exercise.title}</h3>
                {/* Next lesson */}
                {nextLesson && courseId && (
                  <button
                    onClick={() => { closeFullscreen(); router.push(`/courses/${courseId}/lessons/${nextLesson.id}`); }}
                    className="flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10"
                    title={nextLesson.title}
                  >
                    <span className="hidden sm:inline max-w-[100px] truncate">{nextLesson.title}</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </div>
              <button
                onClick={closeFullscreen}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-200"
                title="Exit fullscreen (Esc)"
              >
                <Minimize2 className="h-3.5 w-3.5" />
                {t("game.exit")}
              </button>
            </div>

            {/* Fullscreen body */}
            <div className="flex-1 overflow-auto">
              {exerciseContent}
            </div>

            {/* AI Tutor in fullscreen */}
            <AiTutorPanel
              context={{
                type: "exercise",
                exerciseId: exercise.id,
                exerciseTitle: exercise.title,
              }}
            />
          </div>,
          document.body
        )}
      </>
    );
  }

  // Normal card view
  return (
    <div className="rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#1E1E1E]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 dark:border-white/5">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{exercise.title}</h3>
          <span className="text-xs capitalize text-slate-400">{exercise.exercise_type.replace(/_/g, " ")}</span>
        </div>
        {isGameType && (
          <button
            onClick={openFullscreen}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-green-600 transition-colors hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-500/10"
            title="Open fullscreen"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            {t("game.fullscreen")}
          </button>
        )}
      </div>

      {/* Body */}
      <div className="p-5">
        {exerciseContent}
      </div>
    </div>
  );
}

function AnswerReveal({ answer }: { answer: Record<string, unknown> }) {
  const explanation = answer.explanation as string | undefined;
  const answerValue = answer.answer;

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center dark:border-emerald-500/30 dark:bg-emerald-500/10">
      <CheckCircle className="mx-auto mb-2 h-10 w-10 text-emerald-500" />
      <p className="text-lg font-semibold text-slate-800 dark:text-slate-200">
        Answer Revealed
      </p>
      <p className="mt-1 text-xs text-slate-500">Max attempts reached — exercise marked as complete</p>
      {answerValue != null && (
        <div className="mt-3 rounded-lg bg-white p-3 text-left text-sm text-slate-700 dark:bg-[#1E1E1E] dark:text-slate-300">
          <p className="font-semibold text-emerald-700 dark:text-emerald-400">Correct answer:</p>
          <p className="mt-1">{typeof answerValue === "object" ? JSON.stringify(answerValue, null, 2) : String(answerValue)}</p>
        </div>
      )}
      {explanation && (
        <div className="mt-2 rounded-lg bg-white p-3 text-left text-sm text-slate-600 dark:bg-[#1E1E1E] dark:text-slate-400">
          <p className="font-semibold">Explanation:</p>
          <p className="mt-1">{explanation}</p>
        </div>
      )}
    </div>
  );
}

function ResultDisplay({
  result,
  onRetry,
  attemptsRemaining,
  maxReached,
  revealedAnswer,
}: {
  result: SubmissionResult;
  onRetry: () => void;
  attemptsRemaining?: number;
  maxReached?: boolean;
  revealedAnswer?: Record<string, unknown> | null;
}) {
  const passed = result.passed;
  const scorePercent = Math.round(result.score ?? 0);

  // If max reached after this submission, show answer reveal
  if (maxReached && revealedAnswer) {
    return <AnswerReveal answer={revealedAnswer} />;
  }

  return (
    <div className="text-center py-6">
      {passed ? (
        <CheckCircle className="mx-auto mb-2 h-10 w-10 text-emerald-500" />
      ) : (
        <XCircle className="mx-auto mb-2 h-10 w-10 text-amber-500" />
      )}
      <p className="text-lg font-semibold text-slate-800 dark:text-slate-200">
        {passed ? "Passed!" : "Not quite"}
      </p>
      <p className="text-sm text-slate-500">Score: {scorePercent}%</p>
      {result.total_tests != null && (
        <p className="text-xs text-slate-400">
          Tests: {result.total_passed}/{result.total_tests} passed
        </p>
      )}
      {!passed && attemptsRemaining != null && attemptsRemaining > 0 && (
        <p className="mt-1 text-xs text-slate-400">
          {attemptsRemaining} attempt{attemptsRemaining !== 1 ? "s" : ""} remaining
        </p>
      )}
      {!passed && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Try Again
        </Button>
      )}
      {passed && (
        <p className="mt-2 text-xs text-emerald-500">Exercise complete!</p>
      )}
    </div>
  );
}

function ExerciseBody({
  exercise,
  onSubmit,
  onFileUpload,
}: {
  exercise: Exercise;
  onSubmit: (body: Record<string, unknown>) => void;
  onFileUpload: (file: File) => void;
}) {
  switch (exercise.exercise_type) {
    case "quiz":
      return (
        <QuizExercise
          questions={exercise.questions || []}
          onSubmit={(answers) => onSubmit({ answers })}
        />
      );

    case "matching":
      return (
        <MatchingExercise
          pairs={(exercise.config as { pairs?: { left: string; right: string }[] }).pairs || []}
          onSubmit={(answers) => onSubmit({ interactive_answers: answers })}
        />
      );

    case "ordering":
      return (
        <OrderingExercise
          items={(exercise.config as { items?: string[] }).items || []}
          onSubmit={(answers) => onSubmit({ interactive_answers: answers })}
        />
      );

    case "fill_blanks": {
      const cfg = exercise.config as { text?: string; blanks?: string[]; word_bank?: string[] };
      const text = cfg.text || "";
      const words = cfg.word_bank || cfg.blanks || [];
      const blankCount = (text.match(/\{\{blank\}\}/g) || []).length;
      return (
        <FillBlanksExercise
          textTemplate={text}
          blankCount={blankCount}
          words={words}
          onSubmit={(answers) => onSubmit({ interactive_answers: answers })}
        />
      );
    }

    case "true_false":
      return (
        <TrueFalseExercise
          statement={(exercise.config as { statement?: string }).statement || ""}
          onSubmit={(answers) => onSubmit({ interactive_answers: answers })}
        />
      );

    case "categorize": {
      const catCfg = exercise.config as {
        categories?: { name: string; items: string[] }[];
      };
      const categories = catCfg.categories || [];
      const allItems = categories.flatMap((c) => c.items);
      return (
        <CategorizeExercise
          categories={categories}
          allItems={allItems}
          onSubmit={(answers) => onSubmit({ interactive_answers: answers })}
        />
      );
    }

    case "code_challenge":
      return (
        <CodeChallengeExercise
          exerciseId={exercise.id}
          config={exercise.config as { language?: string; starter_code?: string }}
          testCases={exercise.test_cases || []}
          onSubmit={(body) => {
            if (!(body as { _already_submitted?: boolean })._already_submitted) {
              onSubmit(body);
            }
          }}
        />
      );

    case "file_upload":
      return <FileUploadExercise config={exercise.config} onUpload={onFileUpload} />;

    case "robot_2d":
      return (
        <Robot2DExercise
          exerciseId={exercise.id}
          config={exercise.config}
          onSubmit={(result) => onSubmit({ game_result: result })}
        />
      );

    case "math_interactive":
      return (
        <MathExercise
          exerciseId={exercise.id}
          config={exercise.config}
          onSubmit={(result) => onSubmit({ game_result: result })}
        />
      );

    case "world_3d":
      return (
        <World3DExercise
          exerciseId={exercise.id}
          config={exercise.config}
          onSubmit={(result) => onSubmit({ game_result: result })}
        />
      );

    case "translation": {
      const cfg = exercise.config as { source_text?: string; source_language?: string; target_language?: string; hints?: string[]; accepted_answers?: string[]; case_sensitive?: boolean };
      return <TranslationExercise config={cfg} onSubmit={(answers) => onSubmit({ interactive_answers: answers })} />;
    }

    case "sentence_builder": {
      const cfg = exercise.config as { words?: string[]; correct_order?: string[]; distractors?: string[]; instructions?: string };
      return <SentenceBuilderExercise config={cfg} onSubmit={(answers) => onSubmit({ interactive_answers: answers })} />;
    }

    case "dialogue": {
      const cfg = exercise.config as { context?: string; messages?: { speaker: string; text: string; options?: { id: string; text: string; is_correct?: boolean }[] }[] };
      return <DialogueExercise config={cfg} onSubmit={(answers) => onSubmit({ interactive_answers: answers })} />;
    }

    case "conjugation": {
      const cfg = exercise.config as { verb?: string; tense?: string; language?: string; table?: { pronoun: string; correct: string }[] };
      return <ConjugationExercise config={cfg} onSubmit={(answers) => onSubmit({ interactive_answers: answers })} />;
    }

    case "reading": {
      const cfg = exercise.config as { passage?: string; questions?: { question: string; type: "multiple_choice" | "text"; options?: { id: string; text: string; is_correct?: boolean }[]; correct_answer?: string }[] };
      return <ReadingExercise config={cfg} onSubmit={(answers) => onSubmit({ interactive_answers: answers })} />;
    }

    case "web_editor":
      return (
        <WebEditorExercise
          exerciseId={exercise.id}
          config={exercise.config as { description?: string; starter_html?: string; starter_css?: string; starter_js?: string; requirements?: string[] }}
          onSubmit={(body) => {
            if (!(body as { _already_submitted?: boolean })._already_submitted) {
              onSubmit(body);
            }
          }}
        />
      );

    default:
      return (
        <p className="text-sm text-slate-500">
          Unsupported exercise type: {exercise.exercise_type}
        </p>
      );
  }
}

// ─── Quiz ────────────────────────────────────────────────────────────

function QuizExercise({
  questions,
  onSubmit,
}: {
  questions: Question[];
  onSubmit: (answers: { question_id: string; selected_option: string }[]) => void;
}) {
  const [selected, setSelected] = useState<Record<string, string>>({});

  const handleSelect = (questionId: string, value: string) => {
    setSelected((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = () => {
    const answers = questions.map((q) => ({
      question_id: q.id,
      selected_option: selected[q.id] || "",
    }));
    onSubmit(answers);
  };

  const allAnswered = questions.every((q) => selected[q.id]);

  return (
    <div className="space-y-6">
      {questions.map((q, qi) => (
        <div key={q.id}>
          <p className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-300">
            {qi + 1}. {q.question_text}
          </p>
          <div className="space-y-2">
            {(q.options || []).map((opt, oi) => (
              <label
                key={oi}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-2.5 text-sm transition-colors ${
                  selected[q.id] === opt.text
                    ? "border-green-400 bg-green-50 text-green-700 dark:border-green-500 dark:bg-green-500/20 dark:text-green-300"
                    : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-white/10 dark:text-slate-400 dark:hover:border-white/20"
                }`}
              >
                <input
                  type="radio"
                  name={`question-${q.id}`}
                  value={opt.text}
                  checked={selected[q.id] === opt.text}
                  onChange={() => handleSelect(q.id, opt.text)}
                  className="h-4 w-4 text-green-600"
                />
                {opt.text}
              </label>
            ))}
          </div>
        </div>
      ))}

      <button
        onClick={handleSubmit}
        disabled={!allAnswered}
        className="w-full rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50 dark:bg-green-500 dark:hover:bg-green-600"
      >
        Submit Quiz
      </button>
    </div>
  );
}

// ─── Code Challenge ──────────────────────────────────────────────────

interface LangInfo { key: string; name: string; monaco: string }

const FALLBACK_LANGS: LangInfo[] = [
  { key: "python", name: "Python 3", monaco: "python" },
  { key: "javascript", name: "JavaScript (Node.js)", monaco: "javascript" },
];

interface CodeTestResult {
  test_case_id: string;
  passed: boolean;
  actual_output: string;
  time_ms: number;
}

function CodeChallengeExercise({
  exerciseId,
  config,
  testCases,
  onSubmit,
}: {
  exerciseId: string;
  config: { language?: string; starter_code?: string; description?: string };
  testCases: TestCase[];
  onSubmit: (body: Record<string, unknown>) => void;
}) {
  const [code, setCode] = useState(config.starter_code || "");
  const [selectedLang, setSelectedLang] = useState(config.language || "python");
  const [output, setOutput] = useState("");
  const [results, setResults] = useState<CodeTestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"output" | "tests">("output");
  const [totalPassed, setTotalPassed] = useState(0);
  const [totalTests, setTotalTests] = useState(0);
  const [langs, setLangs] = useState<LangInfo[]>(FALLBACK_LANGS);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    apiClient.get("/sandbox/languages").then(({ data }) => {
      if (data.languages?.length > 0) setLangs(data.languages);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const check = () => setIsDark(document.documentElement.classList.contains("dark") || mq.matches);
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    mq.addEventListener("change", check);
    return () => { obs.disconnect(); mq.removeEventListener("change", check); };
  }, []);

  const monacoLang = langs.find((l) => l.key === selectedLang)?.monaco || "plaintext";
  const visibleTests = testCases.filter((t) => !t.is_hidden);

  const handleRun = async () => {
    setIsRunning(true);
    setActiveTab("output");
    try {
      const { data } = await apiClient.post("/sandbox/execute", {
        language: selectedLang,
        source_code: code,
        stdin: "",
      });
      setOutput(data.stdout || data.stderr || "No output");
    } catch {
      setOutput("Error executing code");
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setActiveTab("tests");
    try {
      const { data } = await apiClient.post(`/exercises/${exerciseId}/submit`, {
        source_code: code,
        language: selectedLang,
      });
      const testResults = data.results?.test_results || data.results || [];
      // Filter out hidden test cases from display
      setResults(testResults.filter((r: Record<string, unknown>) => !r.is_hidden).map((r: Record<string, unknown>) => ({
        test_case_id: r.test_case_id as string,
        passed: r.passed as boolean,
        actual_output: (r.actual as string) || (r.actual_output as string) || "",
        time_ms: (r.execution_time_ms as number) || 0,
      })));
      setTotalPassed(data.total_passed ?? 0);
      setTotalTests(data.total_tests ?? 0);
      setOutput(
        `${data.total_passed ?? 0}/${data.total_tests ?? 0} tests passed`
      );
      if (data.passed) {
        toast.success("All tests passed!");
      } else {
        toast.info(`${data.total_passed ?? 0}/${data.total_tests ?? 0} tests passed`);
      }
      onSubmit({ _already_submitted: true });
    } catch {
      setOutput("Error submitting code");
      toast.error("Failed to submit code");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-0 -mx-5 -mb-5">
      {/* Task description */}
      {config.description && (
        <div className="px-5 pb-4">
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-line">
            {config.description}
          </p>
        </div>
      )}
      {/* Visible test cases */}
      {visibleTests.length > 0 && (
        <div className="px-5 pb-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Test Cases
          </p>
          {visibleTests.map((tc, i) => (
            <div
              key={tc.id}
              className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs dark:border-white/10 dark:bg-white/5"
            >
              <span className="font-semibold text-slate-600 dark:text-slate-300">Test {i + 1}</span>
              <div className="mt-1 grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-400">Input:</span>
                  <pre className="mt-0.5 rounded bg-white p-1.5 font-mono text-slate-700 dark:bg-[#1E1E1E] dark:text-slate-300">{tc.input}</pre>
                </div>
                <div>
                  <span className="text-slate-400">Expected:</span>
                  <pre className="mt-0.5 rounded bg-white p-1.5 font-mono text-slate-700 dark:bg-[#1E1E1E] dark:text-slate-300">{tc.expected_output}</pre>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between border-y border-slate-200 bg-white px-4 py-2 dark:border-white/10 dark:bg-[#1E1E1E]">
        <div className="relative">
          <select
            value={selectedLang}
            onChange={(e) => setSelectedLang(e.target.value)}
            className="appearance-none rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-3 pr-8 text-sm font-medium text-slate-700 focus:border-green-400 focus:outline-none dark:border-white/10 dark:bg-[#1E1E1E] dark:text-slate-200"
          >
            {langs.map((l) => (
              <option key={l.key} value={l.key}>{l.name}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRun} disabled={isRunning || !code.trim()}>
            <Play className="h-3.5 w-3.5" />
            {isRunning ? "Running..." : "Run"}
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={isSubmitting || !code.trim()}>
            <Send className="h-3.5 w-3.5" />
            {isSubmitting ? "Submitting..." : "Submit"}
          </Button>
        </div>
      </div>

      {/* Editor + Output split */}
      <div className="flex" style={{ height: 400 }}>
        {/* Code Editor */}
        <div className="flex-1 border-r border-slate-200 dark:border-white/10">
          <Editor
            height="100%"
            language={monacoLang}
            value={code}
            onChange={(value) => setCode(value || "")}
            theme={isDark ? "vs-dark" : "vs-light"}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 4,
              padding: { top: 12 },
              fontFamily: "'Geist Mono', 'Fira Code', 'Consolas', monospace",
            }}
          />
        </div>

        {/* Output Panel */}
        <div className="flex w-[340px] flex-col bg-white dark:bg-[#1E1E1E]">
          <div className="flex border-b border-slate-200 dark:border-white/10" role="tablist" aria-label="Code output tabs">
            <button
              role="tab"
              aria-selected={activeTab === "output"}
              aria-controls="panel-output"
              onClick={() => setActiveTab("output")}
              className={`cursor-pointer px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === "output"
                  ? "border-b-2 border-green-600 text-green-600 dark:border-green-400 dark:text-green-400"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              }`}
            >
              Output
            </button>
            <button
              role="tab"
              aria-selected={activeTab === "tests"}
              aria-controls="panel-tests"
              onClick={() => setActiveTab("tests")}
              className={`cursor-pointer px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === "tests"
                  ? "border-b-2 border-green-600 text-green-600 dark:border-green-400 dark:text-green-400"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              }`}
            >
              Tests
              {results.length > 0 && (
                <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs font-bold ${
                  totalPassed === totalTests ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300" : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
                }`}>
                  {totalPassed}/{totalTests}
                </span>
              )}
            </button>
          </div>

          <div id={`panel-${activeTab}`} role="tabpanel" className="flex-1 overflow-auto bg-slate-50 p-4 dark:bg-[#1E1E1E]">
            {activeTab === "output" ? (
              <pre className="whitespace-pre-wrap font-mono text-sm text-slate-700 dark:text-slate-300">
                {output || <span className="text-slate-400">Click Run to execute your code</span>}
              </pre>
            ) : (
              <div className="space-y-2.5">
                {results.length === 0 ? (
                  <p className="text-sm text-slate-400">Click Submit to run tests</p>
                ) : (
                  results.map((r, i) => (
                    <div
                      key={r.test_case_id || i}
                      className={`rounded-xl border p-3 ${
                        r.passed
                          ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10"
                          : "border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-sm font-semibold">
                          {r.passed ? (
                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                          Test {i + 1}
                        </span>
                        {r.time_ms > 0 && (
                          <span className="text-xs text-slate-400">{r.time_ms}ms</span>
                        )}
                      </div>
                      {!r.passed && r.actual_output && (
                        <div className="mt-2">
                          <p className="text-xs font-medium uppercase text-slate-400">Output:</p>
                          <pre className="mt-1 rounded-lg bg-white p-2 font-mono text-sm text-slate-700 dark:bg-[#1E1E1E] dark:text-slate-300">
                            {r.actual_output}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── File Upload ─────────────────────────────────────────────────────

function FileUploadExercise({
  config,
  onUpload,
}: {
  config: Record<string, unknown>;
  onUpload: (file: File) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const allowedTypes = (config.allowed_types as string[]) || [];
  const maxMb = (config.max_file_mb as number) || 50;

  return (
    <div className="space-y-4">
      <div
        className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center transition-colors hover:border-green-300 dark:border-white/20 dark:bg-white/5 dark:hover:border-green-500"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const dropped = e.dataTransfer.files[0];
          if (dropped) setFile(dropped);
        }}
      >
        <Upload className="mb-2 h-8 w-8 text-slate-400" />
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {file ? file.name : "Drag & drop a file here, or click to browse"}
        </p>
        {allowedTypes.length > 0 && (
          <p className="mt-1 text-xs text-slate-400">
            Allowed: {allowedTypes.join(", ")} (max {maxMb}MB)
          </p>
        )}
        <input
          type="file"
          accept={allowedTypes.join(",")}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setFile(f);
          }}
          className="absolute inset-0 cursor-pointer opacity-0"
          style={{ position: "relative" }}
        />
      </div>

      <button
        onClick={() => file && onUpload(file)}
        disabled={!file}
        className="w-full rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50 dark:bg-green-500 dark:hover:bg-green-600"
      >
        Upload File
      </button>
    </div>
  );
}

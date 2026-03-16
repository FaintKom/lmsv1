"use client";

import { useState, useEffect } from "react";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";
import { CheckCircle, XCircle, Upload, Loader2, Play, Send, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import Editor from "@monaco-editor/react";
import MatchingExercise from "@/components/submissions/exercises/matching";
import OrderingExercise from "@/components/submissions/exercises/ordering";
import FillBlanksExercise from "@/components/submissions/exercises/fill-blanks";
import TrueFalseExercise from "@/components/submissions/exercises/true-false";
import CategorizeExercise from "@/components/submissions/exercises/categorize";

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
    | "file_upload";
  title: string;
  config: Record<string, unknown>;
  questions?: Question[];
  test_cases?: TestCase[];
}

interface SubmissionResult {
  score: number | null;
  passed: boolean | null;
  total_passed?: number | null;
  total_tests?: number | null;
}

interface ExerciseRendererProps {
  exercise: Exercise;
}

export default function ExerciseRenderer({ exercise }: ExerciseRendererProps) {
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmissionResult | null>(null);

  const handleSubmit = async (body: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      const res = await apiClient.post(`/exercises/${exercise.id}/submit`, body);
      setResult(res.data);
      if (res.data.passed) {
        toast.success("Correct! Well done.");
      } else {
        toast.info(`Score: ${Math.round((res.data.score ?? 0) * 100)}%`);
      }
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

  return (
    <div className="rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#2C2C2C]">
      {/* Header */}
      <div className="border-b border-slate-100 px-5 py-3 dark:border-white/5">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          {exercise.title}
        </h3>
        <span className="text-xs capitalize text-slate-400">
          {exercise.exercise_type.replace(/_/g, " ")}
        </span>
      </div>

      {/* Body */}
      <div className="p-5">
        {result ? (
          <ResultDisplay result={result} onRetry={() => setResult(null)} />
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
      </div>
    </div>
  );
}

function ResultDisplay({
  result,
  onRetry,
}: {
  result: SubmissionResult;
  onRetry: () => void;
}) {
  const passed = result.passed;
  const scorePercent = Math.round((result.score ?? 0) * 100);

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
      <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
        Try Again
      </Button>
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
                    ? "border-indigo-400 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-500/20 dark:text-indigo-300"
                    : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-white/10 dark:text-slate-400 dark:hover:border-white/20"
                }`}
              >
                <input
                  type="radio"
                  name={`question-${q.id}`}
                  value={opt.text}
                  checked={selected[q.id] === opt.text}
                  onChange={() => handleSelect(q.id, opt.text)}
                  className="h-4 w-4 text-indigo-600"
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
        className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
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
  config: { language?: string; starter_code?: string };
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

  useEffect(() => {
    apiClient.get("/sandbox/languages").then(({ data }) => {
      if (data.languages?.length > 0) setLangs(data.languages);
    }).catch(() => {});
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
      <div className="flex items-center justify-between border-y border-slate-200 bg-white px-4 py-2 dark:border-white/10 dark:bg-[#2C2C2C]">
        <div className="relative">
          <select
            value={selectedLang}
            onChange={(e) => setSelectedLang(e.target.value)}
            className="appearance-none rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-3 pr-8 text-sm font-medium text-slate-700 focus:border-indigo-400 focus:outline-none dark:border-white/10 dark:bg-[#1E1E1E] dark:text-slate-200"
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
            theme="vs-light"
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
        <div className="flex w-[340px] flex-col bg-white dark:bg-[#2C2C2C]">
          <div className="flex border-b border-slate-200 dark:border-white/10">
            <button
              onClick={() => setActiveTab("output")}
              className={`cursor-pointer px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === "output"
                  ? "border-b-2 border-indigo-600 text-indigo-600"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              Output
            </button>
            <button
              onClick={() => setActiveTab("tests")}
              className={`cursor-pointer px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === "tests"
                  ? "border-b-2 border-indigo-600 text-indigo-600"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              Tests
              {results.length > 0 && (
                <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  totalPassed === totalTests ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                }`}>
                  {totalPassed}/{totalTests}
                </span>
              )}
            </button>
          </div>

          <div className="flex-1 overflow-auto bg-slate-50 p-4 dark:bg-[#1E1E1E]">
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
                          <p className="text-[11px] font-medium uppercase text-slate-400">Output:</p>
                          <pre className="mt-1 rounded-lg bg-white p-2 font-mono text-xs text-slate-700 dark:bg-[#2C2C2C] dark:text-slate-300">
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
        className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center transition-colors hover:border-indigo-300 dark:border-white/20 dark:bg-white/5 dark:hover:border-indigo-500"
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
        className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        Upload File
      </button>
    </div>
  );
}

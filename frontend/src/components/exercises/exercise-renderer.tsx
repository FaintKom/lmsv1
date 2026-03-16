"use client";

import { useState } from "react";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";
import { CheckCircle, XCircle, Upload, Code, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
      const cfg = exercise.config as { text?: string; blanks?: string[] };
      const text = cfg.text || "";
      const blanks = cfg.blanks || [];
      // Count blanks in template
      const blankCount = (text.match(/\{\{blank\}\}/g) || []).length;
      // Provide word bank: correct answers + maybe some distractors
      return (
        <FillBlanksExercise
          textTemplate={text}
          blankCount={blankCount}
          words={blanks}
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
          config={exercise.config as { language?: string; starter_code?: string }}
          testCases={exercise.test_cases || []}
          onSubmit={(body) => onSubmit(body)}
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

function CodeChallengeExercise({
  config,
  testCases,
  onSubmit,
}: {
  config: { language?: string; starter_code?: string };
  testCases: TestCase[];
  onSubmit: (body: Record<string, unknown>) => void;
}) {
  const [code, setCode] = useState(config.starter_code || "");
  const language = config.language || "python";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Code className="h-3.5 w-3.5" />
        Language: <span className="font-medium capitalize">{language}</span>
        {testCases.length > 0 && (
          <span className="ml-2">
            {testCases.filter((t) => !t.is_hidden).length} visible test case(s)
          </span>
        )}
      </div>

      {/* Visible test cases */}
      {testCases
        .filter((t) => !t.is_hidden)
        .map((tc) => (
          <div
            key={tc.id}
            className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs dark:border-white/10 dark:bg-white/5"
          >
            <div className="text-slate-500">
              Input: <code className="font-mono text-slate-700 dark:text-slate-300">{tc.input}</code>
            </div>
            <div className="text-slate-500">
              Expected:{" "}
              <code className="font-mono text-slate-700 dark:text-slate-300">{tc.expected_output}</code>
            </div>
          </div>
        ))}

      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        rows={12}
        className="w-full rounded-lg border border-slate-200 bg-slate-50 p-4 font-mono text-sm text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:border-white/10 dark:bg-[#1E1E1E] dark:text-slate-200"
        placeholder={`Write your ${language} solution here...`}
        spellCheck={false}
      />

      <button
        onClick={() => onSubmit({ source_code: code, language })}
        disabled={!code.trim()}
        className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        Run & Submit
      </button>
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

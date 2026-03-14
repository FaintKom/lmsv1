"use client";

import { useState } from "react";
import apiClient from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Save, CheckCircle, X } from "lucide-react";
import { toast } from "sonner";

interface QuizQuestion {
  id?: string;
  question_text: string;
  question_type: "multiple_choice" | "text_answer";
  options: { id: string; text: string; is_correct: boolean }[];
  correct_answer: string;
  points: number;
  sort_order: number;
}

interface QuizData {
  id?: string;
  lesson_id: string;
  title: string;
  passing_score: number;
  time_limit_minutes: number | null;
  questions?: QuizQuestion[];
}

interface QuizBuilderProps {
  lessonId: string;
  existingQuiz?: QuizData | null;
  onSaved?: () => void;
}

export default function QuizBuilder({ lessonId, existingQuiz, onSaved }: QuizBuilderProps) {
  const [title, setTitle] = useState(existingQuiz?.title || "Quiz");
  const [passingScore, setPassingScore] = useState(existingQuiz?.passing_score || 70);
  const [timeLimit, setTimeLimit] = useState<string>(
    existingQuiz?.time_limit_minutes?.toString() || ""
  );
  const [quizId, setQuizId] = useState<string | null>(existingQuiz?.id || null);
  const [questions, setQuestions] = useState<QuizQuestion[]>(
    existingQuiz?.questions || []
  );
  const [saving, setSaving] = useState(false);

  // New question form
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [newQuestion, setNewQuestion] = useState<QuizQuestion>({
    question_text: "",
    question_type: "multiple_choice",
    options: [
      { id: "a", text: "", is_correct: true },
      { id: "b", text: "", is_correct: false },
    ],
    correct_answer: "",
    points: 1,
    sort_order: 0,
  });

  const handleCreateQuiz = async () => {
    setSaving(true);
    try {
      const { data } = await apiClient.post("/assessments/quizzes", {
        lesson_id: lessonId,
        title,
        passing_score: passingScore,
        time_limit_minutes: timeLimit ? parseInt(timeLimit) : null,
      });
      setQuizId(data.id);
      onSaved?.();
      toast.success("Quiz created");
    } catch {
      toast.error("Failed to create quiz. A quiz may already exist for this lesson.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddQuestion = async () => {
    if (!quizId || !newQuestion.question_text.trim()) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        question_text: newQuestion.question_text,
        question_type: newQuestion.question_type,
        points: newQuestion.points,
      };
      if (newQuestion.question_type === "multiple_choice") {
        payload.options = newQuestion.options;
      } else {
        payload.correct_answer = newQuestion.correct_answer;
      }

      const { data } = await apiClient.post(
        `/assessments/quizzes/${quizId}/questions`,
        payload
      );
      setQuestions([...questions, data]);
      setNewQuestion({
        question_text: "",
        question_type: "multiple_choice",
        options: [
          { id: "a", text: "", is_correct: true },
          { id: "b", text: "", is_correct: false },
        ],
        correct_answer: "",
        points: 1,
        sort_order: questions.length + 1,
      });
      setShowAddQuestion(false);
      onSaved?.();
      toast.success("Question added");
    } catch {
      toast.error("Failed to add question");
    } finally {
      setSaving(false);
    }
  };

  const addOption = () => {
    const nextId = String.fromCharCode(97 + newQuestion.options.length); // a, b, c, d...
    setNewQuestion({
      ...newQuestion,
      options: [...newQuestion.options, { id: nextId, text: "", is_correct: false }],
    });
  };

  const removeOption = (index: number) => {
    if (newQuestion.options.length <= 2) return;
    const opts = newQuestion.options.filter((_, i) => i !== index);
    setNewQuestion({ ...newQuestion, options: opts });
  };

  const updateOption = (index: number, field: string, value: string | boolean) => {
    const opts = [...newQuestion.options];
    if (field === "is_correct" && value === true) {
      // Only one correct answer
      opts.forEach((o, i) => (o.is_correct = i === index));
    } else {
      (opts[index] as Record<string, unknown>)[field] = value;
    }
    setNewQuestion({ ...newQuestion, options: opts });
  };

  return (
    <div className="space-y-4">
      {/* Quiz metadata */}
      {!quizId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create Quiz</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div className="flex gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Passing Score (%)
                </label>
                <input
                  type="number"
                  value={passingScore}
                  onChange={(e) => setPassingScore(parseInt(e.target.value) || 70)}
                  className="w-24 rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Time Limit (min)
                </label>
                <input
                  type="number"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(e.target.value)}
                  placeholder="No limit"
                  className="w-24 rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
            <Button onClick={handleCreateQuiz} disabled={saving || !title.trim()}>
              <Save className="mr-1 h-3 w-3" />
              {saving ? "Creating..." : "Create Quiz"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Questions list */}
      {quizId && (
        <>
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-700">
              Questions ({questions.length})
            </h4>
            <span className="text-xs text-slate-400">
              Pass: {passingScore}% | {timeLimit ? `${timeLimit} min` : "No time limit"}
            </span>
          </div>

          {questions.map((q, i) => (
            <Card key={q.id || i} className="border-slate-200">
              <CardContent className="p-3">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[10px] font-bold text-indigo-600">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800">{q.question_text}</p>
                    <span className="text-[10px] uppercase text-slate-400">
                      {q.question_type.replace("_", " ")} · {q.points} pt
                    </span>
                    {q.question_type === "multiple_choice" && q.options && (
                      <ul className="mt-1 space-y-0.5">
                        {q.options.map((opt) => (
                          <li
                            key={opt.id}
                            className={`flex items-center gap-1 text-xs ${
                              opt.is_correct ? "font-semibold text-emerald-600" : "text-slate-500"
                            }`}
                          >
                            {opt.is_correct ? (
                              <CheckCircle className="h-3 w-3" />
                            ) : (
                              <span className="h-3 w-3" />
                            )}
                            {opt.text}
                          </li>
                        ))}
                      </ul>
                    )}
                    {q.question_type === "text_answer" && q.correct_answer && (
                      <p className="mt-1 text-xs text-emerald-600">
                        Answer: {q.correct_answer}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Add question form */}
          {showAddQuestion ? (
            <Card className="border-indigo-200 bg-indigo-50/30">
              <CardContent className="space-y-3 p-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Question Text
                  </label>
                  <textarea
                    value={newQuestion.question_text}
                    onChange={(e) =>
                      setNewQuestion({ ...newQuestion, question_text: e.target.value })
                    }
                    rows={2}
                    className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="flex gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Type</label>
                    <div className="flex gap-2">
                      {(["multiple_choice", "text_answer"] as const).map((type) => (
                        <button
                          key={type}
                          onClick={() => setNewQuestion({ ...newQuestion, question_type: type })}
                          className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${
                            newQuestion.question_type === type
                              ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                              : "border-slate-200 text-slate-500"
                          }`}
                        >
                          {type === "multiple_choice" ? "Multiple Choice" : "Text Answer"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Points</label>
                    <input
                      type="number"
                      value={newQuestion.points}
                      onChange={(e) =>
                        setNewQuestion({ ...newQuestion, points: parseInt(e.target.value) || 1 })
                      }
                      className="w-16 rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                {newQuestion.question_type === "multiple_choice" && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      Options (click radio to mark correct)
                    </label>
                    <div className="space-y-2">
                      {newQuestion.options.map((opt, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <button
                            onClick={() => updateOption(i, "is_correct", true)}
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                              opt.is_correct
                                ? "border-emerald-500 bg-emerald-500"
                                : "border-slate-300"
                            }`}
                          >
                            {opt.is_correct && (
                              <CheckCircle className="h-3 w-3 text-white" />
                            )}
                          </button>
                          <input
                            type="text"
                            value={opt.text}
                            onChange={(e) => updateOption(i, "text", e.target.value)}
                            placeholder={`Option ${String.fromCharCode(65 + i)}`}
                            className="flex-1 rounded border border-slate-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none"
                          />
                          {newQuestion.options.length > 2 && (
                            <button
                              onClick={() => removeOption(i)}
                              className="text-slate-400 hover:text-red-500"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                      {newQuestion.options.length < 6 && (
                        <button
                          onClick={addOption}
                          className="text-xs text-indigo-600 hover:underline"
                        >
                          + Add option
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {newQuestion.question_type === "text_answer" && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      Correct Answer
                    </label>
                    <input
                      type="text"
                      value={newQuestion.correct_answer}
                      onChange={(e) =>
                        setNewQuestion({ ...newQuestion, correct_answer: e.target.value })
                      }
                      className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddQuestion} disabled={saving}>
                    <Plus className="mr-1 h-3 w-3" />
                    {saving ? "Adding..." : "Add Question"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowAddQuestion(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <button
              onClick={() => setShowAddQuestion(true)}
              className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 py-3 text-sm font-medium text-slate-400 hover:border-indigo-300 hover:text-indigo-500"
            >
              <Plus className="h-4 w-4" />
              Add Question
            </button>
          )}
        </>
      )}
    </div>
  );
}

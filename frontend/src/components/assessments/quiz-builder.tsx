"use client";

import { useState } from "react";
import apiClient from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Save, CheckCircle, X, Pencil, GripVertical } from "lucide-react";
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

const emptyQuestion = (sortOrder: number): QuizQuestion => ({
 question_text: "",
 question_type: "multiple_choice",
 options: [
 { id: "a", text: "", is_correct: true },
 { id: "b", text: "", is_correct: false },
 ],
 correct_answer: "",
 points: 1,
 sort_order: sortOrder,
});

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
 const [editingMeta, setEditingMeta] = useState(false);

 // New question form
 const [showAddQuestion, setShowAddQuestion] = useState(false);
 const [newQuestion, setNewQuestion] = useState<QuizQuestion>(emptyQuestion(0));

 // Editing existing question
 const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
 const [editQuestion, setEditQuestion] = useState<QuizQuestion | null>(null);

 /* ── Quiz CRUD ── */
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

 const handleUpdateQuizMeta = async () => {
 if (!quizId) return;
 setSaving(true);
 try {
 await apiClient.put(`/assessments/quizzes/${quizId}`, {
 title,
 passing_score: passingScore,
 time_limit_minutes: timeLimit ? parseInt(timeLimit) : null,
 });
 setEditingMeta(false);
 onSaved?.();
 toast.success("Quiz updated");
 } catch {
 toast.error("Failed to update quiz");
 } finally {
 setSaving(false);
 }
 };

 /* ── Question CRUD ── */
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
 setNewQuestion(emptyQuestion(questions.length + 1));
 setShowAddQuestion(false);
 onSaved?.();
 toast.success("Question added");
 } catch {
 toast.error("Failed to add question");
 } finally {
 setSaving(false);
 }
 };

 const handleUpdateQuestion = async () => {
 if (!editQuestion || !editingQuestionId) return;
 setSaving(true);
 try {
 const payload: Record<string, unknown> = {
 question_text: editQuestion.question_text,
 question_type: editQuestion.question_type,
 points: editQuestion.points,
 };
 if (editQuestion.question_type === "multiple_choice") {
 payload.options = editQuestion.options;
 } else {
 payload.correct_answer = editQuestion.correct_answer;
 }

 const { data } = await apiClient.put(
 `/assessments/questions/${editingQuestionId}`,
 payload
 );
 setQuestions(questions.map((q) => (q.id === editingQuestionId ? data : q)));
 setEditingQuestionId(null);
 setEditQuestion(null);
 onSaved?.();
 toast.success("Question updated");
 } catch {
 toast.error("Failed to update question");
 } finally {
 setSaving(false);
 }
 };

 const handleDeleteQuestion = async (questionId: string) => {
 if (!confirm("Delete this question?")) return;
 try {
 await apiClient.delete(`/assessments/questions/${questionId}`);
 setQuestions(questions.filter((q) => q.id !== questionId));
 if (editingQuestionId === questionId) {
 setEditingQuestionId(null);
 setEditQuestion(null);
 }
 onSaved?.();
 toast.success("Question deleted");
 } catch {
 toast.error("Failed to delete question");
 }
 };

 const startEditing = (q: QuizQuestion) => {
 setEditingQuestionId(q.id || null);
 setEditQuestion({ ...q, options: q.options?.map((o) => ({ ...o })) || [] });
 };

 /* ── Option helpers (reusable for new + edit) ── */
 const addOptionTo = (
 q: QuizQuestion,
 setter: (q: QuizQuestion) => void
 ) => {
 const nextId = String.fromCharCode(97 + q.options.length);
 setter({ ...q, options: [...q.options, { id: nextId, text: "", is_correct: false }] });
 };

 const removeOptionFrom = (
 q: QuizQuestion,
 index: number,
 setter: (q: QuizQuestion) => void
 ) => {
 if (q.options.length <= 2) return;
 setter({ ...q, options: q.options.filter((_, i) => i !== index) });
 };

 const updateOptionIn = (
 q: QuizQuestion,
 index: number,
 field: string,
 value: string | boolean,
 setter: (q: QuizQuestion) => void
 ) => {
 const opts = q.options.map((o) => ({ ...o }));
 if (field === "is_correct" && value === true) {
 opts.forEach((o, i) => (o.is_correct = i === index));
 } else {
 (opts[index] as Record<string, unknown>)[field] = value;
 }
 setter({ ...q, options: opts });
 };

 /* ── Render question form (shared between add and edit) ── */
 const renderQuestionForm = (
 q: QuizQuestion,
 setter: (q: QuizQuestion) => void,
 onSave: () => void,
 onCancel: () => void,
 saveLabel: string,
 savingLabel: string
 ) => (
 <Card className="border-primary-soft bg-success-soft/30 ">
 <CardContent className="space-y-3 p-4">
 <div>
 <label className="mb-1 block text-xs font-medium text-text-muted ">
 Question Text
 </label>
 <textarea
 value={q.question_text}
 onChange={(e) => setter({ ...q, question_text: e.target.value })}
 rows={2}
 className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-primary focus:outline-none "
 />
 </div>

 <div className="flex gap-3">
 <div>
 <label className="mb-1 block text-xs font-medium text-text-muted ">Type</label>
 <div className="flex gap-2">
 {(["multiple_choice", "text_answer"] as const).map((type) => (
 <button
 key={type}
 onClick={() => setter({ ...q, question_type: type })}
 className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
 q.question_type === type
 ? "border-primary bg-success-soft text-success-fg "
 : "border-border-strong text-text-muted "
 }`}
 >
 {type === "multiple_choice" ? "Multiple Choice" : "Text Answer"}
 </button>
 ))}
 </div>
 </div>
 <div>
 <label className="mb-1 block text-xs font-medium text-text-muted ">Points</label>
 <input
 type="number"
 value={q.points}
 onChange={(e) => setter({ ...q, points: parseInt(e.target.value) || 1 })}
 className="w-16 rounded-lg border border-ink-300 px-2 py-1.5 text-sm focus:border-primary focus:outline-none "
 />
 </div>
 </div>

 {q.question_type === "multiple_choice" && (
 <div>
 <label className="mb-1 block text-xs font-medium text-text-muted ">
 Options (click radio to mark correct)
 </label>
 <div className="space-y-2">
 {q.options.map((opt, i) => (
 <div key={i} className="flex items-center gap-2">
 <button
 onClick={() => updateOptionIn(q, i, "is_correct", true, setter)}
 className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-pill border-2 transition-colors ${
 opt.is_correct
 ? "border-primary bg-primary"
 : "border-ink-300 "
 }`}
 >
 {opt.is_correct && <CheckCircle className="h-3 w-3 text-white" />}
 </button>
 <input
 type="text"
 value={opt.text}
 onChange={(e) => updateOptionIn(q, i, "text", e.target.value, setter)}
 placeholder={`Option ${String.fromCharCode(65 + i)}`}
 className="flex-1 rounded-lg border border-ink-300 px-2 py-1 text-sm focus:border-primary focus:outline-none "
 />
 {q.options.length > 2 && (
 <button
 onClick={() => removeOptionFrom(q, i, setter)}
 className="text-text-subtle hover:text-danger-fg"
 >
 <X className="h-3.5 w-3.5" />
 </button>
 )}
 </div>
 ))}
 {q.options.length < 6 && (
 <button
 onClick={() => addOptionTo(q, setter)}
 className="text-xs text-primary hover:underline "
 >
 + Add option
 </button>
 )}
 </div>
 </div>
 )}

 {q.question_type === "text_answer" && (
 <div>
 <label className="mb-1 block text-xs font-medium text-text-muted ">
 Correct Answer
 </label>
 <input
 type="text"
 value={q.correct_answer}
 onChange={(e) => setter({ ...q, correct_answer: e.target.value })}
 className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-primary focus:outline-none "
 />
 </div>
 )}

 <div className="flex gap-2">
 <Button size="sm" onClick={onSave} disabled={saving || !q.question_text.trim()}>
 <Save className="mr-1 h-3 w-3" />
 {saving ? savingLabel : saveLabel}
 </Button>
 <Button size="sm" variant="ghost" onClick={onCancel}>
 Cancel
 </Button>
 </div>
 </CardContent>
 </Card>
 );

 return (
 <div className="space-y-4">
 {/* Quiz metadata — create */}
 {!quizId && (
 <Card>
 <CardHeader>
 <CardTitle className="text-base">Create Quiz</CardTitle>
 </CardHeader>
 <CardContent className="space-y-3">
 {renderMetaForm()}
 <Button onClick={handleCreateQuiz} disabled={saving || !title.trim()}>
 <Save className="mr-1 h-3 w-3" />
 {saving ? "Creating..." : "Create Quiz"}
 </Button>
 </CardContent>
 </Card>
 )}

 {/* Quiz metadata — view/edit */}
 {quizId && (
 <>
 {editingMeta ? (
 <Card className="border-primary-soft ">
 <CardHeader className="pb-2">
 <CardTitle className="text-base">Edit Quiz Settings</CardTitle>
 </CardHeader>
 <CardContent className="space-y-3">
 {renderMetaForm()}
 <div className="flex gap-2">
 <Button size="sm" onClick={handleUpdateQuizMeta} disabled={saving || !title.trim()}>
 <Save className="mr-1 h-3 w-3" />
 {saving ? "Saving..." : "Save"}
 </Button>
 <Button size="sm" variant="ghost" onClick={() => setEditingMeta(false)}>
 Cancel
 </Button>
 </div>
 </CardContent>
 </Card>
 ) : (
 <div className="flex items-center justify-between rounded-lg border border-border-strong bg-surface-2 px-4 py-3 ">
 <div>
 <h4 className="text-sm font-semibold text-ink-700 ">{title}</h4>
 <span className="text-xs text-text-subtle">
 Pass: {passingScore}% · {timeLimit ? `${timeLimit} min` : "No time limit"} · {questions.length} question{questions.length !== 1 ? "s" : ""}
 </span>
 </div>
 <Button size="sm" variant="ghost" onClick={() => setEditingMeta(true)}>
 <Pencil className="mr-1 h-3 w-3" />
 Edit
 </Button>
 </div>
 )}

 {/* Questions list */}
 {questions.map((q, i) => (
 <div key={q.id || i}>
 {editingQuestionId === q.id ? (
 renderQuestionForm(
 editQuestion!,
 (updated) => setEditQuestion(updated),
 handleUpdateQuestion,
 () => { setEditingQuestionId(null); setEditQuestion(null); },
 "Save Changes",
 "Saving..."
 )
 ) : (
 <Card className="border-border-strong group">
 <CardContent className="p-3">
 <div className="flex items-start gap-2">
 <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-pill bg-success-soft text-[10px] font-bold text-primary ">
 {i + 1}
 </span>
 <div className="flex-1 min-w-0">
 <p className="text-sm font-medium text-ink-700 ">{q.question_text}</p>
 <span className="text-[10px] uppercase text-text-subtle">
 {q.question_type.replace("_", " ")} · {q.points} pt
 </span>
 {q.question_type === "multiple_choice" && q.options && (
 <ul className="mt-1 space-y-0.5">
 {q.options.map((opt) => (
 <li
 key={opt.id}
 className={`flex items-center gap-1 text-xs ${
 opt.is_correct
 ? "font-semibold text-primary "
 : "text-text-muted "
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
 <p className="mt-1 text-xs text-primary ">
 Answer: {q.correct_answer}
 </p>
 )}
 </div>
 {/* Edit / Delete buttons */}
 <div className="flex shrink-0 gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
 <button
 onClick={() => startEditing(q)}
 className="rounded-lg p-1.5 text-text-subtle hover:bg-success-soft hover:text-primary "
 title="Edit question"
 >
 <Pencil className="h-3.5 w-3.5" />
 </button>
 {q.id && (
 <button
 onClick={() => handleDeleteQuestion(q.id!)}
 className="rounded-lg p-1.5 text-text-subtle hover:bg-danger-soft hover:text-danger-fg "
 title="Delete question"
 >
 <Trash2 className="h-3.5 w-3.5" />
 </button>
 )}
 </div>
 </div>
 </CardContent>
 </Card>
 )}
 </div>
 ))}

 {/* Add question form */}
 {showAddQuestion ? (
 renderQuestionForm(
 newQuestion,
 (updated) => setNewQuestion(updated),
 handleAddQuestion,
 () => setShowAddQuestion(false),
 "Add Question",
 "Adding..."
 )
 ) : (
 <button
 onClick={() => {
 setNewQuestion(emptyQuestion(questions.length));
 setShowAddQuestion(true);
 }}
 className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-ink-300 py-3 text-sm font-medium text-text-subtle hover:border-primary hover:text-primary "
 >
 <Plus className="h-4 w-4" />
 Add Question
 </button>
 )}
 </>
 )}
 </div>
 );

 function renderMetaForm() {
 return (
 <>
 <div>
 <label className="mb-1 block text-xs font-medium text-text-muted ">Title</label>
 <input
 type="text"
 value={title}
 onChange={(e) => setTitle(e.target.value)}
 className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-primary focus:outline-none "
 />
 </div>
 <div className="flex gap-3">
 <div>
 <label className="mb-1 block text-xs font-medium text-text-muted ">
 Passing Score (%)
 </label>
 <input
 type="number"
 value={passingScore}
 onChange={(e) => setPassingScore(parseInt(e.target.value) || 70)}
 className="w-24 rounded-lg border border-ink-300 px-2 py-1.5 text-sm focus:border-primary focus:outline-none "
 />
 </div>
 <div>
 <label className="mb-1 block text-xs font-medium text-text-muted ">
 Time Limit (min)
 </label>
 <input
 type="number"
 value={timeLimit}
 onChange={(e) => setTimeLimit(e.target.value)}
 placeholder="No limit"
 className="w-24 rounded-lg border border-ink-300 px-2 py-1.5 text-sm focus:border-primary focus:outline-none "
 />
 </div>
 </div>
 </>
 );
 }
}

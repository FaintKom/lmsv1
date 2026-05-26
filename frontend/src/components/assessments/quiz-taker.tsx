"use client";

import { useState, useEffect } from "react";
import apiClient from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, XCircle, Clock, Trophy } from "lucide-react";
import { toast } from "sonner";
import { MaybeMath } from "@/components/common/math-renderer";

interface QuizOption {
 id: string;
 text: string;
}

interface QuizQuestion {
 id: string;
 question_text: string;
 question_type: "multiple_choice" | "text_answer";
 options: QuizOption[] | null;
 points: number;
 sort_order: number;
}

interface QuizData {
 id: string;
 title: string;
 passing_score: number;
 time_limit_minutes: number | null;
 questions: QuizQuestion[];
}

interface SubmissionResult {
 score: number;
 passed: boolean;
}

interface QuizTakerProps {
 lessonId: string;
 onComplete?: () => void;
}

export default function QuizTaker({ lessonId, onComplete }: QuizTakerProps) {
 const [quiz, setQuiz] = useState<QuizData | null>(null);
 const [loading, setLoading] = useState(true);
 const [answers, setAnswers] = useState<Record<string, string>>({});
 const [submitting, setSubmitting] = useState(false);
 const [result, setResult] = useState<SubmissionResult | null>(null);
 const [timeLeft, setTimeLeft] = useState<number | null>(null);

 useEffect(() => {
 apiClient
 .get(`/assessments/lessons/${lessonId}/quiz`)
 .then(({ data }) => {
 setQuiz(data);
 if (data.time_limit_minutes) {
 setTimeLeft(data.time_limit_minutes * 60);
 }
 })
 .catch(() => {})
 .finally(() => setLoading(false));
 }, [lessonId]);

 // Timer
 useEffect(() => {
 if (timeLeft === null || timeLeft <= 0 || result) return;
 const timer = setInterval(() => {
 setTimeLeft((prev) => {
 if (prev === null || prev <= 1) {
 clearInterval(timer);
 handleSubmit();
 return 0;
 }
 return prev - 1;
 });
 }, 1000);
 return () => clearInterval(timer);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [timeLeft, result]);

 const handleSubmit = async () => {
 if (!quiz) return;
 setSubmitting(true);
 try {
 const answersList = Object.entries(answers).map(([questionId, value]) => {
 const question = quiz.questions.find((q) => q.id === questionId);
 if (question?.question_type === "multiple_choice") {
 return { question_id: questionId, selected_option: value };
 }
 return { question_id: questionId, text: value };
 });

 const { data } = await apiClient.post(`/assessments/quizzes/${quiz.id}/submit`, {
 answers: answersList,
 });
 setResult({ score: data.score, passed: data.passed });
 onComplete?.();
 toast.success("Quiz submitted");
 } catch {
 toast.error("Failed to submit quiz");
 } finally {
 setSubmitting(false);
 }
 };

 const formatTime = (seconds: number): string => {
 const m = Math.floor(seconds / 60);
 const s = seconds % 60;
 return `${m}:${s.toString().padStart(2, "0")}`;
 };

 if (loading) {
 return (
 <div className="flex h-32 items-center justify-center">
 <div className="h-6 w-6 animate-spin rounded-pill border-4 border-primary border-t-transparent" />
 </div>
 );
 }

 if (!quiz) {
 return (
 <div className="rounded-lg border border-border-strong bg-surface-2 p-6 text-center">
 <p className="text-sm text-text-muted">No quiz available for this lesson.</p>
 </div>
 );
 }

 if (result) {
 return (
 <Card className={result.passed ? "border-primary-soft bg-success-soft" : "border-danger bg-danger-soft"}>
 <CardContent className="p-8 text-center">
 {result.passed ? (
 <Trophy className="mx-auto mb-3 h-12 w-12 text-primary" />
 ) : (
 <XCircle className="mx-auto mb-3 h-12 w-12 text-danger-fg" />
 )}
 <h3 className="mb-2 text-xl font-bold text-text">
 {result.passed ? "Congratulations!" : "Not Passed"}
 </h3>
 <p className="mb-4 text-lg">
 Score:{" "}
 <span className={`font-bold ${result.passed ? "text-primary" : "text-danger-fg"}`}>
 {Math.round(result.score)}%
 </span>
 </p>
 <p className="text-sm text-text-muted">
 {result.passed
 ? "You have successfully passed this quiz."
 : `You need ${quiz.passing_score}% to pass. Try again!`}
 </p>
 {!result.passed && (
 <Button
 className="mt-4"
 onClick={() => {
 setResult(null);
 setAnswers({});
 if (quiz.time_limit_minutes) {
 setTimeLeft(quiz.time_limit_minutes * 60);
 }
 }}
 >
 Retry Quiz
 </Button>
 )}
 </CardContent>
 </Card>
 );
 }

 const answeredCount = Object.keys(answers).length;
 const totalQuestions = quiz.questions.length;

 return (
 <div className="space-y-4">
 {/* Quiz header */}
 <div className="flex items-center justify-between rounded-lg bg-success-soft px-4 py-3">
 <div>
 <h3 className="font-semibold text-text">{quiz.title}</h3>
 <p className="text-xs text-primary">
 {answeredCount}/{totalQuestions} answered · Pass: {quiz.passing_score}%
 </p>
 </div>
 {timeLeft !== null && (
 <div
 className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-mono font-bold ${
 timeLeft < 60 ? "bg-danger-soft text-danger-fg" : "bg-paper-2 text-ink-700"
 }`}
 >
 <Clock className="h-4 w-4" />
 {formatTime(timeLeft)}
 </div>
 )}
 </div>

 {/* Questions */}
 {quiz.questions.map((q, i) => (
 <Card key={q.id} className="border-border-strong">
 <CardContent className="p-4">
 <div className="mb-3 flex items-start gap-2">
 <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-pill bg-success-soft text-xs font-bold text-primary">
 {i + 1}
 </span>
 <div className="flex-1">
 <p className="text-sm font-medium text-ink-700"><MaybeMath text={q.question_text} /></p>
 <span className="text-[10px] text-text-subtle">{q.points} point{q.points > 1 ? "s" : ""}</span>
 </div>
 </div>

 {q.question_type === "multiple_choice" && q.options && (
 <div className="ml-8 space-y-2">
 {q.options.map((opt, optIndex) => (
 <button
 key={opt.id}
 onClick={() => setAnswers({ ...answers, [q.id]: opt.id })}
 className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
 answers[q.id] === opt.id
 ? "border-primary bg-success-soft text-success-fg"
 : "border-border-strong text-text-muted hover:border-ink-300 hover:bg-surface-2"
 }`}
 >
 <span
 className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-pill border-2 text-[10px] font-bold ${
 answers[q.id] === opt.id
 ? "border-primary bg-primary text-white"
 : "border-ink-300 text-text-subtle"
 }`}
 >
 {String.fromCharCode(65 + optIndex)}
 </span>
 <MaybeMath text={opt.text} />
 </button>
 ))}
 </div>
 )}

 {q.question_type === "text_answer" && (
 <div className="ml-8">
 <input
 type="text"
 value={answers[q.id] || ""}
 onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
 placeholder="Type your answer..."
 className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
 />
 </div>
 )}
 </CardContent>
 </Card>
 ))}

 {/* Submit */}
 <Button
 onClick={handleSubmit}
 disabled={submitting || answeredCount === 0}
 className="w-full"
 >
 <CheckCircle className="mr-2 h-4 w-4" />
 {submitting ? "Submitting..." : `Submit Quiz (${answeredCount}/${totalQuestions} answered)`}
 </Button>
 </div>
 );
}

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import apiClient from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n/context";
import { ArrowLeft, Clock, CheckCircle, Upload, FileText, AlertCircle } from "lucide-react";
import type { Assignment, AssignmentSubmission } from "@/types/api";

function useTimeLeft() {
 const { t } = useTranslation();
 return (dueDate: string) => {
 const now = Date.now();
 const due = new Date(dueDate).getTime();
 const diff = due - now;
 if (diff < 0) return t("assign.pastDue");
 const days = Math.floor(diff / (1000 * 60 * 60 * 24));
 const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
 if (days > 0) return `${days}${t("assign.daysShort")} ${hours}${t("assign.hoursShort")} ${t("assign.leftSuffix")}`;
 if (hours > 0) return `${hours}${t("assign.hoursShort")} ${t("assign.leftSuffix")}`;
 const mins = Math.floor(diff / (1000 * 60));
 return `${mins}${t("assign.minsShort")} ${t("assign.leftSuffix")}`;
 };
}

export default function AssignmentDetailPage() {
 const params = useParams();
 const { t } = useTranslation();
 const timeLeft = useTimeLeft();
 const assignmentId = params.assignmentId as string;
 const [assignment, setAssignment] = useState<Assignment | null>(null);
 const [submission, setSubmission] = useState<AssignmentSubmission | null>(null);
 const [loading, setLoading] = useState(true);
 const [content, setContent] = useState("");
 const [file, setFile] = useState<File | null>(null);
 const [submitting, setSubmitting] = useState(false);
 const [error, setError] = useState("");

 useEffect(() => {
 Promise.all([
 apiClient.get(`/assignments/${assignmentId}`).then(({ data }) => data),
 apiClient.get(`/assignments/${assignmentId}/my-submission`).then(({ data }) => data).catch(() => null),
 ])
 .then(([aData, subData]) => {
 setAssignment(aData);
 setSubmission(subData);
 if (subData?.content) setContent(subData.content);
 })
 .catch(() => {})
 .finally(() => setLoading(false));
 }, [assignmentId]);

 const handleSubmit = async () => {
 if (!content && !file) {
 setError(t("assignment.enterTextOrFile"));
 return;
 }
 setSubmitting(true);
 setError("");
 try {
 const formData = new FormData();
 if (content) formData.append("content", content);
 if (file) formData.append("file", file);
 const { data } = await apiClient.post(`/assignments/${assignmentId}/submit`, formData, {
 headers: { "Content-Type": "multipart/form-data" },
 });
 setSubmission(data);
 } catch (err: unknown) {
 const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || t("assignment.submissionFailed");
 setError(msg);
 } finally {
 setSubmitting(false);
 }
 };

 if (loading) {
 return (
 <div className="flex h-64 items-center justify-center">
 <div className="h-8 w-8 animate-spin rounded-pill border-4 border-primary border-t-transparent" />
 </div>
 );
 }

 if (!assignment) {
 return (
 <div className="mx-auto max-w-3xl text-center">
 <p className="text-text-muted ">{t("assignment.notFound")}</p>
 <Link href="/assignments" className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:text-success-fg">
 <ArrowLeft className="h-3 w-3" /> {t("assignment.backTo")}
 </Link>
 </div>
 );
 }

 const isPastDue = new Date(assignment.due_date).getTime() < Date.now();
 const canSubmit = !isPastDue || assignment.allow_late;
 const isGraded = submission?.status === "graded";

 return (
 <div className="mx-auto max-w-3xl">
 <Link
 href="/assignments"
 className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-text-muted hover:text-ink-700 "
 >
 <ArrowLeft className="h-4 w-4" /> {t("assignment.backTo")}
 </Link>

 {/* Assignment info */}
 <Card className="mb-6">
 <CardHeader>
 <div className="flex items-start justify-between">
 <div>
 <CardTitle as="h1" className="text-xl">{assignment.title}</CardTitle>
 {assignment.course_title && (
 <p className="mt-1 text-sm text-text-muted ">{assignment.course_title}</p>
 )}
 </div>
 <div className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${
 isPastDue
 ? "bg-danger-soft text-danger-fg "
 : "bg-primary-soft text-success-fg "
 }`}>
 <Clock className="h-3.5 w-3.5" />
 {timeLeft(assignment.due_date)}
 </div>
 </div>
 </CardHeader>
 <CardContent>
 {assignment.description && (
 <div className="mb-4 whitespace-pre-wrap text-sm text-ink-700 ">
 {assignment.description}
 </div>
 )}
 <div className="flex flex-wrap gap-4 text-xs text-text-muted ">
 <span>{t("assignment.due")}: {new Date(assignment.due_date).toLocaleString()}</span>
 <span>{t("assignment.maxScore")}: {assignment.max_score}</span>
 {assignment.allow_late && <span className="text-coral-700">{t("assignment.lateAllowed")}</span>}
 </div>
 </CardContent>
 </Card>

 {/* Graded result */}
 {isGraded && submission && (
 <Card className="mb-6 border-l-4 border-l-emerald-400">
 <CardContent className="flex items-center gap-4">
 <div className="rounded-lg bg-primary-soft p-3 ">
 <CheckCircle className="h-5 w-5 text-primary " />
 </div>
 <div className="flex-1">
 <p className="text-sm font-semibold text-text ">
 {t("assignment.scoreColon")}: {submission.score} / {assignment.max_score}
 </p>
 {submission.feedback && (
 <p className="mt-1 text-sm text-text-muted ">{submission.feedback}</p>
 )}
 <p className="mt-1 text-xs text-text-subtle ">
 {t("assignment.gradedAt")} {submission.graded_at ? new Date(submission.graded_at).toLocaleString() : ""}
 </p>
 </div>
 </CardContent>
 </Card>
 )}

 {/* Existing submission info */}
 {submission && !isGraded && (
 <Card className="mb-6 border-l-4 border-l-blue-400">
 <CardContent className="flex items-center gap-4">
 <div className="rounded-lg bg-info-soft p-3 ">
 <FileText className="h-5 w-5 text-info-fg " />
 </div>
 <div className="flex-1">
 <p className="text-sm font-semibold text-text ">
 {t("assignment.submitted")} {submission.status === "late" ? t("assignment.lateParen") : ""}
 </p>
 <p className="mt-0.5 text-xs text-text-muted ">
 {new Date(submission.submitted_at).toLocaleString()}
 {submission.original_filename && ` · ${t("assignment.fileLabel")}: ${submission.original_filename}`}
 </p>
 </div>
 </CardContent>
 </Card>
 )}

 {/* Submit form */}
 {canSubmit && (
 <Card>
 <CardHeader>
 <CardTitle className="text-base">
 {submission ? t("assignment.resubmit") : t("assignment.submitYourWork")}
 </CardTitle>
 </CardHeader>
 <CardContent className="space-y-4">
 <div>
 <label className="mb-1 block text-sm font-medium text-ink-700 ">
 {t("assignment.yourAnswer")}
 </label>
 <textarea
 value={content}
 onChange={(e) => setContent(e.target.value)}
 rows={6}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm text-text placeholder:text-text-subtle focus:border-primary focus:outline-none focus:ring-1 focus:ring-green-500 "
 placeholder={t("assignment.yourAnswerPlaceholder")}
 />
 </div>
 <div>
 <label className="mb-1 block text-sm font-medium text-ink-700 ">
 {t("assignment.attachFile")}
 </label>
 <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-ink-300 p-4 text-sm text-text-muted transition-colors hover:border-primary hover:text-primary ">
 <Upload className="h-4 w-4" />
 {file ? file.name : t("assignment.chooseFile")}
 <input
 type="file"
 className="hidden"
 onChange={(e) => setFile(e.target.files?.[0] || null)}
 />
 </label>
 </div>
 {error && (
 <div className="flex items-center gap-2 text-sm text-danger-fg ">
 <AlertCircle className="h-4 w-4" />
 {error}
 </div>
 )}
 <button
 onClick={handleSubmit}
 disabled={submitting}
 className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-hover disabled:opacity-50"
 >
 {submitting ? t("assignment.submitting") : submission ? t("assignment.resubmit") : t("assignment.submit")}
 </button>
 </CardContent>
 </Card>
 )}

 {!canSubmit && !submission && (
 <Card className="border-l-4 border-l-red-400">
 <CardContent className="flex items-center gap-4">
 <div className="rounded-lg bg-danger-soft p-3 ">
 <AlertCircle className="h-5 w-5 text-danger-fg " />
 </div>
 <div>
 <p className="text-sm font-semibold text-text ">{t("assignment.deadlinePassed")}</p>
 <p className="text-xs text-text-muted ">{t("assignment.lateNotAllowed")}</p>
 </div>
 </CardContent>
 </Card>
 )}
 </div>
 );
}

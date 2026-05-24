"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle, Clock, FileText, Download, ChevronDown, ChevronUp } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";
import type { Assignment, AssignmentSubmission } from "@/types/api";

export default function AssignmentReviewPage() {
 const { t } = useTranslation();
 const params = useParams();
 const assignmentId = params.id as string;
 const [assignment, setAssignment] = useState<Assignment | null>(null);
 const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
 const [loading, setLoading] = useState(true);
 const [expanded, setExpanded] = useState<string | null>(null);
 const [grading, setGrading] = useState<Record<string, { score: string; feedback: string }>>({});
 const [saving, setSaving] = useState<string | null>(null);

 useEffect(() => {
 Promise.all([
 apiClient.get(`/assignments/${assignmentId}`).then(({ data }) => data),
 apiClient.get(`/assignments/${assignmentId}/submissions`).then(({ data }) => data),
 ])
 .then(([aData, sData]) => {
 setAssignment(aData);
 setSubmissions(sData);
 })
 .catch(() => {})
 .finally(() => setLoading(false));
 }, [assignmentId]);

 const handleGrade = async (submissionId: string) => {
 const g = grading[submissionId];
 if (!g || g.score === "") {
 toast.error(t("admin.assignmentReview.enterScore"));
 return;
 }
 setSaving(submissionId);
 try {
 const { data } = await apiClient.put(`/assignments/${assignmentId}/submissions/${submissionId}/grade`, {
 score: parseFloat(g.score),
 feedback: g.feedback || "",
 });
 setSubmissions((prev) =>
 prev.map((s) => (s.id === submissionId ? { ...s, ...data } : s))
 );
 toast.success(t("admin.assignmentReview.gradedSuccess"));
 } catch {
 toast.error(t("admin.assignmentReview.failedGrade"));
 } finally {
 setSaving(null);
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
 return <p className="text-text-muted ">{t("admin.assignmentReview.notFound")}</p>;
 }

 const statusBadge = (status: string) => {
 switch (status) {
 case "graded":
 return <span className="rounded-pill bg-primary-soft px-2.5 py-0.5 text-xs font-medium text-success-fg ">{t("admin.assignmentReview.statusGraded")}</span>;
 case "submitted":
 return <span className="rounded-pill bg-info-soft px-2.5 py-0.5 text-xs font-medium text-info-fg ">{t("admin.assignmentReview.statusSubmitted")}</span>;
 case "late":
 return <span className="rounded-pill bg-coral-300 px-2.5 py-0.5 text-xs font-medium text-coral-700 ">{t("admin.assignmentReview.statusLate")}</span>;
 default:
 return <span className="rounded-pill bg-ink-100 px-2.5 py-0.5 text-xs font-medium text-text-muted ">{status}</span>;
 }
 };

 const gradedCount = submissions.filter((s) => s.status === "graded").length;

 return (
 <div>

 <Link
 href="/admin/assignments"
 className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-text-muted hover:text-ink-700 "
 >
 <ArrowLeft className="h-4 w-4" /> {t("admin.assignmentReview.backToAssignments")}
 </Link>

 {/* Assignment header */}
 <Card className="mb-6">
 <CardContent className="flex items-center gap-4">
 <div className="rounded-lg bg-primary-soft p-3 ">
 <FileText className="h-5 w-5 text-primary " />
 </div>
 <div className="flex-1">
 <h1 className="text-lg font-bold text-text ">{assignment.title}</h1>
 <div className="mt-0.5 flex flex-wrap items-center gap-x-4 text-xs text-text-muted ">
 {assignment.course_title && <span>{assignment.course_title}</span>}
 <span className="flex items-center gap-1">
 <Clock className="h-3 w-3" />
 {t("admin.assignmentReview.dueLabel")} {new Date(assignment.due_date).toLocaleString()}
 </span>
 <span>{t("admin.assignmentReview.maxLabel")} {assignment.max_score} {t("admin.assignmentReview.ptsSuffix")}</span>
 </div>
 </div>
 <div className="text-right">
 <p className="text-2xl font-bold text-text ">{submissions.length}</p>
 <p className="text-xs text-text-muted ">{t("admin.assignmentReview.submissionsCount")}</p>
 </div>
 <div className="text-right">
 <p className="text-2xl font-bold text-primary ">{gradedCount}</p>
 <p className="text-xs text-text-muted ">{t("admin.assignmentReview.gradedCount")}</p>
 </div>
 </CardContent>
 </Card>

 {/* Submissions */}
 {submissions.length === 0 ? (
 <Card>
 <CardContent className="py-12 text-center">
 <p className="text-sm text-text-muted ">{t("admin.assignmentReview.noSubmissions")}</p>
 </CardContent>
 </Card>
 ) : (
 <div className="space-y-3">
 {submissions.map((sub) => {
 const isExpanded = expanded === sub.id;
 const g = grading[sub.id] || { score: sub.score?.toString() || "", feedback: sub.feedback || "" };
 return (
 <Card key={sub.id} className={`border-l-4 ${sub.status === "graded" ? "border-l-emerald-400" : "border-l-blue-400"}`}>
 <CardContent className="p-0">
 {/* Header row */}
 <button
 onClick={() => setExpanded(isExpanded ? null : sub.id)}
 className="flex w-full items-center gap-4 px-6 py-4 text-left transition-colors hover:bg-surface-2 "
 >
 <div className="min-w-0 flex-1">
 <div className="flex items-center gap-2">
 <span className="text-sm font-medium text-text ">
 {sub.student_name || t("admin.assignmentReview.studentFallback")}
 </span>
 {statusBadge(sub.status)}
 </div>
 <p className="mt-0.5 text-xs text-text-muted ">
 {t("admin.assignmentReview.submittedAt")} {new Date(sub.submitted_at).toLocaleString()}
 {sub.original_filename && ` · ${sub.original_filename}`}
 </p>
 </div>
 {sub.score !== null && sub.score !== undefined && (
 <span className="text-sm font-bold text-primary ">
 {sub.score}/{assignment.max_score}
 </span>
 )}
 {isExpanded ? (
 <ChevronUp className="h-4 w-4 text-text-subtle" />
 ) : (
 <ChevronDown className="h-4 w-4 text-text-subtle" />
 )}
 </button>

 {/* Expanded content */}
 {isExpanded && (
 <div className="border-t border-border px-6 py-4 ">
 {/* Student's answer */}
 {sub.content && (
 <div className="mb-4">
 <p className="mb-1 text-xs font-medium text-text-muted ">{t("admin.assignmentReview.answerLabel")}</p>
 <div className="whitespace-pre-wrap rounded-lg bg-surface-2 p-3 text-sm text-ink-700 ">
 {sub.content}
 </div>
 </div>
 )}
 {sub.original_filename && (
 <div className="mb-4">
 <p className="mb-1 text-xs font-medium text-text-muted ">{t("admin.assignmentReview.attachedFile")}</p>
 <a
 href={`${process.env.NEXT_PUBLIC_API_URL || ""}/api/v1/assignments/${assignmentId}/submissions/${sub.id}/file`}
 className="inline-flex items-center gap-1.5 rounded-lg bg-surface-2 px-3 py-2 text-sm text-primary hover:bg-ink-100 "
 target="_blank"
 rel="noopener noreferrer"
 >
 <Download className="h-3.5 w-3.5" />
 {sub.original_filename}
 </a>
 </div>
 )}

 {/* Grade form */}
 <div className="rounded-lg border border-border-strong p-4 ">
 <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted ">
 {sub.status === "graded" ? t("admin.assignmentReview.updateGrade") : t("admin.assignmentReview.gradeSubmission")}
 </p>
 <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
 <div className="flex-shrink-0">
 <label className="mb-1 block text-xs text-text-muted ">
 {t("admin.assignmentReview.scoreLabel").replace("{max}", String(assignment.max_score))}
 </label>
 <input
 type="number"
 min={0}
 max={assignment.max_score}
 value={g.score}
 onChange={(e) =>
 setGrading({ ...grading, [sub.id]: { ...g, score: e.target.value } })
 }
 className="w-24 rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm text-text focus:border-primary focus:outline-none "
 />
 </div>
 <div className="flex-1">
 <label className="mb-1 block text-xs text-text-muted ">{t("admin.assignmentReview.feedbackLabel")}</label>
 <input
 type="text"
 value={g.feedback}
 onChange={(e) =>
 setGrading({ ...grading, [sub.id]: { ...g, feedback: e.target.value } })
 }
 placeholder={t("admin.assignmentReview.feedbackPlaceholder")}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm text-text focus:border-primary focus:outline-none "
 />
 </div>
 <Button
 onClick={() => handleGrade(sub.id)}
 disabled={saving === sub.id}
 className="shrink-0"
 >
 {saving === sub.id ? t("common.saving") : (
 <>
 <CheckCircle className="mr-1 h-4 w-4" />
 {sub.status === "graded" ? t("admin.assignmentReview.update") : t("admin.assignmentReview.gradeBtn")}
 </>
 )}
 </Button>
 </div>
 </div>
 </div>
 )}
 </CardContent>
 </Card>
 );
 })}
 </div>
 )}
 </div>
 );
}

"use client";

import { useEffect, useState } from "react";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { InboxIcon, FileText, Clock, User, ChevronRight, Download } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";

interface QueueItem {
 id: string;
 assignment_id: string;
 assignment_title: string;
 max_score: number;
 student_id: string;
 student_name: string;
 student_email: string;
 content: string | null;
 file_path: string | null;
 original_filename: string | null;
 submitted_at: string;
 status: string;
}

export default function ReviewQueuePage() {
 const { t } = useTranslation();
 const [items, setItems] = useState<QueueItem[]>([]);
 const [loading, setLoading] = useState(true);
 const [selected, setSelected] = useState<QueueItem | null>(null);
 const [score, setScore] = useState("");
 const [feedback, setFeedback] = useState("");
 const [grading, setGrading] = useState(false);

 const fetchQueue = () => {
 apiClient
 .get("/admin/review-queue")
 .then(({ data }) => setItems(data))
 .catch(() => {})
 .finally(() => setLoading(false));
 };

 useEffect(() => {
 fetchQueue();
 }, []);

 const handleSelect = (item: QueueItem) => {
 setSelected(item);
 setScore("");
 setFeedback("");
 };

 const handleGrade = async () => {
 if (!selected || !score) return;
 setGrading(true);
 try {
 await apiClient.put(
 `/assignments/${selected.assignment_id}/submissions/${selected.id}/grade`,
 { score: parseFloat(score), feedback }
 );
 toast.success(t("admin.review.gradedSuccess"));
 setItems((prev) => prev.filter((i) => i.id !== selected.id));
 setSelected(null);
 } catch {
 toast.error(t("admin.review.failedGrade"));
 } finally {
 setGrading(false);
 }
 };

 if (loading) {
 return (
 <div className="mx-auto max-w-7xl">
 <Skeleton className="mb-2 h-4 w-48" />
 <Skeleton className="mb-6 h-8 w-56" />
 <div className="space-y-3">
 {Array.from({ length: 4 }).map((_, i) => (
 <Skeleton key={i} className="h-20 w-full" />
 ))}
 </div>
 </div>
 );
 }

 return (
 <div>
 <div className="mb-6">
 <h1 className="text-2xl font-bold text-text ">{t("admin.review.title")}</h1>
 <p className="mt-1 text-sm text-text-muted ">
 {items.length} {items.length !== 1 ? t("admin.review.subtitleMany") : t("admin.review.subtitleOne")}
 </p>
 </div>

 {items.length === 0 && !selected ? (
 <Card>
 <CardContent className="flex flex-col items-center justify-center p-12 text-center">
 <div className="mb-4 rounded-pill bg-ink-100 p-4 ">
 <InboxIcon className="h-8 w-8 text-text-subtle " />
 </div>
 <h3 className="mb-1 text-lg font-semibold text-text-muted ">
 {t("admin.review.allCaughtUp")}
 </h3>
 <p className="text-base text-text-muted ">
 {t("admin.review.noSubmissions")}
 </p>
 </CardContent>
 </Card>
 ) : (
 <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
 {/* Left: submission list */}
 <div className="space-y-2">
 {items.map((item) => (
 <button
 key={item.id}
 onClick={() => handleSelect(item)}
 className={`w-full text-left rounded-lg border p-4 transition-all ${
 selected?.id === item.id
 ? "border-primary bg-success-soft shadow-sm "
 : "border-border-strong bg-paper-2 hover:border-ink-300 hover:shadow-sm "
 }`}
 >
 <div className="flex items-center gap-3">
 <div className={`rounded-lg p-2 ${
 item.status === "late"
 ? "bg-coral-300 "
 : "bg-info-soft "
 }`}>
 <FileText className={`h-4 w-4 ${
 item.status === "late"
 ? "text-coral-700 "
 : "text-info-fg "
 }`} />
 </div>
 <div className="min-w-0 flex-1">
 <h4 className="truncate text-sm font-semibold text-text ">
 {item.assignment_title}
 </h4>
 <div className="flex items-center gap-3 text-xs text-text-muted ">
 <span className="flex items-center gap-1">
 <User className="h-3 w-3" />
 {item.student_name}
 </span>
 <span className="flex items-center gap-1">
 <Clock className="h-3 w-3" />
 {new Date(item.submitted_at).toLocaleDateString()}
 </span>
 {item.status === "late" && (
 <span className="rounded-pill bg-coral-300 px-1.5 py-0.5 text-[10px] font-medium text-coral-700 ">
 {t("admin.review.late")}
 </span>
 )}
 </div>
 </div>
 <ChevronRight className="h-4 w-4 text-ink-300 " />
 </div>
 </button>
 ))}
 </div>

 {/* Right: detail + grade form */}
 <div>
 {selected ? (
 <Card className="border-l-4 border-l-primary">
 <CardHeader>
 <CardTitle className="text-base">{selected.assignment_title}</CardTitle>
 <p className="text-sm text-text-muted ">
 {selected.student_name} &middot; {selected.student_email}
 </p>
 </CardHeader>
 <CardContent className="space-y-4">
 {/* Student answer */}
 {selected.content && (
 <div>
 <label className="mb-1 block text-xs font-medium text-text-muted ">
 {t("admin.review.studentAnswer")}
 </label>
 <div className="max-h-64 overflow-y-auto rounded-lg border border-border-strong bg-surface-2 p-3 text-sm whitespace-pre-wrap text-ink-700 ">
 {selected.content}
 </div>
 </div>
 )}

 {/* File attachment */}
 {selected.original_filename && (
 <div>
 <label className="mb-1 block text-xs font-medium text-text-muted ">
 {t("admin.review.attachedFile")}
 </label>
 <a
 href={`${apiClient.defaults.baseURL?.replace("/api/v1", "")}/uploads/${selected.file_path}`}
 target="_blank"
 rel="noopener noreferrer"
 className="inline-flex items-center gap-2 rounded-lg border border-border-strong px-3 py-2 text-sm text-primary transition-colors hover:bg-success-soft "
 >
 <Download className="h-4 w-4" />
 {selected.original_filename}
 </a>
 </div>
 )}

 {!selected.content && !selected.original_filename && (
 <p className="text-sm text-text-subtle italic">{t("admin.review.noContent")}</p>
 )}

 {/* Grade form */}
 <div className="border-t border-border-strong pt-4 ">
 <h4 className="mb-3 text-sm font-semibold text-ink-700 ">
 {t("admin.review.gradeSubmission")}
 </h4>
 <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
 <div>
 <label className="mb-1 block text-xs font-medium text-text-muted ">
 {t("admin.review.scoreLabel").replace("{max}", String(selected.max_score))}
 </label>
 <input
 type="number"
 min={0}
 max={selected.max_score}
 value={score}
 onChange={(e) => setScore(e.target.value)}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm text-text focus:border-primary focus:outline-none "
 placeholder={t("admin.review.scorePlaceholder")}
 />
 </div>
 </div>
 <div className="mt-3">
 <label className="mb-1 block text-xs font-medium text-text-muted ">
 {t("admin.review.feedbackOptional")}
 </label>
 <textarea
 value={feedback}
 onChange={(e) => setFeedback(e.target.value)}
 rows={3}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm text-text focus:border-primary focus:outline-none "
 placeholder={t("admin.review.feedbackPlaceholder")}
 />
 </div>
 <Button
 className="mt-3"
 onClick={handleGrade}
 disabled={grading || !score}
 >
 {grading ? t("admin.review.grading") : t("admin.review.grade")}
 </Button>
 </div>
 </CardContent>
 </Card>
 ) : (
 <Card>
 <CardContent className="flex flex-col items-center justify-center p-12 text-center">
 <p className="text-sm text-text-subtle ">
 {t("admin.review.selectSubmission")}
 </p>
 </CardContent>
 </Card>
 )}
 </div>
 </div>
 )}
 </div>
 );
}

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";

interface AssignmentData {
 id: string;
 title: string;
 description: string;
 course_id: string;
 course_title: string | null;
 due_date: string;
 max_score: number;
 allow_late: boolean;
}

export default function EditAssignmentPage() {
 const { t } = useTranslation();
 const params = useParams();
 const router = useRouter();
 const id = params.id as string;

 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 const [form, setForm] = useState({
 title: "",
 description: "",
 course_title: "",
 due_date: "",
 max_score: 100,
 allow_late: false,
 });

 useEffect(() => {
 apiClient
 .get(`/assignments/${id}`)
 .then(({ data }: { data: AssignmentData }) => {
 const dueLocal = data.due_date
 ? new Date(data.due_date).toISOString().slice(0, 16)
 : "";
 setForm({
 title: data.title || "",
 description: data.description || "",
 course_title: data.course_title || "",
 due_date: dueLocal,
 max_score: data.max_score ?? 100,
 allow_late: data.allow_late ?? false,
 });
 })
 .catch(() => {
 toast.error(t("admin.assignmentEdit.failedLoad"));
 })
 .finally(() => setLoading(false));
 }, [id]);

 const handleSave = async (e: React.FormEvent) => {
 e.preventDefault();
 setSaving(true);
 try {
 await apiClient.put(`/assignments/${id}`, {
 title: form.title,
 description: form.description,
 due_date: new Date(form.due_date).toISOString(),
 max_score: form.max_score,
 allow_late: form.allow_late,
 });
 toast.success(t("admin.assignmentEdit.updated"));
 } catch {
 toast.error(t("admin.assignmentEdit.failedSave"));
 } finally {
 setSaving(false);
 }
 };

 if (loading) {
 return (
 <div className="mx-auto max-w-2xl space-y-6">
 <div className="h-6 w-40 animate-pulse rounded bg-ink-200 " />
 <div className="h-8 w-64 animate-pulse rounded bg-ink-200 " />
 <div className="space-y-4 rounded-lg border border-border-strong p-6 ">
 <div className="h-10 w-full animate-pulse rounded-lg bg-ink-200 " />
 <div className="h-24 w-full animate-pulse rounded-lg bg-ink-200 " />
 <div className="grid grid-cols-2 gap-4">
 <div className="h-10 animate-pulse rounded-lg bg-ink-200 " />
 <div className="h-10 animate-pulse rounded-lg bg-ink-200 " />
 </div>
 <div className="h-10 w-32 animate-pulse rounded-lg bg-ink-200 " />
 </div>
 </div>
 );
 }

 return (
 <div className="mx-auto max-w-2xl">
 <button
 onClick={() => router.back()}
 className="mb-4 flex items-center gap-1 text-sm text-text-muted transition-colors hover:text-text "
 >
 <ArrowLeft className="h-4 w-4" />
 {t("admin.assignmentEdit.backToAssignments")}
 </button>

 <h1 className="mb-6 text-2xl font-bold text-text ">
 {t("admin.assignmentEdit.title")}
 </h1>

 <form onSubmit={handleSave} className="space-y-5 rounded-lg border border-border-strong bg-paper-2 p-6 ">
 {/* Course badge (read-only) */}
 {form.course_title && (
 <div>
 <label className="mb-1 block text-xs font-medium text-text-muted ">
 {t("admin.contentLibrary.courseCol")}
 </label>
 <span className="inline-block rounded-lg bg-success-soft px-3 py-1.5 text-sm font-medium text-primary ">
 {form.course_title}
 </span>
 </div>
 )}

 {/* Title */}
 <div>
 <label className="mb-1 block text-xs font-medium text-text-muted ">
 {t("admin.courseEdit.titleLabel")}
 </label>
 <input
 type="text"
 value={form.title}
 onChange={(e) => setForm({ ...form, title: e.target.value })}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm text-text focus:border-primary focus:outline-none "
 required
 />
 </div>

 {/* Description */}
 <div>
 <label className="mb-1 block text-xs font-medium text-text-muted ">
 {t("common.description")}
 </label>
 <textarea
 value={form.description}
 onChange={(e) => setForm({ ...form, description: e.target.value })}
 rows={4}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm text-text focus:border-primary focus:outline-none "
 />
 </div>

 {/* Due Date + Max Score */}
 <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
 <div>
 <label className="mb-1 block text-xs font-medium text-text-muted ">
 {t("admin.assignments.dueDate")}
 </label>
 <input
 type="datetime-local"
 value={form.due_date}
 onChange={(e) => setForm({ ...form, due_date: e.target.value })}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm text-text focus:border-primary focus:outline-none "
 required
 />
 </div>
 <div>
 <label className="mb-1 block text-xs font-medium text-text-muted ">
 {t("admin.assignments.maxScore")}
 </label>
 <input
 type="number"
 min={1}
 value={form.max_score}
 onChange={(e) =>
 setForm({ ...form, max_score: parseInt(e.target.value) || 100 })
 }
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm text-text focus:border-primary focus:outline-none "
 />
 </div>
 </div>

 {/* Allow Late */}
 <label className="flex items-center gap-2 text-sm text-text-muted ">
 <input
 type="checkbox"
 checked={form.allow_late}
 onChange={(e) => setForm({ ...form, allow_late: e.target.checked })}
 className="rounded border-ink-300 text-primary focus:ring-green-500"
 />
 {t("admin.assignments.allowLate")}
 </label>

 {/* Actions */}
 <div className="flex items-center gap-3 pt-2">
 <Button type="submit" disabled={saving}>
 {saving ? t("common.saving") : t("common.save")}
 </Button>
 <Link
 href={`/admin/assignments/${id}/review`}
 className="flex items-center gap-1 rounded-lg bg-ink-100 px-4 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-200 "
 >
 {t("admin.assignmentEdit.viewSubmissions")} &rarr;
 </Link>
 </div>
 </form>
 </div>
 );
}

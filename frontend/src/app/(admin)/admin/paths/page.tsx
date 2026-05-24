"use client";

import { useEffect, useState } from "react";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Route, Plus, Trash2, Eye, EyeOff, GripVertical } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";

interface PathItem {
 id: string;
 title: string;
 description: string;
 is_published: boolean;
 step_count: number;
 created_at: string;
}

interface CourseOption {
 id: string;
 title: string;
}

export default function AdminPathsPage() {
 const { t } = useTranslation();
 const confirm = useConfirm();
 const [paths, setPaths] = useState<PathItem[]>([]);
 const [courses, setCourses] = useState<CourseOption[]>([]);
 const [loading, setLoading] = useState(true);
 const [showForm, setShowForm] = useState(false);
 const [submitting, setSubmitting] = useState(false);
 const [form, setForm] = useState({ title: "", description: "" });
 const [selectedCourses, setSelectedCourses] = useState<{ course_id: string; is_required: boolean }[]>([]);

 const fetchPaths = () => {
 apiClient
 .get("/learning-paths/")
 .then(({ data }) => setPaths(data))
 .catch(() => {})
 .finally(() => setLoading(false));
 };

 useEffect(() => {
 fetchPaths();
 apiClient.get("/admin/courses").then(({ data }) => setCourses(data)).catch(() => {});
 }, []);

 const handleCreate = async (e: React.FormEvent) => {
 e.preventDefault();
 if (selectedCourses.length === 0) {
 toast.error(t("admin.paths.addOneCourse"));
 return;
 }
 setSubmitting(true);
 try {
 await apiClient.post("/learning-paths/", {
 title: form.title,
 description: form.description,
 steps: selectedCourses,
 });
 setForm({ title: "", description: "" });
 setSelectedCourses([]);
 setShowForm(false);
 toast.success(t("admin.paths.pathCreated"));
 fetchPaths();
 } catch {
 toast.error(t("admin.paths.failedCreate"));
 } finally {
 setSubmitting(false);
 }
 };

 const handleTogglePublish = async (path: PathItem) => {
 try {
 await apiClient.put(`/learning-paths/${path.id}`, {
 is_published: !path.is_published,
 });
 toast.success(path.is_published ? t("admin.paths.unpublished") : t("admin.paths.published"));
 fetchPaths();
 } catch {
 toast.error(t("admin.paths.failedUpdate"));
 }
 };

 const handleDelete = async (id: string) => {
 if (!(await confirm({ message: t("admin.paths.confirmDelete"), variant: "danger", confirmLabel: t("common.delete") }))) return;
 try {
 await apiClient.delete(`/learning-paths/${id}`);
 toast.success(t("admin.paths.pathDeleted"));
 fetchPaths();
 } catch {
 toast.error(t("admin.paths.failedDelete"));
 }
 };

 const addCourse = (courseId: string) => {
 if (selectedCourses.find((s) => s.course_id === courseId)) return;
 setSelectedCourses([...selectedCourses, { course_id: courseId, is_required: true }]);
 };

 const removeCourse = (courseId: string) => {
 setSelectedCourses(selectedCourses.filter((s) => s.course_id !== courseId));
 };

 const toggleRequired = (courseId: string) => {
 setSelectedCourses(
 selectedCourses.map((s) =>
 s.course_id === courseId ? { ...s, is_required: !s.is_required } : s
 )
 );
 };

 if (loading) {
 return (
 <div className="flex h-64 items-center justify-center">
 <div className="h-8 w-8 animate-spin rounded-pill border-4 border-primary border-t-transparent" />
 </div>
 );
 }

 return (
 <div>
 <div className="mb-6 flex items-center justify-between">
 <div>
 <h1 className="text-2xl font-bold text-text ">{t("admin.paths.title")}</h1>
 <p className="mt-1 text-sm text-text-muted ">
 {t("admin.paths.subtitle")}
 </p>
 </div>
 <Button onClick={() => setShowForm(!showForm)}>
 <Plus className="mr-2 h-4 w-4" />
 {t("admin.paths.newPath")}
 </Button>
 </div>

 {showForm && (
 <Card className="mb-6">
 <CardHeader>
 <CardTitle>{t("admin.paths.createPath")}</CardTitle>
 </CardHeader>
 <CardContent>
 <form onSubmit={handleCreate} className="space-y-4">
 <input
 type="text"
 placeholder={t("admin.paths.pathTitlePlaceholder")}
 value={form.title}
 onChange={(e) => setForm({ ...form, title: e.target.value })}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm text-text focus:border-primary focus:outline-none "
 required
 autoFocus
 />
 <textarea
 placeholder={t("common.description")}
 value={form.description}
 onChange={(e) => setForm({ ...form, description: e.target.value })}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm text-text focus:border-primary focus:outline-none "
 rows={2}
 />
 {/* Course selector */}
 <div>
 <label className="mb-1 block text-xs font-medium text-text-muted ">
 {t("admin.paths.addCoursesInOrder")}
 </label>
 <select
 onChange={(e) => {
 if (e.target.value) addCourse(e.target.value);
 e.target.value = "";
 }}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm text-text focus:border-primary focus:outline-none "
 >
 <option value="">{t("admin.paths.selectCourseToAdd")}</option>
 {courses
 .filter((c) => !selectedCourses.find((s) => s.course_id === c.id))
 .map((c) => (
 <option key={c.id} value={c.id}>{c.title}</option>
 ))}
 </select>
 </div>
 {/* Selected courses list */}
 {selectedCourses.length > 0 && (
 <div className="space-y-2">
 {selectedCourses.map((s, idx) => {
 const course = courses.find((c) => c.id === s.course_id);
 return (
 <div
 key={s.course_id}
 className="flex items-center gap-3 rounded-lg border border-border-strong p-3 "
 >
 <GripVertical className="h-4 w-4 text-ink-300 " />
 <span className="text-xs font-bold text-text-subtle">{idx + 1}</span>
 <span className="flex-1 text-sm text-text ">
 {course?.title || t("admin.paths.unknownCourse")}
 </span>
 <label className="flex items-center gap-1 text-xs text-text-muted ">
 <input
 type="checkbox"
 checked={s.is_required}
 onChange={() => toggleRequired(s.course_id)}
 className="rounded border-ink-300 text-primary focus:ring-green-500"
 />
 {t("admin.paths.required")}
 </label>
 <button
 type="button"
 onClick={() => removeCourse(s.course_id)}
 className="rounded p-1 text-text-subtle hover:bg-danger-soft hover:text-danger-fg "
 >
 <Trash2 className="h-3 w-3" />
 </button>
 </div>
 );
 })}
 </div>
 )}
 <Button type="submit" disabled={submitting}>
 {submitting ? t("common.creating") : t("admin.paths.createPath")}
 </Button>
 </form>
 </CardContent>
 </Card>
 )}

 {paths.length === 0 ? (
 <Card>
 <CardContent className="flex flex-col items-center justify-center p-12 text-center">
 <div className="mb-4 rounded-pill bg-ink-100 p-4 ">
 <Route className="h-8 w-8 text-text-subtle " />
 </div>
 <h3 className="mb-1 text-lg font-semibold text-text-muted ">
 {t("admin.paths.noPaths")}
 </h3>
 <p className="text-base text-text-muted ">
 {t("admin.paths.noPathsHint")}
 </p>
 </CardContent>
 </Card>
 ) : (
 <div className="space-y-3">
 {paths.map((p) => (
 <Card key={p.id} className="border-l-4 border-l-green-400 transition-shadow hover:shadow-md">
 <CardContent className="flex items-center gap-4">
 <div className="hidden shrink-0 sm:block">
 <div className="rounded-lg bg-primary-soft p-3 ">
 <Route className="h-5 w-5 text-primary " />
 </div>
 </div>
 <div className="min-w-0 flex-1">
 <h3 className="truncate text-sm font-semibold text-text ">
 {p.title}
 </h3>
 <div className="mt-1 flex items-center gap-3 text-xs text-text-muted ">
 <span>{p.step_count} {t("admin.paths.coursesCount")}</span>
 <span className={`rounded-pill px-2 py-0.5 text-[10px] font-medium ${
 p.is_published
 ? "bg-primary-soft text-success-fg "
 : "bg-ink-100 text-text-muted "
 }`}>
 {p.is_published ? t("common.published") : t("common.draft")}
 </span>
 </div>
 </div>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => handleTogglePublish(p)}
 title={p.is_published ? t("common.unpublish") : t("common.publish")}
 >
 {p.is_published ? (
 <EyeOff className="h-4 w-4 text-text-subtle" />
 ) : (
 <Eye className="h-4 w-4 text-primary" />
 )}
 </Button>
 <button
 onClick={() => handleDelete(p.id)}
 className="rounded-lg p-2 text-text-subtle transition-colors hover:bg-danger-soft hover:text-danger-fg "
 >
 <Trash2 className="h-4 w-4" />
 </button>
 </CardContent>
 </Card>
 ))}
 </div>
 )}
 </div>
 );
}

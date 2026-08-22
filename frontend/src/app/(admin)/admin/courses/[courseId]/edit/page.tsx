"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { ContentRenderer } from "@/components/common/content-renderer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
 DndContext,
 closestCenter,
 KeyboardSensor,
 PointerSensor,
 useSensor,
 useSensors,
 type DragEndEvent,
} from "@dnd-kit/core";
import {
 arrayMove,
 SortableContext,
 sortableKeyboardCoordinates,
 useSortable,
 verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTranslation } from "@/lib/i18n/context";
import {
 ArrowLeft,
 Plus,
 Save,
 Trash2,
 GripVertical,
 ChevronDown,
 ChevronRight,
 FileText,
 PlayCircle,
 Code,
 CheckCircle,
 Pencil,
 X,
 Upload,
 Puzzle,
 Users,
 UserPlus,
 Eye,
 Download,
 Settings2,
 ClipboardList,
 ExternalLink,
 Clock,
 Video,
 Presentation,
} from "lucide-react";
import type { Course, Module, Lesson } from "@/types/api";
import { lessonSummary, type BlockKind } from "./lesson-summary";
import { LessonElementsPanel } from "./lesson-elements-panel";

/** One translation key per kind of thing a page can hold. */
const KIND_KEYS: Record<BlockKind, string> = {
  text: "admin.courseEdit.kindText",
  html: "admin.courseEdit.kindHtml",
  video: "admin.courseEdit.kindVideo",
  presentation: "admin.courseEdit.kindPresentation",
  exercise: "admin.courseEdit.kindExercise",
  assignment: "admin.courseEdit.kindAssignment",
};
import dynamic from "next/dynamic";
import { markdownToTiptap } from "@/components/editor/utils/markdown-to-tiptap";
import {
 EXERCISE_TYPE_LABELS as EXERCISE_TYPE_LABELS_FULL,
 EXERCISE_TYPES_META,
} from "@/lib/api/exercises";

const BlockEditor = dynamic(
 () => import("@/components/editor/block-editor").then((m) => ({ default: m.BlockEditor })),
 { ssr: false, loading: () => <div className="flex h-[300px] items-center justify-center rounded-lg border border-border-strong "><p className="text-sm text-text-subtle">Loading editor...</p></div> }
);

function SortableLessonItem({
 id,
 children,
}: {
 id: string;
 children: React.ReactNode;
}) {
 const {
 attributes,
 listeners,
 setNodeRef,
 transform,
 transition,
 isDragging,
 } = useSortable({ id });

 const style = {
 transform: CSS.Transform.toString(transform),
 transition,
 opacity: isDragging ? 0.5 : 1,
 };

 return (
 <li ref={setNodeRef} style={style} {...attributes}>
 <div className="flex items-start">
 <button
 type="button"
 className="mt-2.5 cursor-grab touch-none p-1 text-text-subtle hover:text-text-muted active:cursor-grabbing"
 {...listeners}
 >
 <GripVertical className="h-4 w-4" />
 </button>
 <div className="flex-1">{children}</div>
 </div>
 </li>
 );
}

export default function CourseEditorPage() {
 // eslint-disable-next-line @typescript-eslint/no-unused-vars
 const { t } = useTranslation();
 const params = useParams();
 const router = useRouter();
 const confirm = useConfirm();
 const courseId = params.courseId as string;

 const [course, setCourse] = useState<Course | null>(null);
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 const [deleting, setDeleting] = useState(false);

 // Course metadata form
 const [title, setTitle] = useState("");
 const [description, setDescription] = useState("");
 const [category, setCategory] = useState("");

 // Module management
 const [newModuleTitle, setNewModuleTitle] = useState("");
 const [addingModule, setAddingModule] = useState(false);
 const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
 // Раскрытые уроки хранятся множеством, а не одним значением: раскрыть
 // соседний урок, не свернув этот, — обычное дело при сборке курса.
 const [openLessons, setOpenLessons] = useState<Set<string>>(new Set());
 const toggleLesson = useCallback((lessonId: string) => {
 setOpenLessons((current) => {
 const next = new Set(current);
 if (next.has(lessonId)) next.delete(lessonId);
 else next.add(lessonId);
 return next;
 });
 }, []);

 // Inline editing
 const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
 const [editingModuleTitle, setEditingModuleTitle] = useState("");

 // Lesson form
 const [addingLessonToModule, setAddingLessonToModule] = useState<string | null>(null);
 const [lessonForm, setLessonForm] = useState({
 title: "",
 content_type: "text",
 content: {} as Record<string, unknown>,
 duration_minutes: "",
 });


 // Students management
 const [students, setStudents] = useState<{ id: string; full_name: string; email: string; enrollment_id: string; progress_percent: number; enrolled_at: string }[]>([]);
 const [allUsers, setAllUsers] = useState<{ id: string; full_name: string; email: string; role: string }[]>([]);
 const [showStudents, setShowStudents] = useState(false);
 const [enrollingUser, setEnrollingUser] = useState("");

 // Assignments management
 interface Assignment {
 id: string;
 course_id: string;
 title: string;
 description?: string;
 due_date: string;
 max_score: number;
 allow_late: boolean;
 submission_count?: number;
 created_at?: string;
 }
 const [assignments, setAssignments] = useState<Assignment[]>([]);
 const [showAssignments, setShowAssignments] = useState(false);
 const [showAddAssignment, setShowAddAssignment] = useState(false);
 const [assignmentForm, setAssignmentForm] = useState({
 title: "",
 description: "",
 due_date: "",
 max_score: "100",
 allow_late: false,
 });
 const [addingAssignment, setAddingAssignment] = useState(false);

 // Course picture (specs/016 US1)
 const [savingThumbnail, setSavingThumbnail] = useState(false);
 const thumbnailInputRef = useRef<HTMLInputElement>(null);

 const fetchCourse = useCallback(() => {
 apiClient
 .get(`/courses/${courseId}`)
 .then(({ data }) => {
 setCourse(data);
 setTitle(data.title);
 setDescription(data.description || "");
 setCategory(data.category || "");
 const ids = new Set<string>((data.modules || []).map((m: Module) => m.id));
 setExpandedModules(ids);
 })
 .catch(() => toast.error(t("common.failedToLoad")))
 .finally(() => setLoading(false));
 }, [courseId]);

 const fetchStudents = useCallback(() => {
 apiClient.get(`/admin/courses/${courseId}/students/`).then(({ data }) => setStudents(data)).catch(() => {});
 }, [courseId]);

 const fetchAllUsers = useCallback(() => {
 apiClient.get("/admin/users/").then(({ data }) => setAllUsers(data)).catch(() => {});
 }, []);

 const fetchAssignments = useCallback(() => {
 apiClient
 .get("/assignments", { params: { course_id: courseId } })
 .then(({ data }) => {
 const list = Array.isArray(data) ? data : data.results || [];
 setAssignments(list.filter((a: Assignment) => a.course_id === courseId));
 })
 .catch(() => setAssignments([]));
 }, [courseId]);

 useEffect(() => {
 fetchCourse();
 // Eager fetch so the collapsed-section counters show the real count
 // without forcing the user to expand each panel first.
 fetchStudents();
 fetchAssignments();
 }, [fetchCourse, fetchStudents, fetchAssignments]);

 useEffect(() => {
 if (showStudents) {
 fetchAllUsers();
 }
 }, [showStudents, fetchAllUsers]);

 // When expanding a quiz lesson, load quiz data
 const handleSaveMeta = async () => {
 setSaving(true);
 try {
 await apiClient.put(`/courses/${courseId}/`, { title, description, category: category || null });
 toast.success("Course details saved");
 fetchCourse();
 } catch {
 toast.error("Failed to save");
 } finally {
 setSaving(false);
 }
 };

 const handleThumbnailUpload = async (file: File) => {
 const formData = new FormData();
 formData.append("file", file);
 setSavingThumbnail(true);
 try {
 const { data } = await apiClient.post<{ url: string }>(
 "/courses/upload-image",
 formData,
 { headers: { "Content-Type": "multipart/form-data" } },
 );
 await apiClient.put(`/courses/${courseId}/`, { thumbnail_url: data.url });
 toast.success(t("admin.courseEdit.thumbnailSaved"));
 fetchCourse();
 } catch {
 toast.error(t("admin.courseEdit.thumbnailUploadFailed"));
 } finally {
 setSavingThumbnail(false);
 }
 };

 const handleThumbnailRemove = async () => {
 setSavingThumbnail(true);
 try {
 await apiClient.put(`/courses/${courseId}/`, { thumbnail_url: null });
 toast.success(t("admin.courseEdit.thumbnailSaved"));
 fetchCourse();
 } catch {
 toast.error("Failed to save");
 } finally {
 setSavingThumbnail(false);
 }
 };

 const handleDeleteCourse = async () => {
 if (!(await confirm({ message: "Are you sure you want to delete this course? This cannot be undone.", variant: "danger", confirmLabel: "Delete" }))) return;
 setDeleting(true);
 try {
 await apiClient.delete(`/courses/${courseId}/`);
 toast.success("Course deleted");
 router.push("/admin/courses");
 } catch {
 toast.error("Failed to delete course");
 setDeleting(false);
 }
 };

 const handlePublish = async () => {
 try {
 await apiClient.post(`/courses/${courseId}/publish/`);
 toast.success("Course published");
 fetchCourse();
 } catch {
 toast.error("Failed to publish");
 }
 };

 // ─── Export / Import ─────────────────────────────────────────────────

 const importFileRef = useRef<HTMLInputElement | null>(null);

 const downloadBlob = (data: Blob, filename: string) => {
 const url = URL.createObjectURL(data);
 const a = document.createElement("a");
 a.href = url;
 a.download = filename;
 a.click();
 URL.revokeObjectURL(url);
 };

 const handleExportJson = async () => {
 try {
 const { data } = await apiClient.get(
 `/courses/${courseId}/export?format=json&variant=teacher`,
 { responseType: "blob" }
 );
 const slug = course?.slug || "course";
 downloadBlob(data as Blob, `${slug}-teacher.json`);
 toast.success("Course JSON downloaded");
 } catch (e) {
 const err = e as { response?: { status?: number } };
 if (err.response?.status === 403) {
 toast.error("You don't have permission to export this course");
 } else {
 toast.error("Export failed");
 }
 }
 };

 const handleExportPdf = async () => {
 try {
 const { data } = await apiClient.get(
 `/courses/${courseId}/export?format=pdf&variant=teacher`,
 { responseType: "blob" }
 );
 const slug = course?.slug || "course";
 downloadBlob(data as Blob, `${slug}-teacher.pdf`);
 toast.success("Course PDF downloaded");
 } catch (e) {
 const err = e as { response?: { status?: number } };
 const status = err.response?.status;
 // 503 = server has no Playwright/Chromium (the prod image is
 // intentionally lean). A missing response object means the request
 // never landed (network failure / server unreachable). Both are
 // non-actionable for the user, so steer them to the always-available
 // JSON export rather than surfacing a raw error/stack.
 if (status === 503 || !err.response) {
 toast.error(t("admin.courseEdit.pdfExportUnavailable"));
 } else {
 toast.error(t("admin.courseEdit.pdfExportFailed"));
 }
 }
 };

 const handleImportJson = async (file: File) => {
 if (!file.name.toLowerCase().endsWith(".json")) {
 toast.error("Pick a .json file produced by `Export JSON`");
 return;
 }
 try {
 const text = await file.text();
 const body = JSON.parse(text);
 const { data } = await apiClient.post<{
 id: string;
 slug: string;
 title: string;
 module_count: number;
 }>("/courses/import", body);
 toast.success(
 `Imported "${data.title}" (${data.module_count} module${data.module_count === 1 ? "" : "s"})`
 );
 router.push(`/admin/courses/${data.id}/edit`);
 } catch (e) {
 const err = e as { response?: { data?: { detail?: string } } };
 toast.error(err.response?.data?.detail || "Import failed (check the JSON schema)");
 }
 };

 // Module actions
 const handleAddModule = async () => {
 if (!newModuleTitle.trim()) return;
 setAddingModule(true);
 try {
 await apiClient.post(`/courses/${courseId}/modules/`, { title: newModuleTitle.trim() });
 setNewModuleTitle("");
 toast.success("Module added");
 fetchCourse();
 } catch {
 toast.error("Failed to add module");
 } finally {
 setAddingModule(false);
 }
 };

 const handleUpdateModule = async (moduleId: string) => {
 if (!editingModuleTitle.trim()) return;
 try {
 await apiClient.put(`/courses/${courseId}/modules/${moduleId}/`, { title: editingModuleTitle.trim() });
 setEditingModuleId(null);
 toast.success("Module updated");
 fetchCourse();
 } catch {
 toast.error("Failed to update module");
 }
 };

 const handleDeleteModule = async (moduleId: string) => {
 if (!(await confirm({ message: "Delete this module and all its lessons?", variant: "danger", confirmLabel: "Delete" }))) return;
 try {
 await apiClient.delete(`/courses/${courseId}/modules/${moduleId}/`);
 toast.success("Module deleted");
 fetchCourse();
 } catch {
 toast.error("Failed to delete module");
 }
 };

 // Lesson actions. A lesson has no type — it is an empty container of typed
 // blocks (specs/017 US1); creation asks only for a title and opens the editor.
 const handleAddLesson = async (moduleId: string) => {
 if (!lessonForm.title.trim()) return;
 try {
 const { data } = await apiClient.post(`/courses/${courseId}/modules/${moduleId}/lessons/`, {
 title: lessonForm.title.trim(),
 content: { version: 2, blocks: [] },
 duration_minutes: lessonForm.duration_minutes ? parseInt(lessonForm.duration_minutes) : null,
 });
 setLessonForm({ title: "", content_type: "text", content: {}, duration_minutes: "" });
 setAddingLessonToModule(null);
 router.push(`/admin/lessons/${data.id}/edit?courseId=${courseId}&moduleId=${moduleId}`);
 } catch {
 toast.error("Failed to add lesson");
 }
 };

 // ─── Block operations ──────────────────────────────────────────
 const handleDeleteLesson = async (moduleId: string, lessonId: string) => {
 if (!(await confirm({ message: "Delete this lesson?", variant: "danger", confirmLabel: "Delete" }))) return;
 try {
 await apiClient.delete(`/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/`);
 toast.success("Lesson deleted");
 fetchCourse();
 } catch {
 toast.error("Failed to delete lesson");
 }
 };

 const handleEnrollUser = async () => {
 if (!enrollingUser) return;
 try {
 await apiClient.post("/admin/enroll/", { user_id: enrollingUser, course_id: courseId });
 setEnrollingUser("");
 toast.success("Student enrolled");
 fetchStudents();
 } catch {
 toast.error("Failed to enroll user");
 }
 };

 const handleUnenroll = async (enrollmentId: string) => {
 if (!(await confirm({ message: "Remove this student from the course?", variant: "danger", confirmLabel: "Delete" }))) return;
 try {
 await apiClient.delete(`/admin/enrollments/${enrollmentId}/`);
 toast.success("Student removed");
 fetchStudents();
 } catch {
 toast.error("Failed to unenroll student");
 }
 };

 const handleAddAssignment = async () => {
 if (!assignmentForm.title.trim() || !assignmentForm.due_date) return;
 setAddingAssignment(true);
 try {
 await apiClient.post("/assignments", {
 course_id: courseId,
 title: assignmentForm.title.trim(),
 description: assignmentForm.description.trim() || null,
 due_date: new Date(assignmentForm.due_date).toISOString(),
 max_score: parseInt(assignmentForm.max_score) || 100,
 allow_late: assignmentForm.allow_late,
 });
 setAssignmentForm({ title: "", description: "", due_date: "", max_score: "100", allow_late: false });
 setShowAddAssignment(false);
 toast.success("Assignment created");
 fetchAssignments();
 } catch {
 toast.error("Failed to create assignment");
 } finally {
 setAddingAssignment(false);
 }
 };

 const handleDeleteAssignment = async (assignmentId: string, title: string) => {
 if (!(await confirm({ title: "Delete assignment?", message: `Delete "${title}" and all its submissions?`, variant: "danger", confirmLabel: "Delete" }))) return;
 try {
 await apiClient.delete(`/assignments/${assignmentId}`);
 toast.success("Assignment deleted");
 fetchAssignments();
 } catch {
 toast.error("Failed to delete assignment");
 }
 };

 // DnD sensors
 const sensors = useSensors(
 useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
 useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
 );

 const handleLessonDragEnd = async (moduleId: string, event: DragEndEvent) => {
 const { active, over } = event;
 if (!over || active.id === over.id || !course) return;

 const module = course.modules?.find((m) => m.id === moduleId);
 if (!module?.lessons) return;

 const oldIndex = module.lessons.findIndex((l) => l.id === active.id);
 const newIndex = module.lessons.findIndex((l) => l.id === over.id);
 if (oldIndex === -1 || newIndex === -1) return;

 const reordered = arrayMove(module.lessons, oldIndex, newIndex);
 setCourse({
 ...course,
 modules: course.modules!.map((m) =>
 m.id === moduleId ? { ...m, lessons: reordered } : m
 ),
 });

 try {
 await apiClient.put(
 `/courses/${courseId}/modules/${moduleId}/lessons/reorder/`,
 { ordered_ids: reordered.map((l) => l.id) }
 );
 fetchCourse();
 } catch {
 toast.error("Failed to reorder lessons");
 fetchCourse();
 }
 };

 const toggleModule = (moduleId: string) => {
 setExpandedModules((prev) => {
 const next = new Set(prev);
 if (next.has(moduleId)) next.delete(moduleId);
 else next.add(moduleId);
 return next;
 });
 };

 /** `t()` takes no parameters; these keys carry an `{n}` placeholder. */
 const counted = (key: string, n: number): string => t(key).replace("{n}", String(n));

 // What the lesson holds, for the line under its name. The branches that
 // used to live here read the v2 block list and the v1 body keyed on
 // content_type. Every lesson has been pages since the p4g3sv3rs10n
 // migration, so both were dead — and their fallthrough is what reported
 // "No content yet" under lessons with eight blocks in them.
 const getContentSummary = (lesson: Lesson): string => {
 const summary = lessonSummary(lesson.content);
 if (summary.kind === "empty") return t("admin.courseEdit.summaryEmpty");

 const parts = summary.counts.map((c) => counted(KIND_KEYS[c.type], c.count));
 // One page is the ordinary case; saying so adds nothing.
 if (summary.pages > 1) {
 return `${counted("admin.courseEdit.summaryPages", summary.pages)} · ${parts.join(", ")}`;
 }
 return parts.join(", ");
 };

 if (loading) {
 return (
 <div className="flex h-64 items-center justify-center">
 <div className="h-8 w-8 animate-spin rounded-pill border-4 border-primary border-t-transparent" />
 </div>
 );
 }

 if (!course) {
 // Also the landing spot when an exercise editor's back points at a deleted
 // course (specs/016 FR-004) — must not be a dead end.
 return (
 <div className="flex flex-col items-center gap-4 py-24 text-center text-text-muted ">
 <p>Course not found</p>
 <Button variant="outline" onClick={() => router.push("/admin/courses")}>
 {t("admin.courseEdit.backToCourses")}
 </Button>
 </div>
 );
 }

 return (
 <div className="mx-auto max-w-4xl pb-12">
 {/* Header */}
 <div className="mb-6 flex items-center justify-between">
 <button
 onClick={() => router.push("/admin/courses")}
 className="inline-flex items-center gap-1.5 text-sm font-medium text-text-muted hover:text-text "
 >
 <ArrowLeft className="h-4 w-4" />
 Back to Courses
 </button>
 <div className="flex items-center gap-2">
 <Button
 variant="outline"
 onClick={() => window.open(`/courses/${courseId}?preview=true`, "_blank")}
 >
 <Eye className="mr-1 h-4 w-4" />
 Preview
 </Button>
 <Button variant="outline" onClick={handleExportJson} title="Download course as JSON (re-importable)">
 <Download className="mr-1 h-4 w-4" />
 Export JSON
 </Button>
 <Button variant="outline" onClick={handleExportPdf} title="Download course as PDF (teacher variant)">
 <Download className="mr-1 h-4 w-4" />
 Export PDF
 </Button>
 <input
 ref={importFileRef}
 type="file"
 accept=".json,application/json"
 className="hidden"
 onChange={(e) => {
 const f = e.target.files?.[0];
 if (f) void handleImportJson(f);
 e.target.value = "";
 }}
 />
 <Button
 variant="outline"
 onClick={() => importFileRef.current?.click()}
 title="Import a previously-exported course JSON"
 >
 <Upload className="mr-1 h-4 w-4" />
 Import JSON
 </Button>
 {course.status === "draft" && (
 <Button variant="outline" onClick={handlePublish}>
 Publish
 </Button>
 )}
 <Button variant="destructive" onClick={handleDeleteCourse} disabled={deleting}>
 <Trash2 className="mr-1 h-4 w-4" />
 {deleting ? "Deleting..." : "Delete"}
 </Button>
 </div>
 </div>

 {/* Course Metadata */}
 <Card className="mb-6">
 <CardHeader>
 <CardTitle className="text-lg">Course Details</CardTitle>
 </CardHeader>
 <CardContent className="space-y-4">
 <div>
 <label className="mb-1 block text-sm font-medium text-text ">Title</label>
 <input
 type="text"
 value={title}
 onChange={(e) => setTitle(e.target.value)}
 className="w-full rounded-lg border border-border-strong px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
 />
 </div>
 <div>
 <label className="mb-1 block text-sm font-medium text-text ">Description</label>
 <textarea
 value={description}
 onChange={(e) => setDescription(e.target.value)}
 rows={3}
 className="w-full rounded-lg border border-border-strong px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
 />
 </div>
 <div>
 <label className="mb-1 block text-sm font-medium text-text ">Category</label>
 <input
 type="text"
 value={category}
 onChange={(e) => setCategory(e.target.value)}
 placeholder="e.g., programming, math, languages"
 className="w-full rounded-lg border border-border-strong px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
 />
 </div>
 <div>
 <label className="mb-1 block text-sm font-medium text-text ">{t("admin.courseEdit.thumbnailLabel")}</label>
 <div className="flex items-center gap-3">
 {course.thumbnail_url ? (
 // eslint-disable-next-line @next/next/no-img-element
 <img
 src={course.thumbnail_url}
 alt={t("admin.courseEdit.thumbnailLabel")}
 className="h-20 w-32 rounded-lg border border-border-strong object-cover"
 />
 ) : (
 <div className="flex h-20 w-32 items-center justify-center rounded-lg border border-dashed border-border-strong text-3xs text-text-subtle">
 —
 </div>
 )}
 <div className="flex flex-col gap-1.5">
 <Button
 variant="outline"
 size="sm"
 disabled={savingThumbnail}
 onClick={() => thumbnailInputRef.current?.click()}
 >
 {course.thumbnail_url
 ? t("admin.courseEdit.thumbnailReplace")
 : t("admin.courseEdit.thumbnailUpload")}
 </Button>
 {course.thumbnail_url && (
 <Button
 variant="ghost"
 size="sm"
 disabled={savingThumbnail}
 onClick={handleThumbnailRemove}
 >
 {t("admin.courseEdit.thumbnailRemove")}
 </Button>
 )}
 </div>
 <input
 ref={thumbnailInputRef}
 type="file"
 accept="image/*"
 className="hidden"
 onChange={(e) => {
 const f = e.target.files?.[0];
 if (f) handleThumbnailUpload(f);
 e.target.value = "";
 }}
 />
 </div>
 </div>
 <Button onClick={handleSaveMeta} disabled={saving}>
 <Save className="mr-1 h-4 w-4" />
 {saving ? "Saving..." : "Save Changes"}
 </Button>
 </CardContent>
 </Card>

 {/* Modules */}
 <div className="mb-4 flex items-center justify-between">
 <h2 className="text-lg font-semibold text-text ">Modules & Lessons</h2>
 </div>

 <div className="space-y-3">
 {course.modules?.map((module, mi) => (
 <Card key={module.id}>
 <div
 className="flex cursor-pointer items-center gap-2 px-4 py-3 hover:bg-surface-2 "
 onClick={() => toggleModule(module.id)}
 >
 <GripVertical className="h-4 w-4 text-text-subtle" />
 {expandedModules.has(module.id) ? (
 <ChevronDown className="h-4 w-4 text-text-subtle" />
 ) : (
 <ChevronRight className="h-4 w-4 text-text-subtle" />
 )}
 <span className="flex h-6 w-6 items-center justify-center rounded bg-success-soft text-xs font-bold text-primary">
 {mi + 1}
 </span>

 {editingModuleId === module.id ? (
 <div className="flex flex-1 items-center gap-2" onClick={(e) => e.stopPropagation()}>
 <input
 type="text"
 value={editingModuleTitle}
 onChange={(e) => setEditingModuleTitle(e.target.value)}
 onKeyDown={(e) => e.key === "Enter" && handleUpdateModule(module.id)}
 className="flex-1 rounded border border-border-strong px-2 py-1 text-sm focus:border-primary focus:outline-none"
 autoFocus
 />
 <Button size="sm" onClick={() => handleUpdateModule(module.id)}>
 <Save className="h-3 w-3" />
 </Button>
 <Button size="sm" variant="ghost" onClick={() => setEditingModuleId(null)}>
 <X className="h-3 w-3" />
 </Button>
 </div>
 ) : (
 <>
 <span className="flex-1 text-sm font-medium text-text ">{module.title}</span>
 <span className="text-xs text-text-subtle">{module.lessons?.length || 0} lessons</span>
 <button
 onClick={(e) => {
 e.stopPropagation();
 setEditingModuleId(module.id);
 setEditingModuleTitle(module.title);
 }}
 className="rounded p-1 text-text-subtle hover:bg-surface-2 hover:text-text-muted "
 >
 <Pencil className="h-3.5 w-3.5" />
 </button>
 <button
 onClick={(e) => {
 e.stopPropagation();
 handleDeleteModule(module.id);
 }}
 className="rounded p-1 text-text-subtle hover:bg-danger-soft hover:text-danger-fg"
 >
 <Trash2 className="h-3.5 w-3.5" />
 </button>
 </>
 )}
 </div>

 {expandedModules.has(module.id) && (
 <CardContent className="border-t pt-3">
 {/* Lessons list */}
 <DndContext
 sensors={sensors}
 collisionDetection={closestCenter}
 onDragEnd={(event) => handleLessonDragEnd(module.id, event)}
 >
 <SortableContext
 items={module.lessons?.map((l) => l.id) || []}
 strategy={verticalListSortingStrategy}
 >
 <ul className="space-y-2">
 {module.lessons?.map((lesson) => {
 // A lesson used to be one of seven types, and the ones that were not
 // text or video opened in place, into a builder of their own. There is
 // one way in now — the lesson's page editor — because a lesson is a
 // container of blocks and every one of those types is a block.
 const editHref = `/admin/lessons/${lesson.id}/edit?courseId=${courseId}&moduleId=${module.id}`;

 return (
 <SortableLessonItem key={lesson.id} id={lesson.id}>
 {/* Lesson card */}
 <div className="rounded-lg border border-border-strong transition hover:border-border-strong hover:bg-surface-2">
 {/* Lesson header — always visible */}
 <div
 className="flex cursor-pointer items-center gap-2.5 px-3 py-2.5"
 onClick={() => router.push(editHref)}
 >
 {/* Раскрытие и переход — разные действия, поэтому кнопка своя и
   останавливает всплытие: иначе попытка заглянуть внутрь уводила
   бы со страницы курса. */}
 <button
 type="button"
 id={`lesson-toggle-${lesson.id}`}
 aria-expanded={openLessons.has(lesson.id)}
 aria-controls={`lesson-elements-${lesson.id}`}
 aria-label={t("admin.courseEdit.elementsToggle")}
 onClick={(e) => {
 e.stopPropagation();
 toggleLesson(lesson.id);
 }}
 className="shrink-0 rounded p-1 text-text-subtle hover:bg-surface-2 hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
 >
 <ChevronDown
 className={`h-3.5 w-3.5 transition-transform ${openLessons.has(lesson.id) ? "rotate-180" : ""}`}
 />
 </button>
 <FileText className="h-4 w-4 shrink-0 text-text-subtle" />
 <div className="min-w-0 flex-1">
 <div className="flex items-center gap-2">
 <span className="text-sm font-medium text-text ">{lesson.title}</span>
 {lesson.duration_minutes && (
 <span className="text-xs text-text-subtle">{lesson.duration_minutes} min</span>
 )}
 </div>
 <p className="mt-0.5 truncate text-xs text-text-subtle">
 {getContentSummary(lesson)}
 </p>
 </div>
 {/* The type chip stood here and read lesson.content_type. Every lesson
   in the product carries "text" in that column now, whatever is inside
   it, so the chip said "Text" under a lesson of eight exercises. The
   summary beside it says what is actually there. */}
 <a
 href={editHref}
 onClick={(e) => e.stopPropagation()}
 className="shrink-0 rounded border border-primary-soft bg-primary-soft/40 px-2 py-0.5 text-3xs font-semibold text-primary hover:bg-primary-soft"
 >
 Edit
 </a>
 <button
 onClick={(e) => {
 e.stopPropagation();
 handleDeleteLesson(module.id, lesson.id);
 }}
 className="shrink-0 rounded p-1 text-text-subtle hover:bg-danger-soft hover:text-danger-fg"
 >
 <Trash2 className="h-3.5 w-3.5" />
 </button>
 </div>

 <div id={`lesson-elements-${lesson.id}`}>
 <LessonElementsPanel
 open={openLessons.has(lesson.id)}
 lessonId={lesson.id}
 courseId={courseId}
 moduleId={module.id}
 content={lesson.content as Record<string, unknown> | undefined}
 onChanged={fetchCourse}
 onClose={() => {
 toggleLesson(lesson.id);
 document.getElementById(`lesson-toggle-${lesson.id}`)?.focus();
 }}
 />
 </div>
 </div>
 </SortableLessonItem>
 );
 })}
 </ul>
 </SortableContext>
 </DndContext>

 {/* Add lesson form */}
 {addingLessonToModule === module.id ? (
 <div className="mt-3 rounded-lg border border-dashed border-border-strong p-4">
 <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-subtle">New Lesson</p>
 <div className="space-y-3">
 <input
 type="text"
 value={lessonForm.title}
 onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
 placeholder="Lesson title"
 className="w-full rounded-lg border border-border-strong px-3 py-2 text-sm focus:border-primary focus:outline-none"
 autoFocus
 />
 {/* No type choice — the lesson is a container; blocks carry the types
 (specs/017 US1). Creation opens the lesson editor directly. */}
 <input
 type="number"
 value={lessonForm.duration_minutes}
 onChange={(e) => setLessonForm({ ...lessonForm, duration_minutes: e.target.value })}
 placeholder="Duration (minutes, optional)"
 className="w-48 rounded-lg border border-border-strong px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
 />
 <div className="flex gap-2">
 <Button size="sm" onClick={() => handleAddLesson(module.id)}>
 <Plus className="mr-1 h-3 w-3" /> Add Lesson
 </Button>
 <Button
 size="sm"
 variant="ghost"
 onClick={() => {
 setAddingLessonToModule(null);
 setLessonForm({ title: "", content_type: "text", content: {}, duration_minutes: "" });
 }}
 >
 Cancel
 </Button>
 </div>
 </div>
 </div>
 ) : (
 <button
 onClick={() => setAddingLessonToModule(module.id)}
 className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-border-strong py-2.5 text-xs font-medium text-text-subtle transition-colors hover:border-primary hover:text-primary"
 >
 <Plus className="h-3.5 w-3.5" />
 Add Lesson
 </button>
 )}
 </CardContent>
 )}
 </Card>
 ))}
 </div>

 {/* Add module */}
 <div className="mt-4 flex items-center gap-2">
 <input
 type="text"
 value={newModuleTitle}
 onChange={(e) => setNewModuleTitle(e.target.value)}
 onKeyDown={(e) => e.key === "Enter" && handleAddModule()}
 placeholder="New module title..."
 className="flex-1 rounded-lg border border-border-strong px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
 />
 <Button onClick={handleAddModule} disabled={addingModule || !newModuleTitle.trim()}>
 <Plus className="mr-1 h-4 w-4" />
 {addingModule ? "Adding..." : "Add Module"}
 </Button>
 </div>

 {/* Students Section — hidden for template courses */}
 {!course?.is_template && <Card className="mt-8">
 <CardHeader
 className="cursor-pointer"
 onClick={() => setShowStudents(!showStudents)}
 >
 <CardTitle className="flex items-center gap-2 text-lg">
 <Users className="h-5 w-5 text-primary" />
 Enrolled Students
 {showStudents ? (
 <ChevronDown className="ml-auto h-4 w-4 text-text-subtle" />
 ) : (
 <ChevronRight className="ml-auto h-4 w-4 text-text-subtle" />
 )}
 <span className="ml-1 rounded-pill bg-success-soft px-2 py-0.5 text-xs font-medium text-primary">
 {students.length}
 </span>
 </CardTitle>
 </CardHeader>
 {showStudents && (
 <CardContent className="border-t pt-4">
 {/* Enroll new student */}
 <div className="mb-4 flex items-center gap-2">
 <select
 value={enrollingUser}
 onChange={(e) => setEnrollingUser(e.target.value)}
 className="flex-1 rounded-lg border border-border-strong px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
 >
 <option value="">Select a user to enroll...</option>
 {allUsers
 .filter((u) => !students.some((s) => s.id === u.id))
 .map((u) => (
 <option key={u.id} value={u.id}>
 {u.full_name} ({u.email}) — {u.role}
 </option>
 ))}
 </select>
 <Button onClick={handleEnrollUser} disabled={!enrollingUser} size="sm">
 <UserPlus className="mr-1 h-4 w-4" />
 Enroll
 </Button>
 </div>

 {/* Students list */}
 {students.length === 0 ? (
 <p className="py-4 text-center text-sm text-text-subtle">
 No students enrolled yet. Use the dropdown above to add students.
 </p>
 ) : (
 <div className="space-y-1">
 {students.map((student) => (
 <div
 key={student.enrollment_id}
 className="group flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-surface-2 "
 >
 <div className="flex h-8 w-8 items-center justify-center rounded-pill bg-success-soft text-xs font-bold text-primary">
 {student.full_name
 .split(" ")
 .map((n) => n[0])
 .join("")
 .slice(0, 2)
 .toUpperCase()}
 </div>
 <div className="flex-1">
 <p className="text-sm font-medium text-text ">{student.full_name}</p>
 <p className="text-xs text-text-subtle">{student.email}</p>
 </div>
 <div className="flex items-center gap-3">
 <div className="text-right">
 <p className="text-xs font-medium text-text-muted ">{student.progress_percent}%</p>
 <div className="h-1.5 w-16 overflow-hidden rounded-pill bg-surface-2 ">
 <div
 className="h-full rounded-pill bg-primary transition-[width] duration-500"
 style={{ width: `${student.progress_percent}%` }}
 />
 </div>
 </div>
 <button
 onClick={() => handleUnenroll(student.enrollment_id)}
 className="invisible rounded p-1 text-text-subtle hover:bg-danger-soft hover:text-danger-fg group-hover:visible"
 title="Remove from course"
 >
 <Trash2 className="h-3.5 w-3.5" />
 </button>
 </div>
 </div>
 ))}
 </div>
 )}
 </CardContent>
 )}
 </Card>}

 {/* Assignments Section */}
 <Card className="mt-8">
 <CardHeader
 className="cursor-pointer"
 onClick={() => setShowAssignments(!showAssignments)}
 >
 <CardTitle className="flex items-center gap-2 text-lg">
 <ClipboardList className="h-5 w-5 text-primary" />
 Assignments
 {showAssignments ? (
 <ChevronDown className="ml-auto h-4 w-4 text-text-subtle" />
 ) : (
 <ChevronRight className="ml-auto h-4 w-4 text-text-subtle" />
 )}
 <span className="ml-1 rounded-pill bg-success-soft px-2 py-0.5 text-xs font-medium text-primary">
 {assignments.length}
 </span>
 </CardTitle>
 </CardHeader>
 {showAssignments && (
 <CardContent className="border-t pt-4">
 {/* Assignment cards */}
 {assignments.length === 0 && !showAddAssignment && (
 <p className="py-4 text-center text-sm text-text-subtle">
 No assignments yet. Click below to add the first one.
 </p>
 )}

 {assignments.length > 0 && (
 <div className="space-y-3 mb-4">
 {assignments.map((assignment) => (
 <div
 key={assignment.id}
 className="group rounded-lg border border-border-strong p-4 hover:bg-surface-2 transition-colors"
 >
 <div className="flex items-start justify-between gap-3">
 <div className="min-w-0 flex-1">
 <h4 className="text-sm font-medium text-text ">
 {assignment.title}
 </h4>
 {assignment.description && (
 <p className="mt-0.5 text-xs text-text-subtle line-clamp-2">
 {assignment.description}
 </p>
 )}
 <div className="mt-2 flex flex-wrap items-center gap-2">
 <span className="inline-flex items-center gap-1 rounded-pill bg-surface-2 px-2 py-0.5 text-3xs font-medium text-text-muted ">
 <Clock className="h-3 w-3" />
 {new Date(assignment.due_date).toLocaleDateString(undefined, {
 year: "numeric",
 month: "short",
 day: "numeric",
 hour: "2-digit",
 minute: "2-digit",
 })}
 </span>
 <span className="rounded-pill bg-success-soft px-2 py-0.5 text-3xs font-medium text-primary ">
 Max: {assignment.max_score} pts
 </span>
 {assignment.allow_late && (
 <span className="rounded-pill bg-warning-soft px-2 py-0.5 text-3xs font-medium text-warning-fg ">
 Late OK
 </span>
 )}
 {assignment.submission_count !== undefined && (
 <span className="rounded-pill bg-success-soft px-2 py-0.5 text-3xs font-medium text-primary ">
 {assignment.submission_count} submissions
 </span>
 )}
 </div>
 </div>
 <div className="flex shrink-0 items-center gap-1">
 <button
 onClick={() => window.open(`/admin/assignments/${assignment.id}/edit`, "_blank")}
 className="rounded p-1.5 text-text-subtle hover:bg-success-soft hover:text-primary "
 title="Edit assignment"
 >
 <Pencil className="h-3.5 w-3.5" />
 </button>
 <button
 onClick={() => window.open(`/admin/assignments/${assignment.id}/review`, "_blank")}
 className="rounded p-1.5 text-text-subtle hover:bg-success-soft hover:text-primary "
 title="Review submissions"
 >
 <ExternalLink className="h-3.5 w-3.5" />
 </button>
 <button
 onClick={() => handleDeleteAssignment(assignment.id, assignment.title)}
 className="rounded p-1.5 text-text-subtle hover:bg-danger-soft hover:text-danger-fg "
 title="Delete assignment"
 >
 <Trash2 className="h-3.5 w-3.5" />
 </button>
 </div>
 </div>
 </div>
 ))}
 </div>
 )}

 {/* Add Assignment toggle */}
 {showAddAssignment ? (
 <div className="rounded-lg border border-dashed border-border-strong p-4">
 <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-subtle">New Assignment</p>
 <div className="space-y-3">
 <div>
 <label className="mb-1 block text-sm font-medium text-text ">Title *</label>
 <input
 type="text"
 value={assignmentForm.title}
 onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })}
 placeholder="Assignment title"
 className="w-full rounded-lg border border-border-strong px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
 autoFocus
 />
 </div>
 <div>
 <label className="mb-1 block text-sm font-medium text-text ">Description</label>
 <textarea
 value={assignmentForm.description}
 onChange={(e) => setAssignmentForm({ ...assignmentForm, description: e.target.value })}
 placeholder="Optional description..."
 rows={3}
 className="w-full rounded-lg border border-border-strong px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
 />
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="mb-1 block text-sm font-medium text-text ">Due Date *</label>
 <input
 type="datetime-local"
 value={assignmentForm.due_date}
 onChange={(e) => setAssignmentForm({ ...assignmentForm, due_date: e.target.value })}
 className="w-full rounded-lg border border-border-strong px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
 />
 </div>
 <div>
 <label className="mb-1 block text-sm font-medium text-text ">Max Score</label>
 <input
 type="number"
 value={assignmentForm.max_score}
 onChange={(e) => setAssignmentForm({ ...assignmentForm, max_score: e.target.value })}
 placeholder="100"
 min={0}
 className="w-full rounded-lg border border-border-strong px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
 />
 </div>
 </div>
 <label className="flex items-center gap-2 text-sm text-text ">
 <input
 type="checkbox"
 checked={assignmentForm.allow_late}
 onChange={(e) => setAssignmentForm({ ...assignmentForm, allow_late: e.target.checked })}
 className="h-4 w-4 rounded border-border-strong text-primary focus:ring-primary"
 />
 Allow late submissions
 </label>
 <div className="flex gap-2">
 <Button size="sm" onClick={handleAddAssignment} disabled={addingAssignment || !assignmentForm.title.trim() || !assignmentForm.due_date}>
 <Plus className="mr-1 h-3 w-3" />
 {addingAssignment ? "Creating..." : "Create Assignment"}
 </Button>
 <Button
 size="sm"
 variant="ghost"
 onClick={() => {
 setShowAddAssignment(false);
 setAssignmentForm({ title: "", description: "", due_date: "", max_score: "100", allow_late: false });
 }}
 >
 Cancel
 </Button>
 </div>
 </div>
 </div>
 ) : (
 <button
 onClick={() => setShowAddAssignment(true)}
 className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-border-strong py-2.5 text-xs font-medium text-text-subtle transition-colors hover:border-primary hover:text-primary"
 >
 <Plus className="h-3.5 w-3.5" />
 Add Assignment
 </button>
 )}
 </CardContent>
 )}
 </Card>
 </div>
 );
}



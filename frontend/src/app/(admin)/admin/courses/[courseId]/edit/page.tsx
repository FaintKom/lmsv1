"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm-dialog";
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
} from "lucide-react";
import type { Course, Module, Lesson, LessonBlock } from "@/types/api";
import QuizBuilder from "@/components/assessments/quiz-builder";
import ChallengeBuilder from "@/components/code-editor/challenge-builder";
import FileUploadConfig from "@/components/submissions/file-upload-config";
import InteractiveBuilder from "@/components/submissions/interactive-builder";
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
 className="mt-2.5 cursor-grab touch-none p-1 text-ink-300 hover:text-text-muted active:cursor-grabbing"
 {...listeners}
 >
 <GripVertical className="h-4 w-4" />
 </button>
 <div className="flex-1">{children}</div>
 </div>
 </li>
 );
}

function SortableBlockItem({
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
 <div ref={setNodeRef} style={style} {...attributes}>
 <div className="flex items-start gap-1">
 <button
 type="button"
 className="mt-2.5 cursor-grab touch-none p-1 text-ink-300 hover:text-text-muted active:cursor-grabbing"
 {...listeners}
 >
 <GripVertical className="h-4 w-4" />
 </button>
 <div className="flex-1 min-w-0">{children}</div>
 </div>
 </div>
 );
}

// ─── Block helpers ──────────────────────────────────────────────────
function generateBlockId(): string {
 return Math.random().toString(36).slice(2, 9);
}

const BLOCK_TYPE_ICONS: Record<string, typeof FileText> = {
 text: FileText,
 html: Code,
 video: Video,
 exercise: Puzzle,
};

const BLOCK_TYPE_COLORS: Record<string, string> = {
 text: "bg-ink-100 text-text-muted ",
 html: "bg-sun-50 text-warning-fg ",
 video: "bg-danger-soft text-danger-fg ",
 exercise: "bg-success-soft text-primary ",
};

function getBlockPreview(block: LessonBlock): string {
 if (block.type === "text") {
 if (block.format === "tiptap" && typeof block.body === "object") {
 const doc = block.body as { content?: Array<{ content?: Array<{ text?: string }> }> };
 const firstText = doc?.content?.[0]?.content?.[0]?.text || "";
 return firstText.length > 80 ? firstText.slice(0, 80) + "..." : firstText || "Empty text block";
 }
 const body = typeof block.body === "string" ? block.body : "";
 return body.length > 80 ? body.slice(0, 80) + "..." : body || "Empty text block";
 }
 if (block.type === "html") {
 const body = typeof block.body === "string" ? block.body : "";
 const stripped = body.replace(/<[^>]*>/g, "").trim();
 return stripped.length > 80 ? stripped.slice(0, 80) + "..." : stripped || "Empty HTML block";
 }
 if (block.type === "video") return block.url || "No video URL";
 if (block.type === "exercise") return block.exercise_id ? `Exercise: ${block.exercise_id.slice(0, 8)}...` : "No exercise linked";
 return "Unknown block";
}

/** Parse lesson content to v2 blocks. Normalizes v1 content to a single block. */
function parseContentToBlocks(lesson: Lesson): LessonBlock[] {
 const content = lesson.content || {};
 // Already v2
 if (content.version === 2 && Array.isArray(content.blocks)) {
 return (content.blocks as LessonBlock[]).map((b, i) => ({
 ...b,
 id: b.id || generateBlockId(),
 sort_order: b.sort_order ?? i,
 page: b.page ?? 1,
 }));
 }
 // v1 fallback: convert old content to a single block
 if (lesson.content_type === "text") {
 return [{
 id: generateBlockId(),
 type: "text",
 sort_order: 0,
 page: 1,
 body: (content.body as string | Record<string, unknown>) || "",
 format: (content.format as string) || "markdown",
 }];
 }
 if (lesson.content_type === "video") {
 return [{
 id: generateBlockId(),
 type: "video",
 sort_order: 0,
 page: 1,
 url: (content.url as string) || "",
 }];
 }
 // For quiz, code_challenge, etc. — return empty blocks (legacy types handled by old editors)
 return [];
}

/** Build v2 content JSONB from blocks array */
function buildV2Content(blocks: LessonBlock[]): Record<string, unknown> {
 return {
 version: 2,
 blocks: blocks.map((b, i) => ({ ...b, sort_order: i })),
 };
}

const CONTENT_TYPE_OPTIONS = [
 { value: "text", label: "Text", icon: FileText },
 { value: "video", label: "Video", icon: PlayCircle },
 { value: "quiz", label: "Quiz", icon: CheckCircle },
 { value: "code_challenge", label: "Code", icon: Code },
 { value: "file_upload", label: "File Upload", icon: Upload },
 { value: "interactive", label: "Interactive", icon: Puzzle },
];

const TYPE_COLORS: Record<string, string> = {
 text: "bg-ink-100 text-text-muted border-border-strong ",
 video: "bg-danger-soft text-danger-fg border-danger ",
 quiz: "bg-success-soft text-primary border-primary-soft ",
 code_challenge: "bg-success-soft text-primary border-primary-soft ",
 file_upload: "bg-sun-50 text-warning-fg border-warning ",
 interactive: "bg-success-soft text-primary border-primary-soft ",
};

const TYPE_EXPANDED_BG: Record<string, string> = {
 text: "border-border-strong bg-surface-2/50 ",
 video: "border-danger bg-danger-soft/30 ",
 quiz: "border-primary-soft bg-success-soft/30 ",
 code_challenge: "border-primary-soft bg-success-soft/30 ",
 file_upload: "border-warning bg-sun-50/30 ",
 interactive: "border-primary-soft bg-success-soft/30 ",
};

export default function CourseEditorPage() {
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

 // Expanded lesson (single expanded lesson for editing)
 const [expandedLessonId, setExpandedLessonId] = useState<string | null>(null);
 const [editLessonForm, setEditLessonForm] = useState({
 title: "",
 content: {} as Record<string, unknown>,
 duration_minutes: "",
 });

 // Block editor state (per-lesson blocks)
 const [lessonBlocks, setLessonBlocks] = useState<Record<string, LessonBlock[]>>({});
 const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
 const [showExercisePicker, setShowExercisePicker] = useState(false);
 const [savingBlocks, setSavingBlocks] = useState(false);

 // Quiz management
 const [existingQuiz, setExistingQuiz] = useState<Record<string, unknown> | null>(null);

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

 // Active tab for expanded lesson
 const [lessonTab, setLessonTab] = useState<"content" | "settings">("content");

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
 .catch(() => toast.error("Failed to load course"))
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
 }, [fetchCourse]);

 useEffect(() => {
 if (showStudents) {
 fetchStudents();
 fetchAllUsers();
 }
 }, [showStudents, fetchStudents, fetchAllUsers]);

 useEffect(() => {
 if (showAssignments) {
 fetchAssignments();
 }
 }, [showAssignments, fetchAssignments]);

 // When expanding a quiz lesson, load quiz data
 const loadQuizForLesson = useCallback((lessonId: string) => {
 apiClient
 .get(`/assessments/lessons/${lessonId}/quiz`)
 .then(({ data }) => setExistingQuiz(data))
 .catch(() => setExistingQuiz(null));
 }, []);

 const handleExpandLesson = (lesson: Lesson) => {
 if (expandedLessonId === lesson.id) {
 setExpandedLessonId(null);
 setEditingBlockId(null);
 return;
 }
 setExpandedLessonId(lesson.id);
 setEditingBlockId(null);
 setEditLessonForm({
 title: lesson.title,
 content: lesson.content || {},
 duration_minutes: lesson.duration_minutes?.toString() || "",
 });
 // Parse blocks for block editor
 const blocks = parseContentToBlocks(lesson);
 setLessonBlocks((prev) => ({ ...prev, [lesson.id]: blocks }));
 setLessonTab("content");
 if (lesson.content_type === "quiz") {
 loadQuizForLesson(lesson.id);
 }
 };

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
 const err = e as { response?: { status?: number; data?: { detail?: string } } };
 if (err.response?.status === 503) {
 toast.error(
 "PDF export not yet enabled on the server (Playwright needs to be installed)."
 );
 } else {
 toast.error(err.response?.data?.detail || "PDF export failed");
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

 // Lesson actions
 const handleAddLesson = async (moduleId: string) => {
 if (!lessonForm.title.trim()) return;
 try {
 await apiClient.post(`/courses/${courseId}/modules/${moduleId}/lessons/`, {
 title: lessonForm.title.trim(),
 content_type: lessonForm.content_type,
 content: lessonForm.content,
 duration_minutes: lessonForm.duration_minutes ? parseInt(lessonForm.duration_minutes) : null,
 });
 setLessonForm({ title: "", content_type: "text", content: {}, duration_minutes: "" });
 setAddingLessonToModule(null);
 toast.success("Lesson added");
 fetchCourse();
 } catch {
 toast.error("Failed to add lesson");
 }
 };

 const handleUpdateLesson = async (moduleId: string, lessonId: string) => {
 if (!editLessonForm.title.trim()) return;
 try {
 await apiClient.put(`/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/`, {
 title: editLessonForm.title.trim(),
 content: editLessonForm.content,
 duration_minutes: editLessonForm.duration_minutes ? parseInt(editLessonForm.duration_minutes) : null,
 });
 toast.success("Lesson updated");
 fetchCourse();
 } catch {
 toast.error("Failed to update lesson");
 }
 };

 // ─── Block operations ──────────────────────────────────────────
 const getBlocks = (lessonId: string): LessonBlock[] => lessonBlocks[lessonId] || [];

 const updateBlocks = (lessonId: string, updater: (blocks: LessonBlock[]) => LessonBlock[]) => {
 setLessonBlocks((prev) => ({
 ...prev,
 [lessonId]: updater(prev[lessonId] || []),
 }));
 };

 const handleAddBlock = (lessonId: string, type: "text" | "html" | "video" | "exercise") => {
 const blocks = getBlocks(lessonId);
 const newBlock: LessonBlock = {
 id: generateBlockId(),
 type,
 sort_order: blocks.length,
 page: 1,
 };
 if (type === "text") {
 newBlock.body = "";
 newBlock.format = "tiptap";
 }
 if (type === "html") {
 newBlock.body = "";
 newBlock.format = "html";
 }
 if (type === "video") {
 newBlock.url = "";
 }
 if (type === "exercise") {
 newBlock.exercise_id = "";
 }
 updateBlocks(lessonId, (b) => [...b, newBlock]);
 setEditingBlockId(newBlock.id);
 };

 const handleDeleteBlock = (lessonId: string, blockId: string) => {
 updateBlocks(lessonId, (blocks) => blocks.filter((b) => b.id !== blockId));
 if (editingBlockId === blockId) setEditingBlockId(null);
 };

 const handleBlockDragEnd = (lessonId: string, event: DragEndEvent) => {
 const { active, over } = event;
 if (!over || active.id === over.id) return;
 updateBlocks(lessonId, (blocks) => {
 const oldIndex = blocks.findIndex((b) => b.id === active.id);
 const newIndex = blocks.findIndex((b) => b.id === over.id);
 if (oldIndex === -1 || newIndex === -1) return blocks;
 return arrayMove(blocks, oldIndex, newIndex);
 });
 };

 const handleUpdateBlock = (lessonId: string, blockId: string, updates: Partial<LessonBlock>) => {
 updateBlocks(lessonId, (blocks) =>
 blocks.map((b) => (b.id === blockId ? { ...b, ...updates } : b))
 );
 };

 const handleSaveBlocks = async (moduleId: string, lessonId: string) => {
 setSavingBlocks(true);
 try {
 const blocks = getBlocks(lessonId);
 const v2Content = buildV2Content(blocks);
 await apiClient.put(`/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/`, {
 title: editLessonForm.title.trim(),
 content: v2Content,
 duration_minutes: editLessonForm.duration_minutes ? parseInt(editLessonForm.duration_minutes) : null,
 });
 toast.success("Lesson saved");
 fetchCourse();
 } catch {
 toast.error("Failed to save lesson");
 } finally {
 setSavingBlocks(false);
 }
 };

 const handleDeleteLesson = async (moduleId: string, lessonId: string) => {
 if (!(await confirm({ message: "Delete this lesson?", variant: "danger", confirmLabel: "Delete" }))) return;
 try {
 await apiClient.delete(`/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/`);
 if (expandedLessonId === lessonId) setExpandedLessonId(null);
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

 const getContentText = (content: Record<string, unknown>, contentType: string): string => {
 if (contentType === "text") return (content.body as string) || "";
 if (contentType === "video") return (content.url as string) || "";
 return JSON.stringify(content, null, 2);
 };

 const setContentFromText = (text: string, contentType: string, existingContent?: Record<string, unknown>): Record<string, unknown> => {
 if (contentType === "text") return { body: text, format: existingContent?.format || "markdown" };
 if (contentType === "video") return { url: text };
 try { return JSON.parse(text); } catch { return {}; }
 };

 // Content summary for collapsed lesson
 const getContentSummary = (lesson: Lesson): string => {
 const content = lesson.content || {};
 // v2 block content
 if (content.version === 2 && Array.isArray(content.blocks)) {
 const blocks = content.blocks as LessonBlock[];
 if (blocks.length === 0) return "No blocks";
 const count = blocks.length;
 const types = [...new Set(blocks.map((b) => b.type))];
 return `${count} block${count !== 1 ? "s" : ""}: ${types.join(", ")}`;
 }
 // v1 fallback
 switch (lesson.content_type) {
 case "text": {
 if (content.format === "tiptap") {
 const doc = content.body as { content?: Array<{ content?: Array<{ text?: string }> }> };
 const firstText = doc?.content?.[0]?.content?.[0]?.text || "";
 return firstText.length > 80 ? firstText.slice(0, 80) + "..." : firstText || "Block editor content";
 }
 const body = (content.body as string) || "";
 return body.length > 80 ? body.slice(0, 80) + "..." : body || "No content yet";
 }
 case "video":
 return (content.url as string) || "No video URL";
 case "quiz":
 return "Click to manage quiz questions";
 case "code_challenge":
 return "Click to manage code challenge & test cases";
 case "file_upload": {
 const types = (content.allowed_types as string[]) || [];
 return types.length ? `Accepts: ${types.join(", ")}` : "Click to configure";
 }
 case "interactive": {
 const exType = (content.exercise_type as string) || "";
 return exType ? `Type: ${exType.replace("_", " ")}` : "Click to build exercise";
 }
 default:
 return "Click to edit";
 }
 };

 if (loading) {
 return (
 <div className="flex h-64 items-center justify-center">
 <div className="h-8 w-8 animate-spin rounded-pill border-4 border-primary border-t-transparent" />
 </div>
 );
 }

 if (!course) {
 return <div className="text-center text-text-muted ">Course not found</div>;
 }

 return (
 <div className="mx-auto max-w-4xl pb-12">
 {/* Header */}
 <div className="mb-6 flex items-center justify-between">
 <button
 onClick={() => router.push("/admin/courses")}
 className="inline-flex items-center gap-1.5 text-sm font-medium text-text-muted hover:text-ink-700 "
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
 <label className="mb-1 block text-sm font-medium text-ink-700 ">Title</label>
 <input
 type="text"
 value={title}
 onChange={(e) => setTitle(e.target.value)}
 className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
 />
 </div>
 <div>
 <label className="mb-1 block text-sm font-medium text-ink-700 ">Description</label>
 <textarea
 value={description}
 onChange={(e) => setDescription(e.target.value)}
 rows={3}
 className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
 />
 </div>
 <div>
 <label className="mb-1 block text-sm font-medium text-ink-700 ">Category</label>
 <input
 type="text"
 value={category}
 onChange={(e) => setCategory(e.target.value)}
 placeholder="e.g., programming, math, languages"
 className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
 />
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
 <GripVertical className="h-4 w-4 text-ink-300" />
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
 className="flex-1 rounded border border-ink-300 px-2 py-1 text-sm focus:border-primary focus:outline-none"
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
 <span className="flex-1 text-sm font-medium text-ink-700 ">{module.title}</span>
 <span className="text-xs text-text-subtle">{module.lessons?.length || 0} lessons</span>
 <button
 onClick={(e) => {
 e.stopPropagation();
 setEditingModuleId(module.id);
 setEditingModuleTitle(module.title);
 }}
 className="rounded p-1 text-text-subtle hover:bg-ink-100 hover:text-text-muted "
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
 const typeOption = CONTENT_TYPE_OPTIONS.find((o) => o.value === lesson.content_type);
 const Icon = typeOption?.icon || FileText;
 const isExpanded = expandedLessonId === lesson.id;
 const typeBadgeClass = TYPE_COLORS[lesson.content_type] || TYPE_COLORS.text;

 return (
 <SortableLessonItem key={lesson.id} id={lesson.id}>
 {/* Lesson card */}
 <div
 className={`rounded-lg border transition-all ${
 isExpanded
 ? TYPE_EXPANDED_BG[lesson.content_type] || TYPE_EXPANDED_BG.text
 : "border-border-strong hover:border-ink-300 hover:bg-surface-2 "
 }`}
 >
 {/* Lesson header — always visible */}
 <div
 className="flex cursor-pointer items-center gap-2.5 px-3 py-2.5"
 onClick={() => handleExpandLesson(lesson)}
 >
 <Icon className="h-4 w-4 shrink-0 text-text-subtle" />
 <div className="min-w-0 flex-1">
 <div className="flex items-center gap-2">
 <span className="text-sm font-medium text-ink-700 ">{lesson.title}</span>
 {lesson.duration_minutes && (
 <span className="text-xs text-text-subtle">{lesson.duration_minutes} min</span>
 )}
 </div>
 {!isExpanded && (
 <p className="mt-0.5 truncate text-xs text-text-subtle">
 {getContentSummary(lesson)}
 </p>
 )}
 </div>
 <span className={`shrink-0 rounded-pill border px-2 py-0.5 text-[10px] font-semibold ${typeBadgeClass}`}>
 {typeOption?.label || lesson.content_type}
 </span>
 {isExpanded ? (
 <ChevronDown className="h-4 w-4 shrink-0 text-text-subtle" />
 ) : (
 <ChevronRight className="h-4 w-4 shrink-0 text-text-subtle" />
 )}
 <a
 href={`/admin/lessons/${lesson.id}/edit?courseId=${courseId}&moduleId=${module.id}`}
 onClick={(e) => e.stopPropagation()}
 className="shrink-0 rounded border border-primary-soft bg-primary-soft/40 px-2 py-0.5 text-[10px] font-semibold text-primary hover:bg-primary-soft"
 title="Open in new WYSIWYG editor (prototype)"
 >
 ✨ Edit
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

 {/* Expanded lesson editor */}
 {isExpanded && (
 <div className="border-t px-4 py-4" onClick={(e) => e.stopPropagation()}>
 {/* Tabs */}
 <div className="mb-4 flex gap-1 rounded-lg bg-paper-2/80 p-1">
 <button
 onClick={() => setLessonTab("content")}
 className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
 lessonTab === "content"
 ? "bg-paper-2 text-ink-700 shadow-sm"
 : "text-text-muted hover:text-ink-700 "
 }`}
 >
 <FileText className="h-3.5 w-3.5" />
 Content
 </button>
 <button
 onClick={() => setLessonTab("settings")}
 className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
 lessonTab === "settings"
 ? "bg-paper-2 text-ink-700 shadow-sm"
 : "text-text-muted hover:text-ink-700 "
 }`}
 >
 <Settings2 className="h-3.5 w-3.5" />
 Settings
 </button>
 </div>

 {lessonTab === "settings" && (
 <div className="space-y-3">
 <div>
 <label className="mb-1 block text-xs font-medium text-text-muted ">Lesson Title</label>
 <input
 type="text"
 value={editLessonForm.title}
 onChange={(e) => setEditLessonForm({ ...editLessonForm, title: e.target.value })}
 className="w-full rounded-lg border border-ink-300 px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
 />
 </div>
 <div>
 <label className="mb-1 block text-xs font-medium text-text-muted ">Duration (minutes)</label>
 <input
 type="number"
 value={editLessonForm.duration_minutes}
 onChange={(e) => setEditLessonForm({ ...editLessonForm, duration_minutes: e.target.value })}
 placeholder="Optional"
 className="w-32 rounded-lg border border-ink-300 px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
 />
 </div>
 <Button size="sm" onClick={() => handleUpdateLesson(module.id, lesson.id)}>
 <Save className="mr-1 h-3 w-3" /> Save Settings
 </Button>
 </div>
 )}

 {lessonTab === "content" && (
 <div className="space-y-3">
 {/* ─── Block-based editor ───────────────── */}
 <div>
 <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-subtle">
 Blocks ({getBlocks(lesson.id).length})
 </p>

 <DndContext
 sensors={sensors}
 collisionDetection={closestCenter}
 onDragEnd={(event) => handleBlockDragEnd(lesson.id, event)}
 >
 <SortableContext
 items={getBlocks(lesson.id).map((b) => b.id)}
 strategy={verticalListSortingStrategy}
 >
 <div className="space-y-2">
 {getBlocks(lesson.id).map((block) => {
 const BlockIcon = BLOCK_TYPE_ICONS[block.type] || FileText;
 const isEditing = editingBlockId === block.id;
 return (
 <SortableBlockItem key={block.id} id={block.id}>
 <div className="rounded-lg border border-border-strong bg-paper-2 ">
 {/* Block header */}
 <div className="flex items-center gap-2 px-3 py-2">
 <span className={`flex h-6 w-6 items-center justify-center rounded ${BLOCK_TYPE_COLORS[block.type] || ""}`}>
 <BlockIcon className="h-3.5 w-3.5" />
 </span>
 <span className="text-xs font-medium capitalize text-ink-700 ">
 {block.type} Block
 </span>
 {!isEditing && (
 <span className="flex-1 truncate text-xs text-text-subtle ml-1">
 {getBlockPreview(block)}
 </span>
 )}
 {isEditing && <span className="flex-1" />}
 {/* Page number */}
 <label className="flex items-center gap-1 text-[10px] text-text-subtle">
 p.
 <input
 type="number"
 min={1}
 value={block.page}
 onChange={(e) =>
 handleUpdateBlock(lesson.id, block.id, {
 page: parseInt(e.target.value) || 1,
 })
 }
 className="w-10 rounded border border-border-strong bg-transparent px-1 py-0.5 text-center text-[10px] focus:outline-none $1:border-primary"
 />
 </label>
 <button
 onClick={() => setEditingBlockId(isEditing ? null : block.id)}
 className="rounded p-1 text-text-subtle hover:bg-ink-100 hover:text-primary"
 title={isEditing ? "Collapse" : "Edit"}
 >
 {isEditing ? <ChevronDown className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
 </button>
 <button
 onClick={() => handleDeleteBlock(lesson.id, block.id)}
 className="rounded p-1 text-text-subtle hover:bg-danger-soft hover:text-danger-fg "
 title="Remove block"
 >
 <Trash2 className="h-3.5 w-3.5" />
 </button>
 </div>

 {/* Block inline editor */}
 {isEditing && (
 <div className="border-t border-border px-3 py-3">
 {/* TEXT block editor */}
 {block.type === "text" && (
 <>
 <BlockEditor
 content={
 block.format === "tiptap" && typeof block.body === "object"
 ? (block.body as Record<string, unknown>)
 : typeof block.body === "string" && block.body.trim()
 ? (block.body as unknown as Record<string, unknown>)
 : null
 }
 onChange={(json) =>
 handleUpdateBlock(lesson.id, block.id, {
 body: json as unknown as string,
 format: "tiptap",
 })
 }
 />
 </>
 )}

 {/* HTML block editor */}
 {block.type === "html" && (
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <label className="text-xs font-medium text-text-muted ">Raw HTML</label>
 <span className="text-[10px] text-warning-fg">Supports scripts, iframes, SVG, inline styles</span>
 </div>
 <textarea
 value={typeof block.body === "string" ? block.body : ""}
 onChange={(e) =>
 handleUpdateBlock(lesson.id, block.id, {
 body: e.target.value,
 format: "html",
 })
 }
 rows={12}
 spellCheck={false}
 className="w-full rounded-lg border border-ink-300 bg-ink-900 text-ink-100 px-4 py-3 font-mono text-xs leading-relaxed focus:border-warning focus:outline-none focus:ring-1 focus:ring-warning"
 placeholder="<div>\n <h2>Your HTML here</h2>\n <p>Supports scripts, iframes, SVGs...</p>\n</div>"
 />
 {typeof block.body === "string" && block.body.trim() && (
 <div>
 <p className="mb-1 text-[10px] font-medium uppercase text-text-subtle">Preview</p>
 <div className="rounded-lg border border-border-strong bg-paper-2 p-4 overflow-auto max-h-[300px]">
 <div dangerouslySetInnerHTML={{ __html: block.body }} />
 </div>
 </div>
 )}
 </div>
 )}

 {/* VIDEO block editor */}
 {block.type === "video" && (
 <>
 <label className="mb-1 block text-xs font-medium text-text-muted ">
 Video URL (YouTube, Vimeo, etc.)
 </label>
 <input
 type="text"
 value={block.url || ""}
 onChange={(e) =>
 handleUpdateBlock(lesson.id, block.id, { url: e.target.value })
 }
 placeholder="https://www.youtube.com/watch?v=..."
 className="w-full rounded-lg border border-ink-300 px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
 />
 {block.url && (
 <div className="mt-2 rounded-lg border border-border-strong bg-paper-2 p-2">
 <p className="mb-1 text-[10px] font-medium uppercase text-text-subtle">Preview</p>
 <a
 href={block.url}
 target="_blank"
 rel="noopener noreferrer"
 className="text-xs text-primary hover:underline"
 >
 {block.url}
 </a>
 </div>
 )}
 </>
 )}

 {/* EXERCISE block editor */}
 {block.type === "exercise" && (
 <div className="space-y-2">
 {block.exercise_id ? (
 <div className="flex items-center gap-2">
 <span className="rounded-pill bg-success-soft px-2 py-0.5 text-[10px] font-medium text-primary ">
 {block.exercise_id.slice(0, 8)}...
 </span>
 <a
 href={`/admin/content-library/${block.exercise_id}`}
 target="_blank"
 rel="noopener noreferrer"
 className="flex items-center gap-1 text-xs font-medium text-primary hover:underline "
 >
 <ExternalLink className="h-3 w-3" />
 Open Exercise Editor
 </a>
 <button
 onClick={() =>
 handleUpdateBlock(lesson.id, block.id, { exercise_id: "" })
 }
 className="ml-auto text-xs text-text-subtle hover:text-danger-fg"
 >
 Unlink
 </button>
 </div>
 ) : (
 <ExerciseBlockCreator
 lessonId={lesson.id}
 blockId={block.id}
 onCreated={(exerciseId) =>
 handleUpdateBlock(lesson.id, block.id, { exercise_id: exerciseId })
 }
 />
 )}
 </div>
 )}
 </div>
 )}
 </div>
 </SortableBlockItem>
 );
 })}
 </div>
 </SortableContext>
 </DndContext>

 {getBlocks(lesson.id).length === 0 && (
 <p className="py-4 text-center text-xs text-text-subtle">
 No blocks yet. Add a text, video, or exercise block below.
 </p>
 )}
 </div>

 {/* Add block buttons + Save */}
 <div className="flex flex-wrap items-center gap-2">
 <button
 onClick={() => handleAddBlock(lesson.id, "text")}
 className="flex items-center gap-1 rounded-lg border border-dashed border-ink-300 px-3 py-1.5 text-xs font-medium text-text-muted $1:border-primary hover:text-primary transition-colors"
 >
 <Plus className="h-3 w-3" /> Text
 </button>
 <button
 onClick={() => handleAddBlock(lesson.id, "html")}
 className="flex items-center gap-1 rounded-lg border border-dashed border-ink-300 px-3 py-1.5 text-xs font-medium text-text-muted hover:border-warning hover:text-warning-fg transition-colors"
 >
 <Plus className="h-3 w-3" /> HTML
 </button>
 <button
 onClick={() => handleAddBlock(lesson.id, "video")}
 className="flex items-center gap-1 rounded-lg border border-dashed border-ink-300 px-3 py-1.5 text-xs font-medium text-text-muted hover:border-danger hover:text-danger-fg transition-colors"
 >
 <Plus className="h-3 w-3" /> Video
 </button>
 <button
 onClick={() => handleAddBlock(lesson.id, "exercise")}
 className="flex items-center gap-1 rounded-lg border border-dashed border-ink-300 px-3 py-1.5 text-xs font-medium text-text-muted $1:border-primary hover:text-primary transition-colors"
 >
 <Plus className="h-3 w-3" /> Exercise
 </button>
 <div className="ml-auto">
 <Button
 size="sm"
 onClick={() => handleSaveBlocks(module.id, lesson.id)}
 disabled={savingBlocks}
 >
 <Save className="mr-1 h-3 w-3" />
 {savingBlocks ? "Saving..." : "Save"}
 </Button>
 </div>
 </div>

 {/* Legacy editors — only for v1 lessons without blocks */}
 {!(lesson.content?.version === 2) && (
 <>
 {lesson.content_type === "quiz" && (
 <QuizBuilder
 lessonId={lesson.id}
 existingQuiz={existingQuiz as never}
 onSaved={() => loadQuizForLesson(lesson.id)}
 />
 )}
 {lesson.content_type === "code_challenge" && (
 <ChallengeBuilder
 lessonId={lesson.id}
 onSaved={() => {}}
 />
 )}
 {lesson.content_type === "file_upload" && (
 <FileUploadConfig
 courseId={courseId}
 moduleId={module.id}
 lessonId={lesson.id}
 initialContent={lesson.content || {}}
 onSaved={() => fetchCourse()}
 />
 )}
 {lesson.content_type === "interactive" && (
 <InteractiveBuilder
 courseId={courseId}
 moduleId={module.id}
 lessonId={lesson.id}
 initialContent={lesson.content || {}}
 onSaved={() => fetchCourse()}
 />
 )}
 <LessonExercises lessonId={lesson.id} />
 </>
 )}
 </div>
 )}
 </div>
 )}
 </div>
 </SortableLessonItem>
 );
 })}
 </ul>
 </SortableContext>
 </DndContext>

 {/* Add lesson form */}
 {addingLessonToModule === module.id ? (
 <div className="mt-3 rounded-lg border border-dashed border-ink-300 p-4">
 <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-subtle">New Lesson</p>
 <div className="space-y-3">
 <input
 type="text"
 value={lessonForm.title}
 onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
 placeholder="Lesson title"
 className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
 autoFocus
 />
 <div>
 <label className="mb-1.5 block text-xs font-medium text-text-muted ">Content Type</label>
 <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
 {CONTENT_TYPE_OPTIONS.map((opt) => {
 const selected = lessonForm.content_type === opt.value;
 return (
 <button
 key={opt.value}
 onClick={() => setLessonForm({ ...lessonForm, content_type: opt.value, content: {} })}
 className={`flex flex-col items-center gap-1 rounded-lg border-2 px-2 py-2.5 text-xs font-medium transition-all ${
 selected
 ? `${TYPE_COLORS[opt.value]} border-current`
 : "border-transparent bg-surface-2 text-text-muted hover:bg-ink-100 "
 }`}
 >
 <opt.icon className="h-4 w-4" />
 {opt.label}
 </button>
 );
 })}
 </div>
 </div>
 {/* Only show content textarea for text/video */}
 {(lessonForm.content_type === "text" || lessonForm.content_type === "video") && (
 <>
 {lessonForm.content_type === "text" && (
 <div className="flex items-center gap-2">
 <span className="text-xs font-medium text-text-muted ">Format:</span>
 {(["markdown", "html"] as const).map((fmt) => (
 <button
 key={fmt}
 onClick={() => setLessonForm({
 ...lessonForm,
 content: { ...lessonForm.content, format: fmt },
 })}
 className={`rounded-md border px-2 py-0.5 text-xs font-medium transition-colors ${
 (lessonForm.content.format || "markdown") === fmt
 ? "border-primary bg-success-soft text-success-fg "
 : "border-border-strong text-text-muted hover:border-ink-300 "
 }`}
 >
 {fmt === "markdown" ? "Markdown" : "HTML"}
 </button>
 ))}
 </div>
 )}
 <textarea
 value={getContentText(lessonForm.content, lessonForm.content_type)}
 onChange={(e) =>
 setLessonForm({
 ...lessonForm,
 content: setContentFromText(e.target.value, lessonForm.content_type, lessonForm.content),
 })
 }
 placeholder={lessonForm.content_type === "video" ? "Video URL (YouTube, Vimeo...)" : "Content (Markdown by default)..."}
 rows={6}
 className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm font-mono focus:border-primary focus:outline-none"
 />
 </>
 )}
 {/* Info for complex types */}
 {!["text", "video"].includes(lessonForm.content_type) && (
 <div className="rounded-lg border border-border-strong bg-paper-2 p-3">
 <p className="text-xs text-text-muted ">
 Create the lesson first, then click on it to configure the {lessonForm.content_type === "quiz" ? "quiz questions" : lessonForm.content_type === "code_challenge" ? "challenge & test cases" : lessonForm.content_type === "file_upload" ? "upload settings" : "exercise"}.
 </p>
 </div>
 )}
 <input
 type="number"
 value={lessonForm.duration_minutes}
 onChange={(e) => setLessonForm({ ...lessonForm, duration_minutes: e.target.value })}
 placeholder="Duration (minutes, optional)"
 className="w-48 rounded-lg border border-ink-300 px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
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
 className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-ink-300 py-2.5 text-xs font-medium text-text-subtle transition-colors $1:border-primary hover:text-primary"
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
 className="flex-1 rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
 className="flex-1 rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
 <p className="text-sm font-medium text-ink-700 ">{student.full_name}</p>
 <p className="text-xs text-text-subtle">{student.email}</p>
 </div>
 <div className="flex items-center gap-3">
 <div className="text-right">
 <p className="text-xs font-medium text-text-muted ">{student.progress_percent}%</p>
 <div className="h-1.5 w-16 overflow-hidden rounded-pill bg-ink-100 ">
 <div
 className="h-full rounded-pill bg-primary transition-all"
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
 <h4 className="text-sm font-medium text-ink-700 ">
 {assignment.title}
 </h4>
 {assignment.description && (
 <p className="mt-0.5 text-xs text-text-subtle line-clamp-2">
 {assignment.description}
 </p>
 )}
 <div className="mt-2 flex flex-wrap items-center gap-2">
 <span className="inline-flex items-center gap-1 rounded-pill bg-ink-100 px-2 py-0.5 text-[10px] font-medium text-text-muted ">
 <Clock className="h-3 w-3" />
 {new Date(assignment.due_date).toLocaleDateString(undefined, {
 year: "numeric",
 month: "short",
 day: "numeric",
 hour: "2-digit",
 minute: "2-digit",
 })}
 </span>
 <span className="rounded-pill bg-success-soft px-2 py-0.5 text-[10px] font-medium text-primary ">
 Max: {assignment.max_score} pts
 </span>
 {assignment.allow_late && (
 <span className="rounded-pill bg-sun-50 px-2 py-0.5 text-[10px] font-medium text-warning-fg ">
 Late OK
 </span>
 )}
 {assignment.submission_count !== undefined && (
 <span className="rounded-pill bg-success-soft px-2 py-0.5 text-[10px] font-medium text-primary ">
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
 <div className="rounded-lg border border-dashed border-ink-300 p-4">
 <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-subtle">New Assignment</p>
 <div className="space-y-3">
 <div>
 <label className="mb-1 block text-sm font-medium text-ink-700 ">Title *</label>
 <input
 type="text"
 value={assignmentForm.title}
 onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })}
 placeholder="Assignment title"
 className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
 autoFocus
 />
 </div>
 <div>
 <label className="mb-1 block text-sm font-medium text-ink-700 ">Description</label>
 <textarea
 value={assignmentForm.description}
 onChange={(e) => setAssignmentForm({ ...assignmentForm, description: e.target.value })}
 placeholder="Optional description..."
 rows={3}
 className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
 />
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="mb-1 block text-sm font-medium text-ink-700 ">Due Date *</label>
 <input
 type="datetime-local"
 value={assignmentForm.due_date}
 onChange={(e) => setAssignmentForm({ ...assignmentForm, due_date: e.target.value })}
 className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
 />
 </div>
 <div>
 <label className="mb-1 block text-sm font-medium text-ink-700 ">Max Score</label>
 <input
 type="number"
 value={assignmentForm.max_score}
 onChange={(e) => setAssignmentForm({ ...assignmentForm, max_score: e.target.value })}
 placeholder="100"
 min={0}
 className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
 />
 </div>
 </div>
 <label className="flex items-center gap-2 text-sm text-ink-700 ">
 <input
 type="checkbox"
 checked={assignmentForm.allow_late}
 onChange={(e) => setAssignmentForm({ ...assignmentForm, allow_late: e.target.checked })}
 className="h-4 w-4 rounded border-ink-300 text-primary focus:ring-primary"
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
 className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-ink-300 py-2.5 text-xs font-medium text-text-subtle transition-colors $1:border-primary hover:text-primary"
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


// ─── Lesson Exercises Manager ─────────────────────────────────────────
// Exercise type menu is the single source of truth in @/lib/api/exercises.
// Adding a new exercise type ONLY there makes it appear in both the
// content-library filter and the per-lesson "create exercise" picker.
const EXERCISE_TYPE_LABELS: Record<string, string> = EXERCISE_TYPE_LABELS_FULL;
const EXERCISE_TYPES_LIST = EXERCISE_TYPES_META.map((m) => ({
 value: m.value,
 label: m.label,
 icon: m.icon,
}));

function ExerciseBlockCreator({
 lessonId,
 blockId,
 onCreated,
}: {
 lessonId: string;
 blockId: string;
 onCreated: (exerciseId: string) => void;
}) {
 const [selectedType, setSelectedType] = useState("quiz");
 const [title, setTitle] = useState("");
 const [creating, setCreating] = useState(false);

 const handleCreate = async () => {
 if (!title.trim()) {
 toast.error("Enter a title for the exercise");
 return;
 }
 setCreating(true);
 try {
 const { data } = await apiClient.post("/exercises", {
 lesson_id: lessonId,
 exercise_type: selectedType,
 title: title.trim(),
 config: {},
 });
 toast.success("Exercise created");
 onCreated(data.id);
 setTitle("");
 } catch {
 toast.error("Failed to create exercise");
 } finally {
 setCreating(false);
 }
 };

 return (
 <div className="space-y-3">
 <p className="text-xs text-text-subtle">Create a new exercise for this block:</p>
 <div className="flex flex-wrap gap-1.5">
 {EXERCISE_TYPES_LIST.map((t) => (
 <button
 key={t.value}
 onClick={() => setSelectedType(t.value)}
 className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
 selectedType === t.value
 ? "bg-primary-soft text-success-fg "
 : "bg-ink-100 text-text-muted hover:bg-ink-200 "
 }`}
 >
 {t.icon} {t.label}
 </button>
 ))}
 </div>
 <div className="flex gap-2">
 <input
 type="text"
 value={title}
 onChange={(e) => setTitle(e.target.value)}
 placeholder="Exercise title..."
 className="flex-1 rounded-lg border border-ink-300 px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
 onKeyDown={(e) => e.key === "Enter" && handleCreate()}
 />
 <Button size="sm" onClick={handleCreate} disabled={creating || !title.trim()}>
 {creating ? "Creating..." : "Create"}
 </Button>
 </div>
 </div>
 );
}

function LessonExercises({ lessonId }: { lessonId: string }) {
 const [exercises, setExercises] = useState<
 { id: string; exercise_type: string; title: string; display_id: string; sort_order: number }[]
 >([]);
 const [loading, setLoading] = useState(true);
 const [showAdd, setShowAdd] = useState(false);
 const [newTitle, setNewTitle] = useState("");
 const [newType, setNewType] = useState("quiz");
 const [adding, setAdding] = useState(false);
 const confirm = useConfirm();

 const fetchExercises = useCallback(async () => {
 try {
 const { data } = await apiClient.get(`/exercises/by-lesson/${lessonId}`);
 setExercises(data || []);
 } catch {
 setExercises([]);
 } finally {
 setLoading(false);
 }
 }, [lessonId]);

 useEffect(() => {
 fetchExercises();
 }, [fetchExercises]);

 const handleAdd = async () => {
 if (!newTitle.trim()) return;
 setAdding(true);
 try {
 await apiClient.post("/exercises", {
 lesson_id: lessonId,
 exercise_type: newType,
 title: newTitle.trim(),
 config: {},
 });
 toast.success("Exercise added");
 setNewTitle("");
 setShowAdd(false);
 await fetchExercises();
 } catch {
 toast.error("Failed to add exercise");
 } finally {
 setAdding(false);
 }
 };

 const handleDelete = async (exId: string, title: string) => {
 const ok = await confirm({
 title: "Delete exercise?",
 message: `Delete "${title}" and all its submissions?`,
 confirmLabel: "Delete",
 variant: "danger",
 });
 if (!ok) return;
 try {
 await apiClient.delete(`/exercises/${exId}`);
 toast.success("Exercise deleted");
 await fetchExercises();
 } catch {
 toast.error("Failed to delete exercise");
 }
 };

 if (loading) return null;

 return (
 <div className="mt-4 rounded-lg border border-border-strong ">
 <div className="flex items-center justify-between border-b border-border px-4 py-2.5 ">
 <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
 Exercises ({exercises.length})
 </h4>
 <button
 onClick={() => setShowAdd(!showAdd)}
 className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-primary hover:bg-success-soft "
 >
 <Plus className="h-3 w-3" />
 Add
 </button>
 </div>

 {showAdd && (
 <div className="border-b border-border p-3 ">
 <div className="flex gap-2">
 <select
 value={newType}
 onChange={(e) => setNewType(e.target.value)}
 className="rounded border border-border-strong px-2 py-1.5 text-xs "
 >
 {Object.entries(EXERCISE_TYPE_LABELS).map(([val, label]) => (
 <option key={val} value={val}>{label}</option>
 ))}
 </select>
 <input
 value={newTitle}
 onChange={(e) => setNewTitle(e.target.value)}
 placeholder="Exercise title..."
 className="flex-1 rounded border border-border-strong px-2 py-1.5 text-xs "
 onKeyDown={(e) => e.key === "Enter" && handleAdd()}
 />
 <Button size="sm" onClick={handleAdd} disabled={adding || !newTitle.trim()}>
 {adding ? "..." : "Add"}
 </Button>
 </div>
 </div>
 )}

 {exercises.length === 0 && !showAdd && (
 <p className="px-4 py-3 text-xs text-text-subtle">No exercises attached to this lesson.</p>
 )}

 {exercises.length > 0 && (
 <ul className="divide-y divide-border ">
 {exercises.map((ex) => (
 <li key={ex.id} className="group flex items-center gap-3 px-4 py-2.5">
 <span className="rounded bg-ink-100 px-1.5 py-0.5 text-[10px] font-medium text-text-muted ">
 {ex.display_id}
 </span>
 <span className="flex-1 text-xs font-medium text-ink-700 ">
 {ex.title}
 </span>
 <span className="rounded-pill bg-success-soft px-2 py-0.5 text-[10px] font-medium text-primary ">
 {EXERCISE_TYPE_LABELS[ex.exercise_type] || ex.exercise_type}
 </span>
 <a
 href={`/admin/content-library/${ex.id}`}
 target="_blank"
 rel="noopener noreferrer"
 className="rounded p-1 text-primary hover:bg-success-soft hover:text-primary "
 title="Edit exercise"
 >
 <Pencil className="h-3.5 w-3.5" />
 </a>
 <button
 onClick={() => handleDelete(ex.id, ex.title)}
 className="rounded p-1 text-ink-300 hover:bg-danger-soft hover:text-danger-fg "
 title="Delete exercise"
 >
 <Trash2 className="h-3.5 w-3.5" />
 </button>
 </li>
 ))}
 </ul>
 )}
 </div>
 );
}

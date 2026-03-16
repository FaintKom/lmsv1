"use client";

import { useEffect, useState, useCallback } from "react";
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
  Settings2,
} from "lucide-react";
import type { Course, Module, Lesson } from "@/types/api";
import QuizBuilder from "@/components/assessments/quiz-builder";
import ChallengeBuilder from "@/components/code-editor/challenge-builder";
import FileUploadConfig from "@/components/submissions/file-upload-config";
import InteractiveBuilder from "@/components/submissions/interactive-builder";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import dynamic from "next/dynamic";
import { markdownToTiptap } from "@/components/editor/utils/markdown-to-tiptap";

const BlockEditor = dynamic(
  () => import("@/components/editor/block-editor").then((m) => ({ default: m.BlockEditor })),
  { ssr: false, loading: () => <div className="flex h-[300px] items-center justify-center rounded-lg border border-slate-200 dark:border-white/10"><p className="text-sm text-slate-400">Loading editor...</p></div> }
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
          className="mt-2.5 cursor-grab touch-none p-1 text-slate-300 hover:text-slate-500 active:cursor-grabbing"
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1">{children}</div>
      </div>
    </li>
  );
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
  text: "bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10",
  video: "bg-rose-50 dark:bg-rose-500/20 text-rose-600 border-rose-200 dark:border-white/10",
  quiz: "bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 border-indigo-200 dark:border-white/10",
  code_challenge: "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 border-emerald-200 dark:border-white/10",
  file_upload: "bg-amber-50 dark:bg-amber-500/20 text-amber-600 border-amber-200 dark:border-white/10",
  interactive: "bg-violet-50 dark:bg-violet-500/20 text-violet-600 border-violet-200 dark:border-white/10",
};

const TYPE_EXPANDED_BG: Record<string, string> = {
  text: "border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5",
  video: "border-rose-200 dark:border-white/10 bg-rose-50/30 dark:bg-rose-500/20",
  quiz: "border-indigo-200 dark:border-white/10 bg-indigo-50/30 dark:bg-indigo-500/20",
  code_challenge: "border-emerald-200 dark:border-white/10 bg-emerald-50/30 dark:bg-emerald-500/20",
  file_upload: "border-amber-200 dark:border-white/10 bg-amber-50/30 dark:bg-amber-500/20",
  interactive: "border-violet-200 dark:border-white/10 bg-violet-50/30 dark:bg-violet-500/20",
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

  // Quiz management
  const [existingQuiz, setExistingQuiz] = useState<Record<string, unknown> | null>(null);

  // Students management
  const [students, setStudents] = useState<{ id: string; full_name: string; email: string; enrollment_id: string; progress_percent: number; enrolled_at: string }[]>([]);
  const [allUsers, setAllUsers] = useState<{ id: string; full_name: string; email: string; role: string }[]>([]);
  const [showStudents, setShowStudents] = useState(false);
  const [enrollingUser, setEnrollingUser] = useState("");

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

  useEffect(() => {
    fetchCourse();
  }, [fetchCourse]);

  useEffect(() => {
    if (showStudents) {
      fetchStudents();
      fetchAllUsers();
    }
  }, [showStudents, fetchStudents, fetchAllUsers]);

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
      return;
    }
    setExpandedLessonId(lesson.id);
    setEditLessonForm({
      title: lesson.title,
      content: lesson.content || {},
      duration_minutes: lesson.duration_minutes?.toString() || "",
    });
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
    switch (lesson.content_type) {
      case "text": {
        if (content.format === "tiptap") {
          // Extract text from TipTap JSON
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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!course) {
    return <div className="text-center text-slate-500 dark:text-slate-400">Course not found</div>;
  }

  return (
    <div className="mx-auto max-w-4xl pb-12">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Admin Courses", href: "/admin/courses" }, { label: course.title }, { label: "Editor" }]} />
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => router.push("/admin/courses")}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Courses
        </button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => window.open(`/courses/${courseId}`, "_blank")}
          >
            <Eye className="mr-1 h-4 w-4" />
            Preview
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
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-white/20 dark:bg-[#2C2C2C] dark:text-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-300 dark:border-white/20 dark:bg-[#2C2C2C] dark:text-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Category</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., programming, math, languages"
              className="w-full rounded-lg border border-slate-300 dark:border-white/20 dark:bg-[#2C2C2C] dark:text-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Modules & Lessons</h2>
      </div>

      <div className="space-y-3">
        {course.modules?.map((module, mi) => (
          <Card key={module.id}>
            <div
              className="flex cursor-pointer items-center gap-2 px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5"
              onClick={() => toggleModule(module.id)}
            >
              <GripVertical className="h-4 w-4 text-slate-300" />
              {expandedModules.has(module.id) ? (
                <ChevronDown className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-400" />
              )}
              <span className="flex h-6 w-6 items-center justify-center rounded bg-indigo-50 dark:bg-indigo-500/20 text-xs font-bold text-indigo-600">
                {mi + 1}
              </span>

              {editingModuleId === module.id ? (
                <div className="flex flex-1 items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    value={editingModuleTitle}
                    onChange={(e) => setEditingModuleTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleUpdateModule(module.id)}
                    className="flex-1 rounded border border-slate-300 dark:border-white/20 dark:bg-[#2C2C2C] dark:text-slate-200 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none"
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
                  <span className="flex-1 text-sm font-medium text-slate-800 dark:text-slate-200">{module.title}</span>
                  <span className="text-xs text-slate-400">{module.lessons?.length || 0} lessons</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingModuleId(module.id);
                      setEditingModuleTitle(module.title);
                    }}
                    className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteModule(module.id);
                    }}
                    className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
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
                              : "border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-white/5"
                          }`}
                        >
                          {/* Lesson header — always visible */}
                          <div
                            className="flex cursor-pointer items-center gap-2.5 px-3 py-2.5"
                            onClick={() => handleExpandLesson(lesson)}
                          >
                            <Icon className="h-4 w-4 shrink-0 text-slate-400" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{lesson.title}</span>
                                {lesson.duration_minutes && (
                                  <span className="text-xs text-slate-400">{lesson.duration_minutes} min</span>
                                )}
                              </div>
                              {!isExpanded && (
                                <p className="mt-0.5 truncate text-xs text-slate-400">
                                  {getContentSummary(lesson)}
                                </p>
                              )}
                            </div>
                            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${typeBadgeClass}`}>
                              {typeOption?.label || lesson.content_type}
                            </span>
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                            ) : (
                              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteLesson(module.id, lesson.id);
                              }}
                              className="shrink-0 rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {/* Expanded lesson editor */}
                          {isExpanded && (
                            <div className="border-t px-4 py-4" onClick={(e) => e.stopPropagation()}>
                              {/* Tabs */}
                              <div className="mb-4 flex gap-1 rounded-lg bg-white/80 dark:bg-white/5 p-1">
                                <button
                                  onClick={() => setLessonTab("content")}
                                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                                    lessonTab === "content"
                                      ? "bg-white dark:bg-[#2C2C2C] text-slate-800 dark:text-slate-200 shadow-sm"
                                      : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                                  }`}
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                  Content
                                </button>
                                <button
                                  onClick={() => setLessonTab("settings")}
                                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                                    lessonTab === "settings"
                                      ? "bg-white dark:bg-[#2C2C2C] text-slate-800 dark:text-slate-200 shadow-sm"
                                      : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                                  }`}
                                >
                                  <Settings2 className="h-3.5 w-3.5" />
                                  Settings
                                </button>
                              </div>

                              {lessonTab === "settings" && (
                                <div className="space-y-3">
                                  <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Lesson Title</label>
                                    <input
                                      type="text"
                                      value={editLessonForm.title}
                                      onChange={(e) => setEditLessonForm({ ...editLessonForm, title: e.target.value })}
                                      className="w-full rounded-lg border border-slate-300 dark:border-white/20 dark:bg-[#2C2C2C] dark:text-slate-200 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Duration (minutes)</label>
                                    <input
                                      type="number"
                                      value={editLessonForm.duration_minutes}
                                      onChange={(e) => setEditLessonForm({ ...editLessonForm, duration_minutes: e.target.value })}
                                      placeholder="Optional"
                                      className="w-32 rounded-lg border border-slate-300 dark:border-white/20 dark:bg-[#2C2C2C] dark:text-slate-200 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
                                    />
                                  </div>
                                  <Button size="sm" onClick={() => handleUpdateLesson(module.id, lesson.id)}>
                                    <Save className="mr-1 h-3 w-3" /> Save Settings
                                  </Button>
                                </div>
                              )}

                              {lessonTab === "content" && (
                                <div className="space-y-3">
                                  {/* TEXT lesson */}
                                  {lesson.content_type === "text" && (
                                    <>
                                      {/* Legacy content banner */}
                                      {editLessonForm.content.format && editLessonForm.content.format !== "tiptap" && editLessonForm.content.body && (
                                        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 dark:border-amber-500/30 dark:bg-amber-500/10">
                                          <span className="text-xs text-amber-700 dark:text-amber-300">
                                            This lesson uses legacy {String(editLessonForm.content.format)} format.
                                          </span>
                                          <button
                                            onClick={() => {
                                              const converted = markdownToTiptap(
                                                editLessonForm.content.body as string || "",
                                                (editLessonForm.content.format as string) || "markdown"
                                              );
                                              setEditLessonForm({
                                                ...editLessonForm,
                                                content: { format: "tiptap", body: converted },
                                              });
                                            }}
                                            className="rounded-md bg-amber-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-amber-700"
                                          >
                                            Convert to Block Editor
                                          </button>
                                        </div>
                                      )}
                                      <BlockEditor
                                        content={
                                          editLessonForm.content.format === "tiptap"
                                            ? (editLessonForm.content.body as Record<string, unknown>) ?? null
                                            : null
                                        }
                                        onChange={(json) =>
                                          setEditLessonForm({
                                            ...editLessonForm,
                                            content: { format: "tiptap", body: json },
                                          })
                                        }
                                      />
                                      <Button size="sm" onClick={() => handleUpdateLesson(module.id, lesson.id)}>
                                        <Save className="mr-1 h-3 w-3" /> Save Content
                                      </Button>
                                    </>
                                  )}

                                  {/* VIDEO lesson */}
                                  {lesson.content_type === "video" && (
                                    <>
                                      <div>
                                        <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Video URL (YouTube, Vimeo, etc.)</label>
                                        <input
                                          type="text"
                                          value={getContentText(editLessonForm.content, "video")}
                                          onChange={(e) =>
                                            setEditLessonForm({
                                              ...editLessonForm,
                                              content: setContentFromText(e.target.value, "video"),
                                            })
                                          }
                                          placeholder="https://www.youtube.com/watch?v=..."
                                          className="w-full rounded-lg border border-slate-300 dark:border-white/20 dark:bg-[#2C2C2C] dark:text-slate-200 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
                                        />
                                      </div>
                                      {getContentText(editLessonForm.content, "video") && (
                                        <div className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#2C2C2C] p-2">
                                          <p className="mb-1 text-[10px] font-medium uppercase text-slate-400">Preview</p>
                                          <a
                                            href={getContentText(editLessonForm.content, "video")}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-indigo-600 hover:underline"
                                          >
                                            {getContentText(editLessonForm.content, "video")}
                                          </a>
                                        </div>
                                      )}
                                      <Button size="sm" onClick={() => handleUpdateLesson(module.id, lesson.id)}>
                                        <Save className="mr-1 h-3 w-3" /> Save Video
                                      </Button>
                                    </>
                                  )}

                                  {/* QUIZ lesson */}
                                  {lesson.content_type === "quiz" && (
                                    <QuizBuilder
                                      lessonId={lesson.id}
                                      existingQuiz={existingQuiz as never}
                                      onSaved={() => loadQuizForLesson(lesson.id)}
                                    />
                                  )}

                                  {/* CODE CHALLENGE lesson */}
                                  {lesson.content_type === "code_challenge" && (
                                    <ChallengeBuilder
                                      lessonId={lesson.id}
                                      onSaved={() => {}}
                                    />
                                  )}

                                  {/* FILE UPLOAD lesson */}
                                  {lesson.content_type === "file_upload" && (
                                    <FileUploadConfig
                                      courseId={courseId}
                                      moduleId={module.id}
                                      lessonId={lesson.id}
                                      initialContent={lesson.content || {}}
                                      onSaved={() => fetchCourse()}
                                    />
                                  )}

                                  {/* INTERACTIVE lesson */}
                                  {lesson.content_type === "interactive" && (
                                    <InteractiveBuilder
                                      courseId={courseId}
                                      moduleId={module.id}
                                      lessonId={lesson.id}
                                      initialContent={lesson.content || {}}
                                      onSaved={() => fetchCourse()}
                                    />
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
                  <div className="mt-3 rounded-lg border border-dashed border-slate-300 dark:border-white/20 p-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">New Lesson</p>
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={lessonForm.title}
                        onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                        placeholder="Lesson title"
                        className="w-full rounded-lg border border-slate-300 dark:border-white/20 dark:bg-[#2C2C2C] dark:text-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                        autoFocus
                      />
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">Content Type</label>
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
                                    : "border-transparent bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
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
                              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Format:</span>
                              {(["markdown", "html"] as const).map((fmt) => (
                                <button
                                  key={fmt}
                                  onClick={() => setLessonForm({
                                    ...lessonForm,
                                    content: { ...lessonForm.content, format: fmt },
                                  })}
                                  className={`rounded-md border px-2 py-0.5 text-xs font-medium transition-colors ${
                                    (lessonForm.content.format || "markdown") === fmt
                                      ? "border-indigo-300 bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400"
                                      : "border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/20"
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
                            className="w-full rounded-lg border border-slate-300 dark:border-white/20 dark:bg-[#2C2C2C] dark:text-slate-200 px-3 py-2 text-sm font-mono focus:border-indigo-500 focus:outline-none"
                          />
                        </>
                      )}
                      {/* Info for complex types */}
                      {!["text", "video"].includes(lessonForm.content_type) && (
                        <div className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#2C2C2C] p-3">
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Create the lesson first, then click on it to configure the {lessonForm.content_type === "quiz" ? "quiz questions" : lessonForm.content_type === "code_challenge" ? "challenge & test cases" : lessonForm.content_type === "file_upload" ? "upload settings" : "exercise"}.
                          </p>
                        </div>
                      )}
                      <input
                        type="number"
                        value={lessonForm.duration_minutes}
                        onChange={(e) => setLessonForm({ ...lessonForm, duration_minutes: e.target.value })}
                        placeholder="Duration (minutes, optional)"
                        className="w-48 rounded-lg border border-slate-300 dark:border-white/20 dark:bg-[#2C2C2C] dark:text-slate-200 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
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
                    className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 dark:border-white/20 py-2.5 text-xs font-medium text-slate-400 transition-colors hover:border-indigo-300 hover:text-indigo-500"
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
          className="flex-1 rounded-lg border border-slate-300 dark:border-white/20 dark:bg-[#2C2C2C] dark:text-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <Button onClick={handleAddModule} disabled={addingModule || !newModuleTitle.trim()}>
          <Plus className="mr-1 h-4 w-4" />
          {addingModule ? "Adding..." : "Add Module"}
        </Button>
      </div>

      {/* Students Section */}
      <Card className="mt-8">
        <CardHeader
          className="cursor-pointer"
          onClick={() => setShowStudents(!showStudents)}
        >
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-indigo-500" />
            Enrolled Students
            {showStudents ? (
              <ChevronDown className="ml-auto h-4 w-4 text-slate-400" />
            ) : (
              <ChevronRight className="ml-auto h-4 w-4 text-slate-400" />
            )}
            <span className="ml-1 rounded-full bg-indigo-50 dark:bg-indigo-500/20 px-2 py-0.5 text-xs font-medium text-indigo-600">
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
                className="flex-1 rounded-lg border border-slate-300 dark:border-white/20 dark:bg-[#2C2C2C] dark:text-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
              <p className="py-4 text-center text-sm text-slate-400">
                No students enrolled yet. Use the dropdown above to add students.
              </p>
            ) : (
              <div className="space-y-1">
                {students.map((student) => (
                  <div
                    key={student.enrollment_id}
                    className="group flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-50 dark:hover:bg-white/5"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-500/20 text-xs font-bold text-indigo-600">
                      {student.full_name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{student.full_name}</p>
                      <p className="text-xs text-slate-400">{student.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400">{student.progress_percent}%</p>
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                          <div
                            className="h-full rounded-full bg-indigo-500 transition-all"
                            style={{ width: `${student.progress_percent}%` }}
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => handleUnenroll(student.enrollment_id)}
                        className="invisible rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500 group-hover:visible"
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
      </Card>
    </div>
  );
}

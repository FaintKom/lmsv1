"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import apiClient from "@/lib/api-client";
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
} from "lucide-react";
import type { Course, Module, Lesson } from "@/types/api";
import QuizBuilder from "@/components/assessments/quiz-builder";
import ChallengeBuilder from "@/components/code-editor/challenge-builder";
import FileUploadConfig from "@/components/submissions/file-upload-config";
import InteractiveBuilder from "@/components/submissions/interactive-builder";

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
  { value: "code_challenge", label: "Code Challenge", icon: Code },
  { value: "file_upload", label: "File Upload", icon: Upload },
  { value: "interactive", label: "Interactive", icon: Puzzle },
];

export default function CourseEditorPage() {
  const params = useParams();
  const router = useRouter();
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

  // Lesson editing
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [editLessonForm, setEditLessonForm] = useState({
    title: "",
    content: {} as Record<string, unknown>,
    duration_minutes: "",
  });

  // Quiz management
  const [managingQuizForLesson, setManagingQuizForLesson] = useState<string | null>(null);
  const [existingQuiz, setExistingQuiz] = useState<Record<string, unknown> | null>(null);

  // Challenge management
  const [managingChallengeForLesson, setManagingChallengeForLesson] = useState<string | null>(null);

  // File upload / Interactive management
  const [managingUploadForLesson, setManagingUploadForLesson] = useState<string | null>(null);
  const [managingInteractiveForLesson, setManagingInteractiveForLesson] = useState<string | null>(null);

  // Students management
  const [students, setStudents] = useState<{ id: string; full_name: string; email: string; enrollment_id: string; progress_percent: number; enrolled_at: string }[]>([]);
  const [allUsers, setAllUsers] = useState<{ id: string; full_name: string; email: string; role: string }[]>([]);
  const [showStudents, setShowStudents] = useState(false);
  const [enrollingUser, setEnrollingUser] = useState("");

  const fetchCourse = useCallback(() => {
    apiClient
      .get(`/courses/${courseId}`)
      .then(({ data }) => {
        setCourse(data);
        setTitle(data.title);
        setDescription(data.description || "");
        setCategory(data.category || "");
        // Expand all modules by default
        const ids = new Set<string>((data.modules || []).map((m: Module) => m.id));
        setExpandedModules(ids);
      })
      .catch(() => alert("Failed to load course"))
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

  const handleSaveMeta = async () => {
    setSaving(true);
    try {
      await apiClient.put(`/courses/${courseId}/`, { title, description, category: category || null });
      fetchCourse();
    } catch {
      alert("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (!confirm("Are you sure you want to delete this course? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/courses/${courseId}/`);
      router.push("/admin/courses");
    } catch {
      alert("Failed to delete course");
      setDeleting(false);
    }
  };

  const handlePublish = async () => {
    try {
      await apiClient.post(`/courses/${courseId}/publish/`);
      fetchCourse();
    } catch {
      alert("Failed to publish");
    }
  };

  // Module actions
  const handleAddModule = async () => {
    if (!newModuleTitle.trim()) return;
    setAddingModule(true);
    try {
      await apiClient.post(`/courses/${courseId}/modules/`, { title: newModuleTitle.trim() });
      setNewModuleTitle("");
      fetchCourse();
    } catch {
      alert("Failed to add module");
    } finally {
      setAddingModule(false);
    }
  };

  const handleUpdateModule = async (moduleId: string) => {
    if (!editingModuleTitle.trim()) return;
    try {
      await apiClient.put(`/courses/${courseId}/modules/${moduleId}/`, { title: editingModuleTitle.trim() });
      setEditingModuleId(null);
      fetchCourse();
    } catch {
      alert("Failed to update module");
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm("Delete this module and all its lessons?")) return;
    try {
      await apiClient.delete(`/courses/${courseId}/modules/${moduleId}/`);
      fetchCourse();
    } catch {
      alert("Failed to delete module");
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
      fetchCourse();
    } catch {
      alert("Failed to add lesson");
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
      setEditingLessonId(null);
      fetchCourse();
    } catch {
      alert("Failed to update lesson");
    }
  };

  const handleDeleteLesson = async (moduleId: string, lessonId: string) => {
    if (!confirm("Delete this lesson?")) return;
    try {
      await apiClient.delete(`/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/`);
      fetchCourse();
    } catch {
      alert("Failed to delete lesson");
    }
  };

  const handleEnrollUser = async () => {
    if (!enrollingUser) return;
    try {
      await apiClient.post("/admin/enroll/", { user_id: enrollingUser, course_id: courseId });
      setEnrollingUser("");
      fetchStudents();
    } catch {
      alert("Failed to enroll user");
    }
  };

  const handleUnenroll = async (enrollmentId: string) => {
    if (!confirm("Remove this student from the course?")) return;
    try {
      await apiClient.delete(`/admin/enrollments/${enrollmentId}/`);
      fetchStudents();
    } catch {
      alert("Failed to unenroll student");
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

    // Optimistic update
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
      alert("Failed to reorder lessons");
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

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!course) {
    return <div className="text-center text-slate-500">Course not found</div>;
  }

  return (
    <div className="mx-auto max-w-4xl pb-12">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => router.push("/admin/courses")}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
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
            Preview as Student
          </Button>
          {course.status === "draft" && (
            <Button variant="outline" onClick={handlePublish}>
              Publish
            </Button>
          )}
          <Button variant="destructive" onClick={handleDeleteCourse} disabled={deleting}>
            <Trash2 className="mr-1 h-4 w-4" />
            {deleting ? "Deleting..." : "Delete Course"}
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
            <label className="mb-1 block text-sm font-medium text-slate-700">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., programming, math, languages"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
        <h2 className="text-lg font-semibold text-slate-900">Modules & Lessons</h2>
      </div>

      <div className="space-y-3">
        {course.modules?.map((module, mi) => (
          <Card key={module.id}>
            <div
              className="flex cursor-pointer items-center gap-2 px-4 py-3 hover:bg-slate-50"
              onClick={() => toggleModule(module.id)}
            >
              <GripVertical className="h-4 w-4 text-slate-300" />
              {expandedModules.has(module.id) ? (
                <ChevronDown className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-400" />
              )}
              <span className="flex h-6 w-6 items-center justify-center rounded bg-indigo-50 text-xs font-bold text-indigo-600">
                {mi + 1}
              </span>

              {editingModuleId === module.id ? (
                <div className="flex flex-1 items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    value={editingModuleTitle}
                    onChange={(e) => setEditingModuleTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleUpdateModule(module.id)}
                    className="flex-1 rounded border border-slate-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none"
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
                  <span className="flex-1 text-sm font-medium text-slate-800">{module.title}</span>
                  <span className="text-xs text-slate-400">{module.lessons?.length || 0} lessons</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingModuleId(module.id);
                      setEditingModuleTitle(module.title);
                    }}
                    className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
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
                <ul className="space-y-1">
                  {module.lessons?.map((lesson) => {
                    const typeOption = CONTENT_TYPE_OPTIONS.find((o) => o.value === lesson.content_type);
                    const Icon = typeOption?.icon || FileText;

                    if (editingLessonId === lesson.id) {
                      return (
                        <SortableLessonItem key={lesson.id} id={lesson.id}>
                        <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-3">
                          <div className="space-y-3">
                            <input
                              type="text"
                              value={editLessonForm.title}
                              onChange={(e) => setEditLessonForm({ ...editLessonForm, title: e.target.value })}
                              placeholder="Lesson title"
                              className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
                            />
                            {lesson.content_type === "text" && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-slate-500">Format:</span>
                                {(["markdown", "html"] as const).map((fmt) => (
                                  <button
                                    key={fmt}
                                    onClick={() => setEditLessonForm({
                                      ...editLessonForm,
                                      content: { ...editLessonForm.content, format: fmt },
                                    })}
                                    className={`rounded-md border px-2 py-0.5 text-xs font-medium transition-colors ${
                                      (editLessonForm.content.format || "markdown") === fmt
                                        ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                                        : "border-slate-200 text-slate-500 hover:border-slate-300"
                                    }`}
                                  >
                                    {fmt === "markdown" ? "Markdown" : "HTML"}
                                  </button>
                                ))}
                              </div>
                            )}
                            <textarea
                              value={getContentText(editLessonForm.content, lesson.content_type)}
                              onChange={(e) =>
                                setEditLessonForm({
                                  ...editLessonForm,
                                  content: setContentFromText(e.target.value, lesson.content_type, editLessonForm.content),
                                })
                              }
                              placeholder={lesson.content_type === "video" ? "Video URL" : lesson.content_type === "text" ? "Content (Markdown or HTML)..." : "Content..."}
                              rows={8}
                              className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm font-mono focus:border-indigo-500 focus:outline-none"
                            />
                            <input
                              type="number"
                              value={editLessonForm.duration_minutes}
                              onChange={(e) => setEditLessonForm({ ...editLessonForm, duration_minutes: e.target.value })}
                              placeholder="Duration (minutes)"
                              className="w-32 rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
                            />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleUpdateLesson(module.id, lesson.id)}>
                                <Save className="mr-1 h-3 w-3" /> Save
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingLessonId(null)}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </div>
                        </SortableLessonItem>
                      );
                    }

                    return (
                      <SortableLessonItem key={lesson.id} id={lesson.id}>
                        <div className="group flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-50">
                          <Icon className="h-4 w-4 text-slate-400" />
                          <span className="flex-1 text-sm text-slate-700">{lesson.title}</span>
                          {lesson.duration_minutes && (
                            <span className="text-xs text-slate-400">{lesson.duration_minutes} min</span>
                          )}
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-slate-400">
                            {lesson.content_type}
                          </span>
                          {lesson.content_type === "quiz" && (
                            <button
                              onClick={() => {
                                if (managingQuizForLesson === lesson.id) {
                                  setManagingQuizForLesson(null);
                                } else {
                                  setManagingQuizForLesson(lesson.id);
                                  setManagingChallengeForLesson(null);
                                  setManagingUploadForLesson(null);
                                  setManagingInteractiveForLesson(null);
                                  apiClient
                                    .get(`/assessments/lessons/${lesson.id}/quiz`)
                                    .then(({ data }) => setExistingQuiz(data))
                                    .catch(() => setExistingQuiz(null));
                                }
                              }}
                              className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 hover:bg-indigo-100"
                            >
                              {managingQuizForLesson === lesson.id ? "Close Quiz" : "Manage Quiz"}
                            </button>
                          )}
                          {lesson.content_type === "code_challenge" && (
                            <button
                              onClick={() => {
                                if (managingChallengeForLesson === lesson.id) {
                                  setManagingChallengeForLesson(null);
                                } else {
                                  setManagingChallengeForLesson(lesson.id);
                                  setManagingQuizForLesson(null);
                                  setManagingUploadForLesson(null);
                                  setManagingInteractiveForLesson(null);
                                }
                              }}
                              className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 hover:bg-emerald-100"
                            >
                              {managingChallengeForLesson === lesson.id ? "Close Challenge" : "Manage Challenge"}
                            </button>
                          )}
                          {lesson.content_type === "file_upload" && (
                            <button
                              onClick={() => {
                                if (managingUploadForLesson === lesson.id) {
                                  setManagingUploadForLesson(null);
                                } else {
                                  setManagingUploadForLesson(lesson.id);
                                  setManagingQuizForLesson(null);
                                  setManagingChallengeForLesson(null);
                                  setManagingInteractiveForLesson(null);
                                }
                              }}
                              className="rounded bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600 hover:bg-amber-100"
                            >
                              {managingUploadForLesson === lesson.id ? "Close Config" : "Configure Upload"}
                            </button>
                          )}
                          {lesson.content_type === "interactive" && (
                            <button
                              onClick={() => {
                                if (managingInteractiveForLesson === lesson.id) {
                                  setManagingInteractiveForLesson(null);
                                } else {
                                  setManagingInteractiveForLesson(lesson.id);
                                  setManagingQuizForLesson(null);
                                  setManagingChallengeForLesson(null);
                                  setManagingUploadForLesson(null);
                                }
                              }}
                              className="rounded bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-600 hover:bg-violet-100"
                            >
                              {managingInteractiveForLesson === lesson.id ? "Close Exercise" : "Build Exercise"}
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setEditingLessonId(lesson.id);
                              setEditLessonForm({
                                title: lesson.title,
                                content: lesson.content,
                                duration_minutes: lesson.duration_minutes?.toString() || "",
                              });
                            }}
                            className="invisible rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 group-hover:visible"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteLesson(module.id, lesson.id)}
                            className="invisible rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500 group-hover:visible"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        {managingQuizForLesson === lesson.id && (
                          <div className="mx-3 mb-2 mt-1 rounded-lg border border-indigo-100 bg-indigo-50/30 p-3">
                            <QuizBuilder
                              lessonId={lesson.id}
                              existingQuiz={existingQuiz as never}
                              onSaved={() => {
                                apiClient
                                  .get(`/assessments/lessons/${lesson.id}/quiz`)
                                  .then(({ data }) => setExistingQuiz(data))
                                  .catch(() => {});
                              }}
                            />
                          </div>
                        )}
                        {managingChallengeForLesson === lesson.id && (
                          <div className="mx-3 mb-2 mt-1 rounded-lg border border-emerald-100 bg-emerald-50/30 p-3">
                            <ChallengeBuilder
                              lessonId={lesson.id}
                              onSaved={() => {}}
                            />
                          </div>
                        )}
                        {managingUploadForLesson === lesson.id && (
                          <div className="mx-3 mb-2 mt-1 rounded-lg border border-amber-100 bg-amber-50/30 p-3">
                            <FileUploadConfig
                              courseId={courseId}
                              moduleId={module.id}
                              lessonId={lesson.id}
                              initialContent={lesson.content}
                              onSaved={() => {
                                fetchCourse();
                              }}
                            />
                          </div>
                        )}
                        {managingInteractiveForLesson === lesson.id && (
                          <div className="mx-3 mb-2 mt-1 rounded-lg border border-violet-100 bg-violet-50/30 p-3">
                            <InteractiveBuilder
                              courseId={courseId}
                              moduleId={module.id}
                              lessonId={lesson.id}
                              initialContent={lesson.content}
                              onSaved={() => {
                                fetchCourse();
                              }}
                            />
                          </div>
                        )}
                      </SortableLessonItem>
                    );
                  })}
                </ul>
                </SortableContext>
                </DndContext>

                {/* Add lesson form */}
                {addingLessonToModule === module.id ? (
                  <div className="mt-3 rounded-lg border border-dashed border-slate-300 p-3">
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={lessonForm.title}
                        onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                        placeholder="Lesson title"
                        className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        {CONTENT_TYPE_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => setLessonForm({ ...lessonForm, content_type: opt.value, content: {} })}
                            className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                              lessonForm.content_type === opt.value
                                ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                                : "border-slate-200 text-slate-500 hover:border-slate-300"
                            }`}
                          >
                            <opt.icon className="h-3 w-3" />
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      {lessonForm.content_type === "text" && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-slate-500">Format:</span>
                          {(["markdown", "html"] as const).map((fmt) => (
                            <button
                              key={fmt}
                              onClick={() => setLessonForm({
                                ...lessonForm,
                                content: { ...lessonForm.content, format: fmt },
                              })}
                              className={`rounded-md border px-2 py-0.5 text-xs font-medium transition-colors ${
                                (lessonForm.content.format || "markdown") === fmt
                                  ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                                  : "border-slate-200 text-slate-500 hover:border-slate-300"
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
                        rows={8}
                        className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm font-mono focus:border-indigo-500 focus:outline-none"
                      />
                      <input
                        type="number"
                        value={lessonForm.duration_minutes}
                        onChange={(e) => setLessonForm({ ...lessonForm, duration_minutes: e.target.value })}
                        placeholder="Duration (minutes)"
                        className="w-32 rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
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
                    className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 py-2 text-xs font-medium text-slate-400 hover:border-indigo-300 hover:text-indigo-500"
                  >
                    <Plus className="h-3 w-3" />
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
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
            <span className="ml-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600">
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
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                    className="group flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-50"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600">
                      {student.full_name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-700">{student.full_name}</p>
                      <p className="text-xs text-slate-400">{student.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xs font-medium text-slate-600">{student.progress_percent}%</p>
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
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

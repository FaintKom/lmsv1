"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/stores/auth-store";
import apiClient from "@/lib/api-client";
import type { Course } from "@/types/api";
import {
  Library,
  Search,
  Trash2,
  Eye,
  FileText,
  Code,
  Puzzle,
  ArrowUpDown,
  PenLine,
  ToggleLeft,
  FolderOpen,
  Upload,
  ClipboardList,
  BookOpen,
  Plus,
  Copy,
  FileStack,
  Pencil,
  Users,
  X,
  CheckCircle,
  Bot,
  Calculator,
  Box,
} from "lucide-react";
import {
  exercisesApi,
  EXERCISE_TYPE_LABELS,
  EXERCISE_TYPE_COLORS,
  type Exercise,
  type ExerciseType,
} from "@/lib/api/exercises";

// ─── Exercise type config ───

const TYPE_ICONS: Record<ExerciseType, typeof FileText> = {
  quiz: ClipboardList,
  code_challenge: Code,
  matching: Puzzle,
  ordering: ArrowUpDown,
  fill_blanks: PenLine,
  true_false: ToggleLeft,
  categorize: FolderOpen,
  file_upload: Upload,
  robot_2d: Bot,
  math_interactive: Calculator,
  world_3d: Box,
};

const ALL_TYPES: ExerciseType[] = [
  "quiz", "code_challenge", "matching", "ordering",
  "fill_blanks", "true_false", "categorize", "file_upload",
  "robot_2d", "math_interactive", "world_3d",
];

// ─── Types ───

interface Group {
  id: string;
  name: string;
  description: string;
  member_count?: number;
}

// ─── Main Page ───

export default function ContentLibraryPage() {
  const [activeTab, setActiveTab] = useState<"templates" | "exercises">("templates");

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/30">
          <Library className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Content Library</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-white/5">
        <button
          onClick={() => setActiveTab("templates")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "templates"
              ? "bg-white text-slate-900 shadow-sm dark:bg-white/10 dark:text-slate-100"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
          }`}
        >
          <FileStack className="h-4 w-4" />
          Course Templates
        </button>
        <button
          onClick={() => setActiveTab("exercises")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "exercises"
              ? "bg-white text-slate-900 shadow-sm dark:bg-white/10 dark:text-slate-100"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
          }`}
        >
          <ClipboardList className="h-4 w-4" />
          Exercises
        </button>
      </div>

      {activeTab === "templates" ? <TemplatesTab /> : <ExercisesTab />}
    </div>
  );
}

// ─── Templates Tab ───

function TemplatesTab() {
  const router = useRouter();
  const confirm = useConfirm();
  const user = useAuthStore((s) => s.user);
  const [templates, setTemplates] = useState<Course[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [copyModal, setCopyModal] = useState<Course | null>(null);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [copying, setCopying] = useState(false);

  const isMethodistOrAdmin =
    user?.role === "super_admin" ||
    user?.role === "admin" ||
    user?.is_methodist === true;
  const isTeacherOnly = user?.role === "teacher" && !user?.is_methodist;

  useEffect(() => {
    apiClient
      .get("/courses/templates")
      .then(({ data }) => {
        // Teachers only see published templates
        if (isTeacherOnly) {
          setTemplates(data.filter((c: Course) => c.status === "published"));
        } else {
          setTemplates(data);
        }
      })
      .catch(() => toast.error("Failed to load templates"))
      .finally(() => setLoading(false));

    apiClient
      .get("/admin/groups")
      .then(({ data }) => setGroups(data))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (course: Course) => {
    const ok = await confirm({
      title: "Delete Template",
      message: `Delete template "${course.title}"? This cannot be undone.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await apiClient.delete(`/courses/${course.id}`);
      toast.success("Template deleted");
      setTemplates((prev) => prev.filter((c) => c.id !== course.id));
    } catch {
      toast.error("Failed to delete template");
    }
  };

  const handleCopy = async () => {
    if (!copyModal) return;
    setCopying(true);
    try {
      const { data } = await apiClient.post(`/courses/${copyModal.id}/copy-with-group`, {
        group_ids: selectedGroups,
      });
      const enrolled = data.enrolled_count;
      toast.success(
        enrolled > 0
          ? `Course copied! ${enrolled} student${enrolled !== 1 ? "s" : ""} enrolled.`
          : "Course copied!"
      );
      setCopyModal(null);
      setSelectedGroups([]);
      router.push(`/admin/courses/${data.course.id}/edit`);
    } catch {
      toast.error("Failed to copy template");
    } finally {
      setCopying(false);
    }
  };

  const handleCreateTemplate = async () => {
    try {
      const { data } = await apiClient.post("/courses", {
        title: "New Template",
        description: "",
        is_template: true,
      });
      router.push(`/admin/courses/${data.id}/edit`);
    } catch {
      toast.error("Failed to create template");
    }
  };

  const toggleGroup = (id: string) => {
    setSelectedGroups((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  return (
    <>
      {/* Header with Create button */}
      {isMethodistOrAdmin && (
        <div className="flex justify-end">
          <Button onClick={handleCreateTemplate}>
            <Plus className="h-4 w-4" />
            Create Template
          </Button>
        </div>
      )}

      {/* Template cards */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500">
            <FileStack className="mb-3 h-10 w-10" />
            <p className="text-sm font-medium">No course templates yet</p>
            {isMethodistOrAdmin && (
              <p className="text-xs">Create your first template to get started</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((course) => (
            <Card
              key={course.id}
              className="border-l-4 border-l-violet-400 transition-shadow hover:shadow-md"
            >
              <CardContent className="p-5">
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <FileStack className="h-5 w-5 text-violet-500" />
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        course.status === "published"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400"
                      }`}
                    >
                      {course.status}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">v{course.template_version}</span>
                </div>

                <h3 className="mb-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {course.title}
                </h3>
                {course.description && (
                  <p className="mb-3 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                    {course.description}
                  </p>
                )}

                <div className="mb-3 flex items-center gap-3 text-xs text-slate-400">
                  {course.category && (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-white/10">
                      {course.category}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-3 w-3" />
                    {course.modules?.length || 0} modules
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {isMethodistOrAdmin && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/admin/courses/${course.id}/edit`)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(course)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                  {course.status === "published" && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setCopyModal(course);
                        setSelectedGroups([]);
                      }}
                      className={isMethodistOrAdmin ? "ml-auto" : ""}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Use Template
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Copy Modal */}
      {copyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-[#2C2C2C]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Use Template
              </h2>
              <button
                onClick={() => setCopyModal(null)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mb-1 text-sm text-slate-600 dark:text-slate-300">
              Copy <strong>&quot;{copyModal.title}&quot;</strong> to your courses.
            </p>
            <p className="mb-4 text-xs text-slate-400">
              Select groups to auto-enroll their students (optional).
            </p>

            {/* Group selection */}
            <div className="mb-4 max-h-48 space-y-2 overflow-y-auto">
              {groups.length === 0 ? (
                <p className="py-4 text-center text-xs text-slate-400">
                  No groups available. You can enroll groups later.
                </p>
              ) : (
                groups.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => toggleGroup(group.id)}
                    className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                      selectedGroups.includes(group.id)
                        ? "border-indigo-300 bg-indigo-50 dark:border-indigo-500/50 dark:bg-indigo-500/10"
                        : "border-slate-200 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"
                    }`}
                  >
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded border ${
                        selectedGroups.includes(group.id)
                          ? "border-indigo-500 bg-indigo-500"
                          : "border-slate-300 dark:border-white/20"
                      }`}
                    >
                      {selectedGroups.includes(group.id) && (
                        <CheckCircle className="h-3.5 w-3.5 text-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        {group.name}
                      </p>
                      {group.member_count != null && (
                        <p className="flex items-center gap-1 text-xs text-slate-400">
                          <Users className="h-3 w-3" />
                          {group.member_count} members
                        </p>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setCopyModal(null)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleCopy} disabled={copying}>
                <Copy className="h-4 w-4" />
                {copying
                  ? "Copying..."
                  : selectedGroups.length > 0
                  ? `Copy & Enroll`
                  : "Copy Course"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Exercises Tab (original content) ───

function ExercisesTab() {
  const router = useRouter();
  const confirm = useConfirm();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeType, setActiveType] = useState<ExerciseType | "all">("all");
  const [page, setPage] = useState(1);
  const perPage = 50;

  const fetchExercises = () => {
    setLoading(true);
    const params: Record<string, unknown> = { page, per_page: perPage };
    if (activeType !== "all") params.exercise_type = activeType;
    if (search.trim()) params.search = search.trim();

    exercisesApi
      .list(params as Parameters<typeof exercisesApi.list>[0])
      .then(({ data }) => {
        setExercises(data.items);
        setTotal(data.total);
      })
      .catch(() => toast.error("Failed to load exercises"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchExercises();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeType, page]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
      fetchExercises();
    }, 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleDelete = async (exercise: Exercise) => {
    const ok = await confirm({
      title: "Delete Exercise",
      message: `Delete "${exercise.title}" (${exercise.display_id})? This will also delete all student submissions.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await exercisesApi.delete(exercise.id);
      toast.success("Exercise deleted");
      fetchExercises();
    } catch {
      toast.error("Failed to delete exercise");
    }
  };

  const totalPages = Math.ceil(total / perPage);

  return (
    <>
      {/* Search & Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by title or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:border-indigo-500/50 dark:focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => { setActiveType("all"); setPage(1); }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                activeType === "all"
                  ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10"
              }`}
            >
              All ({total})
            </button>
            {ALL_TYPES.map((type) => {
              const Icon = TYPE_ICONS[type];
              return (
                <button
                  key={type}
                  onClick={() => { setActiveType(type); setPage(1); }}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    activeType === type
                      ? EXERCISE_TYPE_COLORS[type]
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {EXERCISE_TYPE_LABELS[type]}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : exercises.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500">
              <Library className="mb-3 h-10 w-10" />
              <p className="text-sm font-medium">No exercises found</p>
              <p className="text-xs">Exercises are created inside course lessons</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-white/10">
                    <th className="px-6 py-3 text-left font-semibold text-slate-500 dark:text-slate-400">ID</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-500 dark:text-slate-400">Title</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-500 dark:text-slate-400">Type</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-500 dark:text-slate-400">Created</th>
                    <th className="px-6 py-3 text-right font-semibold text-slate-500 dark:text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                  {exercises.map((ex) => {
                    const Icon = TYPE_ICONS[ex.exercise_type];
                    return (
                      <tr
                        key={ex.id}
                        className="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-white/5"
                        onClick={() => router.push(`/admin/content-library/${ex.id}`)}
                      >
                        <td className="px-6 py-3">
                          <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300">
                            {ex.display_id}
                          </span>
                        </td>
                        <td className="px-6 py-3 font-medium text-slate-800 dark:text-slate-200">
                          {ex.title}
                        </td>
                        <td className="px-6 py-3">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${EXERCISE_TYPE_COLORS[ex.exercise_type]}`}>
                            <Icon className="h-3 w-3" />
                            {EXERCISE_TYPE_LABELS[ex.exercise_type]}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-slate-500 dark:text-slate-400">
                          {new Date(ex.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/admin/content-library/${ex.id}/submissions`)}
                              title="View submissions"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(ex)}
                              title="Delete"
                              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3 dark:border-white/10">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Page {page} of {totalPages} ({total} total)
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

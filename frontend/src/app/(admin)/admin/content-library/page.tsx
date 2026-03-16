"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
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
} from "lucide-react";
import {
  exercisesApi,
  EXERCISE_TYPE_LABELS,
  EXERCISE_TYPE_COLORS,
  type Exercise,
  type ExerciseType,
} from "@/lib/api/exercises";

const TYPE_ICONS: Record<ExerciseType, typeof FileText> = {
  quiz: ClipboardList,
  code_challenge: Code,
  matching: Puzzle,
  ordering: ArrowUpDown,
  fill_blanks: PenLine,
  true_false: ToggleLeft,
  categorize: FolderOpen,
  file_upload: Upload,
};

const ALL_TYPES: ExerciseType[] = [
  "quiz",
  "code_challenge",
  "matching",
  "ordering",
  "fill_blanks",
  "true_false",
  "categorize",
  "file_upload",
];

export default function ContentLibraryPage() {
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
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <Breadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: "Content Library" }]} />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/30">
            <Library className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Content Library</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {total} exercise{total !== 1 ? "s" : ""} total
            </p>
          </div>
        </div>
      </div>

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

          {/* Type tabs */}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => { setActiveType("all"); setPage(1); }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                activeType === "all"
                  ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10"
              }`}
            >
              All
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3 dark:border-white/10">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Page {page} of {totalPages} ({total} total)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

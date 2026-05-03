"use client";

import { useEffect, useState } from "react";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Route, Plus, Trash2, Eye, EyeOff, GripVertical } from "lucide-react";

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
      toast.error("Add at least one course to the path");
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
      toast.success("Learning path created");
      fetchPaths();
    } catch {
      toast.error("Failed to create path");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePublish = async (path: PathItem) => {
    try {
      await apiClient.put(`/learning-paths/${path.id}`, {
        is_published: !path.is_published,
      });
      toast.success(path.is_published ? "Unpublished" : "Published");
      fetchPaths();
    } catch {
      toast.error("Failed to update path");
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm({ message: "Delete this learning path?", variant: "danger", confirmLabel: "Delete" }))) return;
    try {
      await apiClient.delete(`/learning-paths/${id}`);
      toast.success("Path deleted");
      fetchPaths();
    } catch {
      toast.error("Failed to delete path");
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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 dark:text-ink-100">Learning Paths</h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
            Create structured course sequences for students
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" />
          New Path
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create Learning Path</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <input
                type="text"
                placeholder="Path Title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 focus:border-green-500 focus:outline-none dark:border-white/10 dark:bg-[#2C2C2C] dark:text-ink-100"
                required
                autoFocus
              />
              <textarea
                placeholder="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 focus:border-green-500 focus:outline-none dark:border-white/10 dark:bg-[#2C2C2C] dark:text-ink-100"
                rows={2}
              />
              {/* Course selector */}
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-700 dark:text-ink-400">
                  Add courses (in order)
                </label>
                <select
                  onChange={(e) => {
                    if (e.target.value) addCourse(e.target.value);
                    e.target.value = "";
                  }}
                  className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 focus:border-green-500 focus:outline-none dark:border-white/10 dark:bg-[#2C2C2C] dark:text-ink-100"
                >
                  <option value="">Select a course to add...</option>
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
                        className="flex items-center gap-3 rounded-lg border border-ink-200 p-3 dark:border-white/10"
                      >
                        <GripVertical className="h-4 w-4 text-ink-300 dark:text-ink-700" />
                        <span className="text-xs font-bold text-ink-400">{idx + 1}</span>
                        <span className="flex-1 text-sm text-ink-900 dark:text-ink-100">
                          {course?.title || "Unknown"}
                        </span>
                        <label className="flex items-center gap-1 text-xs text-ink-500 dark:text-ink-400">
                          <input
                            type="checkbox"
                            checked={s.is_required}
                            onChange={() => toggleRequired(s.course_id)}
                            className="rounded border-ink-300 text-green-600 focus:ring-green-500"
                          />
                          Required
                        </label>
                        <button
                          type="button"
                          onClick={() => removeCourse(s.course_id)}
                          className="rounded p-1 text-ink-400 hover:bg-coral-50 hover:text-coral-500 dark:hover:bg-coral-500/10"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating..." : "Create Path"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {paths.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <div className="mb-4 rounded-full bg-ink-100 p-4 dark:bg-white/10">
              <Route className="h-8 w-8 text-ink-400 dark:text-ink-500" />
            </div>
            <h3 className="mb-1 text-lg font-semibold text-ink-700 dark:text-ink-300">
              No learning paths yet
            </h3>
            <p className="text-base text-ink-500 dark:text-ink-400">
              Create a structured course sequence for your students.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {paths.map((p) => (
            <Card key={p.id} className="border-l-4 border-l-green-400 transition-shadow hover:shadow-md">
              <CardContent className="flex items-center gap-4">
                <div className="hidden shrink-0 sm:block">
                  <div className="rounded-xl bg-green-100 p-3 dark:bg-green-500/20">
                    <Route className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold text-ink-900 dark:text-ink-100">
                    {p.title}
                  </h3>
                  <div className="mt-1 flex items-center gap-3 text-xs text-ink-500 dark:text-ink-400">
                    <span>{p.step_count} courses</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      p.is_published
                        ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400"
                        : "bg-ink-100 text-ink-500 dark:bg-white/10 dark:text-ink-400"
                    }`}>
                      {p.is_published ? "Published" : "Draft"}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleTogglePublish(p)}
                  title={p.is_published ? "Unpublish" : "Publish"}
                >
                  {p.is_published ? (
                    <EyeOff className="h-4 w-4 text-ink-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-green-500" />
                  )}
                </Button>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-coral-50 hover:text-coral-500 dark:hover:bg-coral-500/10"
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

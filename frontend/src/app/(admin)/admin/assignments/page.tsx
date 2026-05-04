"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardList, Plus, Trash2, Clock, Users, ArrowRight } from "lucide-react";

interface AdminAssignment {
  id: string;
  course_id: string;
  title: string;
  due_date: string;
  max_score: number;
  allow_late: boolean;
  created_at: string;
  course_title: string | null;
  submission_count?: number;
}

interface CourseOption {
  id: string;
  title: string;
}

interface GroupOption {
  id: string;
  name: string;
}

export default function AdminAssignmentsPage() {
  const confirm = useConfirm();
  const [assignments, setAssignments] = useState<AdminAssignment[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    course_id: "",
    group_id: "",
    due_date: "",
    max_score: 100,
    allow_late: false,
  });

  const fetchAssignments = () => {
    apiClient
      .get("/assignments")
      .then(({ data }) => setAssignments(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAssignments();
    apiClient.get("/admin/courses").then(({ data }) => setCourses(data)).catch(() => {});
    apiClient.get("/admin/groups").then(({ data }) => setGroups(data)).catch(() => {});
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.post("/assignments", {
        title: form.title,
        description: form.description,
        course_id: form.course_id,
        group_id: form.group_id || null,
        due_date: new Date(form.due_date).toISOString(),
        max_score: form.max_score,
        allow_late: form.allow_late,
      });
      setForm({ title: "", description: "", course_id: "", group_id: "", due_date: "", max_score: 100, allow_late: false });
      setShowForm(false);
      toast.success("Assignment created");
      fetchAssignments();
    } catch {
      toast.error("Failed to create assignment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm({ message: "Delete this assignment?", variant: "danger", confirmLabel: "Delete" }))) return;
    try {
      await apiClient.delete(`/assignments/${id}`);
      toast.success("Assignment deleted");
      fetchAssignments();
    } catch {
      toast.error("Failed to delete assignment");
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
      </div>
    );
  }

  const isPast = (d: string) => new Date(d).getTime() < Date.now();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 dark:text-ink-100">Assignments</h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
            Create and manage homework assignments
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" />
          New Assignment
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create Assignment</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <input
                type="text"
                placeholder="Assignment Title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 focus:border-green-500 focus:outline-none dark:border-white/10 dark:bg-[#2C2C2C] dark:text-ink-100"
                required
                autoFocus
              />
              <textarea
                placeholder="Description (instructions for students)"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 focus:border-green-500 focus:outline-none dark:border-white/10 dark:bg-[#2C2C2C] dark:text-ink-100"
                rows={3}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink-700 dark:text-ink-400">Course *</label>
                  <select
                    value={form.course_id}
                    onChange={(e) => setForm({ ...form, course_id: e.target.value })}
                    className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 focus:border-green-500 focus:outline-none dark:border-white/10 dark:bg-[#2C2C2C] dark:text-ink-100"
                    required
                  >
                    <option value="">Select course...</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink-700 dark:text-ink-400">Group (optional)</label>
                  <select
                    value={form.group_id}
                    onChange={(e) => setForm({ ...form, group_id: e.target.value })}
                    className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 focus:border-green-500 focus:outline-none dark:border-white/10 dark:bg-[#2C2C2C] dark:text-ink-100"
                  >
                    <option value="">All students</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink-700 dark:text-ink-400">Due Date *</label>
                  <input
                    type="datetime-local"
                    value={form.due_date}
                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                    className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 focus:border-green-500 focus:outline-none dark:border-white/10 dark:bg-[#2C2C2C] dark:text-ink-100"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink-700 dark:text-ink-400">Max Score</label>
                  <input
                    type="number"
                    min={1}
                    value={form.max_score}
                    onChange={(e) => setForm({ ...form, max_score: parseInt(e.target.value) || 100 })}
                    className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 focus:border-green-500 focus:outline-none dark:border-white/10 dark:bg-[#2C2C2C] dark:text-ink-100"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 pb-2 text-sm text-ink-700 dark:text-ink-400">
                    <input
                      type="checkbox"
                      checked={form.allow_late}
                      onChange={(e) => setForm({ ...form, allow_late: e.target.checked })}
                      className="rounded border-ink-300 text-green-600 focus:ring-green-500"
                    />
                    Allow late submissions
                  </label>
                </div>
              </div>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating..." : "Create Assignment"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {assignments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <div className="mb-4 rounded-full bg-ink-100 p-4 dark:bg-white/10">
              <ClipboardList className="h-8 w-8 text-ink-400 dark:text-ink-500" />
            </div>
            <h3 className="mb-1 text-lg font-semibold text-ink-700 dark:text-ink-300">
              No assignments yet
            </h3>
            <p className="text-base text-ink-500 dark:text-ink-400">
              Create your first assignment for students.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {assignments.map((a) => (
            <Card
              key={a.id}
              className={`border-l-4 transition-shadow hover:shadow-md ${
                isPast(a.due_date) ? "border-l-ink-300" : "border-l-green-400"
              }`}
            >
              <CardContent className="flex items-center gap-4">
                <div className="hidden shrink-0 sm:block">
                  <div className={`rounded-xl p-3 ${isPast(a.due_date) ? "bg-ink-100 dark:bg-white/5" : "bg-green-100 dark:bg-green-500/20"}`}>
                    <ClipboardList className={`h-5 w-5 ${isPast(a.due_date) ? "text-ink-400" : "text-green-600 dark:text-green-400"}`} />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold text-ink-900 dark:text-ink-100">
                    {a.title}
                  </h3>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-500 dark:text-ink-400">
                    {a.course_title && <span>{a.course_title}</span>}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Due: {new Date(a.due_date).toLocaleDateString()}
                    </span>
                    <span>Max: {a.max_score} pts</span>
                  </div>
                </div>
                <Link
                  href={`/admin/assignments/${a.id}/review`}
                  className="flex items-center gap-1 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-600 transition-colors hover:bg-green-100 dark:bg-green-500/10 dark:text-green-400 dark:hover:bg-green-500/20"
                >
                  <Users className="h-3 w-3" />
                  Review
                  <ArrowRight className="h-3 w-3" />
                </Link>
                <button
                  onClick={() => handleDelete(a.id)}
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

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

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
        toast.error("Failed to load assignment");
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
      toast.success("Assignment updated");
    } catch {
      toast.error("Failed to save assignment");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="h-6 w-40 animate-pulse rounded bg-slate-200 dark:bg-white/10" />
        <div className="h-8 w-64 animate-pulse rounded bg-slate-200 dark:bg-white/10" />
        <div className="space-y-4 rounded-xl border border-slate-200 p-6 dark:border-white/10">
          <div className="h-10 w-full animate-pulse rounded-lg bg-slate-200 dark:bg-white/10" />
          <div className="h-24 w-full animate-pulse rounded-lg bg-slate-200 dark:bg-white/10" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-10 animate-pulse rounded-lg bg-slate-200 dark:bg-white/10" />
            <div className="h-10 animate-pulse rounded-lg bg-slate-200 dark:bg-white/10" />
          </div>
          <div className="h-10 w-32 animate-pulse rounded-lg bg-slate-200 dark:bg-white/10" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <button
        onClick={() => router.back()}
        className="mb-4 flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Assignments
      </button>

      <h1 className="mb-6 text-2xl font-bold text-slate-900 dark:text-slate-100">
        Edit Assignment
      </h1>

      <form onSubmit={handleSave} className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-[#2C2C2C]">
        {/* Course badge (read-only) */}
        {form.course_title && (
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
              Course
            </label>
            <span className="inline-block rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
              {form.course_title}
            </span>
          </div>
        )}

        {/* Title */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
            Title *
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-white/10 dark:bg-[#2C2C2C] dark:text-slate-100"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
            Description
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={4}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-white/10 dark:bg-[#2C2C2C] dark:text-slate-100"
          />
        </div>

        {/* Due Date + Max Score */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
              Due Date *
            </label>
            <input
              type="datetime-local"
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-white/10 dark:bg-[#2C2C2C] dark:text-slate-100"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
              Max Score
            </label>
            <input
              type="number"
              min={1}
              value={form.max_score}
              onChange={(e) =>
                setForm({ ...form, max_score: parseInt(e.target.value) || 100 })
              }
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-white/10 dark:bg-[#2C2C2C] dark:text-slate-100"
            />
          </div>
        </div>

        {/* Allow Late */}
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <input
            type="checkbox"
            checked={form.allow_late}
            onChange={(e) => setForm({ ...form, allow_late: e.target.checked })}
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          Allow late submissions
        </label>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          <Link
            href={`/admin/assignments/${id}/review`}
            className="flex items-center gap-1 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/20"
          >
            View Submissions &rarr;
          </Link>
        </div>
      </form>
    </div>
  );
}

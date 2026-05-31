"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Send, Users } from "lucide-react";

import apiClient from "@/lib/api-client";
import { useTranslation } from "@/lib/i18n/context";
import { Card, CardContent } from "@/components/ui/card";
import {
  createAssignment,
  distributeAssignment,
  getAssignment,
  listAssignments,
  type PeerReviewAssignmentStats,
} from "@/lib/api/peer-review";

interface CourseOption {
  id: string;
  title: string;
}

export default function AdminPeerReviewPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [courseId, setCourseId] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", min_reviews: 1, deadline: "" });

  useEffect(() => {
    apiClient
      .get<CourseOption[]>("/admin/courses")
      .then(({ data }) => setCourses(data))
      .catch(() => {});
  }, []);

  const assignmentsQuery = useQuery({
    queryKey: ["peer-review", "assignments", courseId],
    queryFn: () => listAssignments(courseId),
    enabled: !!courseId,
  });

  const detailQuery = useQuery({
    queryKey: ["peer-review", "assignment", selectedId],
    queryFn: () => getAssignment(selectedId as string),
    enabled: !!selectedId,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createAssignment({
        course_id: courseId,
        title: form.title.trim(),
        min_reviews: form.min_reviews,
        deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
      }),
    onSuccess: () => {
      toast.success(t("peerReview.assignmentCreated"));
      setShowForm(false);
      setForm({ title: "", min_reviews: 1, deadline: "" });
      qc.invalidateQueries({ queryKey: ["peer-review", "assignments", courseId] });
    },
    onError: () => toast.error(t("peerReview.createFailed")),
  });

  const distributeMutation = useMutation({
    mutationFn: (assignmentId: string) => distributeAssignment(assignmentId),
    onSuccess: (res) => {
      toast.success(`${t("peerReview.distributed")} (${res.created})`);
      qc.invalidateQueries({ queryKey: ["peer-review", "assignments", courseId] });
      qc.invalidateQueries({ queryKey: ["peer-review", "assignment"] });
    },
    onError: () => toast.error(t("peerReview.distributeFailed")),
  });

  const assignments = assignmentsQuery.data ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">{t("peerReview.adminTitle")}</h1>
          <p className="text-base text-text-muted">{t("peerReview.adminSubtitle")}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={courseId}
          onChange={(e) => {
            setCourseId(e.target.value);
            setSelectedId(null);
          }}
          className="rounded-lg border border-border-strong px-3 py-2 text-sm"
        >
          <option value="">{t("peerReview.selectCourse")}</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
        {courseId && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
          >
            <Plus className="h-4 w-4" /> {t("peerReview.newAssignment")}
          </button>
        )}
      </div>

      {showForm && courseId && (
        <Card>
          <CardContent className="p-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate();
              }}
              className="space-y-3"
            >
              <input
                placeholder={t("peerReview.titlePlaceholder")}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                className="w-full rounded-lg border border-border-strong px-3 py-2 text-sm"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs text-text-muted">
                  {t("peerReview.minReviews")}
                  <input
                    type="number"
                    min={1}
                    value={form.min_reviews}
                    onChange={(e) =>
                      setForm({ ...form, min_reviews: parseInt(e.target.value) || 1 })
                    }
                    className="rounded-lg border border-border-strong px-3 py-2 text-sm"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-text-muted">
                  {t("peerReview.deadline")}
                  <input
                    type="datetime-local"
                    value={form.deadline}
                    onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                    className="rounded-lg border border-border-strong px-3 py-2 text-sm"
                  />
                </label>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
                >
                  {createMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {t("peerReview.create")}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {courseId && (
        <div className="space-y-3">
          {assignmentsQuery.isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : assignments.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-text-subtle">
                {t("peerReview.noAssignments")}
              </CardContent>
            </Card>
          ) : (
            assignments.map((a: PeerReviewAssignmentStats) => (
              <Card key={a.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <h3 className="text-sm font-semibold text-ink-700">{a.title}</h3>
                    <p className="mt-1 text-xs text-text-muted">
                      {t("peerReview.minReviews")}: {a.min_reviews} &middot;{" "}
                      {t("peerReview.completed")}: {a.completed_reviews}/{a.total_reviews}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setSelectedId(selectedId === a.id ? null : a.id)
                      }
                      className="flex items-center gap-1.5 rounded-lg bg-ink-100 px-3 py-1.5 text-sm font-medium text-text-muted hover:bg-ink-200"
                    >
                      <Users className="h-3.5 w-3.5" /> {t("peerReview.viewProgress")}
                    </button>
                    <button
                      onClick={() => distributeMutation.mutate(a.id)}
                      disabled={distributeMutation.isPending}
                      className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
                    >
                      <Send className="h-3.5 w-3.5" /> {t("peerReview.distribute")}
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {selectedId && detailQuery.data && (
        <Card>
          <CardContent className="p-4">
            <h3 className="mb-3 text-sm font-semibold text-ink-700">
              {t("peerReview.progressTitle")}
            </h3>
            {detailQuery.data.reviews.length === 0 ? (
              <p className="text-sm text-text-subtle">{t("peerReview.notDistributed")}</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs text-text-subtle">
                    <th className="py-1 pr-3">{t("peerReview.reviewer")}</th>
                    <th className="py-1 pr-3">{t("peerReview.reviewee")}</th>
                    <th className="py-1 pr-3">{t("peerReview.status")}</th>
                    <th className="py-1">{t("peerReview.rating")}</th>
                  </tr>
                </thead>
                <tbody>
                  {detailQuery.data.reviews.map((r) => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="py-1.5 pr-3 text-text">{r.reviewer_name}</td>
                      <td className="py-1.5 pr-3 text-text">{r.reviewee_name}</td>
                      <td className="py-1.5 pr-3 text-text-muted">
                        {t(`peerReview.statusValue.${r.status}`)}
                      </td>
                      <td className="py-1.5 text-text-muted">{r.rating ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

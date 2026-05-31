"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Users } from "lucide-react";

import apiClient from "@/lib/api-client";
import { useTranslation } from "@/lib/i18n/context";
import { Card, CardContent } from "@/components/ui/card";
import {
  createProject,
  deleteProject,
  listMembers,
  listProjects,
  listSubmissions,
  removeMember,
  type TeamProject,
} from "@/lib/api/team-projects";

interface CourseOption {
  id: string;
  title: string;
}

export default function AdminTeamProjectsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    course_id: "",
    deadline: "",
    max_team_size: 4,
  });

  useEffect(() => {
    apiClient
      .get<CourseOption[]>("/admin/courses")
      .then(({ data }) => setCourses(data))
      .catch(() => {});
  }, []);

  const projectsQuery = useQuery({
    queryKey: ["team-projects", "list"],
    queryFn: listProjects,
  });

  const membersQuery = useQuery({
    queryKey: ["team-projects", "members", selectedId],
    queryFn: () => listMembers(selectedId as string),
    enabled: !!selectedId,
  });

  const submissionsQuery = useQuery({
    queryKey: ["team-projects", "submissions", selectedId],
    queryFn: () => listSubmissions(selectedId as string),
    enabled: !!selectedId,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createProject({
        title: form.title.trim(),
        description: form.description.trim(),
        course_id: form.course_id || null,
        deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
        max_team_size: form.max_team_size,
      }),
    onSuccess: () => {
      toast.success(t("teamProjects.created"));
      setShowForm(false);
      setForm({ title: "", description: "", course_id: "", deadline: "", max_team_size: 4 });
      qc.invalidateQueries({ queryKey: ["team-projects", "list"] });
    },
    onError: () => toast.error(t("teamProjects.createFailed")),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProject(id),
    onSuccess: (_d, id) => {
      toast.success(t("teamProjects.deleted"));
      if (selectedId === id) setSelectedId(null);
      qc.invalidateQueries({ queryKey: ["team-projects", "list"] });
    },
    onError: () => toast.error(t("teamProjects.deleteFailed")),
  });

  const removeMemberMutation = useMutation({
    mutationFn: ({ projectId, userId }: { projectId: string; userId: string }) =>
      removeMember(projectId, userId),
    onSuccess: () => {
      toast.success(t("teamProjects.memberRemoved"));
      qc.invalidateQueries({ queryKey: ["team-projects", "members", selectedId] });
      qc.invalidateQueries({ queryKey: ["team-projects", "list"] });
    },
    onError: () => toast.error(t("teamProjects.removeFailed")),
  });

  const projects = projectsQuery.data ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">{t("teamProjects.adminTitle")}</h1>
          <p className="text-base text-text-muted">{t("teamProjects.adminSubtitle")}</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" /> {t("teamProjects.newProject")}
        </button>
      </div>

      {showForm && (
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
                placeholder={t("teamProjects.titlePlaceholder")}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                className="w-full rounded-lg border border-border-strong px-3 py-2 text-sm"
              />
              <textarea
                placeholder={t("teamProjects.descriptionPlaceholder")}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="w-full rounded-lg border border-border-strong px-3 py-2 text-sm"
              />
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="flex flex-col gap-1 text-xs text-text-muted">
                  {t("teamProjects.course")}
                  <select
                    value={form.course_id}
                    onChange={(e) => setForm({ ...form, course_id: e.target.value })}
                    className="rounded-lg border border-border-strong px-3 py-2 text-sm"
                  >
                    <option value="">{t("teamProjects.noCourse")}</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs text-text-muted">
                  {t("teamProjects.maxTeamSize")}
                  <input
                    type="number"
                    min={1}
                    value={form.max_team_size}
                    onChange={(e) =>
                      setForm({ ...form, max_team_size: parseInt(e.target.value) || 1 })
                    }
                    className="rounded-lg border border-border-strong px-3 py-2 text-sm"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-text-muted">
                  {t("teamProjects.deadline")}
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
                  {t("teamProjects.create")}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {projectsQuery.isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : projects.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-text-subtle">
              {t("teamProjects.noProjects")}
            </CardContent>
          </Card>
        ) : (
          projects.map((p: TeamProject) => (
            <Card key={p.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <h3 className="text-sm font-semibold text-ink-700">{p.title}</h3>
                  <p className="mt-1 text-xs text-text-muted">
                    {t("teamProjects.members")}: {p.member_count}/{p.max_team_size}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedId(selectedId === p.id ? null : p.id)}
                    className="flex items-center gap-1.5 rounded-lg bg-ink-100 px-3 py-1.5 text-sm font-medium text-text-muted hover:bg-ink-200"
                  >
                    <Users className="h-3.5 w-3.5" /> {t("teamProjects.viewTeam")}
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(p.id)}
                    disabled={deleteMutation.isPending}
                    className="flex items-center gap-1.5 rounded-lg bg-danger-soft px-3 py-1.5 text-sm font-medium text-danger-fg hover:bg-danger/20 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> {t("teamProjects.delete")}
                  </button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {selectedId && (
        <Card>
          <CardContent className="space-y-4 p-4">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-ink-700">
                {t("teamProjects.teamMembers")}
              </h3>
              {membersQuery.isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (membersQuery.data ?? []).length === 0 ? (
                <p className="text-sm text-text-subtle">{t("teamProjects.noMembers")}</p>
              ) : (
                <ul className="space-y-1.5">
                  {(membersQuery.data ?? []).map((m) => (
                    <li
                      key={m.user_id}
                      className="flex items-center justify-between text-sm text-text"
                    >
                      <span>{m.user_name}</span>
                      <button
                        onClick={() =>
                          removeMemberMutation.mutate({
                            projectId: selectedId,
                            userId: m.user_id,
                          })
                        }
                        className="text-xs font-medium text-danger-fg hover:underline"
                      >
                        {t("teamProjects.remove")}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-ink-700">
                {t("teamProjects.submissions")}
              </h3>
              {submissionsQuery.isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (submissionsQuery.data ?? []).length === 0 ? (
                <p className="text-sm text-text-subtle">{t("teamProjects.noSubmissions")}</p>
              ) : (
                <ul className="space-y-2">
                  {(submissionsQuery.data ?? []).map((s) => (
                    <li key={s.id} className="rounded-lg border border-border p-3 text-sm">
                      <p className="text-xs text-text-muted">
                        {s.submitter_name ?? t("teamProjects.unknownSubmitter")}
                      </p>
                      <p className="mt-1 break-words text-text">
                        {s.content.url ?? s.content.text ?? JSON.stringify(s.content)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

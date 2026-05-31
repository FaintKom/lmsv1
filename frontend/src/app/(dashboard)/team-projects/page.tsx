"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, LogIn, LogOut, Send, Users } from "lucide-react";

import { useTranslation } from "@/lib/i18n/context";
import { Card, CardContent } from "@/components/ui/card";
import {
  joinProject,
  leaveProject,
  listMembers,
  listProjects,
  listSubmissions,
  submitWork,
  type TeamProject,
} from "@/lib/api/team-projects";

function TeamPanel({ projectId }: { projectId: string }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [text, setText] = useState("");

  const membersQuery = useQuery({
    queryKey: ["team-projects", "members", projectId],
    queryFn: () => listMembers(projectId),
  });

  const submissionsQuery = useQuery({
    queryKey: ["team-projects", "submissions", projectId],
    queryFn: () => listSubmissions(projectId),
  });

  const submitMutation = useMutation({
    mutationFn: () => submitWork(projectId, { text: text.trim() }),
    onSuccess: () => {
      toast.success(t("teamProjects.submitted"));
      setText("");
      qc.invalidateQueries({ queryKey: ["team-projects", "submissions", projectId] });
    },
    onError: () => toast.error(t("teamProjects.submitFailed")),
  });

  return (
    <div className="mt-3 space-y-4 border-t border-border pt-3">
      <div>
        <h4 className="mb-2 text-xs font-semibold text-text-muted">
          {t("teamProjects.teamMembers")}
        </h4>
        {membersQuery.isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        ) : (
          <ul className="flex flex-wrap gap-2">
            {(membersQuery.data ?? []).map((m) => (
              <li
                key={m.user_id}
                className="rounded-pill bg-ink-100 px-2.5 py-0.5 text-xs text-text-muted"
              >
                {m.user_name}
              </li>
            ))}
          </ul>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) {
            toast.error(t("teamProjects.contentRequired"));
            return;
          }
          submitMutation.mutate();
        }}
        className="space-y-2"
      >
        <textarea
          placeholder={t("teamProjects.submitPlaceholder")}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-border-strong px-3 py-2 text-sm"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitMutation.isPending}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
          >
            {submitMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {t("teamProjects.submitWork")}
          </button>
        </div>
      </form>

      <div>
        <h4 className="mb-2 text-xs font-semibold text-text-muted">
          {t("teamProjects.submissions")}
        </h4>
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
    </div>
  );
}

export default function StudentTeamProjectsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["team-projects", "list"],
    queryFn: listProjects,
  });

  const joinMutation = useMutation({
    mutationFn: (id: string) => joinProject(id),
    onSuccess: () => {
      toast.success(t("teamProjects.joined"));
      qc.invalidateQueries({ queryKey: ["team-projects", "list"] });
    },
    onError: () => toast.error(t("teamProjects.joinFailed")),
  });

  const leaveMutation = useMutation({
    mutationFn: (id: string) => leaveProject(id),
    onSuccess: (_d, id) => {
      toast.success(t("teamProjects.left"));
      if (openId === id) setOpenId(null);
      qc.invalidateQueries({ queryKey: ["team-projects", "list"] });
    },
    onError: () => toast.error(t("teamProjects.leaveFailed")),
  });

  const projects = data ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-text">{t("teamProjects.studentTitle")}</h1>
        <p className="text-base text-text-muted">{t("teamProjects.studentSubtitle")}</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-text-subtle">
            {t("teamProjects.noProjectsStudent")}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {projects.map((p: TeamProject) => {
            const full = p.member_count >= p.max_team_size;
            return (
              <Card key={p.id}>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-ink-700">{p.title}</h3>
                      {p.description && (
                        <p className="mt-1 text-xs text-text-muted">{p.description}</p>
                      )}
                      <p className="mt-1 text-xs text-text-muted">
                        {t("teamProjects.members")}: {p.member_count}/{p.max_team_size}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {p.is_member ? (
                        <>
                          <button
                            onClick={() => setOpenId(openId === p.id ? null : p.id)}
                            className="flex items-center gap-1.5 rounded-lg bg-ink-100 px-3 py-1.5 text-sm font-medium text-text-muted hover:bg-ink-200"
                          >
                            <Users className="h-3.5 w-3.5" /> {t("teamProjects.viewTeam")}
                          </button>
                          <button
                            onClick={() => leaveMutation.mutate(p.id)}
                            disabled={leaveMutation.isPending}
                            className="flex items-center gap-1.5 rounded-lg bg-danger-soft px-3 py-1.5 text-sm font-medium text-danger-fg hover:bg-danger/20 disabled:opacity-50"
                          >
                            <LogOut className="h-3.5 w-3.5" /> {t("teamProjects.leave")}
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => joinMutation.mutate(p.id)}
                          disabled={full || joinMutation.isPending}
                          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
                        >
                          <LogIn className="h-3.5 w-3.5" />
                          {full ? t("teamProjects.full") : t("teamProjects.join")}
                        </button>
                      )}
                    </div>
                  </div>
                  {p.is_member && openId === p.id && <TeamPanel projectId={p.id} />}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

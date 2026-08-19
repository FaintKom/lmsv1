"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Film, Play, Trash2, X } from "lucide-react";

import apiClient from "@/lib/api-client";
import { useTranslation } from "@/lib/i18n/context";
import { useAuthStore } from "@/stores/auth-store";

/**
 * The school's lesson recordings, findable after the toast is gone (FR-038).
 *
 * Until this page existed, the honest answer to "how do I watch a recording?"
 * was "from a toast that died fifteen seconds after you pressed stop". A file
 * reachable only by remembering its link is not stored, it is mislaid.
 */

interface RecordingRow {
  id: string;
  download_url: string | null;
  duration_seconds: number | null;
  size_bytes: number | null;
  status: string;
  created_at: string | null;
  shared_with_group: boolean;
}

function fmtLength(s: number | null): string {
  if (!s) return "—";
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function fmtSize(b: number | null): string {
  if (!b) return "—";
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export default function RecordingsPage() {
  const { t, locale } = useTranslation();
  const qc = useQueryClient();
  const [watching, setWatching] = useState<RecordingRow | null>(null);
  const role = useAuthStore((s) => s.user?.role);
  // Teachers share; administrators dispose (FR-040). The server refuses
  // regardless — this only decides whether to show the button.
  const canDelete = role === "admin" || role === "super_admin";

  const { data: rows, isLoading } = useQuery({
    queryKey: ["recordings"],
    queryFn: () => apiClient.get("/recordings").then((r) => r.data as RecordingRow[]),
  });

  const share = useMutation({
    mutationFn: (r: RecordingRow) =>
      apiClient.patch(`/recordings/${r.id}`, { shared_with_group: !r.shared_with_group }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["recordings"] }),
  });

  const destroy = useMutation({
    mutationFn: (r: RecordingRow) => apiClient.delete(`/recordings/${r.id}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["recordings"] }),
  });

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-1 text-2xl font-extrabold text-text">{t("recordings.title")}</h1>
      <p className="mb-6 text-sm text-text-muted">{t("recordings.subtitle")}</p>

      {isLoading && <p className="text-sm text-text-muted">…</p>}

      {rows && rows.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-md border border-border bg-surface p-10 text-center">
          <Film className="h-6 w-6 text-text-muted" aria-hidden />
          <p className="text-sm font-bold text-text">{t("recordings.empty")}</p>
          <p className="max-w-sm text-xs text-text-muted">{t("recordings.emptyHint")}</p>
        </div>
      )}

      {rows && rows.length > 0 && (
        <div className="overflow-hidden rounded-md border border-border">
          {rows.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3 last:border-b-0"
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-text">
                  {r.created_at
                    ? new Date(r.created_at).toLocaleString(locale, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                    : "—"}
                </div>
                <div className="font-mono text-2xs text-text-muted">
                  {fmtLength(r.duration_seconds)} · {fmtSize(r.size_bytes)}
                  {r.status !== "ready" && ` · ${r.status}`}
                </div>
              </div>

              <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs font-semibold text-text">
                <input
                  type="checkbox"
                  checked={r.shared_with_group}
                  disabled={share.isPending}
                  onChange={() => share.mutate(r)}
                  className="h-4 w-4 accent-[var(--primary)]"
                />
                {t("recordings.shared")}
              </label>

              <button
                onClick={() => setWatching(r)}
                disabled={!r.download_url}
                className="btn-pop inline-flex shrink-0 items-center gap-1.5 rounded-sm bg-primary px-3 py-1.5 text-xs font-bold text-primary-fg disabled:opacity-40"
              >
                <Play size={13} aria-hidden />
                {t("recordings.watch")}
              </button>
              {canDelete && (
                <button
                  onClick={() => {
                    if (window.confirm(t("recordings.deleteConfirm"))) destroy.mutate(r);
                  }}
                  disabled={destroy.isPending}
                  aria-label={t("recordings.delete")}
                  className="btn-pop flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-border bg-surface text-clay-700 hover:bg-danger-soft disabled:opacity-40"
                >
                  <Trash2 size={14} aria-hidden />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {watching?.download_url && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/60 p-4"
          onClick={() => setWatching(null)}
        >
          <div
            className="w-full max-w-3xl overflow-hidden rounded-lg bg-surface shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-2">
              <span className="text-sm font-bold text-text">
                {watching.created_at
                  ? new Date(watching.created_at).toLocaleString(locale, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })
                  : t("recordings.title")}
              </span>
              <button
                onClick={() => setWatching(null)}
                aria-label={t("common.close")}
                className="flex h-9 w-9 items-center justify-center rounded-md text-text-muted hover:bg-surface-2"
              >
                <X size={16} />
              </button>
            </div>
            {/* The browser player does the work: the server streams the file
                and range requests make seeking cheap. */}
            <video
              controls
              autoPlay
              className="max-h-[70dvh] w-full bg-black"
              src={watching.download_url}
            />
          </div>
        </div>
      )}
    </div>
  );
}

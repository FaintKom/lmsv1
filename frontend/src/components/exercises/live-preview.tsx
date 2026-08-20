"use client";

import { Component, useEffect, useState, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";

import { useTranslation } from "@/lib/i18n/context";
import { ExercisePreview } from "./exercise-view";
import { livePreviewState, type RelatedCounts } from "./live-preview-state";

/**
 * The student's widget, beside the form that is still being filled in.
 *
 * Until now the only way to see what an exercise would become was to switch
 * the whole lesson into preview mode — which takes the form off the screen,
 * so a setting and its result were never visible together. Four types had
 * grown their own hand-written stand-ins (a line of text naming what would be
 * marked correct, a grid); the other fourteen had nothing at all.
 *
 * This draws the real thing, from the same state the form edits, so it
 * changes as the teacher types. One component for every type — the
 * alternative was twenty-six more stand-ins, which is the sprawl specs/024
 * spent a day removing.
 */

/** How long to wait after the last keystroke before rebuilding the widget. */
const SETTLE_MS = 300;

interface LivePreviewProps {
  exerciseType: string;
  config: Record<string, unknown> | undefined;
  title?: string;
  questions?: unknown[];
  testCases?: unknown[];
}

export function LivePreview({
  exerciseType,
  config,
  title,
  questions,
  testCases,
}: LivePreviewProps) {
  const { t } = useTranslation();
  const settled = useSettled(config);
  const related: RelatedCounts = {
    ...(questions ? { questions: questions.length } : {}),
    ...(testCases ? { testCases: testCases.length } : {}),
  };
  const state = livePreviewState(exerciseType, settled, related);

  // Heavy widgets bring a 3D scene or Monaco with them. Mounting one behind
  // every form that happens to be open costs more than it tells the teacher,
  // so those start folded and open on request.
  const [open, setOpen] = useState(state.kind === "widget" ? !state.heavy : true);

  return (
    <section className="mt-4 rounded-lg border border-border-strong bg-surface-2/40 p-3">
      <header className="mb-2 flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-text-subtle">
          {t("admin.livePreview.title")}
        </h4>
        {state.kind === "widget" && state.heavy && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded border border-border-strong px-2 py-1 text-xs text-text-muted hover:text-text"
          >
            {open ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            {open ? t("admin.livePreview.hide") : t("admin.livePreview.show")}
          </button>
        )}
      </header>

      {state.kind === "empty" && (
        <p className="text-sm text-text-muted">{t("admin.livePreview.empty")}</p>
      )}

      {state.kind === "missing" && (
        <p className="text-sm text-text-muted">
          {t("admin.livePreview.missing").replace("{field}", state.field)}
        </p>
      )}

      {state.kind === "widget" && open && (
        <PreviewBoundary fallback={t("admin.livePreview.crashed")}>
          {/* Kept from the panel this replaced: the preview marks like the
            real thing, and a teacher trying it needs to know that nothing
            they do here is recorded. */}
          <p className="mb-3 rounded-lg bg-surface-2 px-3 py-2 text-xs text-text-muted">
            {t("admin.exercisePreview.banner")} {t("admin.exercisePreview.verdictsFollowSave")}
          </p>
          <ExercisePreview
            exercise={
              {
                exercise_type: exerciseType,
                config: settled,
                title,
                questions,
                test_cases: testCases,
              } as never
            }
          />
        </PreviewBoundary>
      )}
    </section>
  );
}

/** The config, a beat after the teacher stopped typing. */
function useSettled(config: Record<string, unknown> | undefined) {
  const [settled, setSettled] = useState(config);
  const serialised = JSON.stringify(config ?? null);

  useEffect(() => {
    const id = setTimeout(() => setSettled(config), SETTLE_MS);
    return () => clearTimeout(id);
    // Compared by value: the form hands back a fresh object on every
    // keystroke, so comparing by identity would never settle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialised]);

  return settled;
}

/**
 * A widget that throws must not take the form down with it.
 *
 * These widgets have never been handed a half-written config before — in the
 * lesson's preview mode they only ever saw something saved and complete. A
 * teacher mid-sentence should lose the preview, not the fields.
 */
class PreviewBoundary extends Component<
  { fallback: string; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return <p className="text-sm text-warning-fg">{this.props.fallback}</p>;
    }
    return this.props.children;
  }
}

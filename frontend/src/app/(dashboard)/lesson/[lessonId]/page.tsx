"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { LessonReview } from "@/components/live/lesson-review";
import { PollModal } from "@/components/live/poll-modal";
import { SceneView } from "@/components/live/scene-view";
import { SignalBar } from "@/components/live/signal-bar";
import type { BoardViewHandle } from "@/components/live/board-view";
import {
  sendHeartbeat,
  useLessonState,
  type Poll,
  type PollResult,
  type Scene,
} from "@/lib/api/live";
import { useLessonChannel } from "@/hooks/use-lesson-channel";
import { useTranslation } from "@/lib/i18n/context";

export default function StudentLessonPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const qc = useQueryClient();
  const params = useParams<{ lessonId: string }>();
  const lessonId = params.lessonId;

  const { data: state, isLoading } = useLessonState(lessonId);
  const [scene, setScene] = useState<Scene | null>(null);
  const [poll, setPoll] = useState<Poll | null>(null);
  const [pollResult, setPollResult] = useState<PollResult | null>(null);
  const [ended, setEnded] = useState(false);
  const [connected, setConnected] = useState(true);
  const boardHandleRef = useRef<BoardViewHandle | null>(null);
  const prevSceneType = useRef<string | null>(null);

  // seed local scene/poll from the authoritative GET
  useEffect(() => {
    if (state) {
      setScene(state.lesson.current_scene);
      setPoll(state.active_poll);
      if (state.lesson.status === "ended") setEnded(true);
    }
  }, [state]);

  useLessonChannel(ended ? null : lessonId, {
    onSceneChanged: (s) => {
      setScene(s);
      // announce the switch so the screen doesn't just "jump"
      if (prevSceneType.current !== s.type && s.type !== "blank") {
        toast(`${t("live.nowShowing")}: ${t(`live.scene.${s.type}` as never)}`, {
          duration: 2500,
        });
      }
      prevSceneType.current = s.type;
    },
    onConnectionChange: setConnected,
    onBoardDelta: (d) => boardHandleRef.current?.applyRemoteDelta(d as never),
    onPollStarted: (p) => {
      setPollResult(null);
      setPoll(p);
    },
    onPollClosed: (r) => {
      setPoll(null);
      setPollResult(r);
    },
    onMessage: (m) => toast(t("live.hint.received"), { description: m.text, duration: 15000 }),
    onLessonEnded: () => {
      setEnded(true);
      // refetch so the review branch sees the final summary/boards, not
      // the state cached at join time
      void qc.invalidateQueries({ queryKey: ["live", lessonId, "state"] });
    },
  });

  // heartbeat every 5s while mounted
  useEffect(() => {
    if (ended) return;
    const beat = () => {
      const exerciseId =
        scene?.type === "task" ? (scene.payload.exercise_id as string) : undefined;
      void sendHeartbeat(lessonId, scene?.type ?? "scene", exerciseId);
    };
    beat();
    const iv = setInterval(beat, 5000);
    return () => clearInterval(iv);
  }, [lessonId, scene, ended]);

  if (isLoading || !state) return null;

  if (ended) {
    if (state.board_ids.length > 0 || state.lesson.summary) {
      return <LessonReview lesson={state.lesson} boardIds={state.board_ids} />;
    }
    return (
      <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-5">
        <div className="text-xl font-extrabold text-text">{t("live.endedTitle")}</div>
        <button
          className="btn-pop rounded-md bg-primary px-5 py-2.5 text-sm font-bold text-white"
          onClick={() => router.push("/dashboard")}
        >
          {t("live.toDashboard")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {!connected && (
        <div className="fixed left-1/2 top-3 z-50 flex -translate-x-1/2 items-center gap-2 rounded-pill bg-coral-500 px-3.5 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wide text-white shadow-md">
          <span className="h-2 w-2 animate-pulse rounded-pill bg-white" />
          {t("live.reconnecting")}
        </div>
      )}
      <div className="min-h-0 flex-1">
        {scene && (
          <SceneView lessonId={lessonId} scene={scene} boardHandleRef={boardHandleRef} interactive />
        )}
      </div>
      <SignalBar lessonId={lessonId} initial={state.my_signal} />
      {poll && <PollModal lessonId={lessonId} poll={poll} onDone={() => setPoll(null)} />}
      {pollResult && (
        <div className="fixed bottom-20 left-1/2 z-40 min-w-64 -translate-x-1/2 rounded-lg border border-border bg-paper-2 p-4 shadow-md">
          <button
            onClick={() => setPollResult(null)}
            aria-label={t("common.close")}
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-2"
          >
            ✕
          </button>
          <div className="mb-2 pr-7 text-sm font-bold text-text">
            {t("live.poll.results")}: {pollResult.question}
          </div>
          {pollResult.options.map((opt, i) => (
            <div key={i} className="flex items-baseline justify-between gap-4 py-0.5 text-sm">
              <span className="font-semibold text-text">{opt}</span>
              <span className="font-mono text-[11px] font-bold tabular-nums text-green-700">
                {pollResult.counts[i]}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

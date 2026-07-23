"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

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
  const params = useParams<{ lessonId: string }>();
  const lessonId = params.lessonId;

  const { data: state, isLoading } = useLessonState(lessonId);
  const [scene, setScene] = useState<Scene | null>(null);
  const [poll, setPoll] = useState<Poll | null>(null);
  const [pollResult, setPollResult] = useState<PollResult | null>(null);
  const [ended, setEnded] = useState(false);
  const boardHandleRef = useRef<BoardViewHandle | null>(null);

  // seed local scene/poll from the authoritative GET
  useEffect(() => {
    if (state) {
      setScene(state.lesson.current_scene);
      setPoll(state.active_poll);
      if (state.lesson.status === "ended") setEnded(true);
    }
  }, [state]);

  useLessonChannel(ended ? null : lessonId, {
    onSceneChanged: (s) => setScene(s),
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
    onLessonEnded: () => setEnded(true),
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
    return (
      <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4">
        <div className="text-2xl font-semibold">{t("live.endedTitle")}</div>
        <button
          className="rounded-lg bg-primary px-4 py-2 text-white"
          onClick={() => router.push("/dashboard")}
        >
          {t("live.toDashboard")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="min-h-0 flex-1">
        {scene && (
          <SceneView lessonId={lessonId} scene={scene} boardHandleRef={boardHandleRef} interactive />
        )}
      </div>
      <SignalBar lessonId={lessonId} initial={state.my_signal} />
      {poll && <PollModal lessonId={lessonId} poll={poll} onDone={() => setPoll(null)} />}
      {pollResult && (
        <div className="fixed bottom-20 left-1/2 z-40 -translate-x-1/2 rounded-lg bg-paper-2 p-4 shadow-lg">
          <div className="mb-2 font-medium">
            {t("live.poll.results")}: {pollResult.question}
          </div>
          {pollResult.options.map((opt, i) => (
            <div key={i} className="text-sm">
              {opt} — {pollResult.counts[i]}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

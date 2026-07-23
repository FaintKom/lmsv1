"use client";

import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { SceneView } from "@/components/live/scene-view";
import type { BoardViewHandle } from "@/components/live/board-view";
import { useLessonState, type Scene } from "@/lib/api/live";
import { useLessonChannel } from "@/hooks/use-lesson-channel";
import { useTranslation } from "@/lib/i18n/context";

export default function ProjectorPage() {
  const { t } = useTranslation();
  const { lessonId } = useParams<{ lessonId: string }>();
  const { data: state } = useLessonState(lessonId);
  const [scene, setScene] = useState<Scene | null>(null);
  const [ended, setEnded] = useState(false);
  const boardHandleRef = useRef<BoardViewHandle | null>(null);

  useEffect(() => {
    if (state) setScene(state.lesson.current_scene);
  }, [state]);

  useLessonChannel(ended ? null : lessonId, {
    onSceneChanged: setScene,
    onBoardDelta: (d) => boardHandleRef.current?.applyRemoteDelta(d as never),
    onLessonEnded: () => setEnded(true),
  });

  if (ended) {
    return (
      <div className="flex h-screen items-center justify-center text-3xl">
        {t("live.endedTitle")}
      </div>
    );
  }
  return (
    <div className="h-screen w-screen bg-white">
      {scene && (
        <SceneView
          lessonId={lessonId}
          scene={scene}
          boardHandleRef={boardHandleRef}
          interactive={false}
        />
      )}
    </div>
  );
}

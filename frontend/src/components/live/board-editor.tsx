"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

import { fetchBoard, sendBoardDelta } from "@/lib/api/live";
import { useTranslation } from "@/lib/i18n/context";

import { diffElements, markSent, type ExElement } from "./board-delta";

const Excalidraw = dynamic(() => import("@excalidraw/excalidraw").then((m) => m.Excalidraw), {
  ssr: false,
});

const SEND_THROTTLE_MS = 500;

export function BoardEditor({ lessonId, boardId }: { lessonId: string; boardId: string }) {
  const { t } = useTranslation();
  const lastSentRef = useRef(new Map<string, number>());
  const versionRef = useRef(0);
  const latestRef = useRef<ExElement[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [initial, setInitial] = useState<{ elements: ExElement[] } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setInitial(null);
    void fetchBoard(lessonId, boardId).then((board) => {
      if (cancelled) return;
      versionRef.current = board.version;
      const els = board.scene.elements as unknown as ExElement[];
      latestRef.current = els;
      lastSentRef.current = new Map(els.map((e) => [e.id, e.version]));
      setInitial({ elements: els });
    });
    return () => {
      cancelled = true;
    };
  }, [lessonId, boardId]);

  const flush = async () => {
    timerRef.current = null;
    const delta = diffElements(latestRef.current, lastSentRef.current);
    if (delta.updated.length === 0 && delta.deleted.length === 0) return;
    const nextVersion = versionRef.current + 1;
    try {
      await sendBoardDelta(lessonId, boardId, { ...delta, version: nextVersion });
      versionRef.current = nextVersion;
      markSent(delta, lastSentRef.current);
    } catch {
      // failed send: keep lastSent as-is; the next flush retries the same diff
    }
  };

  const onChange = (elements: readonly ExElement[]) => {
    if (!initial) return;
    latestRef.current = elements as ExElement[];
    if (timerRef.current == null) {
      timerRef.current = setTimeout(() => void flush(), SEND_THROTTLE_MS);
    }
  };

  // flush pending changes on unmount
  useEffect(
    () => () => {
      if (timerRef.current != null) {
        clearTimeout(timerRef.current);
        void flush();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  if (!initial) {
    return (
      <div className="flex h-full items-center justify-center text-text-muted">
        {t("live.reconnecting")}
      </div>
    );
  }
  return (
    <div className="h-full w-full">
      <Excalidraw
        initialData={{ elements: initial.elements as never, appState: {} }}
        onChange={onChange as never}
      />
    </div>
  );
}

"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

import { fetchBoard } from "@/lib/api/live";
import { useTranslation } from "@/lib/i18n/context";

import { applyDelta, type ExElement } from "./board-delta";

const Excalidraw = dynamic(() => import("@excalidraw/excalidraw").then((m) => m.Excalidraw), {
  ssr: false,
});

export interface BoardViewHandle {
  /** Feed an SSE board_delta into the view. */
  applyRemoteDelta: (d: {
    board_id: string;
    updated: ExElement[];
    deleted: string[];
    version: number;
  }) => void;
}

interface Props {
  lessonId: string;
  boardId: string;
  handleRef: React.MutableRefObject<BoardViewHandle | null>;
}

interface ExcalidrawApi {
  updateScene: (s: { elements: readonly ExElement[] }) => void;
}

export function BoardView({ lessonId, boardId, handleRef }: Props) {
  const { t } = useTranslation();
  const apiRef = useRef<ExcalidrawApi | null>(null);
  const elementsRef = useRef<ExElement[]>([]);
  const versionRef = useRef(0);
  const [initial, setInitial] = useState<{ elements: ExElement[] } | null>(null);

  const loadFull = async () => {
    const board = await fetchBoard(lessonId, boardId);
    elementsRef.current = board.scene.elements as unknown as ExElement[];
    versionRef.current = board.version;
    setInitial({ elements: elementsRef.current });
    apiRef.current?.updateScene({ elements: elementsRef.current });
  };

  useEffect(() => {
    setInitial(null);
    void loadFull();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, boardId]);

  useEffect(() => {
    handleRef.current = {
      applyRemoteDelta: (d) => {
        if (d.board_id !== boardId) return;
        if (d.version !== versionRef.current + 1) {
          void loadFull(); // version gap -> full resync (spec §8)
          return;
        }
        versionRef.current = d.version;
        elementsRef.current = applyDelta(elementsRef.current, d);
        apiRef.current?.updateScene({ elements: elementsRef.current });
      },
    };
    return () => {
      handleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId]);

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
        excalidrawAPI={(api: unknown) => {
          apiRef.current = api as ExcalidrawApi;
        }}
        initialData={{ elements: initial.elements as never, appState: {} }}
        viewModeEnabled
      />
    </div>
  );
}

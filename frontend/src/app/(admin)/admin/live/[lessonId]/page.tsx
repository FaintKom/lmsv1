"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { BoardEditor } from "@/components/live/board-editor";
import { ExercisePicker } from "@/components/live/exercise-picker";
import { MaterialPicker } from "@/components/live/material-picker";
import { PollPanel } from "@/components/live/poll-panel";
import { ProgressGrid } from "@/components/live/progress-grid";
import { RosterPanel } from "@/components/live/roster-panel";
import { StudentDrawer } from "@/components/live/student-drawer";
import {
  createBoard,
  endLesson,
  sendHeartbeat,
  setFollowMode,
  useLessonState,
  useProgress,
  useRoster,
  useSetScene,
  type RosterMember,
  type Scene,
} from "@/lib/api/live";
import { useLessonChannel } from "@/hooks/use-lesson-channel";
import { useTranslation } from "@/lib/i18n/context";

type Rail = "blank" | "board" | "material" | "task" | "solution";

export default function TeacherLivePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const qc = useQueryClient();
  const { lessonId } = useParams<{ lessonId: string }>();

  const { data: state } = useLessonState(lessonId);
  const lesson = state?.lesson;
  const [rail, setRail] = useState<Rail>("blank");
  const [tab, setTab] = useState<"group" | "task" | "poll">("group");
  const [picked, setPicked] = useState<RosterMember | null>(null);
  const [pollCounts, setPollCounts] = useState<number[] | null>(null);
  const [members, setMembers] = useState<RosterMember[]>([]);
  const setSceneMut = useSetScene(lessonId);

  const currentScene = lesson?.current_scene ?? null;
  const taskExerciseId =
    currentScene?.type === "task" ? (currentScene.payload.exercise_id as string) : null;
  const materialLessonId =
    currentScene?.type === "material" ? (currentScene.payload.lesson_id as string) : null;

  const { data: rosterData } = useRoster(lessonId, !!lesson);
  useEffect(() => {
    if (rosterData) setMembers(rosterData.members);
  }, [rosterData]);

  const { data: progressData } = useProgress(lessonId, taskExerciseId);

  useLessonChannel(lesson?.status === "active" ? lessonId : null, {
    onPresence: (p) =>
      setMembers((ms) =>
        ms.map((m) =>
          m.id === p.student_id
            ? { ...m, online: p.online, current_view: p.view, exercise_id: p.exercise_id }
            : m,
        ),
      ),
    onSignal: (s) =>
      setMembers((ms) =>
        ms.map((m) => (m.id === s.student_id ? { ...m, signal: s.on ? s.type : null } : m)),
      ),
    onSubmission: () => {
      void qc.invalidateQueries({ queryKey: ["live", lessonId, "progress"] });
    },
    onPollProgress: (p) => setPollCounts(p.counts),
    onLessonEnded: () => {
      void qc.invalidateQueries({ queryKey: ["live", lessonId, "state"] });
    },
  });

  // teacher heartbeat keeps the lesson alive (stale auto-end guard)
  useEffect(() => {
    if (lesson?.status !== "active") return;
    const iv = setInterval(() => void sendHeartbeat(lessonId, "teacher"), 5000);
    return () => clearInterval(iv);
  }, [lessonId, lesson?.status]);

  const onlineCount = useMemo(() => members.filter((m) => m.online).length, [members]);

  if (!lesson) return null;

  const switchToBoard = async () => {
    setRail("board");
    if (currentScene?.type === "board") return;
    const board = await createBoard(lessonId, "board");
    await setSceneMut.mutateAsync({ type: "board", payload: { board_id: board.id } });
  };

  const railBtn = (key: Rail, emoji: string, label: string, onClick?: () => void) => (
    <button
      key={key}
      title={label}
      onClick={onClick ?? (() => setRail(key))}
      className={`flex h-11 w-11 items-center justify-center rounded-lg text-xl ${
        rail === key ? "bg-primary text-white" : "bg-surface-2 hover:bg-paper-2"
      }`}
    >
      {emoji}
    </button>
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* top bar */}
      <div className="flex items-center gap-3 border-b border-border bg-paper-2 px-4 py-2">
        <span className="font-semibold">{t("live.lesson")}</span>
        <LessonTimer startedAt={lesson.created_at} />
        <span className="text-sm text-text-muted">
          🟢 {onlineCount} {t("live.online")}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() =>
              void setFollowMode(
                lessonId,
                lesson.follow_mode === "free" ? "strict" : "free",
              ).then(() => qc.invalidateQueries({ queryKey: ["live", lessonId, "state"] }))
            }
            className="rounded-pill bg-surface-2 px-3 py-1 text-sm"
          >
            {lesson.follow_mode === "strict"
              ? t("live.followMode.strict")
              : t("live.followMode.free")}
          </button>
          <button
            onClick={() =>
              window.open(`/admin/live/${lessonId}/screen`, "_blank", "noopener,noreferrer")
            }
            className="rounded-pill bg-surface-2 px-3 py-1 text-sm"
          >
            🖥 {t("live.projector")}
          </button>
          <button
            onClick={async () => {
              if (!confirm(t("live.endConfirm"))) return;
              await endLesson(lessonId);
              router.push("/admin/groups");
            }}
            className="rounded-pill bg-danger px-3 py-1 text-sm font-medium text-white"
          >
            {t("live.end")}
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* scene rail */}
        <div className="flex flex-col gap-2 border-r border-border bg-paper-2 p-2">
          {railBtn("blank", "⬜", t("live.scene.blank"), () => {
            setRail("blank");
            void setSceneMut.mutateAsync({ type: "blank", payload: {} });
          })}
          {railBtn("board", "🖊", t("live.scene.board"), () => void switchToBoard())}
          {railBtn("material", "📖", t("live.scene.material"))}
          {railBtn("task", "🧩", t("live.scene.task"))}
          {railBtn("solution", "🔍", t("live.scene.solution"))}
        </div>

        {/* stage */}
        <div className="min-w-0 flex-1">
          {rail === "board" && currentScene?.type === "board" && (
            <BoardEditor lessonId={lessonId} boardId={currentScene.payload.board_id as string} />
          )}
          {rail === "material" &&
            (lesson.course_id ? (
              <MaterialPicker
                courseId={lesson.course_id}
                onPick={(materialLesson) => {
                  void setSceneMut.mutateAsync({
                    type: "material",
                    payload: { lesson_id: materialLesson, course_id: lesson.course_id },
                  });
                }}
              />
            ) : (
              <div className="p-6 text-text-muted">—</div>
            ))}
          {rail === "task" &&
            (materialLessonId ? (
              <ExercisePicker
                lessonRowId={materialLessonId}
                onPick={(ex) => {
                  void setSceneMut.mutateAsync({
                    type: "task",
                    payload: { exercise_id: ex.id, title: ex.title },
                  });
                }}
              />
            ) : currentScene?.type === "task" ? (
              <div className="flex h-full items-center justify-center text-xl text-text-muted">
                🧩 {String(currentScene.payload.title ?? "")}
              </div>
            ) : (
              <div className="p-6 text-sm text-text-muted">{t("live.pickMaterial")}</div>
            ))}
          {rail === "solution" && (
            <SolutionSetup
              members={members}
              exerciseId={taskExerciseId}
              onSet={(scene) => void setSceneMut.mutateAsync(scene)}
            />
          )}
          {rail === "blank" && (
            <div className="flex h-full items-center justify-center text-2xl text-text-subtle">
              ⬜
            </div>
          )}
        </div>

        {/* right panel */}
        <div className="flex w-80 flex-col border-l border-border bg-paper-2">
          <div className="flex border-b border-border">
            {(["group", "task", "poll"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`flex-1 p-2 text-sm ${
                  tab === k ? "border-b-2 border-primary font-medium" : "text-text-muted"
                }`}
              >
                {t(`live.tab.${k}`)}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {tab === "group" && <RosterPanel members={members} onPick={setPicked} />}
            {tab === "task" &&
              (progressData ? (
                <ProgressGrid rows={progressData.students} />
              ) : (
                <div className="text-sm text-text-subtle">{t("live.pickExercise")}</div>
              ))}
            {tab === "poll" && <PollPanel lessonId={lessonId} liveCounts={pollCounts} />}
          </div>
        </div>
      </div>

      {picked && (
        <StudentDrawer
          lessonId={lessonId}
          member={picked}
          exerciseId={taskExerciseId}
          onClose={() => setPicked(null)}
        />
      )}
    </div>
  );
}

function LessonTimer({ startedAt }: { startedAt: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);
  const secs = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  return (
    <span className="font-mono text-sm text-text-muted">
      ⏱ {mm}:{ss}
    </span>
  );
}

function SolutionSetup({
  members,
  exerciseId,
  onSet,
}: {
  members: { id: string; name: string }[];
  exerciseId: string | null;
  onSet: (scene: Scene) => void;
}) {
  const { t } = useTranslation();
  const [anonymous, setAnonymous] = useState(true);
  if (!exerciseId) {
    return <div className="p-6 text-sm text-text-muted">{t("live.pickExercise")}</div>;
  }
  return (
    <div className="p-6">
      <label className="mb-3 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={anonymous}
          onChange={(e) => setAnonymous(e.target.checked)}
        />
        {t("live.anonymous")}
      </label>
      {members.map((m) => (
        <button
          key={m.id}
          onClick={() =>
            onSet({
              type: "solution",
              payload: { exercise_id: exerciseId, student_id: m.id, anonymous },
            })
          }
          className="block w-full rounded-lg p-2 text-left text-sm hover:bg-paper-2"
        >
          {t("live.showSolution")}: {m.name}
        </button>
      ))}
    </div>
  );
}

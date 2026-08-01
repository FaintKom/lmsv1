"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  MonitorPlay,
  PenLine,
  Puzzle,
  SearchCheck,
  Square,
  type LucideIcon,
} from "lucide-react";

import { BoardEditor } from "@/components/live/board-editor";
import { ExercisePicker } from "@/components/live/exercise-picker";
import { LessonReview } from "@/components/live/lesson-review";
import { MaterialPicker } from "@/components/live/material-picker";
import { PollPanel } from "@/components/live/poll-panel";
import { ProgressGrid } from "@/components/live/progress-grid";
import { RosterPanel } from "@/components/live/roster-panel";
import { SceneView } from "@/components/live/scene-view";
import { StudentDrawer } from "@/components/live/student-drawer";
import type { BoardViewHandle } from "@/components/live/board-view";
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
  const [pickingMaterial, setPickingMaterial] = useState(false);
  const previewBoardRef = useRef<BoardViewHandle | null>(null);
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

  if (lesson.status === "ended") {
    if (state && (state.board_ids.length > 0 || lesson.summary)) {
      return <LessonReview lesson={lesson} boardIds={state.board_ids} />;
    }
    return (
      <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-5">
        <div className="text-xl font-extrabold text-text">{t("live.endedTitle")}</div>
        <button
          className="btn-pop rounded-md bg-primary px-5 py-2.5 text-sm font-bold text-white"
          onClick={() => router.push("/admin/groups")}
        >
          {t("common.back")}
        </button>
      </div>
    );
  }

  const switchToBoard = async () => {
    setRail("board");
    if (currentScene?.type === "board") return;
    const board = await createBoard(lessonId, "board");
    await setSceneMut.mutateAsync({ type: "board", payload: { board_id: board.id } });
  };

  const railBtn = (key: Rail, Icon: LucideIcon, label: string, onClick?: () => void) => (
    <button
      key={key}
      title={label}
      aria-label={label}
      onClick={onClick ?? (() => setRail(key))}
      className={`flex h-11 w-11 items-center justify-center rounded-md transition-colors ${
        rail === key
          ? "bg-primary text-white"
          : "text-ink-500 hover:bg-surface-2 hover:text-text"
      }`}
    >
      <Icon size={18} strokeWidth={2} />
    </button>
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* top bar */}
      <div className="flex h-14 items-center gap-3 border-b border-border bg-paper-2 px-5">
        <span className="flex items-center gap-2 font-extrabold text-text">
          <span className="h-2 w-2 animate-pulse rounded-pill bg-coral-500" />
          {t("live.lesson")}
        </span>
        <LessonTimer startedAt={lesson.created_at} />
        <span className="flex items-center gap-1.5 rounded-pill bg-green-100 px-2.5 py-1 font-mono text-[11px] font-bold tabular-nums text-green-800">
          <span className="h-1.5 w-1.5 rounded-pill bg-green-600" />
          {onlineCount} {t("live.online")}
        </span>
        <div className="ml-auto flex items-center gap-2.5">
          <button
            onClick={() =>
              void setFollowMode(
                lessonId,
                lesson.follow_mode === "free" ? "strict" : "free",
              ).then(() => qc.invalidateQueries({ queryKey: ["live", lessonId, "state"] }))
            }
            className="btn-pop btn-pop--secondary rounded-sm border border-border bg-paper-2 px-3.5 py-1.5 text-xs font-bold text-text"
          >
            {lesson.follow_mode === "strict"
              ? t("live.followMode.strict")
              : t("live.followMode.free")}
          </button>
          <button
            onClick={() =>
              window.open(`/admin/live/${lessonId}/screen`, "_blank", "noopener,noreferrer")
            }
            className="btn-pop btn-pop--secondary inline-flex items-center gap-1.5 rounded-sm border border-border bg-paper-2 px-3.5 py-1.5 text-xs font-bold text-text"
          >
            <MonitorPlay size={14} /> {t("live.projector")}
          </button>
          <button
            onClick={async () => {
              if (!confirm(t("live.endConfirm"))) return;
              await endLesson(lessonId);
              router.push("/admin/groups");
            }}
            className="btn-pop btn-pop--coral rounded-sm bg-danger px-3.5 py-1.5 text-xs font-bold text-white"
          >
            {t("live.end")}
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* scene rail */}
        <div className="flex flex-col gap-1.5 border-r border-border bg-paper-2 p-2">
          {railBtn("blank", Square, t("live.scene.blank"), () => {
            setRail("blank");
            void setSceneMut.mutateAsync({ type: "blank", payload: {} });
          })}
          {railBtn("board", PenLine, t("live.scene.board"), () => void switchToBoard())}
          {railBtn("material", BookOpen, t("live.scene.material"), () => {
            setRail("material");
            setPickingMaterial(false);
          })}
          {railBtn("task", Puzzle, t("live.scene.task"))}
          {railBtn("solution", SearchCheck, t("live.scene.solution"))}
        </div>

        {/* stage */}
        <div className="min-w-0 flex-1">
          {rail === "board" && currentScene?.type === "board" && (
            <BoardEditor lessonId={lessonId} boardId={currentScene.payload.board_id as string} />
          )}
          {rail === "material" &&
            (currentScene?.type === "material" && !pickingMaterial ? (
              // teacher sees what the class sees, with a switch-source chip
              <div className="relative h-full">
                <SceneView
                  lessonId={lessonId}
                  scene={currentScene}
                  boardHandleRef={previewBoardRef}
                  interactive={false}
                />
                <button
                  onClick={() => setPickingMaterial(true)}
                  className="btn-pop btn-pop--secondary absolute right-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-sm border border-border bg-paper-2 px-3.5 py-1.5 text-xs font-bold text-text"
                >
                  <BookOpen size={14} /> {t("live.pickMaterial")}
                </button>
              </div>
            ) : (
              <MaterialPicker
                defaultCourseId={lesson.course_id}
                activeLessonId={materialLessonId}
                onPick={(courseId, materialLesson) => {
                  setPickingMaterial(false);
                  void setSceneMut.mutateAsync({
                    type: "material",
                    payload: { lesson_id: materialLesson, course_id: courseId },
                  });
                }}
              />
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
              <div className="flex h-full flex-col items-center justify-center gap-4">
                <span className="flex h-16 w-16 items-center justify-center rounded-lg bg-sun-100 text-sun-700">
                  <Puzzle size={28} />
                </span>
                <span className="text-md font-extrabold text-text">
                  {String(currentScene.payload.title ?? "")}
                </span>
              </div>
            ) : (
              <EmptyHint icon={BookOpen} text={t("live.pickMaterial")} />
            ))}
          {rail === "solution" && (
            <SolutionSetup
              members={members}
              exerciseId={taskExerciseId}
              onSet={(scene) => void setSceneMut.mutateAsync(scene)}
            />
          )}
          {rail === "blank" && (
            <div className="flex h-full items-center justify-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-lg bg-surface-2 text-ink-300">
                <Square size={28} />
              </span>
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
                className={`flex-1 border-b-2 px-2 py-3 text-[13px] font-bold transition-colors ${
                  tab === k
                    ? "border-primary text-text"
                    : "border-transparent text-text-muted hover:text-text"
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
                <div className="pt-2 text-center text-sm text-text-subtle">
                  {t("live.pickExercise")}
                </div>
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
    <span className="font-mono text-sm tabular-nums text-text-muted">
      {mm}:{ss}
    </span>
  );
}

function EmptyHint({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
      <span className="flex h-16 w-16 items-center justify-center rounded-lg bg-sun-100 text-sun-700">
        <Icon size={28} />
      </span>
      <span className="max-w-[280px] text-center text-sm text-text-muted">{text}</span>
    </div>
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
    return <EmptyHint icon={SearchCheck} text={t("live.pickExercise")} />;
  }
  return (
    <div className="p-6">
      <label className="mb-4 flex items-center gap-2.5 text-sm font-semibold text-text">
        <input
          type="checkbox"
          checked={anonymous}
          onChange={(e) => setAnonymous(e.target.checked)}
          className="h-[18px] w-[18px] rounded-sm border-2 border-ink-200 accent-[var(--color-primary)]"
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
          className="block w-full rounded-md p-2 text-left text-sm font-semibold text-text transition-colors hover:bg-surface-2"
        >
          {t("live.showSolution")}: {m.name}
        </button>
      ))}
    </div>
  );
}

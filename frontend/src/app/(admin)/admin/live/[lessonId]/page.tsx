"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  MonitorPlay,
  PenLine,
  Puzzle,
  SearchCheck,
  Square,
  type LucideIcon,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { exercisesApi } from "@/lib/api/exercises";

import { BoardEditor } from "@/components/live/board-editor";
import { ExercisePicker } from "@/components/live/exercise-picker";
import { LessonReview } from "@/components/live/lesson-review";
import { ReviewInspector } from "@/components/live/review-inspector";
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
  sendClassMessage,
  sendHeartbeat,
  setFollowMode,
  useLessonState,
  useProgress,
  useRoster,
  useSetScene,
  type RosterMember,
  type StudentQuestion,
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
  const [pickingTask, setPickingTask] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [classMsg, setClassMsg] = useState("");
  const [questions, setQuestions] = useState<StudentQuestion[]>([]);
  useEffect(() => {
    if (state?.questions) setQuestions(state.questions);
  }, [state?.questions]);
  const previewBoardRef = useRef<BoardViewHandle | null>(null);
  const setSceneMut = useSetScene(lessonId);

  const currentScene = lesson?.current_scene ?? null;
  // remember the last material/task so the task and review rails keep
  // working after the scene moves on (board, poll, blank...)
  const [lastMaterial, setLastMaterial] = useState<{
    lessonId: string;
    courseId: string | null;
  } | null>(null);
  const [lastExercise, setLastExercise] = useState<string | null>(null);
  const [lastBoard, setLastBoard] = useState<string | null>(null);
  useEffect(() => {
    if (currentScene?.type === "material" && currentScene.payload.lesson_id) {
      setLastMaterial({
        lessonId: currentScene.payload.lesson_id as string,
        courseId: (currentScene.payload.course_id as string) ?? null,
      });
    }
    if (currentScene?.type === "board" && currentScene.payload.board_id) {
      setLastBoard(currentScene.payload.board_id as string);
    }
    if (currentScene?.type === "task" && currentScene.payload.exercise_id) {
      setLastExercise(currentScene.payload.exercise_id as string);
      // task payloads carry their source material — survives page reloads
      if (currentScene.payload.material_lesson_id) {
        setLastMaterial({
          lessonId: currentScene.payload.material_lesson_id as string,
          courseId: (currentScene.payload.material_course_id as string) ?? null,
        });
      }
    }
  }, [currentScene]);
  const taskExerciseId =
    currentScene?.type === "task"
      ? (currentScene.payload.exercise_id as string)
      : lastExercise;
  const materialLessonId =
    currentScene?.type === "material"
      ? (currentScene.payload.lesson_id as string)
      : (lastMaterial?.lessonId ?? null);

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
    onSignalsCleared: () => setMembers((ms) => ms.map((m) => ({ ...m, signal: null }))),
    onStudentQuestion: (q) => setQuestions((qs) => [...qs, q]),
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

  // ── conductor: auto-programme from the picked material ──────────────
  // steps = [material, task1, task2...]; Next/Prev (or ←/→) walk them.
  const { data: programExs } = useQuery({
    queryKey: ["live", lessonId, "program", materialLessonId],
    queryFn: async () => {
      const resp = await exercisesApi.getByLesson(materialLessonId as string);
      return (resp.data ?? []) as unknown as { id: string; title: string }[];
    },
    enabled: !!materialLessonId,
    staleTime: 60_000,
  });
  const steps = useMemo(() => {
    if (!materialLessonId) return [];
    return [
      { kind: "material" as const, id: materialLessonId, title: "" },
      ...(programExs ?? []).map((e) => ({ kind: "task" as const, id: e.id, title: e.title })),
    ];
  }, [materialLessonId, programExs]);
  // index of the scene currently broadcast, if it is part of the programme
  const liveStepIndex = useMemo(() => {
    if (currentScene?.type === "material" && currentScene.payload.lesson_id === materialLessonId)
      return 0;
    if (currentScene?.type === "task") {
      const i = steps.findIndex(
        (s) => s.kind === "task" && s.id === currentScene.payload.exercise_id,
      );
      if (i >= 0) return i;
    }
    return null;
  }, [currentScene, steps, materialLessonId]);
  const lastStepRef = useRef(0);
  useEffect(() => {
    if (liveStepIndex != null) lastStepRef.current = liveStepIndex;
  }, [liveStepIndex]);

  const goStep = (idx: number) => {
    const step = steps[idx];
    if (!step) return;
    if (step.kind === "material") {
      setRail("material");
      setPickingMaterial(false);
      void setSceneMut.mutateAsync({
        type: "material",
        payload: { lesson_id: step.id, course_id: lastMaterial?.courseId ?? lesson?.course_id ?? null },
      });
    } else {
      setRail("task");
      setPickingTask(false);
      void setSceneMut.mutateAsync({
        type: "task",
        payload: {
          exercise_id: step.id,
          title: step.title,
          material_lesson_id: materialLessonId,
          material_course_id: lastMaterial?.courseId ?? lesson?.course_id ?? null,
        },
      });
    }
  };
  const stepBase = liveStepIndex ?? lastStepRef.current;
  const canPrev = steps.length > 0 && stepBase > 0;
  const canNext = steps.length > 0 && stepBase < steps.length - 1;

  // ←/→ drive the programme unless focus is in a field or a modal is open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (confirmEnd || picked) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowRight" && canNext) goStep(stepBase + 1);
      if (e.key === "ArrowLeft" && canPrev) goStep(stepBase - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepBase, canNext, canPrev, confirmEnd, picked, steps]);


  if (!lesson) return null;

  if (lesson.status === "ended") {
    if (state && (state.board_ids.length > 0 || lesson.summary)) {
      return <LessonReview lesson={lesson} boardIds={state.board_ids} teacherView />;
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
    // coming back to the board must show the SAME board — a fresh empty
    // one every time looked like the drawing was lost
    if (lastBoard) {
      await setSceneMut.mutateAsync({ type: "board", payload: { board_id: lastBoard } });
      return;
    }
    const board = await createBoard(lessonId, "board");
    setLastBoard(board.id);
    await setSceneMut.mutateAsync({ type: "board", payload: { board_id: board.id } });
  };

  const railBtn = (key: Rail, Icon: LucideIcon, label: string, onClick?: () => void) => (
    <button
      key={key}
      title={label}
      onClick={onClick ?? (() => setRail(key))}
      className={`flex h-14 w-16 flex-col items-center justify-center gap-1 rounded-md transition-colors ${
        rail === key
          ? "bg-primary text-white"
          : "text-ink-500 hover:bg-surface-2 hover:text-text"
      }`}
    >
      <Icon size={17} strokeWidth={2} />
      <span className="max-w-full truncate px-1 font-mono text-[9px] font-bold uppercase tracking-wide">
        {label}
      </span>
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
        <span className="rounded-pill bg-ink-100 px-2.5 py-1 font-mono text-[11px] font-bold text-ink-700">
          {t("live.nowShowing")}: {t(`live.scene.${currentScene?.type ?? "blank"}` as never)}
        </span>
        {!lesson.course_id && (
          <span className="rounded-pill bg-sun-100 px-2.5 py-1 font-mono text-[11px] font-bold text-sun-700">
            {t("live.noAttendance")}
          </span>
        )}
        {steps.length > 0 && (
          <span className="flex items-center gap-0.5 rounded-pill bg-surface-2 px-1 py-0.5">
            <button
              onClick={() => goStep(stepBase - 1)}
              disabled={!canPrev}
              aria-label={t("live.prevStep")}
              title={t("live.prevStep")}
              className="flex h-7 w-7 items-center justify-center rounded-pill text-ink-700 transition-colors hover:bg-ink-100 disabled:opacity-30"
            >
              <ChevronLeft size={15} strokeWidth={2.5} />
            </button>
            <span className="min-w-9 text-center font-mono text-[11px] font-bold tabular-nums text-ink-700">
              {stepBase + 1}/{steps.length}
            </span>
            <button
              onClick={() => goStep(stepBase + 1)}
              disabled={!canNext}
              aria-label={t("live.nextStep")}
              title={t("live.nextStep")}
              className="flex h-7 w-7 items-center justify-center rounded-pill text-ink-700 transition-colors hover:bg-ink-100 disabled:opacity-30"
            >
              <ChevronRight size={15} strokeWidth={2.5} />
            </button>
          </span>
        )}
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
            title={t("live.projectorHint")}
            className="btn-pop btn-pop--secondary inline-flex items-center gap-1.5 rounded-sm border border-border bg-paper-2 px-3.5 py-1.5 text-xs font-bold text-text"
          >
            <MonitorPlay size={14} /> {t("live.projector")}
          </button>
          <button
            onClick={() => setConfirmEnd(true)}
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
          {railBtn("task", Puzzle, t("live.scene.task"), () => {
            setRail("task");
            setPickingTask(false);
          })}
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
            (currentScene?.type === "task" && !pickingTask ? (
              // teacher sees exactly what students see, behind a
              // view-only shield (no accidental teacher submissions)
              <div className="relative h-full">
                <SceneView
                  lessonId={lessonId}
                  scene={currentScene}
                  boardHandleRef={previewBoardRef}
                  interactive
                  canQuit={false}
                />
                <div className="absolute inset-0 z-10" />
                <button
                  onClick={() => setPickingTask(true)}
                  className="btn-pop btn-pop--secondary absolute right-4 top-4 z-20 inline-flex items-center gap-1.5 rounded-sm border border-border bg-paper-2 px-3.5 py-1.5 text-xs font-bold text-text"
                >
                  <Puzzle size={14} /> {t("live.pickExercise")}
                </button>
              </div>
            ) : materialLessonId ? (
              <ExercisePicker
                lessonRowId={materialLessonId}
                activeExerciseId={taskExerciseId}
                onPick={(ex) => {
                  setPickingTask(false);
                  void setSceneMut.mutateAsync({
                    type: "task",
                    payload: {
                      exercise_id: ex.id,
                      title: ex.title,
                      // students can peek at the source material from the task
                      material_lesson_id: materialLessonId,
                      material_course_id:
                        currentScene?.type === "material"
                          ? ((currentScene.payload.course_id as string) ?? null)
                          : (lastMaterial?.courseId ?? null),
                    },
                  });
                }}
              />
            ) : (
              <EmptyHint icon={BookOpen} text={t("live.pickMaterial")} />
            ))}
          {rail === "solution" &&
            (taskExerciseId ? (
              <ReviewInspector
                exerciseId={taskExerciseId}
                members={members}
                progress={progressData?.students}
              />
            ) : (
              <EmptyHint icon={SearchCheck} text={t("live.pickExercise")} />
            ))}
          {rail === "blank" && <EmptyHint icon={Square} text={t("live.startHint")} />}
        </div>

        {/* right panel */}
        <div className="flex w-80 flex-col border-l border-border bg-paper-2">
          <div className="flex border-b border-border">
            {(["group", "task", "poll"] as const).map((k) => {
              const signalCount =
                k === "group"
                  ? members.filter((m) => m.signal).length + questions.length
                  : 0;
              return (
                <button
                  key={k}
                  onClick={() => setTab(k)}
                  className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 px-2 py-3 text-[13px] font-bold transition-colors ${
                    tab === k
                      ? "border-primary text-text"
                      : "border-transparent text-text-muted hover:text-text"
                  }`}
                >
                  {t(`live.tab.${k}`)}
                  {signalCount > 0 && (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-pill bg-coral-500 px-1 font-mono text-[10px] font-bold text-white">
                      {signalCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {tab === "group" && (
              <div className="flex h-full flex-col">
                {questions.length > 0 && (
                  <div className="mb-3 rounded-md bg-sun-50 p-3">
                    <div className="mb-1.5 font-mono text-[10px] font-bold uppercase tracking-wide text-sun-700">
                      {t("live.questionsTitle")}
                    </div>
                    {questions.map((q, i) => (
                      <div key={`${q.at}-${i}`} className="flex items-start gap-2 py-1 text-sm">
                        <span className="min-w-0 flex-1">
                          <span className="font-bold text-text">{q.name}: </span>
                          <span className="text-text-muted">{q.text}</span>
                        </span>
                        <button
                          onClick={() =>
                            setQuestions((qs) => qs.filter((_, idx) => idx !== i))
                          }
                          aria-label={t("common.close")}
                          className="-my-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-text-subtle transition-colors hover:bg-sun-100"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <RosterPanel members={members} onPick={setPicked} />
                </div>
                <div className="mt-3 border-t border-border pt-3">
                  <label
                    htmlFor="class-msg"
                    className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wide text-ink-700"
                  >
                    {t("live.messageAll")}
                  </label>
                  <textarea
                    id="class-msg"
                    rows={2}
                    value={classMsg}
                    onChange={(e) => setClassMsg(e.target.value)}
                    className="w-full rounded-md border-2 border-border bg-paper-2 px-3 py-2 text-sm transition-colors placeholder:text-ink-300 focus:border-border-focus focus:outline-none focus:ring-4 focus:ring-primary-soft"
                  />
                  <button
                    disabled={!classMsg.trim()}
                    onClick={async () => {
                      await sendClassMessage(lessonId, classMsg.trim());
                      setClassMsg("");
                    }}
                    className="btn-pop mt-2 w-full rounded-md bg-primary p-2 text-xs font-bold text-white"
                  >
                    {t("live.messageAll")}
                  </button>
                </div>
              </div>
            )}
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

      {confirmEnd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/45 backdrop-blur-[2px]">
          <div className="w-full max-w-[420px] rounded-xl bg-paper-2 p-8 shadow-lg">
            <h3 className="mb-6 text-lg font-bold text-text">{t("live.endConfirm")}</h3>
            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setConfirmEnd(false)}
                className="btn-pop btn-pop--secondary rounded-md border border-border bg-paper-2 px-4 py-2 text-sm font-bold text-text"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={async () => {
                  await endLesson(lessonId);
                  setConfirmEnd(false);
                  // stay on the page — the state refetch flips status to
                  // "ended" and renders the lesson review in place
                  await qc.invalidateQueries({ queryKey: ["live", lessonId, "state"] });
                }}
                className="btn-pop btn-pop--coral rounded-md bg-danger px-4 py-2 text-sm font-bold text-white"
              >
                {t("live.end")}
              </button>
            </div>
          </div>
        </div>
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

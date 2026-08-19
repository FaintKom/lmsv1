"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Eye,
  EyeOff,
  ListOrdered,
  MonitorPlay,
  PenLine,
  Puzzle,
  SearchCheck,
  MonitorUp,
  SendHorizonal,
  Square,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { exercisesApi } from "@/lib/api/exercises";

import { AttentionPanel } from "@/components/live/attention-panel";
import { BoardEditor } from "@/components/live/board-editor";
import { ExercisePicker } from "@/components/live/exercise-picker";
import { LessonReview } from "@/components/live/lesson-review";
import { ReviewInspector } from "@/components/live/review-inspector";
import { MaterialPicker } from "@/components/live/material-picker";
import { PollPanel } from "@/components/live/poll-panel";
import { ProgressGrid } from "@/components/live/progress-grid";
import { BreakoutPanel } from "@/components/live/breakout-panel";
import { MediaStage } from "@/components/live/media-stage";
import { RosterPanel } from "@/components/live/roster-panel";
import { SceneView } from "@/components/live/scene-view";
import { StudentDrawer } from "@/components/live/student-drawer";
import type { BreakoutGroup } from "@/lib/api/live";
import type { BoardViewHandle } from "@/components/live/board-view";
import {
  createBoard,
  endLesson,
  saveProgramme,
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

type Rail = "blank" | "board" | "material" | "task" | "solution" | "screen" | "faces";

/** One conductor programme step. `hidden` steps stay in the editor but are
 *  skipped by navigation and excluded from the n/m counter. */
type Step = { kind: "material" | "task" | "board"; id: string; title: string; hidden?: boolean };

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
  // Who currently has the floor, and who may share a screen. Both come off the
  // lesson's existing event stream rather than being polled.
  const [floorHolder, setFloorHolder] = useState<string | null>(null);
  const [sharers, setSharers] = useState<Set<string>>(new Set());
  const [breakouts, setBreakouts] = useState<BreakoutGroup[]>([]);
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

  // Share-drives-scene, on the EDGE and never the level. Tiles reports
  // "somebody is sharing" on every mount as well as on change, so acting on
  // the level made any re-render of the media panel stomp the teacher's later
  // choice: pick Faces, panel re-renders, scene snaps back to Screen. The
  // scene flapped between the two until the class was seasick.
  const sharingRef = useRef<boolean | null>(null);
  const sceneTypeRef = useRef<string | undefined>(undefined);
  const onTeacherShare = useCallback(
    (sharing: boolean) => {
      const prev = sharingRef.current;
      sharingRef.current = sharing;
      if (prev === null || prev === sharing) return; // mount report or no edge
      if (sharing) {
        setRail("screen");
        void setSceneMut.mutateAsync({ type: "screen", payload: {} });
      } else if (sceneTypeRef.current === "screen") {
        setRail("blank");
        void setSceneMut.mutateAsync({ type: "blank", payload: {} });
      }
    },
    [setSceneMut],
  );

  const currentScene = lesson?.current_scene ?? null;
  useEffect(() => {
    sceneTypeRef.current = currentScene?.type;
  }, [currentScene?.type]);
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
    onMediaFloorChanged: (d) => setFloorHolder(d.user_id),
    onMediaBreakoutsChanged: (d) => setBreakouts(d.groups),
    onMediaParticipantRemoved: (d) =>
      setMembers((ms) => ms.filter((m) => m.id !== d.user_id)),
    onMediaShareGrantChanged: (d) =>
      setSharers((prev) => {
        const next = new Set(prev);
        if (d.allowed) next.add(d.user_id);
        else next.delete(d.user_id);
        return next;
      }),
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
  const autoSteps = useMemo(() => {
    if (!materialLessonId) return [];
    return [
      { kind: "material" as const, id: materialLessonId, title: "" },
      ...(programExs ?? []).map((e) => ({ kind: "task" as const, id: e.id, title: e.title })),
    ];
  }, [materialLessonId, programExs]);

  // Conductor v2: the teacher may reorder / hide steps and append a board.
  // `programme === null` means "follow the auto list"; any edit pins a copy,
  // persisted server-side so a mid-lesson reload doesn't drop it.
  const [programme, setProgrammeState] = useState<Step[] | null>(null);
  const [editingProgramme, setEditingProgramme] = useState(false);
  const hydratedProgramme = useRef(false);
  useEffect(() => {
    if (hydratedProgramme.current || !lesson) return;
    hydratedProgramme.current = true;
    if (lesson.programme) setProgrammeState(lesson.programme as Step[]);
  }, [lesson]);

  const setProgramme = (next: Step[] | null) => {
    setProgrammeState(next);
    // Failures already surface through the apiClient error toast.
    void saveProgramme(lessonId, next).catch(() => {});
  };
  const fullSteps: Step[] = programme ?? autoSteps;
  // Navigation only ever sees visible steps.
  const steps = useMemo(() => fullSteps.filter((s) => !s.hidden), [fullSteps]);

  const editProgramme = (fn: (draft: Step[]) => Step[]) =>
    setProgramme(fn([...(programme ?? autoSteps)]));
  const moveStep = (idx: number, delta: number) =>
    editProgramme((draft) => {
      const to = idx + delta;
      if (to < 0 || to >= draft.length) return draft;
      [draft[idx], draft[to]] = [draft[to], draft[idx]];
      return draft;
    });
  const toggleStep = (idx: number) =>
    editProgramme((draft) => {
      draft[idx] = { ...draft[idx], hidden: !draft[idx].hidden };
      return draft;
    });
  const addBoardStep = () =>
    editProgramme((draft) => [...draft, { kind: "board", id: "board", title: "" }]);
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
    if (currentScene?.type === "board") {
      const i = steps.findIndex((s) => s.kind === "board");
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
    if (step.kind === "board") {
      void switchToBoard();
      return;
    }
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
      // the programme editor owns the arrows while it is open
      if (confirmEnd || picked || editingProgramme) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowRight" && canNext) goStep(stepBase + 1);
      if (e.key === "ArrowLeft" && canPrev) goStep(stepBase - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepBase, canNext, canPrev, confirmEnd, picked, editingProgramme, steps]);

  // Esc closes the programme editor
  useEffect(() => {
    if (!editingProgramme) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setEditingProgramme(false);
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [editingProgramme]);


  if (!lesson) return null;

  if (lesson.status === "ended") {
    if (state && (state.board_ids.length > 0 || lesson.summary)) {
      return <LessonReview lesson={lesson} boardIds={state.board_ids} teacherView />;
    }
    return (
      <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-5">
        <div className="text-xl font-extrabold text-text">{t("live.endedTitle")}</div>
        <button
          className="btn-pop rounded-md bg-primary px-5 py-2.5 text-sm font-bold text-primary-fg"
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
          ? "bg-primary text-primary-fg"
          : "text-text-muted hover:bg-surface-2 hover:text-text"
      }`}
    >
      <Icon size={17} strokeWidth={2} />
      <span className="max-w-full truncate px-1 font-mono text-3xs font-bold uppercase tracking-wide">
        {label}
      </span>
    </button>
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* top bar */}
      <div className="flex h-14 items-center gap-3 border-b border-border bg-surface px-5">
        <span className="flex items-center gap-2 font-extrabold text-text">
          <span className="h-2 w-2 animate-pulse rounded-pill bg-clay-500" />
          {t("live.lesson")}
        </span>
        <LessonTimer startedAt={lesson.created_at} />
        <span className="flex items-center gap-1.5 rounded-pill bg-success-soft px-2.5 py-1 font-mono text-2xs font-bold tabular-nums text-green-800">
          <span className="h-1.5 w-1.5 rounded-pill bg-green-600" />
          {onlineCount} {t("live.online")}
        </span>
        <span className="rounded-pill bg-surface-2 px-2.5 py-1 font-mono text-2xs font-bold text-text">
          {t("live.nowShowing")}: {t(`live.scene.${currentScene?.type ?? "blank"}` as never)}
        </span>
        {!lesson.course_id && (
          <span className="rounded-pill bg-warning-soft px-2.5 py-1 font-mono text-2xs font-bold text-sun-700">
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
              className="flex h-7 w-7 items-center justify-center rounded-pill text-text transition-colors hover:bg-surface-2 disabled:opacity-30"
            >
              <ChevronLeft size={15} strokeWidth={2.5} />
            </button>
            <span className="min-w-9 text-center font-mono text-2xs font-bold tabular-nums text-text">
              {stepBase + 1}/{steps.length}
            </span>
            <button
              onClick={() => goStep(stepBase + 1)}
              disabled={!canNext}
              aria-label={t("live.nextStep")}
              title={t("live.nextStep")}
              className="flex h-7 w-7 items-center justify-center rounded-pill text-text transition-colors hover:bg-surface-2 disabled:opacity-30"
            >
              <ChevronRight size={15} strokeWidth={2.5} />
            </button>
            <button
              onClick={() => setEditingProgramme((v) => !v)}
              aria-label={t("live.programme")}
              title={t("live.programme")}
              aria-expanded={editingProgramme}
              className={`flex h-7 w-7 items-center justify-center rounded-pill transition-colors ${
                editingProgramme ? "bg-surface-2 text-text" : "text-text hover:bg-surface-2"
              }`}
            >
              <ListOrdered size={15} strokeWidth={2.5} />
            </button>
          </span>
        )}
        {editingProgramme && (
          <>
            {/* click-away catcher — the panel itself sits above it */}
            <div className="fixed inset-0 z-30" onClick={() => setEditingProgramme(false)} />
            <div className="absolute left-1/2 top-12 z-40 w-80 -translate-x-1/2 rounded-md border border-border bg-surface p-2 shadow-md">
              <div className="eyebrow px-1.5 pb-1.5">{t("live.programme")}</div>
              {fullSteps.map((s, i) => {
                const StepIcon = s.kind === "material" ? BookOpen : s.kind === "board" ? PenLine : Puzzle;
                return (
                  <div
                    key={`${s.kind}-${s.id}-${i}`}
                    className={`flex h-9 items-center gap-1.5 rounded-sm px-1.5 transition-colors hover:bg-surface-2 ${
                      s.hidden ? "opacity-50" : ""
                    }`}
                  >
                    <StepIcon size={15} className="shrink-0 text-text-subtle" />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-text">
                      {s.kind === "material"
                        ? t("live.scene.material")
                        : s.kind === "board"
                          ? t("live.scene.board")
                          : s.title}
                    </span>
                    {s.hidden && <span className="eyebrow shrink-0">{t("live.stepHidden")}</span>}
                    <button
                      onClick={() => moveStep(i, -1)}
                      disabled={i === 0}
                      aria-label={t("live.prevStep")}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-text hover:bg-surface-2 disabled:opacity-30"
                    >
                      <ChevronUp size={14} strokeWidth={2.5} />
                    </button>
                    <button
                      onClick={() => moveStep(i, 1)}
                      disabled={i === fullSteps.length - 1}
                      aria-label={t("live.nextStep")}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-text hover:bg-surface-2 disabled:opacity-30"
                    >
                      <ChevronDown size={14} strokeWidth={2.5} />
                    </button>
                    <button
                      onClick={() => toggleStep(i)}
                      aria-label={t("live.stepHidden")}
                      aria-pressed={!!s.hidden}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-text hover:bg-surface-2"
                    >
                      {s.hidden ? <EyeOff size={14} strokeWidth={2.5} /> : <Eye size={14} strokeWidth={2.5} />}
                    </button>
                  </div>
                );
              })}
              <div className="mt-1.5 flex items-center gap-2 border-t border-border pt-1.5">
                <button
                  onClick={addBoardStep}
                  className="rounded-sm px-2 py-1.5 text-sm font-bold text-primary hover:bg-surface-2"
                >
                  {t("live.programmeAddBoard")}
                </button>
                <button
                  onClick={() => setProgramme(null)}
                  disabled={programme === null}
                  className="ml-auto rounded-sm px-2 py-1.5 text-sm font-semibold text-text-muted hover:bg-surface-2 disabled:opacity-40"
                >
                  {t("live.programmeReset")}
                </button>
              </div>
            </div>
          </>
        )}
        <div className="ml-auto flex items-center gap-2.5">
          <button
            onClick={() =>
              void setFollowMode(
                lessonId,
                lesson.follow_mode === "free" ? "strict" : "free",
              ).then(() => qc.invalidateQueries({ queryKey: ["live", lessonId, "state"] }))
            }
            className="btn-pop btn-pop--secondary rounded-sm border border-border bg-surface px-3.5 py-1.5 text-xs font-bold text-text"
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
            className="btn-pop btn-pop--secondary inline-flex items-center gap-1.5 rounded-sm border border-border bg-surface px-3.5 py-1.5 text-xs font-bold text-text"
          >
            <MonitorPlay size={14} /> {t("live.projector")}
          </button>
          <button
            onClick={() => setConfirmEnd(true)}
            className="btn-pop btn-pop--clay rounded-sm bg-danger px-3.5 py-1.5 text-xs font-bold text-ink-900"
          >
            {t("live.end")}
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* scene rail */}
        <div className="flex flex-col gap-1.5 border-r border-border bg-surface p-2">
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
          {/* Media scenes (FR-034): the screen and the faces are things to put
              in front of the class, the way a board is. The screen scene shows
              whatever is being shared — pressing Share screen also sets it, so
              one click both publishes and shows. */}
          {railBtn("screen", MonitorUp, t("live.scene.screen"), () => {
            setRail("screen");
            void setSceneMut.mutateAsync({ type: "screen", payload: {} });
          })}
          {railBtn("faces", Users, t("live.scene.faces"), () => {
            setRail("faces");
            void setSceneMut.mutateAsync({ type: "faces", payload: {} });
          })}
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
                  className="btn-pop btn-pop--secondary absolute right-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-sm border border-border bg-surface px-3.5 py-1.5 text-xs font-bold text-text"
                >
                  <BookOpen size={14} /> {t("live.pickMaterial")}
                </button>
              </div>
            ) : (
              <MaterialPicker
                lessonId={lessonId}
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
                  className="btn-pop btn-pop--secondary absolute right-4 top-4 z-20 inline-flex items-center gap-1.5 rounded-sm border border-border bg-surface px-3.5 py-1.5 text-xs font-bold text-text"
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
        <div className="flex w-80 flex-col border-l border-border bg-surface">
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
                  className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 px-2 py-3 text-sm font-bold transition-colors ${
                    tab === k
                      ? "border-primary text-text"
                      : "border-transparent text-text-muted hover:text-text"
                  }`}
                >
                  {t(`live.tab.${k}`)}
                  {signalCount > 0 && (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-pill bg-clay-500 px-1 font-mono text-3xs font-bold text-white">
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
                  <div className="mb-3 rounded-md bg-warning-soft p-3">
                    <div className="mb-1.5 font-mono text-3xs font-bold uppercase tracking-wide text-sun-700">
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
                          className="-my-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-text-subtle transition-colors hover:bg-warning-soft"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {/* Directly above the roster on purpose: a tile and a name
                    should line up by eye, which is why the media moved onto
                    this page at all. */}
                <div className="mb-2 h-44 shrink-0">
                  <MediaStage lessonId={lessonId} layout="roll" onScreenShare={onTeacherShare} />
                </div>
                <div className="mb-2 shrink-0 border-b border-border pb-2">
                  <BreakoutPanel
                    lessonId={lessonId}
                    groups={breakouts}
                    onGroups={setBreakouts}
                  />
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <RosterPanel members={members} onPick={setPicked} />
                </div>
                {/* One row, Enter sends. The old label + textarea + full-width
                    button stack was 129px of the column spent on an input that
                    holds six words (FR-041). */}
                <form
                  className="mt-2 flex shrink-0 items-center gap-1.5 border-t border-border pt-2"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!classMsg.trim()) return;
                    await sendClassMessage(lessonId, classMsg.trim());
                    setClassMsg("");
                  }}
                >
                  <input
                    id="class-msg"
                    aria-label={t("live.messageAll")}
                    placeholder={t("live.messageAll")}
                    value={classMsg}
                    onChange={(e) => setClassMsg(e.target.value)}
                    className="h-9 min-w-0 flex-1 rounded-md border border-border bg-surface px-2.5 text-xs text-text placeholder:text-text-subtle focus:border-border-focus focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!classMsg.trim()}
                    aria-label={t("live.messageAll")}
                    className="btn-pop flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-fg disabled:opacity-50"
                  >
                    <SendHorizonal size={15} aria-hidden />
                  </button>
                </form>
              </div>
            )}
            {tab === "task" &&
              (progressData ? (
                <>
                  <AttentionPanel
                    rows={progressData.students}
                    roster={members}
                    currentExerciseId={taskExerciseId ?? null}
                  />
                  <ProgressGrid rows={progressData.students} />
                </>
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
          hasFloor={floorHolder === picked.id}
          canShare={sharers.has(picked.id)}
          lessonId={lessonId}
          member={picked}
          exerciseId={taskExerciseId}
          onClose={() => setPicked(null)}
        />
      )}

      {confirmEnd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/45 backdrop-blur-[2px]">
          <div className="w-full max-w-[420px] rounded-xl bg-surface p-8 shadow-lg">
            <h3 className="mb-6 text-lg font-bold text-text">{t("live.endConfirm")}</h3>
            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setConfirmEnd(false)}
                className="btn-pop btn-pop--secondary rounded-md border border-border bg-surface px-4 py-2 text-sm font-bold text-text"
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
                className="btn-pop btn-pop--clay rounded-md bg-danger px-4 py-2 text-sm font-bold text-ink-900"
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
      <span className="flex h-16 w-16 items-center justify-center rounded-lg bg-warning-soft text-warning-fg">
        <Icon size={28} />
      </span>
      <span className="max-w-[280px] text-center text-sm text-text-muted">{text}</span>
    </div>
  );
}

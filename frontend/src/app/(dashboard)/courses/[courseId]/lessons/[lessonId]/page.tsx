"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
 ArrowLeft,
 ArrowRight,
 CheckCircle,
 FileText,
 PlayCircle,
 Code,
 Clock,
 ChevronDown,
 ChevronRight,
 Upload,
 Puzzle,
 Bot,
 Calculator,
 Box,
 PanelLeftClose,
 PanelLeft,
 type LucideIcon,
} from "lucide-react";
import type { Course, Module, Lesson, LessonBlock } from "@/types/api";
import QuizTaker from "@/components/assessments/quiz-taker";
import { EditorLayout } from "@/components/code-editor/editor-layout";
import FileUploader from "@/components/submissions/file-uploader";
import InteractiveTaker from "@/components/submissions/interactive-taker";
import { ContentRenderer } from "@/components/common/content-renderer";
import ExerciseRenderer from "@/components/exercises/exercise-renderer";
import { AiTutorPanel } from "@/components/ai/ai-tutor-panel";
import { VideoPlayer } from "@/components/video-player";

interface LessonProgressItem {
 lesson_id: string;
 status: string;
}

const CONTENT_ICONS: Record<string, LucideIcon> = {
 text: FileText,
 video: PlayCircle,
 quiz: CheckCircle,
 code_challenge: Code,
 file_upload: Upload,
 interactive: Puzzle,
 robot_2d: Bot,
 math_interactive: Calculator,
 world_3d: Box,
};

export default function LessonViewerPage() {
 const params = useParams();
 const router = useRouter();
 const courseId = params.courseId as string;
 const lessonId = params.lessonId as string;

 const [course, setCourse] = useState<Course | null>(null);
 const [lesson, setLesson] = useState<Lesson | null>(null);
 const [loading, setLoading] = useState(true);
 const [completing, setCompleting] = useState(false);
 const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
 const [sidebarOpen, setSidebarOpen] = useState(typeof window !== "undefined" ? window.innerWidth >= 768 : true);
 const [lessonSidebarCollapsed, setLessonSidebarCollapsed] = useState(false);
 const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
 const [exercises, setExercises] = useState<
  {
   id: string;
   exercise_type: string;
   title: string;
   config: Record<string, unknown>;
   questions?: unknown[];
   test_cases?: unknown[];
  }[]
 >([]);
 const [currentPage, setCurrentPage] = useState(1);
 const [challenge, setChallenge] = useState<{
  id: string;
  title: string;
  description: string;
  language: string;
  starter_code: string | null;
  test_cases: { id: string; input: string; expected_output: string }[];
 } | null>(null);
 const footerSentinelRef = useRef<HTMLDivElement>(null);
 const [footerVisible, setFooterVisible] = useState(false);

 useEffect(() => {
  const el = footerSentinelRef.current;
  if (!el) return;
  let scrollParent: HTMLElement | null = el.parentElement;
  while (scrollParent) {
   const ov = getComputedStyle(scrollParent).overflowY;
   if ((ov === "auto" || ov === "scroll") && scrollParent.scrollHeight > scrollParent.clientHeight) break;
   scrollParent = scrollParent.parentElement;
  }
  const obs = new IntersectionObserver(([entry]) => setFooterVisible(entry.isIntersecting), { root: scrollParent, threshold: 0 });
  obs.observe(el);
  return () => obs.disconnect();
 }, [loading]);

 // Build flat lesson list for prev/next navigation
 const allLessons: { lesson: Lesson; moduleId: string }[] = [];
 course?.modules?.forEach((m) => {
  m.lessons?.forEach((l) => {
   allLessons.push({ lesson: l, moduleId: m.id });
  });
 });
 const currentIndex = allLessons.findIndex((item) => item.lesson.id === lessonId);
 const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
 const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

 const fetchData = useCallback(async () => {
  try {
   const [courseRes, lessonRes, progressRes] = await Promise.all([
    apiClient.get(`/courses/${courseId}`),
    apiClient.get(`/courses/${courseId}/lessons/${lessonId}`),
    apiClient.get(`/progress/courses/${courseId}/lesson-progress`),
   ]);
   setCourse(courseRes.data);
   setLesson(lessonRes.data);

   const completedIds = new Set<string>(
    (progressRes.data as LessonProgressItem[])
     .filter((p) => p.status === "completed")
     .map((p) => p.lesson_id)
   );
   setCompletedLessons(completedIds);

   // Expand the module that contains the current lesson
   const allModules = new Set<string>(
    (courseRes.data.modules || []).map((m: Module) => m.id)
   );
   setExpandedModules(allModules);

   // Load challenge if code_challenge lesson
   if (lessonRes.data.content_type === "code_challenge") {
    try {
     const challengeRes = await apiClient.get(`/sandbox/lessons/${lessonId}/challenge`);
     setChallenge(challengeRes.data);
    } catch {
     setChallenge(null);
    }
   } else {
    setChallenge(null);
   }

   // Load exercises attached to this lesson
   try {
    const exercisesRes = await apiClient.get(`/exercises/by-lesson/${lessonId}`);
    setExercises(exercisesRes.data || []);
   } catch {
    setExercises([]);
   }
  } catch {
   // Lesson might not be accessible
  } finally {
   setLoading(false);
  }
 }, [courseId, lessonId]);

 useEffect(() => {
  setLoading(true);
  setCurrentPage(1);
  fetchData();
 }, [fetchData]);

 const handleComplete = async () => {
  setCompleting(true);
  try {
   await apiClient.post(`/progress/lessons/${lessonId}/complete/`);
   setCompletedLessons((prev) => new Set(prev).add(lessonId));
   toast.success("Lesson marked as complete!");
  } catch {
   toast.error("Failed to mark as complete. Make sure you are enrolled.");
  } finally {
   setCompleting(false);
  }
 };

 const toggleModule = (moduleId: string) => {
  setExpandedModules((prev) => {
   const next = new Set(prev);
   if (next.has(moduleId)) next.delete(moduleId);
   else next.add(moduleId);
   return next;
  });
 };

 /* ─── Loading skeleton ──────────────────────────────────────────────── */

 if (loading) {
  return (
   <div className="-m-6 md:-m-10 lg:-m-12 -mb-20 md:-mb-10 lg:-mb-12 flex min-h-screen">
    {/* Lesson sidebar skeleton */}
    <div className="hidden w-80 flex-col border-r border-border bg-paper-2 md:flex">
     <div className="border-b border-border px-5 pb-4 pt-5">
      <div className="lms-skeleton mb-3 h-3 w-20" />
      <div className="lms-skeleton mb-1 h-2.5 w-40" />
      <div className="lms-skeleton mb-3 h-5 w-full" />
      <div className="lms-skeleton h-[7px] w-full !rounded-pill" />
     </div>
     <div className="flex-1 px-3 py-4">
      <div className="space-y-2">
       {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="lms-skeleton h-9 w-full rounded-[10px]" />
       ))}
      </div>
     </div>
    </div>
    {/* Main content skeleton */}
    <div className="flex flex-1 flex-col">
     <div className="border-b border-border bg-paper-2 px-6 py-5 md:px-14">
      <div className="lms-skeleton h-3 w-48" />
     </div>
     <div className="flex-1 px-6 py-9 md:px-14">
      <div className="mx-auto max-w-[720px]">
       <div className="mb-4 flex gap-2">
        <div className="lms-skeleton h-6 w-28 !rounded-pill" />
        <div className="lms-skeleton h-6 w-16 !rounded-pill" />
       </div>
       <div className="lms-skeleton mb-4 h-9 w-96" />
       <div className="space-y-3">
        <div className="lms-skeleton h-4 w-full" />
        <div className="lms-skeleton h-4 w-full" />
        <div className="lms-skeleton h-4 w-3/4" />
        <div className="lms-skeleton h-4 w-5/6" />
       </div>
      </div>
     </div>
    </div>
   </div>
  );
 }

 /* ─── Not found ──────────────────────────────────────────────────── */

 if (!course || !lesson) {
  return (
   <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="mb-4 rounded-full bg-ink-100 p-4">
     <FileText className="h-8 w-8 text-text-subtle" />
    </div>
    <h3 className="mb-1 text-lg font-bold text-text">Lesson not found</h3>
    <Link
     href={`/courses/${courseId}`}
     className="mt-2 text-sm font-semibold text-primary hover:text-primary-hover"
    >
     Back to course
    </Link>
   </div>
  );
 }

 const isCompleted = completedLessons.has(lessonId);

 // Find current module/lesson indices for breadcrumb
 const currentModuleIndex = course.modules?.findIndex((m) =>
  m.lessons?.some((l) => l.id === lessonId)
 ) ?? -1;
 const currentLessonInModuleIndex =
  currentModuleIndex >= 0
   ? (course.modules![currentModuleIndex].lessons?.findIndex((l) => l.id === lessonId) ?? -1)
   : -1;

 /* ─── Main render ────────────────────────────────────────────────── */

 return (
  <div className="-m-6 md:-m-10 lg:-m-12 -mb-20 md:-mb-10 lg:-mb-12 flex min-h-screen">
   {/* Mobile sidebar overlay */}
   {sidebarOpen && (
    <div
     className="fixed inset-0 z-40 bg-ink-900/60 md:hidden"
     onClick={() => setSidebarOpen(false)}
     aria-hidden="true"
    />
   )}

   {/* ── Lesson sidebar ─────────────────────────────────────────── */}
   {lessonSidebarCollapsed ? (
    <div className="hidden md:flex flex-col items-center border-r border-border bg-paper-2 py-3 px-1.5 w-12 shrink-0">
     <button
      onClick={() => setLessonSidebarCollapsed(false)}
      className="rounded-lg p-2 text-text-muted hover:bg-ink-100 hover:text-text"
      title="Expand sidebar"
     >
      <PanelLeft className="h-4 w-4" />
     </button>
    </div>
   ) : null}
   <aside
    className={cn(
     "fixed top-0 left-0 z-50 flex h-full w-[min(320px,85vw)] flex-col border-r border-border bg-paper-2 transition-transform duration-200 overscroll-contain md:relative md:z-auto md:w-80 md:translate-x-0",
     sidebarOpen ? "translate-x-0" : "-translate-x-full",
     lessonSidebarCollapsed && "md:hidden"
    )}
   >
    {/* Sidebar header */}
    <div className="border-b border-border px-5 pb-4 pt-5">
     <div className="flex items-center justify-between mb-2.5">
      <Link
       href={`/courses/${courseId}`}
       className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-text"
      >
       <ArrowLeft className="h-3.5 w-3.5" />
       Back to course
      </Link>
      <button
       onClick={() => setLessonSidebarCollapsed(true)}
       className="hidden md:flex rounded-lg p-1.5 text-text-muted hover:bg-ink-100 hover:text-text"
       title="Collapse sidebar"
      >
       <PanelLeftClose className="h-4 w-4" />
      </button>
     </div>
     <p className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-widest text-green-700">
      Course · {course.modules?.length || 0} modules · {allLessons.length} lessons
     </p>
     <h3 className="mb-3 text-base font-extrabold leading-tight tracking-tight text-text">
      {course.title}
     </h3>
     <div className="flex items-center gap-2.5">
      <div className="h-[7px] flex-1 overflow-hidden rounded-pill bg-ink-100">
       <div
        className="h-full rounded-pill"
        style={{
         width: `${allLessons.length > 0 ? (completedLessons.size / allLessons.length) * 100 : 0}%`,
         background: "linear-gradient(90deg, var(--green-400), var(--green-600))",
        }}
       />
      </div>
      <span className="font-mono text-[11px] font-bold text-green-700">
       {completedLessons.size}/{allLessons.length}
      </span>
     </div>
    </div>

    {/* Module accordion */}
    <div className="flex-1 overflow-y-auto px-3 py-2">
     {course.modules?.map((module, mi) => {
      const moduleLessons = module.lessons || [];
      const moduleCompleted = moduleLessons.filter((l) => completedLessons.has(l.id)).length;
      const isCurrentModule = moduleLessons.some((l) => l.id === lessonId);
      const isExpanded = expandedModules.has(module.id);
      const allDone = moduleCompleted === moduleLessons.length && moduleLessons.length > 0;
      const notStarted = moduleCompleted === 0 && !isCurrentModule;

      return (
       <div key={module.id} className="mt-2">
        <button
         onClick={() => toggleModule(module.id)}
         className={cn(
          "flex w-full items-center gap-2.5 rounded-[10px] px-2 py-2 text-[13px] font-bold transition-colors",
          isCurrentModule ? "bg-green-50" : "hover:bg-ink-50"
         )}
        >
         <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px] bg-green-100 font-mono text-[11px] font-extrabold text-green-800">
          {mi + 1}
         </span>
         <span
          className={cn(
           "flex-1 text-left",
           isCurrentModule ? "text-green-800" : notStarted ? "text-text-muted" : "text-text"
          )}
         >
          {module.title}
         </span>
         <span
          className={cn(
           "font-mono text-[10px] font-semibold tracking-wide",
           isCurrentModule ? "text-green-700" : "text-text-subtle"
          )}
         >
          {allDone
           ? `${moduleCompleted}/${moduleLessons.length} ✓`
           : `${moduleCompleted}/${moduleLessons.length}`}
         </span>
         {isExpanded ? (
          <ChevronDown className="h-3 w-3 shrink-0 text-text-subtle" />
         ) : (
          <ChevronRight className="h-3 w-3 shrink-0 text-text-subtle" />
         )}
        </button>

        {isExpanded && moduleLessons.length > 0 && (
         <ul className="ml-[25px] mt-1 space-y-[2px] border-l border-border pl-3.5">
          {moduleLessons.map((l) => {
           const isActive = l.id === lessonId;
           const isDone = completedLessons.has(l.id);

           return (
            <li key={l.id}>
             <Link
              href={`/courses/${courseId}/lessons/${l.id}`}
              onClick={() => {
               if (typeof window !== "undefined" && window.innerWidth < 768) setSidebarOpen(false);
              }}
              className={cn(
               "flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[12.5px] font-semibold transition-colors",
               isActive
                ? "bg-green-100 font-bold text-green-800"
                : isDone
                  ? "text-text-subtle"
                  : "text-text-muted hover:bg-ink-50 hover:text-text"
              )}
             >
              {/* Check circle */}
              <span
               className={cn(
                "flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full text-[9px] font-extrabold",
                isActive
                 ? "bg-green-600 text-white shadow-[0_0_0_3px_var(--green-100)]"
                 : isDone
                   ? "bg-green-500 text-white"
                   : "border-[1.5px] border-ink-200 bg-transparent"
               )}
              >
               {isDone ? "✓" : isActive ? "▸" : ""}
              </span>
              <span className="flex-1 truncate">{l.title}</span>
              {l.duration_minutes && (
               <span className="font-mono text-[10px] font-semibold text-text-subtle">
                {l.duration_minutes}m
               </span>
              )}
             </Link>
            </li>
           );
          })}
         </ul>
        )}
       </div>
      );
     })}
    </div>
   </aside>

   {/* ── Main content area ──────────────────────────────────────── */}
   <div className="flex min-w-0 flex-1 flex-col">
    {/* Mobile sidebar toggle */}
    {!sidebarOpen && (
     <button
      onClick={() => setSidebarOpen(true)}
      className="fixed left-2 top-2 z-30 flex h-10 w-10 items-center justify-center rounded-[10px] border border-border bg-paper-2 shadow-md text-text-muted hover:text-text md:hidden"
     >
      <ArrowRight className="h-4 w-4" />
     </button>
    )}

    {/* Header bar */}
    <div className="flex items-center gap-4 border-b border-border bg-paper-2 px-6 py-5 md:px-14">
     <div className="text-xs font-semibold text-text-muted">
      {currentModuleIndex >= 0 && (
       <>
        Module {currentModuleIndex + 1} / Lesson {currentLessonInModuleIndex + 1} ·{" "}
       </>
      )}
      <span className="font-bold text-text">{lesson.title}</span>
     </div>
     <div className="flex-1" />
     {isCompleted && (
      <span className="inline-flex items-center gap-1.5 rounded-pill bg-green-100 px-3 py-1 text-[11px] font-bold text-green-800">
       <CheckCircle className="h-3 w-3" /> Done
      </span>
     )}
    </div>

    {/* Content area */}
    <div className="flex-1 overflow-auto px-6 py-9 md:px-14">
     <div className="mx-auto max-w-[720px]">
      {/* Hero pills */}
      <div className="mb-3.5 flex flex-wrap items-center gap-2">
       <span className="inline-flex items-center gap-1.5 rounded-pill bg-green-100 px-3 py-[5px] text-xs font-bold capitalize text-green-800">
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
        {lesson.content_type.replace("_", " ")}
       </span>
       {lesson.duration_minutes && (
        <span className="inline-flex items-center gap-1.5 rounded-pill bg-ink-100 px-3 py-[5px] text-xs font-bold text-ink-700">
         <Clock className="h-3 w-3" />
         {lesson.duration_minutes} min
        </span>
       )}
      </div>

      {/* Title */}
      <h1 className="mb-4 text-[36px] font-extrabold leading-[1.1] tracking-tight text-text">
       {lesson.title}
      </h1>

      {/* Content rendering — v2 block-based or legacy fallback */}
      {lesson.content?.version === 2 ? (
       <BlockContent
        blocks={lesson.content.blocks || []}
        exercises={exercises}
        courseId={courseId}
        lessonId={lessonId}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        prevLesson={prevLesson}
        nextLesson={nextLesson}
       />
      ) : (
       <LegacyContent
        lesson={lesson}
        challenge={challenge}
        lessonId={lessonId}
        onComplete={handleComplete}
       />
      )}
     </div>

     {/* Exercises — show exercises not already embedded in v2 blocks */}
     {(() => {
      const blockExIds = new Set(
       (lesson.content?.blocks || [])
        .filter((b: any) => b.type === "exercise" && b.exercise_id)
        .map((b: any) => b.exercise_id)
      );
      const orphaned = lesson.content?.version === 2
       ? exercises.filter((ex) => !blockExIds.has(ex.id))
       : exercises;
      if (orphaned.length === 0) return null;
      return (
       <div className="mb-8 space-y-6 px-2 sm:px-6">
        <h2 className="mx-auto max-w-[720px] text-[21px] font-bold tracking-tight text-text">
         Exercises
        </h2>
        {orphaned.map((ex) => (
         <ExerciseRenderer
          key={ex.id}
          exercise={ex as any}
          courseId={courseId}
          prevLesson={prevLesson ? { id: prevLesson.lesson.id, title: prevLesson.lesson.title } : null}
          nextLesson={nextLesson ? { id: nextLesson.lesson.id, title: nextLesson.lesson.title } : null}
         />
        ))}
       </div>
      );
     })()}

     {/* Complete button — only when no exercises */}
     <div className="mx-auto max-w-[720px]">
      {!isCompleted && exercises.length === 0 && (
       <div className="mb-8">
        <button
         onClick={handleComplete}
         disabled={completing}
         className="btn-pop flex w-full items-center justify-center gap-2 rounded-[14px] bg-green-600 px-6 py-3.5 text-[13px] font-bold text-white disabled:opacity-50"
         style={{ boxShadow: "0 4px 0 0 var(--green-700)" }}
        >
         <CheckCircle className="h-4 w-4" />
         {completing ? "Marking as complete..." : "Mark Lesson as Complete"}
        </button>
       </div>
      )}
     </div>

     {/* Sentinel — triggers footer when scrolled into view */}
     <div ref={footerSentinelRef} className="h-px" />
    </div>

    {/* ── Footer nav — visible only when scrolled to bottom ──── */}
    <div className={cn(
     "flex items-center gap-3.5 border-t border-border bg-paper-2 px-6 py-3.5 transition-opacity duration-200 md:px-14",
     footerVisible ? "opacity-100" : "pointer-events-none h-0 overflow-hidden opacity-0"
    )}>
     {isCompleted && (
      <div className="flex items-center gap-2 text-xs font-semibold text-green-700">
       <span className="h-[7px] w-[7px] rounded-full bg-green-500" />
       Completed
      </div>
     )}
     <div className="flex-1" />

     {prevLesson && (
      <Link
       href={`/courses/${courseId}/lessons/${prevLesson.lesson.id}`}
       className="hidden items-center gap-2.5 rounded-xl bg-ink-50 px-3.5 py-2 text-[13px] font-bold text-text transition-all hover:-translate-y-0.5 sm:flex"
      >
       <ArrowLeft className="h-3.5 w-3.5 text-text-subtle" />
       <div>
        <span className="block font-mono text-[9px] font-semibold uppercase tracking-widest text-text-subtle">
         Previous
        </span>
        <span className="block max-w-[160px] truncate">{prevLesson.lesson.title}</span>
       </div>
      </Link>
     )}

     {nextLesson ? (
      <Link
       href={`/courses/${courseId}/lessons/${nextLesson.lesson.id}`}
       className="btn-pop flex items-center gap-2.5 rounded-xl bg-green-600 px-3.5 py-2 text-[13px] font-bold text-white"
       style={{ boxShadow: "0 4px 0 0 var(--green-700)" }}
      >
       <div className="text-right">
        <span className="block font-mono text-[9px] font-semibold uppercase tracking-widest text-white/70">
         Up next
        </span>
        <span className="block max-w-[160px] truncate">{nextLesson.lesson.title}</span>
       </div>
       <ArrowRight className="h-3.5 w-3.5" />
      </Link>
     ) : (
      <Link
       href={`/courses/${courseId}`}
       className="btn-pop flex items-center gap-2 rounded-xl bg-green-600 px-3.5 py-2 text-[13px] font-bold text-white"
       style={{ boxShadow: "0 4px 0 0 var(--green-700)" }}
      >
       <CheckCircle className="h-3.5 w-3.5" />
       Back to Course
      </Link>
     )}
    </div>
   </div>

   {/* AI Tutor */}
   <AiTutorPanel
    context={{
     type: exercises.length > 0 ? "exercise" : "lesson",
     lessonId,
     lessonTitle: lesson?.title,
     exerciseTitle: exercises[0]?.title,
    }}
   />
  </div>
 );
}

/* ─── Block-based content (v2) ────────────────────────────────────────── */

function BlockContent({
 blocks,
 exercises,
 courseId,
 lessonId,
 currentPage,
 setCurrentPage,
 prevLesson,
 nextLesson,
}: {
 blocks: LessonBlock[];
 exercises: { id: string; exercise_type: string; title: string; config: Record<string, unknown>; questions?: unknown[]; test_cases?: unknown[] }[];
 courseId: string;
 lessonId: string;
 currentPage: number;
 setCurrentPage: (p: number) => void;
 prevLesson: { lesson: Lesson; moduleId: string } | null;
 nextLesson: { lesson: Lesson; moduleId: string } | null;
}) {
 const pages = [...new Set(blocks.map((b) => b.page || 1))].sort((a, b) => a - b);
 const currentBlocks = blocks
  .filter((b) => (b.page || 1) === currentPage)
  .sort((a, b) => a.sort_order - b.sort_order);

 const hasMultiplePages = pages.length > 1;

 return (
  <>
   {hasMultiplePages && (
    <PageNav pages={pages} currentPage={currentPage} setCurrentPage={setCurrentPage} />
   )}

   {currentBlocks.map((block) => (
    <div key={block.id} className="mb-8">
     <BlockRenderer
      block={block}
      exercises={exercises}
      courseId={courseId}
      lessonId={lessonId}
      prevLesson={prevLesson}
      nextLesson={nextLesson}
     />
    </div>
   ))}

   {currentBlocks.length === 0 && (
    <div className="text-sm text-text-muted">No content on this page.</div>
   )}

   {hasMultiplePages && (
    <PageNav pages={pages} currentPage={currentPage} setCurrentPage={setCurrentPage} />
   )}
  </>
 );
}

function BlockRenderer({
 block,
 exercises,
 courseId,
 lessonId,
 prevLesson,
 nextLesson,
}: {
 block: LessonBlock;
 exercises: { id: string; exercise_type: string; title: string; config: Record<string, unknown>; questions?: unknown[]; test_cases?: unknown[] }[];
 courseId: string;
 lessonId: string;
 prevLesson: { lesson: Lesson; moduleId: string } | null;
 nextLesson: { lesson: Lesson; moduleId: string } | null;
}) {
 switch (block.type) {
  case "text":
   return block.body ? (
    <div className={block.format === "tiptap" ? "" : "prose prose-slate max-w-none"}>
     <ContentRenderer
      body={block.body}
      format={(block.format as "markdown" | "html" | "tiptap") || "html"}
     />
    </div>
   ) : null;

  case "html":
   return block.body ? (
    <div className="prose prose-slate max-w-none">
     <ContentRenderer
      body={typeof block.body === "string" ? block.body : ""}
      format="html"
     />
    </div>
   ) : null;

  case "video":
   return block.url ? <VideoPlayer url={block.url} lessonId={lessonId} /> : null;

  case "exercise": {
   const exercise = exercises.find((ex) => ex.id === block.exercise_id);
   return exercise ? (
    <ExerciseRenderer
     exercise={exercise as any}
     courseId={courseId}
     prevLesson={prevLesson ? { id: prevLesson.lesson.id, title: prevLesson.lesson.title } : null}
     nextLesson={nextLesson ? { id: nextLesson.lesson.id, title: nextLesson.lesson.title } : null}
    />
   ) : null;
  }

  default:
   return null;
 }
}

function PageNav({
 pages,
 currentPage,
 setCurrentPage,
}: {
 pages: number[];
 currentPage: number;
 setCurrentPage: (p: number) => void;
}) {
 const currentIndex = pages.indexOf(currentPage);
 const prevPage = currentIndex > 0 ? pages[currentIndex - 1] : null;
 const nextPage = currentIndex < pages.length - 1 ? pages[currentIndex + 1] : null;

 return (
  <div className="mb-6 flex items-center justify-between">
   <button
    disabled={prevPage === null}
    onClick={() => prevPage !== null && setCurrentPage(prevPage)}
    className="flex items-center gap-2 rounded-xl bg-ink-50 px-3.5 py-2 text-xs font-bold text-text disabled:opacity-40"
   >
    <ArrowLeft className="h-3 w-3" />
    Previous
   </button>

   <div className="flex items-center gap-1">
    {pages.map((p) => (
     <button
      key={p}
      onClick={() => setCurrentPage(p)}
      className={cn(
       "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors",
       p === currentPage ? "bg-green-600 text-white" : "text-text-muted hover:bg-ink-100"
      )}
     >
      {p}
     </button>
    ))}
   </div>

   <button
    disabled={nextPage === null}
    onClick={() => nextPage !== null && setCurrentPage(nextPage)}
    className="flex items-center gap-2 rounded-xl bg-ink-50 px-3.5 py-2 text-xs font-bold text-text disabled:opacity-40"
   >
    Next
    <ArrowRight className="h-3 w-3" />
   </button>
  </div>
 );
}

/* ─── Legacy content rendering (v1 / pre-blocks) ────────────────────── */

function LegacyContent({
 lesson,
 challenge,
 lessonId,
 onComplete,
}: {
 lesson: Lesson;
 challenge: { id: string; title: string; description: string; language: string; starter_code: string | null; test_cases: { id: string; input: string; expected_output: string }[] } | null;
 lessonId: string;
 onComplete: () => void;
}) {
 return (
  <>
   {/* Theory content — shown for ALL lesson types when content.body exists */}
   {typeof lesson.content?.body === "string" && lesson.content.body.trim().length > 0 && (
    <div className="mb-8">
     <div className={lesson.content.format === "tiptap" ? "" : "prose prose-slate max-w-none"}>
      <ContentRenderer
       body={lesson.content.body as string}
       format={(lesson.content.format as "markdown" | "html" | "tiptap") || "markdown"}
      />
     </div>
    </div>
   )}

   {/* Type-specific content */}
   <div className="mb-8">
    {lesson.content_type === "text" && !lesson.content?.body && (
     <div className="text-sm text-text-muted">No content yet.</div>
    )}

    {lesson.content_type === "video" &&
     (lesson.content.url ? (
      <VideoPlayer url={lesson.content.url as string} lessonId={lessonId} />
     ) : (
      <div className="flex aspect-video items-center justify-center rounded-[14px] bg-ink-900 text-white">
       No video URL provided
      </div>
     ))}

    {lesson.content_type === "code_challenge" && challenge && (
     <div>
      {challenge.description && (
       <div className="mb-4 rounded-[14px] border border-border bg-paper-2 p-5">
        <h3 className="mb-2 text-sm font-bold text-text">{challenge.title}</h3>
        <div className="prose prose-sm prose-slate max-w-none text-text-muted">
         <p>{challenge.description}</p>
        </div>
       </div>
      )}
      <div className="h-[500px] overflow-hidden rounded-[14px] border border-border">
       <EditorLayout
        challengeId={challenge.id}
        language={challenge.language}
        starterCode={challenge.starter_code || ""}
        testCases={challenge.test_cases}
       />
      </div>
     </div>
    )}

    {lesson.content_type === "code_challenge" && !challenge && (
     <div className="rounded-[14px] border border-border bg-ink-50 p-6 text-center">
      <Code className="mx-auto mb-2 h-10 w-10 text-text-subtle" />
      <p className="text-sm text-text-muted">
       No challenge has been configured for this lesson yet.
      </p>
     </div>
    )}

    {lesson.content_type === "quiz" && (
     <QuizTaker lessonId={lessonId} onComplete={onComplete} />
    )}

    {lesson.content_type === "file_upload" && (
     <FileUploader lessonId={lessonId} content={lesson.content} onComplete={onComplete} />
    )}

    {lesson.content_type === "interactive" && (
     <InteractiveTaker lessonId={lessonId} content={lesson.content} onComplete={onComplete} />
    )}
   </div>
  </>
 );
}

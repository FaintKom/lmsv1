"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Circle,
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
  type LucideIcon,
} from "lucide-react";
import type { Course, Module, Lesson } from "@/types/api";
import QuizTaker from "@/components/assessments/quiz-taker";
import { EditorLayout } from "@/components/code-editor/editor-layout";
import FileUploader from "@/components/submissions/file-uploader";
import InteractiveTaker from "@/components/submissions/interactive-taker";
import CommentSection from "@/components/discussions/comment-section";
import { ContentRenderer } from "@/components/common/content-renderer";
import ExerciseRenderer from "@/components/exercises/exercise-renderer";

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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [exercises, setExercises] = useState<
    {
      id: string;
      exercise_type: "quiz" | "code_challenge" | "matching" | "ordering" | "fill_blanks" | "true_false" | "categorize" | "file_upload";
      title: string;
      config: Record<string, unknown>;
      questions?: unknown[];
      test_cases?: unknown[];
    }[]
  >([]);
  const [challenge, setChallenge] = useState<{
    id: string;
    title: string;
    description: string;
    language: string;
    starter_code: string | null;
    test_cases: { id: string; input: string; expected_output: string }[];
  } | null>(null);

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

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)]">
        <div className="w-80 border-r border-slate-200 bg-white dark:border-white/10 dark:bg-[#2C2C2C] p-4">
          <Skeleton className="mb-4 h-4 w-24" />
          <Skeleton className="mb-6 h-5 w-48" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full rounded-lg" />
            ))}
          </div>
        </div>
        <div className="flex-1 px-6 py-8">
          <div className="mx-auto max-w-3xl">
            <Skeleton className="mb-4 h-4 w-64" />
            <Skeleton className="mb-2 h-5 w-24 rounded-full" />
            <Skeleton className="mb-6 h-8 w-96" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!course || !lesson) {
    return (
      <div className="text-center">
        <p className="text-slate-500">Lesson not found</p>
        <Link href={`/courses/${courseId}`} className="text-indigo-600 hover:underline">
          Back to course
        </Link>
      </div>
    );
  }

  const isCompleted = completedLessons.has(lessonId);

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <div
        className={`border-r border-slate-200 bg-white dark:border-white/10 dark:bg-[#2C2C2C] transition-all ${
          sidebarOpen ? "w-80" : "w-0 overflow-hidden"
        }`}
      >
        <div className="sticky top-0 h-full overflow-y-auto p-4">
          <Link
            href={`/courses/${courseId}`}
            className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to course
          </Link>
          <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">{course.title}</h3>

          <div className="space-y-1">
            {course.modules?.map((module, mi) => (
              <div key={module.id}>
                <button
                  onClick={() => toggleModule(module.id)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5"
                >
                  {expandedModules.has(module.id) ? (
                    <ChevronDown className="h-3 w-3 text-slate-400" />
                  ) : (
                    <ChevronRight className="h-3 w-3 text-slate-400" />
                  )}
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-indigo-50 text-[10px] font-bold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                    {mi + 1}
                  </span>
                  <span className="flex-1 truncate">{module.title}</span>
                </button>

                {expandedModules.has(module.id) && (
                  <ul className="ml-5 space-y-0.5 border-l border-slate-100 dark:border-white/10 pl-3">
                    {module.lessons?.map((l) => {
                      const isActive = l.id === lessonId;
                      const isDone = completedLessons.has(l.id);
                      const Icon = CONTENT_ICONS[l.content_type] || FileText;

                      return (
                        <li key={l.id}>
                          <Link
                            href={`/courses/${courseId}/lessons/${l.id}`}
                            className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors ${
                              isActive
                                ? "bg-indigo-50 font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
                                : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-white/5"
                            }`}
                          >
                            {isDone ? (
                              <CheckCircle className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                            ) : (
                              <Circle className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                            )}
                            <Icon className="h-3 w-3 shrink-0 text-slate-400" />
                            <span className="flex-1 truncate">{l.title}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1">
        {/* Toggle sidebar button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="fixed left-0 top-20 z-10 rounded-r-lg border border-l-0 border-slate-200 bg-white px-1 py-3 text-slate-400 hover:text-slate-600 dark:border-white/10 dark:bg-[#2C2C2C] dark:text-slate-500 dark:hover:text-slate-300 md:hidden"
        >
          {sidebarOpen ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
        </button>

        <div className="mx-auto max-w-3xl px-6 py-8">
          {/* Lesson header */}
          <div className="mb-6">
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium capitalize text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                {lesson.content_type.replace("_", " ")}
              </span>
              {lesson.duration_minutes && (
                <span className="flex items-center gap-1 text-xs text-slate-400">
                  <Clock className="h-3 w-3" />
                  {lesson.duration_minutes} min
                </span>
              )}
              {isCompleted && (
                <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-600">
                  <CheckCircle className="h-3 w-3" />
                  Completed
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{lesson.title}</h1>
          </div>

          {/* Theory content — shown for ALL lesson types when content.body exists */}
          {typeof lesson.content?.body === "string" && lesson.content.body.trim().length > 0 && (
            <div className="mb-8">
              <div className={lesson.content.format === "tiptap" ? "" : "prose prose-slate max-w-prose dark:prose-invert"}>
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
              <div className="text-sm text-slate-500 dark:text-slate-400">No content yet.</div>
            )}

            {lesson.content_type === "video" && (
              <div className="aspect-video overflow-hidden rounded-xl bg-black">
                {lesson.content.url ? (
                  <iframe
                    src={getEmbedUrl(lesson.content.url as string)}
                    className="h-full w-full"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-white">
                    No video URL provided
                  </div>
                )}
              </div>
            )}

            {lesson.content_type === "code_challenge" && challenge && (
              <div>
                {challenge.description && (
                  <div className="mb-4 rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-[#2C2C2C] p-4">
                    <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {challenge.title}
                    </h3>
                    <div className="prose prose-sm prose-slate max-w-none text-slate-600 dark:text-slate-400">
                      <p>{challenge.description}</p>
                    </div>
                  </div>
                )}
                <div className="h-[500px] overflow-hidden rounded-xl border border-slate-200">
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
              <div className="rounded-xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5 p-6 text-center">
                <Code className="mx-auto mb-2 h-10 w-10 text-slate-400" />
                <p className="text-sm text-slate-500">
                  No challenge has been configured for this lesson yet.
                </p>
              </div>
            )}

            {lesson.content_type === "quiz" && (
              <QuizTaker lessonId={lessonId} onComplete={handleComplete} />
            )}

            {lesson.content_type === "file_upload" && (
              <FileUploader
                lessonId={lessonId}
                content={lesson.content}
                onComplete={handleComplete}
              />
            )}

            {lesson.content_type === "interactive" && (
              <InteractiveTaker
                lessonId={lessonId}
                content={lesson.content}
                onComplete={handleComplete}
              />
            )}
          </div>

          {/* Exercises (rendered below, full-width for game types) */}
          {exercises.length === 0 && null}
        </div>

        {/* Exercises — full-width section for interactive/game types */}
        {exercises.length > 0 && (
          <div className="mb-8 space-y-6 px-4 sm:px-6">
            <h2 className="mx-auto max-w-3xl text-lg font-semibold text-slate-800 dark:text-slate-200">
              Exercises
            </h2>
            {exercises.map((ex) => (
              <ExerciseRenderer
                key={ex.id}
                exercise={ex as any}
                courseId={courseId}
                prevLesson={prevLesson ? { id: prevLesson.lesson.id, title: prevLesson.lesson.title } : null}
                nextLesson={nextLesson ? { id: nextLesson.lesson.id, title: nextLesson.lesson.title } : null}
              />
            ))}
          </div>
        )}

        <div className="mx-auto max-w-3xl px-6">
          {/* Complete button — only show when there are NO exercises */}
          {!isCompleted && exercises.length === 0 && (
            <div className="mb-8">
              <Button onClick={handleComplete} disabled={completing} className="w-full">
                <CheckCircle className="mr-2 h-4 w-4" />
                {completing ? "Marking as complete..." : "Mark Lesson as Complete"}
              </Button>
            </div>
          )}

          {/* Prev/Next navigation */}
          <div className="flex items-center justify-between border-t border-slate-200 dark:border-white/10 pt-6">
            {prevLesson ? (
              <Link
                href={`/courses/${courseId}/lessons/${prevLesson.lesson.id}`}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5"
              >
                <ArrowLeft className="h-4 w-4" />
                <div className="text-left">
                  <div className="text-xs uppercase text-slate-400">Previous</div>
                  <div className="max-w-[200px] truncate">{prevLesson.lesson.title}</div>
                </div>
              </Link>
            ) : (
              <div />
            )}

            {nextLesson ? (
              <Link
                href={`/courses/${courseId}/lessons/${nextLesson.lesson.id}`}
                className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-500/20 dark:text-indigo-300 dark:hover:bg-indigo-500/30"
              >
                <div className="text-right">
                  <div className="text-xs uppercase text-indigo-400">Next</div>
                  <div className="max-w-[200px] truncate">{nextLesson.lesson.title}</div>
                </div>
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <Link
                href={`/courses/${courseId}`}
                className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/30"
              >
                <CheckCircle className="h-4 w-4" />
                Back to Course
              </Link>
            )}
          </div>

          {/* Discussion */}
          <div className="mt-8">
            <CommentSection lessonId={lessonId} />
          </div>
        </div>
      </div>
    </div>
  );
}

function getEmbedUrl(url: string): string {
  // Convert YouTube URLs to embed format
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;

  // Convert Vimeo URLs to embed format
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;

  return url;
}

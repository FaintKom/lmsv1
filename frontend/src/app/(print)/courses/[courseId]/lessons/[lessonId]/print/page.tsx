"use client";

/**
 * Print view of a SINGLE lesson — a teacher can Cmd+P / "Save as PDF" to
 * hand out the lesson in an offline class. Mirrors the course-wide print
 * page (`../../../print/page.tsx`): same `(print)` layout group, same
 * `?variant=student|teacher` switch, same `window.print()` button.
 *
 *   - teacher variant → answer key (correct answers / solutions shown)
 *   - student variant → blank worksheet (answers hidden, fill in by hand)
 *
 * Content reuses the same data the lesson player loads:
 *   GET /courses/{id}                         → course title (header)
 *   GET /courses/{id}/lessons/{lid}           → lesson + content (body)
 *   GET /exercises/by-lesson/{lid}            → attached exercises
 *   GET /assessments/lessons/{lid}/quiz       → quiz (for quiz lessons)
 *
 * Auth: apiClient sends the teacher's JWT, so the backend returns full
 * answer data; the `variant` only controls what we *display*.
 */

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import apiClient from "@/lib/api-client";
import { ContentRenderer } from "@/components/common/content-renderer";
import { useTranslation } from "@/lib/i18n/context";
import {
  isOnlineOnlyContentType,
  parseVariant,
  variantShowsAnswers,
  type PrintVariant,
} from "@/lib/print";
import type { Lesson, LessonBlock } from "@/types/api";

interface QuizOption {
  text?: string;
  is_correct?: boolean;
}
interface QuizQuestion {
  id: string;
  question_text: string;
  question_type: string;
  options?: QuizOption[] | null;
  correct_answer?: string | null;
  points: number;
  sort_order: number;
}
interface QuizData {
  title: string;
  passing_score: number;
  questions: QuizQuestion[];
}

interface ExerciseQuestion {
  question_text: string;
  question_type: string;
  options?: QuizOption[] | null;
  correct_answer?: string | null;
  points?: number;
  sort_order?: number;
}
interface ExerciseTestCase {
  input?: string;
  expected_output: string;
  is_hidden?: boolean;
}
interface ExerciseData {
  id: string;
  exercise_type: string;
  title: string;
  config?: Record<string, unknown>;
  questions?: ExerciseQuestion[] | null;
  test_cases?: ExerciseTestCase[] | null;
}

export default function LessonPrintPage() {
  const params = useParams();
  const search = useSearchParams();
  const { t } = useTranslation();

  const courseId = String(params.courseId);
  const lessonId = String(params.lessonId);
  const variant: PrintVariant = parseVariant(search.get("variant"));
  const showAnswers = variantShowsAnswers(variant);

  const [courseTitle, setCourseTitle] = useState<string>("");
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [exercises, setExercises] = useState<ExerciseData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [courseRes, lessonRes] = await Promise.all([
          apiClient.get(`/courses/${courseId}`),
          apiClient.get(`/courses/${courseId}/lessons/${lessonId}`),
        ]);
        if (cancelled) return;
        setCourseTitle(courseRes.data?.title || "");
        setLesson(lessonRes.data);

        // Quiz lessons: the by-lesson quiz endpoint returns correct
        // answers for teachers/admins (stripped for students server-side).
        if (lessonRes.data?.content_type === "quiz") {
          try {
            const quizRes = await apiClient.get(
              `/assessments/lessons/${lessonId}/quiz`,
            );
            if (!cancelled) setQuiz(quizRes.data);
          } catch {
            if (!cancelled) setQuiz(null);
          }
        }

        try {
          const exRes = await apiClient.get(`/exercises/by-lesson/${lessonId}`);
          if (!cancelled) setExercises(exRes.data || []);
        } catch {
          if (!cancelled) setExercises([]);
        }
      } catch (e) {
        if (!cancelled) {
          const detail = (e as { response?: { data?: { detail?: string } } })
            .response?.data?.detail;
          setError(detail || t("print.loadFailed"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [courseId, lessonId, t]);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl p-8">
        <h1 className="text-2xl font-bold text-danger-fg">
          {t("print.cannotRender")}
        </h1>
        <p className="mt-2 text-sm text-text-muted">{error}</p>
      </div>
    );
  }
  if (loading || !lesson) {
    return (
      <div className="mx-auto max-w-3xl p-8 text-sm text-text-muted">
        {t("print.loading")}
      </div>
    );
  }

  const v2Blocks =
    lesson.content?.version === 2 ? lesson.content.blocks || [] : null;
  const legacyBody =
    typeof lesson.content?.body === "string"
      ? (lesson.content.body as string)
      : "";
  const legacyFormat =
    (lesson.content?.format as "markdown" | "html" | "tiptap") || "markdown";

  return (
    <article className="mx-auto max-w-3xl px-8 py-10 text-base leading-relaxed">
      <header className="mb-8 border-b border-border-strong pb-6">
        <p className="text-xs uppercase tracking-wide text-text-muted">
          {variant === "teacher" ? t("print.answerKey") : t("print.worksheet")}
          {courseTitle ? ` · ${courseTitle}` : ""}
        </p>
        <h1 className="mt-2 text-3xl font-bold text-text">{lesson.title}</h1>
        <p className="mt-1 text-xs text-text-subtle">
          {lesson.content_type.replace(/_/g, " ")}
          {lesson.duration_minutes
            ? ` · ~${lesson.duration_minutes} ${t("print.minutes")}`
            : ""}
        </p>
      </header>

      {/* Rich theory / text body — works for every lesson type that has one */}
      {v2Blocks ? (
        <div className="space-y-6">
          {v2Blocks
            .slice()
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((block) => (
              <PrintBlock key={block.id} block={block} />
            ))}
        </div>
      ) : legacyBody.trim() ? (
        <div className="prose prose-slate max-w-none">
          <ContentRenderer body={legacyBody} format={legacyFormat} />
        </div>
      ) : null}

      {/* Interactive-only content types: nothing meaningful to print */}
      {!v2Blocks && isOnlineOnlyContentType(lesson.content_type) && (
        <OnlineOnlyNote label={t("print.interactiveOnline")} />
      )}

      {/* Theory slide decks live in an iframe that won't print */}
      {lesson.content_type === "theory" && !legacyBody.trim() && (
        <OnlineOnlyNote label={t("print.theoryOnline")} />
      )}

      {/* Video lessons */}
      {lesson.content_type === "video" && !v2Blocks && (
        <OnlineOnlyNote label={t("print.videoOnline")} />
      )}

      {/* Quiz lesson — static printable question list */}
      {quiz && quiz.questions.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-xl font-semibold text-text">{quiz.title}</h2>
          <QuestionList
            questions={quiz.questions}
            showAnswers={showAnswers}
            answerLabel={t("print.answer")}
          />
        </section>
      )}

      {/* Attached exercises */}
      {exercises.length > 0 && (
        <section className="mt-8 space-y-4">
          <h2 className="text-xl font-semibold text-text">
            {t("print.exercises")}
          </h2>
          {exercises.map((ex) => (
            <PrintExercise
              key={ex.id}
              exercise={ex}
              showAnswers={showAnswers}
              t={t}
            />
          ))}
        </section>
      )}

      <footer className="no-print mt-10 border-t border-border-strong pt-6 text-center text-xs text-text-subtle">
        <button
          onClick={() => window.print()}
          className="rounded-lg border border-border-strong bg-paper-2 px-3 py-1.5 text-sm text-text hover:bg-surface-2"
        >
          {t("print.button")}
        </button>
        <p className="mt-2">
          {variant === "teacher"
            ? t("print.answerKeyHint")
            : t("print.worksheetHint")}
        </p>
      </footer>
    </article>
  );
}

function PrintBlock({ block }: { block: LessonBlock }) {
  const { t } = useTranslation();
  if ((block.type === "text" || block.type === "html") && block.body) {
    return (
      <div className="prose prose-slate max-w-none">
        <ContentRenderer
          body={block.body}
          format={(block.format as "markdown" | "html" | "tiptap") || "html"}
        />
      </div>
    );
  }
  if (block.type === "video") {
    return <OnlineOnlyNote label={t("print.videoOnline")} />;
  }
  // Exercise blocks are rendered from the dedicated exercises list below.
  return null;
}

function OnlineOnlyNote({ label }: { label: string }) {
  return (
    <p className="mt-6 rounded-lg border border-dashed border-border-strong bg-paper-2 px-4 py-3 text-sm italic text-text-muted">
      {label}
    </p>
  );
}

function QuestionList({
  questions,
  showAnswers,
  answerLabel,
}: {
  questions: (QuizQuestion | ExerciseQuestion)[];
  showAnswers: boolean;
  answerLabel: string;
}) {
  const sorted = questions
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  return (
    <ol className="list-decimal space-y-3 pl-5 text-sm text-text">
      {sorted.map((q, i) => (
        <li key={i}>
          <p>{q.question_text}</p>
          {q.options && q.options.length > 0 ? (
            <ul className="ml-2 mt-1 space-y-0.5">
              {q.options.map((opt, oi) => (
                <li key={oi} className="text-text">
                  {String.fromCharCode(65 + oi)}. {opt.text}
                  {showAnswers && opt.is_correct && (
                    <span className="ml-2 font-semibold text-success-fg">
                      &#10003;
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            // Open-ended question: blank line to write on (worksheet) or
            // the model answer (answer key).
            <div className="ml-2 mt-1">
              {showAnswers && q.correct_answer ? (
                <p className="text-xs text-success-fg">
                  {answerLabel}: <code>{q.correct_answer}</code>
                </p>
              ) : (
                <div className="mt-2 h-8 border-b border-dotted border-border-strong" />
              )}
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}

function PrintExercise({
  exercise,
  showAnswers,
  t,
}: {
  exercise: ExerciseData;
  showAnswers: boolean;
  t: (key: string) => string;
}) {
  return (
    <div className="rounded-lg border border-border-strong bg-paper-2 p-3">
      <p className="text-xs font-semibold uppercase text-text-subtle">
        {exercise.exercise_type.replace(/_/g, " ")}
      </p>
      <p className="text-sm font-medium text-text">{exercise.title}</p>

      {exercise.questions && exercise.questions.length > 0 && (
        <div className="mt-2">
          <QuestionList
            questions={exercise.questions}
            showAnswers={showAnswers}
            answerLabel={t("print.answer")}
          />
        </div>
      )}

      {exercise.test_cases && exercise.test_cases.length > 0 && (
        <div className="mt-2 space-y-1 text-xs text-text-muted">
          <p className="font-semibold">{t("print.testCases")}</p>
          {exercise.test_cases.map((tc, i) => (
            <p key={i} className="font-mono">
              in: <code>{tc.input || "(none)"}</code>
              {(showAnswers || !tc.is_hidden) && (
                <>
                  {" "}
                  &rarr; out: <code>{tc.expected_output || "(empty)"}</code>
                </>
              )}
              {tc.is_hidden && (
                <span className="ml-2 text-text-subtle">
                  [{t("print.hidden")}]
                </span>
              )}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

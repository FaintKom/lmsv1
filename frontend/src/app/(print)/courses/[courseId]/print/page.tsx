"use client";

/**
 * Print view of a course. Reads `?variant=student|teacher` from the URL
 * (defaults to teacher) and fetches the course's full export JSON from
 * the backend, then renders it in a single tall scrollable column
 * suitable for Cmd+P or Playwright's `page.pdf()`.
 *
 * The teacher variant includes:
 *   - correct answers on quiz questions
 *   - solution_code / final_answer / accepted_answers fields
 *   - hidden test-case expected outputs
 *
 * Auth: relies on the apiClient picking up the JWT from localStorage.
 * For server-side PDF rendering by Playwright a follow-up will add a
 * one-shot signed `?token=` query param the backend mints; until then
 * Playwright must be primed with a logged-in session cookie.
 */

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import apiClient from "@/lib/api-client";

interface ExportedQuestion {
 question_text: string;
 question_type: string;
 options?: Array<{ text?: string; is_correct?: boolean }> | null;
 correct_answer?: string | null;
 points: number;
 sort_order: number;
}

interface ExportedTestCase {
 input: string;
 expected_output: string;
 is_hidden: boolean;
 sort_order: number;
}

interface ExportedExercise {
 exercise_type: string;
 title: string;
 sort_order: number;
 max_attempts?: number | null;
 config: Record<string, unknown>;
 questions: ExportedQuestion[];
 test_cases: ExportedTestCase[];
}

interface ExportedLesson {
 title: string;
 content_type: string;
 content: Record<string, unknown>;
 sort_order: number;
 duration_minutes?: number | null;
 exercises: ExportedExercise[];
}

interface ExportedModule {
 title: string;
 sort_order: number;
 lessons: ExportedLesson[];
}

interface ExportedCourse {
 schema: string;
 variant: "student" | "teacher";
 title: string;
 slug: string;
 description: string;
 category?: string | null;
 modules: ExportedModule[];
}

export default function CoursePrintPage() {
 const params = useParams();
 const search = useSearchParams();
 const courseId = String(params.courseId);
 const variant = (search.get("variant") === "student" ? "student" : "teacher") as
 | "student"
 | "teacher";

 const [course, setCourse] = useState<ExportedCourse | null>(null);
 const [error, setError] = useState<string | null>(null);

 useEffect(() => {
 apiClient
 .get<ExportedCourse>(
 `/courses/${courseId}/export?format=json&variant=${variant}`
 )
 .then(({ data }) => setCourse(data))
 .catch((e: { response?: { data?: { detail?: string } } }) => {
 setError(e.response?.data?.detail || "Failed to load course");
 });
 }, [courseId, variant]);

 if (error) {
 return (
 <div className="mx-auto max-w-3xl p-8">
 <h1 className="text-2xl font-bold text-danger-fg">Cannot render</h1>
 <p className="mt-2 text-sm text-text-muted">{error}</p>
 </div>
 );
 }
 if (!course) {
 return (
 <div className="mx-auto max-w-3xl p-8 text-sm text-text-muted">Loading...</div>
 );
 }

 return (
 <article className="mx-auto max-w-3xl px-8 py-10 text-base leading-relaxed">
 <header className="mb-8 border-b border-border-strong pb-6">
 <p className="text-xs uppercase tracking-wide text-text-muted">
 {variant} variant · {course.modules.length} module
 {course.modules.length === 1 ? "" : "s"}
 </p>
 <h1 className="mt-2 text-3xl font-bold text-text">{course.title}</h1>
 {course.description && (
 <p className="mt-2 text-sm text-text-muted">{course.description}</p>
 )}
 {course.category && (
 <p className="mt-1 text-xs text-text-subtle">Category: {course.category}</p>
 )}
 </header>

 {course.modules.map((m, mi) => (
 <section key={mi} className="page-break mb-10">
 <h2 className="mb-4 text-2xl font-semibold text-text">
 {mi + 1}. {m.title}
 </h2>
 {m.lessons.map((l, li) => (
 <ModuleLesson
 key={li}
 lesson={l}
 number={`${mi + 1}.${li + 1}`}
 variant={variant}
 />
 ))}
 </section>
 ))}

 <footer className="no-print mt-10 border-t border-border-strong pt-6 text-center text-xs text-text-subtle">
 <button
 onClick={() => window.print()}
 className="rounded-lg border border-border-strong bg-paper-2 px-3 py-1.5 text-sm text-text hover:bg-surface-2"
 >
 Print / Save as PDF
 </button>
 </footer>
 </article>
 );
}

function ModuleLesson({
 lesson,
 number,
 variant,
}: {
 lesson: ExportedLesson;
 number: string;
 variant: "student" | "teacher";
}) {
 return (
 <div className="mb-6 border-l-2 border-border-strong pl-4">
 <h3 className="text-lg font-medium text-text">
 {number} {lesson.title}
 </h3>
 {lesson.duration_minutes && (
 <p className="text-xs text-text-subtle">
 ~{lesson.duration_minutes} min · {lesson.content_type}
 </p>
 )}
 <LessonContent content={lesson.content} />
 {lesson.exercises.length > 0 && (
 <div className="mt-3 space-y-3">
 {lesson.exercises.map((ex, i) => (
 <ExerciseBlock key={i} exercise={ex} variant={variant} />
 ))}
 </div>
 )}
 </div>
 );
}

function LessonContent({ content }: { content: Record<string, unknown> }) {
 // Heuristic: TipTap blocks live under `blocks` / `body` / `text` /
 // similar keys. For MVP we render the first string-ish payload we find
 // and ignore deep block trees (those need the real block-renderer).
 const body =
 (content?.body as string | undefined) ||
 (content?.text as string | undefined) ||
 (content?.html as string | undefined) ||
 "";
 if (!body) return null;
 return (
 <p className="mt-2 whitespace-pre-wrap text-sm text-text">
 {String(body).slice(0, 4000)}
 </p>
 );
}

function ExerciseBlock({
 exercise,
 variant,
}: {
 exercise: ExportedExercise;
 variant: "student" | "teacher";
}) {
 const isTeacher = variant === "teacher";
 return (
 <div className="rounded-lg border border-border-strong bg-paper-2 p-3">
 <p className="text-xs font-semibold uppercase text-text-subtle">
 {exercise.exercise_type.replace(/_/g, " ")}
 </p>
 <p className="text-sm font-medium text-text">{exercise.title}</p>
 {exercise.config && Object.keys(exercise.config).length > 0 && (
 <ExerciseConfig
 config={exercise.config}
 type={exercise.exercise_type}
 isTeacher={isTeacher}
 />
 )}
 {exercise.questions.length > 0 && (
 <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm text-text">
 {exercise.questions.map((q, i) => (
 <li key={i}>
 <p>{q.question_text}</p>
 {q.options && q.options.length > 0 && (
 <ul className="ml-2 mt-1 space-y-0.5">
 {q.options.map((opt, oi) => (
 <li key={oi} className="text-text">
 {String.fromCharCode(65 + oi)}. {opt.text}
 {isTeacher && opt.is_correct && (
 <span className="ml-2 text-success-fg">✓</span>
 )}
 </li>
 ))}
 </ul>
 )}
 {isTeacher && q.correct_answer && (
 <p className="mt-1 text-xs text-success-fg">
 Answer: <code>{q.correct_answer}</code>
 </p>
 )}
 </li>
 ))}
 </ol>
 )}
 {exercise.test_cases.length > 0 && (
 <div className="mt-2 space-y-1 text-xs text-text-muted">
 <p className="font-semibold">Test cases:</p>
 {exercise.test_cases.map((tc, i) => (
 <p key={i} className="font-mono">
 in: <code>{tc.input || "(none)"}</code>
 {(isTeacher || !tc.is_hidden) && (
 <>
 {" "}
 → out: <code>{tc.expected_output || "(empty)"}</code>
 </>
 )}
 {tc.is_hidden && (
 <span className="ml-2 text-text-subtle">[hidden]</span>
 )}
 </p>
 ))}
 </div>
 )}
 </div>
 );
}

function ExerciseConfig({
 config,
 type,
 isTeacher,
}: {
 config: Record<string, unknown>;
 type: string;
 isTeacher: boolean;
}) {
 // Render a short, type-aware preview of the exercise config.
 const lines: string[] = [];
 const c = config as Record<string, unknown>;

 if (type === "math_stepwise") {
 if (c.problem) lines.push(`Problem: ${c.problem}`);
 if (isTeacher && c.final_answer) lines.push(`Expected: ${c.final_answer}`);
 if (isTeacher && Array.isArray(c.expected_steps)) {
 lines.push(`Steps: ${(c.expected_steps as string[]).join(" → ")}`);
 }
 } else if (type === "true_false") {
 if (c.statement) lines.push(`Statement: ${c.statement}`);
 if (isTeacher) lines.push(`Answer: ${c.correct_answer ? "True" : "False"}`);
 } else if (type === "fill_blanks") {
 if (c.text) lines.push(`Text: ${c.text}`);
 if (isTeacher && Array.isArray(c.blanks)) {
 lines.push(`Blanks: ${(c.blanks as string[]).join(", ")}`);
 }
 } else if (type === "translation") {
 if (c.source_text) lines.push(`Source: ${c.source_text}`);
 if (isTeacher && Array.isArray(c.accepted_answers)) {
 lines.push(`Accepted: ${(c.accepted_answers as string[]).join(", ")}`);
 }
 } else if (type === "scorm_package") {
 lines.push(
 `Package: ${(c.title as string) || (c.package_id as string) || "(unset)"}`
 );
 lines.push(`Format: ${c.format || "scorm12"} · launch: ${c.launch_url || "n/a"}`);
 } else if (type === "code_challenge") {
 if (c.language) lines.push(`Language: ${c.language}`);
 if (isTeacher && c.solution_code) {
 lines.push(`Solution: ${String(c.solution_code).slice(0, 200)}...`);
 }
 }

 if (lines.length === 0) return null;
 return (
 <div className="mt-2 space-y-0.5 text-xs text-text-muted">
 {lines.map((line, i) => (
 <p key={i} className="whitespace-pre-wrap">
 {line}
 </p>
 ))}
 </div>
 );
}

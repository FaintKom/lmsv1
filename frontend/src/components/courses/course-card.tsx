import Link from "next/link";
import type { Course } from "@/types/api";

const SUBJECT_THEMES: Record<string, { gradient: string; glyph: string }> = {
 programming: { gradient: "radial-gradient(circle at 75% 25%, var(--green-600), var(--ink-900))", glyph: "</>" },
 math: { gradient: "radial-gradient(circle at 75% 25%, var(--green-500), var(--green-800))", glyph: "Σ" },
 algebra: { gradient: "radial-gradient(circle at 75% 25%, var(--green-500), var(--green-800))", glyph: "x²" },
 geometry: { gradient: "radial-gradient(circle at 75% 25%, var(--green-400), var(--green-700))", glyph: "△" },
 languages: { gradient: "radial-gradient(circle at 75% 25%, var(--coral-500), #7a2e15)", glyph: "Ñ" },
 spanish: { gradient: "radial-gradient(circle at 75% 25%, var(--coral-500), #7a2e15)", glyph: "Ñ" },
 sat: { gradient: "radial-gradient(circle at 75% 25%, var(--sun-400), var(--sun-700))", glyph: "★" },
 science: { gradient: "radial-gradient(circle at 75% 25%, var(--green-600), var(--ink-900))", glyph: "⚗" },
 python: { gradient: "radial-gradient(circle at 75% 25%, var(--green-600), var(--ink-900))", glyph: "Py" },
 javascript: { gradient: "radial-gradient(circle at 75% 25%, var(--sun-400), var(--ink-900))", glyph: "JS" },
};

const DEFAULT_THEME = { gradient: "radial-gradient(circle at 75% 25%, var(--green-500), var(--green-800))", glyph: "📚" };

interface CourseCardProps {
 course: Course;
 progress?: number;
}

export function CourseCard({ course, progress }: CourseCardProps) {
 const theme = SUBJECT_THEMES[course.category || ""] || DEFAULT_THEME;

 return (
 <Link href={`/courses/${course.id}`} className="group">
 <div className="overflow-hidden rounded-[18px] border border-border bg-paper-2 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-green-300 hover:shadow-md">
 {/* Cover */}
 {course.thumbnail_url ? (
 <div className="relative h-36 overflow-hidden">
 <img
 src={course.thumbnail_url}
 alt={course.title}
 className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
 />
 <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40" />
 </div>
 ) : (
 <div
 className="relative flex h-36 items-end overflow-hidden p-4"
 style={{ background: theme.gradient }}
 >
 <span className="absolute right-4 top-3 font-mono text-[32px] font-extrabold text-white/25">
 {theme.glyph}
 </span>
 <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40" />
 {course.category && (
 <span className="relative font-mono text-[10px] font-medium uppercase tracking-widest text-white/85">
 {course.category}
 </span>
 )}
 </div>
 )}

 {/* Body */}
 <div className="p-5">
 <h3 className="mb-1 text-[14px] font-extrabold leading-snug text-text">
 {course.title}
 </h3>
 {course.description && (
 <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-text-muted">
 {course.description}
 </p>
 )}
 {progress !== undefined && (
 <div>
 <div className="mb-1.5 flex justify-between">
 <span className="font-mono text-[11px] font-bold text-primary">
 {Math.round(progress)}%
 </span>
 </div>
 <div
 className="h-[10px] overflow-hidden rounded-pill bg-ink-100"
 role="progressbar"
 aria-valuenow={Math.round(progress)}
 aria-valuemin={0}
 aria-valuemax={100}
 aria-label={`Course progress: ${Math.round(progress)}%`}
 >
 <div
 className="h-full rounded-pill transition-all duration-500"
 style={{
 width: `${progress}%`,
 background: "linear-gradient(90deg, var(--green-400), var(--green-600))",
 }}
 />
 </div>
 </div>
 )}
 </div>
 </div>
 </Link>
 );
}

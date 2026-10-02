"use client";

import { useState } from "react";
import Link from "next/link";
import type { Course } from "@/types/api";
import { ProgressBar } from "@/components/ui/progress-bar";
import { coverArtProps } from "@/lib/course-cover";
import { SUBJECT_SURFACE, subjectOf } from "@/lib/subject";

interface CourseCardProps {
 course: Course;
 progress?: number;
}

/**
 * A course in the catalog. Without a thumbnail the cover is the subject's
 * field colour with the title set on it (specs/071, direction C) and a line
 * drawing of the subject on the right (specs/073); the old
 * cover was the same green gradient with a watermark glyph on every course.
 * Hover lifts the card 2px (MOTION.md M5); Tailwind's `hover:` only fires on
 * devices that can hover, so a tap never leaves it raised.
 */
export function CourseCard({ course, progress }: CourseCardProps) {
 // Broken thumbnail URL falls back to the field cover (specs/016 US1 edge case)
 const [imageFailed, setImageFailed] = useState(false);
 const subject = subjectOf(course.category);

 return (
 <Link href={`/courses/${course.id}`} className="group" data-subject={subject}>
 <div className="overflow-hidden rounded-lg bg-surface transition-transform duration-[var(--motion-fast)] ease-[var(--motion-ease)] motion-safe:group-hover:-translate-y-0.5">
 {course.thumbnail_url && !imageFailed ? (
 <div className="h-36 overflow-hidden">
 <img
 src={course.thumbnail_url}
 alt={course.title}
 onError={() => setImageFailed(true)}
 className="h-full w-full object-cover"
 />
 </div>
 ) : (
 <div className={`relative isolate flex h-36 flex-col justify-between overflow-hidden p-4 text-subject-ink ${SUBJECT_SURFACE[subject]}`}>
 <svg {...coverArtProps(subject, course.id)} className="pointer-events-none absolute inset-0 -z-10 h-full w-full" />
 <span className="text-xs font-medium opacity-80">{course.category}</span>
 <h3 className="max-w-[60%] text-lg font-semibold leading-tight line-clamp-2">{course.title}</h3>
 </div>
 )}

 <div className="grid gap-3 p-5">
 {course.thumbnail_url && !imageFailed && (
 <h3 className="text-md font-semibold leading-snug text-text">{course.title}</h3>
 )}
 {course.description && (
 <p className="line-clamp-2 text-sm leading-relaxed text-text-muted">{course.description}</p>
 )}
 {progress !== undefined && (
 <div className="flex items-center gap-3">
 <ProgressBar value={progress} size="sm" />
 <span className="text-xs font-medium tabular-nums text-text-muted">{Math.round(progress)}%</span>
 </div>
 )}
 </div>
 </div>
 </Link>
 );
}

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen } from "lucide-react";
import type { Course } from "@/types/api";

const CATEGORY_GRADIENTS: Record<string, string> = {
 programming: "from-green-500 to-emerald-600",
 math: "from-emerald-500 to-teal-600",
 languages: "from-amber-500 to-orange-600",
};

interface CourseCardProps {
 course: Course;
 progress?: number;
}

export function CourseCard({ course, progress }: CourseCardProps) {
 const gradient =
 CATEGORY_GRADIENTS[course.category || ""] ||
 "from-green-500 to-emerald-600";

 return (
 <Link href={`/courses/${course.id}`}>
 <Card className="group overflow-hidden transition-all hover:shadow-lg hover:shadow-green-100 ">
 {course.thumbnail_url ? (
 <div className="h-36 overflow-hidden">
 <img
 src={course.thumbnail_url}
 alt={course.title}
 className="h-full w-full object-cover transition-transform group-hover:scale-105"
 />
 </div>
 ) : (
 <div
 className={`flex h-36 items-center justify-center bg-gradient-to-br ${gradient}`}
 >
 <BookOpen className="h-10 w-10 text-white/80" />
 </div>
 )}
 <CardContent className="p-5">
 {course.category && (
 <span className="mb-2 inline-block rounded-pill bg-success-soft px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-primary ">
 {course.category}
 </span>
 )}
 <h3 className="mb-1 font-semibold text-text ">{course.title}</h3>
 <p className="mb-3 line-clamp-2 text-base leading-relaxed text-text-muted ">
 {course.description}
 </p>
 {progress !== undefined && (
 <div>
 <div className="mb-1 flex justify-between text-xs text-text-muted ">
 <span>Progress</span>
 <span className="font-semibold text-primary">
 {Math.round(progress)}%
 </span>
 </div>
 <div className="h-1.5 overflow-hidden rounded-pill bg-ink-100 " role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label={"Course progress: " + Math.round(progress) + "%"}>
 <div
 className="h-full rounded-pill bg-primary transition-all"
 style={{ width: `${progress}%` }}
 />
 </div>
 </div>
 )}
 </CardContent>
 </Card>
 </Link>
 );
}

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen } from "lucide-react";
import type { Course } from "@/types/api";

const CATEGORY_GRADIENTS: Record<string, string> = {
  programming: "from-green-500 to-green-600",
  math: "from-green-500 to-green-600",
  languages: "from-sun-500 to-sun-500",
};

interface CourseCardProps {
  course: Course;
  progress?: number;
}

export function CourseCard({ course, progress }: CourseCardProps) {
  const gradient =
    CATEGORY_GRADIENTS[course.category || ""] ||
    "from-green-500 to-green-600";

  return (
    <Link href={`/courses/${course.id}`}>
      <Card className="group overflow-hidden transition-all hover:shadow-lg hover:shadow-green-100 dark:hover:shadow-none">
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
            <span className="mb-2 inline-block rounded-full bg-green-50 dark:bg-green-500/20 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-green-600 dark:text-green-400">
              {course.category}
            </span>
          )}
          <h3 className="mb-1 font-semibold text-ink-900 dark:text-ink-100">{course.title}</h3>
          <p className="mb-3 line-clamp-2 text-base leading-relaxed text-ink-500 dark:text-ink-400">
            {course.description}
          </p>
          {progress !== undefined && (
            <div>
              <div className="mb-1 flex justify-between text-xs text-ink-500 dark:text-ink-400">
                <span>Progress</span>
                <span className="font-semibold text-green-600">
                  {Math.round(progress)}%
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-ink-100 dark:bg-white/10" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label={"Course progress: " + Math.round(progress) + "%"}>
                <div
                  className="h-full rounded-full bg-green-500 transition-all"
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

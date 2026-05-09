"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
 BookOpen,
 Code,
 FileText,
 PlayCircle,
 CheckCircle,
 ArrowLeft,
 Clock,
 Bot,
 Calculator,
 Box,
 type LucideIcon,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import type { Course } from "@/types/api";

const CONTENT_ICONS: Record<string, LucideIcon> = {
 text: FileText,
 video: PlayCircle,
 quiz: CheckCircle,
 code_challenge: Code,
 robot_2d: Bot,
 math_interactive: Calculator,
 world_3d: Box,
};

const CONTENT_COLORS: Record<string, string> = {
 text: "bg-info-soft text-info-fg",
 video: "bg-danger-soft text-danger-fg",
 quiz: "bg-success-soft text-primary",
 code_challenge: "bg-success-soft text-primary",
};

export default function CourseDetailPage() {
 const params = useParams();
 const user = useAuthStore((s) => s.user);
 const [course, setCourse] = useState<Course | null>(null);
 const [loading, setLoading] = useState(true);
 const [enrolling, setEnrolling] = useState(false);
 const [enrolled, setEnrolled] = useState(false);

 // Admins/teachers/super_admins can always access lessons (preview mode)
 const canPreview = user?.role === "super_admin" || user?.role === "admin" || user?.role === "teacher";
 const canAccessLessons = enrolled || canPreview;

 useEffect(() => {
 apiClient
 .get(`/courses/${params.courseId}`)
 .then(({ data }) => setCourse(data))
 .catch(() => {})
 .finally(() => setLoading(false));

 // Check if already enrolled
 apiClient
 .get("/progress/my-courses")
 .then(({ data }) => {
 const found = data.find(
 (e: { course_id: string }) => e.course_id === params.courseId
 );
 if (found) setEnrolled(true);
 })
 .catch(() => {});
 }, [params.courseId]);

 const handleEnroll = async () => {
 setEnrolling(true);
 try {
 await apiClient.post("/progress/enroll/", {
 course_id: params.courseId,
 });
 setEnrolled(true);
 toast.success("Successfully enrolled in the course!");
 } catch {
 toast.error("Failed to enroll (may already be enrolled)");
 } finally {
 setEnrolling(false);
 }
 };

 if (loading || !course) {
 return (
 <div className="flex h-64 items-center justify-center">
 <div className="h-1.5 w-24 overflow-hidden rounded-pill bg-ink-200">
 <div className="h-full w-1/2 animate-pulse rounded-pill bg-primary" />
 </div>
 </div>
 );
 }

 const totalLessons =
 course.modules?.reduce(
 (acc, m) => acc + (m.lessons?.length || 0),
 0
 ) || 0;

 return (
 <div className="mx-auto max-w-4xl">
 {/* Course Header */}
 <div className="mb-8 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 p-8 text-white">
 <div className="flex items-start justify-between">
 <div>
 {course.category && (
 <span className="mb-3 inline-block rounded-pill bg-paper-2/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
 {course.category}
 </span>
 )}
 <h1 className="mb-3 text-3xl font-bold">{course.title}</h1>
 <p className="mb-4 max-w-xl text-success-soft">
 {course.description}
 </p>
 <div className="flex items-center gap-4 text-sm text-white/70">
 <span className="flex items-center gap-1">
 <BookOpen className="h-4 w-4" />
 {course.modules?.length || 0} modules
 </span>
 <span className="flex items-center gap-1">
 <FileText className="h-4 w-4" />
 {totalLessons} lessons
 </span>
 </div>
 </div>
 </div>
 <div className="mt-6 flex items-center gap-3">
 {canPreview && !enrolled && (
 <span className="rounded-pill bg-paper-2/20 px-3 py-1 text-xs font-semibold text-white">
 Preview Mode
 </span>
 )}
 {enrolled ? (
 <Button
 variant="secondary"
 className="bg-paper-2/20 text-white hover:bg-paper-2/30"
 disabled
 >
 <CheckCircle className="h-4 w-4" />
 Enrolled
 </Button>
 ) : !canPreview ? (
 <Button
 onClick={handleEnroll}
 disabled={enrolling}
 className="bg-paper-2 text-success-fg hover:bg-paper-2/90"
 >
 {enrolling ? "Enrolling..." : "Enroll in Course"}
 </Button>
 ) : null}
 </div>
 </div>

 {/* Modules */}
 <div className="space-y-5">
 {course.modules?.map((module, mi) => (
 <Card key={module.id}>
 <CardHeader className="pb-2">
 <CardTitle className="flex items-center gap-2 text-base">
 <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-success-soft text-xs font-bold text-primary">
 {mi + 1}
 </span>
 {module.title}
 </CardTitle>
 </CardHeader>
 <CardContent>
 <ul className="space-y-1">
 {module.lessons?.map((lesson) => {
 const Icon =
 CONTENT_ICONS[lesson.content_type] || BookOpen;
 const colorClass =
 CONTENT_COLORS[lesson.content_type] || "bg-surface-2 text-text-muted";
 return (
 <li key={lesson.id}>
 {canAccessLessons ? (
 <Link
 href={`/courses/${params.courseId}/lessons/${lesson.id}`}
 className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-success-soft"
 >
 <div
 className={`flex h-8 w-8 items-center justify-center rounded-lg ${colorClass}`}
 >
 <Icon className="h-4 w-4" />
 </div>
 <span className="flex-1 text-sm font-medium text-success-fg hover:underline">
 {lesson.title}
 </span>
 {lesson.duration_minutes && (
 <span className="flex items-center gap-1 text-xs text-text-subtle">
 <Clock className="h-3 w-3" />
 {lesson.duration_minutes} min
 </span>
 )}
 </Link>
 ) : (
 <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-2">
 <div
 className={`flex h-8 w-8 items-center justify-center rounded-lg ${colorClass}`}
 >
 <Icon className="h-4 w-4" />
 </div>
 <span className="flex-1 text-sm font-medium text-ink-700">
 {lesson.title}
 </span>
 {lesson.duration_minutes && (
 <span className="flex items-center gap-1 text-xs text-text-subtle">
 <Clock className="h-3 w-3" />
 {lesson.duration_minutes} min
 </span>
 )}
 </div>
 )}
 </li>
 );
 })}
 </ul>
 </CardContent>
 </Card>
 ))}
 </div>
 </div>
 );
}

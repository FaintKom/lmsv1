"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import apiClient from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table2, Download } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";
import QuizSubmissionBreakdown from "@/components/assessments/quiz-submission-breakdown";

interface CourseOption {
 id: string;
 title: string;
}

interface GradebookColumn {
 id: string;
 type: string;
 title: string;
 max_score: number;
 // Present only on quiz columns — enables opening the per-question breakdown.
 quiz_id?: string;
}

interface GradebookStudent {
 id: string;
 full_name: string;
 email: string;
}

interface GradebookData {
 students: GradebookStudent[];
 columns: GradebookColumn[];
 rows: Record<string, Record<string, number | null>>;
 averages: Record<string, number | null>;
}

function scoreColor(score: number | null | undefined, max: number) {
 if (score == null) return "";
 const pct = max > 0 ? (score / max) * 100 : 0;
 if (pct >= 80) return "bg-primary-soft text-success-fg ";
 if (pct >= 60) return "bg-sun-100 text-warning-fg ";
 return "bg-danger-soft text-danger-fg ";
}

export default function GradebookPage() {
 const { t } = useTranslation();
 const typeLabel = (type: string) => {
 switch (type) {
 case "quiz": return t("admin.gradebook.typeQuiz");
 case "code": return t("admin.gradebook.typeCode");
 case "interactive": return t("admin.gradebook.typeExercise");
 case "assignment": return t("admin.gradebook.typeHw");
 default: return type;
 }
 };
 const [courses, setCourses] = useState<CourseOption[]>([]);
 const [courseId, setCourseId] = useState("");
 const [data, setData] = useState<GradebookData | null>(null);
 const [loading, setLoading] = useState(false);
 const [loadingCourses, setLoadingCourses] = useState(true);
 // Quiz cell click → open the per-question breakdown for that student.
 const [review, setReview] = useState<{ quizId: string; studentId: string; studentName: string } | null>(null);

 useEffect(() => {
 apiClient
 .get("/admin/courses")
 .then(({ data }) => setCourses(data))
 .catch(() => {})
 .finally(() => setLoadingCourses(false));
 }, []);

 useEffect(() => {
 if (!courseId) {
 setData(null);
 return;
 }
 setLoading(true);
 apiClient
 .get(`/admin/gradebook?course_id=${courseId}`)
 .then(({ data }) => setData(data))
 .catch(() => setData(null))
 .finally(() => setLoading(false));
 }, [courseId]);

 const handleExport = () => {
 if (!courseId) return;
 window.open(
 `${apiClient.defaults.baseURL}/admin/gradebook/export?course_id=${courseId}`,
 "_blank"
 );
 };

 const handleExportWithAuth = async () => {
 if (!courseId) return;
 try {
 const resp = await apiClient.get(`/admin/gradebook/export?course_id=${courseId}`, {
 responseType: "blob",
 });
 const url = URL.createObjectURL(resp.data);
 const a = document.createElement("a");
 a.href = url;
 a.download = `gradebook_${courseId}.csv`;
 a.click();
 URL.revokeObjectURL(url);
 } catch {
 // fallback
 handleExport();
 }
 };

 const handleExportXlsx = async () => {
 if (!courseId) return;
 try {
 const resp = await apiClient.get(
 `/admin/gradebook/export-xlsx?course_id=${courseId}`,
 { responseType: "blob" }
 );
 const url = URL.createObjectURL(resp.data);
 const a = document.createElement("a");
 a.href = url;
 a.download = `gradebook_${courseId}.xlsx`;
 a.click();
 URL.revokeObjectURL(url);
 } catch {
 toast.error(t("admin.gradebook.failedExcel"));
 }
 };

 if (loadingCourses) {
 return (
 <div className="mx-auto max-w-7xl">
 <Skeleton className="mb-2 h-4 w-48" />
 <Skeleton className="mb-6 h-8 w-56" />
 <Skeleton className="h-10 w-64" />
 </div>
 );
 }

 const studentAvg = (studentId: string) => {
 if (!data) return null;
 const scores = data.columns
 .map((c) => {
 const val = data.rows[studentId]?.[c.id];
 if (val == null) return null;
 return c.max_score > 0 ? (val / c.max_score) * 100 : 0;
 })
 .filter((s): s is number => s !== null);
 return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
 };

 return (
 <div>
 <div className="mb-6 flex items-center justify-between">
 <div>
 <h1 className="text-2xl font-bold text-text ">{t("admin.gradebook.title")}</h1>
 <p className="mt-1 text-sm text-text-muted ">
 {t("admin.gradebook.subtitle")}
 </p>
 </div>
 {data && data.columns.length > 0 && (
 <div className="flex items-center gap-2">
 <Button variant="outline" onClick={handleExportWithAuth}>
 <Download className="mr-2 h-4 w-4" />
 {t("admin.gradebook.csv")}
 </Button>
 <Button variant="outline" onClick={handleExportXlsx}>
 <Download className="mr-2 h-4 w-4" />
 {t("admin.gradebook.excel")}
 </Button>
 </div>
 )}
 </div>

 {/* Course selector */}
 <div className="mb-6">
 <select
 value={courseId}
 onChange={(e) => setCourseId(e.target.value)}
 className="rounded-lg border border-border-strong bg-paper-2 px-4 py-2.5 text-sm text-text focus:border-primary focus:outline-none "
 >
 <option value="">{t("admin.gradebook.selectCoursePlaceholder")}</option>
 {courses.map((c) => (
 <option key={c.id} value={c.id}>{c.title}</option>
 ))}
 </select>
 </div>

 {!courseId && (
 <Card>
 <CardContent className="flex flex-col items-center justify-center p-12 text-center">
 <div className="mb-4 rounded-pill bg-ink-100 p-4 ">
 <Table2 className="h-8 w-8 text-text-subtle " />
 </div>
 <h3 className="mb-1 text-lg font-semibold text-text-muted ">
 {t("admin.gradebook.selectCourse")}
 </h3>
 <p className="text-base text-text-muted ">
 {t("admin.gradebook.selectCourseHint")}
 </p>
 </CardContent>
 </Card>
 )}

 {loading && (
 <div className="space-y-2">
 {Array.from({ length: 5 }).map((_, i) => (
 <Skeleton key={i} className="h-10 w-full" />
 ))}
 </div>
 )}

 {data && !loading && data.students.length === 0 && courseId && (
 <Card>
 <CardContent className="flex flex-col items-center justify-center p-12 text-center">
 <h3 className="mb-1 text-lg font-semibold text-text-muted ">
 {t("admin.gradebook.noStudents")}
 </h3>
 <p className="text-base text-text-muted ">
 {t("admin.gradebook.noStudentsHint")}
 </p>
 </CardContent>
 </Card>
 )}

 {data && !loading && data.students.length > 0 && (
 <Card className="border-l-4 border-l-green-400">
 <CardContent className="overflow-x-auto p-0">
 <table className="w-full text-sm">
 <thead>
 <tr className="border-b border-border-strong ">
 <th className="sticky left-0 z-10 bg-paper-2 px-4 py-3 text-left font-semibold text-ink-700 ">
 {t("admin.gradebook.student")}
 </th>
 {data.columns.map((col) => (
 <th
 key={col.id}
 className="min-w-[100px] px-3 py-3 text-center font-medium text-text-muted "
 >
 <div className="text-xs">{typeLabel(col.type)}</div>
 <div className="truncate text-[11px] font-normal text-text-subtle " title={col.title}>
 {col.title}
 </div>
 </th>
 ))} <th className="px-3 py-3 text-center font-semibold text-ink-700 ">
 {t("admin.gradebook.avgPct")}
 </th>
 </tr>
 </thead>
 <tbody>
 {data.students.map((s, idx) => {
 const avg = studentAvg(s.id);
 return (
 <tr
 key={s.id}
 className={idx % 2 === 0 ? "bg-paper-2 " : "bg-surface-2/50 "}
 >
 <td className="sticky left-0 z-10 bg-inherit px-4 py-2.5 font-medium text-text ">
 <Link
 href={`/admin/students/${s.id}`}
 title={t("admin.studentProfile.viewProfile")}
 className="truncate max-w-[200px] block text-primary underline-offset-2 hover:underline"
 >
 {s.full_name}
 </Link>
 <div className="truncate text-[11px] text-text-subtle ">{s.email}</div>
 </td>
 {data.columns.map((col) => {
 const val = data.rows[s.id]?.[col.id];
 // Quiz cells with a recorded score open the per-question breakdown.
 const reviewable = col.type === "quiz" && col.quiz_id && val != null;
 return (
 <td key={col.id} className="px-3 py-2.5 text-center">
 {val != null ? (
 reviewable ? (
 <button
 type="button"
 onClick={() =>
 setReview({
 quizId: col.quiz_id!,
 studentId: s.id,
 studentName: s.full_name,
 })
 }
 title={t("admin.quizReview.openTitle")}
 className={`inline-block min-w-[48px] cursor-pointer rounded-md px-2 py-0.5 text-xs font-medium underline-offset-2 transition-opacity hover:opacity-80 hover:underline ${scoreColor(val, col.max_score)}`}
 >
 {val}{col.max_score !== 100 ? `/${col.max_score}` : "%"}
 </button>
 ) : (
 <span className={`inline-block min-w-[48px] rounded-md px-2 py-0.5 text-xs font-medium ${scoreColor(val, col.max_score)}`}>
 {val}{col.max_score !== 100 ? `/${col.max_score}` : "%"}
 </span>
 )
 ) : (
 <span className="text-xs text-ink-300 ">&mdash;</span>
 )}
 </td>
 );
 })}
 <td className="px-3 py-2.5 text-center">
 {avg != null ? (
 <span className={`inline-block min-w-[48px] rounded-md px-2 py-0.5 text-xs font-bold ${scoreColor(avg, 100)}`}>
 {avg}%
 </span>
 ) : (
 <span className="text-xs text-ink-300 ">&mdash;</span>
 )}
 </td>
 </tr>
 );
 })}
 {/* Averages row */}
 <tr className="border-t-2 border-ink-300 bg-surface-2 font-semibold ">
 <td className="sticky left-0 z-10 bg-surface-2 px-4 py-2.5 text-ink-700 ">
 {t("admin.gradebook.averageRow")}
 </td>
 {data.columns.map((col) => {
 const avg = data.averages[col.id];
 return (
 <td key={col.id} className="px-3 py-2.5 text-center">
 {avg != null ? (
 <span className={`inline-block min-w-[48px] rounded-md px-2 py-0.5 text-xs font-medium ${scoreColor(avg, col.max_score)}`}>
 {avg}{col.max_score !== 100 ? `/${col.max_score}` : "%"}
 </span>
 ) : (
 <span className="text-xs text-ink-300 ">&mdash;</span>
 )}
 </td>
 );
 })}
 <td className="px-3 py-2.5 text-center">&mdash;</td>
 </tr>
 </tbody>
 </table>
 </CardContent>
 </Card>
 )}

 {review && (
 <QuizSubmissionBreakdown
 quizId={review.quizId}
 studentId={review.studentId}
 studentName={review.studentName}
 onClose={() => setReview(null)}
 />
 )}
 </div>
 );
}

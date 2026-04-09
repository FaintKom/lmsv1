"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import apiClient from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table2, Download } from "lucide-react";

interface CourseOption {
  id: string;
  title: string;
}

interface GradebookColumn {
  id: string;
  type: string;
  title: string;
  max_score: number;
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
  if (pct >= 80) return "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300";
  if (pct >= 60) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300";
  return "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300";
}

function typeLabel(type: string) {
  switch (type) {
    case "quiz": return "Quiz";
    case "code": return "Code";
    case "interactive": return "Exercise";
    case "assignment": return "HW";
    default: return type;
  }
}

export default function GradebookPage() {
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [courseId, setCourseId] = useState("");
  const [data, setData] = useState<GradebookData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(true);

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
      toast.error("Failed to export Excel file");
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Gradebook</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            View and export student grades by course
          </p>
        </div>
        {data && data.columns.length > 0 && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExportWithAuth}>
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
            <Button variant="outline" onClick={handleExportXlsx}>
              <Download className="mr-2 h-4 w-4" />
              Excel
            </Button>
          </div>
        )}
      </div>

      {/* Course selector */}
      <div className="mb-6">
        <select
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-white/10 dark:bg-[#2C2C2C] dark:text-slate-100"
        >
          <option value="">Select a course...</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
      </div>

      {!courseId && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <div className="mb-4 rounded-full bg-slate-100 p-4 dark:bg-white/10">
              <Table2 className="h-8 w-8 text-slate-400 dark:text-slate-500" />
            </div>
            <h3 className="mb-1 text-lg font-semibold text-slate-600 dark:text-slate-300">
              Select a course
            </h3>
            <p className="text-base text-slate-500 dark:text-slate-400">
              Choose a course above to view the gradebook matrix.
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
            <h3 className="mb-1 text-lg font-semibold text-slate-600 dark:text-slate-300">
              No students enrolled
            </h3>
            <p className="text-base text-slate-500 dark:text-slate-400">
              This course has no enrolled students yet.
            </p>
          </CardContent>
        </Card>
      )}

      {data && !loading && data.students.length > 0 && (
        <Card className="border-l-4 border-l-indigo-400">
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10">
                  <th className="sticky left-0 z-10 bg-white px-4 py-3 text-left font-semibold text-slate-700 dark:bg-[#2C2C2C] dark:text-slate-300">
                    Student
                  </th>
                  {data.columns.map((col) => (
                    <th
                      key={col.id}
                      className="min-w-[100px] px-3 py-3 text-center font-medium text-slate-600 dark:text-slate-400"
                    >
                      <div className="text-xs">{typeLabel(col.type)}</div>
                      <div className="truncate text-[11px] font-normal text-slate-400 dark:text-slate-500" title={col.title}>
                        {col.title}
                      </div>
                    </th>
                  ))}
                  <th className="px-3 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">
                    Avg %
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.students.map((s, idx) => {
                  const avg = studentAvg(s.id);
                  return (
                    <tr
                      key={s.id}
                      className={idx % 2 === 0 ? "bg-white dark:bg-[#1E1E1E]" : "bg-slate-50/50 dark:bg-white/[0.02]"}
                    >
                      <td className="sticky left-0 z-10 bg-inherit px-4 py-2.5 font-medium text-slate-900 dark:text-slate-100">
                        <div className="truncate max-w-[200px]">{s.full_name}</div>
                        <div className="truncate text-[11px] text-slate-400 dark:text-slate-500">{s.email}</div>
                      </td>
                      {data.columns.map((col) => {
                        const val = data.rows[s.id]?.[col.id];
                        return (
                          <td key={col.id} className="px-3 py-2.5 text-center">
                            {val != null ? (
                              <span className={`inline-block min-w-[48px] rounded-md px-2 py-0.5 text-xs font-medium ${scoreColor(val, col.max_score)}`}>
                                {val}{col.max_score !== 100 ? `/${col.max_score}` : "%"}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-300 dark:text-slate-600">&mdash;</span>
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
                          <span className="text-xs text-slate-300 dark:text-slate-600">&mdash;</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {/* Averages row */}
                <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold dark:border-white/20 dark:bg-white/5">
                  <td className="sticky left-0 z-10 bg-slate-50 px-4 py-2.5 text-slate-700 dark:bg-white/5 dark:text-slate-300">
                    Average
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
                          <span className="text-xs text-slate-300 dark:text-slate-600">&mdash;</span>
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
    </div>
  );
}

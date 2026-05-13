"use client";

import { useEffect, useState } from "react";
import apiClient from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
 Users,
 BookOpen,
 TrendingUp,
 BarChart3,
 Target,
 Award,
 Code,
 Download,
} from "lucide-react";
import {
 LineChart,
 Line,
 BarChart,
 Bar,
 PieChart,
 Pie,
 Cell,
 XAxis,
 YAxis,
 CartesianGrid,
 Tooltip,
 ResponsiveContainer,
 Legend,
} from "recharts";

interface DashboardStats {
 total_users: number;
 total_courses: number;
 total_enrollments: number;
 active_students: number;
}

interface DetailedAnalytics {
 completion_rate: number;
 avg_quiz_score: number | null;
 avg_code_pass_rate: number | null;
 enrollments_over_time: { date: string; count: number }[];
 top_courses: { id: string; title: string; enrollment_count: number }[];
 lesson_type_distribution: { type: string; count: number }[];
}

interface CourseInfo {
 id: string;
 title: string;
 status: string;
 category: string | null;
}

const PIE_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

const TYPE_LABELS: Record<string, string> = {
 text: "Text",
 video: "Video",
 quiz: "Quiz",
 code: "Code",
 file_upload: "File Upload",
 interactive: "Interactive",
};

export default function AdminAnalyticsPage() {
 const [stats, setStats] = useState<DashboardStats | null>(null);
 const [detailed, setDetailed] = useState<DetailedAnalytics | null>(null);
 const [courses, setCourses] = useState<CourseInfo[]>([]);
 const [users, setUsers] = useState<{ role: string }[]>([]);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 Promise.all([
 apiClient.get("/admin/dashboard/").then(({ data }) => data),
 apiClient.get("/admin/analytics/detailed/").then(({ data }) => data).catch(() => null),
 apiClient.get("/admin/courses/").then(({ data }) => data),
 apiClient.get("/admin/users/").then(({ data }) => data).catch(() => []),
 ])
 .then(([statsData, detailedData, coursesData, usersData]) => {
 setStats(statsData);
 setDetailed(detailedData);
 setCourses(coursesData);
 setUsers(usersData);
 })
 .catch(() => {})
 .finally(() => setLoading(false));
 }, []);

 if (loading) {
 return (
 <div className="flex h-64 items-center justify-center">
 <div className="h-8 w-8 animate-spin rounded-pill border-4 border-primary border-t-transparent" />
 </div>
 );
 }

 const handleExportCSV = async () => {
 try {
 const response = await apiClient.get("/admin/analytics/export-csv/", {
 responseType: "blob",
 });
 const url = window.URL.createObjectURL(new Blob([response.data]));
 const link = document.createElement("a");
 link.href = url;
 link.setAttribute("download", "analytics_export.csv");
 document.body.appendChild(link);
 link.click();
 link.remove();
 window.URL.revokeObjectURL(url);
 } catch {
 // silently fail
 }
 };

 const publishedCount = courses.filter((c) => c.status === "published").length;
 const draftCount = courses.filter((c) => c.status === "draft").length;
 const studentCount = users.filter((u) => u.role === "student").length;
 const teacherCount = users.filter((u) => u.role === "teacher").length;
 const adminCount = users.filter((u) => u.role === "admin").length;

 const categoryMap = new Map<string, number>();
 courses.forEach((c) => {
 const cat = c.category || "Uncategorized";
 categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
 });
 const categories = Array.from(categoryMap.entries()).sort((a, b) => b[1] - a[1]);

 const enrollmentRate =
 stats && stats.total_users > 0
 ? Math.round((stats.total_enrollments / stats.total_users) * 100)
 : 0;

 // Format chart data
 const enrollmentChartData = (detailed?.enrollments_over_time || []).map((d) => ({
 date: d.date.slice(5), // MM-DD
 count: d.count,
 }));

 const topCoursesData = (detailed?.top_courses || [])
 .filter((c) => c.enrollment_count > 0)
 .slice(0, 8)
 .map((c) => ({
 name: c.title.length > 20 ? c.title.slice(0, 20) + "..." : c.title,
 enrollments: c.enrollment_count,
 }));

 const pieData = (detailed?.lesson_type_distribution || []).map((d) => ({
 name: TYPE_LABELS[d.type] || d.type,
 value: d.count,
 }));

 return (
 <div className="mx-auto max-w-6xl">
 <div className="mb-8 flex items-start justify-between">
 <div>
 <h1 className="text-2xl font-bold text-text ">Analytics</h1>
 <p className="mt-1 text-sm text-text-muted ">
 Overview of your organization&apos;s metrics
 </p>
 </div>
 <button
 onClick={handleExportCSV}
 className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white $1:bg-primary-hover transition-colors"
 >
 <Download className="h-4 w-4" />
 Export CSV
 </button>
 </div>

 {/* Main stats */}
 <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
 <Card className="border-l-4 border-l-green-400 hover:shadow-md">
 <CardContent className="flex items-center gap-4 p-6">
 <div className="rounded-lg bg-primary-soft p-3">
 <Users className="h-5 w-5 text-primary" />
 </div>
 <div>
 <p className="text-xs font-medium text-text-subtle ">Total Users</p>
 <p className="text-2xl font-bold text-text ">{stats?.total_users || 0}</p>
 </div>
 </CardContent>
 </Card>

 <Card className="border-l-4 border-l-emerald-400 hover:shadow-md">
 <CardContent className="flex items-center gap-4 p-6">
 <div className="rounded-lg bg-primary-soft p-3">
 <BookOpen className="h-5 w-5 text-primary" />
 </div>
 <div>
 <p className="text-xs font-medium text-text-subtle ">Courses</p>
 <p className="text-2xl font-bold text-text ">{stats?.total_courses || 0}</p>
 </div>
 </CardContent>
 </Card>

 <Card className="border-l-4 border-l-emerald-400 hover:shadow-md">
 <CardContent className="flex items-center gap-4 p-6">
 <div className="rounded-lg bg-primary-soft p-3">
 <BookOpen className="h-5 w-5 text-primary" />
 </div>
 <div>
 <p className="text-xs font-medium text-text-subtle ">Enrollments</p>
 <p className="text-2xl font-bold text-text ">{stats?.total_enrollments || 0}</p>
 </div>
 </CardContent>
 </Card>

 <Card className="border-l-4 border-l-amber-400 hover:shadow-md">
 <CardContent className="flex items-center gap-4 p-6">
 <div className="rounded-lg bg-sun-100 p-3">
 <TrendingUp className="h-5 w-5 text-warning-fg" />
 </div>
 <div>
 <p className="text-xs font-medium text-text-subtle ">Active Students</p>
 <p className="text-2xl font-bold text-text ">{stats?.active_students || 0}</p>
 </div>
 </CardContent>
 </Card>
 </div>

 {/* Performance metrics */}
 {detailed && (
 <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
 <Card className="border-l-4 border-l-emerald-400 hover:shadow-md">
 <CardContent className="flex items-center gap-4 p-6">
 <div className="rounded-lg bg-primary-soft p-3">
 <Target className="h-5 w-5 text-primary" />
 </div>
 <div>
 <p className="text-xs font-medium text-text-subtle ">Completion Rate</p>
 <p className="text-2xl font-bold text-text ">{detailed.completion_rate}%</p>
 </div>
 </CardContent>
 </Card>

 <Card className="border-l-4 border-l-emerald-400 hover:shadow-md">
 <CardContent className="flex items-center gap-4 p-6">
 <div className="rounded-lg bg-primary-soft p-3">
 <Award className="h-5 w-5 text-primary" />
 </div>
 <div>
 <p className="text-xs font-medium text-text-subtle ">Avg Quiz Score</p>
 <p className="text-2xl font-bold text-text ">
 {detailed.avg_quiz_score !== null ? `${detailed.avg_quiz_score}%` : "N/A"}
 </p>
 </div>
 </CardContent>
 </Card>

 <Card className="border-l-4 border-l-green-400 hover:shadow-md">
 <CardContent className="flex items-center gap-4 p-6">
 <div className="rounded-lg bg-primary-soft p-3">
 <Code className="h-5 w-5 text-primary" />
 </div>
 <div>
 <p className="text-xs font-medium text-text-subtle ">Code Pass Rate</p>
 <p className="text-2xl font-bold text-text ">
 {detailed.avg_code_pass_rate !== null ? `${detailed.avg_code_pass_rate}%` : "N/A"}
 </p>
 </div>
 </CardContent>
 </Card>
 </div>
 )}

 {/* Charts */}
 <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
 {/* Enrollments over time */}
 {enrollmentChartData.length > 0 && (
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2 text-base">
 <TrendingUp className="h-4 w-4 text-primary" />
 Enrollments (Last 30 Days)
 </CardTitle>
 </CardHeader>
 <CardContent>
 <ResponsiveContainer width="100%" height={250}>
 <LineChart data={enrollmentChartData}>
 <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
 <XAxis
 dataKey="date"
 tick={{ fontSize: 11 }}
 interval={4}
 stroke="#94a3b8"
 />
 <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" allowDecimals={false} />
 <Tooltip
 contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}
 />
 <Line
 type="monotone"
 dataKey="count"
 stroke="#6366f1"
 strokeWidth={2}
 dot={false}
 name="Enrollments"
 />
 </LineChart>
 </ResponsiveContainer>
 </CardContent>
 </Card>
 )}

 {/* Top courses */}
 {topCoursesData.length > 0 && (
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2 text-base">
 <BarChart3 className="h-4 w-4 text-primary" />
 Top Courses by Enrollment
 </CardTitle>
 </CardHeader>
 <CardContent>
 <ResponsiveContainer width="100%" height={250}>
 <BarChart data={topCoursesData} layout="vertical">
 <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
 <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" allowDecimals={false} />
 <YAxis
 type="category"
 dataKey="name"
 tick={{ fontSize: 11 }}
 width={150}
 stroke="#94a3b8"
 />
 <Tooltip
 contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}
 />
 <Bar dataKey="enrollments" fill="#10b981" radius={[0, 4, 4, 0]} />
 </BarChart>
 </ResponsiveContainer>
 </CardContent>
 </Card>
 )}

 {/* Lesson type distribution */}
 {pieData.length > 0 && (
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2 text-base">
 <BookOpen className="h-4 w-4 text-primary" />
 Lesson Types
 </CardTitle>
 </CardHeader>
 <CardContent>
 <ResponsiveContainer width="100%" height={250}>
 <PieChart>
 <Pie
 data={pieData}
 cx="50%"
 cy="50%"
 innerRadius={60}
 outerRadius={90}
 paddingAngle={3}
 dataKey="value"
 >
 {pieData.map((_, i) => (
 <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
 ))}
 </Pie>
 <Tooltip
 contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}
 />
 <Legend iconType="circle" />
 </PieChart>
 </ResponsiveContainer>
 </CardContent>
 </Card>
 )}

 {/* Categories */}
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2 text-base">
 <BarChart3 className="h-4 w-4 text-primary" />
 Categories
 </CardTitle>
 </CardHeader>
 <CardContent>
 {categories.length === 0 ? (
 <p className="text-sm text-text-subtle ">No courses yet</p>
 ) : (
 <div className="space-y-3">
 {categories.map(([cat, count]) => (
 <BarItem
 key={cat}
 label={cat}
 value={count}
 total={courses.length}
 color="bg-primary"
 />
 ))}
 </div>
 )}
 </CardContent>
 </Card>
 </div>

 {/* Breakdown cards */}
 <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
 {/* User breakdown */}
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2 text-base">
 <Users className="h-4 w-4 text-primary" />
 User Breakdown
 </CardTitle>
 </CardHeader>
 <CardContent>
 <div className="space-y-3">
 <BarItem label="Students" value={studentCount} total={users.length} color="bg-primary" />
 <BarItem label="Teachers" value={teacherCount} total={users.length} color="bg-primary" />
 <BarItem label="Admins" value={adminCount} total={users.length} color="bg-warning" />
 </div>
 </CardContent>
 </Card>

 {/* Course breakdown */}
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2 text-base">
 <BookOpen className="h-4 w-4 text-primary" />
 Course Status
 </CardTitle>
 </CardHeader>
 <CardContent>
 <div className="space-y-3">
 <BarItem label="Published" value={publishedCount} total={courses.length} color="bg-primary" />
 <BarItem label="Draft" value={draftCount} total={courses.length} color="bg-warning" />
 </div>
 <div className="mt-4 rounded-lg bg-surface-2 p-3">
 <p className="text-xs font-medium text-text-muted ">Enrollment Rate</p>
 <p className="text-lg font-bold text-primary">{enrollmentRate}%</p>
 <p className="text-[10px] text-text-subtle ">
 {stats?.total_enrollments || 0} enrollments across {stats?.total_users || 0} users
 </p>
 </div>
 </CardContent>
 </Card>

 {/* Recent courses */}
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2 text-base">
 <BookOpen className="h-4 w-4 text-warning-fg" />
 Recent Courses
 </CardTitle>
 </CardHeader>
 <CardContent>
 {courses.length === 0 ? (
 <p className="text-sm text-text-subtle ">No courses yet</p>
 ) : (
 <div className="space-y-2">
 {courses.slice(0, 5).map((course) => (
 <div key={course.id} className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2">
 <div>
 <p className="text-sm font-medium text-ink-700 ">{course.title}</p>
 <p className="text-[10px] text-text-subtle ">
 {course.category || "No category"}
 </p>
 </div>
 <span
 className={`rounded-pill px-2 py-0.5 text-[10px] font-medium ${
 course.status === "published"
 ? "bg-success-soft text-primary"
 : "bg-sun-50 text-warning-fg"
 }`}
 >
 {course.status}
 </span>
 </div>
 ))}
 </div>
 )}
 </CardContent>
 </Card>
 </div>
 </div>
 );
}

function BarItem({
 label,
 value,
 total,
 color,
}: {
 label: string;
 value: number;
 total: number;
 color: string;
}) {
 const pct = total > 0 ? (value / total) * 100 : 0;
 return (
 <div>
 <div className="mb-1 flex justify-between text-xs">
 <span className="font-medium text-text-muted ">{label}</span>
 <span className="text-text-subtle ">{value}</span>
 </div>
 <div className="h-2 overflow-hidden rounded-pill bg-ink-100 ">
 <div
 className={`h-full rounded-pill ${color} transition-all`}
 style={{ width: `${pct}%` }}
 />
 </div>
 </div>
 );
}

"use client";

import { useEffect, useState } from "react";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { BookOpen, Plus, Pencil, Trash2, Copy, FileStack, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/stores/auth-store";
import type { Course } from "@/types/api";

interface AdminCourse {
  id: string;
  title: string;
  slug: string;
  description: string;
  status: string;
  category: string | null;
  org_id: string;
  created_at: string;
  is_template?: boolean;
  thumbnail_url?: string | null;
  source_course_id?: string | null;
  template_version?: number;
}

interface OrgOption {
  id: string;
  name: string;
}

export default function AdminCoursesPage() {
  const router = useRouter();
  const confirm = useConfirm();
  const currentUser = useAuthStore((s) => s.user);
  const isSuperAdmin = currentUser?.role === "super_admin";
  const isAdmin = currentUser?.role === "admin" || isSuperAdmin;
  const isTeacher = currentUser?.role === "teacher";
  const isMethodist = isTeacher && currentUser?.is_methodist;
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [templates, setTemplates] = useState<Course[]>([]);
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", category: "", is_template: false });
  const [submitting, setSubmitting] = useState(false);
  const [copying, setCopying] = useState<string | null>(null);

  const fetchCourses = () => {
    apiClient
      .get("/admin/courses")
      .then(({ data }) => setCourses(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const fetchTemplates = () => {
    apiClient
      .get("/courses/templates")
      .then(({ data }) => setTemplates(data))
      .catch(() => {});
  };

  const fetchOrgs = () => {
    if (!isSuperAdmin) return;
    apiClient
      .get("/admin/organizations")
      .then(({ data }) => setOrgs(data))
      .catch(() => {});
  };

  useEffect(() => {
    fetchCourses();
    fetchTemplates();
    fetchOrgs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.post("/courses/", form);
      setForm({ title: "", description: "", category: "", is_template: false });
      setShowForm(false);
      toast.success("Course created successfully");
      fetchCourses();
      if (form.is_template) fetchTemplates();
    } catch {
      toast.error("Failed to create course");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublish = async (courseId: string) => {
    try {
      await apiClient.post(`/courses/${courseId}/publish/`);
      toast.success("Course published");
      fetchCourses();
    } catch {
      toast.error("Failed to publish course");
    }
  };

  const handleDelete = async (courseId: string) => {
    // Check enrollment count for warning
    let enrolledCount = 0;
    try {
      const { data } = await apiClient.get(`/courses/${courseId}`);
      enrolledCount = data.enrolled_count || 0;
    } catch { /* proceed with default message */ }

    const message = enrolledCount > 0
      ? `${enrolledCount} student(s) are enrolled in this course. Their progress will be permanently deleted. Are you sure?`
      : "Are you sure you want to delete this course?";

    if (!(await confirm({ message, variant: "danger", confirmLabel: "Delete" }))) return;
    try {
      await apiClient.delete(`/courses/${courseId}/`);
      toast.success("Course deleted");
      fetchCourses();
      fetchTemplates();
    } catch {
      toast.error("Failed to delete course");
    }
  };

  const handleCopy = async (courseId: string) => {
    setCopying(courseId);
    try {
      const { data } = await apiClient.post(`/courses/${courseId}/copy`);
      toast.success("Course copied successfully");
      fetchCourses();
      router.push(`/admin/courses/${data.id}/edit`);
    } catch {
      toast.error("Failed to copy course");
    } finally {
      setCopying(null);
    }
  };

  const handleOrgChange = async (courseId: string, newOrgId: string) => {
    try {
      await apiClient.put(`/admin/courses/${courseId}`, { org_id: newOrgId });
      toast.success("Organization updated");
      fetchCourses();
    } catch {
      toast.error("Failed to update organization");
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl">
        <Skeleton className="mb-2 h-4 w-48" />
        <Skeleton className="mb-6 h-8 w-56" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 rounded-xl border border-slate-200 dark:border-white/10 p-4">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="flex-1">
                <Skeleton className="mb-1 h-5 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      draft: "bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300",
      published: "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300",
      archived: "bg-gray-100 dark:bg-gray-500/20 text-gray-600 dark:text-gray-400",
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] || "bg-gray-100 dark:bg-gray-500/20 text-gray-600 dark:text-gray-400"}`}>
        {status}
      </span>
    );
  };

  const canCreateTemplate = isAdmin || isMethodist;

  const CATEGORY_GRADIENTS: Record<string, string> = {
    programming: "from-green-500 to-emerald-600",
    math: "from-emerald-500 to-teal-600",
    languages: "from-amber-500 to-orange-600",
  };

  const renderCourseCard = (course: AdminCourse | Course, opts: { showCopy?: boolean; showEdit?: boolean; showDelete?: boolean } = {}) => {
    const { showCopy = false, showEdit = true, showDelete = true } = opts;
    const isTemplate = 'is_template' in course && course.is_template;
    const thumbnailUrl = 'thumbnail_url' in course ? course.thumbnail_url : null;
    const category = 'category' in course ? course.category : null;
    const gradient = CATEGORY_GRADIENTS[category || ""] || (isTemplate ? "from-violet-500 to-purple-600" : "from-green-500 to-emerald-600");

    return (
      <Card key={course.id} className="group overflow-hidden transition-all hover:shadow-lg dark:hover:shadow-none">
        {/* Thumbnail / Gradient header */}
        {thumbnailUrl ? (
          <div className="relative h-32 overflow-hidden">
            <img
              src={thumbnailUrl}
              alt={course.title}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            <div className="absolute right-2 top-2 flex items-center gap-1.5">
              {isTemplate && (
                <span className="rounded-full bg-violet-500/90 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
                  Template
                </span>
              )}
              {statusBadge(course.status)}
            </div>
          </div>
        ) : (
          <div className={`relative flex h-32 items-center justify-center bg-gradient-to-br ${gradient}`}>
            {isTemplate ? (
              <FileStack className="h-10 w-10 text-white/80" />
            ) : (
              <BookOpen className="h-10 w-10 text-white/80" />
            )}
            <div className="absolute right-2 top-2 flex items-center gap-1.5">
              {isTemplate && (
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
                  Template
                </span>
              )}
              {statusBadge(course.status)}
            </div>
          </div>
        )}

        <CardContent className="p-4">
          {/* Category + source badges */}
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            {category && (
              <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-green-600 dark:bg-green-500/20 dark:text-green-400">
                {category}
              </span>
            )}
            {'source_course_id' in course && course.source_course_id && (
              <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-600 dark:bg-violet-500/10 dark:text-violet-400">
                From template{('template_version' in course && course.template_version) ? ` v${course.template_version}` : ""}
              </span>
            )}
          </div>

          <h3 className="mb-1 font-semibold text-slate-900 dark:text-slate-100">{course.title}</h3>
          <p className="mb-3 line-clamp-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            {course.description || "No description"}
          </p>

          {/* Organization selector for super admin */}
          {isSuperAdmin && orgs.length > 0 && 'org_id' in course && (
            <div className="mb-3">
              <select
                value={course.org_id}
                onChange={(e) => handleOrgChange(course.id, e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-600 focus:border-green-300 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-400"
              >
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {showCopy && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => handleCopy(course.id)}
                disabled={copying === course.id}
              >
                {copying === course.id ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Copy className="mr-1 h-3.5 w-3.5" />
                )}
                {isTemplate ? "Use Template" : "Copy"}
              </Button>
            )}
            {showEdit && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => router.push(`/admin/courses/${course.id}/edit`)}
              >
                <Pencil className="mr-1 h-3.5 w-3.5" />
                Edit
              </Button>
            )}
            {course.status === "draft" && showEdit && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => handlePublish(course.id)}
              >
                Publish
              </Button>
            )}
            {showDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                onClick={() => handleDelete(course.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Courses</h1>
          {isSuperAdmin && (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{courses.length} courses across all organizations</p>
          )}
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" />
          New Course
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create Course</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <input
                type="text"
                placeholder="Course Title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-[#1E1E1E] px-3 py-2 text-sm text-gray-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none"
                required
                autoFocus
              />
              <textarea
                placeholder="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-[#1E1E1E] px-3 py-2 text-sm text-gray-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none"
                rows={3}
              />
              <input
                type="text"
                placeholder="Category (e.g., programming, math)"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-[#1E1E1E] px-3 py-2 text-sm text-gray-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none"
              />
              {canCreateTemplate && (
                <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <input
                    type="checkbox"
                    checked={form.is_template}
                    onChange={(e) => setForm({ ...form, is_template: e.target.checked })}
                    className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                  />
                  Create as organization template
                  <span className="text-xs text-slate-400">(visible to all teachers for copying)</span>
                </label>
              )}
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating..." : "Create Course"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Organization Templates — visible to all teachers/admins */}
      {templates.length > 0 && (
        <div className="mb-8">
          <div className="mb-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
              <FileStack className="h-5 w-5 text-violet-500" />
              Organization Templates
              <span className="text-sm font-normal text-slate-400 dark:text-slate-500">({templates.length})</span>
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Ready-made courses you can copy and customize for your students
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) =>
              renderCourseCard(t, {
                showCopy: true,
                showEdit: isAdmin || isMethodist,
                showDelete: isAdmin || isMethodist,
              })
            )}
          </div>
        </div>
      )}

      {/* My Courses / All Courses */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {isTeacher ? "My Courses" : "All Courses"}
        </h2>
      </div>
      {courses.filter((c) => !c.is_template).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <div className="mb-4 rounded-full bg-slate-100 p-4 dark:bg-white/10">
              <BookOpen className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="mb-1 text-lg font-semibold text-slate-600 dark:text-slate-300">No courses yet</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {templates.length > 0
                ? "Create your first course or copy a template above to get started!"
                : "Create your first course to get started!"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses
            .filter((c) => !c.is_template)
            .map((course) => renderCourseCard(course))}
        </div>
      )}
    </div>
  );
}

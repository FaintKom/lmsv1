"use client";

import { useEffect, useState } from "react";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { BookOpen, Plus, Pencil, Trash2, Copy, FileStack, Loader2 } from "lucide-react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
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
    if (!(await confirm({ message: "Are you sure you want to delete this course?", variant: "danger", confirmLabel: "Delete" }))) return;
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
            <div key={i} className="flex items-center gap-4 rounded-xl border border-slate-200 p-4">
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
      draft: "bg-yellow-100 text-yellow-700",
      published: "bg-green-100 text-green-700",
      archived: "bg-gray-100 text-gray-600",
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] || "bg-gray-100 text-gray-600"}`}>
        {status}
      </span>
    );
  };

  const canCreateTemplate = isAdmin || isMethodist;

  const renderCourseCard = (course: AdminCourse | Course, opts: { showCopy?: boolean; showEdit?: boolean; showDelete?: boolean } = {}) => {
    const { showCopy = false, showEdit = true, showDelete = true } = opts;
    const isTemplate = 'is_template' in course && course.is_template;
    return (
      <Card key={course.id} className={`transition-shadow hover:shadow-md ${isTemplate ? "border-l-4 border-l-violet-400" : "border-l-4 border-l-blue-400"}`}>
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className={`rounded-lg p-2.5 ${isTemplate ? "bg-violet-100" : "bg-blue-100"}`}>
              {isTemplate ? <FileStack className="h-5 w-5 text-violet-600" /> : <BookOpen className="h-5 w-5 text-blue-600" />}
            </div>
            <div className="flex items-center gap-1.5">
              {isTemplate && (
                <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-[10px] font-medium text-violet-700">
                  Template
                </span>
              )}
              {statusBadge(course.status)}
            </div>
          </div>
          <h3 className="mb-1.5 font-semibold text-gray-900">{course.title}</h3>
          <p className="mb-4 line-clamp-2 text-sm text-gray-500">
            {course.description || "No description"}
          </p>
          {('category' in course) && course.category && (
            <span className="mr-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
              {course.category}
            </span>
          )}
          {/* Organization selector for super admin */}
          {isSuperAdmin && orgs.length > 0 && 'org_id' in course && (
            <div className="mt-2">
              <select
                value={course.org_id}
                onChange={(e) => handleOrgChange(course.id, e.target.value)}
                className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600 focus:border-indigo-300 focus:outline-none"
              >
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="mt-3 flex gap-2">
            {showCopy && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => handleCopy(course.id)}
                disabled={copying === course.id}
              >
                {copying === course.id ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : (
                  <Copy className="mr-1 h-3 w-3" />
                )}
                Copy
              </Button>
            )}
            {showEdit && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => router.push(`/admin/courses/${course.id}/edit`)}
              >
                <Pencil className="mr-1 h-3 w-3" />
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
                className="text-red-500 hover:bg-red-50 hover:text-red-600"
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
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Admin", href: "/admin" }, { label: "Courses" }]} />
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Courses</h1>
          {isSuperAdmin && (
            <p className="mt-1 text-sm text-slate-500">{courses.length} courses across all organizations</p>
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
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                required
                autoFocus
              />
              <textarea
                placeholder="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                rows={3}
              />
              <input
                type="text"
                placeholder="Category (e.g., programming, math)"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
              {canCreateTemplate && (
                <label className="flex items-center gap-2 text-sm text-slate-600">
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
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
            <FileStack className="h-5 w-5 text-violet-500" />
            Organization Templates
            <span className="text-sm font-normal text-slate-400">({templates.length})</span>
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
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
      <h2 className="mb-4 text-lg font-semibold text-slate-900">
        {isTeacher ? "My Courses" : "All Courses"}
      </h2>
      {courses.filter((c) => !c.is_template).length === 0 ? (
        <p className="text-gray-500">No courses yet. Create your first course or copy a template!</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {courses
            .filter((c) => !c.is_template)
            .map((course) => renderCourseCard(course))}
        </div>
      )}
    </div>
  );
}

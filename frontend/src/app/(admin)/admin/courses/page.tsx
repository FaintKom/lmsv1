"use client";

import { useEffect, useState } from "react";
import apiClient from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { BookOpen, Plus, Pencil, Trash2 } from "lucide-react";

interface AdminCourse {
  id: string;
  title: string;
  slug: string;
  description: string;
  status: string;
  category: string | null;
  created_at: string;
}

export default function AdminCoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", category: "" });
  const [submitting, setSubmitting] = useState(false);

  const fetchCourses = () => {
    apiClient
      .get("/admin/courses")
      .then(({ data }) => setCourses(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(fetchCourses, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.post("/courses/", form);
      setForm({ title: "", description: "", category: "" });
      setShowForm(false);
      fetchCourses();
    } catch {
      alert("Failed to create course");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublish = async (courseId: string) => {
    try {
      await apiClient.post(`/courses/${courseId}/publish/`);
      fetchCourses();
    } catch {
      alert("Failed to publish course");
    }
  };

  const handleDelete = async (courseId: string) => {
    if (!confirm("Are you sure you want to delete this course?")) return;
    try {
      await apiClient.delete(`/courses/${courseId}/`);
      fetchCourses();
    } catch {
      alert("Failed to delete course");
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
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

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Courses</h1>
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
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating..." : "Create Course"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {courses.length === 0 ? (
        <p className="text-gray-500">No courses yet. Create your first course!</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Card key={course.id} className="transition-shadow hover:shadow-md">
              <CardContent className="p-6">
                <div className="mb-3 flex items-center justify-between">
                  <div className="rounded-lg bg-blue-100 p-2">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                  </div>
                  {statusBadge(course.status)}
                </div>
                <h3 className="mb-1 font-semibold text-gray-900">{course.title}</h3>
                <p className="mb-3 line-clamp-2 text-sm text-gray-500">
                  {course.description || "No description"}
                </p>
                {course.category && (
                  <span className="mr-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                    {course.category}
                  </span>
                )}
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => router.push(`/admin/courses/${course.id}/edit`)}
                  >
                    <Pencil className="mr-1 h-3 w-3" />
                    Edit
                  </Button>
                  {course.status === "draft" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handlePublish(course.id)}
                    >
                      Publish
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:bg-red-50 hover:text-red-600"
                    onClick={() => handleDelete(course.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

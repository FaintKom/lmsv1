"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/stores/auth-store";
import apiClient from "@/lib/api-client";
import { sanitizeHtml } from "@/lib/sanitize-html";
import type { Course } from "@/types/api";
import {
 Library,
 Search,
 Trash2,
 Eye,
 FileText,
 Code,
 Puzzle,
 ArrowUpDown,
 PenLine,
 ToggleLeft,
 FolderOpen,
 Upload,
 ClipboardList,
 BookOpen,
 Plus,
 Copy,
 FileStack,
 Pencil,
 Users,
 X,
 CheckCircle,
 Bot,
 Calculator,
 Box,
 Languages,
 Type,
 MessageCircle,
 Table,
 BookOpenText,
 Globe,
 Package,
 Sigma,
 Layers,
 Grid3X3,
 MapPin,
 CircleDot,
} from "lucide-react";
import {
 exercisesApi,
 EXERCISE_TYPE_LABELS,
 EXERCISE_TYPE_COLORS,
 ALL_EXERCISE_TYPES,
 type Exercise,
 type ExerciseType,
} from "@/lib/api/exercises";
import { useTranslation } from "@/lib/i18n/context";

// ─── Exercise type config ───

const TYPE_ICONS: Record<ExerciseType, typeof FileText> = {
 quiz: ClipboardList,
 code_challenge: Code,
 matching: Puzzle,
 ordering: ArrowUpDown,
 fill_blanks: PenLine,
 true_false: ToggleLeft,
 categorize: FolderOpen,
 file_upload: Upload,
 robot_2d: Bot,
 math_interactive: Calculator,
 world_3d: Box,
 translation: Languages,
 sentence_builder: Type,
 dialogue: MessageCircle,
 conjugation: Table,
 reading: BookOpenText,
 web_editor: Globe,
 scorm_package: Package,
 math_stepwise: Sigma,
 srs_flashcard: Layers,
 crossword: Grid3X3,
 word_search: Search,
 map_pin_drop: MapPin,
 bubble_sheet: CircleDot,
};

const ALL_TYPES: ExerciseType[] = ALL_EXERCISE_TYPES;

// ─── Types ───

interface Group {
 id: string;
 name: string;
 description: string;
 member_count?: number;
}

interface Assignment {
 id: string;
 title: string;
 description?: string;
 course_id: string;
 course_title?: string;
 due_date: string;
 max_score: number;
 allow_late: boolean;
 submissions_count?: number;
 status?: "active" | "overdue" | "graded";
 created_at: string;
}

// ─── Main Page ───

export default function ContentLibraryPage() {
 const { t } = useTranslation();
 const [activeTab, setActiveTab] = useState<"templates" | "exercises" | "assignments">("templates");

 return (
 <div className="mx-auto max-w-7xl space-y-6 p-6">
 <div className="flex items-center gap-3">
 <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft ">
 <Library className="h-5 w-5 text-primary " />
 </div>
 <h1 className="text-2xl font-bold text-text ">{t("admin.contentLibrary.title")}</h1>
 </div>

 {/* Tabs */}
 <div className="flex gap-1 rounded-lg bg-ink-100 p-1 ">
 <button
 onClick={() => setActiveTab("templates")}
 className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
 activeTab === "templates"
 ? "bg-paper-2 text-text shadow-sm "
 : "text-text-muted hover:text-ink-700 "
 }`}
 >
 <FileStack className="h-4 w-4" />
 {t("admin.contentLibrary.tabTemplates")}
 </button>
 <button
 onClick={() => setActiveTab("exercises")}
 className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
 activeTab === "exercises"
 ? "bg-paper-2 text-text shadow-sm "
 : "text-text-muted hover:text-ink-700 "
 }`}
 >
 <ClipboardList className="h-4 w-4" />
 {t("admin.contentLibrary.tabExercises")}
 </button>
 <button
 onClick={() => setActiveTab("assignments")}
 className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
 activeTab === "assignments"
 ? "bg-paper-2 text-text shadow-sm "
 : "text-text-muted hover:text-ink-700 "
 }`}
 >
 <ClipboardList className="h-4 w-4" />
 {t("admin.contentLibrary.tabAssignments")}
 </button>
 </div>

 {activeTab === "templates" ? (
 <TemplatesTab />
 ) : activeTab === "exercises" ? (
 <ExercisesTab />
 ) : (
 <AssignmentsTab />
 )}
 </div>
 );
}

// ─── Templates Tab ───

function TemplatesTab() {
 const { t } = useTranslation();
 const router = useRouter();
 const confirm = useConfirm();
 const user = useAuthStore((s) => s.user);
 const [templates, setTemplates] = useState<Course[]>([]);
 const [groups, setGroups] = useState<Group[]>([]);
 const [loading, setLoading] = useState(true);
 const [copyModal, setCopyModal] = useState<Course | null>(null);
 const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
 const [copying, setCopying] = useState(false);

 const isMethodistOrAdmin =
 user?.role === "super_admin" ||
 user?.role === "admin" ||
 user?.is_methodist === true;
 const isTeacherOnly = user?.role === "teacher" && !user?.is_methodist;

 useEffect(() => {
 apiClient
 .get("/courses/templates")
 .then(({ data }) => {
 // Teachers only see published templates
 if (isTeacherOnly) {
 setTemplates(data.filter((c: Course) => c.status === "published"));
 } else {
 setTemplates(data);
 }
 })
 .catch(() => toast.error(t("admin.contentLibrary.failedLoadTemplates")))
 .finally(() => setLoading(false));

 apiClient
 .get("/admin/groups")
 .then(({ data }) => setGroups(data))
 .catch(() => {});
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, []);

 const handleDelete = async (course: Course) => {
 const ok = await confirm({
 title: t("admin.contentLibrary.deleteTemplateTitle"),
 message: t("admin.contentLibrary.deleteTemplateMsg").replace("{title}", course.title),
 confirmLabel: t("common.delete"),
 variant: "danger",
 });
 if (!ok) return;
 try {
 await apiClient.delete(`/courses/${course.id}`);
 toast.success(t("admin.contentLibrary.templateDeleted"));
 setTemplates((prev) => prev.filter((c) => c.id !== course.id));
 } catch {
 toast.error(t("admin.contentLibrary.failedDeleteTemplate"));
 }
 };

 const handleCopy = async () => {
 if (!copyModal) return;
 setCopying(true);
 try {
 const { data } = await apiClient.post(`/courses/${copyModal.id}/copy-with-group`, {
 group_ids: selectedGroups,
 });
 const enrolled = data.enrolled_count;
 toast.success(
 enrolled > 0
 ? t("admin.courses.copied") + ` (${enrolled})`
 : t("admin.courses.copied")
 );
 setCopyModal(null);
 setSelectedGroups([]);
 router.push(`/admin/courses/${data.course.id}/edit`);
 } catch {
 toast.error(t("admin.contentLibrary.failedCopyTemplate"));
 } finally {
 setCopying(false);
 }
 };

 const handleCreateTemplate = async () => {
 try {
 const { data } = await apiClient.post("/courses", {
 title: "New Template",
 description: "",
 is_template: true,
 });
 router.push(`/admin/courses/${data.id}/edit`);
 } catch {
 toast.error(t("admin.contentLibrary.failedCreateTemplate"));
 }
 };

 const toggleGroup = (id: string) => {
 setSelectedGroups((prev) =>
 prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
 );
 };

 return (
 <>
 {/* Header with Create button */}
 {isMethodistOrAdmin && (
 <div className="flex justify-end">
 <Button onClick={handleCreateTemplate}>
 <Plus className="h-4 w-4" />
 {t("admin.contentLibrary.createTemplate")}
 </Button>
 </div>
 )}

 {/* Template cards */}
 {loading ? (
 <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
 {Array.from({ length: 3 }).map((_, i) => (
 <Skeleton key={i} className="h-48 w-full rounded-lg" />
 ))}
 </div>
 ) : templates.length === 0 ? (
 <Card>
 <CardContent className="flex flex-col items-center justify-center py-16 text-text-subtle ">
 <FileStack className="mb-3 h-10 w-10" />
 <p className="text-sm font-medium">{t("admin.contentLibrary.noTemplates")}</p>
 {isMethodistOrAdmin && (
 <p className="text-xs">{t("admin.contentLibrary.createFirstTemplate")}</p>
 )}
 </CardContent>
 </Card>
 ) : (
 <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
 {templates.map((course) => (
 <Card
 key={course.id}
 className="border-l-4 border-l-primary transition-shadow hover:shadow-md"
 >
 <CardContent className="p-5">
 <div className="mb-3 flex items-start justify-between">
 <div className="flex items-center gap-2">
 <FileStack className="h-5 w-5 text-primary" />
 <span
 className={`rounded-pill px-2 py-0.5 text-[10px] font-semibold uppercase ${
 course.status === "published"
 ? "bg-primary-soft text-success-fg "
 : "bg-ink-100 text-text-muted "
 }`}
 >
 {course.status}
 </span>
 </div>
 <span className="text-[10px] text-text-subtle">v{course.template_version}</span>
 </div>

 <h3 className="mb-1 text-sm font-semibold text-text ">
 {course.title}
 </h3>
 {course.description && (
 <p className="mb-3 line-clamp-2 text-xs text-text-muted ">
 {course.description}
 </p>
 )}

 <div className="mb-3 flex items-center gap-3 text-xs text-text-subtle">
 {course.category && (
 <span className="rounded bg-ink-100 px-1.5 py-0.5 ">
 {course.category}
 </span>
 )}
 <span className="flex items-center gap-1">
 <BookOpen className="h-3 w-3" />
 {course.modules?.length || 0} modules
 </span>
 </div>

 {/* Actions */}
 <div className="flex gap-2">
 {isMethodistOrAdmin && (
 <>
 <Button
 variant="outline"
 size="sm"
 onClick={() => router.push(`/admin/courses/${course.id}/edit`)}
 >
 <Pencil className="h-3.5 w-3.5" />
 {t("common.edit")}
 </Button>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => handleDelete(course)}
 className="text-danger-fg hover:text-danger-fg"
 >
 <Trash2 className="h-3.5 w-3.5" />
 </Button>
 </>
 )}
 {course.status === "published" && (
 <Button
 size="sm"
 onClick={() => {
 setCopyModal(course);
 setSelectedGroups([]);
 }}
 className={isMethodistOrAdmin ? "ml-auto" : ""}
 >
 <Copy className="h-3.5 w-3.5" />
 {t("admin.contentLibrary.useTemplate")}
 </Button>
 )}
 </div>
 </CardContent>
 </Card>
 ))}
 </div>
 )}

 {/* Copy Modal */}
 {copyModal && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40">
 <div className="mx-4 w-full max-w-md rounded-lg bg-paper-2 p-6 shadow-xl ">
 <div className="mb-4 flex items-center justify-between">
 <h2 className="text-lg font-semibold text-text ">
 {t("admin.contentLibrary.useTemplate")}
 </h2>
 <button
 onClick={() => setCopyModal(null)}
 className="rounded-md p-1 text-text-subtle hover:bg-ink-100 "
 >
 <X className="h-4 w-4" />
 </button>
 </div>

 <p className="mb-1 text-sm text-text-muted ">
 {/* Render the prompt: backend message contains HTML-like markers */}
 <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(t("admin.contentLibrary.copyTemplatePrompt").replace("{title}", copyModal.title)) }} />
 </p>
 <p className="mb-4 text-xs text-text-subtle">
 {t("admin.contentLibrary.selectGroupsHint")}
 </p>

 {/* Group selection */}
 <div className="mb-4 max-h-48 space-y-2 overflow-y-auto">
 {groups.length === 0 ? (
 <p className="py-4 text-center text-xs text-text-subtle">
 {t("admin.contentLibrary.noGroupsHint")}
 </p>
 ) : (
 groups.map((group) => (
 <button
 key={group.id}
 onClick={() => toggleGroup(group.id)}
 className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
 selectedGroups.includes(group.id)
 ? "border-primary bg-success-soft "
 : "border-border-strong hover:bg-surface-2 "
 }`}
 >
 <div
 className={`flex h-5 w-5 items-center justify-center rounded border ${
 selectedGroups.includes(group.id)
 ? "border-primary bg-primary"
 : "border-ink-300 "
 }`}
 >
 {selectedGroups.includes(group.id) && (
 <CheckCircle className="h-3.5 w-3.5 text-white" />
 )}
 </div>
 <div className="flex-1">
 <p className="text-sm font-medium text-ink-700 ">
 {group.name}
 </p>
 {group.member_count != null && (
 <p className="flex items-center gap-1 text-xs text-text-subtle">
 <Users className="h-3 w-3" />
 {group.member_count} {t("admin.groups.members")}
 </p>
 )}
 </div>
 </button>
 ))
 )}
 </div>

 <div className="flex gap-2">
 <Button variant="outline" className="flex-1" onClick={() => setCopyModal(null)}>
 {t("common.cancel")}
 </Button>
 <Button className="flex-1" onClick={handleCopy} disabled={copying}>
 <Copy className="h-4 w-4" />
 {copying
 ? t("admin.contentLibrary.copying")
 : selectedGroups.length > 0
 ? t("admin.contentLibrary.copyAndEnroll")
 : t("admin.contentLibrary.copyCourse")}
 </Button>
 </div>
 </div>
 </div>
 )}
 </>
 );
}

// ─── Exercises Tab (original content) ───

function ExercisesTab() {
 const { t } = useTranslation();
 const router = useRouter();
 const confirm = useConfirm();
 const [exercises, setExercises] = useState<Exercise[]>([]);
 const [total, setTotal] = useState(0);
 const [loading, setLoading] = useState(true);
 const [search, setSearch] = useState("");
 const [activeType, setActiveType] = useState<ExerciseType | "all">("all");
 const [page, setPage] = useState(1);
 const perPage = 50;

 const fetchExercises = () => {
 setLoading(true);
 const params: Record<string, unknown> = { page, per_page: perPage };
 if (activeType !== "all") params.exercise_type = activeType;
 if (search.trim()) params.search = search.trim();

 exercisesApi
 .list(params as Parameters<typeof exercisesApi.list>[0])
 .then(({ data }) => {
 setExercises(data.items);
 setTotal(data.total);
 })
 .catch(() => toast.error(t("admin.contentLibrary.failedLoadExercises")))
 .finally(() => setLoading(false));
 };

 useEffect(() => {
 fetchExercises();
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [activeType, page]);

 useEffect(() => {
 const timeout = setTimeout(() => {
 setPage(1);
 fetchExercises();
 }, 400);
 return () => clearTimeout(timeout);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [search]);

 const handleDelete = async (exercise: Exercise) => {
 const ok = await confirm({
 title: t("admin.contentLibrary.deleteExerciseTitle"),
 message: t("admin.contentLibrary.deleteExerciseMsg").replace("{title}", exercise.title).replace("{id}", exercise.display_id),
 confirmLabel: t("common.delete"),
 variant: "danger",
 });
 if (!ok) return;
 try {
 await exercisesApi.delete(exercise.id);
 toast.success(t("admin.contentLibrary.exerciseDeleted"));
 fetchExercises();
 } catch {
 toast.error(t("admin.contentLibrary.failedDeleteExercise"));
 }
 };

 const totalPages = Math.ceil(total / perPage);

 return (
 <>
 {/* Search & Filters */}
 <Card>
 <CardContent className="p-4">
 <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
 <div className="relative flex-1">
 <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle" />
 <input
 type="text"
 placeholder={t("admin.contentLibrary.searchByTitleOrId")}
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="w-full rounded-lg border border-border-strong bg-paper-2 py-2 pl-10 pr-4 text-sm text-ink-700 placeholder-ink-300 outline-none $1:border-primary focus:ring-2 focus:ring-primary-soft "
 />
 </div>
 </div>

 <div className="mt-3 flex flex-wrap gap-2">
 <button
 onClick={() => { setActiveType("all"); setPage(1); }}
 className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
 activeType === "all"
 ? "bg-primary-soft text-success-fg "
 : "bg-ink-100 text-text-muted hover:bg-ink-200 "
 }`}
 >
 {t("admin.contentLibrary.allLabel")} ({total})
 </button>
 {ALL_TYPES.map((type) => {
 const Icon = TYPE_ICONS[type];
 return (
 <button
 key={type}
 onClick={() => { setActiveType(type); setPage(1); }}
 className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
 activeType === type
 ? EXERCISE_TYPE_COLORS[type]
 : "bg-ink-100 text-text-muted hover:bg-ink-200 "
 }`}
 >
 <Icon className="h-3.5 w-3.5" />
 {EXERCISE_TYPE_LABELS[type]}
 </button>
 );
 })}
 </div>
 </CardContent>
 </Card>

 {/* Table */}
 <Card>
 <CardContent className="p-0">
 {loading ? (
 <div className="space-y-3 p-6">
 {Array.from({ length: 5 }).map((_, i) => (
 <Skeleton key={i} className="h-12 w-full" />
 ))}
 </div>
 ) : exercises.length === 0 ? (
 <div className="flex flex-col items-center justify-center py-16 text-text-subtle ">
 <Library className="mb-3 h-10 w-10" />
 <p className="text-sm font-medium">{t("admin.contentLibrary.noExercisesFound")}</p>
 <p className="text-xs">{t("admin.contentLibrary.noExercisesHint")}</p>
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr className="border-b border-border ">
 <th className="px-6 py-3 text-left font-semibold text-text-muted ">{t("admin.contentLibrary.idCol")}</th>
 <th className="px-6 py-3 text-left font-semibold text-text-muted ">{t("admin.contentLibrary.titleCol")}</th>
 <th className="px-6 py-3 text-left font-semibold text-text-muted ">{t("admin.contentLibrary.typeCol")}</th>
 <th className="px-6 py-3 text-left font-semibold text-text-muted ">{t("admin.contentLibrary.createdCol")}</th>
 <th className="px-6 py-3 text-right font-semibold text-text-muted ">{t("common.actions")}</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border ">
 {exercises.map((ex) => {
 const Icon = TYPE_ICONS[ex.exercise_type];
 return (
 <tr
 key={ex.id}
 className="cursor-pointer transition-colors hover:bg-surface-2 "
 onClick={() => router.push(`/admin/content-library/${ex.id}`)}
 >
 <td className="px-6 py-3">
 <span className="rounded bg-ink-100 px-2 py-0.5 font-mono text-xs font-medium text-text-muted ">
 {ex.display_id}
 </span>
 </td>
 <td className="px-6 py-3 font-medium text-ink-700 ">
 {ex.title}
 </td>
 <td className="px-6 py-3">
 <span className={`inline-flex items-center gap-1.5 rounded-pill px-2.5 py-0.5 text-xs font-medium ${EXERCISE_TYPE_COLORS[ex.exercise_type]}`}>
 <Icon className="h-3 w-3" />
 {EXERCISE_TYPE_LABELS[ex.exercise_type]}
 </span>
 </td>
 <td className="px-6 py-3 text-text-muted ">
 {new Date(ex.created_at).toLocaleDateString()}
 </td>
 <td className="px-6 py-3">
 <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => router.push(`/admin/content-library/${ex.id}`)}
 title={t("admin.contentLibrary.editExerciseTitle")}
 >
 <Pencil className="h-4 w-4" />
 </Button>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => router.push(`/admin/content-library/${ex.id}/submissions`)}
 title={t("admin.contentLibrary.viewSubmissionsTitle")}
 >
 <Eye className="h-4 w-4" />
 </Button>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => handleDelete(ex)}
 title={t("common.delete")}
 className="text-danger-fg hover:text-danger-fg "
 >
 <Trash2 className="h-4 w-4" />
 </Button>
 </div>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 )}

 {totalPages > 1 && (
 <div className="flex items-center justify-between border-t border-border px-6 py-3 ">
 <p className="text-xs text-text-muted ">
 {t("admin.contentLibrary.pageOf").replace("{page}", String(page)).replace("{total}", String(totalPages)).replace("{count}", String(total))}
 </p>
 <div className="flex gap-2">
 <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
 {t("common.previous")}
 </Button>
 <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
 {t("common.next")}
 </Button>
 </div>
 </div>
 )}
 </CardContent>
 </Card>
 </>
 );
}

// ─── Assignments Tab ───

const STATUS_BADGE: Record<string, string> = {
 overdue: "bg-danger-soft text-danger-fg ",
 active: "bg-primary-soft text-success-fg ",
 graded: "bg-info-soft text-info-fg ",
};

function AssignmentsTab() {
 const { t } = useTranslation();
 const router = useRouter();
 const confirm = useConfirm();

 const [assignments, setAssignments] = useState<Assignment[]>([]);
 const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);
 const [loading, setLoading] = useState(true);
 const [search, setSearch] = useState("");
 const [showForm, setShowForm] = useState(false);
 const [submitting, setSubmitting] = useState(false);

 // Create form state
 const [formCourseId, setFormCourseId] = useState("");
 const [formTitle, setFormTitle] = useState("");
 const [formDescription, setFormDescription] = useState("");
 const [formDueDate, setFormDueDate] = useState("");
 const [formMaxScore, setFormMaxScore] = useState(100);
 const [formAllowLate, setFormAllowLate] = useState(false);

 const fetchAssignments = useCallback(() => {
 setLoading(true);
 apiClient
 .get("/assignments")
 .then(({ data }) => {
 setAssignments(Array.isArray(data) ? data : data.items ?? []);
 })
 .catch(() => toast.error(t("admin.contentLibrary.failedLoadAssignments")))
 .finally(() => setLoading(false));
 }, []);

 useEffect(() => {
 fetchAssignments();
 apiClient
 .get("/courses")
 .then(({ data }) => {
 const list = Array.isArray(data) ? data : data.items ?? [];
 setCourses(list.map((c: Course) => ({ id: c.id, title: c.title })));
 })
 .catch(() => {});
 }, [fetchAssignments]);

 const handleDelete = async (assignment: Assignment) => {
 const ok = await confirm({
 title: t("admin.contentLibrary.deleteAssignmentTitle"),
 message: t("admin.contentLibrary.deleteAssignmentMsg").replace("{title}", assignment.title),
 confirmLabel: t("common.delete"),
 variant: "danger",
 });
 if (!ok) return;
 try {
 await apiClient.delete(`/assignments/${assignment.id}`);
 toast.success(t("admin.contentLibrary.assignmentDeleted"));
 setAssignments((prev) => prev.filter((a) => a.id !== assignment.id));
 } catch {
 toast.error(t("admin.contentLibrary.failedDeleteAssignment"));
 }
 };

 const resetForm = () => {
 setFormCourseId("");
 setFormTitle("");
 setFormDescription("");
 setFormDueDate("");
 setFormMaxScore(100);
 setFormAllowLate(false);
 };

 const handleCreate = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!formTitle.trim() || !formDueDate || !formCourseId) {
 toast.error(t("admin.contentLibrary.fillRequired"));
 return;
 }
 setSubmitting(true);
 try {
 await apiClient.post("/assignments", {
 course_id: formCourseId,
 title: formTitle.trim(),
 description: formDescription.trim() || undefined,
 due_date: formDueDate,
 max_score: formMaxScore,
 allow_late: formAllowLate,
 });
 toast.success(t("admin.contentLibrary.assignmentCreated"));
 resetForm();
 setShowForm(false);
 fetchAssignments();
 } catch {
 toast.error(t("admin.contentLibrary.failedCreateAssignment"));
 } finally {
 setSubmitting(false);
 }
 };

 const deriveStatus = (a: Assignment): string => {
 if (a.status) return a.status;
 const due = new Date(a.due_date);
 if (due < new Date()) return "overdue";
 return "active";
 };

 const filtered = assignments.filter((a) =>
 a.title.toLowerCase().includes(search.toLowerCase())
 );

 const inputClass =
 "w-full rounded-lg border border-border-strong bg-paper-2 py-2 px-3 text-sm text-ink-700 placeholder-ink-300 outline-none $1:border-primary focus:ring-2 focus:ring-primary-soft ";

 return (
 <>
 {/* Search & Create */}
 <Card>
 <CardContent className="p-4">
 <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
 <div className="relative flex-1">
 <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle" />
 <input
 type="text"
 placeholder={t("admin.contentLibrary.searchAssignments")}
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="w-full rounded-lg border border-border-strong bg-paper-2 py-2 pl-10 pr-4 text-sm text-ink-700 placeholder-ink-300 outline-none $1:border-primary focus:ring-2 focus:ring-primary-soft "
 />
 </div>
 <Button onClick={() => setShowForm((v) => !v)}>
 {showForm ? (
 <>
 <X className="h-4 w-4" />
 {t("common.cancel")}
 </>
 ) : (
 <>
 <Plus className="h-4 w-4" />
 {t("admin.contentLibrary.createAssignment")}
 </>
 )}
 </Button>
 </div>
 </CardContent>
 </Card>

 {/* Inline Create Form */}
 {showForm && (
 <Card>
 <CardContent className="p-6">
 <h3 className="mb-4 text-sm font-semibold text-text ">
 {t("admin.courseEdit.newAssignment")}
 </h3>
 <form onSubmit={handleCreate} className="space-y-4">
 <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
 {/* Course */}
 <div>
 <label className="mb-1 block text-xs font-medium text-text-muted ">
 {t("admin.contentLibrary.courseCol")} <span className="text-danger-fg">*</span>
 </label>
 <select
 value={formCourseId}
 onChange={(e) => setFormCourseId(e.target.value)}
 required
 className={inputClass}
 >
 <option value="">{t("admin.contentLibrary.selectCoursePlaceholder")}</option>
 {courses.map((c) => (
 <option key={c.id} value={c.id}>
 {c.title}
 </option>
 ))}
 </select>
 </div>

 {/* Title */}
 <div>
 <label className="mb-1 block text-xs font-medium text-text-muted ">
 {t("common.title")} <span className="text-danger-fg">*</span>
 </label>
 <input
 type="text"
 value={formTitle}
 onChange={(e) => setFormTitle(e.target.value)}
 required
 placeholder={t("admin.courseEdit.assignmentTitlePlaceholder")}
 className={inputClass}
 />
 </div>

 {/* Due Date */}
 <div>
 <label className="mb-1 block text-xs font-medium text-text-muted ">
 {t("admin.contentLibrary.dueDateCol")} <span className="text-danger-fg">*</span>
 </label>
 <input
 type="datetime-local"
 value={formDueDate}
 onChange={(e) => setFormDueDate(e.target.value)}
 required
 className={inputClass}
 />
 </div>

 {/* Max Score */}
 <div>
 <label className="mb-1 block text-xs font-medium text-text-muted ">
 {t("admin.contentLibrary.maxScoreCol")}
 </label>
 <input
 type="number"
 value={formMaxScore}
 onChange={(e) => setFormMaxScore(Number(e.target.value))}
 min={0}
 className={inputClass}
 />
 </div>
 </div>

 {/* Description */}
 <div>
 <label className="mb-1 block text-xs font-medium text-text-muted ">
 {t("common.description")}
 </label>
 <textarea
 value={formDescription}
 onChange={(e) => setFormDescription(e.target.value)}
 rows={3}
 placeholder={t("admin.courseEdit.optionalDescPlaceholder")}
 className={inputClass}
 />
 </div>

 {/* Allow Late */}
 <label className="flex items-center gap-2 text-sm text-ink-700 ">
 <input
 type="checkbox"
 checked={formAllowLate}
 onChange={(e) => setFormAllowLate(e.target.checked)}
 className="h-4 w-4 rounded border-ink-300 text-primary focus:ring-primary "
 />
 {t("admin.assignments.allowLate")}
 </label>

 <div className="flex justify-end">
 <Button type="submit" disabled={submitting}>
 {submitting ? t("common.creating") : t("admin.contentLibrary.createAssignment")}
 </Button>
 </div>
 </form>
 </CardContent>
 </Card>
 )}

 {/* Table */}
 <Card>
 <CardContent className="p-0">
 {loading ? (
 <div className="space-y-3 p-6">
 {Array.from({ length: 5 }).map((_, i) => (
 <Skeleton key={i} className="h-12 w-full" />
 ))}
 </div>
 ) : filtered.length === 0 ? (
 <div className="flex flex-col items-center justify-center py-16 text-text-subtle ">
 <ClipboardList className="mb-3 h-10 w-10" />
 <p className="text-sm font-medium">{t("admin.contentLibrary.noAssignmentsFound")}</p>
 <p className="text-xs">{t("admin.contentLibrary.noAssignmentsHint")}</p>
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr className="border-b border-border ">
 <th className="px-6 py-3 text-left font-semibold text-text-muted ">{t("admin.contentLibrary.titleCol")}</th>
 <th className="px-6 py-3 text-left font-semibold text-text-muted ">{t("admin.contentLibrary.courseCol")}</th>
 <th className="px-6 py-3 text-left font-semibold text-text-muted ">{t("admin.contentLibrary.dueDateCol")}</th>
 <th className="px-6 py-3 text-left font-semibold text-text-muted ">{t("admin.contentLibrary.maxScoreCol")}</th>
 <th className="px-6 py-3 text-left font-semibold text-text-muted ">{t("admin.contentLibrary.submissionsCol")}</th>
 <th className="px-6 py-3 text-left font-semibold text-text-muted ">{t("admin.contentLibrary.statusCol")}</th>
 <th className="px-6 py-3 text-right font-semibold text-text-muted ">{t("common.actions")}</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border ">
 {filtered.map((a) => {
 const status = deriveStatus(a);
 const courseName =
 a.course_title ||
 courses.find((c) => c.id === a.course_id)?.title ||
 "—";
 return (
 <tr
 key={a.id}
 className="transition-colors hover:bg-surface-2 "
 >
 <td className="px-6 py-3 font-medium text-ink-700 ">
 {a.title}
 </td>
 <td className="px-6 py-3 text-text-muted ">
 {courseName}
 </td>
 <td className="px-6 py-3 text-text-muted ">
 {new Date(a.due_date).toLocaleString()}
 </td>
 <td className="px-6 py-3 text-text-muted ">
 {a.max_score}
 </td>
 <td className="px-6 py-3 text-text-muted ">
 {a.submissions_count ?? 0}
 </td>
 <td className="px-6 py-3">
 <span
 className={`inline-flex rounded-pill px-2.5 py-0.5 text-xs font-medium ${
 STATUS_BADGE[status] ?? STATUS_BADGE.active
 }`}
 >
 {status}
 </span>
 </td>
 <td className="px-6 py-3">
 <div className="flex items-center justify-end gap-1">
 <Button
 variant="ghost"
 size="sm"
 onClick={() =>
 window.open(`/admin/assignments/${a.id}/edit`, "_blank")
 }
 title={t("common.edit")}
 >
 <Pencil className="h-4 w-4" />
 </Button>
 <Button
 variant="ghost"
 size="sm"
 onClick={() =>
 window.open(`/admin/assignments/${a.id}/review`, "_blank")
 }
 title={t("admin.courseEdit.reviewSubmissionsTitle")}
 >
 <Eye className="h-4 w-4" />
 </Button>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => handleDelete(a)}
 title={t("common.delete")}
 className="text-danger-fg hover:text-danger-fg "
 >
 <Trash2 className="h-4 w-4" />
 </Button>
 </div>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 )}
 </CardContent>
 </Card>
 </>
 );
}

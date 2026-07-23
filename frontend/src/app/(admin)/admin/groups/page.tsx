"use client";

import { useEffect, useState, useCallback } from "react";
import apiClient from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StartLessonButton } from "@/components/live/start-lesson-button";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm-dialog";
import {
 UsersRound,
 Plus,
 Trash2,
 UserPlus,
 UserMinus,
 BookOpen,
 ChevronDown,
 ChevronUp,
 Search,
 X,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";

interface Group {
 id: string;
 name: string;
 description: string | null;
 member_count: number;
 created_at: string;
}

interface Member {
 id: string;
 full_name: string;
 email: string;
 role: string;
 member_id: string;
}

interface UserOption {
 id: string;
 full_name: string;
 email: string;
 role: string;
}

interface CourseOption {
 id: string;
 title: string;
}

export default function GroupsPage() {
 const { t } = useTranslation();
 const [groups, setGroups] = useState<Group[]>([]);
 const [users, setUsers] = useState<UserOption[]>([]);
 const [courses, setCourses] = useState<CourseOption[]>([]);
 const [loading, setLoading] = useState(true);
 const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
 const [members, setMembers] = useState<Record<string, Member[]>>({});
 const [showCreate, setShowCreate] = useState(false);
 const [newName, setNewName] = useState("");
 const [newDesc, setNewDesc] = useState("");
 const [addingMembers, setAddingMembers] = useState<string | null>(null);
 const [enrollingGroup, setEnrollingGroup] = useState<string | null>(null);
 const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
 const [selectedCourse, setSelectedCourse] = useState("");
 const [userSearch, setUserSearch] = useState("");
 const confirm = useConfirm();

 const fetchGroups = useCallback(() => {
 apiClient
 .get("/admin/groups")
 .then(({ data }) => setGroups(data))
 .catch(() => toast.error(t("admin.groups.failedLoad")))
 .finally(() => setLoading(false));
 }, []);

 useEffect(() => {
 fetchGroups();
 apiClient.get("/admin/users").then(({ data }) => setUsers(data));
 apiClient.get("/admin/courses").then(({ data }) => setCourses(data));
 }, [fetchGroups]);

 const fetchMembers = async (groupId: string) => {
 const { data } = await apiClient.get(`/admin/groups/${groupId}/members`);
 setMembers((prev) => ({ ...prev, [groupId]: data }));
 };

 const toggleExpand = (groupId: string) => {
 if (expandedGroup === groupId) {
 setExpandedGroup(null);
 } else {
 setExpandedGroup(groupId);
 fetchMembers(groupId);
 }
 setAddingMembers(null);
 setEnrollingGroup(null);
 };

 const createGroup = async () => {
 if (!newName.trim()) return;
 try {
 await apiClient.post("/admin/groups", {
 name: newName.trim(),
 description: newDesc.trim() || null,
 });
 toast.success(t("admin.groups.groupCreated"));
 setNewName("");
 setNewDesc("");
 setShowCreate(false);
 fetchGroups();
 } catch {
 toast.error(t("admin.groups.failedCreate"));
 }
 };

 const deleteGroup = async (g: Group) => {
 const ok = await confirm({
 title: t("admin.groups.deleteGroupTitle"),
 message: t("admin.groups.deleteGroupMsg").replace("{name}", g.name),
 variant: "danger",
 });
 if (!ok) return;
 try {
 await apiClient.delete(`/admin/groups/${g.id}`);
 toast.success(t("admin.groups.groupDeleted"));
 fetchGroups();
 } catch {
 toast.error(t("admin.groups.failedDelete"));
 }
 };

 const addMembers = async (groupId: string) => {
 if (selectedUsers.length === 0) return;
 try {
 const { data } = await apiClient.post(
 `/admin/groups/${groupId}/members`,
 { user_ids: selectedUsers }
 );
 toast.success(t("admin.groups.memberAddedCount").replace("{count}", String(data.added)));
 setSelectedUsers([]);
 setAddingMembers(null);
 fetchMembers(groupId);
 fetchGroups();
 } catch {
 toast.error(t("admin.groups.failedAddMembers"));
 }
 };

 const removeMember = async (groupId: string, userId: string, name: string) => {
 const ok = await confirm({
 title: t("admin.groups.removeMemberTitle"),
 message: t("admin.groups.removeMemberMsg").replace("{name}", name),
 });
 if (!ok) return;
 try {
 await apiClient.delete(`/admin/groups/${groupId}/members/${userId}`);
 toast.success(t("admin.groups.memberRemoved"));
 fetchMembers(groupId);
 fetchGroups();
 } catch {
 toast.error(t("admin.groups.failedRemoveMember"));
 }
 };

 const enrollGroup = async (groupId: string) => {
 if (!selectedCourse) return;
 try {
 const { data } = await apiClient.post(
 `/admin/groups/${groupId}/enroll`,
 { course_id: selectedCourse }
 );
 toast.success(
 t("admin.groups.enrolledOf").replace("{enrolled}", String(data.enrolled)).replace("{total}", String(data.total_members))
 );
 setEnrollingGroup(null);
 setSelectedCourse("");
 } catch {
 toast.error(t("admin.groups.failedEnroll"));
 }
 };

 const filteredUsers = users.filter(
 (u) =>
 u.full_name.toLowerCase().includes(userSearch.toLowerCase()) ||
 u.email.toLowerCase().includes(userSearch.toLowerCase())
 );

 if (loading) {
 return (
 <div className="flex h-64 items-center justify-center">
 <div className="h-8 w-8 animate-spin rounded-pill border-4 border-primary border-t-transparent" />
 </div>
 );
 }

 return (
 <div className="mx-auto max-w-5xl">
 <div className="mb-8 flex items-center justify-between">
 <div>
 <h1 className="text-2xl font-bold text-text ">{t("admin.groups.title")}</h1>
 <p className="mt-1 text-sm text-text-muted ">
 {t("admin.groups.subtitle")}
 </p>
 </div>
 <Button onClick={() => setShowCreate(!showCreate)} size="sm">
 <Plus className="h-4 w-4" />
 {t("admin.groups.newGroup")}
 </Button>
 </div>

 {/* Create Form */}
 {showCreate && (
 <Card className="mb-6">
 <CardContent className="p-5">
 <h3 className="mb-3 font-semibold text-ink-700 ">{t("admin.groups.createGroup")}</h3>
 <div className="space-y-3">
 <input
 type="text"
 placeholder={t("admin.groups.namePlaceholder")}
 value={newName}
 onChange={(e) => setNewName(e.target.value)}
 className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
 autoFocus
 />
 <input
 type="text"
 placeholder={t("admin.groups.descPlaceholder")}
 value={newDesc}
 onChange={(e) => setNewDesc(e.target.value)}
 className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
 />
 <div className="flex gap-2">
 <Button size="sm" onClick={createGroup} disabled={!newName.trim()}>
 {t("common.create")}
 </Button>
 <Button
 size="sm"
 variant="outline"
 onClick={() => setShowCreate(false)}
 >
 {t("common.cancel")}
 </Button>
 </div>
 </div>
 </CardContent>
 </Card>
 )}

 {/* Groups List */}
 {groups.length === 0 ? (
 <div className="flex flex-col items-center justify-center py-16 text-center">
 <div className="mb-4 rounded-pill bg-ink-100 p-4">
 <UsersRound className="h-8 w-8 text-text-subtle" />
 </div>
 <p className="text-sm text-text-muted ">
 {t("admin.groups.noGroupsYet")}
 </p>
 </div>
 ) : (
 <div className="space-y-3">
 {groups.map((g) => (
 <Card key={g.id} className="overflow-hidden">
 <div
 className="flex cursor-pointer items-center justify-between p-5 hover:bg-surface-2 "
 onClick={() => toggleExpand(g.id)}
 >
 <div className="flex items-center gap-3">
 <div className="rounded-lg bg-success-soft p-2.5">
 <UsersRound className="h-5 w-5 text-primary" />
 </div>
 <div>
 <h3 className="font-semibold text-text ">{g.name}</h3>
 {g.description && (
 <p className="text-xs text-text-muted ">{g.description}</p>
 )}
 </div>
 </div>
 <div className="flex items-center gap-3">
 <StartLessonButton groupId={g.id} />
 <span className="rounded-pill bg-ink-100 px-2.5 py-1 text-xs font-medium text-text-muted ">
 {g.member_count} {t("admin.groups.members")}
 </span>
 {expandedGroup === g.id ? (
 <ChevronUp className="h-4 w-4 text-text-subtle" />
 ) : (
 <ChevronDown className="h-4 w-4 text-text-subtle" />
 )}
 </div>
 </div>

 {expandedGroup === g.id && (
 <div className="border-t border-border bg-surface-2/50 p-5">
 {/* Action Buttons */}
 <div className="mb-4 flex flex-wrap gap-2">
 <Button
 size="sm"
 variant="outline"
 onClick={(e) => {
 e.stopPropagation();
 setAddingMembers(addingMembers === g.id ? null : g.id);
 setEnrollingGroup(null);
 }}
 >
 <UserPlus className="h-3.5 w-3.5" />
 {t("admin.groups.addMembers")}
 </Button>
 <Button
 size="sm"
 variant="outline"
 onClick={(e) => {
 e.stopPropagation();
 setEnrollingGroup(enrollingGroup === g.id ? null : g.id);
 setAddingMembers(null);
 }}
 >
 <BookOpen className="h-3.5 w-3.5" />
 {t("admin.groups.enrollInCourse")}
 </Button>
 <Button
 size="sm"
 variant="outline"
 className="ml-auto text-danger-fg hover:bg-danger-soft hover:text-danger-fg"
 onClick={(e) => {
 e.stopPropagation();
 deleteGroup(g);
 }}
 >
 <Trash2 className="h-3.5 w-3.5" />
 {t("common.delete")}
 </Button>
 </div>

 {/* Add Members Panel */}
 {addingMembers === g.id && (
 <div className="mb-4 rounded-lg border border-border-strong bg-paper-2 p-4">
 <h4 className="mb-2 text-sm font-medium text-ink-700 ">
 {t("admin.groups.selectUsersToAdd")}
 </h4>
 <div className="relative mb-2">
 <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-text-subtle" />
 <input
 type="text"
 placeholder={t("admin.groups.searchUsers")}
 value={userSearch}
 onChange={(e) => setUserSearch(e.target.value)}
 className="w-full rounded-lg border border-border-strong py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none"
 />
 {userSearch && (
 <button
 onClick={() => setUserSearch("")}
 className="absolute right-3 top-2.5"
 >
 <X className="h-3.5 w-3.5 text-text-subtle" />
 </button>
 )}
 </div>
 <div className="max-h-48 space-y-1 overflow-y-auto">
 {filteredUsers.map((u) => {
 const isMember = members[g.id]?.some(
 (m) => m.id === u.id
 );
 return (
 <label
 key={u.id}
 className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-2 ${
 isMember ? "opacity-40" : ""
 }`}
 >
 <input
 type="checkbox"
 disabled={isMember}
 checked={selectedUsers.includes(u.id)}
 onChange={(e) => {
 if (e.target.checked) {
 setSelectedUsers([...selectedUsers, u.id]);
 } else {
 setSelectedUsers(
 selectedUsers.filter((id) => id !== u.id)
 );
 }
 }}
 className="rounded border-ink-300"
 />
 <span className="font-medium text-ink-700 ">
 {u.full_name}
 </span>
 <span className="text-xs text-text-subtle">
 {u.email}
 </span>
 {isMember && (
 <span className="ml-auto text-xs text-text-subtle">
 {t("admin.groups.alreadyInGroup")}
 </span>
 )}
 </label>
 );
 })}
 </div>
 <div className="mt-3 flex gap-2">
 <Button
 size="sm"
 onClick={() => addMembers(g.id)}
 disabled={selectedUsers.length === 0}
 >
 {t("admin.groups.addCount")} {selectedUsers.length > 0 && `(${selectedUsers.length})`}
 </Button>
 <Button
 size="sm"
 variant="outline"
 onClick={() => {
 setAddingMembers(null);
 setSelectedUsers([]);
 }}
 >
 {t("common.cancel")}
 </Button>
 </div>
 </div>
 )}

 {/* Enroll in Course Panel */}
 {enrollingGroup === g.id && (
 <div className="mb-4 rounded-lg border border-border-strong bg-paper-2 p-4">
 <h4 className="mb-2 text-sm font-medium text-ink-700 ">
 {t("admin.groups.selectCourseToEnroll")}
 </h4>
 <select
 value={selectedCourse}
 onChange={(e) => setSelectedCourse(e.target.value)}
 className="mb-3 w-full rounded-lg border border-border-strong px-3 py-2 text-sm focus:border-primary focus:outline-none"
 >
 <option value="">{t("admin.groups.chooseCourse")}</option>
 {courses.map((c) => (
 <option key={c.id} value={c.id}>
 {c.title}
 </option>
 ))}
 </select>
 <div className="flex gap-2">
 <Button
 size="sm"
 onClick={() => enrollGroup(g.id)}
 disabled={!selectedCourse}
 >
 {t("admin.groups.enrollAll")}
 </Button>
 <Button
 size="sm"
 variant="outline"
 onClick={() => {
 setEnrollingGroup(null);
 setSelectedCourse("");
 }}
 >
 {t("common.cancel")}
 </Button>
 </div>
 </div>
 )}

 {/* Members List */}
 <div>
 <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-subtle">
 {t("admin.groups.membersLabel")}
 </h4>
 {!members[g.id] ? (
 <p className="text-sm text-text-subtle">{t("common.loading")}</p>
 ) : members[g.id].length === 0 ? (
 <p className="text-sm text-text-subtle">
 {t("admin.groups.noMembersYet")}
 </p>
 ) : (
 <div className="space-y-1">
 {members[g.id].map((m) => (
 <div
 key={m.id}
 className="flex items-center justify-between rounded-lg bg-paper-2 px-3 py-2"
 >
 <div className="flex items-center gap-2">
 <div className="flex h-7 w-7 items-center justify-center rounded-pill bg-primary-soft text-xs font-bold text-primary">
 {m.full_name.charAt(0).toUpperCase()}
 </div>
 <div>
 <p className="text-sm font-medium text-ink-700 ">
 {m.full_name}
 </p>
 <p className="text-xs text-text-subtle">
 {m.email}
 </p>
 </div>
 </div>
 <button
 onClick={() =>
 removeMember(g.id, m.id, m.full_name)
 }
 className="rounded p-1 text-ink-300 hover:bg-danger-soft hover:text-danger-fg"
 >
 <UserMinus className="h-4 w-4" />
 </button>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 )}
 </Card>
 ))}
 </div>
 )}
 </div>
 );
}

"use client";

import { useEffect, useState } from "react";
import apiClient from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { MessageSquare, Send, Trash2, Reply, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm-dialog";

interface CommentData {
 id: string;
 lesson_id: string;
 user_id: string;
 user_name: string;
 user_avatar: string | null;
 body: string;
 parent_id: string | null;
 replies: CommentData[];
 created_at: string;
}

interface CommentSectionProps {
 lessonId: string;
}

export default function CommentSection({ lessonId }: CommentSectionProps) {
 const confirm = useConfirm();
 const user = useAuthStore((s) => s.user);
 const [comments, setComments] = useState<CommentData[]>([]);
 const [newComment, setNewComment] = useState("");
 const [submitting, setSubmitting] = useState(false);
 const [loading, setLoading] = useState(true);
 const [collapsed, setCollapsed] = useState(false);

 useEffect(() => {
 apiClient
 .get(`/discussions/lessons/${lessonId}/comments`)
 .then(({ data }) => setComments(data))
 .catch(() => {})
 .finally(() => setLoading(false));
 }, [lessonId]);

 const handleSubmit = async () => {
 if (!newComment.trim()) return;
 setSubmitting(true);
 try {
 const { data } = await apiClient.post(
 `/discussions/lessons/${lessonId}/comments`,
 { body: newComment.trim() }
 );
 setComments([data, ...comments]);
 setNewComment("");
 toast.success("Comment posted");
 } catch {
 toast.error("Failed to post comment");
 } finally {
 setSubmitting(false);
 }
 };

 const handleReply = async (parentId: string, body: string) => {
 try {
 const { data } = await apiClient.post(
 `/discussions/lessons/${lessonId}/comments`,
 { body, parent_id: parentId }
 );
 // Add reply to correct parent
 setComments((prev) =>
 prev.map((c) =>
 c.id === parentId
 ? { ...c, replies: [...c.replies, data] }
 : c
 )
 );
 toast.success("Reply posted");
 } catch {
 toast.error("Failed to reply");
 }
 };

 const handleDelete = async (commentId: string) => {
 if (!(await confirm({ message: "Delete this comment?", variant: "danger", confirmLabel: "Delete" }))) return;
 try {
 await apiClient.delete(`/discussions/comments/${commentId}`);
 // Remove from top-level or from replies
 setComments((prev) =>
 prev
 .filter((c) => c.id !== commentId)
 .map((c) => ({
 ...c,
 replies: c.replies.filter((r) => r.id !== commentId),
 }))
 );
 toast.success("Comment deleted");
 } catch {
 toast.error("Failed to delete");
 }
 };

 return (
 <div className="border-t border-border-strong pt-6">
 <button
 onClick={() => setCollapsed(!collapsed)}
 className="mb-4 flex items-center gap-2 text-lg font-semibold text-text"
 >
 <MessageSquare className="h-5 w-5 text-primary" />
 Discussion ({comments.length})
 {collapsed ? (
 <ChevronDown className="h-4 w-4 text-text-subtle" />
 ) : (
 <ChevronUp className="h-4 w-4 text-text-subtle" />
 )}
 </button>

 {!collapsed && (
 <div className="space-y-4">
 {/* New comment form */}
 <div className="flex gap-3">
 <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-pill bg-gradient-to-br from-green-500 to-emerald-500 text-xs font-semibold text-white">
 {user?.full_name?.charAt(0)?.toUpperCase() || "?"}
 </div>
 <div className="flex-1">
 <textarea
 value={newComment}
 onChange={(e) => setNewComment(e.target.value)}
 placeholder="Add a comment..."
 rows={2}
 className="w-full rounded-lg border border-border-strong px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-green-500"
 onKeyDown={(e) => {
 if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
 handleSubmit();
 }
 }}
 />
 <div className="mt-2 flex items-center justify-between">
 <span className="text-[10px] text-text-subtle">Ctrl+Enter to send</span>
 <Button
 size="sm"
 onClick={handleSubmit}
 disabled={submitting || !newComment.trim()}
 >
 <Send className="mr-1 h-3 w-3" />
 {submitting ? "Posting..." : "Post"}
 </Button>
 </div>
 </div>
 </div>

 {/* Loading */}
 {loading && (
 <div className="flex justify-center py-4">
 <div className="h-5 w-5 animate-spin rounded-pill border-2 border-primary border-t-transparent" />
 </div>
 )}

 {/* Comments list */}
 {!loading && comments.length === 0 && (
 <p className="py-4 text-center text-sm text-text-subtle">
 No comments yet. Be the first to discuss!
 </p>
 )}

 {!loading &&
 comments.map((comment) => (
 <CommentItem
 key={comment.id}
 comment={comment}
 currentUserId={user?.id}
 currentUserRole={user?.role}
 onReply={handleReply}
 onDelete={handleDelete}
 />
 ))}
 </div>
 )}
 </div>
 );
}

function CommentItem({
 comment,
 currentUserId,
 currentUserRole,
 onReply,
 onDelete,
}: {
 comment: CommentData;
 currentUserId?: string;
 currentUserRole?: string;
 onReply: (parentId: string, body: string) => Promise<void>;
 onDelete: (commentId: string) => Promise<void>;
}) {
 const [replying, setReplying] = useState(false);
 const [replyText, setReplyText] = useState("");
 const [sending, setSending] = useState(false);

 const canDelete =
 comment.user_id === currentUserId || currentUserRole === "admin";

 const handleSendReply = async () => {
 if (!replyText.trim()) return;
 setSending(true);
 await onReply(comment.id, replyText.trim());
 setReplyText("");
 setReplying(false);
 setSending(false);
 };

 const timeAgo = (dateStr: string) => {
 const diff = Date.now() - new Date(dateStr).getTime();
 const mins = Math.floor(diff / 60000);
 if (mins < 1) return "just now";
 if (mins < 60) return `${mins}m ago`;
 const hours = Math.floor(mins / 60);
 if (hours < 24) return `${hours}h ago`;
 const days = Math.floor(hours / 24);
 if (days < 30) return `${days}d ago`;
 return new Date(dateStr).toLocaleDateString();
 };

 return (
 <div className="flex gap-3">
 <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-pill bg-ink-200 text-xs font-semibold text-text-muted">
 {comment.user_name.charAt(0).toUpperCase()}
 </div>
 <div className="min-w-0 flex-1">
 <div className="rounded-lg bg-surface-2 px-3 py-2">
 <div className="mb-1 flex items-center gap-2">
 <span className="text-sm font-semibold text-ink-700">
 {comment.user_name}
 </span>
 <span className="text-[10px] text-text-subtle">
 {timeAgo(comment.created_at)}
 </span>
 </div>
 <p className="whitespace-pre-wrap text-sm text-text-muted">
 {comment.body}
 </p>
 </div>

 {/* Actions */}
 <div className="mt-1 flex items-center gap-3 px-1">
 <button
 onClick={() => setReplying(!replying)}
 className="flex items-center gap-1 text-[11px] font-medium text-text-subtle hover:text-primary"
 >
 <Reply className="h-3 w-3" />
 Reply
 </button>
 {canDelete && (
 <button
 onClick={() => onDelete(comment.id)}
 className="flex items-center gap-1 text-[11px] font-medium text-text-subtle hover:text-danger-fg"
 >
 <Trash2 className="h-3 w-3" />
 Delete
 </button>
 )}
 </div>

 {/* Reply form */}
 {replying && (
 <div className="mt-2 flex gap-2">
 <input
 type="text"
 value={replyText}
 onChange={(e) => setReplyText(e.target.value)}
 placeholder="Write a reply..."
 className="flex-1 rounded-lg border border-border-strong px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
 onKeyDown={(e) => e.key === "Enter" && handleSendReply()}
 autoFocus
 />
 <Button size="sm" onClick={handleSendReply} disabled={sending}>
 <Send className="h-3 w-3" />
 </Button>
 </div>
 )}

 {/* Nested replies */}
 {comment.replies.length > 0 && (
 <div className="mt-2 space-y-2 border-l-2 border-border pl-3">
 {comment.replies.map((reply) => (
 <CommentItem
 key={reply.id}
 comment={reply}
 currentUserId={currentUserId}
 currentUserRole={currentUserRole}
 onReply={onReply}
 onDelete={onDelete}
 />
 ))}
 </div>
 )}
 </div>
 </div>
 );
}

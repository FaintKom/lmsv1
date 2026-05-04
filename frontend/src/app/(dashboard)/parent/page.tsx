"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import apiClient from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth-store";
import { useTranslation } from "@/lib/i18n/context";

interface Child {
 id: string;
 full_name: string;
 email: string;
 avatar_url: string | null;
}

export default function ParentDashboard() {
 const user = useAuthStore((s) => s.user);
 const { t } = useTranslation();
 const [children, setChildren] = useState<Child[]>([]);
 const [loading, setLoading] = useState(true);
 const [linkEmail, setLinkEmail] = useState("");
 const [linking, setLinking] = useState(false);

 const fetchChildren = async () => {
 try {
 const { data } = await apiClient.get("/parent/children");
 setChildren(data);
 } catch {
 // parent might not have children yet
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => { fetchChildren(); }, []);

 const handleLink = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!linkEmail) return;
 setLinking(true);
 try {
 await apiClient.post("/parent/children/link", { child_email: linkEmail });
 toast.success("Child linked successfully");
 setLinkEmail("");
 fetchChildren();
 } catch (err: any) {
 toast.error(err?.response?.data?.detail || "Failed to link child");
 } finally {
 setLinking(false);
 }
 };

 return (
 <div className="mx-auto max-w-4xl space-y-6 p-6">
 <div>
 <h1 className="text-2xl font-bold text-text ">
 {t("parent.welcome")} {user?.full_name}
 </h1>
 <p className="text-base text-text-muted ">
 {t("parent.subtitle")}
 </p>
 </div>

 {/* Link child */}
 <Card>
 <CardHeader>
 <CardTitle className="text-sm">{t("parent.linkChild")}</CardTitle>
 </CardHeader>
 <CardContent>
 <form onSubmit={handleLink} className="flex gap-2">
 <input
 type="email"
 placeholder={t("parent.childEmail")}
 value={linkEmail}
 onChange={(e) => setLinkEmail(e.target.value)}
 required
 className="flex-1 rounded-lg border border-border-strong px-3 py-2 text-sm "
 />
 <button
 type="submit"
 disabled={linking}
 className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white $1:bg-primary-hover disabled:opacity-50"
 >
 {linking ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
 {t("parent.link")}
 </button>
 </form>
 </CardContent>
 </Card>

 {/* Children */}
 {loading ? (
 <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
 ) : children.length === 0 ? (
 <Card>
 <CardContent className="flex flex-col items-center py-12 text-center">
 <div className="mb-3 rounded-pill bg-ink-100 p-3 ">
 <Users className="h-6 w-6 text-text-subtle" />
 </div>
 <p className="text-sm font-medium text-text-muted">{t("parent.noChildren")}</p>
 <p className="mt-1 text-xs text-text-subtle">{t("parent.noChildrenHint")}</p>
 </CardContent>
 </Card>
 ) : (
 <div className="grid gap-4 sm:grid-cols-2">
 {children.map((child) => (
 <Link key={child.id} href={`/parent/children/${child.id}`}>
 <Card className="border-l-4 border-l-green-400 transition-shadow hover:shadow-md">
 <CardContent className="flex items-center gap-4 p-4">
 <div className="flex h-12 w-12 items-center justify-center rounded-pill bg-gradient-to-br from-green-500 to-emerald-500 text-lg font-bold text-white">
 {child.full_name.charAt(0).toUpperCase()}
 </div>
 <div className="flex-1">
 <p className="font-semibold text-ink-700 ">{child.full_name}</p>
 <p className="text-xs text-text-subtle">{child.email}</p>
 </div>
 <ArrowRight className="h-4 w-4 text-ink-300" />
 </CardContent>
 </Card>
 </Link>
 ))}
 </div>
 )}
 </div>
 );
}

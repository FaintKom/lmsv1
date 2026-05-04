"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import apiClient from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Route, ArrowRight, CheckCircle, Lock } from "lucide-react";
import { toast } from "sonner";

interface PathItem {
 id: string;
 title: string;
 description: string;
 is_published: boolean;
 step_count: number;
 enrolled: boolean;
 current_step: number;
 created_at: string;
}

export default function PathsPage() {
 const [paths, setPaths] = useState<PathItem[]>([]);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 apiClient
 .get("/learning-paths/")
 .then(({ data }) => setPaths(data))
 .catch(() => {})
 .finally(() => setLoading(false));
 }, []);

 const handleEnroll = async (pathId: string) => {
 try {
 await apiClient.post(`/learning-paths/${pathId}/enroll`);
 toast.success("Enrolled in learning path!");
 // Refresh
 const { data } = await apiClient.get("/learning-paths/");
 setPaths(data);
 } catch {
 toast.error("Failed to enroll");
 }
 };

 if (loading) {
 return (
 <div className="flex h-64 items-center justify-center">
 <div className="h-8 w-8 animate-spin rounded-pill border-4 border-primary border-t-transparent" />
 </div>
 );
 }

 return (
 <div className="mx-auto max-w-4xl">
 <div className="mb-8">
 <h1 className="text-2xl font-bold text-text ">Learning Paths</h1>
 <p className="mt-1 text-base text-text-muted ">
 Follow structured course sequences to master a topic
 </p>
 </div>

 {paths.length === 0 ? (
 <Card>
 <CardContent className="flex flex-col items-center justify-center p-12 text-center">
 <div className="mb-4 rounded-pill bg-ink-100 p-4 ">
 <Route className="h-8 w-8 text-text-subtle " />
 </div>
 <h3 className="mb-1 text-lg font-semibold text-text-muted ">
 No learning paths available
 </h3>
 <p className="text-base text-text-muted ">
 Check back later for structured course sequences.
 </p>
 </CardContent>
 </Card>
 ) : (
 <div className="space-y-4">
 {paths.map((p) => {
 const progress = p.step_count > 0 ? Math.round((p.current_step / p.step_count) * 100) : 0;
 return (
 <Card key={p.id} className="border-l-4 border-l-green-400 transition-shadow hover:shadow-md">
 <CardContent className="p-6">
 <div className="flex items-start justify-between">
 <div className="flex items-start gap-4">
 <div className="rounded-lg bg-primary-soft p-3 ">
 <Route className="h-5 w-5 text-primary " />
 </div>
 <div>
 <h3 className="text-lg font-semibold text-text ">{p.title}</h3>
 <p className="mt-1 text-sm text-text-muted ">
 {p.description || "No description"}
 </p>
 <p className="mt-2 text-xs text-text-subtle ">
 {p.step_count} course{p.step_count !== 1 ? "s" : ""}
 </p>
 </div>
 </div>
 <div className="flex flex-col items-end gap-2">
 {p.enrolled ? (
 <>
 <Link href={`/paths/${p.id}`}>
 <Button size="sm" variant="outline">
 Continue <ArrowRight className="ml-1 h-3 w-3" />
 </Button>
 </Link>
 <div className="flex items-center gap-2">
 <div className="h-2 w-24 rounded-pill bg-ink-200 ">
 <div
 className="h-2 rounded-pill bg-primary"
 style={{ width: `${progress}%` }}
 />
 </div>
 <span className="text-xs text-text-muted ">{progress}%</span>
 </div>
 </>
 ) : (
 <Button size="sm" onClick={() => handleEnroll(p.id)}>
 Enroll
 </Button>
 )}
 </div>
 </div>
 </CardContent>
 </Card>
 );
 })}
 </div>
 )}
 </div>
 );
}

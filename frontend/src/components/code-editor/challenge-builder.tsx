"use client";

import { useEffect, useState } from "react";
import apiClient from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
 Plus,
 Trash2,
 Save,
 Eye,
 EyeOff,
 Code,
 CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm-dialog";

interface TestCase {
 id?: string;
 input: string;
 expected_output: string;
 is_hidden: boolean;
 sort_order: number;
}

interface Challenge {
 id: string;
 lesson_id: string;
 title: string;
 description: string;
 language: string;
 starter_code: string | null;
 time_limit_seconds: number;
 memory_limit_mb: number;
 test_cases: TestCase[];
}

interface ChallengeBuilderProps {
 lessonId: string;
 existingChallenge?: Challenge | null;
 onSaved?: () => void;
}

const FALLBACK_LANGUAGES = [
 { value: "python", label: "Python" },
 { value: "javascript", label: "JavaScript" },
 { value: "java", label: "Java" },
 { value: "cpp", label: "C++" },
 { value: "go", label: "Go" },
];

export default function ChallengeBuilder({
 lessonId,
 existingChallenge,
 onSaved,
}: ChallengeBuilderProps) {
 const confirm = useConfirm();
 const [challenge, setChallenge] = useState<Challenge | null>(existingChallenge || null);
 const [loading, setLoading] = useState(!existingChallenge);
 const [saving, setSaving] = useState(false);
 const [saved, setSaved] = useState(false);
 const [languages, setLanguages] = useState(FALLBACK_LANGUAGES);

 // Fetch available languages
 useEffect(() => {
 apiClient
 .get("/sandbox/languages")
 .then(({ data }) => {
 const langs = (data.languages || []).map((l: { key: string; name: string }) => ({
 value: l.key,
 label: l.name,
 }));
 if (langs.length > 0) setLanguages(langs);
 })
 .catch(() => {});
 }, []);

 // Form fields
 const [title, setTitle] = useState("");
 const [description, setDescription] = useState("");
 const [language, setLanguage] = useState("python");
 const [starterCode, setStarterCode] = useState("");
 const [solutionCode, setSolutionCode] = useState("");
 const [timeLimit, setTimeLimit] = useState(10);
 const [memoryLimit, setMemoryLimit] = useState(256);

 // Test cases
 const [testCases, setTestCases] = useState<TestCase[]>([]);
 const [addingTestCase, setAddingTestCase] = useState(false);
 const [newTestCase, setNewTestCase] = useState<TestCase>({
 input: "",
 expected_output: "",
 is_hidden: false,
 sort_order: 0,
 });

 // Load existing challenge
 useEffect(() => {
 if (existingChallenge) {
 populateForm(existingChallenge);
 setLoading(false);
 return;
 }

 apiClient
 .get(`/sandbox/lessons/${lessonId}/challenge`)
 .then(({ data }) => {
 setChallenge(data);
 populateForm(data);
 })
 .catch(() => {
 // No challenge yet — that's fine
 })
 .finally(() => setLoading(false));
 }, [lessonId, existingChallenge]);

 function populateForm(ch: Challenge) {
 setTitle(ch.title);
 setDescription(ch.description || "");
 setLanguage(ch.language);
 setStarterCode(ch.starter_code || "");
 setTimeLimit(ch.time_limit_seconds);
 setMemoryLimit(ch.memory_limit_mb);
 setTestCases(ch.test_cases || []);
 }

 const handleSave = async () => {
 setSaving(true);
 setSaved(false);
 try {
 const payload = {
 lesson_id: lessonId,
 title: title.trim() || "Code Challenge",
 description,
 language,
 starter_code: starterCode || null,
 solution_code: solutionCode || null,
 time_limit_seconds: timeLimit,
 memory_limit_mb: memoryLimit,
 };

 let savedChallenge: Challenge;
 if (challenge) {
 const { data } = await apiClient.put(`/sandbox/challenges/${challenge.id}/`, payload);
 savedChallenge = data;
 } else {
 const { data } = await apiClient.post("/sandbox/challenges", payload);
 savedChallenge = data;
 }
 setChallenge(savedChallenge);
 setSaved(true);
 setTimeout(() => setSaved(false), 3000);
 onSaved?.();
 toast.success("Challenge saved");
 } catch {
 toast.error("Failed to save challenge");
 } finally {
 setSaving(false);
 }
 };

 const handleAddTestCase = async () => {
 if (!challenge) {
 toast.error("Save the challenge first before adding test cases.");
 return;
 }
 try {
 const { data } = await apiClient.post(
 `/sandbox/challenges/${challenge.id}/test-cases/`,
 {
 input: newTestCase.input,
 expected_output: newTestCase.expected_output,
 is_hidden: newTestCase.is_hidden,
 }
 );
 setTestCases([...testCases, data]);
 setNewTestCase({ input: "", expected_output: "", is_hidden: false, sort_order: 0 });
 setAddingTestCase(false);
 onSaved?.();
 toast.success("Test case added");
 } catch {
 toast.error("Failed to add test case");
 }
 };

 const handleDeleteTestCase = async (tcId: string) => {
 if (!challenge || !(await confirm({ message: "Delete this test case?", variant: "danger", confirmLabel: "Delete" }))) return;
 try {
 await apiClient.delete(`/sandbox/challenges/${challenge.id}/test-cases/${tcId}/`);
 setTestCases(testCases.filter((tc) => tc.id !== tcId));
 onSaved?.();
 toast.success("Test case deleted");
 } catch {
 toast.error("Failed to delete test case");
 }
 };

 if (loading) {
 return (
 <div className="flex items-center justify-center py-6">
 <div className="h-5 w-5 animate-spin rounded-pill border-2 border-primary border-t-transparent" />
 </div>
 );
 }

 return (
 <div className="space-y-4">
 <div className="flex items-center gap-2 text-sm font-semibold text-ink-700">
 <Code className="h-4 w-4 text-primary" />
 {challenge ? "Edit Challenge" : "Create Challenge"}
 </div>

 {/* Title & Language */}
 <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
 <div>
 <label className="mb-1 block text-xs font-medium text-text-muted">Title</label>
 <input
 type="text"
 value={title}
 onChange={(e) => setTitle(e.target.value)}
 placeholder="Challenge title"
 className="w-full rounded-lg border border-ink-300 px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
 />
 </div>
 <div>
 <label className="mb-1 block text-xs font-medium text-text-muted">Language</label>
 <select
 value={language}
 onChange={(e) => setLanguage(e.target.value)}
 className="w-full rounded-lg border border-ink-300 px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
 >
 {languages.map((l) => (
 <option key={l.value} value={l.value}>
 {l.label}
 </option>
 ))}
 </select>
 </div>
 </div>

 {/* Description */}
 <div>
 <label className="mb-1 block text-xs font-medium text-text-muted">Description</label>
 <textarea
 value={description}
 onChange={(e) => setDescription(e.target.value)}
 placeholder="Describe the challenge requirements..."
 rows={3}
 className="w-full rounded-lg border border-ink-300 px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
 />
 </div>

 {/* Starter Code */}
 <div>
 <label className="mb-1 block text-xs font-medium text-text-muted">Starter Code</label>
 <textarea
 value={starterCode}
 onChange={(e) => setStarterCode(e.target.value)}
 placeholder="def solution():\n pass"
 rows={5}
 className="w-full rounded-lg border border-ink-300 px-3 py-1.5 font-mono text-sm focus:border-primary focus:outline-none"
 />
 </div>

 {/* Solution Code */}
 <div>
 <label className="mb-1 block text-xs font-medium text-text-muted">Solution Code (hidden from students)</label>
 <textarea
 value={solutionCode}
 onChange={(e) => setSolutionCode(e.target.value)}
 placeholder="def solution():\n return 42"
 rows={5}
 className="w-full rounded-lg border border-ink-300 px-3 py-1.5 font-mono text-sm focus:border-primary focus:outline-none"
 />
 </div>

 {/* Limits */}
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="mb-1 block text-xs font-medium text-text-muted">Time Limit (seconds)</label>
 <input
 type="number"
 value={timeLimit}
 onChange={(e) => setTimeLimit(parseInt(e.target.value) || 10)}
 min={1}
 max={60}
 className="w-full rounded-lg border border-ink-300 px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
 />
 </div>
 <div>
 <label className="mb-1 block text-xs font-medium text-text-muted">Memory Limit (MB)</label>
 <input
 type="number"
 value={memoryLimit}
 onChange={(e) => setMemoryLimit(parseInt(e.target.value) || 256)}
 min={32}
 max={1024}
 className="w-full rounded-lg border border-ink-300 px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
 />
 </div>
 </div>

 {/* Save button */}
 <div className="flex items-center gap-3">
 <Button size="sm" onClick={handleSave} disabled={saving}>
 <Save className="mr-1 h-3 w-3" />
 {saving ? "Saving..." : challenge ? "Update Challenge" : "Create Challenge"}
 </Button>
 {saved && (
 <span className="flex items-center gap-1 text-xs font-medium text-primary">
 <CheckCircle className="h-3 w-3" />
 Saved!
 </span>
 )}
 </div>

 {/* Test Cases */}
 {challenge && (
 <div className="mt-4 border-t border-border-strong pt-4">
 <div className="mb-3 flex items-center justify-between">
 <h4 className="text-sm font-semibold text-ink-700">
 Test Cases ({testCases.length})
 </h4>
 <Button
 size="sm"
 variant="outline"
 onClick={() => setAddingTestCase(!addingTestCase)}
 >
 <Plus className="mr-1 h-3 w-3" />
 Add Test Case
 </Button>
 </div>

 {/* Existing test cases */}
 <div className="space-y-2">
 {testCases.map((tc, i) => (
 <div
 key={tc.id || i}
 className="rounded-lg border border-border-strong bg-paper-2 p-3"
 >
 <div className="mb-2 flex items-center justify-between">
 <span className="text-xs font-semibold text-text-muted">
 Test #{i + 1}
 </span>
 <div className="flex items-center gap-2">
 {tc.is_hidden ? (
 <span className="flex items-center gap-1 rounded bg-sun-50 px-1.5 py-0.5 text-[10px] font-medium text-warning-fg">
 <EyeOff className="h-3 w-3" />
 Hidden
 </span>
 ) : (
 <span className="flex items-center gap-1 rounded bg-success-soft px-1.5 py-0.5 text-[10px] font-medium text-primary">
 <Eye className="h-3 w-3" />
 Visible
 </span>
 )}
 {tc.id && (
 <button
 onClick={() => handleDeleteTestCase(tc.id!)}
 className="rounded p-1 text-text-subtle hover:bg-danger-soft hover:text-danger-fg"
 >
 <Trash2 className="h-3.5 w-3.5" />
 </button>
 )}
 </div>
 </div>
 <div className="grid grid-cols-2 gap-2 text-xs">
 <div>
 <span className="font-medium text-text-muted">Input:</span>
 <pre className="mt-0.5 rounded bg-surface-2 p-1.5 font-mono text-ink-700">
 {tc.input || "(empty)"}
 </pre>
 </div>
 <div>
 <span className="font-medium text-text-muted">Expected Output:</span>
 <pre className="mt-0.5 rounded bg-surface-2 p-1.5 font-mono text-ink-700">
 {tc.expected_output}
 </pre>
 </div>
 </div>
 </div>
 ))}
 </div>

 {/* Add test case form */}
 {addingTestCase && (
 <div className="mt-3 rounded-lg border border-dashed border-green-300 bg-success-soft/30 p-3">
 <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
 <div>
 <label className="mb-1 block text-xs font-medium text-text-muted">
 Input (stdin)
 </label>
 <textarea
 value={newTestCase.input}
 onChange={(e) =>
 setNewTestCase({ ...newTestCase, input: e.target.value })
 }
 placeholder="5&#10;3 1 4 1 5"
 rows={3}
 className="w-full rounded border border-ink-300 px-2 py-1.5 font-mono text-sm focus:border-primary focus:outline-none"
 />
 </div>
 <div>
 <label className="mb-1 block text-xs font-medium text-text-muted">
 Expected Output
 </label>
 <textarea
 value={newTestCase.expected_output}
 onChange={(e) =>
 setNewTestCase({ ...newTestCase, expected_output: e.target.value })
 }
 placeholder="1 1 3 4 5"
 rows={3}
 className="w-full rounded border border-ink-300 px-2 py-1.5 font-mono text-sm focus:border-primary focus:outline-none"
 />
 </div>
 </div>
 <div className="mt-2 flex items-center gap-3">
 <label className="flex items-center gap-1.5 text-xs text-text-muted">
 <input
 type="checkbox"
 checked={newTestCase.is_hidden}
 onChange={(e) =>
 setNewTestCase({ ...newTestCase, is_hidden: e.target.checked })
 }
 className="rounded border-ink-300"
 />
 Hidden (not visible to students)
 </label>
 </div>
 <div className="mt-3 flex gap-2">
 <Button size="sm" onClick={handleAddTestCase}>
 <Plus className="mr-1 h-3 w-3" />
 Add
 </Button>
 <Button
 size="sm"
 variant="ghost"
 onClick={() => setAddingTestCase(false)}
 >
 Cancel
 </Button>
 </div>
 </div>
 )}
 </div>
 )}
 </div>
 );
}

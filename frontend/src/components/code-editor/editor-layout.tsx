"use client";

import { useEffect, useState } from "react";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Play, Send, ChevronDown, CheckCircle, XCircle } from "lucide-react";
import apiClient from "@/lib/api-client";

interface TestResult {
 test_case_id: string;
 passed: boolean;
 actual_output: string;
 time_ms: number;
}

interface EditorLayoutProps {
 challengeId?: string;
 language?: string;
 starterCode?: string;
 testCases?: { id: string; input: string; expected_output: string }[];
}

interface LangInfo {
 key: string;
 name: string;
 monaco: string;
}

const FALLBACK_LANGS: LangInfo[] = [
 { key: "python", name: "Python 3", monaco: "python" },
 { key: "javascript", name: "JavaScript (Node.js)", monaco: "javascript" },
];

export function EditorLayout({
 challengeId,
 language = "python",
 starterCode = "",
}: EditorLayoutProps) {
 const [code, setCode] = useState(starterCode);
 const [selectedLang, setSelectedLang] = useState(language);
 const [output, setOutput] = useState("");
 const [results, setResults] = useState<TestResult[]>([]);
 const [isRunning, setIsRunning] = useState(false);
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [activeTab, setActiveTab] = useState<"output" | "tests">("output");
 const [totalPassed, setTotalPassed] = useState(0);
 const [totalTests, setTotalTests] = useState(0);
 const [langs, setLangs] = useState<LangInfo[]>(FALLBACK_LANGS);

 useEffect(() => {
 apiClient
 .get("/sandbox/languages")
 .then(({ data }) => {
 if (data.languages?.length > 0) setLangs(data.languages);
 })
 .catch(() => {});
 }, []);

 const monacoLang = langs.find((l) => l.key === selectedLang)?.monaco || "plaintext";

 const handleRun = async () => {
 setIsRunning(true);
 setActiveTab("output");
 try {
 const { data } = await apiClient.post("/sandbox/execute", {
 language: selectedLang,
 source_code: code,
 stdin: "",
 });
 setOutput(data.stdout || data.stderr || "No output");
 } catch {
 setOutput("Error executing code");
 } finally {
 setIsRunning(false);
 }
 };

 const handleSubmit = async () => {
 if (!challengeId) return;
 setIsSubmitting(true);
 setActiveTab("tests");
 try {
 const { data } = await apiClient.post(
 `/sandbox/challenges/${challengeId}/submit/`,
 { source_code: code, language: selectedLang }
 );
 setResults(data.results || []);
 setTotalPassed(data.total_passed);
 setTotalTests(data.total_tests);
 setOutput(
 `${data.total_passed}/${data.total_tests} tests passed (${data.execution_time_ms}ms)`
 );
 } catch {
 setOutput("Error submitting code");
 } finally {
 setIsSubmitting(false);
 }
 };

 return (
 <div className="flex h-full flex-col">
 {/* Toolbar */}
 <div className="flex items-center justify-between border-b border-border-strong bg-paper-2 px-4 py-2.5">
 <div className="relative">
 <select
 value={selectedLang}
 onChange={(e) => setSelectedLang(e.target.value)}
 className="appearance-none rounded-lg border border-border-strong bg-surface-2 py-1.5 pl-3 pr-8 text-sm font-medium text-ink-700 hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary-soft"
 >
 {langs.map((l) => (
 <option key={l.key} value={l.key}>
 {l.name}
 </option>
 ))}
 </select>
 <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle" />
 </div>

 <div className="flex gap-2">
 <Button
 variant="outline"
 size="sm"
 onClick={handleRun}
 disabled={isRunning}
 >
 <Play className="h-3.5 w-3.5" />
 {isRunning ? "Running..." : "Run"}
 </Button>
 {challengeId && (
 <Button size="sm" onClick={handleSubmit} disabled={isSubmitting}>
 <Send className="h-3.5 w-3.5" />
 {isSubmitting ? "Submitting..." : "Submit"}
 </Button>
 )}
 </div>
 </div>

 {/* Editor + Output split */}
 <div className="flex flex-1 overflow-hidden">
 {/* Code Editor */}
 <div className="flex-1 border-r border-border-strong">
 <Editor
 height="100%"
 language={monacoLang}
 value={code}
 onChange={(value) => setCode(value || "")}
 theme="vs-light"
 options={{
 minimap: { enabled: false },
 fontSize: 14,
 lineNumbers: "on",
 scrollBeyondLastLine: false,
 automaticLayout: true,
 tabSize: 4,
 padding: { top: 12 },
 fontFamily: "'Geist Mono', 'Fira Code', 'Consolas', monospace",
 }}
 />
 </div>

 {/* Output Panel */}
 <div className="flex w-[400px] flex-col bg-paper-2">
 <div className="flex border-b border-border-strong">
 <button
 onClick={() => setActiveTab("output")}
 className={`cursor-pointer px-4 py-2.5 text-sm font-medium transition-colors ${
 activeTab === "output"
 ? "border-b-2 border-primary text-primary"
 : "text-text-subtle hover:text-text-muted"
 }`}
 >
 Output
 </button>
 {challengeId && (
 <button
 onClick={() => setActiveTab("tests")}
 className={`cursor-pointer px-4 py-2.5 text-sm font-medium transition-colors ${
 activeTab === "tests"
 ? "border-b-2 border-primary text-primary"
 : "text-text-subtle hover:text-text-muted"
 }`}
 >
 Tests
 {results.length > 0 && (
 <span
 className={`ml-1.5 rounded-pill px-1.5 py-0.5 text-[10px] font-bold ${
 totalPassed === totalTests
 ? "bg-primary-soft text-success-fg"
 : "bg-danger-soft text-danger-fg"
 }`}
 >
 {totalPassed}/{totalTests}
 </span>
 )}
 </button>
 )}
 </div>

 <div className="flex-1 overflow-auto bg-surface-2 p-4">
 {activeTab === "output" ? (
 <pre className="whitespace-pre-wrap font-mono text-sm text-ink-700">
 {output || (
 <span className="text-text-subtle">
 Click Run to execute your code
 </span>
 )}
 </pre>
 ) : (
 <div className="space-y-2.5">
 {results.length === 0 ? (
 <p className="text-sm text-text-subtle">
 Click Submit to run tests
 </p>
 ) : (
 results.map((result, i) => (
 <div
 key={result.test_case_id}
 className={`rounded-lg border p-3 ${
 result.passed
 ? "border-primary-soft bg-success-soft"
 : "border-danger bg-danger-soft"
 }`}
 >
 <div className="flex items-center justify-between">
 <span className="flex items-center gap-1.5 text-sm font-semibold">
 {result.passed ? (
 <CheckCircle className="h-4 w-4 text-primary" />
 ) : (
 <XCircle className="h-4 w-4 text-danger-fg" />
 )}
 Test {i + 1}
 </span>
 <span className="text-xs text-text-subtle">
 {result.time_ms}ms
 </span>
 </div>
 {!result.passed && result.actual_output && (
 <div className="mt-2">
 <p className="text-[11px] font-medium uppercase text-text-subtle">
 Output:
 </p>
 <pre className="mt-1 rounded-lg bg-paper-2 p-2 font-mono text-xs text-ink-700">
 {result.actual_output}
 </pre>
 </div>
 )}
 </div>
 ))
 )}
 </div>
 )}
 </div>
 </div>
 </div>
 </div>
 );
}

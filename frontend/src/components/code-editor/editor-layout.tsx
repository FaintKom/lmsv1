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
      <div className="flex items-center justify-between border-b border-ink-200 bg-white px-4 py-2.5">
        <div className="relative">
          <select
            value={selectedLang}
            onChange={(e) => setSelectedLang(e.target.value)}
            className="appearance-none rounded-xl border border-ink-200 bg-ink-50 py-1.5 pl-3 pr-8 text-sm font-medium text-ink-700 focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-400/20"
          >
            {langs.map((l) => (
              <option key={l.key} value={l.key}>
                {l.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
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
        <div className="flex-1 border-r border-ink-200">
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
        <div className="flex w-[400px] flex-col bg-white">
          <div className="flex border-b border-ink-200">
            <button
              onClick={() => setActiveTab("output")}
              className={`cursor-pointer px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === "output"
                  ? "border-b-2 border-green-600 text-green-600"
                  : "text-ink-400 hover:text-ink-700"
              }`}
            >
              Output
            </button>
            {challengeId && (
              <button
                onClick={() => setActiveTab("tests")}
                className={`cursor-pointer px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === "tests"
                    ? "border-b-2 border-green-600 text-green-600"
                    : "text-ink-400 hover:text-ink-700"
                }`}
              >
                Tests
                {results.length > 0 && (
                  <span
                    className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      totalPassed === totalTests
                        ? "bg-green-100 text-green-700"
                        : "bg-coral-50 text-coral-700"
                    }`}
                  >
                    {totalPassed}/{totalTests}
                  </span>
                )}
              </button>
            )}
          </div>

          <div className="flex-1 overflow-auto bg-ink-50 p-4">
            {activeTab === "output" ? (
              <pre className="whitespace-pre-wrap font-mono text-sm text-ink-700">
                {output || (
                  <span className="text-ink-400">
                    Click Run to execute your code
                  </span>
                )}
              </pre>
            ) : (
              <div className="space-y-2.5">
                {results.length === 0 ? (
                  <p className="text-sm text-ink-400">
                    Click Submit to run tests
                  </p>
                ) : (
                  results.map((result, i) => (
                    <div
                      key={result.test_case_id}
                      className={`rounded-xl border p-3 ${
                        result.passed
                          ? "border-green-200 bg-green-50"
                          : "border-coral-300 bg-coral-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-sm font-semibold">
                          {result.passed ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-coral-500" />
                          )}
                          Test {i + 1}
                        </span>
                        <span className="text-xs text-ink-400">
                          {result.time_ms}ms
                        </span>
                      </div>
                      {!result.passed && result.actual_output && (
                        <div className="mt-2">
                          <p className="text-[11px] font-medium uppercase text-ink-400">
                            Output:
                          </p>
                          <pre className="mt-1 rounded-lg bg-white p-2 font-mono text-xs text-ink-700">
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

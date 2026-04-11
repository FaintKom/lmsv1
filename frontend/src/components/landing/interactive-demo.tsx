"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Play, CheckCircle, XCircle, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[200px] items-center justify-center bg-[#1e1e1e] rounded-xl text-sm text-slate-400">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading editor...
    </div>
  ),
});

type DemoTab = "python" | "sat" | "web";

const TABS: { key: DemoTab; emoji: string; label: string }[] = [
  { key: "python", emoji: "\ud83d\udc0d", label: "Python" },
  { key: "sat", emoji: "\ud83d\udcdd", label: "SAT Math" },
  { key: "web", emoji: "\ud83c\udf10", label: "Web Dev" },
];

// ─── Python Demo ────────────────────────────────────────────────────

const PYTHON_STARTER = `def add(a, b):
    # Write your code here
    return a + b

print(add(3, 5))
print(add(-1, 10))`;

function PythonDemo() {
  const [code, setCode] = useState(PYTHON_STARTER);
  const [output, setOutput] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [success, setSuccess] = useState<boolean | null>(null);

  const run = useCallback(async () => {
    setRunning(true);
    setOutput(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/sandbox/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: "python", source_code: code, stdin: "" }),
      });
      if (res.ok) {
        const data = await res.json();
        const out = data.stdout || data.stderr || "No output";
        setOutput(out);
        setSuccess(out.includes("8") && out.includes("9"));
      } else {
        // Fallback: simulate for simple print statements
        simulateOutput();
      }
    } catch {
      simulateOutput();
    } finally {
      setRunning(false);
    }
  }, [code]);

  const simulateOutput = useCallback(() => {
    try {
      // Very simple print() simulation for demo
      const prints: string[] = [];
      const lines = code.split("\n");
      // Find function definition and extract return
      const funcMatch = code.match(/def\s+add\s*\(\s*a\s*,\s*b\s*\)[\s\S]*?return\s+(.+)/);
      if (funcMatch) {
        const printCalls = lines.filter(l => l.trim().startsWith("print(add("));
        for (const p of printCalls) {
          const args = p.match(/add\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)/);
          if (args) {
            const body = funcMatch[1].trim();
            const a = parseInt(args[1]), b = parseInt(args[2]);
            if (body === "a + b") prints.push(String(a + b));
            else if (body === "a - b") prints.push(String(a - b));
            else if (body === "a * b") prints.push(String(a * b));
            else prints.push("?");
          }
        }
      }
      const out = prints.join("\n") || "No output";
      setOutput(out);
      setSuccess(out.includes("8") && out.includes("9"));
    } catch {
      setOutput("Error running code");
      setSuccess(false);
    }
  }, [code]);

  return (
    <div>
      <p className="mb-3 text-sm text-slate-500">
        Complete the function that adds two numbers:
      </p>
      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-white/10">
        <MonacoEditor
          height="180px"
          language="python"
          value={code}
          onChange={(v) => setCode(v || "")}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: "on" as const,
            scrollBeyondLastLine: false,
            padding: { top: 8 },
            renderWhitespace: "none" as const,
          }}
        />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Button size="sm" onClick={run} disabled={running} className="bg-green-600 hover:bg-green-700">
          {running ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Play className="mr-1 h-3.5 w-3.5" />}
          Run
        </Button>
        {output !== null && (
          <div className="flex items-center gap-2">
            {success ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
            <code className="rounded bg-slate-100 px-2 py-1 text-xs font-mono text-slate-700 dark:bg-white/10 dark:text-slate-300">
              {output.split("\n").join(", ")}
            </code>
          </div>
        )}
      </div>
      <p className="mt-3 text-[10px] text-slate-400">
        Supports Python, JavaScript, Java, C++, Go, Rust, and 31 more languages
      </p>
    </div>
  );
}

// ─── SAT Math Demo ──────────────────────────────────────────────────

const SAT_QUESTION = {
  text: "If 3x + 7 = 22, what is the value of x?",
  choices: [
    { label: "A", text: "3", correct: false },
    { label: "B", text: "5", correct: true },
    { label: "C", text: "7", correct: false },
    { label: "D", text: "15", correct: false },
  ],
  explanation: "3x + 7 = 22 \u2192 3x = 15 \u2192 x = 5",
};

function SATDemo() {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div>
      <div className="mb-4 rounded-xl bg-slate-50 px-5 py-4 dark:bg-white/5">
        <p className="text-base font-medium text-slate-800 dark:text-slate-200">
          {SAT_QUESTION.text}
        </p>
      </div>
      <div className="space-y-2.5">
        {SAT_QUESTION.choices.map((c, i) => {
          const isSelected = selected === i;
          const isCorrect = c.correct;
          const showResult = selected !== null;
          return (
            <button
              key={i}
              onClick={() => setSelected(i)}
              disabled={selected !== null}
              className={`flex w-full items-center gap-4 rounded-xl border-2 px-5 py-3.5 text-left transition-all ${
                showResult && isSelected && isCorrect
                  ? "border-green-500 bg-green-50 dark:border-green-400 dark:bg-green-500/10"
                  : showResult && isSelected && !isCorrect
                    ? "border-red-400 bg-red-50 dark:border-red-400 dark:bg-red-500/10"
                    : showResult && isCorrect
                      ? "border-green-300 bg-green-50/50 dark:border-green-500/50 dark:bg-green-500/5"
                      : "border-slate-200 bg-white hover:border-green-300 hover:shadow-sm dark:border-white/10 dark:bg-white/5 dark:hover:border-green-500/50"
              }`}
            >
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                showResult && isCorrect
                  ? "bg-green-500 text-white"
                  : showResult && isSelected
                    ? "bg-red-500 text-white"
                    : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-400"
              }`}>
                {showResult && isCorrect ? "\u2713" : showResult && isSelected ? "\u2717" : c.label}
              </span>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{c.text}</span>
              {showResult && isSelected && !isCorrect && (
                <XCircle className="ml-auto h-4 w-4 text-red-400 shrink-0" />
              )}
              {showResult && isCorrect && (
                <CheckCircle className="ml-auto h-4 w-4 text-green-500 shrink-0" />
              )}
            </button>
          );
        })}
      </div>
      {selected !== null && (
        <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300">
          <span className="font-semibold">Explanation:</span> {SAT_QUESTION.explanation}
        </div>
      )}
      <p className="mt-3 text-[10px] text-slate-400">
        Full adaptive SAT simulator with 2 modules, Desmos calculator, and realistic scoring
      </p>
    </div>
  );
}

// ─── Web Dev Demo ───────────────────────────────────────────────────

const WEB_STARTER = `<div class="card">
  <h2>Jane Doe</h2>
  <p class="role">Web Developer</p>
  <p>Building beautiful things on the web</p>
</div>

<style>
.card {
  max-width: 280px;
  padding: 24px;
  border-radius: 16px;
  background: linear-gradient(135deg, #f0fdf4, #ecfdf5);
  box-shadow: 0 4px 24px rgba(0,0,0,0.08);
  text-align: center;
  font-family: system-ui, sans-serif;
}
h2 { margin: 0 0 4px; color: #166534; }
.role { color: #16a34a; font-size: 14px; margin: 0 0 12px; }
p { color: #64748b; font-size: 14px; margin: 0; }
</style>`;

function buildWebPreview(code: string): string {
  // Split HTML and <style> blocks
  const styleMatch = code.match(/<style>([\s\S]*?)<\/style>/);
  const css = styleMatch ? styleMatch[1] : "";
  const html = code.replace(/<style>[\s\S]*?<\/style>/, "").trim();
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>*{margin:0;padding:0;box-sizing:border-box}body{padding:20px;font-family:system-ui,sans-serif}${css}</style></head><body>${html}</body></html>`;
}

function WebDemo() {
  const [code, setCode] = useState(WEB_STARTER);
  const [preview, setPreview] = useState(buildWebPreview(WEB_STARTER));
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setPreview(buildWebPreview(code)), 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [code]);

  return (
    <div>
      <p className="mb-3 text-sm text-slate-500">
        Edit the HTML & CSS to customize the card:
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0 overflow-hidden rounded-xl border border-slate-200 dark:border-white/10">
        <div className="border-b md:border-b-0 md:border-r border-slate-200 dark:border-white/10">
          <MonacoEditor
            height="220px"
            language="html"
            value={code}
            onChange={(v) => setCode(v || "")}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 12,
              lineNumbers: "on" as const,
              scrollBeyondLastLine: false,
              wordWrap: "on" as const,
              padding: { top: 8 },
              tabSize: 2,
            }}
          />
        </div>
        <div className="bg-white dark:bg-[#fefefe]" style={{ minHeight: 220 }}>
          <iframe
            srcDoc={preview}
            sandbox="allow-scripts allow-same-origin"
            className="h-full w-full border-0"
            style={{ minHeight: 220 }}
            title="Live preview"
          />
        </div>
      </div>
      <p className="mt-3 text-[10px] text-slate-400">
        Build real projects from day one with our HTML/CSS/JS live editor
      </p>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export function InteractiveDemo() {
  const [tab, setTab] = useState<DemoTab>("python");

  return (
    <section className="border-t border-slate-100 bg-white py-20">
      <div className="mx-auto max-w-3xl px-6">
        <div className="mb-8 text-center">
          <h2 className="mb-3 text-3xl font-bold text-slate-900">
            Try it right now
          </h2>
          <p className="text-slate-500">
            No signup required. Experience the platform instantly.
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex justify-center">
          <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-white/10">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`rounded-lg px-5 py-2.5 text-sm font-semibold transition-all ${
                  tab === t.key
                    ? "bg-white text-slate-900 shadow-sm dark:bg-[#2C2C2C] dark:text-white"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                }`}
              >
                <span className="mr-1.5">{t.emoji}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Demo content */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#1E1E1E]">
          {tab === "python" && <PythonDemo />}
          {tab === "sat" && <SATDemo />}
          {tab === "web" && <WebDemo />}
        </div>

        {/* CTA */}
        <div className="mt-8 text-center">
          <Link href="/register">
            <Button size="lg" className="bg-green-600 hover:bg-green-700">
              Want more? Create a free account
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

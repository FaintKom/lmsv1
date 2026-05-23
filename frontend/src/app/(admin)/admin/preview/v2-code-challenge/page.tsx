"use client";

/** Demo route — /admin/preview/v2-code-challenge */

import {
  CodeChallengeV2,
  type CodeChallengeTestResult,
} from "@/components/exercises/v2/code-challenge-v2";

const PROBLEM = {
  title: "Two Sum",
  desc: "Given an array of integers and a target, return the indices of the two numbers that add up to the target.",
  starter: `def two_sum(nums, target):\n    # write your solution\n    pass`,
  language: "Python 3",
  filename: "solution.py",
  examples: [
    { input: "[2, 7, 11, 15], target = 9", output: "[0, 1]" },
    { input: "[3, 2, 4], target = 6", output: "[1, 2]" },
  ],
};

// Demo only — pretend tests pass iff the solution contains a `return`.
const mockSubmit = async (code: string): Promise<CodeChallengeTestResult[]> => {
  await new Promise((r) => setTimeout(r, 500));
  const ok = /\breturn\b/.test(code);
  return [
    { id: 1, name: "small", passed: ok, time: 12 },
    { id: 2, name: "duplicates", passed: ok, time: 9 },
    { id: 3, name: "negatives", passed: ok, time: 14 },
    { id: 4, name: "large input", passed: ok, time: 240, hidden: true },
  ];
};

const mockRun = async (): Promise<string> => {
  await new Promise((r) => setTimeout(r, 400));
  return "> [0, 1]\n> [1, 2]\n";
};

export default function V2CodeChallengePreview() {
  return (
    <div style={{ height: "100vh", display: "flex", alignItems: "stretch" }}>
      <div
        style={{
          flex: 1,
          maxWidth: 1100,
          margin: "0 auto",
          width: "100%",
          background: "var(--paper)",
          border: "1px solid var(--ink-100)",
        }}
      >
        <CodeChallengeV2
          problem={PROBLEM}
          languages={["Python 3", "JavaScript", "Go"]}
          onRun={mockRun}
          onSubmit={mockSubmit}
          eyebrow="PREVIEW · V2 · CODE CHALLENGE"
          hint="Check the negative-numbers case."
          onQuit={() => {
            // eslint-disable-next-line no-alert
            alert("Quit pressed (demo only)");
          }}
          onFinish={(r) => {
            // eslint-disable-next-line no-alert
            alert(
              `correct=${r.correct} · passed=${r.passed}/${r.total} · attempts=${r.attemptsUsed} · streak=${r.streak}`
            );
          }}
        />
      </div>
    </div>
  );
}

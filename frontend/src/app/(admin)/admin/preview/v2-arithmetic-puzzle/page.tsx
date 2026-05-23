"use client";

/** Demo route — /admin/preview/v2-arithmetic-puzzle */

import { ArithmeticPuzzleV2 } from "@/components/exercises/v2/arithmetic-puzzle-v2";

export default function V2ArithmeticPuzzlePreview() {
  return (
    <div style={{ height: "100vh", display: "flex", alignItems: "stretch" }}>
      <div
        style={{
          flex: 1,
          maxWidth: 720,
          margin: "0 auto",
          width: "100%",
          background: "var(--paper)",
          border: "1px solid var(--ink-100)",
        }}
      >
        <ArithmeticPuzzleV2
          equations={[
            { cells: ["7", "+", "_", "=", "12"], answer: 5 },
            { cells: ["3", "×", "_", "=", "18"], answer: 6 },
            { cells: ["_", "−", "4", "=", "9"], answer: 13 },
          ]}
          bank={[4, 5, 6, 8, 9, 13]}
          eyebrow="PREVIEW · V2 · ARITHMETIC PUZZLE"
          onQuit={() => {
            // eslint-disable-next-line no-alert
            alert("Quit pressed (demo only)");
          }}
          onFinish={(r) => {
            // eslint-disable-next-line no-alert
            alert(
              `correct=${r.correct} · attempts=${r.attemptsUsed} · streak=${r.streak}`
            );
          }}
        />
      </div>
    </div>
  );
}

"use client";

/** Demo route — /admin/preview/v2-crossword */

import { CrosswordV2 } from "@/components/exercises/v2/crossword-v2";

// 5×5 grid:
//   CODE across row 1 cols 1..4 — C(1,1) O(1,2) D(1,3) E(1,4)
//   DATA down col 3 rows 1..4    — D(1,3) A(2,3) T(3,3) A(4,3)
const CELLS = {
  "1,1": { ch: "C", num: 1 },
  "1,2": { ch: "O" },
  "1,3": { ch: "D", num: 2 },
  "1,4": { ch: "E" },
  "2,3": { ch: "A" },
  "3,3": { ch: "T" },
  "4,3": { ch: "A" },
};

export default function V2CrosswordPreview() {
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
        <CrosswordV2
          width={5}
          height={5}
          cells={CELLS}
          clues={{
            across: [{ n: 1, text: "Instructions a computer runs" }],
            down: [{ n: 2, text: "Information processed by programs" }],
          }}
          answerSummary="1A: CODE · 2D: DATA"
          eyebrow="PREVIEW · V2 · CROSSWORD"
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

"use client";

/** Demo route — /admin/preview/v2-bubble-sheet */

import { BubbleSheetV2 } from "@/components/exercises/v2/bubble-sheet-v2";

const QUESTIONS = [
  { n: 1, q: "If 3x + 7 = 22, then x = ?", opts: ["3", "5", "7", "15"], correct: 1 },
  { n: 2, q: "The mean of 4, 8, 12, 16 is:", opts: ["8", "9", "10", "12"], correct: 2 },
  { n: 3, q: "If f(x) = x² + 1, then f(3) =", opts: ["7", "9", "10", "16"], correct: 2 },
];

export default function V2BubbleSheetPreview() {
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
        <BubbleSheetV2
          questions={QUESTIONS}
          eyebrow="PREVIEW · V2 · BUBBLE SHEET"
          onQuit={() => {
            // eslint-disable-next-line no-alert
            alert("Quit pressed (demo only)");
          }}
          onFinish={(r) => {
            // eslint-disable-next-line no-alert
            alert(
              `correct=${r.correct} · score=${r.score}/${r.total} · attempts=${r.attemptsUsed} · streak=${r.streak}`
            );
          }}
        />
      </div>
    </div>
  );
}

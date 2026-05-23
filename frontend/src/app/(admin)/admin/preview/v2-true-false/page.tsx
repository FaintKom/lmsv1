"use client";

/** Demo route — /admin/preview/v2-true-false */

import { TrueFalseV2 } from "@/components/exercises/v2/true-false-v2";

export default function V2TrueFalsePreview() {
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
        <TrueFalseV2
          statement="In Python, lists are immutable."
          correctAnswer={false}
          explain="Lists are mutable. Tuples are the immutable variant."
          eyebrow="PREVIEW · V2 · TRUE / FALSE"
          maxAttemptsPerTask={2}
          onQuit={() => {
            // eslint-disable-next-line no-alert
            alert("Quit pressed (demo only)");
          }}
          onFinish={(r) => {
            // eslint-disable-next-line no-alert
            alert(
              `Finished — correct: ${r.correct} · attempts: ${r.attemptsUsed} · streak: ${r.streak}`
            );
          }}
        />
      </div>
    </div>
  );
}

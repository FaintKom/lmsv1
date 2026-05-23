"use client";

/** Demo route — /admin/preview/v2-numeric-input */

import { NumericInputV2 } from "@/components/exercises/v2/numeric-input-v2";

export default function V2NumericInputPreview() {
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
        <NumericInputV2
          problem="What is 15% of 80?"
          correct={12}
          example={{
            q: "What is 10% of 50?",
            work: "10% × 50 = 0.10 × 50",
            a: 5,
          }}
          explain="15% × 80 = 0.15 × 80 = 12"
          eyebrow="PREVIEW · V2 · NUMERIC INPUT"
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

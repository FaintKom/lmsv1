"use client";

/** Demo route — /admin/preview/v2-mc-math */

import { McMathV2 } from "@/components/exercises/v2/mc-math-v2";

export default function V2McMathPreview() {
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
        <McMathV2
          prompt="Which expression is equivalent to"
          expr="(x + 3)²"
          options={["x² + 6", "x² + 9", "x² + 6x + 9", "x² + 3x + 9"]}
          correct={2}
          explain="(x + 3)² = x² + 2·3·x + 3² = x² + 6x + 9"
          eyebrow="PREVIEW · V2 · MC MATH"
          title="Which is equivalent?"
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

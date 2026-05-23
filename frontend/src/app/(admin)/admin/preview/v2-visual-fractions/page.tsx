"use client";

/** Demo route — /admin/preview/v2-visual-fractions */

import { VisualFractionsV2 } from "@/components/exercises/v2/visual-fractions-v2";

export default function V2VisualFractionsPreview() {
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
        <VisualFractionsV2
          numerator={3}
          denominator={8}
          eyebrow="PREVIEW · V2 · VISUAL FRACTIONS"
          onQuit={() => {
            // eslint-disable-next-line no-alert
            alert("Quit pressed (demo only)");
          }}
          onFinish={(r) => {
            // eslint-disable-next-line no-alert
            alert(
              `correct=${r.correct} · shaded=${r.shaded} · attempts=${r.attemptsUsed} · streak=${r.streak}`
            );
          }}
        />
      </div>
    </div>
  );
}

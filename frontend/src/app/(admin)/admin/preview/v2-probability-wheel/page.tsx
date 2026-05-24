"use client";

/** Demo route — /admin/preview/v2-probability-wheel */

import { ProbabilityWheelV2 } from "@/components/exercises/v2/probability-wheel-v2";

export default function V2ProbabilityWheelPreview() {
  return (
    <div style={{ height: "100vh", display: "flex", alignItems: "stretch" }}>
      <div
        style={{
          flex: 1,
          maxWidth: 900,
          margin: "0 auto",
          width: "100%",
          background: "var(--paper)",
          border: "1px solid var(--ink-100)",
        }}
      >
        <ProbabilityWheelV2
          segments={[
            { label: "Green", color: "var(--green-500)", weight: 3 },
            { label: "Sun", color: "var(--sun-400)", weight: 1 },
            { label: "Coral", color: "var(--coral-500)", weight: 1 },
            { label: "Blue", color: "#3b82f6", weight: 1 },
          ]}
          targetSpins={20}
          eyebrow="PREVIEW · V2 · PROBABILITY WHEEL"
          onQuit={() => {
            // eslint-disable-next-line no-alert
            alert("Quit pressed (demo only)");
          }}
          onFinish={(r) => {
            // eslint-disable-next-line no-alert
            alert(
              `correct=${r.correct} · tally=${JSON.stringify(r.tally)} · attempts=${r.attemptsUsed} · streak=${r.streak}`
            );
          }}
        />
      </div>
    </div>
  );
}

"use client";

/** Demo route — /admin/preview/v2-ordering */

import { OrderingV2 } from "@/components/exercises/v2/ordering-v2";

const STEPS = [
  "Initialize an empty result list",
  "Loop through each item in the input",
  "Apply the transformation",
  "Append to the result list",
  "Return the result list",
];

export default function V2OrderingPreview() {
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
        <OrderingV2
          items={STEPS}
          eyebrow="PREVIEW · V2 · ORDERING"
          hint="Try moving the loop body before the return."
          onQuit={() => {
            // eslint-disable-next-line no-alert
            alert("Quit pressed (demo only)");
          }}
          onFinish={(r) => {
            // eslint-disable-next-line no-alert
            alert(`correct=${r.correct} · attempts=${r.attemptsUsed} · streak=${r.streak}`);
          }}
        />
      </div>
    </div>
  );
}

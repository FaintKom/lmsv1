"use client";

/** Demo route — /admin/preview/v2-math-stepwise */

import { MathStepwiseV2 } from "@/components/exercises/v2/math-stepwise-v2";

export default function V2MathStepwisePreview() {
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
        <MathStepwiseV2
          problem="Solve for x:  2x + 6 = 14"
          steps={[
            { label: "Step 1", expected: "2x = 8", hint: "Subtract 6 from both sides" },
            { label: "Step 2", expected: "x = 4", hint: "Divide both sides by 2" },
          ]}
          eyebrow="PREVIEW · V2 · MATH STEPWISE"
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

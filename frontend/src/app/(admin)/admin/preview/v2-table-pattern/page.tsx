"use client";

/** Demo route — /admin/preview/v2-table-pattern */

import { TablePatternV2 } from "@/components/exercises/v2/table-pattern-v2";

export default function V2TablePatternPreview() {
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
        <TablePatternV2
          xValues={[1, 2, 3, 4, 5, 6]}
          yGiven={[3, 5, null, 9, null, 13]}
          answers={{ 2: 7, 4: 11 }}
          ruleAccepted={["2x+1", "2*x+1"]}
          ruleDisplay="f(x) = 2x + 1"
          eyebrow="PREVIEW · V2 · TABLE PATTERN"
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

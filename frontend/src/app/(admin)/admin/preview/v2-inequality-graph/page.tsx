"use client";

/** Demo route — /admin/preview/v2-inequality-graph */

import { InequalityGraphV2 } from "@/components/exercises/v2/inequality-graph-v2";

export default function V2InequalityGraphPreview() {
  return (
    <div style={{ height: "100vh", display: "flex", alignItems: "stretch" }}>
      <div
        style={{
          flex: 1,
          maxWidth: 980,
          margin: "0 auto",
          width: "100%",
          background: "var(--paper)",
          border: "1px solid var(--ink-100)",
        }}
      >
        <InequalityGraphV2
          target={{ m: 1, b: 2, op: ">=" }}
          eyebrow="PREVIEW · V2 · INEQUALITY GRAPH"
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

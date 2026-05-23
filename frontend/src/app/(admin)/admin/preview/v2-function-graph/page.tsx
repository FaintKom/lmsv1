"use client";

/** Demo route — /admin/preview/v2-function-graph */

import { FunctionGraphV2 } from "@/components/exercises/v2/function-graph-v2";

export default function V2FunctionGraphPreview() {
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
        <FunctionGraphV2
          target={{ m: 2, b: -1 }}
          eyebrow="PREVIEW · V2 · FUNCTION GRAPH"
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

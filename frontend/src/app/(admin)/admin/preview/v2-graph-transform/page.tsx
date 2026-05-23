"use client";

/** Demo route — /admin/preview/v2-graph-transform */

import { GraphTransformV2 } from "@/components/exercises/v2/graph-transform-v2";

export default function V2GraphTransformPreview() {
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
        <GraphTransformV2
          target={{ h: 2, v: -1, a: 1 }}
          eyebrow="PREVIEW · V2 · GRAPH TRANSFORM"
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

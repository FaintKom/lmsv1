"use client";

/** Demo route — /admin/preview/v2-area-model */

import { AreaModelV2 } from "@/components/exercises/v2/area-model-v2";

export default function V2AreaModelPreview() {
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
        <AreaModelV2
          a={23}
          b={14}
          splits={{ a: [20, 3], b: [10, 4] }}
          eyebrow="PREVIEW · V2 · AREA MODEL"
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

"use client";

/** Demo route — /admin/preview/v2-scatter-plot */

import { ScatterPlotV2 } from "@/components/exercises/v2/scatter-plot-v2";

export default function V2ScatterPlotPreview() {
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
        <ScatterPlotV2
          points={[
            { x: 1, y: 2.2 }, { x: 2, y: 3.8 }, { x: 3, y: 5.1 }, { x: 4, y: 4.4 },
            { x: 5, y: 6.9 }, { x: 6, y: 7.6 }, { x: 7, y: 9.1 }, { x: 8, y: 9.8 },
          ]}
          target={{ m: 1.1, b: 1.0 }}
          eyebrow="PREVIEW · V2 · SCATTER PLOT"
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

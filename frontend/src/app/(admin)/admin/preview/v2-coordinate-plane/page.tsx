"use client";

/** Demo route — /admin/preview/v2-coordinate-plane */

import { CoordinatePlaneV2 } from "@/components/exercises/v2/coordinate-plane-v2";

export default function V2CoordinatePlanePreview() {
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
        <CoordinatePlaneV2
          targets={[
            { x: 3, y: 2, label: "A" },
            { x: -2, y: 4, label: "B" },
            { x: -3, y: -3, label: "C" },
          ]}
          range={6}
          eyebrow="PREVIEW · V2 · COORDINATE PLANE"
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

"use client";

/** Demo route — /admin/preview/v2-world-3d */

import { World3DV2 } from "@/components/exercises/v2/world-3d-v2";

export default function V2World3DPreview() {
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
        <World3DV2
          size={5}
          start={{ r: 4, c: 0 }}
          goal={{ r: 0, c: 4 }}
          eyebrow="PREVIEW · V2 · 3D WORLD · LEVEL 2"
          onQuit={() => {
            // eslint-disable-next-line no-alert
            alert("Quit pressed (demo only)");
          }}
          onFinish={(r) => {
            // eslint-disable-next-line no-alert
            alert(
              `correct=${r.correct} · steps=${r.steps} · streak=${r.streak}`
            );
          }}
        />
      </div>
    </div>
  );
}

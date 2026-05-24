"use client";

/** Demo route — /admin/preview/v2-whiteboard */

import { WhiteboardV2 } from "@/components/exercises/v2/whiteboard-v2";

export default function V2WhiteboardPreview() {
  return (
    <div style={{ height: "100vh", display: "flex", alignItems: "stretch" }}>
      <div
        style={{
          flex: 1,
          maxWidth: 1100,
          margin: "0 auto",
          width: "100%",
          background: "var(--paper)",
          border: "1px solid var(--ink-100)",
        }}
      >
        <WhiteboardV2
          eyebrow="PREVIEW · V2 · WHITEBOARD"
          title="Sketch the circuit"
          prompt="Draw a circuit with a battery, a switch, and an LED in series. Label each component."
          height={520}
          onQuit={() => {
            // eslint-disable-next-line no-alert
            alert("Quit pressed (demo only)");
          }}
          onFinish={(r) => {
            // eslint-disable-next-line no-alert
            alert(
              `correct=${r.correct} · submitted=${r.submitted} · streak=${r.streak}`
            );
          }}
        />
      </div>
    </div>
  );
}

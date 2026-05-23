"use client";

/** Demo route — /admin/preview/v2-fill-blanks */

import { FillBlanksV2 } from "@/components/exercises/v2/fill-blanks-v2";

export default function V2FillBlanksPreview() {
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
        <FillBlanksV2
          text="The {{blank}} of an array is the {{blank}} of its elements."
          blanks={["length", "count"]}
          wordBank={["count", "size", "length", "amount", "total"]}
          eyebrow="PREVIEW · V2 · FILL BLANKS"
          maxAttemptsPerTask={3}
          onQuit={() => {
            // eslint-disable-next-line no-alert
            alert("Quit pressed (demo only)");
          }}
          onFinish={(r) => {
            // eslint-disable-next-line no-alert
            alert(`correct=${r.correct} · attempts=${r.attemptsUsed} · streak=${r.streak}`);
          }}
        />
      </div>
    </div>
  );
}

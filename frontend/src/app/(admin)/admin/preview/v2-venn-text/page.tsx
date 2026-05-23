"use client";

/** Demo route — /admin/preview/v2-venn-text */

import { VennTextV2 } from "@/components/exercises/v2/venn-text-v2";

export default function V2VennTextPreview() {
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
        <VennTextV2
          setA="Plays guitar"
          setB="Sings"
          answers={{
            a_only: "Guitarists who don't sing",
            intersection: "Singer-guitarists",
            b_only: "Singers who don't play",
            neither: "Neither",
          }}
          eyebrow="PREVIEW · V2 · VENN · TEXT"
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

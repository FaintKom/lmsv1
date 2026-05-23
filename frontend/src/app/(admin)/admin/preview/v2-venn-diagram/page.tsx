"use client";

/** Demo route — /admin/preview/v2-venn-diagram */

import { VennDiagramV2 } from "@/components/exercises/v2/venn-diagram-v2";

export default function V2VennDiagramPreview() {
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
        <VennDiagramV2
          setA="Math Club"
          setB="Science Club"
          total={40}
          given={{ a_only: 12, intersection: 8 }}
          answers={{ b_only: 10, neither: 10 }}
          prompt="12 students are only in Math Club, 8 are in both. Total: 40. Fill in B-only and Neither."
          eyebrow="PREVIEW · V2 · VENN · NUMBERS"
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

"use client";

/** Demo route — /admin/preview/v2-venn-elements */

import { VennElementsV2 } from "@/components/exercises/v2/venn-elements-v2";

export default function V2VennElementsPreview() {
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
        <VennElementsV2
          setA="Even"
          setB="> 5"
          items={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
          correct={{
            "1": "neither",
            "2": "a_only",
            "3": "neither",
            "4": "a_only",
            "5": "neither",
            "6": "intersection",
            "7": "b_only",
            "8": "intersection",
            "9": "b_only",
            "10": "intersection",
          }}
          eyebrow="PREVIEW · V2 · VENN · ELEMENTS"
          onQuit={() => {
            // eslint-disable-next-line no-alert
            alert("Quit pressed (demo only)");
          }}
          onFinish={(r) => {
            // eslint-disable-next-line no-alert
            alert(
              `correct=${r.correct} · wrong=${r.wrongCount} · attempts=${r.attemptsUsed} · streak=${r.streak}`
            );
          }}
        />
      </div>
    </div>
  );
}

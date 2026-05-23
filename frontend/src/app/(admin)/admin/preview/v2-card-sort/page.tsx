"use client";

/** Demo route — /admin/preview/v2-card-sort */

import { CardSortV2 } from "@/components/exercises/v2/card-sort-v2";

export default function V2CardSortPreview() {
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
        <CardSortV2
          categories={[
            { id: "linear", label: "Linear" },
            { id: "quadratic", label: "Quadratic" },
            { id: "exponential", label: "Exponential" },
          ]}
          cards={[
            { id: "c1", text: "y = 2x + 3", cat: "linear" },
            { id: "c2", text: "y = x² − 4", cat: "quadratic" },
            { id: "c3", text: "y = 3ˣ", cat: "exponential" },
            { id: "c4", text: "y = −5x", cat: "linear" },
            { id: "c5", text: "y = (x+1)²", cat: "quadratic" },
            { id: "c6", text: "y = 2·(1.5)ˣ", cat: "exponential" },
          ]}
          eyebrow="PREVIEW · V2 · CARD SORT"
          title="Sort each equation into its family"
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

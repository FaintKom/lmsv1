"use client";

/** Demo route — /admin/preview/v2-categorize */

import { CategorizeV2 } from "@/components/exercises/v2/categorize-v2";

const CATEGORIES = [
  {
    name: "Mutable",
    items: ["list", "dict", "set"],
  },
  {
    name: "Immutable",
    items: ["tuple", "str", "int", "frozenset"],
  },
];

export default function V2CategorizePreview() {
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
        <CategorizeV2
          categories={CATEGORIES}
          eyebrow="PREVIEW · V2 · CATEGORIZE"
          title="Sort each type into mutable vs immutable"
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

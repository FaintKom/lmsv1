"use client";

/** Demo route — /admin/preview/v2-word-search */

import { WordSearchV2 } from "@/components/exercises/v2/word-search-v2";

const GRID = [
  "ABLOOPX",
  "VARQRSE",
  "WBYTEZA",
  "TPMNOPB",
  "CDEFGHI",
  "JKLMNOP",
  "QRSTUVW",
];

export default function V2WordSearchPreview() {
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
        <WordSearchV2
          grid={GRID}
          words={["LOOP", "VAR", "BYTE"]}
          eyebrow="PREVIEW · V2 · WORD SEARCH"
          title="Find all three code-word terms"
          onQuit={() => {
            // eslint-disable-next-line no-alert
            alert("Quit pressed (demo only)");
          }}
          onFinish={(r) => {
            // eslint-disable-next-line no-alert
            alert(
              `correct=${r.correct} · found=${r.found}/${r.total} · streak=${r.streak}`
            );
          }}
        />
      </div>
    </div>
  );
}

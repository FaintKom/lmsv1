"use client";

/** Demo route — /admin/preview/v2-matching */

import { MatchingV2 } from "@/components/exercises/v2/matching-v2";

const PAIRS = [
  { left: "len()", right: "size of a sequence" },
  { left: "str()", right: "convert to string" },
  { left: "int()", right: "convert to integer" },
  { left: "abs()", right: "absolute value" },
];

export default function V2MatchingPreview() {
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
        <MatchingV2
          pairs={PAIRS}
          eyebrow="PREVIEW · V2 · MATCHING"
          onQuit={() => {
            // eslint-disable-next-line no-alert
            alert("Quit pressed (demo only)");
          }}
          onFinish={(r) => {
            // eslint-disable-next-line no-alert
            alert(
              `correct=${r.correct} · wrongAttempts=${r.wrongAttempts} · streak=${r.streak}`
            );
          }}
        />
      </div>
    </div>
  );
}

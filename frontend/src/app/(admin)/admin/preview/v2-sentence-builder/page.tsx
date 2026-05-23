"use client";

/** Demo route — /admin/preview/v2-sentence-builder */

import { SentenceBuilderV2 } from "@/components/exercises/v2/sentence-builder-v2";

export default function V2SentenceBuilderPreview() {
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
        <SentenceBuilderV2
          source="I would like a coffee, please."
          correctWords={["Je", "voudrais", "un", "café", "s’il", "vous", "plaît"]}
          distractors={["le", "tu", "veux"]}
          eyebrow="PREVIEW · V2 · SENTENCE BUILDER"
          title="Build the sentence in French"
          explain="Literally: “I would like a coffee, if you please.”"
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

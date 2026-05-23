"use client";

/** Demo route — /admin/preview/v2-srs-flashcard */

import { SRSFlashcardV2 } from "@/components/exercises/v2/srs-flashcard-v2";

const CARDS = [
  { front: "猫", back: "cat", hint: "māo" },
  { front: "狗", back: "dog", hint: "gǒu" },
  { front: "鸟", back: "bird", hint: "niǎo" },
];

export default function V2SRSFlashcardPreview() {
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
        <SRSFlashcardV2
          cards={CARDS}
          eyebrowPrefix="CHINESE · DECK"
          frontLabel="HANZI"
          backLabel="MEANING"
          onQuit={() => {
            // eslint-disable-next-line no-alert
            alert("Quit pressed (demo only)");
          }}
          onFinish={(r) => {
            // eslint-disable-next-line no-alert
            alert(
              `correct=${r.correct} · again=${r.stats.again} hard=${r.stats.hard} good=${r.stats.good} easy=${r.stats.easy} · streak=${r.streak}`
            );
          }}
        />
      </div>
    </div>
  );
}

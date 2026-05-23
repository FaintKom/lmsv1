"use client";

/** Demo route — /admin/preview/v2-dialogue */

import { DialogueV2 } from "@/components/exercises/v2/dialogue-v2";

export default function V2DialoguePreview() {
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
        <DialogueV2
          messages={[
            { speaker: "Anna", text: "Hola, ¿cómo te llamas?" },
          ]}
          options={[
            { id: "a", text: "Me llamo Carlos.", correct: true },
            { id: "b", text: "Tengo veinte años.", correct: false },
            { id: "c", text: "Soy de España.", correct: false },
          ]}
          prompt="She asked your name."
          eyebrow="PREVIEW · V2 · DIALOGUE"
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

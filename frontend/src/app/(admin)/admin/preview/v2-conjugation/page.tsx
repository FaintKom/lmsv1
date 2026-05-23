"use client";

/** Demo route — /admin/preview/v2-conjugation */

import { ConjugationV2 } from "@/components/exercises/v2/conjugation-v2";

export default function V2ConjugationPreview() {
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
        <ConjugationV2
          infinitive="hablar"
          tense="Presente"
          rows={[
            { pronoun: "yo", correct: "hablo" },
            { pronoun: "tú", correct: "hablas" },
            { pronoun: "él/ella", correct: "habla" },
            { pronoun: "nosotros", correct: "hablamos" },
            { pronoun: "vosotros", correct: "habláis" },
            { pronoun: "ellos/ellas", correct: "hablan" },
          ]}
          eyebrow="PREVIEW · V2 · CONJUGATION"
          placeholder="habl…"
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

"use client";

/** Demo route — /admin/preview/v2-translation */

import { TranslationV2 } from "@/components/exercises/v2/translation-v2";

export default function V2TranslationPreview() {
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
        <TranslationV2
          source="Where is the library?"
          sourceLang="EN"
          targetLang="ES"
          accepted={[
            "¿dónde está la biblioteca?",
            "donde esta la biblioteca",
            "¿dónde está la biblioteca",
            "dónde está la biblioteca",
          ]}
          correct="¿Dónde está la biblioteca?"
          hint="Use “estar” for location (not “ser”)."
          eyebrow="PREVIEW · V2 · TRANSLATION"
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

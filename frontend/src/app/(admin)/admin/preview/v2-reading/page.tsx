"use client";

/** Demo route — /admin/preview/v2-reading */

import { ReadingV2 } from "@/components/exercises/v2/reading-v2";

const PASSAGE = `Marie Curie was a Polish-born physicist who became the first woman to win a Nobel Prize. She conducted pioneering research on radioactivity, a term she coined herself. In 1911, she became the first person to win Nobel Prizes in two different sciences — Physics and Chemistry. Her discoveries laid the groundwork for X-ray imaging and cancer treatment.`;

export default function V2ReadingPreview() {
  return (
    <div style={{ height: "100vh", display: "flex", alignItems: "stretch" }}>
      <div
        style={{
          flex: 1,
          maxWidth: 960,
          margin: "0 auto",
          width: "100%",
          background: "var(--paper)",
          border: "1px solid var(--ink-100)",
        }}
      >
        <ReadingV2
          passage={PASSAGE}
          question="How many Nobel Prizes did Marie Curie win?"
          options={["One", "Two", "Three", "Zero"]}
          correct={1}
          hint="Look at sentence 3."
          eyebrow="PREVIEW · V2 · READING"
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

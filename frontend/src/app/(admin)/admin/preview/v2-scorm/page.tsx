"use client";

/** Demo route — /admin/preview/v2-scorm */

import { ScormPackageV2 } from "@/components/exercises/v2/scorm-v2";

export default function V2ScormPreview() {
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
        <ScormPackageV2
          slides={[
            { title: "Identify hazards" },
            { title: "Apply PPE" },
            { title: "Report incidents" },
            { title: "Practice drills" },
          ]}
          finalScore={92}
          packageName="safety-101.zip"
          version="SCORM 1.2 · SAFETY-101"
          title="Workplace safety basics"
          eyebrow="PREVIEW · V2 · SCORM"
          onQuit={() => {
            // eslint-disable-next-line no-alert
            alert("Quit pressed (demo only)");
          }}
          onFinish={(r) => {
            // eslint-disable-next-line no-alert
            alert(
              `correct=${r.correct} · score=${r.score} · streak=${r.streak}`
            );
          }}
        />
      </div>
    </div>
  );
}

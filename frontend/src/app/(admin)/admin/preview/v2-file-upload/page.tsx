"use client";

/** Demo route — /admin/preview/v2-file-upload */

import { FileUploadV2 } from "@/components/exercises/v2/file-upload-v2";

export default function V2FileUploadPreview() {
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
        <FileUploadV2
          accept=".pdf,.docx,.txt"
          eyebrow="PREVIEW · V2 · FILE UPLOAD"
          title="Upload your final essay"
          onQuit={() => {
            // eslint-disable-next-line no-alert
            alert("Quit pressed (demo only)");
          }}
          onFinish={(r) => {
            // eslint-disable-next-line no-alert
            alert(
              `correct=${r.correct} · file=${r.file ? r.file.name : "—"} · streak=${r.streak}`
            );
          }}
        />
      </div>
    </div>
  );
}

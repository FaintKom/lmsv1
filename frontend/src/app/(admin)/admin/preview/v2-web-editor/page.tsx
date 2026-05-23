"use client";

/** Demo route — /admin/preview/v2-web-editor */

import { WebEditorV2 } from "@/components/exercises/v2/web-editor-v2";

const STARTER = {
  html: `<button class="btn">Click me</button>`,
  css: `.btn {\n  background: #0a8754;\n  color: #fff;\n  border: none;\n  padding: 12px 24px;\n  border-radius: 14px;\n  font-size: 15px;\n  font-weight: 700;\n  cursor: pointer;\n  box-shadow: 0 4px 0 0 #07683f;\n}`,
  js: "",
};

export default function V2WebEditorPreview() {
  return (
    <div style={{ height: "100vh", display: "flex", alignItems: "stretch" }}>
      <div
        style={{
          flex: 1,
          maxWidth: 1100,
          margin: "0 auto",
          width: "100%",
          background: "var(--paper)",
          border: "1px solid var(--ink-100)",
        }}
      >
        <WebEditorV2
          starter={STARTER}
          requirements={[
            {
              text: "Has a <button> element",
              check: (c) => /<button/i.test(c.html),
            },
            {
              text: "Brand green background",
              check: (c) => /background\s*:\s*#0a8754/i.test(c.css),
            },
            {
              text: "Has padding & border-radius",
              check: (c) =>
                /padding\s*:/.test(c.css) && /border-radius/i.test(c.css),
            },
          ]}
          eyebrow="PREVIEW · V2 · WEB EDITOR"
          title="Build a brand button"
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

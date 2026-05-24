"use client";

/** Demo route — /admin/preview/v2-tiptap */

import { useState } from "react";
import { BlockEditor } from "@/components/editor/block-editor";
import type { JSONContent } from "@tiptap/react";

const INITIAL: JSONContent = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "JavaScript constants" }],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Use " },
        { type: "text", marks: [{ type: "code" }], text: "const" },
        {
          type: "text",
          text: " to declare values that won't be reassigned. Try the quiz below:",
        },
      ],
    },
    {
      type: "v2Exercise",
      attrs: {
        exerciseType: "quiz",
        props: {
          questions: [
            {
              q: "Which keyword declares a constant?",
              options: ["var", "let", "const", "static"],
              answer: 2,
              explain: "`const` binds an identifier to an immutable reference.",
            },
          ],
          eyebrow: "DEMO · JS BASICS",
        },
      },
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Now sketch what you remember about scoping rules:",
        },
      ],
    },
    {
      type: "v2Exercise",
      attrs: {
        exerciseType: "whiteboard",
        props: {
          eyebrow: "DEMO · SKETCH",
          title: "Draw the scope chain",
          prompt:
            "Draw a function `outer` that contains `inner`. Mark which variables are in scope where.",
          height: 360,
        },
      },
    },
  ],
};

export default function V2TipTapPreview() {
  const [doc, setDoc] = useState<JSONContent>(INITIAL);
  const [editable, setEditable] = useState(true);

  return (
    <div style={{ minHeight: "100vh", padding: 24, background: "var(--paper)" }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
            gap: 12,
          }}
        >
          <h1
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 800,
              fontSize: 22,
              color: "var(--ink-900)",
              margin: 0,
            }}
          >
            PREVIEW · V2 · TIPTAP NODE
          </h1>
          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--ink-700)",
            }}
          >
            <input
              type="checkbox"
              checked={editable}
              onChange={(e) => setEditable(e.target.checked)}
            />
            EDIT MODE
          </label>
        </div>
        <div style={{ marginBottom: 12 }}>
          <BlockEditor content={doc} onChange={setDoc} editable={editable} />
        </div>
        <details
          style={{
            marginTop: 16,
            padding: 12,
            background: "var(--ink-50)",
            borderRadius: 10,
          }}
        >
          <summary
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--ink-500)",
              cursor: "pointer",
            }}
          >
            Doc JSON
          </summary>
          <pre
            style={{
              marginTop: 8,
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              color: "var(--ink-700)",
              overflow: "auto",
              maxHeight: 320,
            }}
          >
            {JSON.stringify(doc, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}

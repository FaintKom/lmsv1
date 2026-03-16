"use client";

import { useEditor, EditorContent, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import ImageExtension from "@tiptap/extension-image";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import LinkExtension from "@tiptap/extension-link";
import Mathematics from "@tiptap/extension-mathematics";
import { common, createLowlight } from "lowlight";
import "katex/dist/katex.min.css";
import "./editor-styles.css";

import { Callout } from "./extensions/callout";
import { MathBlock } from "./extensions/math-block";
import { SlashCommands } from "./slash-commands";
import { EditorBubbleMenu } from "./toolbar";

const lowlight = createLowlight(common);

interface BlockEditorProps {
  content: JSONContent | null;
  onChange?: (json: JSONContent) => void;
  editable?: boolean;
}

export function BlockEditor({ content, onChange, editable = true }: BlockEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // replaced by CodeBlockLowlight
        horizontalRule: false, // replaced by our HorizontalRule
      }),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === "heading") {
            const level = node.attrs.level;
            return `Heading ${level}`;
          }
          return "Type '/' for commands...";
        },
      }),
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: "javascript",
      }),
      ImageExtension.configure({
        inline: false,
        allowBase64: false,
      }),
      HorizontalRule,
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-indigo-600 underline dark:text-indigo-400",
        },
      }),
      Mathematics.configure({
        katexOptions: {
          throwOnError: false,
        },
      }),
      Callout,
      MathBlock,
      ...(editable ? [SlashCommands] : []),
    ],
    content: content || { type: "doc", content: [{ type: "paragraph" }] },
    editable,
    editorProps: {
      attributes: {
        class: `block-editor-content prose prose-slate dark:prose-invert max-w-none focus:outline-none ${
          editable ? "min-h-[300px]" : ""
        }`,
      },
    },
    onUpdate: ({ editor: e }) => {
      onChange?.(e.getJSON());
    },
    immediatelyRender: false,
  });

  if (!editor) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-lg border border-slate-200 dark:border-white/10">
        <p className="text-sm text-slate-400">Loading editor...</p>
      </div>
    );
  }

  return (
    <div className={`block-editor rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1E1E1E] ${editable ? "shadow-sm" : ""}`}>
      {editable && <EditorBubbleMenu editor={editor} />}
      <EditorContent
        editor={editor}
        className="block-editor-wrapper px-6 py-4"
      />
    </div>
  );
}

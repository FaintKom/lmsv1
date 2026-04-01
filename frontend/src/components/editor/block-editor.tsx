"use client";

import { useRef, useCallback, useEffect } from "react";
import { useEditor, EditorContent, type JSONContent } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import ImageExtension from "@tiptap/extension-image";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import LinkExtension from "@tiptap/extension-link";
import Mathematics from "@tiptap/extension-mathematics";
import { common, createLowlight } from "lowlight";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code2,
  Minus,
  Link2,
  ImageIcon,
  AlertCircle,
  Sigma,
} from "lucide-react";
import { toast } from "sonner";
import "katex/dist/katex.min.css";
import "./editor-styles.css";

import apiClient from "@/lib/api-client";
import { Callout } from "./extensions/callout";
import { MathBlock } from "./extensions/math-block";
import { SlashCommands } from "./slash-commands";
import { EditorBubbleMenu } from "./toolbar";

const lowlight = createLowlight(common);

// ---------------------------------------------------------------------------
// Toolbar button
// ---------------------------------------------------------------------------

function ToolbarButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`rounded p-1.5 transition-colors ${
        active
          ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-200"
      }`}
    >
      {children}
    </button>
  );
}

function ToolbarSeparator() {
  return <div className="mx-1 h-5 w-px bg-slate-200 dark:bg-white/10" />;
}

// ---------------------------------------------------------------------------
// Fixed toolbar above editor
// ---------------------------------------------------------------------------

function EditorToolbar({
  editor,
  onImageUpload,
}: {
  editor: Editor;
  onImageUpload: (file: File) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-2 py-1.5">
      {/* Text formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
        title="Bold"
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
        title="Italic"
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive("strike")}
        title="Strikethrough"
      >
        <Strikethrough className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        active={editor.isActive("code")}
        title="Inline Code"
      >
        <Code className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarSeparator />

      {/* Headings */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        active={editor.isActive("heading", { level: 1 })}
        title="Heading 1"
      >
        <Heading1 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive("heading", { level: 2 })}
        title="Heading 2"
      >
        <Heading2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive("heading", { level: 3 })}
        title="Heading 3"
      >
        <Heading3 className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarSeparator />

      {/* Lists */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
        title="Bullet List"
      >
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
        title="Numbered List"
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarSeparator />

      {/* Blocks */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive("blockquote")}
        title="Blockquote"
      >
        <Quote className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        active={editor.isActive("codeBlock")}
        title="Code Block"
      >
        <Code2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.commands.setMathBlock({ latex: "" })}
        active={editor.isActive("mathBlock")}
        title="Math Block"
      >
        <Sigma className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() =>
          editor.chain().focus().setCallout({ variant: "info" }).run()
        }
        active={editor.isActive("callout")}
        title="Callout"
      >
        <AlertCircle className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Divider"
      >
        <Minus className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarSeparator />

      {/* Link */}
      <ToolbarButton
        onClick={() => {
          const url = window.prompt("Link URL:");
          if (url) {
            editor.chain().focus().setLink({ href: url }).run();
          }
        }}
        active={editor.isActive("link")}
        title="Link"
      >
        <Link2 className="h-4 w-4" />
      </ToolbarButton>

      {/* Image upload */}
      <ToolbarButton
        onClick={() => fileInputRef.current?.click()}
        title="Upload Image"
      >
        <ImageIcon className="h-4 w-4" />
      </ToolbarButton>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onImageUpload(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Block Editor
// ---------------------------------------------------------------------------

interface BlockEditorProps {
  content: JSONContent | string | null;
  onChange?: (json: JSONContent) => void;
  editable?: boolean;
}

export function BlockEditor({
  content,
  onChange,
  editable = true,
}: BlockEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        horizontalRule: false,
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

  // -----------------------------------------------------------------------
  // Image upload helper
  // -----------------------------------------------------------------------

  const uploadAndInsertImage = useCallback(
    async (file: File) => {
      if (!editor) return;

      const formData = new FormData();
      formData.append("file", file);

      try {
        const { data } = await apiClient.post<{ url: string }>(
          "/courses/upload-image",
          formData,
          { headers: { "Content-Type": "multipart/form-data" } },
        );
        editor.chain().focus().setImage({ src: data.url }).run();
      } catch {
        toast.error("Failed to upload image");
      }
    },
    [editor],
  );

  // -----------------------------------------------------------------------
  // Paste & drop image handlers
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (!editor || !editable) return;

    const dom = editor.view.dom;

    const handlePaste = (event: Event) => {
      const clipboardEvent = event as ClipboardEvent;
      const items = clipboardEvent.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          clipboardEvent.preventDefault();
          const file = item.getAsFile();
          if (file) uploadAndInsertImage(file);
          return;
        }
      }
    };

    const handleDrop = (event: Event) => {
      const dragEvent = event as DragEvent;
      const files = dragEvent.dataTransfer?.files;
      if (!files?.length) return;
      const file = files[0];
      if (file.type.startsWith("image/")) {
        dragEvent.preventDefault();
        uploadAndInsertImage(file);
      }
    };

    dom.addEventListener("paste", handlePaste);
    dom.addEventListener("drop", handleDrop);

    return () => {
      dom.removeEventListener("paste", handlePaste);
      dom.removeEventListener("drop", handleDrop);
    };
  }, [editor, editable, uploadAndInsertImage]);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  if (!editor) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-lg border border-slate-200 dark:border-white/10">
        <p className="text-sm text-slate-400">Loading editor...</p>
      </div>
    );
  }

  return (
    <div
      className={`block-editor rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1E1E1E] overflow-hidden ${
        editable ? "shadow-sm" : ""
      }`}
    >
      {editable && (
        <EditorToolbar
          editor={editor}
          onImageUpload={uploadAndInsertImage}
        />
      )}
      {editable && <EditorBubbleMenu editor={editor} />}
      <EditorContent
        editor={editor}
        className="block-editor-wrapper px-6 py-4"
      />
    </div>
  );
}

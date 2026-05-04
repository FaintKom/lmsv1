"use client";

import { useState, useEffect, useCallback, useRef, useLayoutEffect } from "react";
import { Extension } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import Suggestion, { type SuggestionProps, type SuggestionKeyDownProps } from "@tiptap/suggestion";
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Code,
  Sigma,
  Image,
  Quote,
  AlertCircle,
  Minus,
  Type,
} from "lucide-react";
import type { Editor } from "@tiptap/core";

interface CommandItem {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  command: (editor: Editor) => void;
}

const COMMANDS: CommandItem[] = [
  {
    title: "Text",
    description: "Plain text paragraph",
    icon: Type,
    command: (editor) => editor.chain().focus().setParagraph().run(),
  },
  {
    title: "Heading 1",
    description: "Large section heading",
    icon: Heading1,
    command: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    title: "Heading 2",
    description: "Medium section heading",
    icon: Heading2,
    command: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    title: "Heading 3",
    description: "Small section heading",
    icon: Heading3,
    command: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    title: "Bullet List",
    description: "Unordered list with bullets",
    icon: List,
    command: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    title: "Numbered List",
    description: "Ordered list with numbers",
    icon: ListOrdered,
    command: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    title: "Code Block",
    description: "Code with syntax highlighting",
    icon: Code,
    command: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    title: "Math Block",
    description: "LaTeX math formula",
    icon: Sigma,
    command: (editor) => {
      editor.commands.setMathBlock({ latex: "" });
    },
  },
  {
    title: "Image",
    description: "Insert image by URL",
    icon: Image,
    command: (editor) => {
      const url = window.prompt("Image URL:");
      if (url) {
        editor.chain().focus().setImage({ src: url }).run();
      }
    },
  },
  {
    title: "Quote",
    description: "Block quotation",
    icon: Quote,
    command: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    title: "Callout",
    description: "Info, warning, or tip box",
    icon: AlertCircle,
    command: (editor) => editor.chain().focus().setCallout({ variant: "info" }).run(),
  },
  {
    title: "Divider",
    description: "Horizontal separator line",
    icon: Minus,
    command: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },
];

interface CommandListProps {
  items: CommandItem[];
  command: (item: CommandItem) => void;
}

interface CommandListHandle {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
}

function CommandList({ items, command }: CommandListProps & { ref?: React.Ref<CommandListHandle> }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  useLayoutEffect(() => {
    const el = containerRef.current?.children[selectedIndex] as HTMLElement;
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const selectItem = useCallback(
    (index: number) => {
      const item = items[index];
      if (item) command(item);
    },
    [items, command]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => (i + items.length - 1) % items.length);
        return true;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % items.length);
        return true;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        selectItem(selectedIndex);
        return true;
      }
      return false;
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [items, selectedIndex, selectItem]);

  if (items.length === 0) {
    return (
      <div className="slash-menu rounded-lg border border-ink-200 bg-white p-3 shadow-lg dark:border-white/10 dark:bg-[#2C2C2C]">
        <p className="text-sm text-ink-400">No results</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="slash-menu max-h-72 overflow-y-auto rounded-lg border border-ink-200 bg-white p-1 shadow-lg dark:border-white/10 dark:bg-[#2C2C2C]"
    >
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <button
            key={item.title}
            onClick={() => selectItem(index)}
            className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors ${
              index === selectedIndex
                ? "bg-green-50 text-green-700 dark:bg-green-500/20 dark:text-green-300"
                : "text-ink-700 hover:bg-ink-50 dark:text-ink-300 dark:hover:bg-white/5"
            }`}
          >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-ink-200 bg-white dark:border-white/10 dark:bg-white/5">
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium">{item.title}</p>
              <p className="text-xs text-ink-400">{item.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export const SlashCommands = Extension.create({
  name: "slashCommands",

  addOptions() {
    return {
      suggestion: {
        char: "/",
        command: ({ editor, range, props }: { editor: Editor; range: { from: number; to: number }; props: CommandItem }) => {
          props.command(editor);
          editor.chain().focus().deleteRange(range).run();
        },
        items: ({ query }: { query: string }) => {
          return COMMANDS.filter((item) =>
            item.title.toLowerCase().includes(query.toLowerCase())
          );
        },
        render: () => {
          let component: ReactRenderer<unknown> | null = null;
          let popup: HTMLDivElement | null = null;

          return {
            onStart: (props: SuggestionProps) => {
              component = new ReactRenderer(CommandList, {
                props,
                editor: props.editor,
              });

              popup = document.createElement("div");
              popup.style.position = "absolute";
              popup.style.zIndex = "50";
              document.body.appendChild(popup);

              popup.appendChild(component.element as HTMLElement);

              const { clientRect } = props;
              if (clientRect) {
                const rect = clientRect();
                if (rect) {
                  popup.style.left = `${rect.left}px`;
                  popup.style.top = `${rect.bottom + 4}px`;
                }
              }
            },
            onUpdate: (props: SuggestionProps) => {
              component?.updateProps(props);

              if (popup) {
                const { clientRect } = props;
                if (clientRect) {
                  const rect = clientRect();
                  if (rect) {
                    popup.style.left = `${rect.left}px`;
                    popup.style.top = `${rect.bottom + 4}px`;
                  }
                }
              }
            },
            onKeyDown: (props: SuggestionKeyDownProps) => {
              if (props.event.key === "Escape") {
                popup?.remove();
                component?.destroy();
                return true;
              }
              // Let the CommandList handle arrow/enter keys
              return false;
            },
            onExit: () => {
              popup?.remove();
              component?.destroy();
            },
          };
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});

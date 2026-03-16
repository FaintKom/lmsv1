import { Node, mergeAttributes } from "@tiptap/core";

export type CalloutVariant = "info" | "warning" | "success" | "error";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (attrs?: { variant?: CalloutVariant }) => ReturnType;
    };
  }
}

export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "paragraph+",

  addAttributes() {
    return {
      variant: {
        default: "info",
        parseHTML: (el) => el.getAttribute("data-variant") || "info",
        renderHTML: (attrs) => ({ "data-variant": attrs.variant }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="callout"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const variant = HTMLAttributes["data-variant"] || "info";
    const colors: Record<string, string> = {
      info: "border-blue-300 bg-blue-50 dark:border-blue-500/30 dark:bg-blue-500/10",
      warning: "border-yellow-300 bg-yellow-50 dark:border-yellow-500/30 dark:bg-yellow-500/10",
      success: "border-green-300 bg-green-50 dark:border-green-500/30 dark:bg-green-500/10",
      error: "border-red-300 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10",
    };
    const icons: Record<string, string> = {
      info: "ℹ️",
      warning: "⚠️",
      success: "✅",
      error: "❌",
    };

    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "callout",
        class: `callout my-3 flex gap-3 rounded-lg border-l-4 p-4 ${colors[variant] || colors.info}`,
      }),
      ["span", { class: "callout-icon flex-shrink-0 text-lg", contenteditable: "false" }, icons[variant] || icons.info],
      ["div", { class: "callout-content flex-1 min-w-0" }, 0],
    ];
  },

  addCommands() {
    return {
      setCallout:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs,
            content: [{ type: "paragraph" }],
          });
        },
    };
  },
});

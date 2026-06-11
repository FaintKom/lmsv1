import { Mark, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    term: {
      setTerm: (attrs: { definition: string }) => ReturnType;
      unsetTerm: () => ReturnType;
    };
  }
}

/**
 * Inline mark for glossary terms with a hover hint. Serializes to
 * `<span data-term="<definition>">text</span>` — the student-side
 * runtime decorator scans rendered content for `span[data-term]`
 * and shows the definition as a tooltip.
 */
export const Term = Mark.create({
  name: "term",

  addAttributes() {
    return {
      definition: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-term") || "",
        renderHTML: (attrs) => ({ "data-term": attrs.definition }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-term]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        class: "term-mark underline decoration-dotted decoration-primary underline-offset-2 cursor-help",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setTerm:
        (attrs) =>
        ({ commands }) => {
          return commands.setMark(this.name, attrs);
        },
      unsetTerm:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
    };
  },
});

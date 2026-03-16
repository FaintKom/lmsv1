import { Node, mergeAttributes } from "@tiptap/core";
import katex from "katex";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    mathBlock: {
      setMathBlock: (attrs?: { latex?: string }) => ReturnType;
    };
  }
}

export const MathBlock = Node.create({
  name: "mathBlock",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      latex: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-latex") || "",
        renderHTML: (attrs) => ({ "data-latex": attrs.latex }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="math-block"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const latex = HTMLAttributes["data-latex"] || "";
    let rendered = "";
    try {
      rendered = katex.renderToString(latex, {
        displayMode: true,
        throwOnError: false,
      });
    } catch {
      rendered = `<span class="text-red-500">[Math Error]</span>`;
    }

    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "math-block",
        class: "math-block my-4 flex items-center justify-center rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-4 cursor-pointer",
      }),
      ["div", { class: "math-display", contenteditable: "false" }, ""],
    ];
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const dom = document.createElement("div");
      dom.setAttribute("data-type", "math-block");
      dom.className = "math-block my-4 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-4";

      const renderPreview = () => {
        const latex = node.attrs.latex || "";
        if (!latex) {
          dom.innerHTML = `<p class="text-center text-sm text-slate-400 cursor-pointer">Click to add math formula</p>`;
        } else {
          try {
            const html = katex.renderToString(latex, { displayMode: true, throwOnError: false });
            dom.innerHTML = `<div class="flex justify-center cursor-pointer">${html}</div>`;
          } catch {
            dom.innerHTML = `<p class="text-center text-red-500">Invalid LaTeX</p>`;
          }
        }
      };

      const showEditor = () => {
        const latex = node.attrs.latex || "";
        dom.innerHTML = "";
        dom.className = "math-block my-4 rounded-lg border-2 border-indigo-300 dark:border-indigo-500/50 bg-slate-50 dark:bg-white/5 p-4 space-y-3";

        const textarea = document.createElement("textarea");
        textarea.value = latex;
        textarea.placeholder = "Enter LaTeX formula... e.g. \\int_0^1 f(x)dx";
        textarea.className = "w-full rounded-md border border-slate-300 dark:border-white/20 bg-white dark:bg-[#2C2C2C] px-3 py-2 text-sm font-mono text-slate-800 dark:text-slate-200 focus:border-indigo-500 focus:outline-none resize-none";
        textarea.rows = 3;
        textarea.addEventListener("input", () => {
          // Update preview
          try {
            const html = katex.renderToString(textarea.value, { displayMode: true, throwOnError: false });
            preview.innerHTML = html;
          } catch {
            preview.innerHTML = `<span class="text-red-500 text-sm">Invalid LaTeX</span>`;
          }
        });
        textarea.addEventListener("keydown", (e) => {
          if (e.key === "Escape" || (e.key === "Enter" && !e.shiftKey)) {
            e.preventDefault();
            const pos = typeof getPos === "function" ? getPos() : null;
            if (pos !== null && pos !== undefined) {
              editor.chain().focus().command(({ tr }) => {
                tr.setNodeMarkup(pos, undefined, { latex: textarea.value });
                return true;
              }).run();
            }
            renderPreview();
          }
        });

        const preview = document.createElement("div");
        preview.className = "flex justify-center min-h-[2rem] py-2 border-t border-slate-200 dark:border-white/10";
        if (latex) {
          try {
            preview.innerHTML = katex.renderToString(latex, { displayMode: true, throwOnError: false });
          } catch {
            preview.innerHTML = `<span class="text-red-500 text-sm">Invalid LaTeX</span>`;
          }
        } else {
          preview.innerHTML = `<span class="text-slate-400 text-sm">Preview appears here</span>`;
        }

        const hint = document.createElement("p");
        hint.className = "text-[10px] text-slate-400 text-center";
        hint.textContent = "Press Enter to save, Escape to cancel";

        dom.appendChild(textarea);
        dom.appendChild(preview);
        dom.appendChild(hint);
        textarea.focus();
      };

      dom.addEventListener("click", () => {
        if (!editor.isEditable) return;
        showEditor();
      });

      renderPreview();

      return {
        dom,
        update(updatedNode) {
          if (updatedNode.type.name !== "mathBlock") return false;
          // Only re-render preview if not currently editing
          if (!dom.querySelector("textarea")) {
            renderPreview();
          }
          return true;
        },
        stopEvent() {
          return true;
        },
      };
    };
  },

  addCommands() {
    return {
      setMathBlock:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { latex: attrs?.latex || "" },
          });
        },
    };
  },
});

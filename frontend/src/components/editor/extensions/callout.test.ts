import { describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Callout } from "./callout";

function render(variant: string) {
  const editor = new Editor({
    extensions: [StarterKit, Callout],
    content: { type: "doc", content: [{ type: "callout", attrs: { variant }, content: [{ type: "paragraph", content: [{ type: "text", text: "Note" }] }] }] },
  });
  const html = editor.getHTML();
  editor.destroy();
  return html;
}

describe("Callout", () => {
  it.each(["info", "warning", "success", "error"])("draws an svg icon for %s, no emoji, no side stripe", (variant) => {
    const html = render(variant);
    expect(html).toContain("<svg");
    expect(html).toContain('role="note"');
    expect(html).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(html).not.toMatch(/border-l-[2-8]/);
  });

  it("falls back to info for an unknown variant", () => {
    expect(render("bogus")).toContain("border-info");
  });
});

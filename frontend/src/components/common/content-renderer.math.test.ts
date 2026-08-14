import { describe, expect, it } from "vitest";

import { renderMathInHtml } from "./content-renderer";

/**
 * Math is baked into the HTML string rather than patched into the live DOM.
 * The old effect-based version rendered once and was then wiped by the next
 * re-render of the surrounding component, which is invisible in a unit test —
 * so these cases pin the string transform that replaced it.
 */
describe("renderMathInHtml", () => {
  it("renders inline math", () => {
    const out = renderMathInHtml("<p>Pythagoras: $a^2 + b^2 = c^2$ holds.</p>");
    expect(out).toContain("katex");
    expect(out).not.toContain("$a^2");
  });

  it("renders display math", () => {
    const out = renderMathInHtml("<p>$$\\sum_{i=1}^{n} i$$</p>");
    expect(out).toContain("katex-display");
    expect(out).not.toContain("$$");
  });

  it("leaves prices alone", () => {
    // The delimiters must hug non-space characters, so prose about money is
    // not swallowed as one long expression.
    const html = "<p>Apples cost $2 each and oranges cost $3 today.</p>";
    expect(renderMathInHtml(html)).toBe(html);
  });

  it("ignores dollars inside code and pre", () => {
    const html = "<pre><code>echo $PATH && cost=$5</code></pre>";
    expect(renderMathInHtml(html)).toBe(html);
  });

  it("still renders math after a code block", () => {
    const out = renderMathInHtml(
      "<pre><code>$PATH</code></pre><p>then $x^2$ follows</p>",
    );
    expect(out).toContain("<code>$PATH</code>");
    expect(out).toContain("katex");
  });

  it("does not touch dollar-free html", () => {
    const html = "<p>Nothing to see here.</p>";
    expect(renderMathInHtml(html)).toBe(html);
  });

  it("never looks for math inside a tag", () => {
    // A `$` in an attribute must not start an expression that swallows markup.
    const html = '<a href="/pay?amount=$5" title="a$b">link</a>';
    expect(renderMathInHtml(html)).toBe(html);
  });

  it("keeps invalid tex visible instead of dropping it", () => {
    const out = renderMathInHtml("<p>$\\nonsensemacro$</p>");
    expect(out).toContain("nonsensemacro");
  });
});

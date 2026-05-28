import { describe, it, expect } from "vitest";
import { sanitizeHtml } from "./sanitize-html";

describe("sanitizeHtml", () => {
  it("strips <script> tags", () => {
    const out = sanitizeHtml('<p>hi</p><script>alert(1)</script>');
    expect(out).not.toContain("<script");
    expect(out).toContain("<p>hi</p>");
  });

  it("strips inline event handlers (img onerror)", () => {
    const out = sanitizeHtml('<img src="x" onerror="fetch(\'/steal\')">');
    expect(out.toLowerCase()).not.toContain("onerror");
  });

  it("strips svg onload payloads", () => {
    const out = sanitizeHtml('<svg onload="alert(document.cookie)"></svg>');
    expect(out.toLowerCase()).not.toContain("onload");
  });

  it("strips javascript: URIs", () => {
    const out = sanitizeHtml('<a href="javascript:alert(1)">x</a>');
    expect(out.toLowerCase()).not.toContain("javascript:");
  });

  it("keeps safe rich formatting", () => {
    const html =
      '<h2 class="title">Lesson</h2><p style="color:red">para</p>' +
      '<a href="https://example.com" target="_blank">link</a>' +
      '<img src="https://example.com/a.png">';
    const out = sanitizeHtml(html);
    expect(out).toContain("<h2");
    expect(out).toContain("Lesson");
    expect(out).toContain('href="https://example.com"');
    expect(out).toContain("<img");
  });

  it("returns empty string for empty input", () => {
    expect(sanitizeHtml("")).toBe("");
  });
});

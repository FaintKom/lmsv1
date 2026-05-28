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

  it("keeps a YouTube iframe embed and confines it with a sandbox", () => {
    const out = sanitizeHtml(
      '<iframe src="https://www.youtube.com/embed/abc123" allowfullscreen></iframe>',
    );
    expect(out).toContain("<iframe");
    expect(out).toContain("youtube.com/embed/abc123");
    expect(out).toContain("sandbox=");
  });

  it("keeps GeoGebra / Desmos embeds", () => {
    expect(sanitizeHtml('<iframe src="https://www.geogebra.org/material/iframe/id/x"></iframe>'))
      .toContain("<iframe");
    expect(sanitizeHtml('<iframe src="https://www.desmos.com/calculator/abc"></iframe>'))
      .toContain("<iframe");
  });

  it("strips an iframe pointing at a non-allowlisted host", () => {
    const out = sanitizeHtml('<iframe src="https://evil.example.com/phish"></iframe>');
    expect(out).not.toContain("<iframe");
  });

  it("strips a javascript: iframe src", () => {
    const out = sanitizeHtml('<iframe src="javascript:alert(1)"></iframe>');
    expect(out).not.toContain("<iframe");
  });

  it("drops srcdoc even on an allowlisted iframe", () => {
    const out = sanitizeHtml(
      '<iframe src="https://www.youtube.com/embed/x" srcdoc="<script>alert(1)</script>"></iframe>',
    );
    expect(out.toLowerCase()).not.toContain("srcdoc");
    expect(out).not.toContain("<script");
  });

  it("returns empty string for empty input", () => {
    expect(sanitizeHtml("")).toBe("");
  });
});

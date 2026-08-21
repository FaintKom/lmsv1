import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { contrastRatio, readableOn } from "@/lib/brand/contrast";

/** jsdom hands back "rgb(r, g, b)"; the maths wants #rrggbb. */
function toHex(rgb: string): string {
  if (rgb.startsWith("#")) return rgb;
  const [r, g, b] = (rgb.match(/\d+/g) || ["0", "0", "0"]).slice(0, 3);
  return `#${[r, g, b].map((v) => Number(v).toString(16).padStart(2, "0")).join("")}`;
}

import { BrandPreview } from "./brand-preview";

vi.mock("@/lib/i18n/context", () => ({
  useTranslation: () => ({ t: (k: string) => k, locale: "en" }),
}));

const stage = () => screen.getByTestId("brand-preview-stage");
const cta = () => screen.getByTestId("preview-cta");

describe("BrandPreview", () => {
  it("writes dark text on a light brand and light text on a dark one", () => {
    const { rerender } = render(<BrandPreview primary="#facc15" secondary="#3b82f6" />);
    expect(cta()).toHaveStyle({ backgroundColor: "#facc15", color: "#0b0b0b" });

    rerender(<BrandPreview primary="#0f172a" secondary="#3b82f6" />);
    expect(cta()).toHaveStyle({ backgroundColor: "#0f172a", color: "#ffffff" });
  });

  it("redraws on a new colour without any save", () => {
    // The whole point of the preview: the school sees the consequence before
    // committing to it. Nothing here talks to the network.
    const { rerender } = render(<BrandPreview primary="#22c55e" secondary="#3b82f6" />);
    expect(cta()).toHaveStyle({ backgroundColor: "#22c55e" });

    rerender(<BrandPreview primary="#7c3aed" secondary="#3b82f6" />);
    expect(cta()).toHaveStyle({ backgroundColor: "#7c3aed" });
  });

  it("warns when the best available text still cannot be read", () => {
    // The band where neither white nor near-black clears 4.5:1 is narrow —
    // luminance roughly 0.183 to 0.190 — so the premise is asserted rather than
    // assumed. Pick a colour outside it and this test would pass for the wrong
    // reason, silently.
    const IMPOSSIBLE = "#787878";
    expect(contrastRatio(IMPOSSIBLE, readableOn(IMPOSSIBLE))).toBeLessThan(4.5);

    render(<BrandPreview primary={IMPOSSIBLE} secondary="#3b82f6" />);
    const warning = screen.getByTestId("preview-contrast-warning");
    expect(warning).toBeInTheDocument();
    // The number matters. "Bad contrast" tells a school nothing it can act on.
    expect(warning.textContent).toMatch(/\d+\.\d\d:1/);
  });

  it("says nothing alarming when the colour is fine", () => {
    render(<BrandPreview primary="#0a5c2e" secondary="#c2410c" />);
    expect(screen.queryByTestId("preview-contrast-warning")).not.toBeInTheDocument();
  });

  it("warns when the two colours would merge on a chart", () => {
    render(<BrandPreview primary="#22c55e" secondary="#24c760" />);
    expect(screen.getByTestId("preview-merge-warning")).toBeInTheDocument();
  });

  it("does not warn about a pair anyone can tell apart", () => {
    render(<BrandPreview primary="#22c55e" secondary="#1e3a8a" />);
    expect(screen.queryByTestId("preview-merge-warning")).not.toBeInTheDocument();
  });

  it("keeps the tinted labels readable on their own tint, not on the page", () => {
    // Caught by the dark-theme audit, not by any unit test: the text colour was
    // computed against the page while being painted on an 86% tint of the brand
    // colour, landing at 4.02:1 where 4.5 was needed.
    render(<BrandPreview primary="#22c55e" secondary="#3b82f6" />);

    for (const testid of ["preview-streak"]) {
      const el = screen.getByTestId(testid);
      const { backgroundColor, color } = el.style;
      expect(contrastRatio(toHex(backgroundColor), toHex(color))).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("opens in the theme the admin is already in", () => {
    document.documentElement.classList.add("dark");
    render(<BrandPreview primary="#22c55e" secondary="#3b82f6" />);
    // Not the light page: showing light samples inside a dark interface answers
    // a question nobody asked, and trips the dark-theme audit besides.
    expect(stage().style.background).not.toBe("rgb(255, 255, 255)");
    document.documentElement.classList.remove("dark");
  });

  it("switches its own theme without touching the page's", () => {
    render(<BrandPreview primary="#22c55e" secondary="#3b82f6" />);
    const before = stage().style.background;

    fireEvent.click(screen.getByRole("button"));
    expect(stage().style.background).not.toBe(before);

    // The app's own theme lives on <html>. A preview that flipped it would be
    // changing the admin's setting to answer a question about colour.
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});

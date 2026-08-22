import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { SchoolBranding } from "@/lib/api/crm";
import { contrastRatio } from "@/lib/brand/contrast";

import { SchoolMark } from "./school-mark";

vi.mock("@/lib/i18n/context", () => ({
  useTranslation: () => ({ t: (k: string) => k, locale: "en" }),
}));

const NONE: SchoolBranding = {
  display_name: null,
  logo_url: null,
  primary_color: null,
  secondary_color: null,
};

const brand = (over: Partial<SchoolBranding>): SchoolBranding => ({ ...NONE, ...over });

/** jsdom returns "rgb(r, g, b)"; the contrast maths wants #rrggbb. */
function toHex(value: string): string {
  if (value.startsWith("#")) return value;
  const [r, g, b] = (value.match(/\d+/g) || ["0", "0", "0"]).slice(0, 3);
  return `#${[r, g, b].map((v) => Number(v).toString(16).padStart(2, "0")).join("")}`;
}

describe("SchoolMark", () => {
  it("renders nothing at all when there is no school", () => {
    const { container } = render(<SchoolMark branding={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing for a school that set neither name nor logo", () => {
    // This is the whole of "an unknown slug looks like an unbranded school":
    // no error, no gap, no hint about whether that school exists.
    const { container } = render(<SchoolMark branding={brand({})} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("puts readable text on the initial badge", () => {
    // A light mint brand — the colour one school actually uses. White on it is
    // 1.41:1, which is what the product used to render.
    render(<SchoolMark branding={brand({ display_name: "Algonova", primary_color: "#7ff0a9" })} />);
    const badge = screen.getByText("A");
    const { backgroundColor, color } = badge.style;
    expect(contrastRatio(toHex(backgroundColor), toHex(color))).toBeGreaterThanOrEqual(4.5);
  });

  it("offers the name in both themes rather than assuming a white page", () => {
    // Shipped assuming white. On a dark page that put dark green on near-black
    // at 4.32:1 — found by looking at production, not by any test.
    render(<SchoolMark branding={brand({ display_name: "Algonova", primary_color: "#7ff0a9" })} />);
    const name = screen.getByText("Algonova");
    const light = name.style.getPropertyValue("--mark-light");
    const dark = name.style.getPropertyValue("--mark-dark");

    expect(light).toBeTruthy();
    expect(dark).toBeTruthy();
    expect(light).not.toBe(dark);
    expect(contrastRatio(toHex(light), "#fbfcf7")).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(toHex(dark), "#0b100c")).toBeGreaterThanOrEqual(4.5);
  });

  it("leaves the name to ordinary body text when the school chose no colour", () => {
    render(<SchoolMark branding={brand({ display_name: "Algonova" })} />);
    const name = screen.getByText("Algonova");
    expect(name.style.getPropertyValue("--mark-light")).toBe("");
  });
});

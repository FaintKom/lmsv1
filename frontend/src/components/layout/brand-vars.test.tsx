import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useAuthStore, type OrgBranding } from "@/stores/auth-store";

import { BrandVars } from "./brand-vars";

/**
 * One component instead of the same effect copied into two layouts.
 *
 * The interesting assertions are the two that used to be impossible: that
 * `--primary-fg` follows the school's colour at all, and that a school which
 * set nothing is left completely alone.
 */

const NONE: OrgBranding = {
  logo_url: null,
  primary_color: null,
  secondary_color: null,
  display_name: "GrassLMS",
};

function setBranding(branding: Partial<OrgBranding>) {
  useAuthStore.setState({ branding: { ...NONE, ...branding } });
}

function readVar(name: string) {
  return document.documentElement.style.getPropertyValue(name);
}

beforeEach(() => setBranding(NONE));

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute("style");
});

describe("BrandVars", () => {
  it("derives the text colour on a light brand to dark", () => {
    setBranding({ primary_color: "#facc15" });
    render(<BrandVars />);
    expect(readVar("--primary-fg")).toBe("#0b0b0b");
  });

  it("derives it to light on a dark brand", () => {
    setBranding({ primary_color: "#0f172a" });
    render(<BrandVars />);
    expect(readVar("--primary-fg")).toBe("#ffffff");
  });

  it("still applies the brand colour itself, unchanged", () => {
    setBranding({ primary_color: "#facc15", secondary_color: "#3b82f6" });
    render(<BrandVars />);
    expect(readVar("--primary")).toBe("#facc15");
    expect(readVar("--secondary")).toBe("#3b82f6");
  });

  it("touches nothing for a school that set no colour", () => {
    render(<BrandVars />);
    // Not "equals the default" — genuinely unset, so the stylesheet's own
    // fallback is what applies and the product looks exactly as it does today.
    expect(readVar("--primary")).toBe("");
    expect(readVar("--primary-fg")).toBe("");
    expect(readVar("--secondary")).toBe("");
  });

  it("cleans up on unmount, so a super admin does not carry another school's colours home", () => {
    setBranding({ primary_color: "#facc15", secondary_color: "#3b82f6" });
    const { unmount } = render(<BrandVars />);
    expect(readVar("--primary")).toBe("#facc15");

    unmount();
    for (const name of [
      "--primary",
      "--primary-light",
      "--primary-dark",
      "--primary-fg",
      "--secondary",
      "--secondary-light",
      "--secondary-dark",
    ]) {
      expect(readVar(name)).toBe("");
    }
  });
});

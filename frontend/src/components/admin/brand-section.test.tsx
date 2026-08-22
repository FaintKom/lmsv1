import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { suggestSecondary } from "@/lib/brand/contrast";

import { BrandSection } from "./brand-section";

vi.mock("@/lib/i18n/context", () => ({
  useTranslation: () => ({ t: (k: string) => k, locale: "en" }),
}));

/**
 * The section is controlled, so the test supplies the state its parent would.
 * The `output` element is what the form would have saved at any moment.
 */
function Harness({ initialCustom = false }: { initialCustom?: boolean }) {
  const [colors, setColors] = useState({
    primary: "#22c55e",
    secondary: suggestSecondary("#22c55e")[0],
    secondaryIsCustom: initialCustom,
  });
  return (
    <>
      <BrandSection
        displayName=""
        onDisplayName={() => {}}
        logoUrl=""
        onLogoUrl={() => {}}
        primary={colors.primary}
        secondary={colors.secondary}
        secondaryIsCustom={colors.secondaryIsCustom}
        onColors={setColors}
      />
      <output data-testid="state">{JSON.stringify(colors)}</output>
    </>
  );
}

const state = () => JSON.parse(screen.getByTestId("state").textContent || "{}");
const primaryField = () =>
  screen.getByLabelText("admin.settings.primaryColor", { selector: "input[type=text]" });
const secondaryField = () =>
  screen.getByLabelText("admin.settings.secondaryColor", { selector: "input[type=text]" });

describe("BrandSection", () => {
  it("moves the second colour with the first while nobody has chosen one", () => {
    render(<Harness />);
    fireEvent.change(primaryField(), { target: { value: "#7c3aed" } });

    expect(state().secondary).toBe(suggestSecondary("#7c3aed")[0]);
    expect(state().secondaryIsCustom).toBe(false);
  });

  it("stops moving it the moment the school picks one", () => {
    render(<Harness />);
    fireEvent.change(secondaryField(), { target: { value: "#c2410c" } });
    expect(state().secondaryIsCustom).toBe(true);

    fireEvent.change(primaryField(), { target: { value: "#7c3aed" } });
    expect(state().secondary).toBe("#c2410c");
  });

  it("counts a click on one of our own suggestions as a choice", () => {
    // The case a value comparison cannot see: they picked exactly what we
    // offered. Treating that as "untouched" would move it out from under them.
    render(<Harness />);
    const chosen = suggestSecondary("#22c55e")[1];
    fireEvent.click(screen.getByLabelText(`admin.settings.secondarySuggested ${chosen}`));

    expect(state().secondaryIsCustom).toBe(true);
    fireEvent.change(primaryField(), { target: { value: "#7c3aed" } });
    expect(state().secondary).toBe(chosen);
  });

  it("offers four suggestions and marks the one in use", () => {
    render(<Harness />);
    const swatches = screen.getAllByRole("button", {
      name: /admin\.settings\.secondarySuggested #/,
    });
    expect(swatches).toHaveLength(4);
    expect(swatches.filter((b) => b.getAttribute("aria-pressed") === "true")).toHaveLength(1);
  });

  it("shows the preview, so the pair is judged by looking rather than by hex", () => {
    render(<Harness />);
    expect(screen.getByTestId("brand-preview-stage")).toBeInTheDocument();
  });
});

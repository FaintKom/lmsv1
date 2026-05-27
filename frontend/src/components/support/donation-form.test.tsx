import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { DonationForm } from "./donation-form";

const initiateMock = vi.fn();
vi.mock("@/lib/api/donations", () => ({
  initiateDonation: (...args: unknown[]) => initiateMock(...args),
  getDonationStatus: vi.fn().mockResolvedValue({ status: "pending" }),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

vi.mock("@/lib/i18n/context", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

beforeEach(() => {
  initiateMock.mockReset();
  initiateMock.mockResolvedValue({
    donation_id: "00000000-0000-0000-0000-000000000001",
    oc_checkout_url: "https://opencollective.com/grasslms/orders/1/checkout",
  });
  vi.spyOn(window, "open").mockReturnValue({} as unknown as Window);
});

describe("DonationForm", () => {
  it("renders all preset amounts", () => {
    render(<DonationForm />);
    expect(screen.getByRole("button", { name: "$5", pressed: true })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "$10" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "$15" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "$50" })).toBeInTheDocument();
  });

  it("custom amount below 1 blocks submit", async () => {
    render(<DonationForm />);
    fireEvent.change(screen.getByLabelText("support.customAmountPlaceholder"), {
      target: { value: "0" },
    });
    fireEvent.click(screen.getByRole("button", { name: "support.cta" }));
    await new Promise((r) => setTimeout(r, 150));
    expect(initiateMock).not.toHaveBeenCalled();
  });

  it("toggles between one-time and monthly", () => {
    render(<DonationForm />);
    const monthly = screen.getByRole("button", { name: "support.recurrenceMonthly" });
    fireEvent.click(monthly);
    expect(monthly).toHaveAttribute("aria-pressed", "true");
  });

  it("anonymous checkbox hides donor name + email fields", () => {
    render(<DonationForm />);
    expect(screen.getByLabelText("support.donorNameLabel")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("support.anonymousLabel"));
    expect(screen.queryByLabelText("support.donorNameLabel")).toBeNull();
    expect(screen.queryByLabelText("support.donorEmailLabel")).toBeNull();
  });

  it("submit calls initiate with cents + opens popup", async () => {
    render(<DonationForm />);
    fireEvent.click(screen.getByRole("button", { name: "$15" }));
    fireEvent.click(screen.getByRole("button", { name: "support.cta" }));
    await waitFor(() =>
      expect(initiateMock).toHaveBeenCalledWith(
        expect.objectContaining({ amount_cents: 1500, recurrence: "one_time" }),
      ),
    );
    expect(window.open).toHaveBeenCalled();
  });
});

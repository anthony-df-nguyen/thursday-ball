// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { RsvpButtons } from "@/components/RsvpButtons";

describe("RsvpButtons", () => {
  it("submits No straight away when they weren't a Yes", () => {
    const no = vi.fn(async () => {});
    render(<RsvpButtons status="invited" yesAction={async () => {}} noAction={no} />);
    fireEvent.click(screen.getByRole("button", { name: "No" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(no).toHaveBeenCalled();
  });

  it("warns before a Yes changes to No, and only submits on confirm", () => {
    const no = vi.fn(async () => {});
    render(<RsvpButtons status="confirmed" yesAction={async () => {}} noAction={no} />);
    fireEvent.click(screen.getByRole("button", { name: "No" }));
    expect(screen.getByRole("alertdialog")).toHaveTextContent(/let the organizers/i);
    expect(no).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Keep me in" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(no).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "No" }));
    fireEvent.click(screen.getByRole("button", { name: "I can't make it" }));
    expect(no).toHaveBeenCalled();
  });

  it("disables only Yes when told to; No stays available", () => {
    const no = vi.fn(async () => {});
    render(<RsvpButtons status="invited" yesDisabled yesAction={async () => {}} noAction={no} />);
    expect(screen.getByRole("button", { name: "Yes" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "No" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "No" }));
    expect(no).toHaveBeenCalled();
  });

  it.each([
    ["invited", "false", "false"],
    ["confirmed", "true", "false"],
    ["declined", "false", "true"],
  ] as const)("marks the selected answer with aria-pressed when %s", (status, yes, no) => {
    render(<RsvpButtons status={status} yesAction={async () => {}} noAction={async () => {}} />);
    expect(screen.getByRole("button", { name: /Yes/ })).toHaveAttribute("aria-pressed", yes);
    expect(screen.getByRole("button", { name: /No/ })).toHaveAttribute("aria-pressed", no);
  });

  it("shows a check or cross icon on the selected button only", () => {
    const { rerender } = render(<RsvpButtons status="confirmed" yesAction={async () => {}} noAction={async () => {}} />);
    expect(screen.getByRole("button", { name: /Yes/ })).toHaveTextContent("✓");
    expect(screen.getByRole("button", { name: /No/ })).not.toHaveTextContent("✕");
    rerender(<RsvpButtons status="declined" yesAction={async () => {}} noAction={async () => {}} />);
    expect(screen.getByRole("button", { name: /No/ })).toHaveTextContent("✕");
    expect(screen.getByRole("button", { name: /Yes/ })).not.toHaveTextContent("✓");
  });
});

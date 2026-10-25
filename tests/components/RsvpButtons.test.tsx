// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { RsvpButtons } from "@/components/RsvpButtons";

describe("RsvpButtons", () => {
  it("submits No straight away when they weren't a Yes", () => {
    const no = vi.fn(async () => {});
    render(<RsvpButtons confirmed={false} yesAction={async () => {}} noAction={no} />);
    fireEvent.click(screen.getByRole("button", { name: "No" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(no).toHaveBeenCalled();
  });

  it("warns before a Yes changes to No, and only submits on confirm", () => {
    const no = vi.fn(async () => {});
    render(<RsvpButtons confirmed yesAction={async () => {}} noAction={no} />);
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

  it("disables both buttons when told to", () => {
    render(<RsvpButtons confirmed={false} disabled yesAction={async () => {}} noAction={async () => {}} />);
    expect(screen.getByRole("button", { name: "Yes" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "No" })).toBeDisabled();
  });
});

// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PaidCheckbox } from "@/components/PaidCheckbox";
import { RemoveButton } from "@/components/RemoveButton";
import { HeadcountBar } from "@/components/HeadcountBar";
import { TextInviteButton } from "@/components/TextInviteButton";
import { DEFAULT_INVITE_MESSAGE } from "@/lib/inviteMessage";

describe("PaidCheckbox", () => {
  it("toggles to the opposite value", async () => {
    const setPaid = vi.fn(async () => {});
    const { rerender } = render(
      <PaidCheckbox eventId="e" id="a" paid={false} setPaid={setPaid} ariaLabel="Toggle paid" />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Toggle paid" }));
    expect(setPaid).toHaveBeenLastCalledWith("e", "a", true);

    rerender(<PaidCheckbox eventId="e" id="a" paid setPaid={setPaid} ariaLabel="Toggle paid" />);
    await userEvent.click(screen.getByRole("button", { name: "Toggle paid" }));
    expect(setPaid).toHaveBeenLastCalledWith("e", "a", false);
  });
});

describe("RemoveButton", () => {
  it("calls remove with the event and row id", async () => {
    const remove = vi.fn(async () => {});
    render(<RemoveButton eventId="e" id="a" remove={remove} ariaLabel="Remove from run" />);
    await userEvent.click(screen.getByRole("button", { name: "Remove from run" }));
    expect(remove).toHaveBeenCalledWith("e", "a");
  });
});

describe("HeadcountBar", () => {
  const segments = (c: HTMLElement) => [...c.querySelectorAll("span")];

  it("renders one segment per spot and fills the headcount", () => {
    const { container } = render(<HeadcountBar headcount={4} capacity={15} />);
    const segs = segments(container);
    expect(segs).toHaveLength(15);
    expect(segs.filter((s) => s.className.includes("bg-red-500"))).toHaveLength(4);
  });

  it.each([
    // full court, capacity 14: need 10 to play
    [9, 14, "bg-red-500"],
    [10, 14, "bg-orange-500"],
    [11, 14, "bg-orange-500"],
    [12, 14, "bg-yellow-500"],
    [13, 14, "bg-green-500"],
    [14, 14, "bg-green-500"],
    // capacity 10 is still full court
    [9, 10, "bg-red-500"],
    [10, 10, "bg-green-500"],
    // half court, capacity 8: 2v2 is the floor, 4v4 is full
    [3, 8, "bg-red-500"],
    [4, 8, "bg-orange-500"],
    [5, 8, "bg-orange-500"],
    [6, 8, "bg-yellow-500"],
    [7, 8, "bg-green-500"],
    [8, 8, "bg-green-500"],
    // tiny caps never go orange
    [3, 6, "bg-red-500"],
    [4, 6, "bg-yellow-500"],
    [5, 6, "bg-green-500"],
  ])("colors %i people at capacity %i with %s", (n, cap, cls) => {
    const { container } = render(<HeadcountBar headcount={n} capacity={cap} />);
    expect(segments(container)[0].className).toContain(cls);
  });
});

describe("TextInviteButton", () => {
  it("builds an sms link with the custom message", () => {
    render(<TextInviteButton phone="5551234" message="Ball? 🏀" />);
    expect(screen.getByRole("link", { name: "Text invite" })).toHaveAttribute(
      "href",
      `sms:5551234?&body=${encodeURIComponent("Ball? 🏀")}`,
    );
  });

  it("appends the RSVP link on its own line", () => {
    render(<TextInviteButton phone="5551234" message="Ball?" rsvpUrl="https://x.test/rsvp/abc" />);
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      `sms:5551234?&body=${encodeURIComponent("Ball?\nhttps://x.test/rsvp/abc")}`,
    );
  });

  it("falls back to the default message", () => {
    render(<TextInviteButton phone="5551234" message={null} />);
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      `sms:5551234?&body=${encodeURIComponent(DEFAULT_INVITE_MESSAGE)}`,
    );
  });
});

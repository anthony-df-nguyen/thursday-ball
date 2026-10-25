// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const ph = vi.hoisted(() => ({ capture: vi.fn() }));
vi.mock("posthog-js", () => ({ default: ph }));

import { PaidCheckbox } from "@/components/PaidCheckbox";
import { PaymentLink } from "@/components/PaymentLink";
import { RemoveButton } from "@/components/RemoveButton";
import { RsvpResultTracker } from "@/components/RsvpResultTracker";
import { StatusChip } from "@/components/StatusChip";
import { TextInviteButton } from "@/components/TextInviteButton";

beforeEach(() => vi.clearAllMocks());

describe("RsvpResultTracker", () => {
  it("captures what the server answered once, then drops ?r= so a refresh doesn't recount", () => {
    window.history.replaceState(null, "", "/rsvp/abc?r=full");
    const { rerender } = render(<RsvpResultTracker result="full" />);
    expect(ph.capture).toHaveBeenCalledWith("rsvp_result", { result: "full" });
    expect(window.location.search).toBe("");
    rerender(<RsvpResultTracker result="full" />);
    expect(ph.capture).toHaveBeenCalledTimes(1);
  });

  it("captures nothing on a plain visit", () => {
    render(<RsvpResultTracker result={undefined} />);
    expect(ph.capture).not.toHaveBeenCalled();
  });
});

describe("PaymentLink", () => {
  it("captures which payment method was tapped", () => {
    render(<PaymentLink href="https://venmo.com/u/x" method="venmo">@x</PaymentLink>);
    fireEvent.click(screen.getByRole("link", { name: "@x" }));
    expect(ph.capture).toHaveBeenCalledWith("payment_link_clicked", { method: "venmo" });
  });
});

describe("TextInviteButton tracking", () => {
  it("captures that the invite text was opened, and whether it carried a link", () => {
    render(<TextInviteButton phone="5551234" eventId="e1" rsvpUrl="https://x.test/rsvp/t" />);
    fireEvent.click(screen.getByRole("link", { name: "Text invite" }));
    expect(ph.capture).toHaveBeenCalledWith("invite_text_opened", {
      event_id: "e1",
      has_rsvp_link: true,
    });
  });
});

describe("run-scoped organizer events", () => {
  it("RemoveButton uses the given event name and carries the run", () => {
    render(
      <RemoveButton eventId="e1" id="p" remove={async () => {}} ariaLabel="Remove +1" trackAs="plus_one_removed" />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Remove +1" }));
    expect(ph.capture).toHaveBeenCalledWith("plus_one_removed", { event_id: "e1" });
  });

  it("RemoveButton defaults to attendee_removed", () => {
    render(<RemoveButton eventId="e1" id="a" remove={async () => {}} ariaLabel="Remove" />);
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(ph.capture).toHaveBeenCalledWith("attendee_removed", { event_id: "e1" });
  });

  it("PaidCheckbox uses the given event name and carries the run", () => {
    render(
      <PaidCheckbox
        eventId="e1"
        id="p"
        paid={false}
        setPaid={async () => {}}
        ariaLabel="Toggle +1 paid"
        trackAs="plus_one_payment_updated"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Toggle +1 paid" }));
    expect(ph.capture).toHaveBeenCalledWith("plus_one_payment_updated", {
      paid: true,
      event_id: "e1",
    });
  });
});

describe("StatusChip capacity_blocked", () => {
  function chip(atCapacity: boolean) {
    render(
      <StatusChip
        eventId="e1"
        attendeeId="a1"
        status="invited"
        atCapacity={atCapacity}
        runHappened={false}
        setInviteStatus={async () => {}}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Cycle status" }));
  }

  it("is captured when a full run turns the tap into OUT", () => {
    chip(true);
    expect(ph.capture).toHaveBeenCalledWith("capacity_blocked", {
      source: "status_chip",
      event_id: "e1",
    });
  });

  it("isn't captured when there's room", () => {
    chip(false);
    expect(ph.capture).not.toHaveBeenCalled();
  });
});

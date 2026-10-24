// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { RunCard } from "@/components/RunCard";

type Event = Parameters<typeof RunCard>[0]["event"];

const plusOne = (inviteStatus: string, paid = false) => ({ inviteStatus, paid });
const attendee = (inviteStatus: string, paid: boolean, plusOnes: ReturnType<typeof plusOne>[] = []) => ({
  inviteStatus,
  paid,
  plusOnes,
});
const event = (attendees: ReturnType<typeof attendee>[], extra: Record<string, unknown> = {}) =>
  ({ id: "e1", date: "2026-10-22", status: "open", capacity: 15, attendees, ...extra }) as unknown as Event;

describe("RunCard", () => {
  it("links to the event with date and weekday", () => {
    render(<RunCard event={event([])} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/events/e1");
    expect(screen.getByText("Thursday")).toBeInTheDocument();
    expect(screen.getByText(/Oct 22, 2026/)).toBeInTheDocument();
  });

  it("shows empty state with nobody confirmed", () => {
    render(<RunCard event={event([attendee("invited", false)])} />);
    expect(screen.getByText("0 / 15 in")).toBeInTheDocument();
    expect(screen.getByText("No One Confirmed Yet")).toBeInTheDocument();
  });

  it("counts only confirmed people and confirmed +1s", () => {
    render(
      <RunCard
        event={event([
          attendee("confirmed", true, [plusOne("confirmed", false), plusOne("invited", true)]),
          attendee("declined", true, [plusOne("confirmed", true)]),
        ])}
      />,
    );
    // headcount: A + A's confirmed +1 + declined A's confirmed +1 = 3; paid: A + last +1 = 2
    expect(screen.getByText("3 / 15 in")).toBeInTheDocument();
    expect(screen.getByText("2 of 3 Paid")).toBeInTheDocument();
  });

  it("shows ALL PAID when everyone confirmed has paid", () => {
    render(<RunCard event={event([attendee("confirmed", true, [plusOne("confirmed", true)])])} />);
    expect(screen.getByText("ALL PAID")).toBeInTheDocument();
  });

  it("labels archived runs", () => {
    render(<RunCard event={event([], { status: "closed" })} />);
    expect(screen.getByText("Archived →")).toBeInTheDocument();
  });
});

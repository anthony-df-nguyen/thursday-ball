// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AttendeeList } from "@/components/AttendeeList";
import type { InviteStatus } from "@/db/schema";

type Props = Parameters<typeof AttendeeList>[0];
type Attendee = Props["attendees"][number];

const attendee = (over: Partial<Attendee> & { id: string }): Attendee => ({
  displayName: null,
  inviteStatus: "invited",
  paid: false,
  regular: null,
  plusOnes: [],
  ...over,
});

function setup(attendees: Attendee[], over: Partial<Props> = {}) {
  const fns = {
    setInviteStatus: vi.fn(async () => {}),
    setPlusOneInviteStatus: vi.fn(async () => {}),
    addPlusOne: vi.fn(async () => {}),
    removeAttendee: vi.fn(async () => {}),
    removePlusOne: vi.fn(async () => {}),
    setAttendeePaid: vi.fn(async () => {}),
    setPlusOnePaid: vi.fn(async () => {}),
    setPlusOneName: vi.fn(async () => {}),
  };
  const props: Props = {
    eventId: "e1",
    attendees,
    atCapacity: false,
    runHappened: false,
    ...fns,
    ...over,
  };
  const view = render(<AttendeeList {...props} />);
  return { ...fns, props, rerender: (a: Attendee[]) => view.rerender(<AttendeeList {...props} attendees={a} />) };
}

const names = () => screen.getAllByText(/^(Ann|Bob|Cy|Unnamed)$/).map((n) => n.textContent);

describe("AttendeeList", () => {
  it("shows an RSVP preview link per person in dev only", () => {
    const rows = [attendee({ id: "1", displayName: "Bob", rsvpToken: "tok-1" })];
    setup(rows);
    expect(screen.queryByRole("link", { name: "Preview RSVP page" })).toBeNull();
    cleanup();

    vi.stubEnv("NODE_ENV", "development");
    setup(rows);
    expect(screen.getByRole("link", { name: "Preview RSVP page" })).toHaveAttribute("href", "/rsvp/tok-1");
    vi.unstubAllEnvs();
  });

  it("shows no RSVP preview link without a token, even in dev", () => {
    vi.stubEnv("NODE_ENV", "development");
    setup([attendee({ id: "1", displayName: "Bob" })]);
    expect(screen.queryByRole("link", { name: "Preview RSVP page" })).toBeNull();
    vi.unstubAllEnvs();
  });

  it("names rows from the roster, then display name, then Unnamed", () => {
    setup([
      attendee({ id: "1", regular: { name: "Ann", phone: null } }),
      attendee({ id: "2", displayName: "Bob" }),
      attendee({ id: "3" }),
    ]);
    expect(names()).toEqual(["Ann", "Bob", "Unnamed"]);
  });

  it("shows the text-invite link only for people with a phone", () => {
    setup([
      attendee({ id: "1", regular: { name: "Ann", phone: "555" } }),
      attendee({ id: "2", displayName: "Bob" }),
    ]);
    expect(screen.getAllByRole("link", { name: "Text invite" })).toHaveLength(1);
  });

  it("only offers a paid checkbox for confirmed people", () => {
    setup([
      attendee({ id: "1", displayName: "Ann", inviteStatus: "confirmed" }),
      attendee({ id: "2", displayName: "Bob", inviteStatus: "invited" }),
    ]);
    expect(screen.getAllByRole("button", { name: "Toggle paid" })).toHaveLength(1);
  });

  it("wires status, paid, +1 and remove actions to the right rows", async () => {
    const s = setup([attendee({ id: "a1", displayName: "Ann", inviteStatus: "confirmed" })]);
    await userEvent.click(screen.getByRole("button", { name: "Cycle status" }));
    expect(s.setInviteStatus).toHaveBeenCalledWith("e1", "a1", "declined" satisfies InviteStatus);

    await userEvent.click(screen.getByRole("button", { name: "Toggle paid" }));
    expect(s.setAttendeePaid).toHaveBeenCalledWith("e1", "a1", true);

    await userEvent.click(screen.getByRole("button", { name: "Remove from run" }));
    expect(s.removeAttendee).toHaveBeenCalledWith("e1", "a1");

    // The +1 button has no accessible name; it's the only other button.
    const row = screen.getByText("Ann").parentElement!;
    const plusOneBtn = within(row)
      .getAllByRole("button")
      .find((b) => !b.getAttribute("aria-label"))!;
    await userEvent.click(plusOneBtn);
    expect(s.addPlusOne).toHaveBeenCalledWith("e1", "a1", expect.any(FormData));
  });

  it("renders +1s with their own status, paid and remove controls", async () => {
    const s = setup([
      attendee({
        id: "a1",
        displayName: "Ann",
        inviteStatus: "confirmed",
        plusOnes: [{ id: "p1", name: "Mike", inviteStatus: "confirmed", paid: false }],
      }),
    ]);
    expect(screen.getByDisplayValue("Mike")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Toggle +1 paid" }));
    expect(s.setPlusOnePaid).toHaveBeenCalledWith("e1", "p1", true);
    await userEvent.click(screen.getByRole("button", { name: "Remove +1" }));
    expect(s.removePlusOne).toHaveBeenCalledWith("e1", "p1");
  });

  it("keeps row order stable when statuses change, and appends new people", () => {
    const a = attendee({ id: "1", displayName: "Ann", inviteStatus: "confirmed" });
    const b = attendee({ id: "2", displayName: "Bob", inviteStatus: "invited" });
    const { rerender } = setup([a, b]);
    expect(names()).toEqual(["Ann", "Bob"]);

    // Server re-sorts after a status change; on-screen order must not jump.
    rerender([{ ...b, inviteStatus: "confirmed" }, { ...a, inviteStatus: "declined" }]);
    expect(names()).toEqual(["Ann", "Bob"]);

    rerender([{ ...b }, { ...a }, attendee({ id: "3", displayName: "Cy" })]);
    expect(names()).toEqual(["Ann", "Bob", "Cy"]);

    rerender([attendee({ id: "3", displayName: "Cy" }), { ...a }]);
    expect(names()).toEqual(["Ann", "Cy"]);
  });
});

// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StatusChip } from "@/components/StatusChip";
import type { InviteStatus } from "@/db/schema";

function setup(
  status: InviteStatus,
  opts: { atCapacity?: boolean; runHappened?: boolean } = {},
) {
  const setInviteStatus = vi.fn(async () => {});
  render(
    <StatusChip
      eventId="e1"
      attendeeId="a1"
      status={status}
      atCapacity={opts.atCapacity ?? false}
      runHappened={opts.runHappened ?? false}
      setInviteStatus={setInviteStatus}
    />,
  );
  return setInviteStatus;
}

describe("StatusChip", () => {
  it.each([
    ["confirmed", "IN"],
    ["invited", "ASKED"],
    ["declined", "OUT"],
    ["no_show", "NO SHOW"],
  ] as const)("shows %s as %s", (status, label) => {
    setup(status);
    expect(screen.getByRole("button", { name: "Cycle status" })).toHaveTextContent(label);
  });

  it.each([
    ["invited", "confirmed"],
    ["confirmed", "declined"],
    ["declined", "invited"],
  ] as const)("cycles %s -> %s before the run", async (from, to) => {
    const spy = setup(from);
    await userEvent.click(screen.getByRole("button", { name: "Cycle status" }));
    expect(spy).toHaveBeenCalledWith("e1", "a1", to);
  });

  it("never offers no_show before the run", async () => {
    setup("confirmed");
    await userEvent.click(screen.getByRole("button"));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  describe("after the run", () => {
    it("opens a menu with every status instead of cycling", async () => {
      const spy = setup("confirmed", { runHappened: true });
      await userEvent.click(screen.getByRole("button", { name: "Change status" }));
      expect(spy).not.toHaveBeenCalled();
      expect(screen.getAllByRole("menuitem").map((i) => i.textContent)).toEqual([
        "IN✓",
        "NO SHOW",
        "OUT",
        "ASKED",
      ]);
    });

    it("sets the chosen status and closes the menu", async () => {
      const spy = setup("confirmed", { runHappened: true });
      await userEvent.click(screen.getByRole("button", { name: "Change status" }));
      await userEvent.click(screen.getByRole("menuitem", { name: "NO SHOW" }));
      expect(spy).toHaveBeenCalledWith("e1", "a1", "no_show");
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });

    it("does nothing when the current status is re-picked", async () => {
      const spy = setup("declined", { runHappened: true });
      await userEvent.click(screen.getByRole("button", { name: "Change status" }));
      await userEvent.click(screen.getByRole("menuitem", { name: /OUT/ }));
      expect(spy).not.toHaveBeenCalled();
    });

    it("disables IN at capacity unless already IN", async () => {
      setup("invited", { runHappened: true, atCapacity: true });
      await userEvent.click(screen.getByRole("button", { name: "Change status" }));
      expect(screen.getByRole("menuitem", { name: "IN" })).toBeDisabled();
    });

    it("closes on Escape and on outside click", async () => {
      setup("confirmed", { runHappened: true });
      await userEvent.click(screen.getByRole("button", { name: "Change status" }));
      await userEvent.keyboard("{Escape}");
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole("button", { name: "Change status" }));
      await userEvent.click(document.body);
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
  });

  it("skips confirming (goes to declined) when at capacity", async () => {
    const spy = setup("invited", { atCapacity: true });
    await userEvent.click(screen.getByRole("button", { name: "Cycle status" }));
    expect(spy).toHaveBeenCalledWith("e1", "a1", "declined");
  });
});

// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlusOneNameInput } from "@/components/PlusOneNameInput";
import { EventMenu } from "@/components/EventMenu";
import { NewRunForm } from "@/components/NewRunForm";

describe("PlusOneNameInput", () => {
  it("saves the name on blur", async () => {
    const setName = vi.fn(async () => {});
    render(<PlusOneNameInput eventId="e" plusOneId="p" name={null} setPlusOneName={setName} />);
    await userEvent.type(screen.getByPlaceholderText("Name (optional)"), "Mike");
    expect(setName).not.toHaveBeenCalled();
    await userEvent.tab();
    expect(setName).toHaveBeenCalledWith("e", "p", "Mike");
  });
});

describe("EventMenu", () => {
  function setup(over: Partial<Parameters<typeof EventMenu>[0]> = {}) {
    const fns = {
      deleteEvent: vi.fn(async () => {}),
      archiveEvent: vi.fn(async () => {}),
      unarchiveEvent: vi.fn(async () => {}),
    };
    render(
      <EventMenu eventId="e1" archived={false} allPaid={false} unpaidCount={2} {...fns} {...over} />,
    );
    return fns;
  }
  const openMenu = () => userEvent.click(screen.getByRole("button", { name: "Run options" }));

  it("archives only after confirming, and warns about unpaid people", async () => {
    const f = setup();
    await openMenu();
    await userEvent.click(screen.getByRole("button", { name: "Archive (2 unpaid)" }));
    expect(f.archiveEvent).not.toHaveBeenCalled();
    expect(screen.getByText(/2 people still show unpaid/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Archive" }));
    expect(f.archiveEvent).toHaveBeenCalledWith("e1");
  });

  it("can back out of archiving", async () => {
    const f = setup();
    await openMenu();
    await userEvent.click(screen.getByRole("button", { name: /^Archive/ }));
    await userEvent.click(screen.getByRole("button", { name: "Keep" }));
    expect(f.archiveEvent).not.toHaveBeenCalled();
  });

  it("deletes only after confirming", async () => {
    const f = setup({ allPaid: true, unpaidCount: 0 });
    await openMenu();
    await userEvent.click(screen.getByRole("button", { name: "Delete this Run" }));
    expect(f.deleteEvent).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(f.deleteEvent).toHaveBeenCalledWith("e1");
  });

  it("offers unarchive (no confirmation) for archived runs", async () => {
    const f = setup({ archived: true });
    await openMenu();
    await userEvent.click(screen.getByRole("button", { name: "Unarchive to edit" }));
    expect(f.unarchiveEvent).toHaveBeenCalledWith("e1");
  });
});

describe("NewRunForm", () => {
  it("opens a form with the next Thursday prefilled", async () => {
    vi.useFakeTimers({ now: new Date("2026-10-21T12:00:00Z"), toFake: ["Date"] });
    try {
      render(<NewRunForm createEvent={vi.fn(async () => {})} />);
      await userEvent.click(screen.getByRole("button", { name: "+ New Run" }));
      expect(screen.getByDisplayValue("2026-10-22")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});

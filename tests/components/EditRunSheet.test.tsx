// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const ph = vi.hoisted(() => ({ capture: vi.fn() }));
vi.mock("posthog-js", () => ({ default: ph }));

import { EventMenu } from "@/components/EventMenu";
import type { UpdateEventResult } from "@/app/(app)/actions";

const RUN = { capacity: 15, locationName: "Main Gym", locationAddress: "1 Gym Way" };

function setup(result: UpdateEventResult = { ok: true }, headcount = 4) {
  const updateEvent = vi.fn<(id: string, fd: FormData) => Promise<UpdateEventResult>>(async () => result);
  render(
    <EventMenu
      eventId="e1"
      archived={false}
      allPaid={false}
      unpaidCount={0}
      run={RUN}
      headcount={headcount}
      updateEvent={updateEvent}
      deleteEvent={vi.fn(async () => {})}
      archiveEvent={vi.fn(async () => {})}
      unarchiveEvent={vi.fn(async () => {})}
    />,
  );
  return updateEvent;
}

async function openEdit() {
  await userEvent.click(screen.getByRole("button", { name: "Run options" }));
  await userEvent.click(screen.getByRole("button", { name: "Edit run" }));
}

beforeEach(() => vi.clearAllMocks());

describe("EditRunSheet", () => {
  it("opens prefilled from the menu and tracks the open", async () => {
    setup();
    await openEdit();
    expect(screen.getByLabelText("Capacity")).toHaveValue(15);
    expect(screen.getByDisplayValue("Main Gym")).toBeInTheDocument();
    expect(screen.getByDisplayValue("1 Gym Way")).toBeInTheDocument();
    expect(screen.getByText(/4 in so far/)).toBeInTheDocument();
    expect(ph.capture).toHaveBeenCalledWith("run_edit_opened", { event_id: "e1", archived: false });
  });

  it("saves changes, tracks which fields changed, and closes", async () => {
    const updateEvent = setup();
    await openEdit();
    const cap = screen.getByLabelText("Capacity");
    await userEvent.clear(cap);
    await userEvent.type(cap, "20");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(updateEvent).toHaveBeenCalledTimes(1);
    expect(updateEvent.mock.calls[0][0]).toBe("e1");
    expect((updateEvent.mock.calls[0][1] as FormData).get("capacity")).toBe("20");
    expect(ph.capture).toHaveBeenCalledWith("run_edit_submitted", {
      event_id: "e1",
      fields_changed: ["capacity"],
    });
    expect(screen.queryByText("Edit Run")).not.toBeInTheDocument();
  });

  it("tracks location changes by field name, not value", async () => {
    setup();
    await openEdit();
    const name = screen.getByDisplayValue("Main Gym");
    await userEvent.clear(name);
    await userEvent.type(name, "Other Gym");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(ph.capture).toHaveBeenCalledWith("run_edit_submitted", {
      event_id: "e1",
      fields_changed: ["location_name"],
    });
  });

  it("closes without calling the server or tracking when nothing changed", async () => {
    const updateEvent = setup();
    await openEdit();
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(updateEvent).not.toHaveBeenCalled();
    expect(ph.capture).not.toHaveBeenCalledWith("run_edit_submitted", expect.anything());
    expect(screen.queryByText("Edit Run")).not.toBeInTheDocument();
  });

  it("shows the server's refusal, tracks it, and stays open", async () => {
    setup({ ok: false, error: "capacity_below_headcount" });
    await openEdit();
    const cap = screen.getByLabelText("Capacity");
    await userEvent.clear(cap);
    await userEvent.type(cap, "10");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/More people are in/);
    expect(ph.capture).toHaveBeenCalledWith("run_edit_blocked", {
      event_id: "e1",
      reason: "capacity_below_headcount",
    });
    expect(screen.getByText("Edit Run")).toBeInTheDocument();
  });

  it("won't let the capacity field go below the current headcount", async () => {
    setup({ ok: true }, 6);
    await openEdit();
    expect(screen.getByLabelText("Capacity")).toHaveAttribute("min", "6");
  });
});

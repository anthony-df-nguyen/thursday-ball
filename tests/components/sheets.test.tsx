// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddPlayersPanel, AddPlayersSheet } from "@/components/AddPlayersSheet";
import { EditRegularSheet } from "@/components/EditRegularSheet";

describe("AddPlayersPanel", () => {
  function setup(regulars = [
    { id: "r1", name: "Ann", isOrganizer: true },
    { id: "r2", name: "Bob", isOrganizer: false },
  ]) {
    const addRegularToEvent = vi.fn(async () => {});
    const addAdHocAttendee = vi.fn(async () => {});
    render(
      <AddPlayersPanel
        eventId="e1"
        availableRegulars={regulars}
        addRegularToEvent={addRegularToEvent}
        addAdHocAttendee={addAdHocAttendee}
      />,
    );
    return { addRegularToEvent, addAdHocAttendee };
  }

  it("lists regulars and flags organizers", () => {
    setup();
    expect(screen.getByRole("button", { name: /Ann/ })).toHaveTextContent("ORG");
    expect(screen.getByRole("button", { name: /Bob/ })).not.toHaveTextContent("ORG");
  });

  it("adds a tapped regular to the run", async () => {
    const { addRegularToEvent } = setup();
    await userEvent.click(screen.getByRole("button", { name: /Bob/ }));
    expect(addRegularToEvent).toHaveBeenCalledWith("e1", "r2");
  });

  it("adds a trimmed one-off name and clears the field", async () => {
    const { addAdHocAttendee } = setup();
    const input = screen.getByPlaceholderText("Add a non-regular person");
    await userEvent.type(input, "  Walk-on  ");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(addAdHocAttendee).toHaveBeenCalledTimes(1);
    const [eventId, fd] = addAdHocAttendee.mock.calls[0] as unknown as [string, FormData];
    expect(eventId).toBe("e1");
    expect(fd.get("displayName")).toBe("Walk-on");
    expect(input).toHaveValue("");
  });

  it("ignores a blank one-off name", async () => {
    const { addAdHocAttendee } = setup();
    await userEvent.type(screen.getByPlaceholderText("Add a non-regular person"), "   ");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(addAdHocAttendee).not.toHaveBeenCalled();
  });

  it("says so when everyone is already on the run", () => {
    setup([]);
    expect(screen.getByText("Everyone on the roster is already on this run.")).toBeInTheDocument();
  });
});

describe("AddPlayersSheet", () => {
  it("opens from the button and closes with Done", async () => {
    render(
      <AddPlayersSheet
        eventId="e1"
        availableRegulars={[{ id: "r1", name: "Ann", isOrganizer: false }]}
        addRegularToEvent={vi.fn(async () => {})}
        addAdHocAttendee={vi.fn(async () => {})}
      />,
    );
    expect(screen.queryByText("Ann")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Add Players" }));
    expect(screen.getByText("Ann")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.queryByText("Ann")).not.toBeInTheDocument();
  });

  it("closes on Escape", async () => {
    render(
      <AddPlayersSheet
        eventId="e1"
        availableRegulars={[{ id: "r1", name: "Ann", isOrganizer: false }]}
        addRegularToEvent={vi.fn(async () => {})}
        addAdHocAttendee={vi.fn(async () => {})}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Add Players" }));
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByText("Ann")).not.toBeInTheDocument();
  });
});

describe("EditRegularSheet", () => {
  const regular = { id: "r1", name: "Ann", nickname: "A", phone: "555" };
  function setup(isOrganizer = false) {
    const updateRegular = vi.fn(async () => {});
    const deleteRegular = vi.fn(async () => {});
    render(
      <EditRegularSheet
        regular={regular}
        isOrganizer={isOrganizer}
        updateRegular={updateRegular}
        deleteRegular={deleteRegular}
      />,
    );
    return { updateRegular, deleteRegular };
  }

  it("shows the nickname, phone marker and ORG tag in the row", () => {
    setup(true);
    expect(screen.getByText(/“A”/)).toBeInTheDocument();
    expect(screen.getByLabelText("Phone number on file")).toBeInTheDocument();
    expect(screen.getByText("ORG")).toBeInTheDocument();
  });

  it("opens prefilled and saves edits", async () => {
    const { updateRegular } = setup();
    await userEvent.click(screen.getByRole("button", { name: /Ann/ }));
    const name = screen.getByPlaceholderText("Name");
    expect(name).toHaveValue("Ann");
    expect(screen.getByPlaceholderText("Phone (optional)")).toHaveValue("555");

    await userEvent.clear(name);
    await userEvent.type(name, "Anna");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(updateRegular).toHaveBeenCalledTimes(1);
    const [id, fd] = updateRegular.mock.calls[0] as unknown as [string, FormData];
    expect(id).toBe("r1");
    expect(fd.get("name")).toBe("Anna");
    expect(fd.get("nickname")).toBe("A");
    expect(fd.get("phone")).toBe("555");
  });

  it("removes a regular from the roster", async () => {
    const { deleteRegular } = setup();
    await userEvent.click(screen.getByRole("button", { name: /Ann/ }));
    await userEvent.click(screen.getByRole("button", { name: "Remove from roster" }));
    expect(deleteRegular).toHaveBeenCalledWith("r1");
  });

  it("does not offer removal for organizers", async () => {
    setup(true);
    await userEvent.click(screen.getByRole("button", { name: /Ann/ }));
    expect(screen.queryByRole("button", { name: "Remove from roster" })).not.toBeInTheDocument();
  });
});

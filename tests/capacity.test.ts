import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { eventAttendees, plusOnes } from "@/db/schema";
import {
  addPlusOne,
  setInviteStatus,
  setPlusOneInviteStatus,
} from "@/app/(app)/actions";
import { makeAttendee, makeEvent, makePlusOne, resetDb, seedOrganizer } from "./helpers";

beforeEach(async () => {
  await resetDb();
  await seedOrganizer();
});

describe("capacity (headcount = confirmed attendees + confirmed +1s)", () => {
  it("blocks confirming an attendee once the event is full", async () => {
    const event = await makeEvent("2026-11-05", { capacity: 2 });
    await makeAttendee(event.id, { displayName: "A" }, "confirmed");
    await makeAttendee(event.id, { displayName: "B" }, "confirmed");
    const c = await makeAttendee(event.id, { displayName: "C" });

    await expect(setInviteStatus(event.id, c.id, "confirmed")).rejects.toThrow("at capacity");
    const after = await db.query.eventAttendees.findFirst({ where: eq(eventAttendees.id, c.id) });
    expect(after?.inviteStatus).toBe("invited");
  });

  it("counts confirmed +1s toward the cap", async () => {
    const event = await makeEvent("2026-11-05", { capacity: 2 });
    const a = await makeAttendee(event.id, { displayName: "A" }, "confirmed");
    await makePlusOne(a.id, "confirmed");
    const b = await makeAttendee(event.id, { displayName: "B" });

    await expect(setInviteStatus(event.id, b.id, "confirmed")).rejects.toThrow("at capacity");
  });

  it("does not count invited or declined +1s", async () => {
    const event = await makeEvent("2026-11-05", { capacity: 2 });
    const a = await makeAttendee(event.id, { displayName: "A" }, "confirmed");
    await makePlusOne(a.id, "invited");
    await makePlusOne(a.id, "declined");
    const b = await makeAttendee(event.id, { displayName: "B" });

    await setInviteStatus(event.id, b.id, "confirmed");
    const after = await db.query.eventAttendees.findFirst({ where: eq(eventAttendees.id, b.id) });
    expect(after?.inviteStatus).toBe("confirmed");
  });

  it("blocks confirming a +1 when full", async () => {
    const event = await makeEvent("2026-11-05", { capacity: 1 });
    const a = await makeAttendee(event.id, { displayName: "A" }, "confirmed");
    const p = await makePlusOne(a.id);

    await expect(setPlusOneInviteStatus(event.id, p.id, "confirmed")).rejects.toThrow("at capacity");
    const after = await db.query.plusOnes.findFirst({ where: eq(plusOnes.id, p.id) });
    expect(after?.inviteStatus).toBe("invited");
  });

  it("allows re-confirming someone already confirmed while full", async () => {
    const event = await makeEvent("2026-11-05", { capacity: 1 });
    const a = await makeAttendee(event.id, { displayName: "A" }, "confirmed");
    await expect(setInviteStatus(event.id, a.id, "confirmed")).resolves.toBeUndefined();
  });

  it("frees a spot when someone is declined or marked no-show", async () => {
    const event = await makeEvent("2026-11-05", { capacity: 1 });
    const a = await makeAttendee(event.id, { displayName: "A" }, "confirmed");
    const b = await makeAttendee(event.id, { displayName: "B" });

    await setInviteStatus(event.id, a.id, "declined");
    await setInviteStatus(event.id, b.id, "confirmed");
    const after = await db.query.eventAttendees.findFirst({ where: eq(eventAttendees.id, b.id) });
    expect(after?.inviteStatus).toBe("confirmed");
  });

  it("only counts the event's own people", async () => {
    const full = await makeEvent("2026-11-05", { capacity: 1 });
    await makeAttendee(full.id, { displayName: "A" }, "confirmed");
    const other = await makeEvent("2026-11-12", { capacity: 1 });
    const x = await makeAttendee(other.id, { displayName: "X" });

    await setInviteStatus(other.id, x.id, "confirmed");
  });

  it("throws Not found for a missing attendee", async () => {
    const event = await makeEvent("2026-11-05");
    await expect(
      setInviteStatus(event.id, "00000000-0000-0000-0000-000000000000", "confirmed"),
    ).rejects.toThrow("Not found");
  });

  it("new +1s start as invited and trim/blank names become null", async () => {
    const event = await makeEvent("2026-11-05");
    const a = await makeAttendee(event.id, { displayName: "A" }, "confirmed");
    const fd = new FormData();
    fd.set("name", "   ");
    await addPlusOne(event.id, a.id, fd);
    const [p] = await db.select().from(plusOnes);
    expect(p.inviteStatus).toBe("invited");
    expect(p.name).toBeNull();
  });
});

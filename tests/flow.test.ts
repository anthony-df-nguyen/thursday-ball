import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { eventAttendees, plusOnes } from "@/db/schema";
import {
  addAdHocAttendee,
  addPlusOne,
  addRegularToEvent,
  getArchivedRuns,
  removeAttendee,
  removePlusOne,
  setAttendeePaid,
  setInviteStatus,
  setPlusOneInviteStatus,
  setPlusOneName,
  setPlusOnePaid,
} from "@/app/(app)/actions";
import { getStats } from "@/db/stats";
import { makeAttendee, makeEvent, makePlusOne, makeRegular, resetDb, seedOrganizer } from "./helpers";

beforeEach(async () => {
  await resetDb();
  await seedOrganizer();
});

describe("a run from invite to archive (core flow)", () => {
  it("invite -> confirm -> +1 -> pay -> archive summary -> stats", async () => {
    const event = await makeEvent("2026-01-08", { status: "closed" });
    const ann = await makeRegular("Ann");
    await addRegularToEvent(event.id, ann.id);
    const fd = new FormData();
    fd.set("displayName", "Walk-on");
    await addAdHocAttendee(event.id, fd);

    const rows = await db.select().from(eventAttendees);
    const annRow = rows.find((r) => r.regularId === ann.id)!;
    const walkOn = rows.find((r) => r.displayName === "Walk-on")!;

    await setInviteStatus(event.id, annRow.id, "confirmed");
    await setInviteStatus(event.id, walkOn.id, "confirmed");
    await addPlusOne(event.id, annRow.id, new FormData());
    const [plusOne] = await db.select().from(plusOnes);
    await setPlusOneInviteStatus(event.id, plusOne.id, "confirmed");

    await setAttendeePaid(event.id, annRow.id, true);
    await setPlusOnePaid(event.id, plusOne.id, true);

    // Walk-on never showed up.
    await setInviteStatus(event.id, walkOn.id, "no_show");

    const [run] = (await getArchivedRuns(null)).runs;
    expect(run).toMatchObject({ headcount: 2, unpaid: 0 }); // Ann + her +1

    const stats = await getStats();
    expect(stats.people.find((p) => p.name === "Ann")).toMatchObject({ played: 1, noShows: 0 });
    expect(stats.people.find((p) => p.name === "Walk-on")).toMatchObject({ played: 0, noShows: 1 });
  });
});

describe("payment, +1 and removal actions", () => {
  it("toggles paid on attendees and +1s independently", async () => {
    const e = await makeEvent("2026-11-05");
    const a = await makeAttendee(e.id, { displayName: "A" }, "confirmed");
    const p = await makePlusOne(a.id, "confirmed");

    await setPlusOnePaid(e.id, p.id, true);
    expect((await db.query.eventAttendees.findFirst({ where: eq(eventAttendees.id, a.id) }))?.paid).toBe(false);
    expect((await db.query.plusOnes.findFirst({ where: eq(plusOnes.id, p.id) }))?.paid).toBe(true);

    await setAttendeePaid(e.id, a.id, true);
    await setAttendeePaid(e.id, a.id, false);
    expect((await db.query.eventAttendees.findFirst({ where: eq(eventAttendees.id, a.id) }))?.paid).toBe(false);
  });

  it("names a +1 (trimmed, 40 max) and clears it when blank", async () => {
    const e = await makeEvent("2026-11-05");
    const a = await makeAttendee(e.id, { displayName: "A" }, "confirmed");
    const p = await makePlusOne(a.id);

    await setPlusOneName(e.id, p.id, "  Mike  ");
    expect((await db.select().from(plusOnes))[0].name).toBe("Mike");
    await setPlusOneName(e.id, p.id, "y".repeat(80));
    expect((await db.select().from(plusOnes))[0].name).toHaveLength(40);
    await setPlusOneName(e.id, p.id, "   ");
    expect((await db.select().from(plusOnes))[0].name).toBeNull();
  });

  it("removing an attendee removes their +1s and frees capacity", async () => {
    const e = await makeEvent("2026-11-05", { capacity: 2 });
    const a = await makeAttendee(e.id, { displayName: "A" }, "confirmed");
    await makePlusOne(a.id, "confirmed");
    const b = await makeAttendee(e.id, { displayName: "B" });

    await removeAttendee(e.id, a.id);
    expect(await db.select().from(plusOnes)).toHaveLength(0);
    await setInviteStatus(e.id, b.id, "confirmed"); // no longer full
  });

  it("removing a +1 leaves the attendee", async () => {
    const e = await makeEvent("2026-11-05");
    const a = await makeAttendee(e.id, { displayName: "A" }, "confirmed");
    const p = await makePlusOne(a.id);
    await removePlusOne(e.id, p.id);
    expect(await db.select().from(plusOnes)).toHaveLength(0);
    expect(await db.select().from(eventAttendees)).toHaveLength(1);
  });

  it("removing an attendee drops them from stats", async () => {
    const e = await makeEvent("2026-01-08");
    const a = await makeAttendee(e.id, { displayName: "Gone" }, "confirmed");
    await removeAttendee(e.id, a.id);
    expect((await getStats()).people.find((p) => p.name === "Gone")).toBeUndefined();
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { eventAttendees, events, plusOnes, regulars } from "@/db/schema";
import {
  addAdHocAttendee,
  addRegularToEvent,
  archiveEvent,
  createEvent,
  deleteEvent,
  deleteRegular,
  getArchivedRuns,
  unarchiveEvent,
} from "@/app/(app)/actions";
import { makeAttendee, makeEvent, makePlusOne, makeRegular, resetDb, seedOrganizer } from "./helpers";

beforeEach(async () => {
  await resetDb();
  await seedOrganizer();
});

describe("auth", () => {
  it("rejects actions when signed out", async () => {
    const { auth } = await import("@/auth");
    (auth as unknown as { mockResolvedValueOnce: (v: unknown) => void }).mockResolvedValueOnce(null);
    await expect(deleteEvent("x")).rejects.toThrow("Not signed in");
  });
});

describe("event lifecycle", () => {
  it("createEvent inserts an open event and redirects to it", async () => {
    const fd = new FormData();
    fd.set("date", "2026-11-05");
    await expect(createEvent(fd)).rejects.toThrow(/NEXT_REDIRECT:\/events\//);
    const [e] = await db.select().from(events);
    expect(e).toMatchObject({ date: "2026-11-05", status: "open", capacity: 15 });
  });

  it("archive hides the run and unarchive restores it", async () => {
    const e = await makeEvent("2026-11-05");
    await expect(archiveEvent(e.id)).rejects.toThrow("NEXT_REDIRECT");
    let row = await db.query.events.findFirst({ where: eq(events.id, e.id) });
    expect(row?.status).toBe("closed");
    expect(row?.archivedAt).toBeInstanceOf(Date);

    await unarchiveEvent(e.id);
    row = await db.query.events.findFirst({ where: eq(events.id, e.id) });
    expect(row?.status).toBe("open");
    expect(row?.archivedAt).toBeNull();
  });

  it("deleteEvent cascades to attendees and +1s", async () => {
    const e = await makeEvent("2026-11-05");
    const a = await makeAttendee(e.id, { displayName: "A" }, "confirmed");
    await makePlusOne(a.id);
    await expect(deleteEvent(e.id)).rejects.toThrow("NEXT_REDIRECT");
    expect(await db.select().from(eventAttendees)).toHaveLength(0);
    expect(await db.select().from(plusOnes)).toHaveLength(0);
  });
});

describe("attendees", () => {
  it("adding the same regular twice is a no-op", async () => {
    const e = await makeEvent("2026-11-05");
    const r = await makeRegular("Reg");
    await addRegularToEvent(e.id, r.id);
    await addRegularToEvent(e.id, r.id);
    expect(await db.select().from(eventAttendees)).toHaveLength(1);
  });

  it("ad-hoc attendees are trimmed and blanks ignored", async () => {
    const e = await makeEvent("2026-11-05");
    const fd = new FormData();
    fd.set("displayName", "  Mike  ");
    await addAdHocAttendee(e.id, fd);
    const blank = new FormData();
    blank.set("displayName", "   ");
    await addAdHocAttendee(e.id, blank);
    const rows = await db.select().from(eventAttendees);
    expect(rows.map((r) => r.displayName)).toEqual(["Mike"]);
  });

  it("deleteRegular snapshots their name onto past attendance", async () => {
    const e = await makeEvent("2026-11-05");
    const r = await makeRegular("Gone Guy");
    await makeAttendee(e.id, { regularId: r.id }, "confirmed");
    await deleteRegular(r.id);
    expect(await db.select().from(regulars)).toHaveLength(0);
    const [a] = await db.select().from(eventAttendees);
    expect(a.regularId).toBeNull();
    expect(a.displayName).toBe("Gone Guy");
  });
});

describe("getArchivedRuns", () => {
  it("lists only archived runs with headcount/unpaid, paged newest first", async () => {
    await makeEvent("2026-01-01"); // open: excluded
    for (let i = 1; i <= 12; i++) {
      await makeEvent(`2026-02-${String(i).padStart(2, "0")}`, { status: "closed" });
    }
    const page1 = await getArchivedRuns(null);
    expect(page1.runs).toHaveLength(10);
    expect(page1.runs[0].date).toBe("2026-02-12");
    expect(page1.nextCursor).not.toBeNull();

    const page2 = await getArchivedRuns(page1.nextCursor);
    expect(page2.runs.map((r) => r.date)).toEqual(["2026-02-02", "2026-02-01"]);
    expect(page2.nextCursor).toBeNull();
  });

  it("counts confirmed people and +1s, and who still owes", async () => {
    const e = await makeEvent("2026-02-01", { status: "closed" });
    const a = await makeAttendee(e.id, { displayName: "A" }, "confirmed");
    await db.update(eventAttendees).set({ paid: true }).where(eq(eventAttendees.id, a.id));
    await makePlusOne(a.id, "confirmed"); // unpaid
    await makeAttendee(e.id, { displayName: "Decl" }, "declined");
    const [run] = (await getArchivedRuns(null)).runs;
    expect(run).toMatchObject({ headcount: 2, unpaid: 1 });
  });
});

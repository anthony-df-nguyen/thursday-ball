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
  updateEvent,
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

  it("createEvent stores time and location, and ignores a malformed time", async () => {
    const fd = new FormData();
    fd.set("date", "2026-11-05");
    fd.set("startTime", "19:30");
    fd.set("locationName", "  Main Gym ");
    fd.set("locationAddress", " 1 Gym Way, Town ");
    await expect(createEvent(fd)).rejects.toThrow("NEXT_REDIRECT");
    const bad = new FormData();
    bad.set("date", "2026-11-12");
    bad.set("startTime", "nonsense");
    await expect(createEvent(bad)).rejects.toThrow("NEXT_REDIRECT");
    const rows = await db.select().from(events).orderBy(events.date);
    expect(rows[0]).toMatchObject({
      startTime: "19:30",
      locationName: "Main Gym",
      locationAddress: "1 Gym Way, Town",
    });
    expect(rows[1]).toMatchObject({ startTime: null, locationName: null, locationAddress: null });
  });

  it("createEvent saves the capacity from the form, and falls back to the default when invalid", async () => {
    const ok = new FormData();
    ok.set("date", "2026-11-05");
    ok.set("capacity", "12");
    await expect(createEvent(ok)).rejects.toThrow("NEXT_REDIRECT");
    const bad = new FormData();
    bad.set("date", "2026-11-12");
    bad.set("capacity", "0");
    await expect(createEvent(bad)).rejects.toThrow("NEXT_REDIRECT");
    const rows = await db.select().from(events).orderBy(events.date);
    expect(rows.map((r) => r.capacity)).toEqual([12, 15]);
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

describe("updateEvent", () => {
  const form = (capacity: string, name = "", address = "") => {
    const fd = new FormData();
    fd.set("capacity", capacity);
    fd.set("locationName", name);
    fd.set("locationAddress", address);
    return fd;
  };

  it("updates capacity and location, trimming text", async () => {
    const e = await makeEvent("2026-11-05");
    await expect(updateEvent(e.id, form("20", "  New Gym ", " 2 Gym Way "))).resolves.toEqual({ ok: true });
    const [row] = await db.select().from(events).where(eq(events.id, e.id));
    expect(row).toMatchObject({ capacity: 20, locationName: "New Gym", locationAddress: "2 Gym Way" });
  });

  it("clears location when the fields are blank", async () => {
    const e = await makeEvent("2026-11-05");
    await db.update(events).set({ locationName: "Old", locationAddress: "Old St" }).where(eq(events.id, e.id));
    await updateEvent(e.id, form("15"));
    const [row] = await db.select().from(events).where(eq(events.id, e.id));
    expect(row).toMatchObject({ locationName: null, locationAddress: null });
  });

  it("rejects a capacity that isn't a whole number from 1 to 99", async () => {
    const e = await makeEvent("2026-11-05");
    for (const bad of ["", "0", "-3", "2.5", "abc", "100"]) {
      await expect(updateEvent(e.id, form(bad))).resolves.toEqual({ ok: false, error: "invalid" });
    }
    const [row] = await db.select().from(events).where(eq(events.id, e.id));
    expect(row.capacity).toBe(15);
  });

  it("refuses capacity below the headcount (attendees and +1s) and changes nothing", async () => {
    const e = await makeEvent("2026-11-05");
    const a = await makeAttendee(e.id, { displayName: "A" }, "confirmed");
    await makeAttendee(e.id, { displayName: "B" }, "confirmed");
    await makePlusOne(a.id, "confirmed");
    await expect(updateEvent(e.id, form("2", "Elsewhere"))).resolves.toEqual({
      ok: false,
      error: "capacity_below_headcount",
    });
    const [row] = await db.select().from(events).where(eq(events.id, e.id));
    expect(row).toMatchObject({ capacity: 15, locationName: null });
    await expect(updateEvent(e.id, form("3"))).resolves.toEqual({ ok: true });
  });

  it("doesn't count invited, declined or no-show people toward the floor", async () => {
    const e = await makeEvent("2026-11-05");
    await makeAttendee(e.id, { displayName: "A" }, "confirmed");
    await makeAttendee(e.id, { displayName: "B" }, "invited");
    await makeAttendee(e.id, { displayName: "C" }, "declined");
    await makeAttendee(e.id, { displayName: "D" }, "no_show");
    await expect(updateEvent(e.id, form("1"))).resolves.toEqual({ ok: true });
  });

  it("still lets the location change when capacity is unchanged and already below headcount", async () => {
    const e = await makeEvent("2026-11-05", { capacity: 1 });
    await makeAttendee(e.id, { displayName: "A" }, "confirmed");
    await makeAttendee(e.id, { displayName: "B" }, "confirmed");
    await expect(updateEvent(e.id, form("1", "Fixed Gym"))).resolves.toEqual({ ok: true });
    const [row] = await db.select().from(events).where(eq(events.id, e.id));
    expect(row.locationName).toBe("Fixed Gym");
  });

  it("is a no-op when nothing changed", async () => {
    const e = await makeEvent("2026-11-05");
    await expect(updateEvent(e.id, form("15"))).resolves.toEqual({ ok: true });
  });

  it("reports a missing run", async () => {
    await expect(
      updateEvent("00000000-0000-0000-0000-000000000000", form("10")),
    ).resolves.toEqual({ ok: false, error: "not_found" });
  });

  it("works on archived runs and keeps them archived", async () => {
    const e = await makeEvent("2026-11-05", { status: "closed" });
    await updateEvent(e.id, form("12"));
    const [row] = await db.select().from(events).where(eq(events.id, e.id));
    expect(row).toMatchObject({ capacity: 12, status: "closed" });
  });

  it("leaves the date and time alone", async () => {
    const e = await makeEvent("2026-11-05");
    await db.update(events).set({ startTime: "20:00" }).where(eq(events.id, e.id));
    await updateEvent(e.id, form("9"));
    const [row] = await db.select().from(events).where(eq(events.id, e.id));
    expect(row).toMatchObject({ date: "2026-11-05", startTime: "20:00" });
  });

  it("rejects when signed out", async () => {
    const e = await makeEvent("2026-11-05");
    const { auth } = await import("@/auth");
    (auth as unknown as { mockResolvedValueOnce: (v: unknown) => void }).mockResolvedValueOnce(null);
    await expect(updateEvent(e.id, form("9"))).rejects.toThrow("Not signed in");
  });
});

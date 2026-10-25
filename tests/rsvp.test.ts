import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { eventAttendees } from "@/db/schema";
import { submitRsvp } from "@/app/rsvp/actions";
import { todayISO } from "@/lib/dates";
import { makeAttendee, makeEvent, resetDb, seedOrganizer } from "./helpers";

const FUTURE = "2999-01-01";

async function statusOf(id: string) {
  const row = await db.query.eventAttendees.findFirst({ where: eq(eventAttendees.id, id) });
  return row?.inviteStatus;
}

beforeEach(async () => {
  await resetDb();
  await seedOrganizer();
});

describe("submitRsvp (public yes/no link)", () => {
  it("yes confirms and no declines", async () => {
    const e = await makeEvent(FUTURE);
    const a = await makeAttendee(e.id, { displayName: "A" });
    const att = await db.query.eventAttendees.findFirst({ where: eq(eventAttendees.id, a.id) });

    expect(await submitRsvp(att!.rsvpToken, "yes")).toBe("yes");
    expect(await statusOf(a.id)).toBe("confirmed");
    expect(await submitRsvp(att!.rsvpToken, "no")).toBe("no");
    expect(await statusOf(a.id)).toBe("declined");
  });

  it("rejects an unknown token", async () => {
    expect(await submitRsvp("00000000-0000-0000-0000-000000000000", "yes")).toBe("not_found");
  });

  it("blocks yes when the run is full but still lets them decline", async () => {
    const e = await makeEvent(FUTURE, { capacity: 1 });
    await makeAttendee(e.id, { displayName: "A" }, "confirmed");
    const b = await makeAttendee(e.id, { displayName: "B" });
    const token = (await db.query.eventAttendees.findFirst({ where: eq(eventAttendees.id, b.id) }))!.rsvpToken;

    expect(await submitRsvp(token, "yes")).toBe("full");
    expect(await statusOf(b.id)).toBe("invited");
    expect(await submitRsvp(token, "no")).toBe("no");
  });

  it("lets an already-confirmed attendee re-confirm when full", async () => {
    const e = await makeEvent(FUTURE, { capacity: 1 });
    const a = await makeAttendee(e.id, { displayName: "A" }, "confirmed");
    const token = (await db.query.eventAttendees.findFirst({ where: eq(eventAttendees.id, a.id) }))!.rsvpToken;
    expect(await submitRsvp(token, "yes")).toBe("yes");
  });

  it("still accepts changes on the day of the run", async () => {
    const e = await makeEvent(todayISO());
    const a = await makeAttendee(e.id, { displayName: "A" }, "confirmed");
    const token = (await db.query.eventAttendees.findFirst({ where: eq(eventAttendees.id, a.id) }))!.rsvpToken;
    expect(await submitRsvp(token, "no")).toBe("no");
    expect(await statusOf(a.id)).toBe("declined");
  });

  it("leaves no-shows, archived runs, and past runs alone", async () => {
    const open = await makeEvent(FUTURE);
    const ns = await makeAttendee(open.id, { displayName: "NS" }, "no_show");
    const archived = await makeEvent(FUTURE, { status: "closed" });
    const ar = await makeAttendee(archived.id, { displayName: "AR" });
    const past = await makeEvent("2020-01-01");
    const pa = await makeAttendee(past.id, { displayName: "PA" });
    expect(todayISO() > "2020-01-01").toBe(true);

    for (const [a, before] of [[ns, "no_show"], [ar, "invited"], [pa, "invited"]] as const) {
      const token = (await db.query.eventAttendees.findFirst({ where: eq(eventAttendees.id, a.id) }))!.rsvpToken;
      expect(await submitRsvp(token, "yes")).toBe("closed");
      expect(await statusOf(a.id)).toBe(before);
    }
  });
});

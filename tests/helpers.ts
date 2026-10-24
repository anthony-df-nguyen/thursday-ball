import { sql } from "drizzle-orm";
import { db } from "@/db";
import { eventAttendees, events, plusOnes, regulars, users } from "@/db/schema";
import type { InviteStatus } from "@/db/schema";

export async function resetDb() {
  await db.execute(
    sql`truncate table plus_ones, event_attendees, events, regulars, users cascade`,
  );
}

// Creates the signed-in organizer and points the mocked auth() at them.
export async function seedOrganizer() {
  const [user] = await db
    .insert(users)
    .values({ email: "org@example.com", name: "Org" })
    .returning();
  process.env.TEST_USER_ID = user.id;
  return user;
}

export async function makeEvent(date: string, opts: { capacity?: number; status?: "open" | "closed" } = {}) {
  const [e] = await db
    .insert(events)
    .values({ date, createdBy: process.env.TEST_USER_ID!, ...opts })
    .returning();
  return e;
}

export async function makeRegular(name: string) {
  const [r] = await db.insert(regulars).values({ name }).returning();
  return r;
}

export async function makeAttendee(
  eventId: string,
  who: { regularId?: string; displayName?: string },
  inviteStatus: InviteStatus = "invited",
) {
  const [a] = await db
    .insert(eventAttendees)
    .values({ eventId, inviteStatus, ...who })
    .returning();
  return a;
}

export async function makePlusOne(attendeeId: string, inviteStatus: InviteStatus = "invited") {
  const [p] = await db
    .insert(plusOnes)
    .values({ eventAttendeeId: attendeeId, inviteStatus })
    .returning();
  return p;
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, lt, or } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { hasRoomSql } from "@/db/capacity";
import { getPersonRuns } from "@/db/stats";
import {
  events,
  eventAttendees,
  plusOnes,
  regulars,
  users,
  type InviteStatus,
} from "@/db/schema";

async function requireUserId() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Not signed in");
  return userId;
}

// An UPDATE matched nothing: either the row is gone or the capacity guard
// rejected it. Only runs on the failure path, so the extra read is free.
function throwNoUpdate(exists: boolean, confirming: boolean): never {
  if (!exists) throw new Error("Not found");
  if (confirming) throw new Error("Event is at capacity.");
  throw new Error("Update failed");
}

// --- Stats ---

export async function loadMorePersonRuns(key: string, offset: number) {
  await requireUserId();
  return getPersonRuns(key, offset);
}

// --- Settings ---

export async function setDefaultInviteMessage(formData: FormData) {
  const userId = await requireUserId();
  const message = String(formData.get("message") ?? "").trim() || null;

  await db.update(users).set({ defaultInviteMessage: message }).where(eq(users.id, userId));
  revalidatePath("/settings");
}

// --- Regulars (roster) ---

// Keeps names from overflowing and clipping adjacent buttons in the UI.
const MAX_NAME_LENGTH = 40;

export async function createRegular(formData: FormData) {
  await requireUserId();
  const name = String(formData.get("name") ?? "").trim().slice(0, MAX_NAME_LENGTH);
  if (!name) return;
  const nickname = String(formData.get("nickname") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;

  await db.insert(regulars).values({ name, nickname, phone });
  revalidatePath("/roster");
}

export async function updateRegular(regularId: string, formData: FormData) {
  await requireUserId();
  const name = String(formData.get("name") ?? "").trim().slice(0, MAX_NAME_LENGTH);
  if (!name) return;
  const nickname = String(formData.get("nickname") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;

  await db
    .update(regulars)
    .set({ name, nickname, phone })
    .where(eq(regulars.id, regularId));
  revalidatePath("/roster");
}

export async function deleteRegular(regularId: string) {
  await requireUserId();
  // regular_id is set null on delete; copy the name over first so their
  // past runs still show (and count in stats) under that name.
  const regular = await db.query.regulars.findFirst({
    where: eq(regulars.id, regularId),
  });
  if (regular) {
    await db
      .update(eventAttendees)
      .set({ displayName: regular.name })
      .where(eq(eventAttendees.regularId, regularId));
  }
  await db.delete(regulars).where(eq(regulars.id, regularId));
  revalidatePath("/roster");
  revalidatePath("/stats");
}

// --- Events ---

export async function createEvent(formData: FormData) {
  const userId = await requireUserId();
  const date = String(formData.get("date") ?? "");
  if (!date) return;

  const [created] = await db
    .insert(events)
    .values({ date, createdBy: userId })
    .returning();

  redirect(`/events/${created.id}`);
}

// Hard delete: cascades to attendees and +1s, so the run never counts toward
// stats. Use archiveEvent to keep it.
export async function deleteEvent(eventId: string) {
  await requireUserId();
  await db.delete(events).where(eq(events.id, eventId));
  revalidatePath("/");
  revalidatePath("/stats");
  redirect("/");
}

// Only hides the run from the main list; stats count past runs live whether
// or not they're archived.
export async function archiveEvent(eventId: string) {
  await requireUserId();
  await db
    .update(events)
    .set({ status: "closed", archivedAt: new Date() })
    .where(eq(events.id, eventId));
  revalidatePath("/");
  redirect("/");
}

const ARCHIVED_PAGE_SIZE = 10;

// One page of archived runs for the Runs page, newest first, as slim summary
// rows. Paged by (date, id) rather than offset so a run archived while the
// list is open can't shift or duplicate rows, and two runs on the same date
// stay in a stable order. Pass the previous page's nextCursor for the next.
export async function getArchivedRuns(
  cursor: { date: string; id: string } | null,
) {
  await requireUserId();
  const rows = await db.query.events.findMany({
    where: and(
      eq(events.status, "closed"),
      cursor
        ? or(
            lt(events.date, cursor.date),
            and(eq(events.date, cursor.date), lt(events.id, cursor.id)),
          )
        : undefined,
    ),
    orderBy: (events, { desc }) => [desc(events.date), desc(events.id)],
    limit: ARCHIVED_PAGE_SIZE + 1,
    with: { attendees: { with: { plusOnes: true } } },
  });

  const page = rows.slice(0, ARCHIVED_PAGE_SIZE).map((event) => {
    let headcount = 0;
    let paid = 0;
    for (const a of event.attendees) {
      if (a.inviteStatus === "confirmed") {
        headcount++;
        if (a.paid) paid++;
      }
      for (const p of a.plusOnes) {
        if (p.inviteStatus === "confirmed") {
          headcount++;
          if (p.paid) paid++;
        }
      }
    }
    return {
      id: event.id,
      date: event.date,
      headcount,
      unpaid: headcount - paid,
    };
  });
  const last = page.at(-1);
  return {
    runs: page,
    nextCursor:
      rows.length > ARCHIVED_PAGE_SIZE && last
        ? { date: last.date, id: last.id }
        : null,
  };
}

// Brings an archived run back onto the main list.
export async function unarchiveEvent(eventId: string) {
  await requireUserId();
  await db
    .update(events)
    .set({ status: "open", archivedAt: null })
    .where(eq(events.id, eventId));
  revalidatePath("/");
  revalidatePath(`/events/${eventId}`);
}

// --- Event attendees ---

export async function addRegularToEvent(eventId: string, regularId: string) {
  await requireUserId();
  await db
    .insert(eventAttendees)
    .values({ eventId, regularId, inviteStatus: "invited" })
    .onConflictDoNothing();
  revalidatePath(`/events/${eventId}`);
}

export async function addAdHocAttendee(eventId: string, formData: FormData) {
  await requireUserId();
  const displayName = String(formData.get("displayName") ?? "").trim().slice(0, MAX_NAME_LENGTH);
  if (!displayName) return;
  await db.insert(eventAttendees).values({
    eventId,
    displayName,
    inviteStatus: "invited",
  });
  revalidatePath(`/events/${eventId}`);
}

export async function removeAttendee(eventId: string, attendeeId: string) {
  await requireUserId();
  await db.delete(eventAttendees).where(eq(eventAttendees.id, attendeeId));
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/stats");
}

export async function setInviteStatus(
  eventId: string,
  attendeeId: string,
  status: InviteStatus,
) {
  await requireUserId();

  const confirming = status === "confirmed";
  // Confirming only goes through if there's still room, and only counts as
  // taking a spot if they weren't already confirmed.
  const updated = await db
    .update(eventAttendees)
    .set({ inviteStatus: status })
    .where(
      and(
        eq(eventAttendees.id, attendeeId),
        confirming
          ? or(eq(eventAttendees.inviteStatus, "confirmed"), hasRoomSql(eventId))
          : undefined,
      ),
    )
    .returning();
  if (updated.length === 0) {
    const row = await db.query.eventAttendees.findFirst({
      where: eq(eventAttendees.id, attendeeId),
      columns: { id: true },
    });
    throwNoUpdate(!!row, confirming);
  }
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/stats");
}

export async function setAttendeePaid(
  eventId: string,
  attendeeId: string,
  paid: boolean,
) {
  await requireUserId();
  await db
    .update(eventAttendees)
    .set({ paid })
    .where(eq(eventAttendees.id, attendeeId));
  revalidatePath(`/events/${eventId}`);
}

// --- Plus ones ---

export async function addPlusOne(
  eventId: string,
  attendeeId: string,
  formData: FormData,
) {
  await requireUserId();
  const name = String(formData.get("name") ?? "").trim().slice(0, MAX_NAME_LENGTH) || null;

  // New plus-ones always start as "invited" (not counted toward capacity
  // yet), regardless of the inviting attendee's own status — see PRD note
  // on tracking +1 response/attendance independently.
  await db.insert(plusOnes).values({ eventAttendeeId: attendeeId, name });
  revalidatePath(`/events/${eventId}`);
}

export async function setPlusOneInviteStatus(
  eventId: string,
  plusOneId: string,
  status: InviteStatus,
) {
  await requireUserId();

  const confirming = status === "confirmed";
  const updated = await db
    .update(plusOnes)
    .set({ inviteStatus: status })
    .where(
      and(
        eq(plusOnes.id, plusOneId),
        confirming
          ? or(eq(plusOnes.inviteStatus, "confirmed"), hasRoomSql(eventId))
          : undefined,
      ),
    )
    .returning();
  if (updated.length === 0) {
    const row = await db.query.plusOnes.findFirst({
      where: eq(plusOnes.id, plusOneId),
      columns: { id: true },
    });
    throwNoUpdate(!!row, confirming);
  }
  revalidatePath(`/events/${eventId}`);
}

export async function setPlusOneName(
  eventId: string,
  plusOneId: string,
  name: string,
) {
  await requireUserId();
  await db
    .update(plusOnes)
    .set({ name: name.trim().slice(0, MAX_NAME_LENGTH) || null })
    .where(eq(plusOnes.id, plusOneId));
  revalidatePath(`/events/${eventId}`);
}

export async function removePlusOne(eventId: string, plusOneId: string) {
  await requireUserId();
  await db.delete(plusOnes).where(eq(plusOnes.id, plusOneId));
  revalidatePath(`/events/${eventId}`);
}

export async function setPlusOnePaid(
  eventId: string,
  plusOneId: string,
  paid: boolean,
) {
  await requireUserId();
  await db.update(plusOnes).set({ paid }).where(eq(plusOnes.id, plusOneId));
  revalidatePath(`/events/${eventId}`);
}

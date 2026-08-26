"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { events, eventAttendees, plusOnes, regulars } from "@/db/schema";

async function requireUserId() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Not signed in");
  return userId;
}

// Headcount = confirmed attendees + confirmed plus-ones (PRD §4.6). A
// plus-one's own invite_status is tracked independently of the attendee
// who's bringing them, so it counts (or doesn't) on its own merits.
async function headcount(eventId: string) {
  const event = await db.query.events.findFirst({
    where: eq(events.id, eventId),
    with: { attendees: { with: { plusOnes: true } } },
  });
  if (!event) throw new Error("Event not found");
  const count = event.attendees.reduce((sum, a) => {
    const confirmedPlusOnes = a.plusOnes.filter(
      (p) => p.inviteStatus === "confirmed",
    ).length;
    return sum + (a.inviteStatus === "confirmed" ? 1 : 0) + confirmedPlusOnes;
  }, 0);
  return { count, capacity: event.capacity };
}

async function assertRoomFor(eventId: string, additional: number) {
  const { count, capacity } = await headcount(eventId);
  if (count + additional > capacity) {
    throw new Error(`Event is at capacity (${capacity}).`);
  }
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
  await db.delete(regulars).where(eq(regulars.id, regularId));
  revalidatePath("/roster");
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

export async function deleteEvent(eventId: string) {
  await requireUserId();
  await db.delete(events).where(eq(events.id, eventId));
  revalidatePath("/");
  redirect("/");
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
}

export async function setInviteStatus(
  eventId: string,
  attendeeId: string,
  status: "invited" | "confirmed" | "declined",
) {
  await requireUserId();

  if (status === "confirmed") {
    const attendee = await db.query.eventAttendees.findFirst({
      where: eq(eventAttendees.id, attendeeId),
    });
    if (!attendee) throw new Error("Attendee not found");
    if (attendee.inviteStatus !== "confirmed") {
      await assertRoomFor(eventId, 1);
    }
  }

  await db
    .update(eventAttendees)
    .set({ inviteStatus: status })
    .where(eq(eventAttendees.id, attendeeId));
  revalidatePath(`/events/${eventId}`);
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
  status: "invited" | "confirmed" | "declined",
) {
  await requireUserId();

  if (status === "confirmed") {
    const plusOne = await db.query.plusOnes.findFirst({
      where: eq(plusOnes.id, plusOneId),
    });
    if (!plusOne) throw new Error("Plus-one not found");
    if (plusOne.inviteStatus !== "confirmed") {
      await assertRoomFor(eventId, 1);
    }
  }

  await db
    .update(plusOnes)
    .set({ inviteStatus: status })
    .where(eq(plusOnes.id, plusOneId));
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

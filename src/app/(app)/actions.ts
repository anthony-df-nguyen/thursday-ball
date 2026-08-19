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

// --- Regulars (roster) ---

export async function createRegular(formData: FormData) {
  await requireUserId();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const nickname = String(formData.get("nickname") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;

  await db.insert(regulars).values({ name, nickname, phone });
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
  const displayName = String(formData.get("displayName") ?? "").trim();
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
  const name = String(formData.get("name") ?? "").trim() || null;
  await db.insert(plusOnes).values({ eventAttendeeId: attendeeId, name });
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

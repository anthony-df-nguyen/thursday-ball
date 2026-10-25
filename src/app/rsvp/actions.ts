"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { hasRoomSql } from "@/db/capacity";
import { eventAttendees } from "@/db/schema";
import { logPostHogServerAction } from "@/lib/posthogLogs";
import { personDistinctId } from "@/lib/analytics";
import { rsvpOpen } from "@/lib/rsvp";

function logRsvpBlocked(reason: "full" | "closed", attendeeId: string, eventId: string) {
  logPostHogServerAction("rsvp blocked", {
    operation: "rsvp_blocked",
    reason,
    event_id: eventId,
    attendee_id: attendeeId,
  });
}

export type RsvpResult = "yes" | "no" | "full" | "closed" | "not_found";

// A player answering their text invite. No login: the token in the link is
// the credential, and it only ever touches that one attendee's yes/no.
export async function submitRsvp(
  token: string,
  answer: "yes" | "no",
): Promise<RsvpResult> {
  const attendee = await db.query.eventAttendees.findFirst({
    where: eq(eventAttendees.rsvpToken, token),
    with: { event: true },
  });
  if (!attendee) return "not_found";
  const { event } = attendee;
  // Runs that are archived, on or past their date, or already marked NO SHOW
  // feed Stats, so they're the organizers' to fix.
  if (!rsvpOpen(event) || attendee.inviteStatus === "no_show") {
    logRsvpBlocked("closed", attendee.id, event.id);
    return "closed";
  }

  const confirming = answer === "yes";
  // Same one-statement capacity guard organizers hit when confirming.
  const updated = await db
    .update(eventAttendees)
    .set({ inviteStatus: confirming ? "confirmed" : "declined" })
    .where(
      and(
        eq(eventAttendees.id, attendee.id),
        confirming
          ? or(
              eq(eventAttendees.inviteStatus, "confirmed"),
              hasRoomSql(event.id),
            )
          : undefined,
      ),
    )
    .returning();
  if (updated.length === 0) {
    logRsvpBlocked("full", attendee.id, event.id);
    return "full";
  }

  revalidatePath(`/events/${event.id}`);
  revalidatePath("/stats");
  logPostHogServerAction("rsvp submitted", {
    operation: "submit_rsvp",
    answer,
    distinct_id: personDistinctId({
      regularId: attendee.regularId,
      attendeeId: attendee.id,
    }),
    event_id: event.id,
    attendee_id: attendee.id,
  });
  return answer;
}

export async function respond(token: string, answer: "yes" | "no") {
  const result = await submitRsvp(token, answer);
  redirect(`/rsvp/${token}?r=${result}`);
}

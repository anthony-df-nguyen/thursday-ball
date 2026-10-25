import { db } from "@/db";
import { todayISO } from "@/lib/dates";

// Players can answer (and change their answer) through the day of the run.
// Once the date has passed, or the run is archived, only organizers can
// change statuses, since Stats counts those runs.
export function rsvpOpen(event: { status: string; date: string }) {
  return event.status === "open" && event.date >= todayISO();
}

// The run behind an RSVP token, or undefined for an unknown/malformed token
// (a non-uuid would error in Postgres). Shared by the page, its link-preview
// metadata and its preview image.
export async function runForToken(token: string) {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return undefined;
  const attendee = await db.query.eventAttendees.findFirst({
    where: (a, { eq }) => eq(a.rsvpToken, token),
    with: { event: true },
  });
  return attendee?.event;
}

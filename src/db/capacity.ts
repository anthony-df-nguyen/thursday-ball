import { sql } from "drizzle-orm";
import { events, eventAttendees, plusOnes } from "@/db/schema";

// Headcount = confirmed attendees + confirmed plus-ones (PRD §4.6). A
// plus-one's own invite_status is tracked independently of the attendee
// who's bringing them, so it counts (or doesn't) on its own merits.
// This is the SQL form of that count, for use inside a conditional UPDATE so
// the capacity check and the write are one statement (one round trip, and no
// window between a separate read and write).
export const headcountSql = (eventId: string) => sql`(
  (select count(*) from ${eventAttendees}
    where ${eventAttendees.eventId} = ${eventId}
      and ${eventAttendees.inviteStatus} = 'confirmed')
  + (select count(*) from ${plusOnes}
    join ${eventAttendees} on ${plusOnes.eventAttendeeId} = ${eventAttendees.id}
    where ${eventAttendees.eventId} = ${eventId}
      and ${plusOnes.inviteStatus} = 'confirmed')
)`;

export const hasRoomSql = (eventId: string) => sql`${headcountSql(eventId)} < (
  select ${events.capacity} from ${events} where ${events.id} = ${eventId}
)`;

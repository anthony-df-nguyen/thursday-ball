import { and, desc, eq, inArray, isNull, lte } from "drizzle-orm";
import { db } from "@/db";
import { eventAttendees, events, regulars } from "@/db/schema";
import { todayISO } from "@/lib/dates";

export type MonthCount = { played: number; noShows: number };

export type RunEntry = {
  eventId: string;
  date: string;
  result: "played" | "no_show";
  paid: boolean;
};

export type PersonStats = {
  key: string;
  name: string;
  played: number;
  noShows: number;
  // Date (YYYY-MM-DD) of the most recent run they played, if any.
  lastPlayed: string | null;
  // Keyed by "YYYY-MM".
  byMonth: Record<string, MonthCount>;
  // Newest first, capped at RUNS_PAGE_SIZE; the rest load via getPersonRuns.
  runs: RunEntry[];
  // Total runs on record (played + no-shows), including the unsent ones.
  runCount: number;
};

export const RUNS_PAGE_SIZE = 20;

export type StatsData = {
  people: PersonStats[];
  // Past runs held per "YYYY-MM", including runs nobody was confirmed for.
  runsByMonth: Record<string, number>;
};

// Newest first; id breaks ties so paging by offset stays stable.
function compareRuns(a: RunEntry, b: RunEntry) {
  return b.date.localeCompare(a.date) || b.eventId.localeCompare(a.eventId);
}

// Stats count every run dated today or earlier, archived or not (archiving
// only hides a run). A `confirmed` attendee counts as played, `no_show` as a
// miss; everything else is ignored. People are keyed by regular id, falling
// back to the snapshotted name once the roster entry is gone (deleteRegular
// copies the name onto their rows before regular_id is nulled). Everyone on
// the roster is included, even with no history, so they can be picked.
export async function getStats(): Promise<StatsData> {
  const today = todayISO();
  // Flat rows with only the columns used, filtered to played/no-show in SQL,
  // so the payload grows with runs played rather than every invite ever sent.
  // Names come from the roster already loaded, not a per-row join.
  const [roster, pastEvents, rows] = await Promise.all([
    db.select({ id: regulars.id, name: regulars.name }).from(regulars),
    db
      .select({ date: events.date })
      .from(events)
      .where(lte(events.date, today)),
    db
      .select({
        eventId: events.id,
        date: events.date,
        regularId: eventAttendees.regularId,
        displayName: eventAttendees.displayName,
        inviteStatus: eventAttendees.inviteStatus,
        paid: eventAttendees.paid,
      })
      .from(eventAttendees)
      .innerJoin(events, eq(eventAttendees.eventId, events.id))
      .where(
        and(
          lte(events.date, today),
          inArray(eventAttendees.inviteStatus, ["confirmed", "no_show"]),
        ),
      ),
  ]);

  const people = new Map<string, PersonStats>();
  const blank = (key: string, name: string): PersonStats => ({
    key,
    name,
    played: 0,
    noShows: 0,
    lastPlayed: null,
    byMonth: {},
    runs: [],
    runCount: 0,
  });
  for (const r of roster) people.set(r.id, blank(r.id, r.name));

  const runsByMonth: Record<string, number> = {};
  for (const event of pastEvents) {
    const month = event.date.slice(0, 7);
    runsByMonth[month] = (runsByMonth[month] ?? 0) + 1;
  }

  for (const a of rows) {
    const month = a.date.slice(0, 7);
    const regularName = a.regularId ? people.get(a.regularId)?.name : undefined;
    const name = regularName ?? a.displayName ?? "Unnamed";
    const key = a.regularId ?? `name:${name}`;
    let p = people.get(key);
    if (!p) {
      p = blank(key, name);
      people.set(key, p);
    }
    p.runCount++;
    p.runs.push({
      eventId: a.eventId,
      date: a.date,
      result: a.inviteStatus === "confirmed" ? "played" : "no_show",
      paid: a.paid,
    });
    const m = (p.byMonth[month] ??= { played: 0, noShows: 0 });
    if (a.inviteStatus === "confirmed") {
      p.played++;
      m.played++;
      if (!p.lastPlayed || a.date > p.lastPlayed) p.lastPlayed = a.date;
    } else {
      p.noShows++;
      m.noShows++;
    }
  }

  // Only the newest page of each player's history goes to the browser.
  for (const p of people.values()) {
    p.runs.sort(compareRuns);
    p.runs.length = Math.min(p.runs.length, RUNS_PAGE_SIZE);
  }

  return {
    people: [...people.values()].sort((a, b) => a.name.localeCompare(b.name)),
    runsByMonth,
  };
}

// One more page of a player's history, newest first. `key` is a PersonStats
// key: a regular id, or "name:<name>" for someone no longer on the roster.
export async function getPersonRuns(
  key: string,
  offset: number,
): Promise<RunEntry[]> {
  const today = todayISO();
  const who = key.startsWith("name:")
    ? and(
        isNull(eventAttendees.regularId),
        eq(eventAttendees.displayName, key.slice(5)),
      )
    : eq(eventAttendees.regularId, key);
  const rows = await db
    .select({
      eventId: events.id,
      date: events.date,
      inviteStatus: eventAttendees.inviteStatus,
      paid: eventAttendees.paid,
    })
    .from(eventAttendees)
    .innerJoin(events, eq(eventAttendees.eventId, events.id))
    .where(
      and(
        who,
        lte(events.date, today),
        inArray(eventAttendees.inviteStatus, ["confirmed", "no_show"]),
      ),
    )
    .orderBy(desc(events.date), desc(events.id))
    .limit(RUNS_PAGE_SIZE)
    .offset(offset);
  return rows.map((r) => ({
    eventId: r.eventId,
    date: r.date,
    result: r.inviteStatus === "confirmed" ? "played" : "no_show",
    paid: r.paid,
  }));
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { eventAttendees, plusOnes } from "@/db/schema";
import { formatRunDateLong } from "@/lib/dates";
import { rsvpOpen, runForToken } from "@/lib/rsvp";
import { RsvpButtons } from "@/components/RsvpButtons";
import { respond, type RsvpResult } from "../actions";

// Only problems get a message; a successful yes/no is already shown by the
// "Current answer" card.
const MESSAGES: Partial<Record<RsvpResult, string>> = {
  full: "Sorry, this run is full right now. Check with the organizer.",
  closed: "This run is closed. Answers can't be changed on this page anymore.",
};

// Link preview (Open Graph) for texted RSVP links; the image comes from the
// sibling opengraph-image.tsx. Only the date is shown, never names.
export async function generateMetadata({
  params,
}: PageProps<"/rsvp/[token]">): Promise<Metadata> {
  const { token } = await params;
  const event = await runForToken(token);
  if (!event) return {};
  const long = formatRunDateLong(event.date);
  const title = `🏀 Ball on ${long.weekday}, ${long.date}`;
  const description = "Tap to let us know if you're in.";
  return {
    title,
    description,
    openGraph: { title, description, siteName: "Thursday Ball", type: "website" },
  };
}

export default async function RsvpPage({
  params,
}:PageProps<"/rsvp/[token]">) {
  const { token } = await params;

  // Not a uuid -> can't match a token (and would error in Postgres).
  if (!/^[0-9a-f-]{36}$/i.test(token)) notFound();
  const attendee = await db.query.eventAttendees.findFirst({
    where: (a, { eq }) => eq(a.rsvpToken, token),
    with: { event: true, regular: true },
  });
  if (!attendee) notFound();

  const { event } = attendee;
  // Asked attendees plus Asked +1s (a +1's status is tracked on its own).
  const [askedPeople, askedPlusOnes] = await Promise.all([
    db.$count(
      eventAttendees,
      and(
        eq(eventAttendees.eventId, event.id),
        eq(eventAttendees.inviteStatus, "invited"),
      ),
    ),
    db
      .select({ n: count() })
      .from(plusOnes)
      .innerJoin(eventAttendees, eq(plusOnes.eventAttendeeId, eventAttendees.id))
      .where(
        and(
          eq(eventAttendees.eventId, event.id),
          eq(plusOnes.inviteStatus, "invited"),
        ),
      )
      .then(([row]) => row.n),
  ]);
  const pending = askedPeople + askedPlusOnes;
  const roster = await db.query.eventAttendees.findMany({
    where: (a, { eq, and }) =>
      and(eq(a.eventId, event.id), eq(a.inviteStatus, "confirmed")),
    with: { regular: true, plusOnes: true },
    orderBy: (a, { asc }) => asc(a.createdAt),
  });
  // Confirmed people, each followed by their confirmed +1s.
  const playing = roster.flatMap((a) => {
    const who = a.regular?.name ?? a.displayName ?? "Someone";
    return [
      who,
      ...a.plusOnes
        .filter((p) => p.inviteStatus === "confirmed")
        .map((p) => p.name ?? `${who}'s +1`),
    ];
  });
  const name = attendee.regular?.name ?? attendee.displayName;
  const open = rsvpOpen(event) && attendee.inviteStatus !== "no_show";
  const answered =
    attendee.inviteStatus === "confirmed"
      ? "You're in"
      : attendee.inviteStatus === "declined"
        ? "You're out"
        : attendee.inviteStatus === "invited"
          ? "No response yet"
          : null;
  const long = formatRunDateLong(event.date);
  // Full for them: anyone who isn't already in (Asked, or said No earlier)
  // can't take a spot once the run is at capacity.
  const full =
    attendee.inviteStatus !== "confirmed" && playing.length >= event.capacity;
  // Both notices come from the run's current state, never the URL, so they
  // show whenever true.
  const shown: RsvpResult | undefined =
    full && open ? "full" : !open ? "closed" : undefined;
  const message = shown ? MESSAGES[shown] : undefined;

  return (
    <div className="px-4 pt-10 pb-6 md:px-8 md:max-w-md">
      <h2 className="text-xl font-medium">
        {name ? `Hey ${name}, ` : ""}
      </h2>
      <p className="text-[15px] text-neutral-400 mt-1">
        Can you ball on {long.weekday}, {long.date}
      </p>

      <p className="mt-4 text-[13px] text-neutral-400 leading-relaxed">
        This RSVP page is just for you. Want to bring a +1? Please text the organizer directly to coordinate.
      </p>

      {open && (
        <RsvpButtons
          confirmed={attendee.inviteStatus === "confirmed"}
          disabled={full}
          yesAction={respond.bind(null, token, "yes")}
          noAction={respond.bind(null, token, "no")}
        />
      )}

      {message && (
        <p
          role="alert"
          className="mt-4 rounded-lg border-2 border-red-500 bg-red-500/15 p-4 text-[15px] font-semibold text-red-400"
        >
          ⚠ {message}
        </p>
      )}

      {answered && (
        <div className="mt-4 rounded-lg bg-surface shadow-sm px-4 py-3 flex items-center justify-between text-[13px]">
          <span className="text-neutral-400">Current answer</span>
          <span className="font-semibold text-text">{answered}</span>
        </div>
      )}



      <div className="mt-4 rounded-lg bg-surface shadow-sm p-4">
        <div className="font-heading font-medium text-[15px]">
          Who&apos;s Confirmed ({playing.length} / {event.capacity})
        </div>
        {playing.length === 0 ? (
          <p className="text-[13px] text-neutral-400 mt-1">
            Nobody has confirmed yet.
          </p>
        ) : (
          <ul className="mt-1 text-[13px] text-neutral-400 leading-relaxed">
            {playing.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        )}
        <p className="text-[13px] text-neutral-400 mt-3 pt-3 border-t border-divider">
          Waiting to hear back from {pending}{" "}
          {pending === 1 ? "person" : "people"}
        </p>
      </div>
    </div>
  );
}

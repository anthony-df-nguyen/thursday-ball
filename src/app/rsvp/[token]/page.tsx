import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { eventAttendees, plusOnes } from "@/db/schema";
import {
  formatRunDateLong,
  formatRunDateShort,
  relativeDays,
} from "@/lib/dates";
import { formatRunTime, mapsUrl } from "@/lib/runDetails";
import { PAYEES, cashAppUrl, venmoUrl } from "@/lib/payment";
import { rsvpOpen, runForToken } from "@/lib/rsvp";
import { RsvpButtons } from "@/components/RsvpButtons";
import { respond, type RsvpResult } from "../actions";

// Only problems get a message; a successful yes/no is already shown by the
// "Current answer" card.
const MESSAGES: Partial<Record<RsvpResult, string>> = {
  full: "This run is currently full.",
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
  const title = `🏀 Ball on ${long.weekday}, ${long.date}${
    event.startTime ? ` at ${formatRunTime(event.startTime)}` : ""
  }`;
  const description = "Tap to let us know if you're in.";
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: "Thursday Ball",
      type: "website",
    },
  };
}

export default async function RsvpPage({ params }: PageProps<"/rsvp/[token]">) {
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
      .innerJoin(
        eventAttendees,
        eq(plusOnes.eventAttendeeId, eventAttendees.id),
      )
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
      ? { label: "You're in", icon: "✓", tone: "green" as const }
      : attendee.inviteStatus === "declined"
        ? { label: "You're out", icon: "✕", tone: "muted" as const }
        : attendee.inviteStatus === "invited"
          ? { label: "No response yet", icon: null, tone: "neutral" as const }
          : null;
  const until = relativeDays(event.date);
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
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 py-8 md:py-16">
      <div>
        <p className="text-[10px] tracking-[0.1em] uppercase text-accent font-semibold">
          RSVP to Basketball
        </p>
        <h2 className="text-3xl font-bold">{name ? `${name}` : "Hey"}</h2>
      </div>
      <hr className="border-divider" />
      <div className="flex flex-wrap items-center gap-4">
        <p className="text-lg font-bold">
          {formatRunDateShort(event.date)}
          {event.startTime && ` · ${formatRunTime(event.startTime)}`}
        </p>
        {until && (
          <span className="rounded-full border border-divider bg-surface px-3 py-1 text-[13px] font-semibold text-neutral-400">
            {until}
          </span>
        )}
      </div>
      {(event.locationAddress || event.locationName) && (
        <div className="flex items-start gap-4 rounded-xl border border-divider bg-surface px-5 py-4">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="mt-1 size-5 shrink-0 text-accent"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-[17px]">
              {event.locationName ?? event.locationAddress}
            </div>
            {event.locationAddress && event.locationName && (
              <div className="text-[15px] text-neutral-400">
                {event.locationAddress}
              </div>
            )}
          </div>
          {event.locationAddress && (
            <a
              href={mapsUrl(event.locationAddress)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-accent hover:underline focus-visible:underline"
            >
              Map
            </a>
          )}
        </div>
      )}

      {message && (
        <p
          role="alert"
          className="rounded-xl border border-red-500 bg-red-500/15 px-5 py-4 text-[15px] font-semibold text-red-400"
        >
          ⚠ {message}
        </p>
      )}

            <div className="rounded-xl border border-divider bg-surface px-5 py-4">
        <div className="flex items-center justify-between text-[15px]">
          <span className="text-neutral-400">
            {playing.length} of {event.capacity} spots
          </span>
          {playing.length >= event.capacity ? (
            <span className="font-semibold text-text">Full</span>
          ) : (
            <span className="font-semibold text-neutral-400">
              {event.capacity - playing.length} left
            </span>
          )}
        </div>
        <div
          role="progressbar"
          aria-label="Spots filled"
          aria-valuemin={0}
          aria-valuemax={event.capacity}
          aria-valuenow={Math.min(playing.length, event.capacity)}
          className="mt-3 h-3 overflow-hidden rounded-full bg-neutral-500/30"
        >
          <div
            className="h-full rounded-full bg-accent"
            style={{
              width: `${Math.min(100, (playing.length / event.capacity) * 100)}%`,
            }}
          />
        </div>
      </div>

      {answered && (
        <div
          className={`rounded-xl px-5 py-4 flex items-center justify-between text-[15px] ${
            answered.tone === "green"
              ? "border border-green-500 bg-surface"
              : answered.tone === "muted"
                ? "border border-neutral-500 bg-surface"
                : "border border-divider bg-surface"
          }`}
        >
          <span className="text-neutral-400">Your RSVP Status</span>
          <span
            className={`font-semibold ${
              answered.tone === "green" ? "text-green-400" : "text-text"
            }`}
          >
            {answered.icon && <span aria-hidden="true">{answered.icon} </span>}
            {answered.label}
          </span>
        </div>
      )}



      {open && (
        <RsvpButtons
          status={attendee.inviteStatus}
          yesDisabled={full}
          yesAction={respond.bind(null, token, "yes")}
          noAction={respond.bind(null, token, "no")}
        />
      )}


      {/* Hide this for now */}
      {/* <div className="mt-4 rounded-lg bg-surface shadow-sm p-4">
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
      </div> */}

      <p className="text-sm text-neutral-400 leading-relaxed">
        This RSVP page is just for you. Want to bring a +1? Please text the
        organizer directly to coordinate.
      </p>

      <hr className="border-divider" />
      <div className="rounded-xl border border-divider bg-surface px-5 py-4">
        <div className="font-heading font-medium text-lg">Payment Info</div>
        <p className="text-xs">After ball, pay Umer or the person that invited you.</p>
        <ul className="mt-4 flex flex-col gap-4">
          {PAYEES.map((p) => (
            <li key={p.name}>
              <div className="font-semibold text-[15px]">{p.name}</div>
              <dl className="mt-1 flex flex-col gap-1 text-[15px]">
                {p.venmo && (
                  <div className="flex gap-2">
                    <dt className="w-20 text-[13px] leading-[22px] text-neutral-400">
                      Venmo
                    </dt>
                    <dd>
                      <a
                        href={venmoUrl(p.venmo)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-accent underline"
                      >
                        @{p.venmo}
                      </a>
                    </dd>
                  </div>
                )}
                {p.zelle && (
                  <div className="flex gap-2">
                    <dt className="w-20 text-[13px] leading-[22px] text-neutral-400">
                      Zelle
                    </dt>
                    <dd>{p.zelle}</dd>
                  </div>
                )}
                {p.cashApp && (
                  <div className="flex gap-2">
                    <dt className="w-20 text-[13px] leading-[22px] text-neutral-400">
                      Cash App
                    </dt>
                    <dd>
                      <a
                        href={cashAppUrl(p.cashApp)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-accent underline"
                      >
                        {p.cashApp}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

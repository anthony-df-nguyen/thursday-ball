import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { db } from "@/db";
import { AttendeeList } from "@/components/AttendeeList";
import { AddPlayersPanel, AddPlayersSheet } from "@/components/AddPlayersSheet";
import { EventMenu } from "@/components/EventMenu";
import { HeadcountBar } from "@/components/HeadcountBar";
import { formatRunDateLong, todayISO } from "@/lib/dates";
import {
  addAdHocAttendee,
  addPlusOne,
  addRegularToEvent,
  archiveEvent,
  deleteEvent,
  removeAttendee,
  removePlusOne,
  setAttendeePaid,
  setInviteStatus,
  setPlusOneInviteStatus,
  setPlusOneName,
  setPlusOnePaid,
  unarchiveEvent,
  updateEvent,
} from "../../actions";

export default async function EventDetailPage({
  params,
}: PageProps<"/events/[eventId]">) {
  const { eventId } = await params;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const appUrl =
    process.env.APP_URL ??
    (host ? `${h.get("x-forwarded-proto") ?? "https"}://${host}` : undefined);

  // Independent reads, fetched in parallel rather than one round trip after
  // another.
  const session = await auth();
  const userId = session?.user?.id;
  const [currentUser, event, allRegulars] = await Promise.all([
    userId
      ? db.query.users.findFirst({
          where: (users, { eq }) => eq(users.id, userId),
        })
      : undefined,
    db.query.events.findFirst({
      where: (events, { eq }) => eq(events.id, eventId),
      with: {
        attendees: {
          // Confirmed-first is the helpful order to land on when the page is
          // freshly loaded. The alphabetical-within-status tiebreak needs the
          // joined regular's name, which isn't reliably referenceable from
          // this relational orderBy, so it's applied in JS below instead.
          // Keeping the list from re-sorting live as status changes happen is
          // handled client-side in AttendeeList.
          orderBy: (attendees, { sql }) => [
            sql`case ${attendees.inviteStatus} when 'confirmed' then 0 when 'invited' then 1 else 2 end`,
          ],
          with: {
            plusOnes: { orderBy: (plusOnes, { asc }) => asc(plusOnes.createdAt) },
            regular: true,
          },
        },
      },
    }),
    db.query.regulars.findMany({
      orderBy: (regulars, { asc }) => [asc(regulars.name)],
    }),
  ]);

  if (!event) notFound();

  const statusRank = { confirmed: 0, invited: 1, declined: 2, no_show: 2 } as const;
  const archived = event.status === "closed";
  // Once the run's date arrives (or it's archived), IN can flip to NO SHOW.
  const runHappened = archived || event.date <= todayISO();
  event.attendees.sort((a, b) => {
    const rankDiff = statusRank[a.inviteStatus] - statusRank[b.inviteStatus];
    if (rankDiff !== 0) return rankDiff;
    const nameA = a.regular?.name ?? a.displayName ?? "";
    const nameB = b.regular?.name ?? b.displayName ?? "";
    return nameA.localeCompare(nameB);
  });

  const attendeeRegularIds = new Set(
    event.attendees.map((a) => a.regularId).filter(Boolean),
  );
  const availableRegulars = allRegulars.filter(
    (r) => !attendeeRegularIds.has(r.id),
  );

  const headcount = event.attendees.reduce((sum, a) => {
    const confirmedPlusOnes = a.plusOnes.filter(
      (p) => p.inviteStatus === "confirmed",
    ).length;
    return sum + (a.inviteStatus === "confirmed" ? 1 : 0) + confirmedPlusOnes;
  }, 0);
  const atCapacity = headcount >= event.capacity;

  const totalPeople = event.attendees.reduce((sum, a) => {
    const confirmedPlusOnes = a.plusOnes.filter(
      (p) => p.inviteStatus === "confirmed",
    ).length;
    return sum + (a.inviteStatus === "confirmed" ? 1 : 0) + confirmedPlusOnes;
  }, 0);
  const paidCount = event.attendees.reduce((sum, a) => {
    const paidConfirmedPlusOnes = a.plusOnes.filter(
      (p) => p.inviteStatus === "confirmed" && p.paid,
    ).length;
    return (
      sum +
      (a.inviteStatus === "confirmed" && a.paid ? 1 : 0) +
      paidConfirmedPlusOnes
    );
  }, 0);
  const allPaid = totalPeople > 0 && paidCount === totalPeople;

  const addPlayersProps = {
    eventId: event.id,
    availableRegulars: availableRegulars.map((r) => ({
      id: r.id,
      name: r.name,
      isOrganizer: r.isOrganizer,
    })),
    addRegularToEvent,
    addAdHocAttendee,
  };

  return (
    <div className="flex-1 px-4 pt-5 pb-6 md:px-8 md:pt-8">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] tracking-[0.1em] uppercase text-accent font-semibold">
            {archived ? "Archived run" : "Open run"}
          </div>
          <h2 className="text-xl mt-0.5 mb-4 font-medium">
            {formatRunDateLong(event.date).date}{" "}
          </h2>
        </div>
        <EventMenu
          eventId={event.id}
          archived={archived}
          allPaid={allPaid}
          unpaidCount={totalPeople - paidCount}
          run={{
            capacity: event.capacity,
            locationName: event.locationName,
            locationAddress: event.locationAddress,
          }}
          headcount={headcount}
          updateEvent={updateEvent}
          deleteEvent={deleteEvent}
          archiveEvent={archiveEvent}
          unarchiveEvent={unarchiveEvent}
        />
      </div>

      <div className="flex justify-between items-baseline my-2">
        <span className="font-heading  text-base">
          {headcount} / {event.capacity} in
        </span>
        <span className="text-[13px] text-neutral-400">
          {totalPeople ? `${paidCount} of ${totalPeople} paid` : "no one confirmed yet"}
        </span>
      </div>
      <HeadcountBar headcount={headcount} capacity={event.capacity} />
      {atCapacity && (
        <p className="text-xs text-accent-300 mt-1.5 mb-0">
          At capacity — New confirms are blocked.
        </p>
      )}

      {!runHappened && (
        <p className="text-xs text-neutral-500 mt-1.5 mb-0">
          No Show becomes available on run day.
        </p>
      )}

      <AddPlayersSheet {...addPlayersProps} />

      <div className="md:grid md:grid-cols-[minmax(0,1fr)_320px] md:gap-8 md:items-start">
        <div>
          <div className="flex justify-between text-[10px] tracking-[0.08em] uppercase text-neutral-500 pb-1.5 border-b border-divider mt-5">
            <span>
              Player · tap status to {runHappened ? "change" : "cycle"}
            </span>
            <span>Paid</span>
          </div>

          <AttendeeList
            eventId={event.id}
            attendees={event.attendees}
            atCapacity={atCapacity}
            runHappened={runHappened}
            inviteMessage={currentUser?.defaultInviteMessage}
            appUrl={appUrl}
            setInviteStatus={setInviteStatus}
            setPlusOneInviteStatus={setPlusOneInviteStatus}
            addPlusOne={addPlusOne}
            removeAttendee={removeAttendee}
            removePlusOne={removePlusOne}
            setAttendeePaid={setAttendeePaid}
            setPlusOnePaid={setPlusOnePaid}
            setPlusOneName={setPlusOneName}
          />
        </div>

        <div className="hidden md:flex md:flex-col md:sticky md:top-[70px] md:max-h-[calc(100dvh-90px)] mt-5 bg-surface rounded-lg shadow-sm p-4">
          <AddPlayersPanel {...addPlayersProps} />
        </div>
      </div>
    </div>
  );
}

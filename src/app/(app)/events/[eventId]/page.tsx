import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { AttendeeList } from "@/components/AttendeeList";
import { AddPlayersSheet } from "@/components/AddPlayersSheet";
import { EventMenu } from "@/components/EventMenu";
import { HeadcountBar } from "@/components/HeadcountBar";
import { formatRunDateLong } from "@/lib/dates";
import {
  addAdHocAttendee,
  addPlusOne,
  addRegularToEvent,
  deleteEvent,
  removeAttendee,
  removePlusOne,
  setAttendeePaid,
  setInviteStatus,
  setPlusOneInviteStatus,
  setPlusOneName,
  setPlusOnePaid,
} from "../../actions";

export default async function EventDetailPage({
  params,
}: PageProps<"/events/[eventId]">) {
  const { eventId } = await params;

  const session = await auth();
  const currentUser = session?.user?.id
    ? await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.id, session.user!.id!),
      })
    : undefined;

  const event = await db.query.events.findFirst({
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
  });

  if (!event) notFound();

  const statusRank = { confirmed: 0, invited: 1, declined: 2 } as const;
  event.attendees.sort((a, b) => {
    const rankDiff = statusRank[a.inviteStatus] - statusRank[b.inviteStatus];
    if (rankDiff !== 0) return rankDiff;
    const nameA = a.regular?.name ?? a.displayName ?? "";
    const nameB = b.regular?.name ?? b.displayName ?? "";
    return nameA.localeCompare(nameB);
  });

  const allRegulars = await db.query.regulars.findMany({
    orderBy: (regulars, { asc }) => [asc(regulars.name)],
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

  return (
    <div className="flex-1 px-4 pt-5 pb-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] tracking-[0.1em] uppercase text-accent font-semibold">Open run</div>
          <h2 className="text-xl mt-0.5 mb-4 font-medium">
            {formatRunDateLong(event.date).date}{" "}
          </h2>
        </div>
        <EventMenu
          eventId={event.id}
          allPaid={allPaid}
          unpaidCount={totalPeople - paidCount}
          deleteEvent={deleteEvent}
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

      <AddPlayersSheet
        eventId={event.id}
        availableRegulars={availableRegulars.map((r) => ({
          id: r.id,
          name: r.name,
          isOrganizer: r.isOrganizer,
        }))}
        addRegularToEvent={addRegularToEvent}
        addAdHocAttendee={addAdHocAttendee}
      />

      <div className="flex justify-between text-[10px] tracking-[0.08em] uppercase text-neutral-500 pb-1.5 border-b border-divider mt-5">
        <span>Player · tap status to cycle</span>
        <span>Paid</span>
      </div>

      <AttendeeList
        eventId={event.id}
        attendees={event.attendees}
        atCapacity={atCapacity}
        inviteMessage={currentUser?.defaultInviteMessage}
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
  );
}

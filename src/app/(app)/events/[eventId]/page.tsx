import { notFound } from "next/navigation";
import { db } from "@/db";
import { StatusChip } from "@/components/StatusChip";
import { PaidCheckbox } from "@/components/PaidCheckbox";
import { RemoveButton } from "@/components/RemoveButton";
import { AddPlusOneButton } from "@/components/AddPlusOneButton";
import { PlusOneNameInput } from "@/components/PlusOneNameInput";
import { AddPlayersSheet } from "@/components/AddPlayersSheet";
import { EventMenu } from "@/components/EventMenu";
import { formatRunDateLong } from "@/lib/dates";
import type { InviteStatus } from "@/db/schema";
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

const STATUS_ORDER: Record<InviteStatus, number> = { confirmed: 0, invited: 1, declined: 2 };

export default async function EventDetailPage({
  params,
}: PageProps<"/events/[eventId]">) {
  const { eventId } = await params;

  const event = await db.query.events.findFirst({
    where: (events, { eq }) => eq(events.id, eventId),
    with: {
      attendees: {
        with: { plusOnes: true, regular: true },
      },
    },
  });

  if (!event) notFound();

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

  const rows = [...event.attendees].sort(
    (a, b) => STATUS_ORDER[a.inviteStatus] - STATUS_ORDER[b.inviteStatus],
  );

  return (
    <div className="flex-1 px-4 pt-5 pb-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] tracking-[0.1em] uppercase text-accent font-semibold">Open run</div>
          <h2 className="text-xl mt-0.5 mb-4 font-medium">{formatRunDateLong(event.date)}</h2>
        </div>
        <EventMenu
          eventId={event.id}
          allPaid={allPaid}
          unpaidCount={totalPeople - paidCount}
          deleteEvent={deleteEvent}
        />
      </div>

      <div className="flex justify-between items-baseline my-4">
        <span className="font-heading  text-base">
          {headcount} / {event.capacity} in
        </span>
        <span className="text-[13px] text-neutral-400">
          {totalPeople ? `${paidCount} of ${totalPeople} paid` : "no one confirmed yet"}
        </span>
      </div>
      <div className="flex gap-0.5 rounded-sm overflow-hidden">
        {Array.from({ length: event.capacity }, (_, i) => (
          <span key={i} className={`flex-1 h-2 ${i < headcount ? "bg-accent" : "bg-neutral-800"}`} />
        ))}
      </div>
      {atCapacity && (
        <p className="text-xs text-accent-300 mt-1.5 mb-0">
          At capacity — confirms and +1s are blocked.
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

      {rows.map((attendee) => {
        const confirmed = attendee.inviteStatus === "confirmed";
        const name = attendee.regular?.name ?? attendee.displayName ?? "Unnamed";

        return (
          <div key={attendee.id} className="border-b border-divider">
            <div className="flex items-center gap-1.5 min-h-[54px]">
              <StatusChip
                eventId={event.id}
                attendeeId={attendee.id}
                status={attendee.inviteStatus}
                atCapacity={atCapacity}
                setInviteStatus={setInviteStatus}
              />
              <span
                className={`font-semibold text-xs flex-1 min-w-0 ${
                  attendee.inviteStatus === "declined" ? "text-neutral-500" : "text-text"
                }`}
              >
                {name}
              </span>
              <AddPlusOneButton
                eventId={event.id}
                attendeeId={attendee.id}
                disabled={false}
                addPlusOne={addPlusOne}
              />
              <RemoveButton
                ariaLabel="Remove from run"
                eventId={event.id}
                id={attendee.id}
                remove={removeAttendee}
              />
              {confirmed ? (
                <PaidCheckbox
                  eventId={event.id}
                  id={attendee.id}
                  paid={attendee.paid}
                  ariaLabel="Toggle paid"
                  setPaid={setAttendeePaid}
                />
              ) : (
                <span className="w-11 text-center text-xs text-neutral-700">—</span>
              )}
            </div>

            {attendee.plusOnes.map((plusOne) => {
              const plusOneConfirmed = plusOne.inviteStatus === "confirmed";
              return (
                <div key={plusOne.id} className="flex items-center gap-1.5 min-h-12 pl-2 border-t border-divider">
                  <StatusChip
                    eventId={event.id}
                    attendeeId={plusOne.id}
                    status={plusOne.inviteStatus}
                    atCapacity={atCapacity}
                    setInviteStatus={setPlusOneInviteStatus}
                  />
                  <span className="text-[10px] tracking-[0.06em] text-accent font-semibold flex-none">+1</span>
                  <PlusOneNameInput
                    eventId={event.id}
                    plusOneId={plusOne.id}
                    name={plusOne.name}
                    setPlusOneName={setPlusOneName}
                  />
                  <RemoveButton
                    ariaLabel="Remove +1"
                    eventId={event.id}
                    id={plusOne.id}
                    remove={removePlusOne}
                  />
                  {plusOneConfirmed ? (
                    <PaidCheckbox
                      eventId={event.id}
                      id={plusOne.id}
                      paid={plusOne.paid}
                      ariaLabel="Toggle +1 paid"
                      setPaid={setPlusOnePaid}
                    />
                  ) : (
                    <span className="w-11 text-center text-xs text-neutral-700">—</span>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

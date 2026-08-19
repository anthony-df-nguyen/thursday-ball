"use client";

import { useState } from "react";
import { StatusChip } from "@/components/StatusChip";
import { PaidCheckbox } from "@/components/PaidCheckbox";
import { RemoveButton } from "@/components/RemoveButton";
import { AddPlusOneButton } from "@/components/AddPlusOneButton";
import { PlusOneNameInput } from "@/components/PlusOneNameInput";
import type { InviteStatus } from "@/db/schema";

type PlusOne = {
  id: string;
  name: string | null;
  inviteStatus: InviteStatus;
  paid: boolean;
};

type Attendee = {
  id: string;
  displayName: string | null;
  inviteStatus: InviteStatus;
  paid: boolean;
  regular: { name: string } | null;
  plusOnes: PlusOne[];
};

export function AttendeeList({
  eventId,
  attendees,
  atCapacity,
  setInviteStatus,
  setPlusOneInviteStatus,
  addPlusOne,
  removeAttendee,
  removePlusOne,
  setAttendeePaid,
  setPlusOnePaid,
  setPlusOneName,
}: {
  eventId: string;
  attendees: Attendee[];
  atCapacity: boolean;
  setInviteStatus: (
    eventId: string,
    attendeeId: string,
    status: InviteStatus,
  ) => Promise<void>;
  setPlusOneInviteStatus: (
    eventId: string,
    plusOneId: string,
    status: InviteStatus,
  ) => Promise<void>;
  addPlusOne: (
    eventId: string,
    attendeeId: string,
    formData: FormData,
  ) => Promise<void>;
  removeAttendee: (eventId: string, attendeeId: string) => Promise<void>;
  removePlusOne: (eventId: string, plusOneId: string) => Promise<void>;
  setAttendeePaid: (
    eventId: string,
    attendeeId: string,
    paid: boolean,
  ) => Promise<void>;
  setPlusOnePaid: (
    eventId: string,
    plusOneId: string,
    paid: boolean,
  ) => Promise<void>;
  setPlusOneName: (
    eventId: string,
    plusOneId: string,
    name: string,
  ) => Promise<void>;
}) {
  // Freeze on-screen order across live status toggles. The order is set
  // from the server-sorted list on first render (and whenever someone is
  // added/removed) but never reshuffles just because a status changed —
  // that only happens again on a full page reload.
  const ids = attendees.map((a) => a.id);
  const idsKey = ids.join(",");
  const [order, setOrder] = useState(ids);
  const [orderedIdsKey, setOrderedIdsKey] = useState(idsKey);
  if (idsKey !== orderedIdsKey) {
    const knownIds = new Set(ids);
    const nextOrder = order.filter((id) => knownIds.has(id));
    for (const id of ids) {
      if (!nextOrder.includes(id)) nextOrder.push(id);
    }
    setOrder(nextOrder);
    setOrderedIdsKey(idsKey);
  }
  const byId = new Map(attendees.map((a) => [a.id, a]));
  const rows = order
    .map((id) => byId.get(id))
    .filter((a): a is Attendee => a !== undefined);

  return (
    <>
      {rows.map((attendee) => {
        const confirmed = attendee.inviteStatus === "confirmed";
        const name = attendee.regular?.name ?? attendee.displayName ?? "Unnamed";

        return (
          <div key={attendee.id} className="border-b border-divider">
            <div className="flex items-center gap-1.5 min-h-[54px]">
              <StatusChip
                eventId={eventId}
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
                eventId={eventId}
                attendeeId={attendee.id}
                disabled={false}
                addPlusOne={addPlusOne}
              />
              <RemoveButton
                ariaLabel="Remove from run"
                eventId={eventId}
                id={attendee.id}
                remove={removeAttendee}
              />
              {confirmed ? (
                <PaidCheckbox
                  eventId={eventId}
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
                    eventId={eventId}
                    attendeeId={plusOne.id}
                    status={plusOne.inviteStatus}
                    atCapacity={atCapacity}
                    setInviteStatus={setPlusOneInviteStatus}
                  />
                  <span className="text-[10px] tracking-[0.06em] text-accent font-semibold flex-none">+1</span>
                  <PlusOneNameInput
                    eventId={eventId}
                    plusOneId={plusOne.id}
                    name={plusOne.name}
                    setPlusOneName={setPlusOneName}
                  />
                  <RemoveButton
                    ariaLabel="Remove +1"
                    eventId={eventId}
                    id={plusOne.id}
                    remove={removePlusOne}
                  />
                  {plusOneConfirmed ? (
                    <PaidCheckbox
                      eventId={eventId}
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
    </>
  );
}

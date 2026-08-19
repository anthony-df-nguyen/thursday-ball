"use client";

import { useTransition } from "react";
import type { InviteStatus } from "@/db/schema";

const CHIP: Record<InviteStatus, { label: string; className: string }> = {
  confirmed: { label: "IN", className: "bg-accent-800 text-accent-100 border-transparent" },
  invited: { label: "ASKED", className: "bg-transparent text-accent border-accent" },
  declined: { label: "OUT", className: "bg-neutral-800 text-neutral-400 border-transparent" },
};

const NEXT: Record<InviteStatus, InviteStatus> = {
  invited: "confirmed",
  confirmed: "declined",
  declined: "invited",
};

export function StatusChip({
  eventId,
  attendeeId,
  status,
  atCapacity,
  setInviteStatus,
}: {
  eventId: string;
  attendeeId: string;
  status: InviteStatus;
  atCapacity: boolean;
  setInviteStatus: (
    eventId: string,
    attendeeId: string,
    status: InviteStatus,
  ) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const chip = CHIP[status];

  return (
    <button
      type="button"
      aria-label="Cycle status"
      disabled={pending}
      onClick={() => {
        let next = NEXT[status];
        if (next === "confirmed" && atCapacity) next = "declined";
        startTransition(() => {
          setInviteStatus(eventId, attendeeId, next);
        });
      }}
      className={`flex flex-none min-w-[58px] h-[26px] items-center justify-center rounded-sm border px-2 font-heading text-[10px] font-semibold tracking-[0.06em] ${
        pending ? "cursor-default opacity-60" : "cursor-pointer opacity-100"
      } ${chip.className}`}
    >
      {chip.label}
    </button>
  );
}

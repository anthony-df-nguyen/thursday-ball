"use client";

import { useTransition } from "react";
import { MdExposurePlus1 } from "react-icons/md";

export function AddPlusOneButton({
  eventId,
  attendeeId,
  disabled,
  addPlusOne,
}: {
  eventId: string;
  attendeeId: string;
  disabled: boolean;
  addPlusOne: (eventId: string, attendeeId: string, formData: FormData) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="btn btn-ghost h-11 px-1 text-[11px] font-bold flex items-center justify-center"
      disabled={disabled || pending}
      onClick={() => startTransition(() => addPlusOne(eventId, attendeeId, new FormData()))}
    >
      <MdExposurePlus1 size={16} />
    </button>
  );
}

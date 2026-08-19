"use client";

import { useTransition } from "react";

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
      className="btn btn-ghost min-h-11 text-[13px]"
      disabled={disabled || pending}
      onClick={() => startTransition(() => addPlusOne(eventId, attendeeId, new FormData()))}
    >
      +1
    </button>
  );
}

"use client";

import { useTransition } from "react";

export function RemoveButton({
  eventId,
  id,
  remove,
  ariaLabel,
}: {
  eventId: string;
  id: string;
  remove: (eventId: string, id: string) => Promise<void>;
  ariaLabel: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={pending}
      onClick={() => startTransition(() => remove(eventId, id))}
      className={`w-[34px] h-11 bg-none border-none text-neutral-600 text-[17px] p-0 ${
        pending ? "cursor-default opacity-60" : "cursor-pointer opacity-100"
      }`}
    >
      ×
    </button>
  );
}

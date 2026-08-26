"use client";

import { useTransition } from "react";
import { MdClose } from "react-icons/md";

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
      className={`w-6 h-11 bg-none border-none text-neutral-600 p-0 flex items-center justify-center ${
        pending ? "cursor-default opacity-60" : "cursor-pointer opacity-100"
      }`}
    >
      <MdClose size={15} />
    </button>
  );
}

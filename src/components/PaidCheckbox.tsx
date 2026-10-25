"use client";

import { useTransition } from "react";
import posthog from "posthog-js";

export function PaidCheckbox({
  eventId,
  id,
  paid,
  setPaid,
  ariaLabel,
  trackAs = "attendance_payment_updated",
}: {
  eventId: string;
  id: string;
  paid: boolean;
  setPaid: (eventId: string, id: string, paid: boolean) => Promise<void>;
  ariaLabel: string;
  trackAs?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={pending}
      onClick={() => {
        posthog.capture(trackAs, { paid: !paid, event_id: eventId });
        startTransition(() => setPaid(eventId, id, !paid));
      }}
      className={`w-11 h-11 flex items-center justify-center bg-none border-none p-0 ${
        pending ? "cursor-default opacity-60" : "cursor-pointer opacity-100"
      }`}
    >
      <span
        className={`w-6 h-6 rounded-sm border flex items-center justify-center ${
          paid ? "border-accent bg-accent" : "border-divider bg-transparent"
        }`}
      >
        {paid && <span className="w-2 h-2 rounded-[2px] bg-bg" />}
      </span>
    </button>
  );
}

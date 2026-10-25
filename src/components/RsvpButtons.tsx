"use client";

import { useRef, useState } from "react";
import posthog from "posthog-js";
import type { InviteStatus } from "@/db/schema";

// Yes/No for the public RSVP page. Backing out after saying yes is the one
// answer organizers need to hear about directly, so it asks first.
export function RsvpButtons({
  status,
  yesDisabled = false,
  yesAction,
  noAction,
}: {
  status: InviteStatus;
  // Run is full and they aren't in: Yes can't take a spot. No is never
  // blocked, since declining doesn't use one.
  yesDisabled?: boolean;
  yesAction: () => Promise<void>;
  noAction: () => Promise<void>;
}) {
  const confirmed = status === "confirmed";
  const declined = status === "declined";
  const [warning, setWarning] = useState(false);
  const noForm = useRef<HTMLFormElement>(null);

  return (
    <>
      <div role="group" aria-label="Your RSVP" className="flex gap-4">
        <form
          action={yesAction}
          onSubmit={() => posthog.capture("rsvp_response_submitted", { response: "yes" })}
          className="flex-1"
        >
          <button
            type="submit"
            aria-pressed={confirmed}
            disabled={yesDisabled}
            className={`w-full h-12 rounded-xl border font-semibold cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-20 disabled:cursor-not-allowed ${
              confirmed
                ? "border-green-500 bg-green-600 text-white"
                : "border-divider bg-surface text-neutral-300 hover:border-neutral-500"
            }`}
          >
            {confirmed && <span aria-hidden="true">✓ </span>}Yes
          </button>
        </form>
        <form
          ref={noForm}
          action={noAction}
          onSubmit={() => posthog.capture("rsvp_response_submitted", { response: "no" })}
          className="flex-1"
        >
          <button
            type={confirmed ? "button" : "submit"}
            onClick={confirmed ? () => setWarning(true) : undefined}
            aria-pressed={declined}
            className={`w-full h-12 rounded-xl border font-semibold cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
              declined
                ? "border-neutral-300 bg-surface text-text"
                : "border-divider bg-surface text-neutral-300 hover:border-neutral-500"
            }`}
          >
            {declined && <span aria-hidden="true">✕ </span>}No
          </button>
        </form>
      </div>

      {warning && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="rsvp-warning-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
        >
          <div className="w-full max-w-sm rounded-xl border border-divider bg-surface px-5 py-4">
            <div id="rsvp-warning-title" className="font-heading font-medium text-[15px]">
              You said you were in
            </div>
            <p className="text-[13px] text-neutral-400 mt-1 leading-relaxed">
              Changing to No frees up your spot. Please also let the organizers
              know directly so we can plan around it if you can&apos;t attend last minute.
            </p>
            <div className="mt-4 flex gap-4">
              <button
                type="button"
                onClick={() => setWarning(false)}
                className="flex-1 h-11 rounded-xl bg-green-600 font-semibold text-white"
              >
                Keep me in
              </button>
              <button
                type="button"
                onClick={() => noForm.current?.requestSubmit()}
                className="flex-1 h-11 rounded-xl border border-divider bg-surface font-semibold"
              >
                I can&apos;t make it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
